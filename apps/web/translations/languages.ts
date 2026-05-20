export const DEFAULT_LANGUAGE = 'en' as const;
export const LANGUAGE_STORAGE_KEY = 'lfd_language';

export const languages = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Fran\u00e7ais',
  },
} as const;

export type LanguageCode = keyof typeof languages;
export type Language = (typeof languages)[LanguageCode];

export function isLanguageCode(value: string | null): value is LanguageCode {
  return Boolean(value && value in languages);
}
