import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { prepareRiotVerification, confirmRiotVerification, publicAttempt, trustedRatingAttempt, VerificationError } from '../services/riotVerification';
import { checkRatingEligibility, RatingEligibility } from '../services/ratingEligibility';
import { publishPendingRating } from '../services/pendingRatings';
import { z } from 'zod';

const LookupSchema = z.object({
  summonerName: z.string().min(3).max(100),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']),
  receiverUsername: z.string().min(1).max(100),
});
const SessionSchema = z.object({ receiverUsername: z.string().min(1).max(100) });
const TokenSchema = z.object({ raterToken: z.string().min(1).max(4096) });
const ConfirmSchema = TokenSchema.extend({ keepIconFor30Minutes: z.literal(true) });
const SubmitSchema = TokenSchema.extend({
  receiverId: z.string().min(1), stars: z.number().int().min(1).max(5),
  moons: z.number().int().min(1).max(5), comment: z.string().max(300).optional(),
});

export default async function rateRoutes(fastify: any) {
  // Get target user's public profile for rating page
  fastify.get('/:username', async (request: any, reply: any) => {
    try {
      const { username } = request.params;

      const user = await prisma.user.findUnique({
        where: { username },
        include: {
          riotAccounts: {
            where: { isMain: true, hidden: false },
            take: 1,
          },
          ratingsReceived: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Calculate average ratings
      const ratings = user.ratingsReceived;
      const avgStars = ratings.length > 0
        ? Math.round(ratings.reduce((sum: number, r: { stars: number }) => sum + r.stars, 0) / ratings.length)
        : 0;
      const avgMoons = ratings.length > 0
        ? Math.round(ratings.reduce((sum: number, r: { moons: number }) => sum + r.moons, 0) / ratings.length)
        : 0;

      const mainAccount = user.riotAccounts[0];

      return reply.send({
        user: {
          id: user.id,
          username: user.username,
          mainAccount: mainAccount ? {
            gameName: mainAccount.gameName || mainAccount.summonerName,
            tagLine: mainAccount.tagLine,
            region: mainAccount.region,
            rank: mainAccount.rank,
            division: mainAccount.division,
            profileIconId: mainAccount.profileIconId,
          } : null,
          skillStars: avgStars,
          personalityMoons: avgMoons,
          feedbackCount: ratings.length,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch user profile' });
    }
  });


  // A scoped receipt is not a login JWT: deliberately contains no userId.
  async function pendingFromToken(token: string) {
    let payload: any;
    try { payload = fastify.jwt.verify(token); }
    catch { throw new VerificationError('Invalid or expired rating session. Start again.', 401); }
    if (payload.purpose !== 'pending_rating' || typeof payload.pendingId !== 'string') throw new VerificationError('Invalid rating token.', 401);
    const pending = await prisma.pendingRating.findUnique({ where: { id: payload.pendingId }, include: { attempt: true } });
    if (!pending || pending.receiverId !== payload.receiverId) throw new VerificationError('Rating session not found.', 404);
    return pending;
  }

  function sendError(reply: any, error: any) {
    fastify.log.error(error);
    return reply.code(error instanceof VerificationError || Number.isInteger(error?.statusCode) ? error.statusCode : 502).send({
      error: error instanceof VerificationError ? error.message : 'Could not complete the request. Please try again shortly.',
    });
  }

  const receiverByUsername = (username: string) => prisma.user.findUnique({
    where: { username }, include: { riotAccounts: { where: { verified: true } } },
  });

  async function storeEligibility(pendingId: string, eligibility: RatingEligibility) {
    if (!eligibility.sharedMatchesCount) {
      throw new VerificationError('No shared game was found in the most recent 50 games across the connected Riot accounts.', 403);
    }
    return prisma.pendingRating.update({ where: { id: pendingId }, data: {
      sharedMatchesCount: eligibility.sharedMatchesCount,
      eligibleRaterPuuids: eligibility.eligibleRaterPuuids,
      eligibleReceiverAccountIds: eligibility.eligibleReceiverAccountIds,
      sharedMatchesCheckedAt: new Date(),
    } });
  }

  function ratingReceipt(pending: any, receiverId: string) {
    return fastify.jwt.sign({ purpose: 'pending_rating', pendingId: pending.id, receiverId }, { expiresIn: '7d' });
  }

  async function connectedDraft(userId: string, receiver: any) {
    if (receiver.id === userId) throw new VerificationError('You cannot rate yourself.', 400);
    const accounts = await prisma.riotAccount.findMany({ where: { userId, verified: true } });
    if (!accounts.length) return null;
    const eligibility = await checkRatingEligibility(accounts, receiver.riotAccounts);
    if (!eligibility.sharedMatchesCount) {
      throw new VerificationError(`No shared game was found in the most recent 50 games checked across all ${accounts.length} connected Riot account${accounts.length === 1 ? '' : 's'}.`, 403);
    }
    const source = accounts.find((account: any) => eligibility.eligibleRaterPuuids.includes(account.puuid));
    const attempt = await trustedRatingAttempt(source, userId);
    const pending = await prisma.pendingRating.upsert({
      where: { attemptId_receiverId: { attemptId: attempt.id, receiverId: receiver.id } },
      create: { attemptId: attempt.id, receiverId: receiver.id }, update: {},
    });
    await storeEligibility(pending.id, eligibility);
    return { pending, attempt, eligibility };
  }

  // Signed-in users use every verified linked account and never see icon verification.
  fastify.post('/session', async (request: any, reply: any) => {
    const parsed = SessionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Choose a player to rate.' });
    const userId = await getUserIdFromRequest(request, reply, false);
    if (!userId) return reply.code(401).send({ error: 'No signed-in account.' });
    try {
      const receiver = await receiverByUsername(parsed.data.receiverUsername);
      if (!receiver || !receiver.riotAccounts.length) throw new VerificationError('This player has no verified Riot account to rate.', 404);
      const result = await connectedDraft(userId, receiver);
      if (!result) return reply.code(409).send({ error: 'Connect a Riot account to rate this player.', needsRiotVerification: true });
      return reply.send({ success: true, raterToken: ratingReceipt(result.pending, receiver.id),
        status: result.pending.status, attempt: publicAttempt(result.attempt), eligibility: result.eligibility });
    } catch (error) { return sendError(reply, error); }
  });

  fastify.post('/lookup', { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request: any, reply: any) => {
    const parsed = LookupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Enter a Riot ID, region, and player to rate.' });
    try {
      const userId = await getUserIdFromRequest(request, reply, false);
      const receiver = await receiverByUsername(parsed.data.receiverUsername);
      if (!receiver || !receiver.riotAccounts.length) throw new VerificationError('This player has no verified Riot account to rate.', 404);
      if (receiver.id === userId) throw new VerificationError('You cannot rate yourself.', 400);
      if (userId) {
        const result = await connectedDraft(userId, receiver);
        if (result) return reply.send({ success: true, raterToken: ratingReceipt(result.pending, receiver.id),
          status: result.pending.status, attempt: publicAttempt(result.attempt), eligibility: result.eligibility });
      }
      const attempt = await prepareRiotVerification(parsed.data.summonerName, parsed.data.region, userId, receiver.riotAccounts.map((a: any) => a.puuid));
      if (receiver.riotAccounts.some((a: any) => a.puuid === attempt.puuid)) throw new VerificationError('You cannot rate yourself.', 400);
      // Reusing a signed-in connection reuses its clock and assigned icon.
      const pending = await prisma.pendingRating.upsert({
        where: { attemptId_receiverId: { attemptId: attempt.id, receiverId: receiver.id } },
        create: { attemptId: attempt.id, receiverId: receiver.id }, update: {},
      });
      const raterToken = ratingReceipt(pending, receiver.id);
      return reply.send({ success: true, raterToken, attempt: publicAttempt(attempt), status: pending.status });
    } catch (error) { return sendError(reply, error); }
  });

  // Acknowledge the assigned icon immediately. The worker will verify it later.
  fastify.post('/verify', async (request: any, reply: any) => {
    const parsed = ConfirmSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Confirm that you changed the assigned icon and will keep it for 30 minutes.' });
    try {
      const pending = await pendingFromToken(parsed.data.raterToken);
      const attempt = await confirmRiotVerification(pending.attemptId, pending.attempt.userId);
      const receiverAccounts = await prisma.riotAccount.findMany({ where: { userId: pending.receiverId, verified: true } });
      const eligibility = await checkRatingEligibility([
        { id: attempt.riotAccountId || attempt.id, puuid: attempt.puuid, region: attempt.region },
      ], receiverAccounts);
      await storeEligibility(pending.id, eligibility);
      return reply.send({ success: true, attempt: publicAttempt(attempt), eligibility });
    } catch (error) { return sendError(reply, error); }
  });

  fastify.post('/submit', async (request: any, reply: any) => {
    const parsed = SubmitSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Rate skill and personality from 1 to 5. Comments must be at most 300 characters.' });
    try {
      const pending = await pendingFromToken(parsed.data.raterToken);
      if (pending.receiverId !== parsed.data.receiverId) throw new VerificationError('This rating session belongs to another player.', 403);
      if (['FAILED', 'CANCELLED'].includes(pending.attempt.status) || pending.status === 'REJECTED') throw new VerificationError('Verification failed. Your rating was not published. Start a new attempt.');
      if (!['ACTIVE', 'VERIFIED'].includes(pending.attempt.status)) throw new VerificationError('Confirm your icon change first.');
      if (pending.sharedMatchesCount <= 0 || !pending.sharedMatchesCheckedAt) {
        throw new VerificationError('A shared game must be found in the most recent 50 games before you can submit a rating.', 403);
      }
      if (pending.status === 'DRAFT' && Date.now() - pending.createdAt.getTime() > 60 * 60_000) throw new VerificationError('The rating form expired. Start again.');
      // Compare-and-set: double submits never overwrite the accepted payload.
      await prisma.pendingRating.updateMany({
        where: { id: pending.id, status: 'DRAFT' },
        data: { status: 'PENDING', stars: parsed.data.stars, moons: parsed.data.moons,
          comment: parsed.data.comment || '', submittedAt: new Date(), nextPublishAt: new Date() },
      });
      let saved = await prisma.pendingRating.findUnique({ where: { id: pending.id }, include: { attempt: true } });
      if (saved?.status === 'PENDING' && saved.attempt.status === 'VERIFIED') {
        await publishPendingRating(saved);
        saved = await prisma.pendingRating.findUnique({ where: { id: pending.id }, include: { attempt: true } });
      }
      return reply.code(202).send({ success: true, status: saved.status, attempt: publicAttempt(pending.attempt) });
    } catch (error) { return sendError(reply, error); }
  });

  // POST keeps bearer receipts out of URLs, referers, and access-log query strings.
  fastify.post('/status', async (request: any, reply: any) => {
    reply.header('Cache-Control', 'no-store');
    const parsed = TokenSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Missing rating receipt.' });
    try {
      const pending = await pendingFromToken(parsed.data.raterToken);
      const failed = ['FAILED', 'CANCELLED'].includes(pending.attempt.status);
      return reply.send({
        status: failed && pending.status !== 'PUBLISHED' ? 'REJECTED' : pending.status,
        failureReason: pending.failureReason || pending.attempt.failureReason,
        sharedMatchesCount: pending.sharedMatchesCount,
        attempt: publicAttempt(pending.attempt),
      });
    } catch (error) { return sendError(reply, error); }
  });
}
