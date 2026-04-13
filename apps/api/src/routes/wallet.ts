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
    description: 'Set your bio, region, primary role, and at least one language.',
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
    title: 'Allow Discord DMs',
    description: 'Enable Discord DM notifications in settings.',
    rewardPrismaticEssence: 140,
    repeatWindow: 'ONE_TIME',
  },
  JOIN_SUPPORT_SERVER: {
    title: 'Join Support Server',
    description: 'Join the official support server/community.',
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

const SUPPORT_DISCORD_INVITE_CODE = String(process.env.SUPPORT_DISCORD_INVITE_CODE || 'uypaWqmxx6').toLowerCase();
const SUPPORT_COMMUNITY_HINTS = String(process.env.SUPPORT_COMMUNITY_HINTS || 'riftessence-support,support')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);
const SUPPORT_DISCORD_SERVER_IDS = new Set(
  String(process.env.SUPPORT_DISCORD_SERVER_IDS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
);

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
};

const COSMETIC_DEFINITIONS = {
  BADGE_FORTUNE_COIN: {
    title: 'Fortune Sigil I',
    description: 'First prestige crest of the Fortune line.',
    category: 'BADGE',
    costPrismaticEssence: 2800,
    repeatable: false,
    badgeGrant: {
      key: 'shop_fortune_coin',
      name: 'Fortune Sigil I',
      description: 'Prestige badge unlocked through the Prismatic shop.',
      icon: 'gem',
      bgColor: 'linear-gradient(140deg, rgba(180,83,9,0.36), rgba(234,88,12,0.34))',
      borderColor: '#F97316',
      textColor: '#FED7AA',
      hoverBg: 'rgba(249, 115, 22, 0.34)',
      shape: 'round',
      animation: 'glint',
    },
  },
  BADGE_ORACLE_DICE: {
    title: 'Fortune Sigil II',
    description: 'Oracle-grade crest for high-stakes contenders.',
    category: 'BADGE',
    costPrismaticEssence: 5600,
    repeatable: false,
    badgeGrant: {
      key: 'shop_oracle_dice',
      name: 'Fortune Sigil II',
      description: 'Prestige badge unlocked through the Prismatic shop.',
      icon: 'dice-d20',
      bgColor: 'linear-gradient(140deg, rgba(88,28,135,0.38), rgba(76,29,149,0.36))',
      borderColor: '#A855F7',
      textColor: '#E9D5FF',
      hoverBg: 'rgba(168, 85, 247, 0.3)',
      shape: 'soft-hex',
      animation: 'spark',
    },
  },
  BADGE_JACKPOT_CROWN: {
    title: 'Fortune Sigil III',
    description: 'Crown-tier crest reserved for elite collectors.',
    category: 'BADGE',
    costPrismaticEssence: 10400,
    repeatable: false,
    badgeGrant: {
      key: 'shop_jackpot_crown',
      name: 'Fortune Sigil III',
      description: 'Prestige badge unlocked through the Prismatic shop.',
      icon: 'crown',
      bgColor: 'linear-gradient(140deg, rgba(146,64,14,0.42), rgba(180,83,9,0.42))',
      borderColor: '#F59E0B',
      textColor: '#FEF3C7',
      hoverBg: 'rgba(245, 158, 11, 0.34)',
      shape: 'crest',
      animation: 'drift',
    },
  },
  BADGE_VAULT_ASCENDANT: {
    title: 'Fortune Sigil IV',
    description: 'Ascendant vault crest, apex of the Fortune collection.',
    category: 'BADGE',
    costPrismaticEssence: 16800,
    repeatable: false,
    badgeGrant: {
      key: 'shop_vault_ascendant',
      name: 'Fortune Sigil IV',
      description: 'Prestige badge unlocked through the Prismatic shop.',
      icon: 'trophy',
      bgColor: 'linear-gradient(140deg, rgba(30,41,59,0.56), rgba(76,29,149,0.46))',
      borderColor: '#EAB308',
      textColor: '#FEFCE8',
      hoverBg: 'rgba(234, 179, 8, 0.32)',
      shape: 'bevel',
      animation: 'spark',
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

function isKnownCosmeticKey(value: string): value is CosmeticItemKey {
  return (COSMETIC_KEYS as string[]).includes(value);
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
        discordDmNotifications: true,
        discordAccount: { select: { id: true } },
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
        const hasRegion = Boolean(user.region);
        const hasPrimaryRole = Boolean(user.primaryRole);
        const hasLanguage = Array.isArray(user.languages) && user.languages.length > 0;
        eligible = hasBio && hasRegion && hasPrimaryRole && hasLanguage;
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!eligible) {
          reason = 'Add bio, region, primary role, and at least one language.';
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
          reason = 'Link Discord before enabling DM notifications.';
        } else if (!user.discordDmNotifications) {
          reason = 'Enable Discord DM notifications in settings.';
        } else if (completed) {
          reason = 'Already claimed.';
        }
        break;
      }

      case 'JOIN_SUPPORT_SERVER': {
        const memberships = user.communityMemberships || [];
        eligible = hasJoinedSupportServer(memberships as any);
        completed = hasClaimedOnce;
        available = eligible && !completed;
        if (!eligible) {
          reason = 'Join the official support server/community first.';
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

    return {
      key: itemKey,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      costPrismaticEssence: definition.costPrismaticEssence,
      repeatable: definition.repeatable,
      owned,
      active,
      available: walletState.prismaticEssence >= definition.costPrismaticEssence && !blockedByOwnership,
      blockedReason: blockedByOwnership
        ? 'Already owned.'
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
