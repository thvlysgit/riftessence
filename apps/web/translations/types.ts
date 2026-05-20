import { en } from './locales/en';

export type TranslationKey = keyof typeof en;
export type TranslationCatalog = Record<TranslationKey, string>;
export type TranslationValues = Record<string, string | number | boolean | null | undefined>;
export type Translate = (key: TranslationKey, values?: TranslationValues) => string;
