type BadgeGrantConfig = {
  key: string;
  name: string;
  description: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverBg: string;
  shape: string;
  animation: string;
};

export type CosmeticCategory =
  | 'BADGE'
  | 'USERNAME_DECORATION'
  | 'HOVER_EFFECT'
  | 'VISUAL_EFFECT'
  | 'FONT';

export type CosmeticDefinition = {
  title: string;
  description: string;
  category: CosmeticCategory;
  costPrismaticEssence: number;
  repeatable: boolean;
  unlockKey?: string;
  adCredits?: number;
  badgeGrant?: BadgeGrantConfig;
  requiresBadgeKey?: string;
};

export const COSMETIC_DEFINITIONS = {
  USERNAME_TIDAL_INK: {
    title: 'Tidal Ink',
    description: 'A cool teal name with a clean ink finish.',
    category: 'USERNAME_DECORATION',
    costPrismaticEssence: 650,
    repeatable: false,
    unlockKey: 'username_tidal_ink',
  },
  USERNAME_ROSE_QUARTZ: {
    title: 'Rose Quartz',
    description: 'A soft rose name for your profile and navigation.',
    category: 'USERNAME_DECORATION',
    costPrismaticEssence: 900,
    repeatable: false,
    unlockKey: 'username_rose_quartz',
  },
  USERNAME_MOONLIT: {
    title: 'Moonlit',
    description: 'Silver lettering with a fine midnight outline.',
    category: 'USERNAME_DECORATION',
    costPrismaticEssence: 1500,
    repeatable: false,
    unlockKey: 'username_moonlit',
  },
  HOVER_AURORA_RING: {
    title: 'Aurora Ring',
    description: 'A subtle aurora appears when someone hovers over your name.',
    category: 'HOVER_EFFECT',
    costPrismaticEssence: 1800,
    repeatable: false,
    unlockKey: 'hover_aurora_ring',
  },
  HOVER_EMBER_TRAIL: {
    title: 'Ember Trail',
    description: 'A warm trail follows your name on hover.',
    category: 'HOVER_EFFECT',
    costPrismaticEssence: 2400,
    repeatable: false,
    unlockKey: 'hover_ember_trail',
  },
  HOVER_ECLIPSE_GLEAM: {
    title: 'Eclipse Gleam',
    description: 'A passing glint for the end of a long climb.',
    category: 'HOVER_EFFECT',
    costPrismaticEssence: 3600,
    repeatable: false,
    unlockKey: 'hover_eclipse_gleam',
  },
  BADGE_FORTUNE_COIN: {
    title: 'Novice',
    description: 'Fortune Badge I',
    category: 'BADGE',
    costPrismaticEssence: 2800,
    repeatable: false,
    badgeGrant: {
      key: 'shop_fortune_coin',
      name: 'Novice',
      description: 'Fortune Badge I',
      icon: 'gem',
      bgColor: 'linear-gradient(140deg, rgba(146,64,14,0.38), rgba(180,83,9,0.34))',
      borderColor: '#F97316',
      textColor: '#FED7AA',
      hoverBg: 'rgba(249, 115, 22, 0.28)',
      shape: 'squircle',
      animation: 'glint',
    },
  },
  BADGE_ORACLE_DICE: {
    title: 'Advanced',
    description: 'Fortune Badge II',
    category: 'BADGE',
    costPrismaticEssence: 5600,
    repeatable: false,
    requiresBadgeKey: 'shop_fortune_coin',
    badgeGrant: {
      key: 'shop_oracle_dice',
      name: 'Advanced',
      description: 'Fortune Badge II',
      icon: 'gem',
      bgColor:
        'linear-gradient(140deg, rgba(180,83,9,0.42), rgba(217,119,6,0.36), rgba(234,179,8,0.3))',
      borderColor: '#F59E0B',
      textColor: '#FEF3C7',
      hoverBg: 'rgba(245, 158, 11, 0.32)',
      shape: 'squircle',
      animation: 'drift',
    },
  },
  BADGE_JACKPOT_CROWN: {
    title: 'Expert',
    description: 'Fortune Badge III',
    category: 'BADGE',
    costPrismaticEssence: 10400,
    repeatable: false,
    requiresBadgeKey: 'shop_oracle_dice',
    badgeGrant: {
      key: 'shop_jackpot_crown',
      name: 'Expert',
      description: 'Fortune Badge III',
      icon: 'gem',
      bgColor:
        'linear-gradient(140deg, rgba(180,83,9,0.44), rgba(217,119,6,0.4), rgba(251,191,36,0.34))',
      borderColor: '#FBBF24',
      textColor: '#FEF9C3',
      hoverBg: 'rgba(251, 191, 36, 0.36)',
      shape: 'squircle',
      animation: 'spark',
    },
  },
  BADGE_VAULT_ASCENDANT: {
    title: 'Ascendant',
    description: 'Fortune Badge IV',
    category: 'BADGE',
    costPrismaticEssence: 16800,
    repeatable: false,
    requiresBadgeKey: 'shop_jackpot_crown',
    badgeGrant: {
      key: 'shop_vault_ascendant',
      name: 'Ascendant',
      description: 'Fortune Badge IV',
      icon: 'gem',
      bgColor:
        'linear-gradient(140deg, rgba(146,64,14,0.5), rgba(217,119,6,0.44), rgba(251,191,36,0.38), rgba(168,85,247,0.32))',
      borderColor: '#EAB308',
      textColor: '#FEFCE8',
      hoverBg: 'rgba(234, 179, 8, 0.42)',
      shape: 'squircle',
      animation: 'breathe',
    },
  },
  USERNAME_GILDED_EDGE: {
    title: 'Username: Gilded Edge',
    description: 'Adds a warm gold edge to your username text.',
    category: 'USERNAME_DECORATION',
    costPrismaticEssence: 500,
    repeatable: false,
    unlockKey: 'username_gilded_edge',
  },
  USERNAME_PRISMATIC_SLASH: {
    title: 'Username: Prismatic Slash',
    description: 'Adds a bright cyan/indigo split style to your username text.',
    category: 'USERNAME_DECORATION',
    costPrismaticEssence: 760,
    repeatable: false,
    unlockKey: 'username_prismatic_slash',
  },
  USERNAME_SOLAR_FLARE: {
    title: 'Username: Solar Flare',
    description: 'Paints your username text with a fiery gold-red blend.',
    category: 'USERNAME_DECORATION',
    costPrismaticEssence: 980,
    repeatable: false,
    unlockKey: 'username_solar_flare',
  },
  USERNAME_VOID_GLASS: {
    title: 'Username: Void Glass',
    description: 'Adds an icy violet glow with high contrast edges.',
    category: 'USERNAME_DECORATION',
    costPrismaticEssence: 1180,
    repeatable: false,
    unlockKey: 'username_void_glass',
  },
  FONT_ORBITRON: {
    title: 'Name Font: Orbitron',
    description: 'Applies a futuristic font to your username.',
    category: 'FONT',
    costPrismaticEssence: 420,
    repeatable: false,
    unlockKey: 'font_orbitron',
  },
  FONT_CINZEL: {
    title: 'Name Font: Cinzel',
    description: 'Applies a serif display style to your username.',
    category: 'FONT',
    costPrismaticEssence: 420,
    repeatable: false,
    unlockKey: 'font_cinzel',
  },
  FONT_EXO2: {
    title: 'Name Font: Exo 2',
    description: 'Applies a competitive sci-fi font to your username.',
    category: 'FONT',
    costPrismaticEssence: 520,
    repeatable: false,
    unlockKey: 'font_exo2',
  },
  FONT_RAJDHANI: {
    title: 'Name Font: Rajdhani',
    description: 'Applies a sharp esports display font to your username.',
    category: 'FONT',
    costPrismaticEssence: 620,
    repeatable: false,
    unlockKey: 'font_rajdhani',
  },
  FONT_AUDIOWIDE: {
    title: 'Name Font: Audiowide',
    description: 'Applies a futuristic rounded display font to your username.',
    category: 'FONT',
    costPrismaticEssence: 760,
    repeatable: false,
    unlockKey: 'font_audiowide',
  },
  FONT_UNBOUNDED: {
    title: 'Name Font: Unbounded',
    description: 'Applies a bold geometric premium font to your username.',
    category: 'FONT',
    costPrismaticEssence: 980,
    repeatable: false,
    unlockKey: 'font_unbounded',
  },
  FONT_BEBAS_NEUE: {
    title: 'Name Font: Bebas Neue',
    description: 'Applies a tall impact display font to your username.',
    category: 'FONT',
    costPrismaticEssence: 680,
    repeatable: false,
    unlockKey: 'font_bebas_neue',
  },
} as const satisfies Record<string, CosmeticDefinition>;

export type CosmeticKey = keyof typeof COSMETIC_DEFINITIONS;
export const COSMETIC_KEYS = Object.keys(COSMETIC_DEFINITIONS) as CosmeticKey[];
export const ACTIVE_FIELD_BY_CATEGORY = {
  USERNAME_DECORATION: 'activeUsernameDecoration',
  HOVER_EFFECT: 'activeHoverEffect',
  VISUAL_EFFECT: 'activeVisualEffect',
  FONT: 'activeNameplateFont',
} as const;
