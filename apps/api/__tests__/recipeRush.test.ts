import { GameRound } from '@prisma/client';
import {
  applyRecipeAction,
  createRecipePuzzle,
  expireRecipes,
  presentRecipeRound,
  recipeIndex,
  recipeReward,
} from '../src/services/recipeRush';
import items from '../src/data/item-catalog.json';
import recipes from '../src/data/recipe-catalog.json';

test('daily recipes are deterministic, grow in complexity, and contain exactly the required copies plus four decoys', () => {
  const ids = new Map(items.items.map((i) => [i.id, i]));
  const puzzle = createRecipePuzzle('2026-09-16', false, 'test');
  expect(createRecipePuzzle('2026-09-16', false, 'test')).toEqual(puzzle);
  const targets = new Set<string>();
  for (let n = 0; n < 80; n++) {
    const round = createRecipePuzzle(`day-${n}`, false, 'test');
    expect(round.recipes).toHaveLength(3);
    expect(round.deadlineAt).toBeNull();
    expect(ids.get(round.recipes[0].target.id)?.tier).toBe('epic');
    expect(round.recipes[0].ingredientIds).toHaveLength(2);
    expect(ids.get(round.recipes[1].target.id)?.tier).toBe('legendary');
    expect(round.recipes[1].ingredientIds).toHaveLength(2);
    expect(round.recipes[2].ingredientIds.length).toBeGreaterThanOrEqual(3);
    expect(new Set(round.recipes.map((r) => r.target.id)).size).toBe(3);
    for (const recipe of round.recipes) {
      targets.add(recipe.target.id);
      expect(recipe.ingredientIds).toEqual(
        recipes.recipes.find((r) => r.targetId === recipe.target.id)!.ingredientIds,
      );
      expect(new Set(recipe.tray.map((p) => p.key)).size).toBe(recipe.tray.length);
      for (const id of new Set(recipe.ingredientIds))
        expect(recipe.tray.filter((p) => p.item.id === id)).toHaveLength(
          recipe.ingredientIds.filter((i) => i === id).length,
        );
      expect(recipe.tray.filter((p) => !recipe.ingredientIds.includes(p.item.id))).toHaveLength(4);
      expect(recipe.tray.some((p) => p.item.id === recipe.target.id)).toBe(false);
    }
  }
  expect(targets.size).toBeGreaterThan(30);
});

test('only current tray and accepted pieces are exposed, then completed recipes reveal ingredients', () => {
  const puzzle = createRecipePuzzle('day', false, 'test');
  const round = {
    id: 'round',
    gameKey: 'recipe-rush',
    day: '2026-09-16',
    recipePuzzle: puzzle,
    rewardOffer: 60,
    rewardPaid: 0,
    finished: false,
    won: false,
  } as unknown as GameRound;
  let publicRound = presentRecipeRound(round);
  expect(publicRound.current!.slots).toBe(2);
  expect(publicRound.history).toEqual([]);
  expect(JSON.stringify(publicRound)).not.toMatch(/ingredientIds|recipePuzzle|deadlineAt.*secret/);
  expect(publicRound.current).not.toHaveProperty('ingredients');
  for (const piece of puzzle.recipes[0].tray.filter((p) =>
    puzzle.recipes[0].ingredientIds.includes(p.item.id),
  ))
    applyRecipeAction(puzzle, { action: 'add', index: 0, pieceKey: piece.key });
  publicRound = presentRecipeRound(round);
  expect(publicRound.index).toBe(1);
  expect(publicRound.history[0].ingredients).toHaveLength(2);
  expect(publicRound.history[0].status).toBe('crafted');
});

test('duplicate ingredients require separate tray pieces; mistakes and retries are idempotent', () => {
  let puzzle = createRecipePuzzle('0', false, 'test');
  for (
    let n = 0;
    !puzzle.recipes.some((r) => new Set(r.ingredientIds).size < r.ingredientIds.length);
    n++
  ) {
    if (n > 100) throw new Error('Expected duplicate-component recipes');
    puzzle = createRecipePuzzle(String(n), false, 'test');
  }
  const first = puzzle.recipes[0];
  const decoy = first.tray.find((p) => !first.ingredientIds.includes(p.item.id))!;
  applyRecipeAction(puzzle, { action: 'add', index: 0, pieceKey: decoy.key });
  applyRecipeAction(puzzle, { action: 'add', index: 0, pieceKey: decoy.key });
  expect(recipeReward(puzzle, 60, true)).toBe(50);
  expect(first.rejected).toHaveLength(1);
  expect(() => applyRecipeAction(puzzle, { action: 'add', index: 0, pieceKey: 'fake' })).toThrow();
  expect(() => applyRecipeAction(puzzle, { action: 'reveal', index: 2 })).toThrow();
  puzzle.recipes.forEach((recipe, index) => {
    for (const piece of recipe.tray.filter((p) => recipe.ingredientIds.includes(p.item.id))) {
      applyRecipeAction(puzzle, { action: 'add', index, pieceKey: piece.key });
      applyRecipeAction(puzzle, { action: 'add', index, pieceKey: piece.key });
    }
    expect(recipe.accepted).toHaveLength(recipe.ingredientIds.length);
    expect(recipe.status).toBe('crafted');
  });
  expect(recipeIndex(puzzle)).toBe(3);
  expect(recipeReward(puzzle, 60)).toBe(50);
  expect(recipeReward(puzzle, 5)).toBe(0);
});

test('revealed recipes earn no share; only timed practice expires and keeps completed crafts', () => {
  const puzzle = createRecipePuzzle('day', true, 'test', true, 1000);
  expect(puzzle.deadlineAt).toBe(new Date(91000).toISOString());
  expect(expireRecipes(puzzle, 90999)).toBe(false);
  applyRecipeAction(puzzle, { action: 'reveal', index: 0 });
  expect(recipeReward(puzzle, 60, true)).toBe(40);
  expect(expireRecipes(puzzle, 91000)).toBe(true);
  expect(puzzle.recipes.map((r) => r.status)).toEqual(['revealed', 'timeout', 'timeout']);
  expect(recipeReward(puzzle, 60)).toBe(0);
  expect(expireRecipes(puzzle, 92000)).toBe(false);
  expect(createRecipePuzzle('day', false, 'test', true).deadlineAt).toBeNull();
  expect(createRecipePuzzle('day', true, 'test', false).deadlineAt).toBeNull();
});
