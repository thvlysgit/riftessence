import { GameRound } from '@prisma/client';
import { CLUE_LABELS, ClueType, compareClue, selectClueTypes } from '../src/services/archiveClues';
import { champions, championById, presentRound } from '../src/services/dailyGames';

test('five distinct daily clues stay deterministic and vary across days; practice is randomized', () => {
  const sets = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const selected = selectClueTypes(`day-${i}`, false, 'secret');
    expect(new Set(selected).size).toBe(5);
    expect(selectClueTypes(`day-${i}`, false, 'secret')).toEqual(selected);
    sets.add(selected.join(','));
  }
  expect(sets.size).toBeGreaterThan(20);
  expect(
    new Set(Array.from({ length: 20 }, () => selectClueTypes('day', true, 'secret').join(',')))
      .size,
  ).toBeGreaterThan(1);
});

test('every champion has all eight clue values; exact, partial and date directions work', () => {
  for (const c of champions)
    for (const type of Object.keys(CLUE_LABELS) as ClueType[]) {
      expect(compareClue(type, c, c)).toMatchObject({
        match: 'correct',
        value: expect.any(String),
      });
      expect(compareClue(type, c, c).value).not.toBe('');
    }
  const ahri = championById.get('Ahri')!,
    ashe = championById.get('Ashe')!;
  expect(compareClue('release', ahri, ashe)).toMatchObject({
    value: '2011-12-14',
    direction: 'lower',
  });
  expect(compareClue('release', ashe, ahri).direction).toBe('higher');
  expect(compareClue('gender', championById.get('Kindred')!, ahri).match).toBe('partial');
  expect(compareClue('gender', championById.get('Yunara')!, ahri).match).toBe('correct');
});

test('only selected clues are exposed, answer stays secret, and old evidence stays readable', () => {
  const clueTypes = ['lanes', 'gender', 'region', 'skins', 'release'];
  const round = {
    id: 'round',
    championId: 'Ahri',
    gameKey: 'archive',
    day: '2026-09-16',
    guesses: ['Ashe'],
    clueTypes,
    rewardOffer: 60,
    rewardPaid: 0,
    finished: false,
  } as unknown as GameRound;
  const payload = presentRound(round);
  expect(payload.clueTypes.map((c) => c.key)).toEqual(clueTypes);
  expect(payload.attempts[0].clues.map((c) => c.label)).toEqual(
    payload.clueTypes.map((c) => c.label),
  );
  expect(payload.answer).toBeNull();
  expect(JSON.stringify(payload)).not.toContain('Ahri');
  expect(presentRound({ ...round, finished: true }).answer?.clues).toHaveLength(5);
  expect(presentRound({ ...round, clueTypes: [] }).attempts[0].clues).toHaveLength(4);
});
