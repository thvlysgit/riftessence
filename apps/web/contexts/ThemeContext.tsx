import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  DEFAULT_THEME_NAME,
  THEME_LIST,
  THEME_REGISTRY,
  ThemeDefinition,
  ThemeName,
  applyThemeToRoot,
  resolveThemeName,
} from '../utils/themeRegistry';

export type Theme = ThemeDefinition;
export type { ThemeName };

interface ThemeContextType {
  currentTheme: ThemeName;
  theme: Theme;
  setTheme: (theme: ThemeName) => void;
  availableThemes: Theme[];
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getInitialTheme = (): ThemeName => {
  if (typeof window === 'undefined') return DEFAULT_THEME_NAME;
  try {
    return resolveThemeName(localStorage.getItem('lfd_theme'));
  } catch (error) {
    console.error('[Theme] Failed to load theme from localStorage:', error);
    return DEFAULT_THEME_NAME;
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(DEFAULT_THEME_NAME);

  useEffect(() => {
    const savedTheme = getInitialTheme();
    if (savedTheme !== DEFAULT_THEME_NAME) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    applyThemeToRoot(root, currentTheme);
  }, [currentTheme]);

  const setTheme = (themeName: ThemeName) => {
    const safeTheme = resolveThemeName(themeName);
    console.log('[Theme] Setting theme to:', safeTheme);
    setCurrentTheme(safeTheme);
    try {
      localStorage.setItem('lfd_theme', safeTheme);
      console.log('[Theme] Saved to localStorage:', safeTheme);
    } catch (error) {
      console.error('[Theme] Failed to save theme to localStorage:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        theme: THEME_REGISTRY[currentTheme],
        setTheme,
        availableThemes: THEME_LIST,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
