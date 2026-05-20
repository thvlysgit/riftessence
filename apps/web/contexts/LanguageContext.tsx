import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  getAvailableLanguages,
  isLanguageCode,
  languages,
  translate,
  type Language,
  type LanguageCode,
  type TranslationKey,
  type TranslationValues,
} from '../translations';

export type { LanguageCode };

interface LanguageContextType {
  currentLanguage: LanguageCode;
  language: Language;
  setLanguage: (language: LanguageCode) => void;
  availableLanguages: Language[];
  t: (key: TranslationKey, values?: TranslationValues) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguageCode(saved)) {
      setCurrentLanguage(saved);
    }
  }, []);

  const setLanguage = useCallback((language: LanguageCode) => {
    setCurrentLanguage(language);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('[Language] Failed to save language to localStorage:', error);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues): string => translate(currentLanguage, key, values),
    [currentLanguage]
  );

  const availableLanguages = useMemo(() => getAvailableLanguages(), []);

  return (
    <LanguageContext.Provider value={{ currentLanguage, language: languages[currentLanguage], setLanguage, availableLanguages, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
