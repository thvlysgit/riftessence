import {
  scrimAvailabilityLabel,
  scrimEmbedColor,
} from '../src/scrimPresentation';

describe('scrim Discord presentation', () => {
  test('available posts use their rank color', () => {
    expect(scrimEmbedColor('AVAILABLE', 'GOLD')).toBe(0xd4a437);
    expect(scrimEmbedColor('CANDIDATES', 'DIAMOND')).toBe(0x6f8cff);
  });

  test('unavailable and unranked posts are black', () => {
    expect(scrimEmbedColor('SETTLED', 'CHALLENGER')).toBe(0x000000);
    expect(scrimEmbedColor('AVAILABLE', 'UNRANKED')).toBe(0x000000);
    expect(scrimAvailabilityLabel('SETTLED')).toBe('UNAVAILABLE');
  });
});
