import { Match, Community, RiotAccount } from '../src';

test('Match schema with players', () => {
  const m = {
    id: 'm1',
    players: [{ id: '1', username: 'alice' }, { id: '2', username: 'bob' }],
    timestamp: new Date().toISOString()
  };
  expect(() => Match.parse(m)).not.toThrow();
});

test('Community minimal', () => {
  const c = { id: 'c1', name: 'General' };
  expect(() => Community.parse(c)).not.toThrow();
});

test('RiotAccount optional region', () => {
  const r = { id: 'r1', name: 'PlayerOne' };
  expect(() => RiotAccount.parse(r)).not.toThrow();
});
