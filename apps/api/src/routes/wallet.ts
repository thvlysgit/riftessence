import { randomInt } from 'crypto';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
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

type QuestDefinition = {
  title: string;
  description: string;
  rewardPrismaticEssence: number;
  repeatWindow: 'DAILY' | 'ONE_TIME';
};

const QUEST_DEFINITIONS = {
  DAILY_CHECKIN: {
    title: 'Daily Check-In',
    description: 'Claim a daily burst of Prismatic Essence.',
    rewardPrismaticEssence: 120,
    repeatWindow: 'DAILY',
  },
  DAILY_SOCIAL_SPARK: {
    title: 'Daily Social Spark',
    description: 'Send a chat message or publish a duo post today.',
    rewardPrismaticEssence: 95,
    repeatWindow: 'DAILY',
  },
  COMPLETE_PROFILE: {
    title: 'Complete Profile',
    description: 'Add bio, region, primary role, and at least one language.',
    rewardPrismaticEssence: 320,
    repeatWindow: 'ONE_TIME',
  },
  CREATE_FIRST_DUO_POST: {
    title: 'Create First Duo Post',
    description: 'Publish your first LFD duo post.',
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
    title: 'Link Discord Account',
    description: 'Link your Discord account from profile/settings.',
    rewardPrismaticEssence: 140,
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

type ActionDefinition = {
  title: string;
  description: string;
  costPrismaticEssence: number;
  repeatable: boolean;
  category: 'Loot' | 'Cosmetic' | 'Community';
  badgeGrant?: {
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
};

type ActionKey =
  | 'OPEN_PRISMATIC_CACHE'
  | 'FORGE_AURORA_SIGIL'
  | 'FORGE_CHROMA_WINGS'
  | 'COMMUNITY_WELL_DONATION';

const ACTION_DEFINITIONS: Record<ActionKey, ActionDefinition> = {
  OPEN_PRISMATIC_CACHE: {
    title: 'Open Prismatic Cache',
    description: 'Roll for a randomized essence payout. High variance, high hype.',
    costPrismaticEssence: 110,
    repeatable: true,
    category: 'Loot',
  },
  FORGE_AURORA_SIGIL: {
    title: 'Forge Aurora Sigil',
    description: 'Unlock an exclusive profile badge forged from aurora dust.',
    costPrismaticEssence: 440,
    repeatable: false,
    category: 'Cosmetic',
    badgeGrant: {
      key: 'prismatic_aurora_sigil',
      name: 'Prismatic Aurora Sigil',
      description: 'Forged with condensed aurora essence.',
      icon: 'atom',
      bgColor: 'rgba(56, 189, 248, 0.16)',
      borderColor: '#38BDF8',
      textColor: '#7DD3FC',
      hoverBg: 'rgba(56, 189, 248, 0.26)',
      shape: 'halo',
      animation: 'spark',
    },
  },
  FORGE_CHROMA_WINGS: {
    title: 'Forge Chroma Wings',
    description: 'Unlock a premium rainbow-themed profile badge.',
    costPrismaticEssence: 680,
    repeatable: false,
    category: 'Cosmetic',
    badgeGrant: {
      key: 'prismatic_chroma_wings',
      name: 'Prismatic Chroma Wings',
      description: 'A rare spectrum-forged crest.',
      icon: 'magic',
      bgColor: 'rgba(217, 70, 239, 0.16)',
      borderColor: '#D946EF',
      textColor: '#F5D0FE',
      hoverBg: 'rgba(217, 70, 239, 0.26)',
      shape: 'soft-hex',
      animation: 'drift',
    },
  },
  COMMUNITY_WELL_DONATION: {
    title: 'Donate To Community Well',
    description: 'Burn essence to support future community events and seasonal drops.',
    costPrismaticEssence: 180,
    repeatable: true,
    category: 'Community',
  },
};

const ACTION_KEYS = Object.keys(ACTION_DEFINITIONS) as ActionKey[];

const WalletTransactionsQuerySchema = z.object({
  limit: z.preprocess((value) => (value === undefined ? 40 : Number(value)), z.number().int().min(1).max(100)).default(40),
  offset: z.preprocess((value) => (value === undefined ? 0 : Number(value)), z.number().int().min(0)).default(0),
  currency: z.enum(['ALL', 'PRISMATIC_ESSENCE', 'RIFT_COINS']).default('ALL'),
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
        discordAccount: { select: { id: true } },
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
          reason = 'Link your Discord account first.';
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
  const userWithBadges = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      badges: {
        select: { key: true },
      },
    },
  });

  const ownedBadgeKeys = new Set((userWithBadges?.badges || []).map((badge: any) => badge.key));

  return ACTION_KEYS.map((actionKey) => {
    const definition = ACTION_DEFINITIONS[actionKey];
    const ownsBadge = definition.badgeGrant ? ownedBadgeKeys.has(definition.badgeGrant.key) : false;
    const blockedByOwnership = Boolean(definition.badgeGrant && !definition.repeatable && ownsBadge);

    return {
      key: actionKey,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      costPrismaticEssence: definition.costPrismaticEssence,
      repeatable: definition.repeatable,
      owned: ownsBadge,
      available: walletState.prismaticEssence >= definition.costPrismaticEssence && !blockedByOwnership,
      blockedReason: blockedByOwnership
        ? 'Already unlocked.'
        : walletState.prismaticEssence < definition.costPrismaticEssence
          ? `Need ${definition.costPrismaticEssence.toLocaleString()} Prismatic Essence.`
          : null,
      badgePreview: definition.badgeGrant ? {
        key: definition.badgeGrant.key,
        name: definition.badgeGrant.name,
        icon: definition.badgeGrant.icon,
      } : null,
    };
  });
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

        let ownsBadge = false;
        if (action.badgeGrant) {
          const existingBadge = await tx.user.findFirst({
            where: {
              id: userId,
              badges: {
                some: { key: action.badgeGrant.key },
              },
            },
            select: { id: true },
          });
          ownsBadge = Boolean(existingBadge);

          if (!action.repeatable && ownsBadge) {
            throw new Error('You already unlocked this cosmetic.');
          }
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
        let badgeGranted = false;

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

        if (action.badgeGrant && !ownsBadge) {
          const badge = await tx.badge.upsert({
            where: { key: action.badgeGrant.key },
            update: {
              name: action.badgeGrant.name,
              description: action.badgeGrant.description,
              icon: action.badgeGrant.icon,
              bgColor: action.badgeGrant.bgColor,
              borderColor: action.badgeGrant.borderColor,
              textColor: action.badgeGrant.textColor,
              hoverBg: action.badgeGrant.hoverBg,
              shape: action.badgeGrant.shape,
              animation: action.badgeGrant.animation,
            },
            create: {
              key: action.badgeGrant.key,
              name: action.badgeGrant.name,
              description: action.badgeGrant.description,
              icon: action.badgeGrant.icon,
              bgColor: action.badgeGrant.bgColor,
              borderColor: action.badgeGrant.borderColor,
              textColor: action.badgeGrant.textColor,
              hoverBg: action.badgeGrant.hoverBg,
              shape: action.badgeGrant.shape,
              animation: action.badgeGrant.animation,
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
          actionKey,
          costPrismaticEssence: action.costPrismaticEssence,
          rewardPrismaticEssence,
          netPrismaticEssence: rewardPrismaticEssence - action.costPrismaticEssence,
          cacheTier,
          badgeGranted,
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
}
