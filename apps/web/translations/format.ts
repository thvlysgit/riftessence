import type { TranslationValues } from './types';

const TOKEN_PATTERN = /\{(\w+)\}/g;

export function interpolate(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }

  return template.replace(TOKEN_PATTERN, (token, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? token : String(value);
  });
}
