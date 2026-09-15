import { createHmac, randomUUID } from 'crypto';
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
});
const puzzleSchema = z.object({
  version: z.string(),
  pairs: z.array(z.object({ reference: item, challenger: item })).length(ITEM_COMPARISONS),
});
export type ItemPuzzle = z.infer<typeof puzzleSchema>;
export const priceDirection = (pair: ItemPuzzle['pairs'][number]) =>
  pair.challenger.price > pair.reference.price ? 'higher' : 'lower';

export function createItemPuzzle(day: string, practice: boolean, secret: string): ItemPuzzle {
  const seed = practice ? randomUUID() : day;
  const pool = catalog.items
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
    const reference = pool.pop();
    const index = pool.findIndex((candidate) => candidate.price !== reference?.price);
    if (!reference || index < 0)
      throw new EconomyError('Item puzzles are temporarily unavailable.', 503);
    const [challenger] = pool.splice(index, 1);
    pairs.push({ reference, challenger });
  }
  return { version: catalog.version, pairs };
}

export function readItemPuzzle(round: Pick<GameRound, 'itemPuzzle'>): ItemPuzzle {
  const result = puzzleSchema.safeParse(round.itemPuzzle);
  if (!result.success) throw new EconomyError('This item puzzle is unavailable.', 503);
  return result.data;
}

export function itemScore(puzzle: ItemPuzzle, choices: string[]) {
  return choices.reduce(
    (score, choice, i) => score + Number(choice === priceDirection(puzzle.pairs[i])),
    0,
  );
}

export function presentItemRound(round: GameRound) {
  const puzzle = readItemPuzzle(round);
  const visibleItem = ({ id, name, image }: ItemPuzzle['pairs'][number]['reference']) => ({
    id,
    name,
    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${puzzle.version}/img/item/${image}`,
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
          reference: { ...visibleItem(current.reference), price: current.reference.price },
          challenger: visibleItem(current.challenger),
        }
      : null,
    history: round.guesses.map((choice, i) => ({
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
