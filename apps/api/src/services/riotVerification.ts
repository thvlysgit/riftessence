import { randomInt } from 'crypto';
import prisma from '../prisma';
import * as riotClient from '../riotClient';

export const CHECK_DELAYS_MINUTES = [5, 15, 30] as const;
export const CONFIRM_WINDOW_MS = 15 * 60_000;

export class VerificationError extends Error {
  constructor(message: string, public statusCode = 409) { super(message); }
}

export function nextScheduledCheck(startedAt: Date, checkCount: number): Date | null {
  const delay = CHECK_DELAYS_MINUTES[checkCount];
  return delay === undefined ? null : new Date(startedAt.getTime() + delay * 60_000);
}

export function publicAttempt(attempt: any) {
  return {
    id: attempt.id, targetIconId: attempt.targetIconId, status: attempt.status,
    startedAt: attempt.startedAt, failureReason: attempt.failureReason,
    finalCheckAt: attempt.startedAt ? new Date(attempt.startedAt.getTime() + 30 * 60_000) : null,
  };
}

/** A single server-issued challenge across linking and rating entry points. */
export async function prepareRiotVerification(summonerName: string, region: string, userId: string | null, excludedPuuids: string[] = []) {
  const parts = summonerName.trim().split('#');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new VerificationError('Use your full Riot ID, for example Player#TAG.', 400);
  const [gameName, tagLine] = parts;
  const puuid = await riotClient.getPuuid(gameName, tagLine, region);
  if (!puuid) throw new VerificationError('Riot account not found.', 404);
  if (excludedPuuids.includes(puuid)) throw new VerificationError('You cannot rate yourself.', 400);
  const currentIcon = await riotClient.getProfileIcon({ summonerName, region, puuid }, true);
  if (currentIcon === null) throw new VerificationError('Riot could not return your icon. Please try again.', 502);

  return prisma.$transaction(async (tx: any) => {
    // Database-backed limit: simultaneous requests cannot shop for another icon.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`riot-proof:${puuid}`}))`;
    const existing = await tx.riotAccount.findUnique({ where: { puuid_region: { puuid, region } } });
    if (userId && existing?.userId && existing.userId !== userId) {
      throw new VerificationError('This Riot account is already linked to another RiftEssence account.');
    }
    const now = new Date();
    await tx.riotVerificationAttempt.updateMany({
      where: { puuid, status: 'AWAITING_CONFIRMATION', createdAt: { lt: new Date(now.getTime() - CONFIRM_WINDOW_MS) } },
      data: { status: 'CANCELLED', failureReason: 'Confirmation expired. Start a new attempt.' },
    });
    const active = await tx.riotVerificationAttempt.findFirst({
      where: { puuid, status: { in: ['AWAITING_CONFIRMATION', 'ACTIVE'] } },
    });
    if (active) {
      if (userId && active.userId === userId && active.region === region) return active;
      throw new VerificationError('A verification is already in progress for this Riot account. Resume it in the original tab or try again later.');
    }
    const recentCount = await tx.riotVerificationAttempt.count({
      where: { puuid, createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } },
    });
    const icons = Array.from({ length: 29 }, (_, i) => i).filter(i => i !== currentIcon);
    const alreadyOwned = Boolean(userId && existing?.userId === userId && existing.verified);
    if (!alreadyOwned && recentCount >= 3) throw new VerificationError('Too many verification attempts for this Riot account. Try again in one hour.', 429);
    return tx.riotVerificationAttempt.create({ data: {
      userId, puuid, summonerName, gameName, tagLine, region,
      targetIconId: alreadyOwned ? currentIcon : icons[randomInt(icons.length)],
      ...(alreadyOwned ? { status: 'VERIFIED', riotAccountId: existing.id } : {}),
    } });
  });
}

/** Confirmation is an acknowledgement, not proof. Never grant verified permissions here. */
export async function confirmRiotVerification(attemptId: string, userId: string | null) {
  return prisma.$transaction(async (tx: any) => {
    // Lock the attempt before reading its state; retries keep the original clock.
    await tx.$queryRaw`SELECT "id" FROM "RiotVerificationAttempt" WHERE "id" = ${attemptId} FOR UPDATE`;
    const attempt = await tx.riotVerificationAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== userId) throw new VerificationError('Verification attempt not found.', 404);
    if (['ACTIVE', 'VERIFIED'].includes(attempt.status)) return attempt;
    if (attempt.status !== 'AWAITING_CONFIRMATION' || Date.now() - attempt.createdAt.getTime() > CONFIRM_WINDOW_MS) {
      throw new VerificationError('This verification attempt expired. Start again.');
    }
    let riotAccountId: string | null = null;
    if (userId) {
      const existing = await tx.riotAccount.findUnique({ where: { puuid_region: { puuid: attempt.puuid, region: attempt.region } } });
      if (existing?.userId && existing.userId !== userId) throw new VerificationError('This Riot account is already linked to another account.');
      const data = {
        userId, verificationIconId: attempt.targetIconId,
        // An unowned legacy row is not proof of ownership for its new claimant.
        verified: Boolean(existing?.verified && existing.userId === userId),
      };
      const account = existing
        ? await tx.riotAccount.update({ where: { id: existing.id }, data })
        : await tx.riotAccount.create({ data: {
          ...data, puuid: attempt.puuid, summonerName: attempt.summonerName,
          gameName: attempt.gameName, tagLine: attempt.tagLine, region: attempt.region,
          isMain: (await tx.riotAccount.count({ where: { userId } })) === 0,
        } });
      riotAccountId = account.id;
    }
    const startedAt = new Date();
    return tx.riotVerificationAttempt.update({ where: { id: attempt.id }, data: {
      status: 'ACTIVE', startedAt, nextCheckAt: nextScheduledCheck(startedAt, 0), riotAccountId,
    } });
  });
}
