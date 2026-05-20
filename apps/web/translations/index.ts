import { en } from './locales/en';
import { fr } from './locales/fr';
import { DEFAULT_LANGUAGE, languages, type LanguageCode } from './languages';
import type { TranslationCatalog, TranslationKey, TranslationValues } from './types';
import { interpolate } from './format';

export { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, languages, isLanguageCode } from './languages';
export type { Language, LanguageCode } from './languages';
export type { TranslationCatalog, TranslationKey, TranslationValues, Translate } from './types';

export const translations = {
  en,
  fr,
} satisfies Record<LanguageCode, TranslationCatalog>;

export function translate(language: LanguageCode, key: TranslationKey, values?: TranslationValues): string {
  const catalog = translations[language] ?? translations[DEFAULT_LANGUAGE];
  const fallbackCatalog = translations[DEFAULT_LANGUAGE];
  const template = catalog[key] ?? fallbackCatalog[key] ?? key;

  return interpolate(template, values);
}

export function getAvailableLanguages() {
  return Object.values(languages);
}
