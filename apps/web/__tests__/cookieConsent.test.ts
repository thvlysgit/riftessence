import { COOKIE_CHOICE_LIFETIME, COOKIE_CONSENT_KEY, COOKIE_CONSENT_VERSION, hasCookieConsent, NO_OPTIONAL_COOKIES, readCookieConsent, saveCookieConsent } from '../utils/cookieConsent';

describe('optional cookie consent', () => {
  const data = new Map<string, string>();
  beforeEach(() => {
    data.clear();
    (global as any).window = { dispatchEvent: jest.fn() };
    (global as any).localStorage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) };
  });
  afterAll(() => { delete (global as any).window; delete (global as any).localStorage; });

  test('all optional purposes default to off', () => {
    expect(readCookieConsent()).toBeNull();
    for (const category of ['analytics', 'advertising', 'media'] as const) expect(hasCookieConsent(category)).toBe(false);
  });
  test('records refusal and selective acceptance for the same lifetime', () => {
    const denied = saveCookieConsent(NO_OPTIONAL_COOKIES);
    const selected = saveCookieConsent({ ...NO_OPTIONAL_COOKIES, media: true });
    expect(denied.expiresAt - denied.savedAt).toBe(COOKIE_CHOICE_LIFETIME);
    expect(selected.expiresAt - selected.savedAt).toBe(COOKIE_CHOICE_LIFETIME);
    expect(hasCookieConsent('media')).toBe(true);
    expect(hasCookieConsent('analytics')).toBe(false);
  });
  test('expired, malformed and old-version records never authorize tracking', () => {
    const valid = { ...NO_OPTIONAL_COOKIES, analytics: true, version: COOKIE_CONSENT_VERSION, savedAt: Date.now() - 1000, expiresAt: Date.now() + 1000 };
    for (const value of [{ ...valid, expiresAt: Date.now() - 1 }, { ...valid, version: 'old' }, { ...valid, advertising: 'true' }, { ...valid, expiresAt: Date.now() + COOKIE_CHOICE_LIFETIME * 2 }]) {
      data.set(COOKIE_CONSENT_KEY, JSON.stringify(value));
      expect(hasCookieConsent('analytics')).toBe(false);
    }
    data.set(COOKIE_CONSENT_KEY, '{broken');
    expect(readCookieConsent()).toBeNull();
  });
  test('withdrawal takes effect immediately and removes the retired visitor identifier', () => {
    saveCookieConsent({ analytics: true, advertising: true, media: true });
    data.set('visitor_tracked', 'true');
    saveCookieConsent(NO_OPTIONAL_COOKIES);
    expect(hasCookieConsent('analytics')).toBe(false);
    expect(hasCookieConsent('advertising')).toBe(false);
    expect(data.has('visitor_tracked')).toBe(false);
  });
});
