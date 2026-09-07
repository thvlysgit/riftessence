import { GameRound } from '@prisma/client';
import {
  championById,
  compareChampion,
  presentRound,
  selectAnswer,
  sounds,
  roundReward,
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
      { ...ahri, id: 'test', roles: [ahri.roles[0]], skinCount: 1 },
      { ...ahri, skinCount: 8 },
    );
    expect(comparison.correct).toBe(false);
    expect(comparison.clues[0].match).toBe(ahri.roles.length > 1 ? 'partial' : 'correct');
    expect(comparison.clues[3].direction).toBe('higher');
    expect(comparison.clues[3].label).toBe('Skins');
    expect(
      compareChampion({ ...ahri, skinCount: 12 }, { ...ahri, skinCount: 8 }).clues[3].direction,
    ).toBe('lower');
  });
  test('Archive charges 10 PE for every guess after the first, with a zero floor', () => {
    const round = { gameKey: 'archive', rewardOffer: 60, guesses: [], listenedSlots: [] };
    expect([1, 2, 3, 4, 5, 6].map((count) => roundReward(round, count))).toEqual([
      60, 50, 40, 30, 20, 10,
    ]);
    expect(roundReward({ ...round, rewardOffer: 20 }, 6)).toBe(0);
  });
  test('Soundcheck charges for distinct additional abilities, never for replays or guesses', () => {
    const round = {
      gameKey: 'soundcheck',
      rewardOffer: 60,
      guesses: ['Ashe', 'Lux'],
      listenedSlots: [] as number[],
    };
    expect(roundReward(round)).toBe(60);
    expect(roundReward({ ...round, listenedSlots: [2, 2] })).toBe(60);
    expect(roundReward({ ...round, listenedSlots: [2, 0, 2] })).toBe(50);
    expect(roundReward({ ...round, listenedSlots: [0, 1, 2, 3] })).toBe(30);
    expect(roundReward({ ...round, rewardOffer: 10, listenedSlots: [0, 1, 2, 3] })).toBe(0);
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
