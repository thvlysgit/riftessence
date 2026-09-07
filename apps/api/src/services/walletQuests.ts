import prisma from '../prisma';
import { readSettings } from '../services/economy';

function parseBoundedInt(raw: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.max(min, Math.min(max, rounded));
}

type QuestDefinition = {
  title: string;
  description: string;
  rewardPrismaticEssence: number;
  repeatWindow: 'DAILY' | 'ONE_TIME';
};

export const QUEST_DEFINITIONS = {
  DAILY_CHECKIN: {
    title: 'Daily Login',
    description: 'Open the purse and claim your daily PE.',
    rewardPrismaticEssence: 60,
    repeatWindow: 'DAILY',
  },
  DAILY_SOCIAL_SPARK: {
    title: 'Daily Social',
    description: 'Have a two-way conversation today.',
    rewardPrismaticEssence: 40,
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
    title: 'Discord connected',
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

export type QuestKey = keyof typeof QUEST_DEFINITIONS;
export const QUEST_KEYS = Object.keys(QUEST_DEFINITIONS).filter(
  (key) => key !== 'ENABLE_DISCORD_DMS',
) as QuestKey[];

const DEFAULT_SUPPORT_DISCORD_GUILD_ID = '1051156621860020304';
const SUPPORT_DISCORD_SERVER_IDS = new Set(
  String(process.env.SUPPORT_DISCORD_SERVER_IDS || DEFAULT_SUPPORT_DISCORD_GUILD_ID)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
);
const SUPPORT_DISCORD_GUILD_ID = String(
  process.env.SUPPORT_DISCORD_GUILD_ID || DEFAULT_SUPPORT_DISCORD_GUILD_ID,
).trim();
if (SUPPORT_DISCORD_GUILD_ID) {
  SUPPORT_DISCORD_SERVER_IDS.add(SUPPORT_DISCORD_GUILD_ID);
}
SUPPORT_DISCORD_SERVER_IDS.add(DEFAULT_SUPPORT_DISCORD_GUILD_ID);

const DISCORD_BOT_TOKEN = String(process.env.DISCORD_BOT_TOKEN || '').trim();
const SUPPORT_SERVER_MEMBERSHIP_CACHE_TTL_MS = parseBoundedInt(
  process.env.SUPPORT_SERVER_MEMBERSHIP_CACHE_TTL_MS,
  5 * 60 * 1000,
  30 * 1000,
  30 * 60 * 1000,
);

type CachedSupportMembership = {
  value: boolean;
  expiresAt: number;
};

const supportServerMembershipCache = new Map<string, CachedSupportMembership>();

function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getStartOfUtcDay(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

function getNextUtcMidnightIso(date = new Date()) {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0),
  );
  return next.toISOString();
}

export function getQuestClaimWindow(questKey: QuestKey, now = new Date()) {
  const definition = QUEST_DEFINITIONS[questKey];
  return definition.repeatWindow === 'DAILY' ? getUtcDateKey(now) : 'ONE_TIME';
}

export function isKnownQuestKey(value: string): value is QuestKey {
  return (QUEST_KEYS as string[]).includes(value);
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
        `https://discord.com/api/v10/guilds/${encodeURIComponent(
          normalizedGuildId,
        )}/members/${encodeURIComponent(normalizedDiscordId)}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
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
      // Fail closed on unavailable Discord membership evidence.
    }
  }

  supportServerMembershipCache.set(normalizedDiscordId, {
    value: false,
    expiresAt: now + SUPPORT_SERVER_MEMBERSHIP_CACHE_TTL_MS,
  });
  return false;
}

function hasChampionPoolConfigured(user: { championList?: string[]; championTierlist?: any }) {
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

export async function loadQuestStatuses(userId: string) {
  const settings = await readSettings();
  const today = getUtcDateKey();
  const startOfToday = getStartOfUtcDay();

  const [user, claims, reciprocalConversations] = await Promise.all([
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
    prisma.conversation.count({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        AND: [
          { messages: { some: { senderId: userId, createdAt: { gte: startOfToday } } } },
          { messages: { some: { senderId: { not: userId }, createdAt: { gte: startOfToday } } } },
        ],
      },
    }),
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
        completed = hasClaimedToday;
        available = !hasClaimedToday;
        if (!available) {
          reason = 'Already claimed today.';
          nextClaimAt = getNextUtcMidnightIso();
        }
        break;
      }

      case 'DAILY_SOCIAL_SPARK': {
        completed = hasClaimedToday;
        const hasSocialActivityToday = reciprocalConversations > 0;
        eligible = hasSocialActivityToday;
        available = eligible && !hasClaimedToday;
        if (!eligible) {
          reason = 'Exchange messages with another player today.';
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
          reason =
            missingSteps.length > 0
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
        eligible = supportServerViaDiscord;
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
      rewardPrismaticEssence:
        questKey === 'DAILY_CHECKIN'
          ? settings.dailyCheckin
          : questKey === 'DAILY_SOCIAL_SPARK'
          ? settings.dailySocial
          : definition.rewardPrismaticEssence,
      repeatWindow: definition.repeatWindow,
      available,
      eligible,
      completed,
      reason,
      nextClaimAt,
    };
  });
}
