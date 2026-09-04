import prisma from '../prisma';
import * as riotClient from '../riotClient';
import { syncUserVerification } from '../utils/verification';
import { CHECK_DELAYS_MINUTES, CONFIRM_WINDOW_MS, nextScheduledCheck } from './riotVerification';
import { processPendingRatings } from './pendingRatings';

/** Database leases are fenced: a stale worker cannot commit after another claim. */
export async function processDueRiotConnectionVerifications(limit = 25): Promise<void> {
  const now = new Date();
  await prisma.riotVerificationAttempt.updateMany({
    where: { status: 'AWAITING_CONFIRMATION', createdAt: { lt: new Date(now.getTime() - CONFIRM_WINDOW_MS) } },
    data: { status: 'CANCELLED', failureReason: 'Confirmation expired. Start a new attempt.' },
  });
  const attempts = await prisma.riotVerificationAttempt.findMany({
    where: { status: 'ACTIVE', nextCheckAt: { lte: now } },
    orderBy: { nextCheckAt: 'asc' }, take: limit,
  });
  await Promise.all(attempts.map(async (attempt: any) => {
    const leaseUntil = new Date(now.getTime() + 2 * 60_000);
    const claimed = await prisma.riotVerificationAttempt.updateMany({
      where: { id: attempt.id, status: 'ACTIVE', checkCount: attempt.checkCount, nextCheckAt: { lte: now } },
      data: { nextCheckAt: leaseUntil },
    });
    if (claimed.count !== 1) return;
    const fence = { id: attempt.id, status: 'ACTIVE', checkCount: attempt.checkCount, nextCheckAt: leaseUntil };
    try {
      const profileIconId = await riotClient.getProfileIcon({
        summonerName: attempt.summonerName, region: attempt.region, puuid: attempt.puuid,
      }, true);
      if (profileIconId === null) throw new Error('Riot returned no profile icon');
      const checkNumber = attempt.checkCount + 1;
      const isMatch = profileIconId === attempt.targetIconId;
      const checkField = checkNumber === 1 ? 'observedAt5' : checkNumber === 2 ? 'observedAt15' : 'observedAt30';
      if (checkNumber < CHECK_DELAYS_MINUTES.length) {
        await prisma.riotVerificationAttempt.updateMany({
          where: fence,
          data: { checkCount: checkNumber, ...(isMatch ? { [checkField]: now } : {}),
            nextCheckAt: nextScheduledCheck(attempt.startedAt, checkNumber) },
        });
        return;
      }
      const changed = await prisma.$transaction(async (tx: any) => {
        const committed = await tx.riotVerificationAttempt.updateMany({
          where: fence,
          data: { status: isMatch ? 'VERIFIED' : 'FAILED', checkCount: checkNumber,
            ...(isMatch ? { [checkField]: now } : { failureReason: 'The assigned icon was not present at the final 30-minute check.' }),
            nextCheckAt: null },
        });
        if (committed.count !== 1) return false;
        // Guest attempts prove eligibility only; no account/session exists yet.
        if (attempt.userId && attempt.riotAccountId) {
          if (isMatch) {
            const linked = await tx.riotAccount.updateMany({
              where: { id: attempt.riotAccountId, userId: attempt.userId },
              data: { verified: true, profileIconId, verificationIconId: attempt.targetIconId },
            });
            if (linked.count !== 1) await tx.riotVerificationAttempt.update({
              where: { id: attempt.id },
              data: { status: 'FAILED', failureReason: 'The Riot connection was removed before verification completed.' },
            });
          } else {
            await tx.riotAccount.deleteMany({
              where: { id: attempt.riotAccountId, userId: attempt.userId, verified: false },
            });
          }
        }
        return true;
      });
      if (changed && attempt.userId) await syncUserVerification(attempt.userId);
    } catch (error) {
      // Missing data, Riot outages and database failures are retryable, not proof of failure.
      await prisma.riotVerificationAttempt.updateMany({
        where: fence, data: { nextCheckAt: new Date(Date.now() + 5 * 60_000) },
      });
      console.warn('[RiotVerification] Deferring check', { attemptId: attempt.id, error });
    }
  }));
}

export function startRiotConnectionVerifier(intervalMs = 60_000) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await processDueRiotConnectionVerifications();
      await processPendingRatings();
    } catch (error) {
      console.error('[RiotVerification] Scheduled processing failed', error);
    } finally { running = false; }
  };
  void run();
  return setInterval(() => void run(), intervalMs);
}
