import { createHash } from 'crypto';
import { Prisma, Wallet } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import prisma from '../prisma';

export type EconomyTx = Prisma.TransactionClient;
export class EconomyError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);
export const nextReset = () =>
  new Date(`${utcDay(new Date(Date.now() + 86400000))}T00:00:00Z`).toISOString();
export const readSettings = (db: EconomyTx = prisma) =>
  db.economySettings.upsert({
    where: { id: 'global' },
    create: { id: 'global' },
    update: {},
  });

// All economy writes take the same per-user PostgreSQL row lock. This also
// serializes the very first wallet creation and different simultaneous quests.
export async function withWallet<T>(
  userId: string,
  work: (tx: EconomyTx, wallet: Wallet) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx: EconomyTx) => {
      const users = await tx.$queryRaw<
        Array<{ id: string }>
      >`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      if (!users.length) throw new EconomyError('Account not found.', 404);
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        const settings = await readSettings(tx);
        wallet = await tx.wallet.create({ data: { userId } });
        if (settings.starterGrant) {
          wallet = await postEntry(
            tx,
            wallet,
            settings.starterGrant,
            'WELCOME_BONUS',
            'Welcome to RiftEssence',
            { source: 'welcome' },
          );
        }
      }
      if (wallet.riftCoins > 0) {
        const legacy = wallet.riftCoins;
        // Legacy earned totals already include RC; conversion isn't new income.
        wallet = await postEntry(
          tx,
          wallet,
          legacy,
          'LEGACY_CONVERSION',
          'Legacy RiftCoins converted',
          { source: 'legacy_migration' },
          false,
        );
        wallet = await tx.wallet.update({ where: { id: wallet.id }, data: { riftCoins: 0 } });
      }
      return work(tx, wallet);
    },
    { maxWait: 10000, timeout: 15000 },
  );
}

export async function postEntry(
  tx: EconomyTx,
  wallet: Wallet,
  amount: number,
  type: Prisma.WalletTransactionCreateInput['type'],
  note: string,
  metadata: Prisma.InputJsonObject = {},
  countTotals = true,
): Promise<Wallet> {
  if (!Number.isSafeInteger(amount) || amount === 0) throw new EconomyError('Invalid PE amount.');
  const updated = await tx.wallet.updateMany({
    where: {
      id: wallet.id,
      prismaticEssence: amount < 0 ? { gte: -amount } : { lte: 2147483647 - amount },
    },
    data: {
      prismaticEssence: { increment: amount },
      ...(countTotals && amount > 0 ? { totalPrismaticEarned: { increment: amount } } : {}),
      ...(countTotals && amount < 0 ? { totalPrismaticSpent: { increment: -amount } } : {}),
      ...((type === 'QUEST_REWARD' || type === 'GAME_REWARD') && amount > 0
        ? { experience: { increment: amount } }
        : {}),
    },
  });
  if (!updated.count)
    throw new EconomyError(
      amount < 0 ? 'Not enough Prismatic Essence.' : 'This wallet has reached its balance limit.',
    );
  const next = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId: wallet.userId,
      currency: 'PRISMATIC_ESSENCE',
      type,
      amount,
      balanceAfter: next.prismaticEssence,
      note,
      metadata,
    },
  });
  return next;
}

export function operationKey(request: FastifyRequest): string {
  const result = z.string().uuid().safeParse(request.headers['idempotency-key']);
  if (!result.success)
    throw new EconomyError('Refresh the page and try again (missing operation ID).');
  return result.data;
}

export async function walletOperation<T extends Prisma.InputJsonValue>(
  userId: string,
  key: string,
  payload: unknown,
  work: (tx: EconomyTx, wallet: Wallet) => Promise<T>,
): Promise<T> {
  const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return withWallet(userId, async (tx, wallet) => {
    const previous = await tx.walletOperation.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new EconomyError('This operation ID was already used for a different request.', 409);
      return previous.result as T;
    }
    const result = await work(tx, wallet);
    await tx.walletOperation.create({ data: { userId, key, fingerprint, result } });
    return result;
  });
}

export async function requireEconomyAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, badges: { select: { key: true } } },
  });
  if (!user?.badges.some((badge: { key: string }) => badge.key.toLowerCase() === 'admin'))
    throw new EconomyError('Admin access required.', 403);
  return user as { id: string; username: string };
}

export async function walletSummary(userId: string) {
  return withWallet(userId, async (_tx, wallet) => ({
    wallet: {
      prismaticEssence: wallet.prismaticEssence,
      totalPrismaticEarned: wallet.totalPrismaticEarned,
      totalPrismaticSpent: wallet.totalPrismaticSpent,
      updatedAt: wallet.updatedAt,
    },
    progression: {
      level: Math.floor(wallet.experience / 1000) + 1,
      experience: wallet.experience,
      currentProgress: wallet.experience % 1000,
      nextLevelAt: (Math.floor(wallet.experience / 1000) + 1) * 1000,
      progressPct: (wallet.experience % 1000) / 10,
    },
  }));
}

export function economyFailure(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof EconomyError) return reply.code(error.status).send({ error: error.message });
  if (error instanceof z.ZodError)
    return reply
      .code(400)
      .send({
        error: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      });
  request.log.error({ err: error }, 'Economy request failed');
  return reply.code(500).send({ error: 'Could not complete this request. Please try again.' });
}
