import { randomInt } from 'crypto';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { logAdminAction } from '../utils/auditLog';
import { validateRequest } from '../validation';

function parseBoundedInt(raw: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.max(min, Math.min(max, rounded));
}

const STARTER_PRISMATIC_ESSENCE = parseBoundedInt(
  process.env.PRISMATIC_STARTER_GRANT || process.env.RIFTCOINS_STARTER_GRANT,
  1200,
  0,
  5_000_000
);

type WalletRow = {
  id: string;
  userId: string;
  riftCoins: number;
  prismaticEssence: number;
  totalRiftCoinsEarned: number;
  totalRiftCoinsSpent: number;
  createdAt: Date;
  updatedAt: Date;
};

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

type QuestDefinition = {
  title: string;
  description: string;
  rewardPrismaticEssence: number;
  repeatWindow: 'DAILY' | 'ONE_TIME';
};

const QUEST_DEFINITIONS = {
  DAILY_CHECKIN: {
    title: 'Daily Login',
    description: 'Open the purse and claim your daily PE.',
    rewardPrismaticEssence: 120,
    repeatWindow: 'DAILY',
  },
  DAILY_SOCIAL_SPARK: {
    title: 'Daily Social',
    description: 'Send one chat message or publish one duo post today.',
    rewardPrismaticEssence: 95,
    repeatWindow: 'DAILY',
  },
  COMPLETE_PROFILE: {
    title: 'Complete Profile',
    description: 'Connect Riot + Discord, set champion pool, and add your bio.',
    rewardPrismaticEssence: 320,
    repeatWindow: 'ONE_TIME',
  },
  CREATE_FIRST_DUO_POST: {
    title: 'Create First Duo Post',
    description: 'Publish your first duo post in LFD.',
    rewardPrismaticEssence: 190,
    repeatWindow: 'ONE_TIME',
  },
  CREATE_FIRST_LFT_POST: {
    title: 'Create First LFT Listing',
    description: 'Create your first LFT player or team listing.',
    rewardPrismaticEssence: 220,
    repeatWindow: 'ONE_TIME',
  },
  JOIN_FIRST_COMMUNITY: {
    title: 'Join First Community',
    description: 'Join any community on RiftEssence.',
    rewardPrismaticEssence: 210,
    repeatWindow: 'ONE_TIME',
  },
  LINK_DISCORD_ACCOUNT: {
    title: 'Authorize Discord Bot',
    description: 'Link Discord from profile/settings to authorize the bot.',
    rewardPrismaticEssence: 160,
    repeatWindow: 'ONE_TIME',
  },
  ENABLE_DISCORD_DMS: {
    title: 'Keep Discord DMs on',
    description: 'Keep Discord DM notifications enabled in settings.',
    rewardPrismaticEssence: 140,
    repeatWindow: 'ONE_TIME',
  },
  JOIN_SUPPORT_SERVER: {
    title: 'Join Support Server',
    description: 'Join the official support Discord (linked Discord account required).',
    rewardPrismaticEssence: 210,
    repeatWindow: 'ONE_TIME',
  },
  RECEIVE_FIRST_FEEDBACK: {
    title: 'Receive First Feedback',
    description: 'Get your first rating from another player.',
    rewardPrismaticEssence: 165,
    repeatWindow: 'ONE_TIME',
  },
  SEND_FIRST_CHAT_MESSAGE: {
    title: 'Send First Chat Message',
    description: 'Start one conversation in RiftEssence chat.',
    rewardPrismaticEssence: 120,
    repeatWindow: 'ONE_TIME',
  },
} as const satisfies Record<string, QuestDefinition>;

type QuestKey = keyof typeof QUEST_DEFINITIONS;
const QUEST_KEYS = Object.keys(QUEST_DEFINITIONS) as QuestKey[];

const DEFAULT_SUPPORT_DISCORD_GUILD_ID = '1051156621860020304';
const SUPPORT_DISCORD_INVITE_CODE = String(process.env.SUPPORT_DISCORD_INVITE_CODE || 'uypaWqmxx6').toLowerCase();
const SUPPORT_COMMUNITY_HINTS = String(process.env.SUPPORT_COMMUNITY_HINTS || 'riftessence-support,support')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);
const SUPPORT_DISCORD_SERVER_IDS = new Set(
  String(process.env.SUPPORT_DISCORD_SERVER_IDS || DEFAULT_SUPPORT_DISCORD_GUILD_ID)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
);
const SUPPORT_DISCORD_GUILD_ID = String(process.env.SUPPORT_DISCORD_GUILD_ID || DEFAULT_SUPPORT_DISCORD_GUILD_ID).trim();
if (SUPPORT_DISCORD_GUILD_ID) {
  SUPPORT_DISCORD_SERVER_IDS.add(SUPPORT_DISCORD_GUILD_ID);
}
SUPPORT_DISCORD_SERVER_IDS.add(DEFAULT_SUPPORT_DISCORD_GUILD_ID);

const DISCORD_BOT_TOKEN = String(process.env.DISCORD_BOT_TOKEN || '').trim();
const SUPPORT_SERVER_MEMBERSHIP_CACHE_TTL_MS = parseBoundedInt(
  process.env.SUPPORT_SERVER_MEMBERSHIP_CACHE_TTL_MS,
  5 * 60 * 1000,
  30 * 1000,
  30 * 60 * 1000
);

type CachedSupportMembership = {
  value: boolean;
  expiresAt: number;
};

const supportServerMembershipCache = new Map<string, CachedSupportMembership>();

type ActionDefinition = {
  title: string;
  description: string;
  costPrismaticEssence: number;
  repeatable: boolean;
  category: 'Loot' | 'Community';
};

type ActionKey =
  | 'OPEN_PRISMATIC_CACHE'
  | 'COMMUNITY_WELL_DONATION';

const ACTION_DEFINITIONS: Record<ActionKey, ActionDefinition> = {
  OPEN_PRISMATIC_CACHE: {
    title: 'Open Prismatic Cache',
    description: 'Spend PE for a random PE payout.',
    costPrismaticEssence: 110,
    repeatable: true,
    category: 'Loot',
  },
  COMMUNITY_WELL_DONATION: {
    title: 'Donate To Community Well',
    description: 'Spend PE to support event drops and community pools.',
    costPrismaticEssence: 180,
    repeatable: true,
    category: 'Community',
  },
};

const ACTION_KEYS = Object.keys(ACTION_DEFINITIONS) as ActionKey[];

type GambleGameDefinition = {
  title: string;
  description: string;
  minWager: number;
  maxWager: number;
  singlePlayerOnly: boolean;
  choices: readonly string[] | null;
};

const GAMBLE_GAME_DEFINITIONS = {
  COIN_FLIP: {
    title: 'Coin Flip',
    description: 'Pick heads or tails. Win pays 1.9x, lose pays 0x.',
    minWager: 25,
    maxWager: 50_000,
    singlePlayerOnly: true,
    choices: ['HEADS', 'TAILS'],
  },
  SLOT_MACHINE: {
    title: 'Slot Machine',
    description: 'Spin the reels and chase multiplier payouts.',
    minWager: 25,
    maxWager: 75_000,
    singlePlayerOnly: true,
    choices: null,
  },
  ROULETTE: {
    title: 'Roulette',
    description: 'Pick a color and spin the wheel.',
    minWager: 50,
    maxWager: 100_000,
    singlePlayerOnly: true,
    choices: ['RED', 'BLACK', 'GREEN'],
  },
} as const satisfies Record<string, GambleGameDefinition>;

type GambleGameKey = keyof typeof GAMBLE_GAME_DEFINITIONS;
const GAMBLE_GAME_KEYS = Object.keys(GAMBLE_GAME_DEFINITIONS) as GambleGameKey[];

type CosmeticCategory = 'BADGE' | 'USERNAME_DECORATION' | 'HOVER_EFFECT' | 'VISUAL_EFFECT' | 'FONT';

type CosmeticDefinition = {
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

const COSMETIC_DEFINITIONS = {
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
      bgColor: 'linear-gradient(140deg, rgba(180,83,9,0.42), rgba(217,119,6,0.36), rgba(234,179,8,0.3))',
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
      bgColor: 'linear-gradient(140deg, rgba(180,83,9,0.44), rgba(217,119,6,0.4), rgba(251,191,36,0.34))',
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
      bgColor: 'linear-gradient(140deg, rgba(146,64,14,0.5), rgba(217,119,6,0.44), rgba(251,191,36,0.38), rgba(168,85,247,0.32))',
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
  VISUAL_STARDUST: {
    title: 'Profile BG: Stardust Drift',
    description: 'Adds subtle sparkle texture behind your profile header.',
    category: 'VISUAL_EFFECT',
    costPrismaticEssence: 780,
    repeatable: false,
    unlockKey: 'visual_stardust',
  },
  VISUAL_SCANLINES: {
    title: 'Profile BG: Signal Scanlines',
    description: 'Adds a soft scanline sheen on your profile header.',
    category: 'VISUAL_EFFECT',
    costPrismaticEssence: 980,
    repeatable: false,
    unlockKey: 'visual_scanlines',
  },
  VISUAL_NEBULA_PULSE: {
    title: 'Profile BG: Nebula Pulse',
    description: 'Adds a soft animated nebula wash behind your profile header.',
    category: 'VISUAL_EFFECT',
    costPrismaticEssence: 1450,
    repeatable: false,
    unlockKey: 'visual_nebula_pulse',
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

const ADSPACE_CREDIT_UNIT_PRICE = 900;

type CosmeticItemKey = keyof typeof COSMETIC_DEFINITIONS;
const COSMETIC_KEYS = Object.keys(COSMETIC_DEFINITIONS) as CosmeticItemKey[];

const ACTIVE_FIELD_BY_CATEGORY = {
  USERNAME_DECORATION: 'activeUsernameDecoration',
  HOVER_EFFECT: 'activeHoverEffect',
  VISUAL_EFFECT: 'activeVisualEffect',
  FONT: 'activeNameplateFont',
} as const;

type ActiveCosmeticField = (typeof ACTIVE_FIELD_BY_CATEGORY)[keyof typeof ACTIVE_FIELD_BY_CATEGORY];

const WalletTransactionsQuerySchema = z.object({
  limit: z.preprocess((value) => (value === undefined ? 40 : Number(value)), z.number().int().min(1).max(100)).default(40),
  offset: z.preprocess((value) => (value === undefined ? 0 : Number(value)), z.number().int().min(0)).default(0),
  currency: z.enum(['ALL', 'PRISMATIC_ESSENCE', 'RIFT_COINS']).default('ALL'),
});

const BuyAdspaceCreditsSchema = z.object({
  quantity: z.preprocess((value) => (value === undefined ? 1 : Number(value)), z.number().int().min(1).max(250)).default(1),
});

const GamblePlaySchema = z.object({
  wager: z.preprocess((value) => Number(value), z.number().int().min(1).max(500_000)),
  choice: z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim().toUpperCase();
    return normalized.length > 0 ? normalized : undefined;
  }, z.string().max(24).optional()),
});

const DeactivateCosmeticSchema = z.object({
  category: z.enum(['ALL', 'USERNAME_DECORATION', 'HOVER_EFFECT', 'VISUAL_EFFECT', 'FONT']).default('ALL'),
});

const AdminGrantPeSchema = z.object({
  grantToSelf: z.preprocess((value) => value === true || value === 'true' || value === 1 || value === '1', z.boolean()),
  targetUserId: z.preprocess((value) => {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }, z.string().min(1).max(64).optional()),
  targetUsername: z.preprocess((value) => {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }, z.string().min(2).max(40).optional()),
  amount: z.preprocess((value) => Number(value), z.number().int().min(1).max(1_000_000)),
  reason: z.preprocess((value) => {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }, z.string().max(180).optional()),
});

const AdminRemovePeSchema = z.object({
  removeFromSelf: z.preprocess((value) => value === true || value === 'true' || value === 1 || value === '1', z.boolean()),
  targetUserId: z.preprocess((value) => {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }, z.string().min(1).max(64).optional()),
  targetUsername: z.preprocess((value) => {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }, z.string().min(2).max(40).optional()),
  amount: z.preprocess((value) => Number(value), z.number().int().min(1).max(1_000_000)),
  reason: z.preprocess((value) => {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }, z.string().max(180).optional()),
});

function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getStartOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function getNextUtcMidnightIso(date = new Date()) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0));
  return next.toISOString();
}

function getQuestClaimWindow(questKey: QuestKey, now = new Date()) {
  const definition = QUEST_DEFINITIONS[questKey];
  return definition.repeatWindow === 'DAILY' ? getUtcDateKey(now) : 'ONE_TIME';
}

function isKnownQuestKey(value: string): value is QuestKey {
  return (QUEST_KEYS as string[]).includes(value);
}

function isKnownActionKey(value: string): value is ActionKey {
  return (ACTION_KEYS as string[]).includes(value);
}

function isKnownGambleGameKey(value: string): value is GambleGameKey {
  return (GAMBLE_GAME_KEYS as string[]).includes(value);
}

function isKnownCosmeticKey(value: string): value is CosmeticItemKey {
  return (COSMETIC_KEYS as string[]).includes(value);
}

function getCosmeticTitleByBadgeKey(badgeKey: string): string | null {
  const normalized = String(badgeKey || '').trim().toLowerCase();
  if (!normalized) return null;

  for (const itemKey of COSMETIC_KEYS) {
    const definition = COSMETIC_DEFINITIONS[itemKey] as CosmeticDefinition;
    if (definition.badgeGrant?.key.toLowerCase() === normalized) {
      return definition.title;
    }
  }

  return null;
}

function hasJoinedSupportServer(memberships: Array<{ community: { slug: string; name: string; inviteLink: string | null; discordServerId: string | null } }>) {
  return memberships.some((membership) => {
    const slug = String(membership.community?.slug || '').toLowerCase();
    const name = String(membership.community?.name || '').toLowerCase();
    const inviteLink = String(membership.community?.inviteLink || '').toLowerCase();
    const discordServerId = String(membership.community?.discordServerId || '');

    if (SUPPORT_DISCORD_SERVER_IDS.size > 0 && discordServerId && SUPPORT_DISCORD_SERVER_IDS.has(discordServerId)) {
      return true;
    }

    if (SUPPORT_DISCORD_INVITE_CODE && inviteLink.includes(SUPPORT_DISCORD_INVITE_CODE)) {
      return true;
    }

    if (name.includes('support')) {
      return true;
    }

    return SUPPORT_COMMUNITY_HINTS.some((hint) => slug.includes(hint));
  });
}

async function hasJoinedSupportServerViaDiscord(discordId: string): Promise<boolean> {
  const normalizedDiscordId = String(discordId || '').trim();
  if (!normalizedDiscordId) {
    return false;
  }

  const now = Date.now();
  const cached = supportServerMembershipCache.get(normalizedDiscordId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  if (!DISCORD_BOT_TOKEN || SUPPORT_DISCORD_SERVER_IDS.size === 0) {
    supportServerMembershipCache.set(normalizedDiscordId, {
      value: false,
      expiresAt: now + SUPPORT_SERVER_MEMBERSHIP_CACHE_TTL_MS,
    });
    return false;
  }

  for (const guildId of SUPPORT_DISCORD_SERVER_IDS) {
    const normalizedGuildId = String(guildId || '').trim();
    if (!normalizedGuildId) continue;

    try {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${encodeURIComponent(normalizedGuildId)}/members/${encodeURIComponent(normalizedDiscordId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        supportServerMembershipCache.set(normalizedDiscordId, {
          value: true,
          expiresAt: now + SUPPORT_SERVER_MEMBERSHIP_CACHE_TTL_MS,
        });
        return true;
      }

      if (response.status === 404) {
        continue;
      }
    } catch {
      // Best-effort check; leave fallback eligibility checks in place.
    }
  }

  supportServerMembershipCache.set(normalizedDiscordId, {
    value: false,
    expiresAt: now + SUPPORT_SERVER_MEMBERSHIP_CACHE_TTL_MS,
  });
  return false;
}

function hasChampionPoolConfigured(user: {
  championList?: string[];
  championTierlist?: any;
}) {
  const championList = Array.isArray(user.championList)
    ? user.championList.filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    : [];

  if (championList.length > 0) {
    return true;
  }

  const tierlist = user.championTierlist;
  if (!tierlist || typeof tierlist !== 'object' || Array.isArray(tierlist)) {
    return false;
  }

  return Object.values(tierlist).some((value) => Array.isArray(value) && value.length > 0);
}

function resolveGambleOutcome(gameKey: GambleGameKey, wager: number, choice?: string) {
  if (gameKey === 'COIN_FLIP') {
    const normalizedChoice = String(choice || '').toUpperCase();
    if (normalizedChoice !== 'HEADS' && normalizedChoice !== 'TAILS') {
      throw new Error('Pick HEADS or TAILS for Coin Flip.');
    }

    const result = randomInt(0, 2) === 0 ? 'HEADS' : 'TAILS';
    const won = normalizedChoice === result;
    const multiplier = won ? 1.9 : 0;
    const payout = won ? Math.floor(wager * multiplier) : 0;

    return {
      won,
      payout,
      multiplier,
      netPrismaticEssence: payout - wager,
      outcomeLabel: result,
      outcomeDetail: won ? 'Direct hit' : 'Wrong side',
      normalizedChoice,
      rollValue: null as number | null,
    };
  }

  if (gameKey === 'SLOT_MACHINE') {
    const roll = randomInt(1, 10_001);
    let tier = 'No Match';
    let multiplier = 0;

    if (roll <= 120) {
      tier = 'Jackpot';
      multiplier = 8;
    } else if (roll <= 1_400) {
      tier = 'Double Bars';
      multiplier = 2.8;
    } else if (roll <= 4_300) {
      tier = 'Single Bar';
      multiplier = 1.4;
    }

    const payout = multiplier > 0 ? Math.floor(wager * multiplier) : 0;

    return {
      won: payout > 0,
      payout,
      multiplier,
      netPrismaticEssence: payout - wager,
      outcomeLabel: tier,
      outcomeDetail: `Roll ${roll}`,
      normalizedChoice: null as string | null,
      rollValue: roll,
    };
  }

  if (gameKey === 'ROULETTE') {
    const normalizedChoice = String(choice || '').toUpperCase();
    if (normalizedChoice !== 'RED' && normalizedChoice !== 'BLACK' && normalizedChoice !== 'GREEN') {
      throw new Error('Pick RED, BLACK, or GREEN for Roulette.');
    }

    const number = randomInt(0, 37);
    const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const wheelColor = number === 0 ? 'GREEN' : redNumbers.has(number) ? 'RED' : 'BLACK';

    const won = normalizedChoice === wheelColor;
    const multiplier = won
      ? normalizedChoice === 'GREEN'
        ? 14
        : 2
      : 0;

    const payout = won ? Math.floor(wager * multiplier) : 0;

    return {
      won,
      payout,
      multiplier,
      netPrismaticEssence: payout - wager,
      outcomeLabel: `${wheelColor} ${number}`,
      outcomeDetail: `Number ${number}`,
      normalizedChoice,
      rollValue: number,
    };
  }

  throw new Error('Unsupported gamble game.');
}

type UserCosmeticState = {
  unlockedCosmetics: string[];
  activeUsernameDecoration: string | null;
  activeHoverEffect: string | null;
  activeVisualEffect: string | null;
  activeNameplateFont: string | null;
  adCredits: number;
  badges: Array<{ key: string }>;
};

function getActiveFieldForCategory(category: CosmeticCategory): ActiveCosmeticField | null {
  if (category === 'USERNAME_DECORATION') return ACTIVE_FIELD_BY_CATEGORY.USERNAME_DECORATION;
  if (category === 'HOVER_EFFECT') return ACTIVE_FIELD_BY_CATEGORY.HOVER_EFFECT;
  if (category === 'VISUAL_EFFECT') return ACTIVE_FIELD_BY_CATEGORY.VISUAL_EFFECT;
  if (category === 'FONT') return ACTIVE_FIELD_BY_CATEGORY.FONT;
  return null;
}

function buildProgression(totalEarned: number) {
  const safeTotal = Math.max(0, totalEarned);
  const tierSize = 1000;
  const level = Math.floor(safeTotal / tierSize) + 1;
  const currentProgress = safeTotal % tierSize;
  const nextLevelAt = level * tierSize;

  return {
    level,
    currentProgress,
    nextLevelAt,
    progressPct: Number(((currentProgress / tierSize) * 100).toFixed(1)),
  };
}

function mapTransactionRow(transaction: any) {
  return {
    id: transaction.id,
    currency: transaction.currency,
    type: transaction.type,
    amount: transaction.amount,
    balanceAfter: transaction.balanceAfter,
    unitPriceRc: transaction.unitPriceRc,
    note: transaction.note,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt,
  };
}

function rollPrismaticCacheReward() {
  const roll = Math.random();
  if (roll < 0.62) {
    return {
      tier: 'Common',
      reward: randomInt(70, 131),
    };
  }
  if (roll < 0.9) {
    return {
      tier: 'Rare',
      reward: randomInt(140, 261),
    };
  }
  return {
    tier: 'Mythic',
    reward: randomInt(300, 521),
  };
}

async function ensureWalletState(userId: string, db: any): Promise<WalletRow> {
  const existing = await db.wallet.findUnique({ where: { userId } });
  if (!existing) {
    const created = await db.wallet.create({
      data: {
        userId,
        prismaticEssence: STARTER_PRISMATIC_ESSENCE,
        totalRiftCoinsEarned: STARTER_PRISMATIC_ESSENCE,
      },
    });

    if (STARTER_PRISMATIC_ESSENCE > 0) {
      await db.walletTransaction.create({
        data: {
          walletId: created.id,
          userId,
          currency: 'PRISMATIC_ESSENCE',
          type: 'WELCOME_BONUS',
          amount: STARTER_PRISMATIC_ESSENCE,
          balanceAfter: STARTER_PRISMATIC_ESSENCE,
          note: 'Starter Prismatic Essence',
          metadata: { source: 'wallet_init' },
        },
      });
    }

    return created as WalletRow;
  }

  // Legacy migration path: carry old RiftCoins over into Prismatic balance once.
  if (existing.riftCoins > 0) {
    const migratedPrismatic = existing.prismaticEssence + existing.riftCoins;
    const converted = await db.wallet.update({
      where: { id: existing.id },
      data: {
        riftCoins: 0,
        prismaticEssence: migratedPrismatic,
      },
    });

    await db.walletTransaction.create({
      data: {
        walletId: converted.id,
        userId,
        currency: 'PRISMATIC_ESSENCE',
        type: 'ADMIN_ADJUSTMENT',
        amount: existing.riftCoins,
        balanceAfter: migratedPrismatic,
        note: 'Legacy RiftCoins converted to Prismatic Essence',
        metadata: { source: 'legacy_migration' },
      },
    });

    return converted as WalletRow;
  }

  return existing as WalletRow;
}

async function buildWalletSummary(userId: string) {
  const wallet = await ensureWalletState(userId, prisma);

  return {
    wallet: {
      prismaticEssence: wallet.prismaticEssence,
      totalPrismaticEarned: wallet.totalRiftCoinsEarned,
      totalPrismaticSpent: wallet.totalRiftCoinsSpent,
      updatedAt: wallet.updatedAt,
    },
    progression: buildProgression(wallet.totalRiftCoinsEarned),
  };
}

async function resolveAdminActor(userId: string): Promise<{ id: string; username: string } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      badges: {
        select: { key: true },
      },
    },
  });

  if (!user) return null;

  const isAdmin = (user.badges || []).some((badge: any) => String(badge.key || '').toLowerCase() === 'admin');
  if (!isAdmin) return null;

  return {
    id: user.id,
    username: user.username,
  };
}

async function loadQuestStatuses(userId: string) {
  const today = getUtcDateKey();
  const startOfToday = getStartOfUtcDay();

  const [user, claims, todayPostsCount, todayMessagesCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        bio: true,
        region: true,
        primaryRole: true,
        languages: true,
        championList: true,
        championTierlist: true,
        discordDmNotifications: true,
        discordAccount: { select: { id: true, discordId: true } },
        communityMemberships: {
          select: {
            community: {
              select: {
                slug: true,
                name: true,
                inviteLink: true,
                discordServerId: true,
              },
            },
          },
        },
        _count: {
          select: {
            posts: true,
            lftPosts: true,
            communityMemberships: true,
            ratingsReceived: true,
            messagesSent: true,
            riotAccounts: true,
          },
        },
      },
    }),
    prisma.walletQuestClaim.findMany({
      where: {
        userId,
        questKey: {
          in: QUEST_KEYS as any,
        },
      },
      select: {
        questKey: true,
        claimWindow: true,
        createdAt: true,
      },
    }),
    prisma.post.count({ where: { authorId: userId, createdAt: { gte: startOfToday } } }),
    prisma.message.count({ where: { senderId: userId, createdAt: { gte: startOfToday } } }),
  ]);

  if (!user) return [];

  const supportServerViaDiscord = user.discordAccount?.discordId
    ? await hasJoinedSupportServerViaDiscord(user.discordAccount.discordId)
    : false;

  return QUEST_KEYS.map((questKey) => {
    const definition = QUEST_DEFINITIONS[questKey];
    const questClaims = claims.filter((claim: any) => claim.questKey === questKey);
    const hasClaimedOnce = questClaims.some((claim: any) => claim.claimWindow === 'ONE_TIME');
    const hasClaimedToday = questClaims.some((claim: any) => claim.claimWindow === today);

    let eligible = true;
    let completed = false;
    let available = false;
    let reason: string | null = null;
    let nextClaimAt: string | null = null;

    switch (questKey) {
      case 'DAILY_CHECKIN': {
        available = !hasClaimedToday;
        if (!available) {
          reason = 'Already claimed today.';
          nextClaimAt = getNextUtcMidnightIso();
        }
        break;
      }

      case 'DAILY_SOCIAL_SPARK': {
        const hasSocialActivityToday = todayPostsCount > 0 || todayMessagesCount > 0;
        eligible = hasSocialActivityToday;
        available = eligible && !hasClaimedToday;
        if (!eligible) {
          reason = 'Send one chat message or create one duo post today.';
        } else if (!available) {
          reason = 'Already claimed today.';
          nextClaimAt = getNextUtcMidnightIso();
        }
        break;
      }

      case 'COMPLETE_PROFILE': {
        const hasBio = Boolean(user.bio && user.bio.trim().length > 0);
        const hasRiotLinked = (user._count?.riotAccounts || 0) > 0;
        const hasDiscordLinked = Boolean(user.discordAccount);
        const hasChampionPool = hasChampionPoolConfigured(user as any);

        eligible = hasBio && hasRiotLinked && hasDiscordLinked && hasChampionPool;
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!eligible) {
          const missingSteps: string[] = [];
          if (!hasRiotLinked) missingSteps.push('Connect Riot account');
          if (!hasDiscordLinked) missingSteps.push('Connect Discord account');
          if (!hasChampionPool) missingSteps.push('Set champion pool');
          if (!hasBio) missingSteps.push('Add bio');
          reason = missingSteps.length > 0
            ? `Missing: ${missingSteps.join(' • ')}`
            : 'Complete all profile setup steps.';
        } else if (completed) {
          reason = 'Already claimed.';
        }
        break;
      }

      case 'CREATE_FIRST_DUO_POST': {
        eligible = (user._count?.posts || 0) > 0;
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!eligible) {
          reason = 'Create your first duo post.';
        } else if (completed) {
          reason = 'Already claimed.';
        }
        break;
      }

      case 'CREATE_FIRST_LFT_POST': {
        eligible = (user._count?.lftPosts || 0) > 0;
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!eligible) {
          reason = 'Create your first LFT listing.';
        } else if (completed) {
          reason = 'Already claimed.';
        }
        break;
      }

      case 'JOIN_FIRST_COMMUNITY': {
        eligible = (user._count?.communityMemberships || 0) > 0;
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!eligible) {
          reason = 'Join at least one community.';
        } else if (completed) {
          reason = 'Already claimed.';
        }
        break;
      }

      case 'LINK_DISCORD_ACCOUNT': {
        eligible = Boolean(user.discordAccount);
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!eligible) {
          reason = 'Link Discord first from profile/settings.';
        } else if (completed) {
          reason = 'Already claimed.';
        }
        break;
      }

      case 'ENABLE_DISCORD_DMS': {
        eligible = Boolean(user.discordAccount) && Boolean(user.discordDmNotifications);
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!user.discordAccount) {
          reason = 'Link Discord before receiving DM notifications.';
        } else if (!user.discordDmNotifications) {
          reason = 'Turn Discord DM notifications back on in settings.';
        } else if (completed) {
          reason = 'Already claimed.';
        }
        break;
      }

      case 'JOIN_SUPPORT_SERVER': {
        const memberships = user.communityMemberships || [];
        eligible = hasJoinedSupportServer(memberships as any) || supportServerViaDiscord;
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!eligible) {
          reason = user.discordAccount
            ? 'Join the official support Discord server with your linked Discord account.'
            : 'Connect Discord first, then join the official support Discord server.';
        } else if (completed) {
          reason = 'Already claimed.';
        }
        break;
      }

      case 'RECEIVE_FIRST_FEEDBACK': {
        eligible = (user._count?.ratingsReceived || 0) > 0;
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!eligible) {
          reason = 'Receive your first rating from another player.';
        } else if (completed) {
          reason = 'Already claimed.';
        }
        break;
      }

      case 'SEND_FIRST_CHAT_MESSAGE': {
        eligible = (user._count?.messagesSent || 0) > 0;
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!eligible) {
          reason = 'Send one message in RiftEssence chat.';
        } else if (completed) {
          reason = 'Already claimed.';
        }
        break;
      }

      default:
        break;
    }

    return {
      key: questKey,
      title: definition.title,
      description: definition.description,
      rewardPrismaticEssence: definition.rewardPrismaticEssence,
      repeatWindow: definition.repeatWindow,
      available,
      eligible,
      completed,
      reason,
      nextClaimAt,
    };
  });
}

async function buildActionStates(userId: string, wallet?: WalletRow) {
  const walletState = wallet || await ensureWalletState(userId, prisma);
  return ACTION_KEYS.map((actionKey) => {
    const definition = ACTION_DEFINITIONS[actionKey];

    return {
      key: actionKey,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      costPrismaticEssence: definition.costPrismaticEssence,
      repeatable: definition.repeatable,
      owned: false,
      available: walletState.prismaticEssence >= definition.costPrismaticEssence,
      blockedReason: walletState.prismaticEssence < definition.costPrismaticEssence
        ? `Need ${definition.costPrismaticEssence.toLocaleString()} Prismatic Essence.`
        : null,
      badgePreview: null,
    };
  });
}

function buildGambleGameStates(wallet: WalletRow) {
  return GAMBLE_GAME_KEYS.map((gameKey) => {
    const game = GAMBLE_GAME_DEFINITIONS[gameKey];
    const available = wallet.prismaticEssence >= game.minWager;

    return {
      key: gameKey,
      title: game.title,
      description: game.description,
      minWager: game.minWager,
      maxWager: game.maxWager,
      singlePlayerOnly: game.singlePlayerOnly,
      choices: game.choices ? [...game.choices] : null,
      available,
      blockedReason: available
        ? null
        : `Need at least ${game.minWager.toLocaleString()} Prismatic Essence to play.`,
    };
  });
}

async function buildCosmeticStates(userId: string, wallet?: WalletRow) {
  const walletState = wallet || await ensureWalletState(userId, prisma);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      unlockedCosmetics: true,
      activeUsernameDecoration: true,
      activeHoverEffect: true,
      activeVisualEffect: true,
      activeNameplateFont: true,
      adCredits: true,
      badges: {
        select: { key: true },
      },
    },
  });

  if (!user) {
    return {
      items: [],
      adCredits: 0,
      loadout: {
        activeUsernameDecoration: null,
        activeHoverEffect: null,
        activeVisualEffect: null,
        activeNameplateFont: null,
      },
      wallet: {
        prismaticEssence: walletState.prismaticEssence,
      },
    };
  }

  const unlockedSet = new Set(user.unlockedCosmetics || []);
  const ownedBadgeKeys = new Set((user.badges || []).map((badge: any) => badge.key));

  const items = COSMETIC_KEYS.map((itemKey) => {
    const definition = COSMETIC_DEFINITIONS[itemKey] as CosmeticDefinition;
    const ownsBadge = definition.badgeGrant ? ownedBadgeKeys.has(definition.badgeGrant.key) : false;
    const ownsUnlock = definition.unlockKey ? unlockedSet.has(definition.unlockKey) : false;
    const owned = definition.badgeGrant ? ownsBadge : definition.unlockKey ? ownsUnlock : false;
    const activeField = getActiveFieldForCategory(definition.category);
    const active = Boolean(activeField && definition.unlockKey && (user as any)[activeField] === definition.unlockKey);
    const blockedByOwnership = Boolean(!definition.repeatable && owned);
    const blockedByRequirement = Boolean(definition.requiresBadgeKey && !ownedBadgeKeys.has(definition.requiresBadgeKey));
    const requiredTitle = definition.requiresBadgeKey ? getCosmeticTitleByBadgeKey(definition.requiresBadgeKey) : null;

    return {
      key: itemKey,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      costPrismaticEssence: definition.costPrismaticEssence,
      repeatable: definition.repeatable,
      owned,
      active,
      available: walletState.prismaticEssence >= definition.costPrismaticEssence && !blockedByOwnership && !blockedByRequirement,
      blockedReason: blockedByOwnership
        ? 'Already owned.'
        : blockedByRequirement
          ? `Unlock ${requiredTitle || 'the previous Fortune Badge'} first.`
        : walletState.prismaticEssence < definition.costPrismaticEssence
          ? `Need ${definition.costPrismaticEssence.toLocaleString()} Prismatic Essence.`
          : null,
      unlockKey: definition.unlockKey || null,
      adCreditsGrant: definition.adCredits || null,
      badgePreview: definition.badgeGrant
        ? {
            key: definition.badgeGrant.key,
            name: definition.badgeGrant.name,
            icon: definition.badgeGrant.icon,
          }
        : null,
    };
  });

  return {
    items,
    adCredits: user.adCredits || 0,
    loadout: {
      activeUsernameDecoration: user.activeUsernameDecoration || null,
      activeHoverEffect: user.activeHoverEffect || null,
      activeVisualEffect: user.activeVisualEffect || null,
      activeNameplateFont: user.activeNameplateFont || null,
    },
    wallet: {
      prismaticEssence: walletState.prismaticEssence,
    },
  };
}

export default async function walletRoutes(fastify: FastifyInstance) {
  fastify.get('/wallet/summary', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const summary = await buildWalletSummary(userId);
      return reply.send(summary);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to load wallet summary');
      return reply.code(500).send({ error: 'Failed to load wallet summary.' });
    }
  });

  fastify.post('/wallet/admin/grant-pe', async (request: any, reply: any) => {
    try {
      const requesterId = await getUserIdFromRequest(request, reply);
      if (!requesterId) return;

      const admin = await resolveAdminActor(requesterId);
      if (!admin) {
        return reply.code(403).send({ error: 'Admin access required.' });
      }

      const validation = validateRequest(AdminGrantPeSchema, request.body || {});
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid PE grant request.', details: validation.errors });
      }

      const {
        grantToSelf,
        targetUserId,
        targetUsername,
        amount,
        reason,
      } = validation.data as {
        grantToSelf: boolean;
        targetUserId?: string;
        targetUsername?: string;
        amount: number;
        reason?: string;
      };

      let targetUser: { id: string; username: string } | null = null;

      if (grantToSelf) {
        targetUser = { id: admin.id, username: admin.username };
      } else if (targetUserId) {
        targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, username: true },
        });
      } else if (targetUsername) {
        targetUser = await prisma.user.findFirst({
          where: {
            username: {
              equals: targetUsername,
              mode: 'insensitive',
            },
          },
          select: { id: true, username: true },
        });
      }

      if (!targetUser) {
        return reply.code(404).send({ error: 'Target user not found.' });
      }

      const normalizedReason = String(reason || '').trim();

      const grantResult = await prisma.$transaction(async (tx: any) => {
        const wallet = await ensureWalletState(targetUser!.id, tx);
        const nextBalance = wallet.prismaticEssence + amount;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            prismaticEssence: nextBalance,
            totalRiftCoinsEarned: { increment: amount },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: targetUser!.id,
            currency: 'PRISMATIC_ESSENCE',
            type: 'ADMIN_ADJUSTMENT',
            amount,
            balanceAfter: nextBalance,
            note: normalizedReason
              ? `Admin PE grant (${admin.username}): ${normalizedReason}`
              : `Admin PE grant (${admin.username})`,
            metadata: {
              source: 'admin_grant_pe',
              adminId: admin.id,
              adminUsername: admin.username,
              targetUserId: targetUser!.id,
              targetUsername: targetUser!.username,
              reason: normalizedReason || null,
            },
          },
        });

        if (targetUser!.id !== admin.id) {
          await tx.notification.create({
            data: {
              userId: targetUser!.id,
              type: 'ADMIN_TEST',
              message: `[PE Grant] You received ${amount.toLocaleString()} PE from admin ${admin.username}.${normalizedReason ? ` Reason: ${normalizedReason}` : ''}`,
            },
          });
        }

        return {
          newBalance: nextBalance,
        };
      });

      await logAdminAction({
        adminId: admin.id,
        action: 'PRISMATIC_GRANTED',
        targetId: targetUser.id,
        details: {
          amount,
          reason: normalizedReason || null,
          selfGrant: targetUser.id === admin.id,
          targetUsername: targetUser.username,
        },
      });

      return reply.send({
        success: true,
        grant: {
          action: 'GRANT',
          amount,
          reason: normalizedReason || null,
          target: targetUser,
          admin,
          newBalance: grantResult.newBalance,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to grant PE as admin');
      return reply.code(500).send({ error: 'Failed to grant PE.' });
    }
  });

  fastify.post('/wallet/admin/remove-pe', async (request: any, reply: any) => {
    try {
      const requesterId = await getUserIdFromRequest(request, reply);
      if (!requesterId) return;

      const admin = await resolveAdminActor(requesterId);
      if (!admin) {
        return reply.code(403).send({ error: 'Admin access required.' });
      }

      const validation = validateRequest(AdminRemovePeSchema, request.body || {});
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid PE removal request.', details: validation.errors });
      }

      const {
        removeFromSelf,
        targetUserId,
        targetUsername,
        amount,
        reason,
      } = validation.data as {
        removeFromSelf: boolean;
        targetUserId?: string;
        targetUsername?: string;
        amount: number;
        reason?: string;
      };

      let targetUser: { id: string; username: string } | null = null;

      if (removeFromSelf) {
        targetUser = { id: admin.id, username: admin.username };
      } else if (targetUserId) {
        targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, username: true },
        });
      } else if (targetUsername) {
        targetUser = await prisma.user.findFirst({
          where: {
            username: {
              equals: targetUsername,
              mode: 'insensitive',
            },
          },
          select: { id: true, username: true },
        });
      }

      if (!targetUser) {
        return reply.code(404).send({ error: 'Target user not found.' });
      }

      const normalizedReason = String(reason || '').trim();

      const removeResult = await prisma.$transaction(async (tx: any) => {
        const wallet = await ensureWalletState(targetUser!.id, tx);
        if (wallet.prismaticEssence < amount) {
          throw new Error(`Cannot remove ${amount.toLocaleString()} PE. User only has ${wallet.prismaticEssence.toLocaleString()} PE.`);
        }

        const nextBalance = wallet.prismaticEssence - amount;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            prismaticEssence: nextBalance,
            totalRiftCoinsSpent: { increment: amount },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: targetUser!.id,
            currency: 'PRISMATIC_ESSENCE',
            type: 'ADMIN_ADJUSTMENT',
            amount: -amount,
            balanceAfter: nextBalance,
            note: normalizedReason
              ? `Admin PE removal (${admin.username}): ${normalizedReason}`
              : `Admin PE removal (${admin.username})`,
            metadata: {
              source: 'admin_remove_pe',
              adminId: admin.id,
              adminUsername: admin.username,
              targetUserId: targetUser!.id,
              targetUsername: targetUser!.username,
              reason: normalizedReason || null,
            },
          },
        });

        if (targetUser!.id !== admin.id) {
          await tx.notification.create({
            data: {
              userId: targetUser!.id,
              type: 'ADMIN_TEST',
              message: `[PE Adjustment] ${amount.toLocaleString()} PE was removed by admin ${admin.username}.${normalizedReason ? ` Reason: ${normalizedReason}` : ''}`,
            },
          });
        }

        return {
          newBalance: nextBalance,
        };
      });

      await logAdminAction({
        adminId: admin.id,
        action: 'PRISMATIC_REMOVED',
        targetId: targetUser.id,
        details: {
          amount,
          reason: normalizedReason || null,
          selfRemoval: targetUser.id === admin.id,
          targetUsername: targetUser.username,
        },
      });

      return reply.send({
        success: true,
        adjustment: {
          action: 'REMOVE',
          amount,
          reason: normalizedReason || null,
          target: targetUser,
          admin,
          newBalance: removeResult.newBalance,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      if (error?.message && typeof error.message === 'string' && error.message.length < 240) {
        return reply.code(400).send({ error: error.message });
      }
      request.log.error({ err: error }, 'Failed to remove PE as admin');
      return reply.code(500).send({ error: 'Failed to remove PE.' });
    }
  });

  fastify.get('/wallet/transactions', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await ensureWalletState(userId, prisma);

      const validation = validateRequest(WalletTransactionsQuerySchema, request.query || {});
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid query parameters', details: validation.errors });
      }

      const { limit, offset, currency } = validation.data;
      const where: any = { userId };
      if (currency !== 'ALL') {
        where.currency = currency;
      }

      const [transactions, total] = await Promise.all([
        prisma.walletTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.walletTransaction.count({ where }),
      ]);

      return reply.send({
        transactions: transactions.map(mapTransactionRow),
        total,
        limit,
        offset,
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to load wallet transactions');
      return reply.code(500).send({ error: 'Failed to load wallet transactions.' });
    }
  });

  fastify.get('/wallet/quests', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await ensureWalletState(userId, prisma);
      const quests = await loadQuestStatuses(userId);

      const completedCount = quests.filter((quest: any) => quest.completed).length;
      const availableCount = quests.filter((quest: any) => quest.available).length;

      return reply.send({
        quests,
        overview: {
          total: quests.length,
          completed: completedCount,
          available: availableCount,
        },
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to load wallet quests');
      return reply.code(500).send({ error: 'Failed to load wallet quests.' });
    }
  });

  fastify.post('/wallet/quests/:questKey/claim', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const rawQuestKey = String(request.params?.questKey || '').toUpperCase();
      if (!isKnownQuestKey(rawQuestKey)) {
        return reply.code(404).send({ error: 'Quest not found.' });
      }

      const questKey = rawQuestKey as QuestKey;
      const definition = QUEST_DEFINITIONS[questKey];
      const statuses = await loadQuestStatuses(userId);
      const status = statuses.find((entry: any) => entry.key === questKey);

      if (!status) {
        return reply.code(404).send({ error: 'Quest status not found.' });
      }

      if (!status.available) {
        return reply.code(400).send({ error: status.reason || 'Quest is not currently claimable.' });
      }

      const claimWindow = getQuestClaimWindow(questKey);
      const reward = definition.rewardPrismaticEssence;

      try {
        await prisma.$transaction(async (tx: any) => {
          const wallet = await ensureWalletState(userId, tx);
          const nextPrismatic = wallet.prismaticEssence + reward;

          await tx.walletQuestClaim.create({
            data: {
              userId,
              questKey,
              claimWindow,
              rewardRiftCoins: reward,
              metadata: { source: 'wallet_quest' },
            },
          });

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              prismaticEssence: nextPrismatic,
              totalRiftCoinsEarned: { increment: reward },
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId,
              currency: 'PRISMATIC_ESSENCE',
              type: 'QUEST_REWARD',
              amount: reward,
              balanceAfter: nextPrismatic,
              note: `${definition.title} reward`,
              metadata: { questKey, claimWindow },
            },
          });
        });
      } catch (error: any) {
        if (error?.code === 'P2002') {
          return reply.code(409).send({ error: 'Quest already claimed for this window.' });
        }
        throw error;
      }

      const [summary, quests] = await Promise.all([
        buildWalletSummary(userId),
        loadQuestStatuses(userId),
      ]);

      return reply.send({
        success: true,
        rewardPrismaticEssence: reward,
        questKey,
        summary,
        quests,
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to claim wallet quest');
      return reply.code(500).send({ error: 'Failed to claim quest.' });
    }
  });

  fastify.get('/wallet/gamble/games', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const wallet = await ensureWalletState(userId, prisma);
      const games = buildGambleGameStates(wallet);

      return reply.send({
        games,
        wallet: {
          prismaticEssence: wallet.prismaticEssence,
        },
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to load gamble games');
      return reply.code(500).send({ error: 'Failed to load gamble games.' });
    }
  });

  fastify.post('/wallet/gamble/:gameKey/play', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const rawGameKey = String(request.params?.gameKey || '').toUpperCase();
      if (!isKnownGambleGameKey(rawGameKey)) {
        return reply.code(404).send({ error: 'Gamble game not found.' });
      }

      const gameKey = rawGameKey as GambleGameKey;
      const game = GAMBLE_GAME_DEFINITIONS[gameKey];

      const validation = validateRequest(GamblePlaySchema, request.body || {});
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid gamble request.', details: validation.errors });
      }

      const { wager, choice } = validation.data as {
        wager: number;
        choice?: string;
      };

      if (wager < game.minWager || wager > game.maxWager) {
        return reply.code(400).send({
          error: `Wager must be between ${game.minWager.toLocaleString()} and ${game.maxWager.toLocaleString()} Prismatic Essence.`,
        });
      }

      const playResult = await prisma.$transaction(async (tx: any) => {
        const wallet = await ensureWalletState(userId, tx);

        if (wallet.prismaticEssence < wager) {
          throw new Error(`Need ${wager.toLocaleString()} Prismatic Essence.`);
        }

        const outcome = resolveGambleOutcome(gameKey, wager, choice);
        let nextBalance = wallet.prismaticEssence - wager;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            prismaticEssence: nextBalance,
            totalRiftCoinsSpent: { increment: wager },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            currency: 'PRISMATIC_ESSENCE',
            type: 'SHOP_PURCHASE',
            amount: -wager,
            balanceAfter: nextBalance,
            note: `Gamble wager: ${game.title}`,
            metadata: {
              source: 'wallet_gamble_wager',
              gameKey,
              choice: outcome.normalizedChoice,
            },
          },
        });

        if (outcome.payout > 0) {
          nextBalance += outcome.payout;

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              prismaticEssence: nextBalance,
              totalRiftCoinsEarned: { increment: outcome.payout },
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId,
              currency: 'PRISMATIC_ESSENCE',
              type: 'ADMIN_ADJUSTMENT',
              amount: outcome.payout,
              balanceAfter: nextBalance,
              note: `Gamble payout: ${game.title}`,
              metadata: {
                source: 'wallet_gamble_payout',
                gameKey,
                outcomeLabel: outcome.outcomeLabel,
                multiplier: outcome.multiplier,
                rollValue: outcome.rollValue,
              },
            },
          });
        }

        return {
          ...outcome,
          wager,
          newBalance: nextBalance,
        };
      });

      const [summary, wallet] = await Promise.all([
        buildWalletSummary(userId),
        ensureWalletState(userId, prisma),
      ]);

      return reply.send({
        success: true,
        result: {
          gameKey,
          title: game.title,
          choice: playResult.normalizedChoice,
          wager: playResult.wager,
          payout: playResult.payout,
          netPrismaticEssence: playResult.netPrismaticEssence,
          won: playResult.won,
          outcomeLabel: playResult.outcomeLabel,
          outcomeDetail: playResult.outcomeDetail,
          multiplier: playResult.multiplier,
          rollValue: playResult.rollValue,
          singlePlayerOnly: game.singlePlayerOnly,
          newBalance: playResult.newBalance,
        },
        summary,
        games: buildGambleGameStates(wallet),
      });
    } catch (error: any) {
      if (error?.message && typeof error.message === 'string' && error.message.length < 220) {
        return reply.code(400).send({ error: error.message });
      }
      request.log.error({ err: error }, 'Failed to play gamble game');
      return reply.code(500).send({ error: 'Failed to play gamble game.' });
    }
  });

  fastify.get('/wallet/actions', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const wallet = await ensureWalletState(userId, prisma);
      const actions = await buildActionStates(userId, wallet);

      return reply.send({
        actions,
        wallet: {
          prismaticEssence: wallet.prismaticEssence,
        },
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to load wallet actions');
      return reply.code(500).send({ error: 'Failed to load wallet actions.' });
    }
  });

  fastify.post('/wallet/actions/:actionKey/purchase', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const rawActionKey = String(request.params?.actionKey || '').toUpperCase();
      if (!isKnownActionKey(rawActionKey)) {
        return reply.code(404).send({ error: 'Action not found.' });
      }

      const actionKey = rawActionKey as ActionKey;
      const action = ACTION_DEFINITIONS[actionKey];

      const purchaseResult = await prisma.$transaction(async (tx: any) => {
        const wallet = await ensureWalletState(userId, tx);

        if (wallet.prismaticEssence < action.costPrismaticEssence) {
          throw new Error(`Need ${action.costPrismaticEssence.toLocaleString()} Prismatic Essence.`);
        }

        let nextBalance = wallet.prismaticEssence - action.costPrismaticEssence;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            prismaticEssence: nextBalance,
            totalRiftCoinsSpent: { increment: action.costPrismaticEssence },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            currency: 'PRISMATIC_ESSENCE',
            type: 'SHOP_PURCHASE',
            amount: -action.costPrismaticEssence,
            balanceAfter: nextBalance,
            note: action.title,
            metadata: { actionKey },
          },
        });

        let rewardPrismaticEssence = 0;
        let cacheTier: string | null = null;

        if (actionKey === 'OPEN_PRISMATIC_CACHE') {
          const rewardRoll = rollPrismaticCacheReward();
          rewardPrismaticEssence = rewardRoll.reward;
          cacheTier = rewardRoll.tier;
          nextBalance += rewardPrismaticEssence;

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              prismaticEssence: nextBalance,
              totalRiftCoinsEarned: { increment: rewardPrismaticEssence },
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId,
              currency: 'PRISMATIC_ESSENCE',
              type: 'ADMIN_ADJUSTMENT',
              amount: rewardPrismaticEssence,
              balanceAfter: nextBalance,
              note: `Prismatic Cache payout (${cacheTier})`,
              metadata: {
                actionKey,
                tier: cacheTier,
              },
            },
          });
        }

        return {
          actionKey,
          costPrismaticEssence: action.costPrismaticEssence,
          rewardPrismaticEssence,
          netPrismaticEssence: rewardPrismaticEssence - action.costPrismaticEssence,
          cacheTier,
          badgeGranted: false,
        };
      });

      const [summary, actions] = await Promise.all([
        buildWalletSummary(userId),
        buildActionStates(userId),
      ]);

      return reply.send({
        success: true,
        result: purchaseResult,
        summary,
        actions,
      });
    } catch (error: any) {
      if (error?.message && typeof error.message === 'string' && error.message.length < 220) {
        return reply.code(400).send({ error: error.message });
      }
      request.log.error({ err: error }, 'Failed to purchase wallet action');
      return reply.code(500).send({ error: 'Failed to purchase action.' });
    }
  });

  fastify.get('/wallet/cosmetics', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const wallet = await ensureWalletState(userId, prisma);
      const cosmetics = await buildCosmeticStates(userId, wallet);

      return reply.send(cosmetics);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to load cosmetics shop');
      return reply.code(500).send({ error: 'Failed to load cosmetics shop.' });
    }
  });

  fastify.post('/wallet/adspace/buy', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(BuyAdspaceCreditsSchema, request.body || {});
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid adspace purchase request.', details: validation.errors });
      }

      const { quantity } = validation.data as { quantity: number };
      const totalCost = quantity * ADSPACE_CREDIT_UNIT_PRICE;

      const result = await prisma.$transaction(async (tx: any) => {
        const wallet = await ensureWalletState(userId, tx);

        if (wallet.prismaticEssence < totalCost) {
          throw new Error(`Need ${totalCost.toLocaleString()} Prismatic Essence.`);
        }

        const nextBalance = wallet.prismaticEssence - totalCost;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            prismaticEssence: nextBalance,
            totalRiftCoinsSpent: { increment: totalCost },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            currency: 'PRISMATIC_ESSENCE',
            type: 'SHOP_PURCHASE',
            amount: -totalCost,
            balanceAfter: nextBalance,
            note: `Adspace credits x${quantity}`,
            metadata: {
              source: 'adspace_buy',
              quantity,
              unitPrice: ADSPACE_CREDIT_UNIT_PRICE,
            },
          },
        });

        await tx.user.update({
          where: { id: userId },
          data: {
            adCredits: { increment: quantity },
          },
        });

        return {
          quantity,
          unitPrice: ADSPACE_CREDIT_UNIT_PRICE,
          totalCost,
        };
      });

      const [summary, cosmetics] = await Promise.all([
        buildWalletSummary(userId),
        buildCosmeticStates(userId),
      ]);

      return reply.send({
        success: true,
        result,
        summary,
        ...cosmetics,
      });
    } catch (error: any) {
      if (error?.message && typeof error.message === 'string' && error.message.length < 220) {
        return reply.code(400).send({ error: error.message });
      }
      request.log.error({ err: error }, 'Failed to purchase adspace credits');
      return reply.code(500).send({ error: 'Failed to purchase adspace credits.' });
    }
  });

  fastify.post('/wallet/cosmetics/deactivate', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(DeactivateCosmeticSchema, request.body || {});
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid deactivate request.', details: validation.errors });
      }

      const { category } = validation.data as {
        category: 'ALL' | 'USERNAME_DECORATION' | 'HOVER_EFFECT' | 'VISUAL_EFFECT' | 'FONT';
      };
      const updateData: any = {};

      if (category === 'ALL' || category === 'USERNAME_DECORATION') {
        updateData.activeUsernameDecoration = null;
      }
      if (category === 'ALL' || category === 'HOVER_EFFECT') {
        updateData.activeHoverEffect = null;
      }
      if (category === 'ALL' || category === 'VISUAL_EFFECT') {
        updateData.activeVisualEffect = null;
      }
      if (category === 'ALL' || category === 'FONT') {
        updateData.activeNameplateFont = null;
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      const cosmetics = await buildCosmeticStates(userId);
      return reply.send({
        success: true,
        category,
        ...cosmetics,
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to deactivate cosmetic loadout');
      return reply.code(500).send({ error: 'Failed to deactivate cosmetic loadout.' });
    }
  });

  fastify.post('/wallet/cosmetics/:itemKey/purchase', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const rawItemKey = String(request.params?.itemKey || '').toUpperCase();
      if (!isKnownCosmeticKey(rawItemKey)) {
        return reply.code(404).send({ error: 'Cosmetic item not found.' });
      }

      const itemKey = rawItemKey as CosmeticItemKey;
      const item = COSMETIC_DEFINITIONS[itemKey] as CosmeticDefinition;

      const result = await prisma.$transaction(async (tx: any) => {
        const wallet = await ensureWalletState(userId, tx);
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            unlockedCosmetics: true,
            activeUsernameDecoration: true,
            activeHoverEffect: true,
            activeVisualEffect: true,
            activeNameplateFont: true,
            badges: { select: { key: true } },
          },
        });

        if (!user) {
          throw new Error('User not found.');
        }

        const ownsBadge = Boolean(item.badgeGrant && user.badges.some((badge: any) => badge.key === item.badgeGrant?.key));
        const ownsUnlock = Boolean(item.unlockKey && (user.unlockedCosmetics || []).includes(item.unlockKey));
        const alreadyOwned = item.badgeGrant ? ownsBadge : item.unlockKey ? ownsUnlock : false;

        if (!item.repeatable && alreadyOwned) {
          throw new Error('You already own this item.');
        }

        if (item.requiresBadgeKey && !user.badges.some((badge: any) => badge.key === item.requiresBadgeKey)) {
          const requiredTitle = getCosmeticTitleByBadgeKey(item.requiresBadgeKey) || 'the previous Fortune Badge';
          throw new Error(`You must unlock ${requiredTitle} first.`);
        }

        if (wallet.prismaticEssence < item.costPrismaticEssence) {
          throw new Error(`Need ${item.costPrismaticEssence.toLocaleString()} Prismatic Essence.`);
        }

        const nextBalance = wallet.prismaticEssence - item.costPrismaticEssence;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            prismaticEssence: nextBalance,
            totalRiftCoinsSpent: { increment: item.costPrismaticEssence },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            currency: 'PRISMATIC_ESSENCE',
            type: 'SHOP_PURCHASE',
            amount: -item.costPrismaticEssence,
            balanceAfter: nextBalance,
            note: item.title,
            metadata: { itemKey, source: 'cosmetics_shop' },
          },
        });

        let unlocked = false;
        let badgeGranted = false;
        let adCreditsAdded = 0;
        let autoActivated = false;

        const userUpdateData: any = {};
        if (item.unlockKey && !ownsUnlock) {
          userUpdateData.unlockedCosmetics = { push: item.unlockKey };
          unlocked = true;

          const activeField = getActiveFieldForCategory(item.category);
          if (activeField && !(user as any)[activeField]) {
            userUpdateData[activeField] = item.unlockKey;
            autoActivated = true;
          }
        }

        if (item.adCredits && item.adCredits > 0) {
          userUpdateData.adCredits = { increment: item.adCredits };
          adCreditsAdded = item.adCredits;
        }

        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: userId },
            data: userUpdateData,
          });
        }

        if (item.badgeGrant && !ownsBadge) {
          const badge = await tx.badge.upsert({
            where: { key: item.badgeGrant.key },
            update: {
              name: item.badgeGrant.name,
              description: item.badgeGrant.description,
              icon: item.badgeGrant.icon,
              bgColor: item.badgeGrant.bgColor,
              borderColor: item.badgeGrant.borderColor,
              textColor: item.badgeGrant.textColor,
              hoverBg: item.badgeGrant.hoverBg,
              shape: item.badgeGrant.shape,
              animation: item.badgeGrant.animation,
            },
            create: {
              key: item.badgeGrant.key,
              name: item.badgeGrant.name,
              description: item.badgeGrant.description,
              icon: item.badgeGrant.icon,
              bgColor: item.badgeGrant.bgColor,
              borderColor: item.badgeGrant.borderColor,
              textColor: item.badgeGrant.textColor,
              hoverBg: item.badgeGrant.hoverBg,
              shape: item.badgeGrant.shape,
              animation: item.badgeGrant.animation,
            },
          });

          await tx.user.update({
            where: { id: userId },
            data: {
              badges: {
                connect: { id: badge.id },
              },
            },
          });

          badgeGranted = true;
        }

        return {
          itemKey,
          costPrismaticEssence: item.costPrismaticEssence,
          unlocked,
          badgeGranted,
          adCreditsAdded,
          autoActivated,
        };
      });

      const [summary, cosmetics] = await Promise.all([
        buildWalletSummary(userId),
        buildCosmeticStates(userId),
      ]);

      return reply.send({
        success: true,
        result,
        summary,
        ...cosmetics,
      });
    } catch (error: any) {
      if (error?.message && typeof error.message === 'string' && error.message.length < 220) {
        return reply.code(400).send({ error: error.message });
      }
      request.log.error({ err: error }, 'Failed to purchase cosmetic item');
      return reply.code(500).send({ error: 'Failed to purchase cosmetic item.' });
    }
  });

  fastify.post('/wallet/cosmetics/:itemKey/activate', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const rawItemKey = String(request.params?.itemKey || '').toUpperCase();
      if (!isKnownCosmeticKey(rawItemKey)) {
        return reply.code(404).send({ error: 'Cosmetic item not found.' });
      }

      const itemKey = rawItemKey as CosmeticItemKey;
      const item = COSMETIC_DEFINITIONS[itemKey] as CosmeticDefinition;
      const activeField = getActiveFieldForCategory(item.category);

      if (!activeField || !item.unlockKey) {
        return reply.code(400).send({ error: 'This item cannot be activated.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { unlockedCosmetics: true },
      });

      if (!user || !(user.unlockedCosmetics || []).includes(item.unlockKey)) {
        return reply.code(400).send({ error: 'You need to own this item before activating it.' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          [activeField]: item.unlockKey,
        } as any,
      });

      const cosmetics = await buildCosmeticStates(userId);
      return reply.send({
        success: true,
        itemKey,
        ...cosmetics,
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to activate cosmetic item');
      return reply.code(500).send({ error: 'Failed to activate cosmetic item.' });
    }
  });
}
