import { createHmac, randomUUID } from 'crypto';
import { GameRound } from '@prisma/client';
import { z } from 'zod';
import itemCatalog from '../data/item-catalog.json';
import recipeCatalog from '../data/recipe-catalog.json';
import { EconomyError } from './economy';

export const RECIPE_COUNT = 3;
export const RECIPE_TIMER_SECONDS = 90;
const STAGES = ['Simple', 'Skilled', 'Masterwork'];
const itemSchema = z.object({ id: z.string(), name: z.string(), image: z.string() });
const recipeSchema = z.object({
  target: itemSchema,
  ingredientIds: z.array(z.string()).min(2).max(4),
  tray: z
    .array(z.object({ key: z.string(), item: itemSchema }))
    .min(6)
    .max(8),
  accepted: z.array(z.string()).default([]),
  rejected: z.array(z.string()).default([]),
  status: z.enum(['playing', 'crafted', 'revealed', 'timeout']).default('playing'),
});
const puzzleSchema = z.object({
  version: z.string(),
  deadlineAt: z.string().datetime().nullable(),
  recipes: z.array(recipeSchema).length(RECIPE_COUNT),
});
export type RecipePuzzle = z.infer<typeof puzzleSchema>;
const items = new Map(itemCatalog.items.map((item) => [item.id, item]));
const recipes = recipeCatalog.recipes;
if (
  recipeCatalog.version !== itemCatalog.version ||
  recipes.some((r) => !items.has(r.targetId) || r.ingredientIds.some((id) => !items.has(id)))
)
  throw new Error('Refresh recipe-catalog.json after updating the item catalog.');

export function createRecipePuzzle(
  day: string,
  practice: boolean,
  secret: string,
  timed = false,
  now = Date.now(),
): RecipePuzzle {
  const seed = practice ? randomUUID() : day;
  const rank = (value: string) =>
    createHmac('sha256', secret)
      .update(`recipe-rush:v1:${recipeCatalog.version}:${seed}:${value}`)
      .digest('hex');
  const pickOrder = <T>(pool: T[], key: (entry: T, i: number) => string) =>
    pool
      .map((entry, i) => ({ entry, rank: rank(key(entry, i)) }))
      .sort((a, b) => a.rank.localeCompare(b.rank))
      .map(({ entry }) => entry);
  const selected = STAGES.map((_, index) => {
    const eligible = recipes.filter((r) => {
      const tier = items.get(r.targetId)!.tier;
      return index === 0
        ? tier === 'epic' && r.ingredientIds.length === 2
        : index === 1
        ? tier === 'legendary' && r.ingredientIds.length === 2
        : tier === 'legendary' && r.ingredientIds.length >= 3;
    });
    const recipe = pickOrder(eligible, (r) => `target:${index}:${r.targetId}`)[0];
    if (!recipe) throw new EconomyError('The forge is temporarily unavailable.', 503);
    const ingredients = recipe.ingredientIds.map((id) => items.get(id)!);
    const tiers = new Set(ingredients.map((i) => i.tier));
    const decoys = pickOrder(
      itemCatalog.items.filter(
        (i) =>
          tiers.has(i.tier) && i.id !== recipe.targetId && !recipe.ingredientIds.includes(i.id),
      ),
      (i) => `decoy:${index}:${i.id}`,
    ).slice(0, 4);
    if (decoys.length < 4) throw new EconomyError('The forge is temporarily unavailable.', 503);
    const tray = pickOrder([...ingredients, ...decoys], (i, n) => `tray:${index}:${i.id}:${n}`).map(
      (item, n) => ({ key: `piece-${n}`, item: itemSchema.parse(item) }),
    );
    return {
      target: itemSchema.parse(items.get(recipe.targetId)),
      ingredientIds: recipe.ingredientIds,
      tray,
      accepted: [],
      rejected: [],
      status: 'playing' as const,
    };
  });
  return {
    version: recipeCatalog.version,
    deadlineAt:
      practice && timed ? new Date(now + RECIPE_TIMER_SECONDS * 1000).toISOString() : null,
    recipes: selected,
  };
}

export function readRecipePuzzle(round: Pick<GameRound, 'recipePuzzle'>) {
  const result = puzzleSchema.safeParse(round.recipePuzzle);
  if (!result.success) throw new EconomyError('This recipe is unavailable.', 503);
  return result.data;
}
export const recipeIndex = (puzzle: RecipePuzzle) => {
  const index = puzzle.recipes.findIndex((recipe) => recipe.status === 'playing');
  return index === -1 ? RECIPE_COUNT : index;
};
export function expireRecipes(puzzle: RecipePuzzle, now = Date.now()) {
  if (!puzzle.deadlineAt || now < Date.parse(puzzle.deadlineAt)) return false;
  let changed = false;
  for (const recipe of puzzle.recipes)
    if (recipe.status === 'playing') {
      recipe.status = 'timeout';
      changed = true;
    }
  return changed;
}
export function recipeReward(puzzle: RecipePuzzle, offer: number, potential = false) {
  const eligible = puzzle.recipes.filter(
    (r) => r.status === 'crafted' || (potential && r.status === 'playing'),
  ).length;
  const mistakes = puzzle.recipes.reduce((sum, r) => sum + r.rejected.length, 0);
  return Math.max(0, Math.floor((offer * eligible) / RECIPE_COUNT) - 10 * mistakes);
}

export const recipeActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add'),
    index: z.number().int().min(0).max(2),
    pieceKey: z.string().max(32),
  }),
  z.object({ action: z.literal('reveal'), index: z.number().int().min(0).max(2) }),
  z.object({ action: z.literal('sync') }),
]);
export function applyRecipeAction(puzzle: RecipePuzzle, input: z.infer<typeof recipeActionSchema>) {
  if (input.action === 'sync') return;
  const index = recipeIndex(puzzle);
  // Old requests and double-clicks never affect the next recipe or add a penalty.
  if (input.index < index) return;
  if (input.index !== index) throw new EconomyError('Refresh to play the current recipe.', 409);
  const recipe = puzzle.recipes[index];
  if (input.action === 'reveal') {
    recipe.status = 'revealed';
    return;
  }
  const piece = recipe.tray.find((entry) => entry.key === input.pieceKey);
  if (!piece) throw new EconomyError('Choose an ingredient from this tray.');
  if (recipe.accepted.includes(piece.key) || recipe.rejected.includes(piece.key)) return;
  const needed = recipe.ingredientIds.filter((id) => id === piece.item.id).length;
  const added = recipe.accepted.filter(
    (key) => recipe.tray.find((p) => p.key === key)!.item.id === piece.item.id,
  ).length;
  if (added >= needed) {
    recipe.rejected.push(piece.key);
    return;
  }
  recipe.accepted.push(piece.key);
  if (recipe.accepted.length === recipe.ingredientIds.length) recipe.status = 'crafted';
}

export function presentRecipeRound(round: GameRound, now = Date.now()) {
  const puzzle = readRecipePuzzle(round);
  expireRecipes(puzzle, now);
  const index = recipeIndex(puzzle);
  const finished = round.finished || index === RECIPE_COUNT;
  const imageItem = (item: z.infer<typeof itemSchema>) => ({
    id: item.id,
    name: item.name,
    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${puzzle.version}/img/item/${item.image}`,
  });
  const recipe = puzzle.recipes[index];
  return {
    id: round.id,
    gameKey: 'recipe-rush' as const,
    day: round.day,
    practice: round.day.startsWith('practice:'),
    finished,
    won: round.won,
    rewardOffer: round.rewardOffer,
    rewardPaid: round.rewardPaid,
    rewardAvailable: finished ? round.rewardPaid : recipeReward(puzzle, round.rewardOffer, true),
    deadlineAt: puzzle.deadlineAt,
    serverTime: new Date(now).toISOString(),
    version: puzzle.version,
    index,
    total: RECIPE_COUNT,
    mistakes: puzzle.recipes.reduce((sum, r) => sum + r.rejected.length, 0),
    crafted: puzzle.recipes.filter((r) => r.status === 'crafted').length,
    current:
      !finished && recipe
        ? {
            target: imageItem(recipe.target),
            stage: STAGES[index],
            slots: recipe.ingredientIds.length,
            tray: recipe.tray.map((piece) => ({
              key: piece.key,
              item: imageItem(piece.item),
              state: recipe.accepted.includes(piece.key)
                ? 'accepted'
                : recipe.rejected.includes(piece.key)
                ? 'rejected'
                : 'ready',
            })),
            accepted: recipe.accepted.map((key) => ({
              key,
              item: imageItem(recipe.tray.find((p) => p.key === key)!.item),
            })),
          }
        : null,
    history: puzzle.recipes
      .filter((r) => r.status !== 'playing')
      .map((recipe, i) => ({
        target: imageItem(recipe.target),
        stage: STAGES[i],
        status: recipe.status,
        ingredients: recipe.ingredientIds.map((id) =>
          imageItem(recipe.tray.find((p) => p.item.id === id)!.item),
        ),
        mistakes: recipe.rejected.length,
      })),
  };
}
