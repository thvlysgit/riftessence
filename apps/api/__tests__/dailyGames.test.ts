import { GameRound } from '@prisma/client';
import {
  championById,
  compareChampion,
  presentRound,
  selectAnswer,
  sounds,
} from '../src/services/dailyGames';

describe('daily game rules and public payloads', () => {
  const ahri = championById.get('Ahri')!;
  test('daily answers are deterministic and sound answers have real clips', () => {
    expect(selectAnswer('archive', '2026-09-07', false, 'test-secret')).toBe(
      selectAnswer('archive', '2026-09-07', false, 'test-secret'),
    );
    expect(sounds[selectAnswer('soundcheck', '2026-09-07', false, 'test-secret')]).toHaveLength(4);
  });
  test('comparison describes exact, partial and directional hints without revealing the answer', () => {
    expect(compareChampion(ahri, ahri).clues.every((c) => c.match === 'correct')).toBe(true);
    const comparison = compareChampion(
      { ...ahri, id: 'test', roles: [ahri.roles[0]], difficulty: 1 },
      { ...ahri, difficulty: 8 },
    );
    expect(comparison.correct).toBe(false);
    expect(comparison.clues[0].match).toBe(ahri.roles.length > 1 ? 'partial' : 'correct');
    expect(comparison.clues[3].direction).toBe('higher');
  });
  test('unfinished round has no champion answer, ability names, asset paths or user identity', () => {
    const round = {
      id: 'opaque-round',
      userId: 'private-user',
      gameKey: 'soundcheck',
      day: '2026-09-07',
      championId: 'Ahri',
      guesses: [],
      won: false,
      finished: false,
      rewardOffer: 60,
      rewardPaid: 0,
    } as unknown as GameRound;
    const publicRound = presentRound(round);
    expect(publicRound.answer).toBeNull();
    expect(publicRound.audioSlots).toEqual([0, 1, 2, 3]);
    expect(JSON.stringify(publicRound)).not.toMatch(
      /Ahri|private-user|\.mp3|\.webm|cloudfront|championId/,
    );
    expect(presentRound({ ...round, finished: true }).answer?.name).toBe('Ahri');
  });
});
