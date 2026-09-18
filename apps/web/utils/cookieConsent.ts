import { LEGAL_VERSION } from './legalPolicy';
export const COOKIE_CONSENT_VERSION = LEGAL_VERSION;
export const COOKIE_CONSENT_KEY = 'riftessence_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'riftessence-cookie-consent';
export const COOKIE_CHOICE_LIFETIME = 180 * 24 * 60 * 60 * 1000;
export type OptionalCookieCategory = 'analytics' | 'advertising' | 'media';
export type CookieChoices = Record<OptionalCookieCategory, boolean>;
export type CookieConsent = CookieChoices & { version: string; savedAt: number; expiresAt: number };
export const NO_OPTIONAL_COOKIES: CookieChoices = { analytics: false, advertising: false, media: false };

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY) || 'null');
    if (!value || value.version !== COOKIE_CONSENT_VERSION ||
      !Number.isFinite(value.savedAt) || !Number.isFinite(value.expiresAt) ||
      value.savedAt > Date.now() || value.expiresAt <= Date.now() ||
      value.expiresAt - value.savedAt > COOKIE_CHOICE_LIFETIME ||
      ['analytics', 'advertising', 'media'].some(key => typeof value[key] !== 'boolean')) return null;
    return value;
  } catch { return null; }
}

export function hasCookieConsent(category: OptionalCookieCategory): boolean {
  return readCookieConsent()?.[category] === true;
}

export function saveCookieConsent(choices: CookieChoices): CookieConsent {
  const savedAt = Date.now();
  const value: CookieConsent = { ...choices, version: COOKIE_CONSENT_VERSION, savedAt, expiresAt: savedAt + COOKIE_CHOICE_LIFETIME };
  // If persistence is blocked, optional services stay disabled instead of silently enabling them.
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value));
  localStorage.removeItem('visitor_tracked');
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
  return value;
}
