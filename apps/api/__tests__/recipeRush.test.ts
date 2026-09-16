import { GameRound } from '@prisma/client';
import { createHash } from 'crypto';
import {
  activeCraft,
  applyRecipeAction,
  craftRevision,
  createRecipePuzzle,
  createRecipeTray,
  repairRecipeTrays,
  expireRecipes,
  presentRecipeRound,
  readRecipePuzzle,
  recipeIndex,
  recipeReward,
  RecipePuzzle,
} from '../src/services/recipeRush';
import items from '../src/data/item-catalog.json';
import recipes from '../src/data/recipe-catalog.json';

function add(puzzle: RecipePuzzle, index: number, itemId: string) {
  const { craft, step } = activeCraft(puzzle.recipes[index]);
  const input = {
    action: 'add' as const,
    index,
    step,
    revision: craftRevision(craft),
    pieceKey: craft.tray.find((p) => p.item.id === itemId)!.key,
  };
  applyRecipeAction(puzzle, input);
  return input;
}
function solve(puzzle: RecipePuzzle, index: number) {
  const recipe = puzzle.recipes[index];
  for (const craft of [...recipe.preparations, recipe])
    for (const id of craft.ingredientIds) add(puzzle, index, id);
}
function asRound(puzzle: RecipePuzzle) {
  return {
    id: 'round',
    gameKey: 'recipe-rush',
    day: '2026-09-17',
    recipePuzzle: puzzle,
    rewardOffer: 60,
    rewardPaid: 0,
    finished: false,
    won: false,
  } as unknown as GameRound;
}

test('daily recipes vary in depth; every crafting step has ten unique reusable choices with plausible traps', () => {
  const ids = new Map(items.items.map((i) => [i.id, i]));
  const first = createRecipePuzzle('2026-09-17', false, 'test');
  expect(createRecipePuzzle('2026-09-17', false, 'test')).toEqual(first);
  const targets = new Set<string>();
  let complex = 0,
    direct = 0,
    repeated = 0;
  for (let n = 0; n < 100; n++) {
    const puzzle = createRecipePuzzle(`day-${n}`, false, 'test');
    expect(puzzle.recipes).toHaveLength(3);
    expect(ids.get(puzzle.recipes[0].target.id)?.tier).toBe('epic');
    expect(puzzle.recipes[0].ingredientIds).toHaveLength(2);
    expect(ids.get(puzzle.recipes[1].target.id)?.tier).toBe('legendary');
    expect(puzzle.recipes[2].ingredientIds.length).toBeGreaterThanOrEqual(3);
    expect(new Set(puzzle.recipes.map((r) => r.target.id)).size).toBe(3);
    for (const recipe of puzzle.recipes) {
      recipe.preparations.length ? complex++ : direct++;
      targets.add(recipe.target.id);
      for (const craft of [...recipe.preparations, recipe]) {
        expect(craft.ingredientIds).toEqual(
          recipes.recipes.find((r) => r.targetId === craft.target.id)!.ingredientIds,
        );
        expect(craft.tray).toHaveLength(10);
        expect(new Set(craft.tray.map((p) => p.item.id)).size).toBe(10);
        expect(craft.tray.some((p) => p.item.id === craft.target.id)).toBe(false);
        for (const id of craft.ingredientIds)
          expect(craft.tray.filter((p) => p.item.id === id)).toHaveLength(1);
        if (new Set(craft.ingredientIds).size < craft.ingredientIds.length) repeated++;
        const decoys = craft.tray.filter((p) => !craft.ingredientIds.includes(p.item.id));
        expect(decoys.length).toBeGreaterThanOrEqual(6);
        const tier = (id: string) =>
          ids.get(id)!.tier === 'starter' ? 'component' : ids.get(id)!.tier;
        const allowed = new Set(craft.ingredientIds.map(tier));
        expect(decoys.every((p) => allowed.has(tier(p.item.id)))).toBe(true);
        for (const value of allowed) {
          expect(craft.tray.filter((p) => tier(p.item.id) === value).length).toBeGreaterThanOrEqual(
            Math.floor(10 / allowed.size),
          );
        }
      }
      for (const prep of recipe.preparations) expect(ids.get(prep.target.id)?.tier).toBe('epic');
    }
  }
  expect(targets.size).toBeGreaterThan(30);
  expect(complex).toBeGreaterThan(50);
  expect(direct).toBeGreaterThan(100);
  expect(repeated).toBeGreaterThan(0);
});

test('Serrated Dirk offers basic alternatives, including other weapons, without epic giveaways', () => {
  const dirk = recipes.recipes.find((r) => r.targetId === '3134')!;
  const byId = new Map(items.items.map((item) => [item.id, item]));
  for (let n = 0; n < 20; n++) {
    const tray = createRecipeTray(dirk.targetId, dirk.ingredientIds, (value) =>
      createHash('sha256').update(`${n}:${value}`).digest('hex'),
    );
    expect(tray).toHaveLength(10);
    expect(tray.every((p) => ['component', 'starter'].includes(byId.get(p.item.id)!.tier))).toBe(
      true,
    );
    expect(tray.map((p) => p.item.name)).toEqual(
      expect.arrayContaining(['Long Sword', 'Pickaxe', 'B. F. Sword', 'Dagger']),
    );
    expect(tray.filter((p) => p.item.id === '1036')).toHaveLength(1);
  }
});

test('every catalog recipe has balanced decoys drawn only from its actual ingredient tiers', () => {
  const byId = new Map(items.items.map((item) => [item.id, item]));
  const tier = (id: string) =>
    byId.get(id)!.tier === 'starter' ? 'component' : byId.get(id)!.tier;
  for (const recipe of recipes.recipes) {
    const tray = createRecipeTray(recipe.targetId, recipe.ingredientIds, (value) => value);
    const allowed = new Set(recipe.ingredientIds.map(tier));
    expect(tray).toHaveLength(10);
    expect(new Set(tray.map((p) => p.item.id)).size).toBe(10);
    expect(tray.every((p) => allowed.has(tier(p.item.id)))).toBe(true);
    for (const value of allowed)
      expect(tray.filter((p) => tier(p.item.id) === value)).toHaveLength(10 / allowed.size);
  }
});

test('untouched saved trays repair once without changing answers, played steps, penalties, or old item keys', () => {
  const puzzle = createRecipePuzzle('0', false, 'test');
  const recipe = puzzle.recipes[0];
  const decoy = recipe.tray.find((p) => !recipe.ingredientIds.includes(p.item.id))!;
  const oldKey = decoy.key;
  decoy.item = { id: '1053', name: 'Vampiric Scepter', image: '1053.png' };
  recipe.trayVersion = 0;
  const correctKeys = recipe.tray.filter((p) => recipe.ingredientIds.includes(p.item.id));
  const beforeAnswers = puzzle.recipes.map((r) => r.ingredientIds);
  expect(repairRecipeTrays(puzzle, 'saved-round')).toBe(true);
  expect(recipe.tray.some((p) => p.key === oldKey)).toBe(false);
  expect(recipe.tray).toEqual(expect.arrayContaining(correctKeys));
  expect(puzzle.recipes.map((r) => r.ingredientIds)).toEqual(beforeAnswers);
  expect(recipeReward(puzzle, 60, true)).toBe(60);
  expect(() =>
    applyRecipeAction(puzzle, { action: 'add', index: 0, step: 0, revision: 0, pieceKey: oldKey }),
  ).toThrow(/Choose an ingredient/);
  expect(repairRecipeTrays(puzzle, 'saved-round')).toBe(false);
  add(puzzle, 0, recipe.ingredientIds[0]);
  recipe.trayVersion = 0;
  const snapshot = JSON.stringify(recipe);
  expect(repairRecipeTrays(puzzle, 'saved-round')).toBe(false);
  expect(JSON.stringify(recipe)).toBe(snapshot);
  const legacy = createRecipePuzzle('old', false, 'test');
  legacy.recipes.forEach((r) => {
    r.reusable = false;
    r.trayVersion = 0;
  });
  expect(repairRecipeTrays(legacy, 'legacy')).toBe(false);
});

test('each add places one copy and replenishes; stale/repeated requests cannot add extra copies or penalties', () => {
  const puzzle = createRecipePuzzle('0', false, 'test');
  const first = puzzle.recipes[0];
  const wrong = first.tray.find((p) => !first.ingredientIds.includes(p.item.id))!;
  const badInput = add(puzzle, 0, wrong.item.id);
  applyRecipeAction(puzzle, badInput);
  expect(recipeReward(puzzle, 60, true)).toBe(50);
  expect(first.rejected).toHaveLength(1);
  expect(() => applyRecipeAction(puzzle, { action: 'add', index: 0, pieceKey: wrong.key })).toThrow(
    /Refresh/,
  );
  const firstInput = add(puzzle, 0, first.ingredientIds[0]);
  applyRecipeAction(puzzle, firstInput);
  expect(first.accepted).toHaveLength(1);
  const view = presentRecipeRound(asRound(puzzle));
  expect(view.current!.tray.find((p) => p.key === firstInput.pieceKey)).toMatchObject({
    state: 'ready',
    used: 1,
  });
  add(puzzle, 0, first.ingredientIds[1]);
  for (const index of [1, 2]) solve(puzzle, index);
  expect(recipeIndex(puzzle)).toBe(3);
  expect(recipeReward(puzzle, 60)).toBe(50);
  expect(recipeReward(puzzle, 5)).toBe(0);
});

test('multi-step crafts persist without leaking future ingredients; old-step requests cannot answer the next step', () => {
  let puzzle = createRecipePuzzle('0', false, 'test');
  for (let n = 1; !puzzle.recipes[2].preparations.length; n++)
    puzzle = createRecipePuzzle(String(n), false, 'test');
  solve(puzzle, 0);
  solve(puzzle, 1);
  let recipe = puzzle.recipes[2];
  const first = activeCraft(recipe).craft;
  const wrong = first.tray.find((p) => !first.ingredientIds.includes(p.item.id))!;
  add(puzzle, 2, wrong.item.id);
  let lastInput: ReturnType<typeof add>;
  for (const id of first.ingredientIds) lastInput = add(puzzle, 2, id);
  const next = activeCraft(recipe);
  expect(next.step).toBe(1);
  expect(next.craft.accepted).toEqual([]);
  applyRecipeAction(puzzle, lastInput!);
  expect(next.craft.accepted).toEqual([]);
  puzzle = readRecipePuzzle(asRound(puzzle));
  recipe = puzzle.recipes[2];
  const view = presentRecipeRound(asRound(puzzle));
  expect(view.current!.completedSteps).toHaveLength(1);
  expect(view.current!.finalTarget.id).toBe(recipe.target.id);
  expect(view.current).not.toHaveProperty('ingredientIds');
  expect(view.current).not.toHaveProperty('preparations');
  expect(view.current!.tray.every((p) => !('needed' in p))).toBe(true);
  for (const craft of [...recipe.preparations.slice(1), recipe])
    for (const id of craft.ingredientIds) add(puzzle, 2, id);
  expect(recipe.status).toBe('crafted');
  expect(recipeReward(puzzle, 60)).toBe(50);
});

test('duplicate ingredients require deliberate repeat uses; surplus correct items count as mistakes', () => {
  let puzzle = createRecipePuzzle('0', false, 'test');
  for (let n = 1; new Set(puzzle.recipes[0].ingredientIds).size !== 1; n++) {
    if (n > 200) throw new Error('No duplicate recipe');
    puzzle = createRecipePuzzle(String(n), false, 'test');
  }
  const recipe = puzzle.recipes[0];
  add(puzzle, 0, recipe.ingredientIds[0]);
  expect(recipe.accepted).toHaveLength(1);
  add(puzzle, 0, recipe.ingredientIds[0]);
  expect(recipe.accepted).toHaveLength(2);
  expect(new Set(recipe.accepted).size).toBe(1);
  expect(recipe.status).toBe('crafted');
  const other = createRecipePuzzle('0', false, 'test');
  for (let n = 1; new Set(other.recipes[0].ingredientIds).size < 2; n++)
    other.recipes[0] = createRecipePuzzle(String(n), false, 'test').recipes[0];
  add(other, 0, other.recipes[0].ingredientIds[0]);
  add(other, 0, other.recipes[0].ingredientIds[0]);
  expect(other.recipes[0].accepted).toHaveLength(1);
  expect(other.recipes[0].rejected).toHaveLength(1);
});

test('reveal skips the entire build; timed expiry closes all unfinished steps and pays no practice reward', () => {
  const puzzle = createRecipePuzzle('day', true, 'test', true, 1000);
  expect(puzzle.deadlineAt).toBe(new Date(91000).toISOString());
  expect(expireRecipes(puzzle, 90999)).toBe(false);
  applyRecipeAction(puzzle, { action: 'reveal', index: 0 });
  expect(recipeReward(puzzle, 60, true)).toBe(40);
  expect(expireRecipes(puzzle, 91000)).toBe(true);
  expect(puzzle.recipes.map((r) => r.status)).toEqual(['revealed', 'timeout', 'timeout']);
  expect(puzzle.recipes.flatMap((r) => r.preparations).some((p) => p.status === 'playing')).toBe(
    false,
  );
  expect(recipeReward(puzzle, 60)).toBe(0);
  expect(expireRecipes(puzzle, 92000)).toBe(false);
  expect(createRecipePuzzle('day', false, 'test', true).deadlineAt).toBeNull();
});

test('saved original rounds keep their duplicate-piece rules and progress', () => {
  const source = createRecipePuzzle('0', false, 'test');
  const legacy = JSON.parse(JSON.stringify(source));
  for (const recipe of legacy.recipes) {
    delete recipe.reusable;
    delete recipe.preparations;
    const correct = recipe.ingredientIds.map((id: string) =>
      recipe.tray.find((p: any) => p.item.id === id),
    );
    recipe.tray = [
      ...correct,
      ...recipe.tray.filter((p: any) => !recipe.ingredientIds.includes(p.item.id)).slice(0, 4),
    ].map((p: any, n: number) => ({ ...p, key: `piece-${n}` }));
  }
  const puzzle = readRecipePuzzle({ recipePuzzle: legacy });
  const input = { action: 'add' as const, index: 0, pieceKey: 'piece-0' };
  applyRecipeAction(puzzle, input);
  applyRecipeAction(puzzle, input);
  expect(puzzle.recipes[0].accepted).toHaveLength(1);
  expect(presentRecipeRound(asRound(puzzle)).current!.tray[0].state).toBe('accepted');
  expect(puzzle.recipes[0].preparations).toEqual([]);
});
