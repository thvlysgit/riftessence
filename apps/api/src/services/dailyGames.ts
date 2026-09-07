import { createHmac, randomInt } from 'crypto';
import { GameRound } from '@prisma/client';
import catalog from '../data/game-catalog.json';
import soundcheck from '../data/soundcheck.json';
import { EconomyError } from './economy';

export const GAME_KEYS = ['archive', 'soundcheck'] as const;
export type GameKey = (typeof GAME_KEYS)[number];
export type Champion = (typeof catalog.champions)[number];
export const champions = catalog.champions;
export const championById = new Map(champions.map((c) => [c.id, c]));
export const sounds = soundcheck as Record<
  string,
  Array<{ key: string; name: string; file: string; source: string }>
>;
export const MAX_GUESSES = 6;
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
export function compareChampion(guess: Champion, answer: Champion) {
  const common = guess.roles.filter((role) => answer.roles.includes(role));
  return {
    champion: { id: guess.id, name: guess.name },
    correct: guess.id === answer.id,
    clues: [
      {
        label: 'Role',
        value: guess.roles.join(' / '),
        match:
          common.length === guess.roles.length && common.length === answer.roles.length
            ? 'correct'
            : common.length
            ? 'partial'
            : 'wrong',
      },
      {
        label: 'Resource',
        value: guess.resource,
        match: guess.resource === answer.resource ? 'correct' : 'wrong',
      },
      {
        label: 'Range',
        value: guess.range,
        match: guess.range === answer.range ? 'correct' : 'wrong',
      },
      {
        label: 'Difficulty',
        value: String(guess.difficulty),
        match: guess.difficulty === answer.difficulty ? 'correct' : 'wrong',
        direction:
          guess.difficulty < answer.difficulty
            ? 'higher'
            : guess.difficulty > answer.difficulty
            ? 'lower'
            : null,
      },
    ],
  };
}
export function presentRound(round: GameRound) {
  const answer = championById.get(round.championId);
  if (!answer) throw new EconomyError('This puzzle is no longer available.', 503);
  return {
    id: round.id,
    gameKey: round.gameKey,
    day: round.day,
    practice: round.day.startsWith('practice:'),
    won: round.won,
    finished: round.finished,
    rewardOffer: round.rewardOffer,
    rewardPaid: round.rewardPaid,
    maxGuesses: MAX_GUESSES,
    attempts: round.guesses.map((id) => {
      const guess = championById.get(id)!;
      return round.gameKey === 'archive'
        ? compareChampion(guess, answer)
        : { champion: { id: guess.id, name: guess.name }, correct: id === answer.id, clues: [] };
    }),
    audioSlots: round.gameKey === 'soundcheck' ? (sounds[answer.id] || []).map((_, i) => i) : [],
    // Explicit allowlist: no answer, ability names or original asset URLs leak.
    answer: round.finished
      ? {
          id: answer.id,
          name: answer.name,
          title: answer.title,
          abilities:
            round.gameKey === 'soundcheck'
              ? sounds[answer.id].map((s) => ({ key: s.key, name: s.name }))
              : [],
        }
      : null,
  };
}
