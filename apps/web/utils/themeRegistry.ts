export type ThemeName =
  | 'classic'
  | 'arcane-pastel'
  | 'nightshade'
  | 'infernal-ember'
  | 'radiant-light'
  | 'ocean-depths'
  | 'forest-mystic'
  | 'sunset-blaze'
  | 'shadow-assassin';

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

type CursorKind = 'default' | 'pointer' | 'post' | 'message' | 'dropdown';

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
      error: '#FFB3D6',
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
  'forest-mystic': {
    name: 'forest-mystic',
    displayName: 'Forest Mystic',
    colors: {
      bgPrimary: '#0D1F0D',
      bgSecondary: '#1A2E1A',
      bgTertiary: '#2B4A2B',
      textPrimary: '#F0FFF0',
      textSecondary: '#D4F1D4',
      textMuted: '#A5D6A7',
      accent1: '#76FF03',
      accent2: '#00E676',
      accent3: '#69F0AE',
      border: '#2E5C2E',
      borderHover: '#76FF03',
      success: '#00E676',
      error: '#FF5252',
      warning: '#FFEB3B',
    },
    style: {
      borderRadius: '0.75rem',
      shadow: '0 8px 20px rgb(118 255 3 / 0.15), 0 3px 8px rgb(0 230 118 / 0.12)',
      borderWidth: '1px',
    },
  },
  'sunset-blaze': {
    name: 'sunset-blaze',
    displayName: 'Sunset Blaze',
    colors: {
      bgPrimary: '#1F0F0A',
      bgSecondary: '#2E1810',
      bgTertiary: '#4A2618',
      textPrimary: '#FFF8DC',
      textSecondary: '#FFE4B5',
      textMuted: '#FFD7A3',
      accent1: '#FF9500',
      accent2: '#FFD60A',
      accent3: '#FFAB00',
      border: '#5C3A2E',
      borderHover: '#FF9500',
      success: '#FFD60A',
      error: '#FF3B30',
      warning: '#FF9500',
    },
    style: {
      borderRadius: '0.75rem',
      shadow: '0 8px 20px rgb(255 149 0 / 0.18), 0 3px 8px rgb(255 214 10 / 0.14)',
      borderWidth: '1px',
    },
  },
  'shadow-assassin': {
    name: 'shadow-assassin',
    displayName: 'Shadow Assassin',
    colors: {
      bgPrimary: '#050508',
      bgSecondary: '#0D0D14',
      bgTertiary: '#15151F',
      textPrimary: '#F5F3FF',
      textSecondary: '#D8D5E8',
      textMuted: '#9C99B0',
      accent1: '#8B5CF6',
      accent2: '#6D28D9',
      accent3: '#A78BFA',
      border: '#2D1B4E',
      borderHover: '#8B5CF6',
      success: '#A78BFA',
      error: '#F472B6',
      warning: '#FCA5A5',
    },
    style: {
      borderRadius: '0.6rem',
      shadow: '0 10px 28px rgb(139 92 246 / 0.2), 0 4px 10px rgb(109 40 217 / 0.15)',
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
    // Cursor values (data URI SVGs). Values include full CSS cursor declaration.
    '--cursor-default': makeCursorCssValue(theme.name, theme.colors.accent1, 'default'),
    '--cursor-pointer': makeCursorCssValue(theme.name, theme.colors.accent1, 'pointer'),
    '--cursor-post': makeCursorCssValue(theme.name, theme.colors.accent1, 'post'),
    '--cursor-message': makeCursorCssValue(theme.name, theme.colors.accent1, 'message'),
    '--cursor-dropdown': makeCursorCssValue(theme.name, theme.colors.accent1, 'dropdown'),
  };
}
function makeCursorSvg(themeName: ThemeName, accent: string, kind: CursorKind): string {
  const fill = accent || '#000000';
  // Keep SVGs small (24-32px) and distinct per theme. These are modest, stylized shapes.
  switch (themeName) {
    case 'arcane-pastel':
      if (kind === 'post') {
        // Post butterfly: pink/magenta color (accent2) with a more dramatic flap.
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
          <defs>
            <filter id='butterfly-post-glow' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='1.2' result='blur' />
              <feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
          </defs>
          <g transform='translate(16, 16)'>
            <g transform='translate(-2, -4)'>
              <path d='M 0 0 Q -6 -6 -8 -2 Q -7 2 -1 3 Z' fill='#FFB3D6' opacity='0.97' filter='url(#butterfly-post-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; 12 0 0; 0 0 0' dur='0.62s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(2, -4)'>
              <path d='M 0 0 Q 6 -6 8 -2 Q 7 2 1 3 Z' fill='#FFB3D6' opacity='0.97' filter='url(#butterfly-post-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; -12 0 0; 0 0 0' dur='0.62s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(-2, 4)'>
              <path d='M 0 0 Q -5 5 -7 3 Q -6 0 0 1 Z' fill='#FF8BB4' opacity='0.9' filter='url(#butterfly-post-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; 10 0 0; 0 0 0' dur='0.58s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(2, 4)'>
              <path d='M 0 0 Q 5 5 7 3 Q 6 0 0 1 Z' fill='#FF8BB4' opacity='0.9' filter='url(#butterfly-post-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; -10 0 0; 0 0 0' dur='0.58s' repeatCount='indefinite' />
              </path>
            </g>
            <ellipse cx='0' cy='0' rx='1.5' ry='3' fill='#D48FBB' opacity='0.95' />
            <circle cx='0' cy='-3' r='1' fill='#C6A7FF' opacity='0.85' />
            <circle cx='0' cy='1' r='0.7' fill='#FFAA00' opacity='0.75'>
              <animate attributeName='opacity' values='0.5;0.95;0.55' dur='0.5s' repeatCount='indefinite' />
            </circle>
          </g>
        </svg>`;
      }

      if (kind === 'message') {
        // Message butterfly: mint/teal color (accent3) with softer hover motion.
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
          <defs>
            <filter id='butterfly-msg-glow' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='1.2' result='blur' />
              <feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
          </defs>
          <g transform='translate(16, 16)'>
            <g transform='translate(-2, -4)'>
              <path d='M 0 0 Q -6 -6 -8 -2 Q -7 2 -1 3 Z' fill='#8EFFC1' opacity='0.97' filter='url(#butterfly-msg-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; 8 0 0; 0 0 0' dur='0.78s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(2, -4)'>
              <path d='M 0 0 Q 6 -6 8 -2 Q 7 2 1 3 Z' fill='#8EFFC1' opacity='0.97' filter='url(#butterfly-msg-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; -8 0 0; 0 0 0' dur='0.78s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(-2, 4)'>
              <path d='M 0 0 Q -5 5 -7 3 Q -6 0 0 1 Z' fill='#6FFFE0' opacity='0.88' filter='url(#butterfly-msg-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; 6 0 0; 0 0 0' dur='0.7s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(2, 4)'>
              <path d='M 0 0 Q 5 5 7 3 Q 6 0 0 1 Z' fill='#6FFFE0' opacity='0.88' filter='url(#butterfly-msg-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; -6 0 0; 0 0 0' dur='0.7s' repeatCount='indefinite' />
              </path>
            </g>
            <ellipse cx='0' cy='0' rx='1.5' ry='3' fill='#4FD4A0' opacity='0.95' />
            <circle cx='0' cy='-3' r='1' fill='#C6A7FF' opacity='0.85' />
            <circle cx='0' cy='1' r='0.65' fill='#FFB3D6' opacity='0.75'>
              <animate attributeName='opacity' values='0.45;0.9;0.45' dur='0.7s' repeatCount='indefinite' />
            </circle>
          </g>
        </svg>`;
      }

      if (kind === 'dropdown') {
        // Dropdown butterfly: purple color (accent1) with calmer motion.
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'>
          <defs>
            <filter id='butterfly-dd-glow' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='1.1' result='blur' />
              <feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
          </defs>
          <g transform='translate(15, 15)'>
            <g transform='translate(-1.5, -3.5)'>
              <path d='M 0 0 Q -5.5 -5 -7 -1.5 Q -6 2 -0.5 2.5 Z' fill='#C6A7FF' opacity='0.97' filter='url(#butterfly-dd-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; 6 0 0; 0 0 0' dur='0.9s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(1.5, -3.5)'>
              <path d='M 0 0 Q 5.5 -5 7 -1.5 Q 6 2 0.5 2.5 Z' fill='#C6A7FF' opacity='0.97' filter='url(#butterfly-dd-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; -6 0 0; 0 0 0' dur='0.9s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(-1.5, 3.5)'>
              <path d='M 0 0 Q -4.5 4.5 -6 2.8 Q -5.3 0.5 -0.4 1.3 Z' fill='#B08FE8' opacity='0.88' filter='url(#butterfly-dd-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; 4 0 0; 0 0 0' dur='0.82s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(1.5, 3.5)'>
              <path d='M 0 0 Q 4.5 4.5 6 2.8 Q 5.3 0.5 0.4 1.3 Z' fill='#B08FE8' opacity='0.88' filter='url(#butterfly-dd-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; -4 0 0; 0 0 0' dur='0.82s' repeatCount='indefinite' />
              </path>
            </g>
            <ellipse cx='0' cy='0' rx='1.2' ry='2.8' fill='#9D7FD8' opacity='0.95' />
            <circle cx='0' cy='-2.8' r='0.9' fill='#8B6FCC' opacity='0.85' />
          </g>
        </svg>`;
      }

      if (kind === 'pointer') {
        // Pointer butterfly: purple color (accent1) with the quickest flap.
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'>
          <defs>
            <filter id='butterfly-ptr-glow' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='1.2' result='blur' />
              <feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
          </defs>
          <g transform='translate(15, 15)'>
            <g transform='translate(-1, -4)'>
              <path d='M 0 0 Q -7 -7 -9 -3 Q -8 2 -1 3 Z' fill='#C6A7FF' opacity='0.97' filter='url(#butterfly-ptr-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; 14 0 0; 0 0 0' dur='0.5s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(1, -4)'>
              <path d='M 0 0 Q 7 -7 9 -3 Q 8 2 1 3 Z' fill='#C6A7FF' opacity='0.97' filter='url(#butterfly-ptr-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; -14 0 0; 0 0 0' dur='0.5s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(-1, 3.5)'>
              <path d='M 0 0 Q -5.5 5 -7.5 2.5 Q -6.5 0.5 -1 1.3 Z' fill='#B08FE8' opacity='0.88' filter='url(#butterfly-ptr-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; 9 0 0; 0 0 0' dur='0.45s' repeatCount='indefinite' />
              </path>
            </g>
            <g transform='translate(1, 3.5)'>
              <path d='M 0 0 Q 5.5 5 7.5 2.5 Q 6.5 0.5 1 1.3 Z' fill='#B08FE8' opacity='0.88' filter='url(#butterfly-ptr-glow)'>
                <animateTransform attributeName='transform' type='rotate' values='0 0 0; -9 0 0; 0 0 0' dur='0.45s' repeatCount='indefinite' />
              </path>
            </g>
            <ellipse cx='0' cy='0' rx='1.2' ry='3' fill='#9D7FD8' opacity='0.95' />
            <circle cx='0' cy='-3.2' r='0.9' fill='#8B6FCC' opacity='0.85' />
            <line x1='-0.4' y1='-4' x2='-1.2' y2='-5.5' stroke='#C6A7FF' stroke-width='0.5' opacity='0.6' />
            <line x1='0.4' y1='-4' x2='1.2' y2='-5.5' stroke='#C6A7FF' stroke-width='0.5' opacity='0.6' />
          </g>
        </svg>`;
      }

      // Default butterfly: purple color (accent1)
      return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
        <defs>
          <filter id='butterfly-default-glow' x='-50%' y='-50%' width='200%' height='200%'>
            <feGaussianBlur stdDeviation='1' result='blur' />
            <feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge>
          </filter>
        </defs>
        <g transform='translate(14, 14)'>
          <g transform='translate(-1.2, -3.8)'>
            <path d='M 0 0 Q -6 -6 -8 -2.5 Q -7 1.5 -1 2.3 Z' fill='#C6A7FF' opacity='0.97' filter='url(#butterfly-default-glow)'>
              <animateTransform attributeName='transform' type='rotate' values='0 0 0; 10 0 0; 0 0 0' dur='0.7s' repeatCount='indefinite' />
            </path>
          </g>
          <g transform='translate(1.2, -3.8)'>
            <path d='M 0 0 Q 6 -6 8 -2.5 Q 7 1.5 1 2.3 Z' fill='#C6A7FF' opacity='0.97' filter='url(#butterfly-default-glow)'>
              <animateTransform attributeName='transform' type='rotate' values='0 0 0; -10 0 0; 0 0 0' dur='0.7s' repeatCount='indefinite' />
            </path>
          </g>
          <g transform='translate(-1.2, 3.2)'>
            <path d='M 0 0 Q -4.8 4.8 -6.8 2.6 Q -5.8 0.6 -0.8 1.4 Z' fill='#B08FE8' opacity='0.88' filter='url(#butterfly-default-glow)'>
              <animateTransform attributeName='transform' type='rotate' values='0 0 0; 5 0 0; 0 0 0' dur='0.62s' repeatCount='indefinite' />
            </path>
          </g>
          <g transform='translate(1.2, 3.2)'>
            <path d='M 0 0 Q 4.8 4.8 6.8 2.6 Q 5.8 0.6 0.8 1.4 Z' fill='#B08FE8' opacity='0.88' filter='url(#butterfly-default-glow)'>
              <animateTransform attributeName='transform' type='rotate' values='0 0 0; -5 0 0; 0 0 0' dur='0.62s' repeatCount='indefinite' />
            </path>
          </g>
          <ellipse cx='0' cy='0' rx='1' ry='2.6' fill='#9D7FD8' opacity='0.95' />
          <circle cx='0' cy='-3' r='0.8' fill='#8B6FCC' opacity='0.85' />
        </g>
      </svg>`;

    case 'nightshade':
      if (kind === 'pointer') {
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><path fill='${fill}' d='M4 4 L20 14 L12 16 L18 26 L10 28 L4 12 Z'/></svg>`;
      }
      return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${fill}' d='M2 2 L18 12 L10 12 L22 22 L14 22 L2 2 Z'/></svg>`;

    case 'infernal-ember':
      if (kind === 'post') {
        // Post cursor: Explosive spark burst with multiple radiating embers.
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'>
          <defs>
            <filter id='ie-post-glow' x='-80%' y='-80%' width='260%' height='260%'>
              <feGaussianBlur stdDeviation='1.8' result='blur' />
              <feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
            <radialGradient id='ie-post-spark' cx='50%' cy='50%' r='50%'>
              <stop offset='0%' style='stop-color:#FF8C42;stop-opacity:1' />
              <stop offset='100%' style='stop-color:#B50000;stop-opacity:0.3' />
            </radialGradient>
          </defs>
          <g transform='translate(18, 18)'>
            <circle cx='0' cy='0' r='3.5' fill='#FFAA00' opacity='0.9' filter='url(#ie-post-glow)'>
              <animate attributeName='r' values='3;4.3;3' dur='0.42s' repeatCount='indefinite' />
              <animate attributeName='opacity' values='0.7;1;0.7' dur='0.42s' repeatCount='indefinite' />
            </circle>
            <path d='M -1 -8 L 3 -1 L 1 5 L -1 4 L -3 -1 Z' fill='#FF5F1F' opacity='0.95' filter='url(#ie-post-glow)'>
              <animateTransform attributeName='transform' type='rotate' values='0 0 0; 8 0 0; 0 0 0' dur='0.42s' repeatCount='indefinite' />
            </path>
            <path d='M 0 -6 L 1 -3 L 0 0' stroke='#FFAA00' stroke-width='1.5' stroke-linecap='round' opacity='0.85' filter='url(#ie-post-glow)' fill='none' />
            <path d='M 4 -4 L 3 -1 L 1 0' stroke='#FF5F1F' stroke-width='1.2' stroke-linecap='round' opacity='0.8' filter='url(#ie-post-glow)' fill='none'>
              <animate attributeName='opacity' values='0.45;0.95;0.55' dur='0.5s' repeatCount='indefinite' />
            </path>
            <path d='M 6 0 L 3 0 L 1 0' stroke='#FFAA00' stroke-width='1.2' stroke-linecap='round' opacity='0.8' filter='url(#ie-post-glow)' fill='none'>
              <animate attributeName='opacity' values='0.4;0.9;0.5' dur='0.45s' repeatCount='indefinite' />
            </path>
            <path d='M 4 4 L 2 2 L 0 1' stroke='#FF5F1F' stroke-width='1' stroke-linecap='round' opacity='0.75' filter='url(#ie-post-glow)' fill='none'>
              <animate attributeName='opacity' values='0.35;0.85;0.4' dur='0.48s' repeatCount='indefinite' />
            </path>
            <path d='M 0 6 L 0 3 L 0 1' stroke='#FFAA00' stroke-width='1' stroke-linecap='round' opacity='0.75' filter='url(#ie-post-glow)' fill='none'>
              <animate attributeName='opacity' values='0.4;0.9;0.45' dur='0.44s' repeatCount='indefinite' />
            </path>
            <path d='M -4 4 L -2 2 L 0 1' stroke='#FF7F00' stroke-width='1' stroke-linecap='round' opacity='0.7' filter='url(#ie-post-glow)' fill='none'>
              <animate attributeName='opacity' values='0.3;0.8;0.35' dur='0.47s' repeatCount='indefinite' />
            </path>
            <path d='M -6 0 L -3 0 L -1 0' stroke='#FFAA00' stroke-width='1.2' stroke-linecap='round' opacity='0.8' filter='url(#ie-post-glow)' fill='none'>
              <animate attributeName='opacity' values='0.45;0.95;0.5' dur='0.43s' repeatCount='indefinite' />
            </path>
            <path d='M -4 -4 L -3 -1 L -1 0' stroke='#FF5F1F' stroke-width='1.2' stroke-linecap='round' opacity='0.8' filter='url(#ie-post-glow)' fill='none'>
              <animate attributeName='opacity' values='0.4;0.85;0.45' dur='0.49s' repeatCount='indefinite' />
            </path>
          </g>
        </svg>`;
      }

      if (kind === 'message') {
        // Message cursor: ember glow forming a chat bubble silhouette.
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='34' height='34' viewBox='0 0 34 34'>
          <defs>
            <filter id='ie-msg-glow' x='-60%' y='-60%' width='220%' height='220%'>
              <feGaussianBlur stdDeviation='1.6' result='blur' />
              <feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
          </defs>
          <g transform='translate(17, 17)'>
            <path d='M -8 -6 L 8 -6 Q 9 -6 9 -5 L 9 6 Q 9 7 8 7 L -4 7 L -6 10 L -5 7 L -8 7 Q -9 7 -9 6 L -9 -5 Q -9 -6 -8 -6' 
                  fill='none' stroke='#FF5F1F' stroke-width='1.8' opacity='0.9' filter='url(#ie-msg-glow)' stroke-linejoin='miter'>
              <animate attributeName='opacity' values='0.7;1;0.75' dur='0.9s' repeatCount='indefinite' />
            </path>
            <path d='M -8 -6 L 8 -6 Q 9 -6 9 -5 L 9 6 Q 9 7 8 7 L -4 7 L -6 10 L -5 7 L -8 7 Q -9 7 -9 6 L -9 -5 Q -9 -6 -8 -6' 
                  fill='none' stroke='#FFAA00' stroke-width='0.8' opacity='0.5' filter='url(#ie-msg-glow)' stroke-linejoin='miter'>
              <animate attributeName='opacity' values='0.35;0.75;0.4' dur='1.1s' repeatCount='indefinite' />
            </path>
            <circle cx='-3' cy='0' r='0.8' fill='#FF5F1F' opacity='0.75' filter='url(#ie-msg-glow)'>
              <animate attributeName='r' values='0.6;0.95;0.6' dur='1s' repeatCount='indefinite' />
            </circle>
            <circle cx='1' cy='0' r='0.6' fill='#FFAA00' opacity='0.7' filter='url(#ie-msg-glow)'>
              <animate attributeName='r' values='0.45;0.75;0.45' dur='1.05s' repeatCount='indefinite' />
            </circle>
            <circle cx='5' cy='0' r='0.7' fill='#FF5F1F' opacity='0.65' filter='url(#ie-msg-glow)'>
              <animate attributeName='r' values='0.5;0.9;0.5' dur='0.95s' repeatCount='indefinite' />
            </circle>
          </g>
        </svg>`;
      }

      if (kind === 'dropdown') {
        // Dropdown cursor: ember shard with ash particle hints.
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
          <defs>
            <filter id='ie-dd-glow' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='1.4' result='blur' />
              <feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
          </defs>
          <g transform='translate(16, 16)'>
            <path d='M -1.5 -8 L 3 0 L 1 7 L -1.5 6.5 L -3 0 Z' fill='#FF5F1F' opacity='0.95' filter='url(#ie-dd-glow)'>
              <animateTransform attributeName='transform' type='rotate' values='0 0 0; 5 0 0; 0 0 0' dur='1.1s' repeatCount='indefinite' />
            </path>
            <path d='M -0.5 -5 L 2 0 L 0.5 4 L -0.5 3.5 L -1.5 0 Z' fill='#FFAA00' opacity='0.7' filter='url(#ie-dd-glow)'>
              <animate attributeName='opacity' values='0.45;0.85;0.5' dur='0.9s' repeatCount='indefinite' />
            </path>
            <circle cx='-2' cy='9' r='0.6' fill='#7D4D3F' opacity='0.5' filter='url(#ie-dd-glow)'>
              <animate attributeName='cy' values='9;10.5;9' dur='1.1s' repeatCount='indefinite' />
              <animate attributeName='opacity' values='0.45;0.2;0.45' dur='1.1s' repeatCount='indefinite' />
            </circle>
            <circle cx='0' cy='10' r='0.5' fill='#6B4233' opacity='0.4' filter='url(#ie-dd-glow)'>
              <animate attributeName='cy' values='10;11.2;10' dur='1.25s' repeatCount='indefinite' />
              <animate attributeName='opacity' values='0.35;0.1;0.35' dur='1.25s' repeatCount='indefinite' />
            </circle>
            <circle cx='2' cy='9' r='0.55' fill='#7D4D3F' opacity='0.45' filter='url(#ie-dd-glow)'>
              <animate attributeName='cy' values='9;10.2;9' dur='1.18s' repeatCount='indefinite' />
              <animate attributeName='opacity' values='0.4;0.15;0.4' dur='1.18s' repeatCount='indefinite' />
            </circle>
          </g>
        </svg>`;
      }

      if (kind === 'pointer') {
        // Pointer cursor: pointed ember arrow shard with a small flicker.
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
          <defs>
            <filter id='ie-ptr-glow' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='1.5' result='blur' />
              <feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
          </defs>
          <g transform='translate(16, 16)'>
            <path d='M 0 -9 L 4 -1 L 2 6 L -1 5 L -3 -1 Z' fill='#FF5F1F' opacity='0.95' filter='url(#ie-ptr-glow)'>
              <animateTransform attributeName='transform' type='rotate' values='0 0 0; 3 0 0; 0 0 0' dur='0.9s' repeatCount='indefinite' />
            </path>
            <path d='M 0 -9 L 0.5 -5' stroke='#FFAA00' stroke-width='1.2' stroke-linecap='round' opacity='0.8' filter='url(#ie-ptr-glow)'>
              <animate attributeName='opacity' values='0.5;1;0.6' dur='0.55s' repeatCount='indefinite' />
            </path>
            <path d='M 0 -7 L 2.5 -0.5 L 1 4 L -0.5 3 L -1.5 -0.5 Z' fill='#FFAA00' opacity='0.6' filter='url(#ie-ptr-glow)'>
              <animate attributeName='opacity' values='0.35;0.8;0.45' dur='0.65s' repeatCount='indefinite' />
            </path>
            <path d='M 3.5 -2 Q 5 -1 4.5 2' stroke='#FF7F00' stroke-width='1' stroke-linecap='round' opacity='0.6' fill='none' filter='url(#ie-ptr-glow)'>
              <animate attributeName='opacity' values='0.25;0.85;0.3' dur='0.58s' repeatCount='indefinite' />
            </path>
          </g>
        </svg>`;
      }

      // Default cursor: Ember shard with volcanic glow
      return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
        <defs>
          <filter id='ie-default-glow' x='-50%' y='-50%' width='200%' height='200%'>
            <feGaussianBlur stdDeviation='1.3' result='blur' />
            <feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge>
          </filter>
          <radialGradient id='ie-default-fire' cx='50%' cy='30%' r='60%'>
            <stop offset='0%' style='stop-color:#FFAA00;stop-opacity:0.95' />
            <stop offset='70%' style='stop-color:#FF5F1F;stop-opacity:0.85' />
            <stop offset='100%' style='stop-color:#B50000;stop-opacity:0.4' />
          </radialGradient>
        </defs>
        <g transform='translate(14, 14)'>
          <circle cx='0' cy='0' r='5.5' fill='url(#ie-default-fire)' opacity='0.3' filter='url(#ie-default-glow)'>
            <animate attributeName='opacity' values='0.22;0.38;0.26' dur='0.8s' repeatCount='indefinite' />
            <animate attributeName='r' values='5;6;5.3' dur='0.8s' repeatCount='indefinite' />
          </circle>
          <path d='M -1.5 -7 L 3 0.5 L 1.5 6 L -1.5 5.5 L -3 0.5 Z' fill='#FF5F1F' opacity='0.95' filter='url(#ie-default-glow)'>
            <animateTransform attributeName='transform' type='rotate' values='0 0 0; 4 0 0; 0 0 0' dur='0.85s' repeatCount='indefinite' />
          </path>
          <path d='M -0.5 -4.5 L 2 0.5 L 0.5 4 L -0.5 3.5 L -1.5 0.5 Z' fill='#FFAA00' opacity='0.7' filter='url(#ie-default-glow)'>
            <animate attributeName='opacity' values='0.45;0.85;0.5' dur='0.7s' repeatCount='indefinite' />
          </path>
          <line x1='2.5' y1='0.5' x2='3.5' y2='2.5' stroke='#FFD700' stroke-width='0.7' opacity='0.5' stroke-linecap='round' filter='url(#ie-default-glow)'>
            <animate attributeName='opacity' values='0.3;0.8;0.35' dur='0.62s' repeatCount='indefinite' />
          </line>
        </g>
      </svg>`;

    case 'radiant-light':
      if (kind === 'pointer') {
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'><path fill='${fill}' d='M13 2 L15 8 L22 9 L17 13 L18 20 L13 16 L8 20 L9 13 L4 9 L11 8 Z'/></svg>`;
      }
      return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='5' fill='${fill}'/></svg>`;

    case 'ocean-depths':
      if (kind === 'pointer') {
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><path fill='${fill}' d='M4 18 C8 12 12 10 14 8 C16 6 20 6 24 10 C20 12 18 14 14 16 C10 18 6 20 4 18 Z'/></svg>`;
      }
      return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${fill}' d='M2 12 C6 8 10 6 12 6 C14 6 18 8 22 12 L20 14 C16 11 12 10 10 10 C8 10 4 11 2 14 Z'/></svg>`;

    case 'forest-mystic':
      if (kind === 'pointer') {
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><path fill='${fill}' d='M14 2 C18 8 24 10 24 16 C20 18 16 22 14 26 C12 22 8 18 4 16 C4 10 10 8 14 2 Z'/></svg>`;
      }
      return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${fill}' d='M12 2 C16 6 20 8 20 12 C16 14 14 18 12 22 C10 18 8 14 4 12 C4 8 8 6 12 2 Z'/></svg>`;

    case 'sunset-blaze':
      if (kind === 'pointer') {
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><path fill='${fill}' d='M14 2 L18 10 L26 12 L20 18 L22 26 L14 22 L6 26 L8 18 L2 12 L10 10 Z'/></svg>`;
      }
      return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='4' fill='${fill}'/></svg>`;

    case 'shadow-assassin':
      if (kind === 'pointer') {
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'><path fill='${fill}' d='M4 4 L26 15 L20 18 L26 26 L16 22 L10 26 L6 16 Z'/></svg>`;
      }
      return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='${fill}' d='M2 2 L18 12 L10 12 L22 22 L14 22 L2 2 Z'/></svg>`;

    case 'classic':
    default:
      if (kind === 'message') {
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'>
          <defs>
            <filter id='msg' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='1.4' result='b' />
              <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
          </defs>
          <g fill='none' fill-rule='evenodd'>
            <rect x='5' y='7' width='18' height='12' rx='4' fill='${fill}' fill-opacity='0.12' filter='url(#msg)' />
            <path d='M8 9h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8l-4 4v-4H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z' fill='${fill}' />
            <path d='M9 10h12' stroke='#fff' stroke-opacity='0.12' stroke-width='1' />
            <path d='M9 13h8' stroke='#fff' stroke-opacity='0.12' stroke-width='1' />
          </g>
        </svg>`;
      }

      if (kind === 'post') {
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'>
          <defs>
            <filter id='post' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='1.3' result='b' />
              <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
          </defs>
          <g fill='none' fill-rule='evenodd'>
            <rect x='7' y='7' width='16' height='16' rx='3' fill='${fill}' fill-opacity='0.12' filter='url(#post)' />
            <path d='M10 10h10v10H10z' fill='${fill}'/>
            <path d='M12 12h6v6h-6z' fill='#0B0D12' fill-opacity='0.38'/>
            <path d='M9 9l12 12' stroke='#fff' stroke-opacity='0.08' stroke-width='1' />
          </g>
        </svg>`;
      }

      if (kind === 'pointer') {
        // Stylized ring-pointer with an inset square core; avoids the arrow look.
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'>
          <defs>
            <filter id='g' x='-50%' y='-50%' width='200%' height='200%'>
              <feGaussianBlur stdDeviation='2' result='b' />
              <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
            </filter>
          </defs>
          <g fill='none' fill-rule='evenodd'>
            <rect x='6' y='6' width='16' height='16' rx='4' fill='${fill}' fill-opacity='0.12' filter='url(#g)' />
            <rect x='8' y='8' width='12' height='12' rx='3' fill='${fill}' />
            <rect x='10' y='10' width='8' height='8' rx='2' fill='#0B0D12' fill-opacity='0.34' />
            <path d='M9 15h12' stroke='#fff' stroke-opacity='0.08' stroke-width='1' />
          </g>
        </svg>`;
      }
      if (kind === 'dropdown') {
        return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
        <defs>
          <filter id='dd' x='-50%' y='-50%' width='200%' height='200%'>
            <feGaussianBlur stdDeviation='1' result='b' />
            <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
          </filter>
        </defs>
        <g fill='none' fill-rule='evenodd'>
          <rect x='6' y='6' width='16' height='16' rx='3' fill='${fill}' fill-opacity='0.12' filter='url(#dd)' />
          <rect x='7.5' y='7.5' width='13' height='13' rx='2.5' fill='none' stroke='${fill}' stroke-width='1.5' />
          <rect x='10' y='10' width='8' height='8' rx='1.5' fill='none' stroke='#fff' stroke-opacity='0.1' stroke-width='1' />
        </g>
      </svg>`;
      }

      // Default cursor: hollow square, compact and readable.
      return `<?xml version='1.0' encoding='utf-8'?><svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
        <defs>
          <filter id='g2' x='-50%' y='-50%' width='200%' height='200%'>
            <feGaussianBlur stdDeviation='1.2' result='b' />
            <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
          </filter>
        </defs>
        <g fill='none' fill-rule='evenodd'>
          <rect x='5' y='5' width='18' height='18' rx='4' fill='${fill}' fill-opacity='0.12' filter='url(#g2)' />
          <rect x='7' y='7' width='14' height='14' rx='3' fill='none' stroke='${fill}' stroke-width='1.8' />
          <rect x='9' y='9' width='10' height='10' rx='2' fill='none' stroke='#fff' stroke-opacity='0.08' stroke-width='1' />
        </g>
      </svg>`;
  }
}

function makeCursorDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeCursorCssValue(themeName: ThemeName, accent: string, kind: CursorKind) {
  const svg = makeCursorSvg(themeName, accent, kind);
  const uri = makeCursorDataUri(svg);
  
  // Hotspot positioning: center of the cursor element, adjusted per kind
  let hotspot: string;
  if (themeName === 'arcane-pastel') {
    // Butterfly cursors: hotspot at body center
    hotspot = kind === 'default' ? '14 14' : kind === 'pointer' ? '15 15' : kind === 'post' ? '16 16' : kind === 'message' ? '16 16' : '15 15';  } else if (themeName === 'infernal-ember') {
    // Ember shard cursors: hotspot at shard center/tip
    hotspot = kind === 'default' ? '14 14' : kind === 'pointer' ? '16 16' : kind === 'post' ? '18 18' : kind === 'message' ? '17 17' : '16 16';  } else {
    // Original cursors: hotspot at center/corner
    hotspot = kind === 'default' ? '2 2' : kind === 'pointer' ? '8 8' : kind === 'post' ? '12 12' : kind === 'message' ? '10 12' : '8 8';
  }
  
  return `url("${uri}") ${hotspot}, auto`;
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

const DISABLED_CURSOR_VARIABLES: Record<string, string> = {
  '--cursor-default': 'auto',
  '--cursor-pointer': 'pointer',
  '--cursor-post': 'pointer',
  '--cursor-message': 'pointer',
  '--cursor-dropdown': 'pointer',
};

export function applyThemeCursorSettings(root: HTMLElement, themeName: ThemeName, enabled: boolean): void {
  const variables = enabled ? THEME_CSS_VARIABLES[themeName] : DISABLED_CURSOR_VARIABLES;
  Object.entries({
    '--cursor-default': variables['--cursor-default'],
    '--cursor-pointer': variables['--cursor-pointer'],
    '--cursor-post': variables['--cursor-post'],
    '--cursor-message': variables['--cursor-message'],
    '--cursor-dropdown': variables['--cursor-dropdown'],
  }).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}
