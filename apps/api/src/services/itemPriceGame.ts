import { createHash, createHmac, randomUUID } from 'crypto';
import { GameRound } from '@prisma/client';
import { z } from 'zod';
import catalog from '../data/item-catalog.json';
import { EconomyError } from './economy';

export const ITEM_COMPARISONS = 6;
const item = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int().positive(),
  image: z.string(),
  imageVersion: z.string().optional(),
  tier: z.enum(['component', 'epic', 'legendary', 'boots', 'consumable', 'starter']).optional(),
});
const puzzleSchema = z.object({
  version: z.string(),
  rulesVersion: z.number().optional(),
  pairs: z.array(z.object({ reference: item, challenger: item })).length(ITEM_COMPARISONS),
});
const catalogItems = z.array(item.required({ tier: true })).parse(catalog.items);
const byId = new Map(catalogItems.map((entry) => [entry.id, entry]));
export type ItemPuzzle = z.infer<typeof puzzleSchema>;
export const priceDirection = (pair: ItemPuzzle['pairs'][number]) =>
  pair.challenger.price > pair.reference.price ? 'higher' : 'lower';

export function createItemPuzzle(day: string, practice: boolean, secret: string): ItemPuzzle {
  const seed = practice ? randomUUID() : day;
  const pool = catalogItems
    .map((item) => ({
      item,
      hash: createHmac('sha256', secret)
        .update(`shopkeeper:${catalog.version}:${seed}:${item.id}`)
        .digest('hex'),
    }))
    .sort((a, b) => a.hash.localeCompare(b.hash))
    .map((entry) => entry.item);
  const pairs: ItemPuzzle['pairs'] = [];
  for (let i = 0; i < ITEM_COMPARISONS; i++) {
    // Discard stranded items (for example equal-priced consumables). Every pair
    // must share a tier, and no item may occur twice in the round.
    let reference = pool.pop();
    let index = -1;
    while (reference) {
      index = pool.findIndex(
        (candidate) => candidate.tier === reference!.tier && candidate.price !== reference!.price,
      );
      if (index >= 0) break;
      reference = pool.pop();
    }
    if (!reference || index < 0)
      throw new EconomyError('Item puzzles are temporarily unavailable.', 503);
    const [challenger] = pool.splice(index, 1);
    pairs.push({ reference, challenger });
  }
  return { version: catalog.version, rulesVersion: 2, pairs };
}

export function readItemPuzzle(round: Pick<GameRound, 'itemPuzzle' | 'guesses'>): ItemPuzzle {
  const result = puzzleSchema.safeParse(round.itemPuzzle);
  if (!result.success) throw new EconomyError('This item puzzle is unavailable.', 503);
  const puzzle = result.data;
  // Revalidate unanswered pairs, including rounds saved by older API builds.
  // Answered prices and rewards remain pinned. Never trust old tier labels.
  const used = new Set(
    puzzle.pairs
      .slice(0, round.guesses.length)
      .flatMap((pair) => [pair.reference.id, pair.challenger.id]),
  );
  for (let i = round.guesses.length; i < puzzle.pairs.length; i++) {
    const pair = puzzle.pairs[i];
    const reference = byId.get(pair.reference.id),
      challenger = byId.get(pair.challenger.id);
    if (
      reference &&
      challenger &&
      reference.tier === challenger.tier &&
      reference.id !== challenger.id &&
      !used.has(reference.id) &&
      !used.has(challenger.id) &&
      pair.reference.price !== pair.challenger.price
    ) {
      pair.reference.tier = reference.tier;
      pair.challenger.tier = challenger.tier;
    } else {
      // Stable repair across reloads; no randomness in a saved round's replacement.
      const pool = catalogItems
        .filter((entry) => !used.has(entry.id))
        .map((entry) => ({
          entry,
          rank: createHash('sha256')
            .update(`${puzzle.version}:${i}:${pair.reference.id}:${entry.id}`)
            .digest('hex'),
        }))
        .sort((a, b) => a.rank.localeCompare(b.rank))
        .map(({ entry }) => entry);
      const a = pool.find((entry) =>
        pool.some((other) => other.tier === entry.tier && other.price !== entry.price),
      );
      const b = a && pool.find((entry) => entry.tier === a.tier && entry.price !== a.price);
      if (!a || !b) throw new EconomyError('Item puzzles are temporarily unavailable.', 503);
      puzzle.pairs[i] = {
        reference: { ...a, imageVersion: catalog.version },
        challenger: { ...b, imageVersion: catalog.version },
      };
    }
    used.add(puzzle.pairs[i].reference.id);
    used.add(puzzle.pairs[i].challenger.id);
  }
  puzzle.rulesVersion = 2;
  return puzzle;
}

// Contains no hidden price. Prevents stale tabs from answering a repaired pair.
export function comparisonToken(puzzle: ItemPuzzle, index: number) {
  const pair = puzzle.pairs[index];
  return createHash('sha256')
    .update(
      `${puzzle.rulesVersion}:${pair.reference.imageVersion || puzzle.version}:${
        pair.challenger.imageVersion || puzzle.version
      }:${index}:${pair.reference.id}:${pair.challenger.id}`,
    )
    .digest('hex');
}

export function itemScore(puzzle: ItemPuzzle, choices: string[]) {
  return choices.reduce(
    (score, choice, i) => score + Number(choice === priceDirection(puzzle.pairs[i])),
    0,
  );
}

export function presentItemRound(round: GameRound) {
  const puzzle = readItemPuzzle(round);
  const visibleItem = ({
    id,
    name,
    image,
    tier,
    imageVersion,
  }: ItemPuzzle['pairs'][number]['reference']) => ({
    id,
    name,
    tier,
    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${
      imageVersion || puzzle.version
    }/img/item/${image}`,
  });
  const score = itemScore(puzzle, round.guesses);
  const current = !round.finished ? puzzle.pairs[round.guesses.length] : null;
  return {
    id: round.id,
    gameKey: 'shopkeeper' as const,
    day: round.day,
    practice: round.day.startsWith('practice:'),
    finished: round.finished,
    won: round.won,
    rewardOffer: round.rewardOffer,
    rewardPaid: round.rewardPaid,
    rewardAvailable: round.finished
      ? round.rewardPaid
      : Math.floor(
          (round.rewardOffer * (score + ITEM_COMPARISONS - round.guesses.length)) /
            ITEM_COMPARISONS,
        ),
    version: puzzle.version,
    score,
    total: ITEM_COMPARISONS,
    index: round.guesses.length,
    current: current
      ? {
          token: comparisonToken(puzzle, round.guesses.length),
          version: current.reference.imageVersion || puzzle.version,
          reference: { ...visibleItem(current.reference), price: current.reference.price },
          challenger: visibleItem(current.challenger),
        }
      : null,
    history: round.guesses.map((choice, i) => ({
      version: puzzle.pairs[i].reference.imageVersion || puzzle.version,
      reference: {
        ...visibleItem(puzzle.pairs[i].reference),
        price: puzzle.pairs[i].reference.price,
      },
      challenger: {
        ...visibleItem(puzzle.pairs[i].challenger),
        price: puzzle.pairs[i].challenger.price,
      },
      choice,
      correct: choice === priceDirection(puzzle.pairs[i]),
      direction: priceDirection(puzzle.pairs[i]),
    })),
  };
}
