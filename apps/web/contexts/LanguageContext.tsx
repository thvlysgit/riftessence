import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, TranslationKey } from '../translations';

export type LanguageCode = 'en' | 'fr';

interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

const languages: Record<LanguageCode, Language> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
  },
};

interface LanguageContextType {
  currentLanguage: LanguageCode;
  language: Language;
  setLanguage: (language: LanguageCode) => void;
  availableLanguages: Language[];
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');

  useEffect(() => {
    // Load saved language from localStorage
    const saved = localStorage.getItem('lfd_language') as LanguageCode | null;
    if (saved && languages[saved]) {
      console.log('[Language] Loaded from localStorage:', saved);
      setCurrentLanguage(saved);
    } else {
      console.log('[Language] No saved language, using default: en');
    }
  }, []);

  const setLanguage = (language: LanguageCode) => {
    console.log('[Language] Setting language to:', language);
    setCurrentLanguage(language);
    try {
      localStorage.setItem('lfd_language', language);
      console.log('[Language] Saved to localStorage:', language);
    } catch (error) {
      console.error('[Language] Failed to save language to localStorage:', error);
    }
  };

  const t = (key: TranslationKey): string => {
    return translations[currentLanguage][key] || translations['en'][key] || key;
  };

  const availableLanguages = Object.values(languages);

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
