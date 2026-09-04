import { randomUUID } from 'crypto';
import prisma from '../prisma';
export async function publishPendingRating(pending: any): Promise<void> {
  await prisma.$transaction(async (tx: any) => {
    // Row lock + status guard makes publication and its notification exactly once.
    await tx.$queryRaw`SELECT "id" FROM "PendingRating" WHERE "id" = ${pending.id} FOR UPDATE`;
    const fresh = await tx.pendingRating.findUnique({ where: { id: pending.id }, include: { attempt: true } });
    if (!fresh || fresh.status !== 'PENDING' || fresh.attempt.status !== 'VERIFIED') return;
    const reject = (failureReason: string) => tx.pendingRating.update({
      where: { id: fresh.id }, data: { status: 'REJECTED', failureReason },
    });
    if (fresh.attempt.userId === fresh.receiverId) { await reject('You cannot rate yourself.'); return; }
    if (fresh.sharedMatchesCount <= 0 || !fresh.sharedMatchesCheckedAt) { await reject('No shared game was verified before submission.'); return; }
    if (!fresh.attempt.userId && !fresh.eligibleRaterPuuids.includes(fresh.attempt.puuid)) { await reject('The verified Riot account was not eligible for this rating.'); return; }
    const stillLinked = await tx.riotAccount.count({ where: { id: { in: fresh.eligibleReceiverAccountIds }, userId: fresh.receiverId, verified: true } });
    if (!stillLinked) { await reject('The recipient no longer has the verified Riot connection used for this rating.'); return; }

    const attempt = fresh.attempt;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`riot-proof:${attempt.puuid}`}))`;
    const account = await tx.riotAccount.findUnique({ where: { puuid_region: { puuid: attempt.puuid, region: attempt.region } }, include: { user: true } });
    if (attempt.userId && (!account?.verified || account.userId !== attempt.userId || account.id !== attempt.riotAccountId)) {
      await reject('Your verified Riot connection is no longer available.'); return;
    }
    if (account?.userId && !account.verified) { await reject('This Riot connection is still awaiting verification.'); return; }
    const guestIdentity = await tx.guestRatingIdentity.findUnique({ where: { puuid: attempt.puuid }, include: { user: true } });
    let rater = account?.user || guestIdentity?.user;
    if (!rater) {
      // A guest author is not a Riot account link: do not reserve this PUUID on
      // an inaccessible app account and prevent its owner from signing up later.
      rater = await tx.user.create({ data: {
        username: `${attempt.gameName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'Player'}_${randomUUID().slice(0, 8)}`,
        region: attempt.region,
        guestRatingIdentity: { create: { puuid: attempt.puuid } },
      } });
    }
    if (rater.id === fresh.receiverId || rater.isBanned) { await reject('This account is not eligible to rate this player.'); return; }
    // Serialize quota checks for all pending submissions attributed to this user.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${rater.id} FOR UPDATE`;
    const blocked = await tx.block.findFirst({ where: { OR: [
      { blockerId: rater.id, blockedId: fresh.receiverId }, { blockerId: fresh.receiverId, blockedId: rater.id },
    ] } });
    if (blocked) { await reject('Feedback is unavailable between these accounts.'); return; }
    // Signing up later does not reset guest duplicate/cooldown/daily limits.
    const ownedAccounts = await tx.riotAccount.findMany({ where: { userId: rater.id, verified: true }, select: { puuid: true } });
    const priorGuestIdentities = await tx.guestRatingIdentity.findMany({
      where: { puuid: { in: [attempt.puuid, ...ownedAccounts.map((item: any) => item.puuid)] } }, select: { userId: true },
    });
    const raterIds = [...new Set([rater.id, ...priorGuestIdentities.map((item: any) => item.userId)])];
    const existing = await tx.rating.findFirst({ where: { raterId: { in: raterIds }, receiverId: fresh.receiverId } });
    if (existing) { await reject('You have already rated this player.'); return; }
    const now = Date.now();
    const daily = await tx.rating.count({ where: { raterId: { in: raterIds }, createdAt: { gte: new Date(now - 24 * 60 * 60_000) } } });
    if (daily >= 10) { await reject('Daily rating limit reached (10 ratings). Please try again tomorrow.'); return; }
    const recent = await tx.rating.findFirst({ where: { raterId: { in: raterIds }, createdAt: { gte: new Date(now - 5 * 60_000) } } });
    if (recent) {
      await tx.pendingRating.update({ where: { id: fresh.id }, data: { nextPublishAt: new Date(now + 5 * 60_000) } });
      return;
    }
    const rating = await tx.rating.create({ data: {
      raterId: rater.id, receiverId: fresh.receiverId, stars: fresh.stars, moons: fresh.moons,
      comment: fresh.comment || '', sharedMatchesCount: fresh.sharedMatchesCount,
    } });
    await tx.notification.create({ data: {
      userId: fresh.receiverId, type: 'FEEDBACK_RECEIVED', fromUserId: rater.id,
      feedbackId: rating.id, message: `You received ${fresh.stars} stars and ${fresh.moons} moons from ${rater.username}`,
    } });
    await tx.pendingRating.update({ where: { id: fresh.id }, data: { status: 'PUBLISHED', ratingId: rating.id } });
  }, { timeout: 15_000 });
}

export async function processPendingRatings(limit = 25): Promise<void> {
  const now = new Date();
  await prisma.pendingRating.updateMany({
    where: { status: { in: ['DRAFT', 'PENDING'] }, attempt: { status: { in: ['FAILED', 'CANCELLED'] } } },
    data: { status: 'REJECTED', failureReason: 'Riot verification did not complete. Your rating was not published; you can try again.' },
  });
  const pending = await prisma.pendingRating.findMany({
    where: { status: 'PENDING', nextPublishAt: { lte: now }, attempt: { status: 'VERIFIED' } },
    include: { attempt: true }, orderBy: { submittedAt: 'asc' }, take: limit,
  });
  for (const item of pending) {
    try { await publishPendingRating(item); }
    catch (error) {
      await prisma.pendingRating.updateMany({ where: { id: item.id, status: 'PENDING' },
        data: { nextPublishAt: new Date(Date.now() + 5 * 60_000) } });
      console.warn('[PendingRating] Publication deferred', { pendingRatingId: item.id, error });
    }
  }
}
