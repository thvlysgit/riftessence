import { choosePreferredScrimRegion } from '../src/utils/scrimPreferences';

describe('choosePreferredScrimRegion', () => {
  test('uses the most common member region', () => {
    expect(
      choosePreferredScrimRegion(['EUW', 'NA', 'EUW'], 'NA', 'NA'),
    ).toBe('EUW');
  });

  test('uses the manager region when only one member region is known', () => {
    expect(choosePreferredScrimRegion(['EUW'], 'NA', 'EUNE')).toBe('NA');
  });

  test('uses the team region as a deterministic tie breaker and fallback', () => {
    expect(choosePreferredScrimRegion(['EUW', 'NA'], null, 'NA')).toBe('NA');
    expect(choosePreferredScrimRegion([], null, 'BR')).toBe('BR');
  });
});
