import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'classic' | 'arcane-pastel' | 'nightshade' | 'infernal-ember' | 'radiant-light';

interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    // Backgrounds
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    // Accents
    accent1: string;
    accent2: string;
    accent3?: string;
    // Borders
    border: string;
    borderHover: string;
    // Special
    success: string;
    error: string;
    warning: string;
  };
  style: {
    borderRadius: string;
    shadow: string;
    borderWidth: string;
  };
}

const themes: Record<ThemeName, Theme> = {
  'classic': {
    name: 'classic',
    displayName: 'Classic Dark',
    colors: {
      bgPrimary: '#0B0D12',
      bgSecondary: '#1A1A1D',
      bgTertiary: '#2B2B2F',
      textPrimary: '#FFFFFF',
      textSecondary: '#E5E5E5',
      textMuted: '#9CA3AF',
      accent1: '#C8AA6E',
      accent2: '#9A8352',
      accent3: '#D4B678',
      border: '#2B2B2F',
      borderHover: '#C8AA6E',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
    },
    style: {
      borderRadius: '0.75rem',
      shadow: '0 6px 10px -2px rgb(0 0 0 / 0.18), 0 3px 6px -2px rgb(0 0 0 / 0.12)',
      borderWidth: '1px',
    },
  },
  'arcane-pastel': {
    name: 'arcane-pastel',
    displayName: 'Arcane Pastel',
    colors: {
      bgPrimary: '#FAFAFF',
      bgSecondary: '#F5F0FF',
      bgTertiary: '#EDE4FF',
      textPrimary: '#2D2D3A',
      textSecondary: '#4A4A5E',
      textMuted: '#7D7D8F',
      accent1: '#C6A7FF',
      accent2: '#FFB3D6',
      accent3: '#8EFFC1',
      border: '#DACCFB',
      borderHover: '#C6A7FF',
      success: '#8EFFC1',
      error: '#FFB3D6',
      warning: '#FFCE9E',
    },
    style: {
      borderRadius: '1.25rem',
      shadow: '0 8px 20px rgb(198 167 255 / 0.18), 0 3px 8px rgb(255 179 214 / 0.14)',
      borderWidth: '2px',
    },
  },
  'nightshade': {
    name: 'nightshade',
    displayName: 'Nightshade',
    colors: {
      bgPrimary: '#0A0E1A',
      bgSecondary: '#141928',
      bgTertiary: '#1E2535',
      textPrimary: '#FFFFFF',
      textSecondary: '#E5E5E7',
      textMuted: '#8E8E93',
      accent1: '#B57CFF',
      accent2: '#3CEFFF',
      border: '#34363F',
      borderHover: '#B57CFF',
      success: '#3CEFFF',
      error: '#FF6B6B',
      warning: '#FFD60A',
    },
    style: {
      borderRadius: '0.6rem',
      shadow: '0 2px 6px rgb(0 0 0 / 0.25)',
      borderWidth: '1px',
    },
  },
  'infernal-ember': {
    name: 'infernal-ember',
    displayName: 'Infernal Ember',
    colors: {
      bgPrimary: '#0D0303',
      bgSecondary: '#1A0808',
      bgTertiary: '#2B1010',
      textPrimary: '#FFFFFF',
      textSecondary: '#E5E5E5',
      textMuted: '#A0A0A0',
      accent1: '#B50000',
      accent2: '#FF5F1F',
      accent3: '#7000A6',
      border: '#3A2A2A',
      borderHover: '#B50000',
      success: '#FF5F1F',
      error: '#B50000',
      warning: '#FF5F1F',
    },
    style: {
      borderRadius: '0.6rem',
      shadow: '0 10px 28px rgb(181 0 0 / 0.26), 0 4px 10px rgb(255 95 31 / 0.18)',
      borderWidth: '2px',
    },
  },
  'radiant-light': {
    name: 'radiant-light',
    displayName: 'Radiant Light',
    colors: {
      bgPrimary: '#FFFFFF',
      bgSecondary: '#F2F4F7',
      bgTertiary: '#E8ECEF',
      textPrimary: '#1A1A1A',
      textSecondary: '#4A4A4A',
      textMuted: '#7D8899',
      accent1: '#336DFF',
      accent2: '#FFB547',
      accent3: '#5B8EFF',
      border: '#D8EAFB',
      borderHover: '#336DFF',
      success: '#10B981',
      error: '#EF4444',
      warning: '#FFB547',
    },
    style: {
      borderRadius: '0.9rem',
      shadow: '0 6px 16px rgb(0 0 0 / 0.06), 0 2px 8px rgb(0 0 0 / 0.05)',
      borderWidth: '1px',
    },
  },
};

interface ThemeContextType {
  currentTheme: ThemeName;
  theme: Theme;
  setTheme: (theme: ThemeName) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('classic');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('lfd_theme') as ThemeName;
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
        console.log('[Theme] Loaded saved theme:', savedTheme);
      } else {
        console.log('[Theme] No saved theme, using classic');
      }
    } catch (error) {
      console.error('[Theme] Failed to load theme from localStorage:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Apply CSS variables when theme changes
  useEffect(() => {
    const theme = themes[currentTheme];
    const root = document.documentElement;

    // Apply color variables
    root.style.setProperty('--color-bg-primary', theme.colors.bgPrimary);
    root.style.setProperty('--color-bg-secondary', theme.colors.bgSecondary);
    root.style.setProperty('--color-bg-tertiary', theme.colors.bgTertiary);
    root.style.setProperty('--color-text-primary', theme.colors.textPrimary);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-text-muted', theme.colors.textMuted);
    root.style.setProperty('--color-accent-1', theme.colors.accent1);
    root.style.setProperty('--color-accent-2', theme.colors.accent2);
    root.style.setProperty('--color-accent-3', theme.colors.accent3 || theme.colors.accent1);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-border-hover', theme.colors.borderHover);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-error', theme.colors.error);
    root.style.setProperty('--color-warning', theme.colors.warning);

    // Apply style variables
    root.style.setProperty('--border-radius', theme.style.borderRadius);
    root.style.setProperty('--shadow', theme.style.shadow);
    root.style.setProperty('--border-width', theme.style.borderWidth);

    // Derived variables for components (cards, badges, inputs) per theme
    // Card backgrounds should sit between secondary and tertiary depending on theme brightness
    const isLight = (() => {
      // Simple heuristic: check if primary bg is very light
      try {
        const hex = theme.colors.bgPrimary.replace('#','');
        const r = parseInt(hex.substring(0,2), 16);
        const g = parseInt(hex.substring(2,4), 16);
        const b = parseInt(hex.substring(4,6), 16);
        const luminance = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
        return luminance > 0.7;
      } catch { return false; }
    })();

    const bgCard = isLight ? theme.colors.bgSecondary : theme.colors.bgSecondary;
    const borderCard = theme.colors.border;
    const textMain = theme.colors.textPrimary;
    const textSecondary = theme.colors.textSecondary;
    const textMuted = theme.colors.textMuted;

    root.style.setProperty('--bg-card', bgCard);
    root.style.setProperty('--border-card', borderCard);
    root.style.setProperty('--text-main', textMain);
    root.style.setProperty('--text-secondary', textSecondary);
    root.style.setProperty('--text-muted', textMuted);

    // Inputs use tertiary background for clearer contrast across themes
    root.style.setProperty('--bg-input', theme.colors.bgTertiary);

    // Accent primary derivatives for badges/buttons
    root.style.setProperty('--accent-primary', theme.colors.accent1);
    // Convert hex to rgba for consistent opacity across themes
    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#','');
      const r = parseInt(clean.substring(0,2),16);
      const g = parseInt(clean.substring(2,4),16);
      const b = parseInt(clean.substring(4,6),16);
      return `${r}, ${g}, ${b}`;
    };
    const accentRgb = hexToRgb(theme.colors.accent1);
    const accent2Rgb = hexToRgb(theme.colors.accent2);
    // Slightly lower opacity on light themes to avoid overpowering
    const bgOpacity = isLight ? 0.12 : 0.18;
    const borderOpacity = isLight ? 0.35 : 0.5;
    root.style.setProperty('--accent-primary-bg', `rgba(${accentRgb}, ${bgOpacity})`);
    root.style.setProperty('--accent-primary-border', `rgba(${accentRgb}, ${borderOpacity})`);

    // Discord/accent info/danger/success derived where not provided
    root.style.setProperty('--accent-discord', '#5865F2');
    root.style.setProperty('--accent-discord-bg', 'rgba(88,101,242,0.15)');
    root.style.setProperty('--accent-discord-border', 'rgba(88,101,242,0.4)');

    root.style.setProperty('--accent-info', '#3b82f6');
    root.style.setProperty('--accent-info-bg', 'rgba(59,130,246,0.15)');
    root.style.setProperty('--accent-info-border', 'rgba(59,130,246,0.4)');

    root.style.setProperty('--accent-danger', theme.colors.error);
    root.style.setProperty('--accent-danger-bg', 'rgba(239,68,68,0.15)');
    root.style.setProperty('--accent-danger-border', 'rgba(239,68,68,0.4)');

    root.style.setProperty('--accent-success', theme.colors.success);
    root.style.setProperty('--accent-success-bg', 'rgba(34,197,94,0.15)');
    root.style.setProperty('--accent-success-border', 'rgba(34,197,94,0.4)');

    // Button gradients should adapt per theme accents
    root.style.setProperty('--btn-gradient', `linear-gradient(135deg, rgba(${accentRgb}, ${isLight ? 0.9 : 1}) 0%, rgba(${accent2Rgb}, ${isLight ? 0.9 : 1}) 100%)`);
    // Text color for gradient buttons: pick contrasting text
    const gradientText = isLight ? '#1F2530' : '#F5F7FA';
    root.style.setProperty('--btn-gradient-text', gradientText);
    // Disabled background
    root.style.setProperty('--btn-disabled-bg', theme.colors.bgTertiary);

    // Card gradient accent used in some banners
    root.style.setProperty('--gradient-card', `linear-gradient(135deg, ${theme.colors.accent1}1F 0%, ${theme.colors.accent2}0D 100%)`);
  }, [currentTheme]);

  const setTheme = (theme: ThemeName) => {
    console.log('[Theme] Setting theme to:', theme);
    setCurrentTheme(theme);
    try {
      localStorage.setItem('lfd_theme', theme);
      console.log('[Theme] Saved to localStorage:', theme);
    } catch (error) {
      console.error('[Theme] Failed to save theme to localStorage:', error);
    }
  };

  const availableThemes = Object.values(themes);

  return (
    <ThemeContext.Provider value={{ currentTheme, theme: themes[currentTheme], setTheme, availableThemes }}>
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
