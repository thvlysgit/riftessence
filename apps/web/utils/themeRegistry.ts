export type ThemeName =
  | 'classic'
  | 'arcane-pastel'
  | 'nightshade'
  | 'infernal-ember'
  | 'radiant-light'
  | 'ocean-depths';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent1: string;
  accent2: string;
  accent3?: string;
  border: string;
  borderHover: string;
  success: string;
  error: string;
  warning: string;
}

export interface ThemeStyle {
  borderRadius: string;
  shadow: string;
  borderWidth: string;
}

export interface ThemeDefinition {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;
  style: ThemeStyle;
}

export const DEFAULT_THEME_NAME: ThemeName = 'classic';

export const THEME_REGISTRY: Record<ThemeName, ThemeDefinition> = {
  classic: {
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
      error: '#FF6B9D',
      warning: '#FFCE9E',
    },
    style: {
      borderRadius: '1.25rem',
      shadow: '0 8px 20px rgb(198 167 255 / 0.18), 0 3px 8px rgb(255 179 214 / 0.14)',
      borderWidth: '2px',
    },
  },
  nightshade: {
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
      accent3: '#E5EDFF',
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
      accent3: '#FFB347',
      border: '#3A2A2A',
      borderHover: '#FF5F1F',
      success: '#FF5F1F',
      error: '#B50000',
      warning: '#FFB347',
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
  'ocean-depths': {
    name: 'ocean-depths',
    displayName: 'Ocean Depths',
    colors: {
      bgPrimary: '#0A1828',
      bgSecondary: '#1C2A3A',
      bgTertiary: '#2B3E50',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0F7FF',
      textMuted: '#8AB4C5',
      accent1: '#00D9FF',
      accent2: '#00B8D4',
      accent3: '#4DD0E1',
      border: '#1E4E5F',
      borderHover: '#00D9FF',
      success: '#00E5CC',
      error: '#FF6B9D',
      warning: '#FFD93D',
    },
    style: {
      borderRadius: '0.75rem',
      shadow: '0 8px 20px rgb(0 217 255 / 0.15), 0 3px 8px rgb(0 184 212 / 0.12)',
      borderWidth: '1px',
    },
  },
};

export const THEME_NAMES = Object.keys(THEME_REGISTRY) as ThemeName[];

export const THEME_LIST: ThemeDefinition[] = THEME_NAMES.map((name) => THEME_REGISTRY[name]);

export function isThemeName(value: string): value is ThemeName {
  return Object.prototype.hasOwnProperty.call(THEME_REGISTRY, value);
}

export function resolveThemeName(value: string | null | undefined): ThemeName {
  if (!value) return DEFAULT_THEME_NAME;
  return isThemeName(value) ? value : DEFAULT_THEME_NAME;
}

function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '0, 0, 0';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return '0, 0, 0';
  return `${r}, ${g}, ${b}`;
}

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.7;
}

export function getThemeCssVariables(theme: ThemeDefinition): Record<string, string> {
  const accentRgb = hexToRgbChannels(theme.colors.accent1);
  const accent2Rgb = hexToRgbChannels(theme.colors.accent2);
  const accent3Rgb = hexToRgbChannels(theme.colors.accent3 || theme.colors.accent1);
  const successRgb = hexToRgbChannels(theme.colors.success);
  const errorRgb = hexToRgbChannels(theme.colors.error);
  const isLight = isLightHex(theme.colors.bgPrimary);
  const bgOpacity = isLight ? 0.12 : 0.18;
  const borderOpacity = isLight ? 0.35 : 0.5;

  return {
    '--color-bg-primary': theme.colors.bgPrimary,
    '--color-bg-secondary': theme.colors.bgSecondary,
    '--color-bg-tertiary': theme.colors.bgTertiary,
    '--color-text-primary': theme.colors.textPrimary,
    '--color-text-secondary': theme.colors.textSecondary,
    '--color-text-muted': theme.colors.textMuted,
    '--color-accent-1': theme.colors.accent1,
    '--color-accent-2': theme.colors.accent2,
    '--color-accent-3': theme.colors.accent3 || theme.colors.accent1,
    '--color-border': theme.colors.border,
    '--color-border-hover': theme.colors.borderHover,
    '--color-success': theme.colors.success,
    '--color-error': theme.colors.error,
    '--color-warning': theme.colors.warning,
    '--border-radius': theme.style.borderRadius,
    '--shadow': theme.style.shadow,
    '--border-width': theme.style.borderWidth,
    '--bg-card': theme.colors.bgSecondary,
    '--border-card': theme.colors.border,
    '--text-main': theme.colors.textPrimary,
    '--text-secondary': theme.colors.textSecondary,
    '--text-muted': theme.colors.textMuted,
    '--bg-input': theme.colors.bgTertiary,
    '--accent-primary': theme.colors.accent1,
    '--color-accent-1-rgb': accentRgb,
    '--color-accent-2-rgb': accent2Rgb,
    '--color-accent-3-rgb': accent3Rgb,
    '--accent-primary-bg': `rgba(${accentRgb}, ${bgOpacity})`,
    '--accent-primary-border': `rgba(${accentRgb}, ${borderOpacity})`,
    '--accent-discord': '#5865F2',
    '--accent-discord-bg': 'rgba(88,101,242,0.15)',
    '--accent-discord-border': 'rgba(88,101,242,0.4)',
    '--accent-info': '#3b82f6',
    '--accent-info-bg': 'rgba(59,130,246,0.15)',
    '--accent-info-border': 'rgba(59,130,246,0.4)',
    '--accent-danger': theme.colors.error,
    '--accent-danger-bg': `rgba(${errorRgb}, 0.15)`,
    '--accent-danger-border': `rgba(${errorRgb}, 0.4)`,
    '--accent-success': theme.colors.success,
    '--accent-success-bg': `rgba(${successRgb}, 0.15)`,
    '--accent-success-border': `rgba(${successRgb}, 0.4)`,
    '--btn-gradient': `linear-gradient(135deg, rgba(${accentRgb}, ${isLight ? 0.9 : 1}) 0%, rgba(${accent2Rgb}, ${isLight ? 0.9 : 1}) 100%)`,
    '--btn-gradient-text': isLight ? '#1F2530' : '#F5F7FA',
    '--btn-disabled-bg': theme.colors.bgTertiary,
    '--gradient-card': `linear-gradient(135deg, ${theme.colors.accent1}1F 0%, ${theme.colors.accent2}0D 100%)`,
    '--theme-outline-glow': `rgba(${accentRgb}, ${isLight ? 0.22 : 0.34})`,
    '--theme-soft-highlight': `rgba(${accent2Rgb}, ${isLight ? 0.2 : 0.28})`,
    '--cursor-accent': theme.colors.accent1,
    '--cursor-accent-2': theme.colors.accent2,
    '--cursor-accent-3': theme.colors.accent3 || theme.colors.accent1,
    '--cursor-accent-rgb': accentRgb,
    '--cursor-accent-2-rgb': accent2Rgb,
    '--cursor-accent-3-rgb': accent3Rgb,
    '--cursor-surface': isLight ? 'rgba(255, 255, 255, 0.78)' : 'rgba(8, 10, 16, 0.72)',
    '--cursor-contrast': isLight ? '#0B1220' : '#FFFFFF',
  };
}

export const THEME_CSS_VARIABLES = THEME_NAMES.reduce(
  (acc, themeName) => {
    acc[themeName] = getThemeCssVariables(THEME_REGISTRY[themeName]);
    return acc;
  },
  {} as Record<ThemeName, Record<string, string>>
);

export function applyThemeToRoot(root: HTMLElement, themeName: ThemeName): ThemeDefinition {
  const variables = THEME_CSS_VARIABLES[themeName];
  Object.entries(variables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
  root.setAttribute('data-theme', themeName);
  return THEME_REGISTRY[themeName];
}

export function applyThemeCursorSettings(root: HTMLElement, _themeName: ThemeName, enabled: boolean): void {
  if (enabled) {
    root.setAttribute('data-theme-cursors', 'enabled');
  } else {
    root.removeAttribute('data-theme-cursors');
  }
}
