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
const craftSchema = z.object({
  target: itemSchema,
  trayVersion: z.number().int().default(0),
  ingredientIds: z.array(z.string()).min(1).max(4),
  tray: z
    .array(z.object({ key: z.string(), item: itemSchema }))
    .min(6)
    .max(10),
  accepted: z.array(z.string()).default([]),
  rejected: z.array(z.string()).default([]),
  status: z.enum(['playing', 'crafted', 'revealed', 'timeout']).default('playing'),
});
const recipeSchema = craftSchema.extend({
  reusable: z.boolean().default(false),
  preparations: z.array(craftSchema).default([]),
});
const puzzleSchema = z.object({
  version: z.string(),
  deadlineAt: z.string().datetime().nullable(),
  recipes: z.array(recipeSchema).length(RECIPE_COUNT),
});
export type RecipePuzzle = z.infer<typeof puzzleSchema>;
const items = new Map(itemCatalog.items.map((item) => [item.id, item]));
const recipes = recipeCatalog.recipes;
const recipeByItem = new Map(recipes.map((r) => [r.targetId, r]));
const traits = recipeCatalog.traits as Record<string, string[]>;
type Craft = z.infer<typeof craftSchema>;
export function activeCraft(recipe: RecipePuzzle['recipes'][number]) {
  const step = recipe.preparations.findIndex((p) => p.status === 'playing');
  return {
    craft: step === -1 ? recipe : recipe.preparations[step],
    step: step === -1 ? recipe.preparations.length : step,
  };
}
export const craftRevision = (craft: Craft) => craft.accepted.length + craft.rejected.length;
export const recipeMistakes = (recipe: RecipePuzzle['recipes'][number]) =>
  [recipe, ...recipe.preparations].reduce((sum, craft) => sum + craft.rejected.length, 0);
if (
  recipeCatalog.version !== itemCatalog.version ||
  recipes.some((r) => !items.has(r.targetId) || r.ingredientIds.some((id) => !items.has(id)))
)
  throw new Error('Refresh recipe-catalog.json after updating the item catalog.');

// Tear/Dark Seal are starter items in the shop but basic ingredients in recipes.
const ingredientTier = (id: string) => {
  const tier = items.get(id)!.tier;
  return tier === 'starter' ? 'component' : tier;
};
const usedAsIngredient = new Set(recipes.flatMap((recipe) => recipe.ingredientIds));
const statFamilies = [
  ['Damage', 'AttackSpeed', 'CriticalStrike', 'LifeSteal', 'ArmorPenetration'],
  ['SpellDamage', 'Mana', 'ManaRegen', 'CooldownReduction'],
  ['Health', 'HealthRegen', 'Armor', 'SpellBlock'],
];

export function createRecipeTray(
  targetId: string,
  ingredientIds: string[],
  rank: (value: string) => string,
) {
  const unique = [...new Set(ingredientIds)].map((id) => items.get(id)!);
  const tiers = [...new Set(ingredientIds.map(ingredientTier))].sort();
  const selected = [...unique];
  for (const [tierIndex, tier] of tiers.entries()) {
    const ingredients = unique.filter((item) => ingredientTier(item.id) === tier);
    const pool = itemCatalog.items.filter(
      (item) =>
        ingredientTier(item.id) === tier &&
        item.id !== targetId &&
        !ingredientIds.includes(item.id) &&
        (item.tier !== 'starter' || usedAsIngredient.has(item.id)),
    );
    const overlap = (a: string, b: string) =>
      (traits[a] || []).filter((tag) => (traits[b] || []).includes(tag)).length;
    const score = (item: (typeof itemCatalog.items)[number]) =>
      Math.max(
        ...ingredients.map((ingredient) => {
          const bases = recipeByItem.get(ingredient.id)?.ingredientIds || [ingredient.id];
          const otherBases = recipeByItem.get(item.id)?.ingredientIds || [item.id];
          const related = statFamilies.some(
            (family) =>
              family.some((tag) => (traits[ingredient.id] || []).includes(tag)) &&
              family.some((tag) => (traits[item.id] || []).includes(tag)),
          );
          return (
            overlap(item.id, ingredient.id) * 4 +
            overlap(item.id, targetId) * 2 +
            bases.filter((id) => otherBases.includes(id)).length * 3 +
            (related ? 1.5 : 0) +
            1 / (1 + Math.abs(item.price - ingredient.price) / 300)
          );
        }),
      );
    const shuffled = pool
      .map((item) => ({ item, rank: rank('decoy:' + item.id), score: score(item) }))
      .sort((a, b) => a.rank.localeCompare(b.rank));
    // Keep several alternatives in EVERY relevant tier, irrespective of recipe multiplicities.
    const slots = Math.floor(10 / tiers.length) + (tierIndex < 10 % tiers.length ? 1 : 0);
    const needed = slots - ingredients.length;
    const traps = [...shuffled]
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(needed, tiers.length === 1 ? 4 : 2));
    selected.push(
      ...[...traps, ...shuffled.filter((entry) => !traps.includes(entry))]
        .slice(0, needed)
        .map((entry) => entry.item),
    );
  }
  if (selected.length !== 10) throw new EconomyError('The forge is temporarily unavailable.', 503);
  return selected
    .map((item) => ({ item, rank: rank('tray:' + item.id) }))
    .sort((a, b) => a.rank.localeCompare(b.rank))
    .map(({ item }, n) => ({ key: 'piece-' + n, item: itemSchema.parse(item) }));
}

export function repairRecipeTrays(puzzle: RecipePuzzle, roundId: string) {
  if (puzzle.version !== recipeCatalog.version) return false;
  let changed = false;
  puzzle.recipes.forEach((recipe, index) => {
    if (!recipe.reusable || recipe.status !== 'playing') return;
    [...recipe.preparations, recipe].forEach((craft, step) => {
      if (
        craft.trayVersion >= 3 ||
        craft.status !== 'playing' ||
        craft.accepted.length ||
        craft.rejected.length
      )
        return;
      const oldKeys = new Map(craft.tray.map((piece) => [piece.item.id, piece.key]));
      const replacement = createRecipeTray(craft.target.id, craft.ingredientIds, (value) =>
        createHmac('sha256', roundId)
          .update('tray-v3:' + index + ':' + step + ':' + value)
          .digest('hex'),
      );
      // Never repurpose an old key for a different item: stale clicks must not select or charge for its replacement.
      craft.tray = replacement.map((piece) => ({
        ...piece,
        key: oldKeys.get(piece.item.id) || 'trap-v3-' + piece.item.id,
      }));
      craft.trayVersion = 3;
      changed = true;
    });
  });
  return changed;
}

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
      .update(`recipe-rush:v2:${recipeCatalog.version}:${seed}:${value}`)
      .digest('hex');
  const pickOrder = <T>(pool: T[], key: (entry: T, i: number) => string) =>
    pool
      .map((entry, i) => ({ entry, rank: rank(key(entry, i)) }))
      .sort((a, b) => a.rank.localeCompare(b.rank))
      .map(({ entry }) => entry);
  const makeCraft = (recipe: (typeof recipes)[number], label: string): Craft => {
    const tray = createRecipeTray(recipe.targetId, recipe.ingredientIds, (value) =>
      rank(`${label}:${value}`),
    );
    return {
      target: itemSchema.parse(items.get(recipe.targetId)),
      trayVersion: 3,
      ingredientIds: recipe.ingredientIds,
      tray,
      accepted: [],
      rejected: [],
      status: 'playing',
    };
  };
  const selected = STAGES.map((_, index) => {
    const complex = index > 0 && parseInt(rank(`complex:${index}`).slice(0, 2), 16) % 3 < index;
    const eligible = recipes.filter((r) => {
      const tier = items.get(r.targetId)!.tier;
      const eligibleStage =
        index === 0
          ? tier === 'epic' && r.ingredientIds.length === 2
          : index === 1
          ? tier === 'legendary' && r.ingredientIds.length === 2
          : tier === 'legendary' && r.ingredientIds.length >= 3;
      return (
        eligibleStage &&
        (!complex ||
          r.ingredientIds.some((id) => items.get(id)?.tier === 'epic' && recipeByItem.has(id)))
      );
    });
    const recipe = pickOrder(eligible, (r) => `target:${index}:${r.targetId}`)[0];
    if (!recipe) throw new EconomyError('The forge is temporarily unavailable.', 503);
    const preparations: Craft[] = [];
    const prepare = (id: string, ancestors: string[]) => {
      const sub = recipeByItem.get(id);
      if (items.get(id)?.tier !== 'epic' || !sub || ancestors.includes(id)) return;
      sub.ingredientIds.forEach((child) => prepare(child, [...ancestors, id]));
      preparations.push(makeCraft(sub, `${index}:prep:${preparations.length}`));
    };
    if (complex) recipe.ingredientIds.forEach((id) => prepare(id, [recipe.targetId]));
    return {
      ...makeCraft(recipe, `${index}:final`),
      reusable: true,
      preparations,
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
      recipe.preparations.forEach((p) => {
        if (p.status === 'playing') p.status = 'timeout';
      });
      changed = true;
    }
  return changed;
}
export function recipeReward(puzzle: RecipePuzzle, offer: number, potential = false) {
  const eligible = puzzle.recipes.filter(
    (r) => r.status === 'crafted' || (potential && r.status === 'playing'),
  ).length;
  const mistakes = puzzle.recipes.reduce((sum, r) => sum + recipeMistakes(r), 0);
  return Math.max(0, Math.floor((offer * eligible) / RECIPE_COUNT) - 10 * mistakes);
}

export const recipeActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add'),
    index: z.number().int().min(0).max(2),
    pieceKey: z.string().max(32),
    step: z.number().int().min(0).max(20).optional(),
    revision: z.number().int().min(0).max(100).optional(),
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
    recipe.preparations.forEach((p) => {
      if (p.status === 'playing') p.status = 'revealed';
    });
    return;
  }
  const { craft, step } = activeCraft(recipe);
  if (recipe.reusable) {
    if (input.step === undefined || input.revision === undefined)
      throw new EconomyError('Refresh to use the replenishing ingredient tray.', 409);
    if (input.step < step || (input.step === step && input.revision < craftRevision(craft))) return;
    if (input.step !== step || input.revision !== craftRevision(craft))
      throw new EconomyError('Refresh to play the current crafting step.', 409);
  }
  const piece = craft.tray.find((entry) => entry.key === input.pieceKey);
  if (!piece) throw new EconomyError('Choose an ingredient from this tray.');
  if (
    (!recipe.reusable && craft.accepted.includes(piece.key)) ||
    craft.rejected.includes(piece.key)
  )
    return;
  const needed = craft.ingredientIds.filter((id) => id === piece.item.id).length;
  const added = craft.accepted.filter(
    (key) => craft.tray.find((p) => p.key === key)!.item.id === piece.item.id,
  ).length;
  if (added >= needed) {
    craft.rejected.push(piece.key);
    return;
  }
  craft.accepted.push(piece.key);
  if (craft.accepted.length === craft.ingredientIds.length) craft.status = 'crafted';
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
  const active = recipe ? activeCraft(recipe) : null;
  const craft = active?.craft;
  const presentCraft = (c: Craft) => ({
    target: imageItem(c.target),
    status: c.status,
    ingredients: c.ingredientIds.map((id) => imageItem(c.tray.find((p) => p.item.id === id)!.item)),
  });
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
    mistakes: puzzle.recipes.reduce((sum, r) => sum + recipeMistakes(r), 0),
    crafted: puzzle.recipes.filter((r) => r.status === 'crafted').length,
    current:
      !finished && recipe && craft && active
        ? {
            target: imageItem(craft.target),
            finalTarget: imageItem(recipe.target),
            step: active.step,
            stepCount: recipe.preparations.length + 1,
            revision: craftRevision(craft),
            reusable: recipe.reusable,
            completedSteps: recipe.preparations
              .filter((p) => p.status === 'crafted')
              .map(presentCraft),
            stage: STAGES[index],
            slots: craft.ingredientIds.length,
            tray: craft.tray.map((piece) => ({
              key: piece.key,
              item: imageItem(piece.item),
              used: craft.accepted.filter((key) => key === piece.key).length,
              state: craft.rejected.includes(piece.key)
                ? 'rejected'
                : !recipe.reusable && craft.accepted.includes(piece.key)
                ? 'accepted'
                : 'ready',
            })),
            accepted: craft.accepted.map((key) => ({
              key,
              item: imageItem(craft.tray.find((p) => p.key === key)!.item),
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
        preparations: recipe.preparations.map(presentCraft),
        mistakes: recipeMistakes(recipe),
      })),
  };
}
