import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import {
  ACTIVE_FIELD_BY_CATEGORY,
  COSMETIC_DEFINITIONS,
  COSMETIC_KEYS,
  CosmeticDefinition,
  CosmeticKey,
} from '../data/cosmetics';
import {
  getQuestClaimWindow,
  isKnownQuestKey,
  loadQuestStatuses,
  QUEST_DEFINITIONS,
} from '../services/walletQuests';
import {
  EconomyError,
  economyFailure,
  operationKey,
  postEntry,
  requireEconomyAdmin,
  utcDay,
  walletOperation,
  walletSummary,
  withWallet,
} from '../services/economy';

async function cosmeticsState(userId: string) {
  const [summary, user] = await Promise.all([
    walletSummary(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        unlockedCosmetics: true,
        activeUsernameDecoration: true,
        activeHoverEffect: true,
        activeVisualEffect: true,
        activeNameplateFont: true,
        badges: { select: { key: true } },
      },
    }),
  ]);
  if (!user) throw new EconomyError('Account not found.', 404);
  const items = COSMETIC_KEYS.map((key) => {
    const item: CosmeticDefinition = COSMETIC_DEFINITIONS[key];
    const owned = item.badgeGrant
      ? user.badges.some((b: { key: string }) => b.key === item.badgeGrant?.key)
      : user.unlockedCosmetics.includes(item.unlockKey);
    const required =
      item.requiresBadgeKey &&
      !user.badges.some((b: { key: string }) => b.key === item.requiresBadgeKey);
    const field = ACTIVE_FIELD_BY_CATEGORY[item.category as keyof typeof ACTIVE_FIELD_BY_CATEGORY];
    const blockedReason = owned
      ? 'Already in your collection.'
      : required
      ? 'Collect the previous prestige badge first.'
      : summary.wallet.prismaticEssence < item.costPrismaticEssence
      ? 'Not enough PE.'
      : null;
    return {
      key,
      ...item,
      owned,
      active: field ? user[field] === item.unlockKey : owned,
      available: !blockedReason,
      blockedReason,
      badgePreview: item.badgeGrant || null,
    };
  });
  return {
    items,
    wallet: summary.wallet,
    loadout: {
      activeUsernameDecoration: user.activeUsernameDecoration,
      activeHoverEffect: user.activeHoverEffect,
      activeVisualEffect: user.activeVisualEffect,
      activeNameplateFont: user.activeNameplateFont,
    },
  };
}
const adjustmentSchema = z.object({
  grantToSelf: z.boolean().optional(),
  removeFromSelf: z.boolean().optional(),
  targetUserId: z.string().min(1).max(64).optional(),
  targetUsername: z.string().trim().min(2).max(40).optional(),
  amount: z.number().int().min(1).max(1_000_000),
  reason: z.string().trim().min(3).max(180),
});

export default async function walletRoutes(app: FastifyInstance) {
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
  });
  app.get('/wallet/summary', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      return await walletSummary(userId);
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });
  app.get('/wallet/transactions', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      const { limit, offset, currency } = z
        .object({
          limit: z.coerce.number().int().min(1).max(100).default(20),
          offset: z.coerce.number().int().min(0).max(100000).default(0),
          currency: z.enum(['ALL', 'PRISMATIC_ESSENCE', 'RIFT_COINS']).default('ALL'),
        })
        .parse(request.query);
      const where = { userId, ...(currency !== 'ALL' ? { currency } : {}) };
      const [transactions, total] = await Promise.all([
        prisma.walletTransaction.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit,
          skip: offset,
        }),
        prisma.walletTransaction.count({ where }),
      ]);
      return { transactions, total, limit, offset };
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });
  app.get('/wallet/quests', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      return { quests: await loadQuestStatuses(userId) };
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });
  app.post<{ Params: { questKey: string } }>(
    '/wallet/quests/:questKey/claim',
    async (request, reply) => {
      try {
        const userId = await getUserIdFromRequest(request, reply);
        if (!userId) return;
        const questKey = request.params.questKey;
        if (!isKnownQuestKey(questKey)) throw new EconomyError('Quest not found.', 404);
        const today = utcDay();
        const status = (await loadQuestStatuses(userId)).find((quest) => quest.key === questKey);
        if (!status?.available)
          throw new EconomyError(status?.reason || 'Quest is not available.', 409);
        const claimWindow = getQuestClaimWindow(questKey);
        const reward = status.rewardPrismaticEssence;
        await withWallet(userId, async (tx, wallet) => {
          if (today !== utcDay())
            throw new EconomyError('A new day has started. Refresh your challenges.', 409);
          const claimed = await tx.walletQuestClaim.findUnique({
            where: { userId_questKey_claimWindow: { userId, questKey, claimWindow } },
          });
          if (claimed) throw new EconomyError('This challenge has already been claimed.', 409);
          await tx.walletQuestClaim.create({
            data: {
              userId,
              questKey,
              claimWindow,
              rewardRiftCoins: reward,
              metadata: { source: 'wallet_quest' },
            },
          });
          if (reward)
            await postEntry(tx, wallet, reward, 'QUEST_REWARD', QUEST_DEFINITIONS[questKey].title, {
              questKey,
              claimWindow,
            });
        });
        const [summary, quests] = await Promise.all([
          walletSummary(userId),
          loadQuestStatuses(userId),
        ]);
        return { success: true, rewardPrismaticEssence: reward, summary, quests };
      } catch (error) {
        return economyFailure(request, reply, error);
      }
    },
  );
  app.get('/wallet/cosmetics', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      return await cosmeticsState(userId);
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });
  app.post<{ Params: { itemKey: string } }>(
    '/wallet/cosmetics/:itemKey/purchase',
    async (request, reply) => {
      try {
        const userId = await getUserIdFromRequest(request, reply);
        if (!userId) return;
        const key = request.params.itemKey as CosmeticKey;
        if (!COSMETIC_KEYS.includes(key)) throw new EconomyError('Cosmetic not found.', 404);
        const item: CosmeticDefinition = COSMETIC_DEFINITIONS[key];
        const result = await walletOperation(
          userId,
          operationKey(request),
          { purchase: key },
          async (tx, wallet) => {
            const user = await tx.user.findUniqueOrThrow({
              where: { id: userId },
              include: { badges: true },
            });
            if (
              (item.unlockKey && user.unlockedCosmetics.includes(item.unlockKey)) ||
              (item.badgeGrant && user.badges.some((b) => b.key === item.badgeGrant?.key))
            )
              throw new EconomyError('You already own this item.', 409);
            if (item.requiresBadgeKey && !user.badges.some((b) => b.key === item.requiresBadgeKey))
              throw new EconomyError('Collect the previous prestige badge first.');
            const next = await postEntry(
              tx,
              wallet,
              -item.costPrismaticEssence,
              'SHOP_PURCHASE',
              item.title,
              { itemKey: key, source: 'cosmetics_shop' },
            );
            if (item.unlockKey)
              await tx.user.update({
                where: { id: userId },
                data: { unlockedCosmetics: { push: item.unlockKey } },
              });
            if (item.badgeGrant) {
              const badge = await tx.badge.upsert({
                where: { key: item.badgeGrant.key },
                create: item.badgeGrant,
                update: {},
              });
              await tx.user.update({
                where: { id: userId },
                data: { badges: { connect: { id: badge.id } } },
              });
            }
            return {
              itemKey: key,
              costPrismaticEssence: item.costPrismaticEssence,
              newBalance: next.prismaticEssence,
            };
          },
        );
        return { success: true, result, ...(await cosmeticsState(userId)) };
      } catch (error) {
        return economyFailure(request, reply, error);
      }
    },
  );
  app.post<{ Params: { itemKey: string } }>(
    '/wallet/cosmetics/:itemKey/activate',
    async (request, reply) => {
      try {
        const userId = await getUserIdFromRequest(request, reply);
        if (!userId) return;
        const key = request.params.itemKey as CosmeticKey;
        if (!COSMETIC_KEYS.includes(key)) throw new EconomyError('Cosmetic not found.', 404);
        const item: CosmeticDefinition = COSMETIC_DEFINITIONS[key];
        const field =
          ACTIVE_FIELD_BY_CATEGORY[item.category as keyof typeof ACTIVE_FIELD_BY_CATEGORY];
        if (!field || !item.unlockKey)
          throw new EconomyError('This item is displayed automatically.');
        await withWallet(userId, async (tx) => {
          const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
          if (!user.unlockedCosmetics.includes(item.unlockKey!))
            throw new EconomyError('Collect this item first.');
          await tx.user.update({ where: { id: userId }, data: { [field]: item.unlockKey } });
        });
        return { success: true, ...(await cosmeticsState(userId)) };
      } catch (error) {
        return economyFailure(request, reply, error);
      }
    },
  );
  app.post('/wallet/cosmetics/deactivate', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      const { category } = z
        .object({
          category: z
            .enum(['ALL', 'USERNAME_DECORATION', 'HOVER_EFFECT', 'VISUAL_EFFECT', 'FONT'])
            .default('ALL'),
        })
        .parse(request.body || {});
      const data =
        category === 'ALL'
          ? Object.fromEntries(
              Object.values(ACTIVE_FIELD_BY_CATEGORY).map((field) => [field, null]),
            )
          : { [ACTIVE_FIELD_BY_CATEGORY[category]]: null };
      await withWallet(userId, (tx) => tx.user.update({ where: { id: userId }, data }));
      return { success: true, ...(await cosmeticsState(userId)) };
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });
  for (const action of ['grant', 'remove'] as const) {
    app.post(`/wallet/admin/${action}-pe`, async (request, reply) => {
      try {
        const actorId = await getUserIdFromRequest(request, reply);
        if (!actorId) return;
        const admin = await requireEconomyAdmin(actorId);
        const input = adjustmentSchema.parse(request.body);
        const self = action === 'grant' ? input.grantToSelf : input.removeFromSelf;
        const target = self
          ? admin
          : input.targetUserId
          ? await prisma.user.findUnique({
              where: { id: input.targetUserId },
              select: { id: true, username: true },
            })
          : input.targetUsername
          ? await prisma.user.findFirst({
              where: { username: { equals: input.targetUsername, mode: 'insensitive' } },
              select: { id: true, username: true },
            })
          : null;
        if (!target) throw new EconomyError('Account not found.', 404);
        const result = await walletOperation(
          target.id,
          operationKey(request),
          { action, actorId, ...input },
          async (tx, wallet) => {
            const next = await postEntry(
              tx,
              wallet,
              action === 'grant' ? input.amount : -input.amount,
              'ADMIN_ADJUSTMENT',
              input.reason,
              { adminId: actorId, source: `admin_${action}_pe` },
            );
            await tx.auditLog.create({
              data: {
                adminId: actorId,
                action: action === 'grant' ? 'PRISMATIC_GRANTED' : 'PRISMATIC_REMOVED',
                targetId: target.id,
                details: JSON.stringify({
                  amount: input.amount,
                  reason: input.reason,
                  balanceAfter: next.prismaticEssence,
                }),
              },
            });
            return {
              action: action.toUpperCase(),
              amount: input.amount,
              reason: input.reason,
              target,
              newBalance: next.prismaticEssence,
            };
          },
        );
        return { success: true, grant: result, adjustment: result };
      } catch (error) {
        return economyFailure(request, reply, error);
      }
    });
  }
  // Explicitly retire every stale mint/wager/advertising conversion route.
  const retired = async (_request: unknown, reply: any) =>
    reply
      .code(410)
      .send({
        error: 'PE wagering and PE-funded advertising have retired. Visit Games or Advertise.',
        gamesUrl: '/games',
        advertisingUrl: '/advertise',
      });
  app.post('/wallet/adspace/buy', retired);
  app.post('/wallet/gamble/:gameKey/play', retired);
  app.post('/wallet/actions/:actionKey/purchase', retired);
  app.get('/wallet/actions', async () => ({ actions: [] }));
  app.get('/wallet/gamble/games', async () => ({ games: [], gamesUrl: '/games' }));
}
