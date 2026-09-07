import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import {
  EconomyError,
  economyFailure,
  readSettings,
  requireEconomyAdmin,
  utcDay,
} from '../services/economy';

const rewardSettings = z.object({
  starterGrant: z.number().int().min(0).max(5000),
  dailyCheckin: z.number().int().min(0).max(500),
  dailySocial: z.number().int().min(0).max(500),
  championReward: z.number().int().min(0).max(500),
  soundReward: z.number().int().min(0).max(500),
  dailyGameCap: z.number().int().min(0).max(1000),
  gameRewardsEnabled: z.boolean(),
  version: z.number().int().min(1),
  reason: z.string().trim().min(3).max(180),
});

export default async function economyAdminRoutes(app: FastifyInstance) {
  app.get('/wallet/admin/economy', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      await requireEconomyAdmin(userId);
      const { days } = z
        .object({
          days: z.coerce
            .number()
            .refine((n) => [7, 30, 90].includes(n))
            .default(30),
        })
        .parse(request.query);
      const start = new Date(`${utcDay(new Date(Date.now() - (days - 1) * 86400000))}T00:00:00Z`);
      const settings = await readSettings();
      const result = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const [totals, daily, categories, distribution, recent, games, anomalies] =
            await Promise.all([
              tx.$queryRaw<Array<{ circulation: number; wallets: number; median: number }>>`SELECT
            COALESCE(SUM("prismaticEssence"),0)::float8 AS circulation, COUNT(*)::int AS wallets,
            COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY "prismaticEssence"),0)::float8 AS median FROM "Wallet"`,
              tx.$queryRaw<
                Array<{ day: string; earned: number; spent: number; active: number }>
              >`SELECT
            to_char("createdAt", 'YYYY-MM-DD') AS day,
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),0)::float8 AS earned,
            COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END),0)::float8 AS spent,
            COUNT(DISTINCT "userId")::int AS active
            FROM "WalletTransaction" WHERE currency = 'PRISMATIC_ESSENCE' AND "createdAt" >= ${start}
            AND type::text <> 'LEGACY_CONVERSION' AND COALESCE(metadata->>'source','') <> 'legacy_migration'
            GROUP BY day ORDER BY day`,
              tx.$queryRaw<
                Array<{ source: string; earned: number; spent: number; count: number }>
              >`SELECT
            CASE WHEN type::text = 'GAME_REWARD' THEN COALESCE(metadata->>'gameKey', 'games')
              WHEN type::text = 'QUEST_REWARD' THEN 'quests' WHEN type::text = 'WELCOME_BONUS' THEN 'welcome'
              WHEN metadata->>'source' = 'cosmetics_shop' THEN 'cosmetics'
              WHEN type::text = 'ADMIN_ADJUSTMENT' THEN 'adjustments' ELSE 'legacy_activity' END AS source,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)::float8 AS earned,
            SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END)::float8 AS spent, COUNT(*)::int AS count
            FROM "WalletTransaction" WHERE currency = 'PRISMATIC_ESSENCE' AND "createdAt" >= ${start}
            AND type::text <> 'LEGACY_CONVERSION' AND COALESCE(metadata->>'source','') <> 'legacy_migration'
            GROUP BY source ORDER BY SUM(ABS(amount)) DESC`,
              tx.$queryRaw<Array<{ bucket: string; count: number }>>`SELECT CASE
            WHEN "prismaticEssence" < 500 THEN '0–499' WHEN "prismaticEssence" < 2000 THEN '500–1,999'
            WHEN "prismaticEssence" < 10000 THEN '2,000–9,999' ELSE '10,000+' END AS bucket,
            COUNT(*)::int AS count FROM "Wallet" GROUP BY bucket ORDER BY MIN("prismaticEssence")`,
              tx.walletTransaction.findMany({
                where: { currency: 'PRISMATIC_ESSENCE', createdAt: { gte: start } },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: 50,
                select: {
                  id: true,
                  amount: true,
                  balanceAfter: true,
                  note: true,
                  type: true,
                  createdAt: true,
                  user: { select: { username: true } },
                },
              }),
              tx.gameRound.groupBy({
                by: ['gameKey', 'won', 'finished'],
                where: { createdAt: { gte: start }, NOT: { day: { startsWith: 'practice:' } } },
                _count: { _all: true },
                _sum: { rewardPaid: true },
              }),
              tx.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "Wallet" w
            LEFT JOIN (SELECT "walletId", SUM(amount) AS balance FROM "WalletTransaction"
              WHERE currency = 'PRISMATIC_ESSENCE' GROUP BY "walletId") t ON t."walletId" = w.id
            WHERE w."prismaticEssence" < 0 OR w."prismaticEssence" <> COALESCE(t.balance,0)`,
            ]);
          const active = await tx.$queryRaw<
            Array<{ count: number }>
          >`SELECT COUNT(DISTINCT "userId")::int AS count FROM "WalletTransaction" WHERE currency = 'PRISMATIC_ESSENCE' AND "createdAt" >= ${start}`;
          return {
            totals: {
              ...totals[0],
              activeWallets: active[0].count,
              earned: daily.reduce((n, d) => n + d.earned, 0),
              spent: daily.reduce((n, d) => n + d.spent, 0),
            },
            daily,
            categories,
            distribution,
            recent,
            games,
            reconciliationWarnings: anomalies[0].count,
          };
        },
        { isolationLevel: 'RepeatableRead', timeout: 15000 },
      );
      reply.header('Cache-Control', 'private, no-store');
      return {
        ...result,
        settings,
        days,
        start: start.toISOString(),
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });

  app.put('/wallet/admin/economy/settings', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      await requireEconomyAdmin(userId);
      const { version, reason, ...changes } = rewardSettings.parse(request.body);
      const settings = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const before = await readSettings(tx);
        const updated = await tx.economySettings.updateMany({
          where: { id: 'global', version },
          data: { ...changes, version: { increment: 1 }, updatedBy: userId },
        });
        if (!updated.count)
          throw new EconomyError(
            'Another admin changed these settings. Refresh before saving.',
            409,
          );
        await tx.auditLog.create({
          data: {
            adminId: userId,
            action: 'ECONOMY_SETTINGS_CHANGED',
            targetId: 'global',
            details: JSON.stringify({ before, after: changes, reason }),
          },
        });
        return tx.economySettings.findUniqueOrThrow({ where: { id: 'global' } });
      });
      return { settings };
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });
}
