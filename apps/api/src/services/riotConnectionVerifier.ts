import prisma from '../prisma';
import * as riotClient from '../riotClient';
import { syncUserVerification } from '../utils/verification';

const CHECK_DELAYS_MINUTES = [5, 15, 30] as const;

function nextScheduledCheck(startedAt: Date, checkCount: number): Date | null {
  const nextDelay = CHECK_DELAYS_MINUTES[checkCount];
  return nextDelay === undefined ? null : new Date(startedAt.getTime() + nextDelay * 60_000);
}

/**
 * Performs due checks for confirmed icon-verification attempts. It is safe to run
 * from every API process: each row is claimed before a Riot request is made.
 */
export async function processDueRiotConnectionVerifications(limit = 25): Promise<void> {
  const now = new Date();
  const attempts = await prisma.riotVerificationAttempt.findMany({
    where: { status: 'ACTIVE', nextCheckAt: { lte: now } },
    orderBy: { nextCheckAt: 'asc' },
    take: limit,
  });

  await Promise.all(attempts.map(async (attempt: any) => {
    const claimed = await prisma.riotVerificationAttempt.updateMany({
      where: { id: attempt.id, status: 'ACTIVE', nextCheckAt: { lte: now } },
      data: { nextCheckAt: new Date(now.getTime() + 2 * 60_000) },
    });
    if (claimed.count !== 1) return;

    let profileIconId: number | null;
    try {
      profileIconId = await riotClient.getProfileIcon({
        summonerName: attempt.summonerName,
        region: attempt.region,
        puuid: attempt.puuid,
      }, true);
    } catch (error) {
      // Riot availability must never cause a legitimate user to lose a link.
      await prisma.riotVerificationAttempt.update({
        where: { id: attempt.id },
        data: { nextCheckAt: new Date(Date.now() + 5 * 60_000) },
      });
      console.warn('[RiotVerification] Deferring check after Riot API error', { attemptId: attempt.id, error });
      return;
    }

    const checkNumber = attempt.checkCount + 1;
    const isMatch = profileIconId === attempt.targetIconId;
    const checkField = checkNumber === 1 ? 'observedAt5' : checkNumber === 2 ? 'observedAt15' : 'observedAt30';

    if (checkNumber >= CHECK_DELAYS_MINUTES.length) {
      if (isMatch) {
        await prisma.$transaction(async (tx: any) => {
          if (attempt.riotAccountId) {
            await tx.riotAccount.updateMany({
              where: { id: attempt.riotAccountId, userId: attempt.userId },
              data: { verified: true, profileIconId, verificationIconId: attempt.targetIconId },
            });
          }
          await tx.riotVerificationAttempt.update({
            where: { id: attempt.id },
            data: { status: 'VERIFIED', checkCount: checkNumber, [checkField]: now, nextCheckAt: null },
          });
        });
        await syncUserVerification(attempt.userId);
      } else {
        await prisma.$transaction(async (tx: any) => {
          if (attempt.riotAccountId) {
            await tx.riotAccount.deleteMany({
              where: { id: attempt.riotAccountId, userId: attempt.userId, verified: false },
            });
          }
          await tx.riotVerificationAttempt.update({
            where: { id: attempt.id },
            data: {
              status: 'FAILED',
              checkCount: checkNumber,
              failureReason: 'The assigned icon was not present at the final 30-minute check.',
              nextCheckAt: null,
            },
          });
        });
        await syncUserVerification(attempt.userId);
      }
      return;
    }

    const nextCheckAt = attempt.startedAt ? nextScheduledCheck(attempt.startedAt, checkNumber) : null;
    await prisma.riotVerificationAttempt.update({
      where: { id: attempt.id },
      data: {
        checkCount: checkNumber,
        ...(isMatch ? { [checkField]: now } : {}),
        nextCheckAt,
      },
    });
  }));
}

export function startRiotConnectionVerifier(intervalMs = 60_000) {
  const run = () => processDueRiotConnectionVerifications().catch((error) => {
    console.error('[RiotVerification] Scheduled processing failed', error);
  });
  run();
  return setInterval(run, intervalMs);
}
