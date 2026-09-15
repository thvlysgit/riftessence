import { GameRound } from '@prisma/client';
import {
  createItemPuzzle,
  presentItemRound,
  priceDirection,
  itemScore,
} from '../src/services/itemPriceGame';
import catalog from '../src/data/item-catalog.json';

describe('Shopkeeper item comparisons', () => {
  const puzzle = createItemPuzzle('2026-09-11', false, 'test-secret');
  test('daily comparisons are deterministic, distinct, and never tied', () => {
    expect(createItemPuzzle('2026-09-11', false, 'test-secret')).toEqual(puzzle);
    expect(createItemPuzzle('2026-09-12', false, 'test-secret')).not.toEqual(puzzle);
    expect(puzzle.pairs).toHaveLength(6);
    expect(puzzle.pairs.every((pair) => pair.reference.price !== pair.challenger.price)).toBe(true);
    expect(
      puzzle.pairs.every(
        (pair) => pair.reference.tier && pair.reference.tier === pair.challenger.tier,
      ),
    ).toBe(true);
    expect(
      new Set(puzzle.pairs.flatMap((pair) => [pair.reference.id, pair.challenger.id])).size,
    ).toBe(12);
    expect(new Set(catalog.items.map((item) => item.name)).size).toBe(catalog.items.length);
    expect(catalog.items.every((item) => item.price > 0 && +item.id < 10000)).toBe(true);
  });
  test('same-tier pairing remains possible across many seeds without reusing items', () => {
    for (let day = 0; day < 120; day++) {
      const round = createItemPuzzle(`seed-${day}`, false, 'test-secret');
      expect(round.pairs).toHaveLength(6);
      expect(
        round.pairs.every(
          (pair) =>
            pair.reference.tier === pair.challenger.tier &&
            pair.reference.price !== pair.challenger.price,
        ),
      ).toBe(true);
      expect(
        new Set(round.pairs.flatMap((pair) => [pair.reference.id, pair.challenger.id])).size,
      ).toBe(12);
    }
    const byId = new Map(catalog.items.map((item) => [item.id, item]));
    expect(byId.get('1036')?.tier).toBe('component');
    expect(byId.get('3133')?.tier).toBe('epic');
    expect(byId.get('3031')?.tier).toBe('legendary');
    expect(byId.get('3006')?.tier).toBe('boots');
  });
  test('payload hides the challenger price and all future pairs, then reveals answered prices', () => {
    const round = {
      id: 'test-round',
      gameKey: 'shopkeeper',
      day: '2026-09-11',
      championId: '',
      guesses: [],
      itemPuzzle: puzzle,
      rewardOffer: 60,
      rewardPaid: 0,
      finished: false,
      won: false,
    } as unknown as GameRound;
    const fresh = presentItemRound(round);
    expect(fresh.current!.challenger).not.toHaveProperty('price');
    expect(fresh).not.toHaveProperty('itemPuzzle');
    expect(fresh.history).toEqual([]);
    const choice = priceDirection(puzzle.pairs[0]);
    const next = presentItemRound({ ...round, guesses: [choice] });
    expect(next.score).toBe(1);
    expect(next.history[0].challenger.price).toBe(puzzle.pairs[0].challenger.price);
    expect(next.current!.challenger).not.toHaveProperty('price');
    const wrong = presentItemRound({
      ...round,
      guesses: [choice === 'higher' ? 'lower' : 'higher'],
    });
    expect(wrong.rewardAvailable).toBe(50);
    expect(itemScore(puzzle, puzzle.pairs.map(priceDirection))).toBe(6);
    const legacyPuzzle = {
      ...puzzle,
      pairs: puzzle.pairs.map((pair) => ({
        reference: { ...pair.reference, tier: undefined },
        challenger: { ...pair.challenger, tier: undefined },
      })),
    };
    expect(
      presentItemRound({ ...round, itemPuzzle: JSON.parse(JSON.stringify(legacyPuzzle)) }).current
        ?.reference.price,
    ).toBe(puzzle.pairs[0].reference.price);
  });
});
