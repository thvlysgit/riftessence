import { createHmac, randomInt } from 'crypto';
import { GameRound } from '@prisma/client';
import catalog from '../data/game-catalog.json';
import soundcheck from '../data/soundcheck.json';
import { EconomyError } from './economy';
import { presentItemRound } from './itemPriceGame';
import { presentRecipeRound } from './recipeRush';
import { CLUE_LABELS, ClueType, LEGACY_CLUES, compareClue, roundClueTypes } from './archiveClues';

export const GAME_KEYS = ['archive', 'soundcheck', 'shopkeeper', 'recipe-rush'] as const;
export const GAME_TITLES = {
  archive: 'Champion Archive',
  soundcheck: 'Soundcheck',
  shopkeeper: 'Shopkeeper',
  'recipe-rush': 'Recipe Rush',
};
export type GameKey = (typeof GAME_KEYS)[number];
export type Champion = (typeof catalog.champions)[number];
export const champions = catalog.champions;
export const championById = new Map(champions.map((c) => [c.id, c]));
export const sounds = soundcheck as Record<
  string,
  Array<{ key: string; name: string; file: string; source: string }>
>;
export const MAX_GUESSES = 6;
export function roundReward(
  round: Pick<GameRound, 'gameKey' | 'rewardOffer' | 'guesses' | 'listenedSlots'>,
  guessCount = round.guesses.length,
) {
  const extras =
    round.gameKey === 'archive'
      ? Math.max(0, guessCount - 1)
      : Math.max(0, new Set(round.listenedSlots || []).size - 1);
  return Math.max(0, round.rewardOffer - extras * 10);
}
export function selectAnswer(
  game: GameKey,
  day: string,
  practice: boolean,
  secret: string,
): string {
  const pool =
    game === 'soundcheck' ? champions.filter((c) => sounds[c.id]?.length >= 2) : champions;
  if (!pool.length) throw new EconomyError('This game is temporarily unavailable.', 503);
  const index = practice
    ? randomInt(pool.length)
    : createHmac('sha256', secret).update(`${day}:${game}:v1`).digest().readUInt32BE(0) %
      pool.length;
  return pool[index].id;
}
export function compareChampion(
  guess: Champion,
  answer: Champion,
  types: ClueType[] = LEGACY_CLUES,
) {
  return {
    champion: { id: guess.id, name: guess.name },
    correct: guess.id === answer.id,
    clues: types.map((type) => compareClue(type, guess, answer)),
  };
}
export function presentGameRound(round: GameRound) {
  if (round.gameKey === 'recipe-rush') return presentRecipeRound(round);
  return round.gameKey === 'shopkeeper' ? presentItemRound(round) : presentRound(round);
}
export function presentRound(round: GameRound) {
  const answer = championById.get(round.championId);
  if (!answer) throw new EconomyError('This puzzle is no longer available.', 503);
  const types = round.gameKey === 'archive' ? roundClueTypes(round) : [];
  return {
    clueTypes: types.map((key) => ({ key, label: CLUE_LABELS[key] })),
    id: round.id,
    gameKey: round.gameKey,
    day: round.day,
    practice: round.day.startsWith('practice:'),
    won: round.won,
    finished: round.finished,
    rewardOffer: round.rewardOffer,
    rewardAvailable: round.finished
      ? round.rewardPaid
      : roundReward(round, round.guesses.length + 1),
    listenedSlots: round.listenedSlots || [],
    rewardPaid: round.rewardPaid,
    maxGuesses: MAX_GUESSES,
    attempts: round.guesses.map((id) => {
      const guess = championById.get(id)!;
      return round.gameKey === 'archive'
        ? compareChampion(guess, answer, types)
        : { champion: { id: guess.id, name: guess.name }, correct: id === answer.id, clues: [] };
    }),
    audioSlots: round.gameKey === 'soundcheck' ? (sounds[answer.id] || []).map((_, i) => i) : [],
    // Explicit allowlist: no answer, ability names or original asset URLs leak.
    answer: round.finished
      ? {
          id: answer.id,
          name: answer.name,
          title: answer.title,
          clues: round.gameKey === 'archive' ? compareChampion(answer, answer, types).clues : [],
          abilities:
            round.gameKey === 'soundcheck'
              ? sounds[answer.id].map((s) => ({ key: s.key, name: s.name }))
              : [],
        }
      : null,
  };
}
