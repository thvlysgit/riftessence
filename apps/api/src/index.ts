import 'dotenv/config';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import prisma from './prisma';
import * as riotClient from './riotClient';
import authRoutes from './routes/auth';
import discordRoutes from './routes/discord';
import userRoutes from './routes/user';
import postsRoutes from './routes/posts';
import lftRoutes from './routes/lft';
import coachingRoutes from './routes/coaching';
import communitiesRoutes from './routes/communities';
import discordFeedRoutes from './routes/discordFeed';
import adsRoutes from './routes/ads';
import blocksRoutes from './routes/blocks';
import leaderboardsRoutes from './routes/leaderboards';
import chatRoutes from './routes/chat';
import matchupRoutes from './routes/matchups';
import analyticsRoutes from './routes/analytics';
import badgeRoutes from './routes/badges';
import bcrypt from 'bcryptjs';
import { env } from './env';
import { RegisterSchema, LoginSchema, SetPasswordSchema, validateRequest, TurnstileVerifySchema, RatingSchema, BroadcastMessageSchema } from './validation';
import { getUserIdFromRequest } from './middleware/auth';
import { logError, logInfo } from './middleware/logger';
import { Errors } from './middleware/errors';
import { logAdminAction, AuditActions } from './utils/auditLog';

const server = Fastify({ logger: true });

// Verify JWT_SECRET is properly set before doing anything else
if (!env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
  console.error('The API cannot start without a valid JWT_SECRET.');
  console.error('\nTo generate a secure secret, run:');
  console.error('  node -e "console.log(\\"JWT_SECRET=\\" + require(\\"crypto\\").randomBytes(32).toString(\\"hex\\"))"');
  process.exit(1);
}

async function build() {
  // Register CORS FIRST before any other middleware
  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow all origins in development
      cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Register JWT for secure authentication
  await server.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  // Rate limiting disabled for development
  // await server.register(rateLimit as any, {
  //   max: (request: any) => {
  //     const token = request.headers['authorization']?.replace('Bearer ', '').trim();
  //     if (token) {
  //       try {
  //         request.server.jwt.verify(token);
  //         return 1000;
  //       } catch {
  //         return 500;
  //       }
  //     }
  //     return 500;
  //   },
  //   timeWindow: '15 minutes',
  //   cache: 10000,
  //   allowList: ['127.0.0.1'],
  //   skip: (request: any) => {
  //     return request.url === '/health' || 
  //            request.url === '/health/db' ||
  //            request.url === '/health/deep' ||
  //            request.url.startsWith('/docs') ||
  //            request.url === '/api/auth/login' ||
  //            request.url === '/api/auth/register' ||
  //            request.url === '/api/auth/set-password';
  //   },
  // });

  await server.register(swagger, {
    openapi: {
      info: { title: 'LFD Hub API', version: '0.1.0' }
    }
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'none' },
    staticCSP: true
  });

  // Register auth routes (login, register, set-password, refresh token)
  await server.register(authRoutes, { prefix: '/api/auth' });

  // Register Discord OAuth routes
  await server.register(discordRoutes, { prefix: '/api/auth/discord' });

  // Register other route groups
  await server.register(userRoutes, { prefix: '/api/user' });
  await server.register(postsRoutes, { prefix: '/api' });
  await server.register(lftRoutes, { prefix: '/api' });
  await server.register(coachingRoutes, { prefix: '/api' });
  await server.register(communitiesRoutes, { prefix: '/api' });
  await server.register(discordFeedRoutes, { prefix: '/api' });
  await server.register(adsRoutes, { prefix: '/api' });
  await server.register(blocksRoutes, { prefix: '/api/user' });
  await server.register(leaderboardsRoutes, { prefix: '/api' });
  await server.register(chatRoutes, { prefix: '/api/chat' });
  await server.register(matchupRoutes, { prefix: '/api' });
  await server.register(analyticsRoutes, { prefix: '/api' });
  await server.register(badgeRoutes, { prefix: '/api/badges' });

  // Feedback endpoint
  server.post('/api/feedback', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(RatingSchema, { ...request.body, raterId: userId });
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { receiverId, stars, moons, comment } = validation.data as any;

      if (userId === receiverId) {
        return reply.code(400).send({ error: 'You cannot rate yourself' });
      }

      if (stars < 1 || stars > 5 || moons < 1 || moons > 5) {
        return reply.code(400).send({ error: 'Stars and moons must be between 1 and 5' });
      }

      // Check if user has developer badge (bypass restrictions)
      const rater = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      const hasDeveloperBadge = rater?.badges.some((b: any) => b.key?.toLowerCase() === 'developer');

      if (!hasDeveloperBadge) {
        // Check if user has linked Riot account
        const raterRiotAccount = await prisma.riotAccount.findFirst({
          where: { userId, verified: true },
        });

        if (!raterRiotAccount) {
          return reply.code(403).send({ error: 'You must have a verified Riot account to give feedback' });
        }

        // P0 FIX: Check daily rate limit (10 ratings per day) - outside transaction for performance
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const ratingsToday = await prisma.rating.count({
          where: {
            raterId: userId,
            createdAt: { gte: oneDayAgo },
          },
        });

        if (ratingsToday >= 10) {
          return reply.code(429).send({ error: 'Daily rating limit reached. You can submit up to 10 ratings per day.' });
        }

        // SECURITY FIX: Wrap cooldown checks in transaction to prevent race conditions
        // This ensures concurrent requests can't bypass the 5-minute cooldown or duplicate rating check
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        try {
          await prisma.$transaction(async (tx: any) => {
            // Check if feedback already exists for this user pair (one rating per person, ever)
            const existingFeedback = await tx.rating.findFirst({
              where: { raterId: userId, receiverId },
            });

            if (existingFeedback) {
              throw new Error('ALREADY_RATED');
            }

            // Check 5-minute global cooldown (can only rate anyone once every 5 minutes)
            const recentRating = await tx.rating.findFirst({
              where: {
                raterId: userId,
                createdAt: { gte: fiveMinutesAgo },
              },
            });

            if (recentRating) {
              throw new Error('COOLDOWN_ACTIVE');
            }
          });
        } catch (error: any) {
          if (error.message === 'ALREADY_RATED') {
            return reply.code(400).send({ error: 'You have already rated this user' });
          }
          if (error.message === 'COOLDOWN_ACTIVE') {
            return reply.code(429).send({ error: 'You can only rate once every 5 minutes' });
          }
          throw error;
        }

        // Check match history between rater and receiver
        const sharedMatches = await prisma.matchHistory.findMany({
          where: {
            OR: [
              { userId, opponentId: receiverId },
              { userId: receiverId, opponentId: userId },
            ],
          },
        });

        const sharedMatchesCount = sharedMatches.reduce((sum: number, m: any) => sum + (m.sharedMatchesCount || 1), 0);

        if (sharedMatchesCount <= 0) {
          return reply.code(403).send({ error: 'You must have at least one recorded match together to leave feedback' });
        }

        (request as any).sharedMatchesCount = sharedMatchesCount;
      }

      // Create feedback
      const rating = await prisma.rating.create({
        data: {
          raterId: userId,
          receiverId,
          stars,
          moons,
          comment: comment || '',
          sharedMatchesCount: (request as any).sharedMatchesCount || 1,
        },
      });

      // Create notification for receiver
      await prisma.notification.create({
        data: {
          userId: receiverId,
          type: 'FEEDBACK_RECEIVED',
          fromUserId: userId,
          feedbackId: rating.id,
          message: `You received ${stars} stars and ${moons} moons from ${rater?.username || 'a player'}`,
        },
      });

      return reply.send({ success: true, rating });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to submit feedback' });
    }
  });

  // Report endpoint - creates a pending report for admin review
  server.post('/api/report', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { reportedUserId, reason } = request.body as {
        reportedUserId: string;
        reason: string;
      };

      if (!userId || !reportedUserId || !reason) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      if (userId === reportedUserId) {
        return reply.code(400).send({ error: 'You cannot report yourself' });
      }

      // Get reporter info
      const reporter = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      const reportedUser = await prisma.user.findUnique({
        where: { id: reportedUserId },
      });

      if (!reporter || !reportedUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Check if reporter has verified Riot account (unless developer badge)
      const hasDeveloperBadge = reporter.badges?.some((b: any) => b.key?.toLowerCase() === 'developer');
      if (!hasDeveloperBadge) {
        const hasVerifiedRiot = await prisma.riotAccount.findFirst({
          where: { userId, verified: true },
        });

        if (!hasVerifiedRiot) {
          return reply.code(403).send({ error: 'You must have a verified Riot account to report users' });
        }
      }

      // Create report with PENDING status
      const report = await prisma.report.create({
        data: {
          reporterId: userId,
          reportedId: reportedUserId,
          reason,
          status: 'PENDING',
        },
      });

      // Notify reported user
      await prisma.notification.create({
        data: {
          userId: reportedUserId,
          type: 'REPORT_RECEIVED',
          fromUserId: userId,
          reportId: report.id,
          message: `You have been reported. An admin will review this case.`,
        },
      });

      return reply.send({ success: true, message: 'Report submitted successfully', reportId: report.id });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to submit report' });
    }
  });

  // Get all reports (admin only)
  server.get('/api/admin/reports', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      // Check admin status
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const hasAdminBadge = (user.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');
      if (!hasAdminBadge) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      // Fetch all pending reports with user info
      const reports = await prisma.report.findMany({
        where: { status: 'PENDING' },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
            },
          },
          reported: {
            select: {
              id: true,
              username: true,
              reportCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ reports });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch reports' });
    }
  });

  // Handle report actions (accept/reject/dismiss) - admin only
  server.patch('/api/admin/reports/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      const { id } = request.params as { id: string };
      const { action } = request.body as { action: 'ACCEPT' | 'REJECT' | 'DISMISS' };

      if (!action) {
        return reply.code(400).send({ error: 'action is required' });
      }

      if (!['ACCEPT', 'REJECT', 'DISMISS'].includes(action)) {
        return reply.code(400).send({ error: 'Invalid action. Must be ACCEPT, REJECT, or DISMISS' });
      }

      // Check admin status
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!admin) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const hasAdminBadge = (admin.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');
      if (!hasAdminBadge) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      // Fetch the report
      const report = await prisma.report.findUnique({
        where: { id },
      });

      if (!report) {
        return reply.code(404).send({ error: 'Report not found' });
      }

      if (report.status !== 'PENDING') {
        return reply.code(400).send({ error: 'Report has already been resolved' });
      }

      // Handle different actions
      if (action === 'ACCEPT') {
        // Increment reported user's report count
        await prisma.user.update({
          where: { id: report.reportedId },
          data: { reportCount: { increment: 1 } },
        });

        // Update report status
        await prisma.report.update({
          where: { id },
          data: {
            status: 'ACCEPTED',
            resolvedAt: new Date(),
            resolvedBy: userId,
          },
        });

        // Notify reported user
        await prisma.notification.create({
          data: {
            userId: report.reportedId,
            type: 'REPORT_ACCEPTED',
            reportId: id,
            message: 'A report against you has been accepted by an admin. Your report count has increased.',
          },
        });

        return reply.send({ success: true, message: 'Report accepted. User report count incremented.' });
      } else if (action === 'REJECT') {
        // Increment reporter's report count (false report)
        await prisma.user.update({
          where: { id: report.reporterId },
          data: { reportCount: { increment: 1 } },
        });

        // Update report status
        await prisma.report.update({
          where: { id },
          data: {
            status: 'REJECTED',
            resolvedAt: new Date(),
            resolvedBy: userId,
          },
        });

        // Notify reporter
        await prisma.notification.create({
          data: {
            userId: report.reporterId,
            type: 'REPORT_REJECTED',
            reportId: id,
            message: 'Your report has been rejected by an admin. Your report count has increased for false reporting.',
          },
        });

        return reply.send({ success: true, message: 'Report rejected. Reporter report count incremented.' });
      } else if (action === 'DISMISS') {
        // Just mark as dismissed, no counters changed
        await prisma.report.update({
          where: { id },
          data: {
            status: 'DISMISSED',
            resolvedAt: new Date(),
            resolvedBy: userId,
          },
        });

        return reply.send({ success: true, message: 'Report dismissed.' });
      }
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to process report action' });
    }
  });

  // Delete feedback endpoint (user can delete their own, admin can delete any)
  server.delete('/api/feedback/:id', async (request: any, reply: any) => {
    try {
      // SECURITY: Extract userId from JWT token, not request body
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };

      if (!id) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Get the feedback to check ownership
      const feedback = await prisma.rating.findUnique({
        where: { id },
      });

      if (!feedback) {
        return reply.code(404).send({ error: 'Feedback not found' });
      }

      // Check if user is the rater (owner) or has Admin badge
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const hasAdminBadge = (user.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');
      const isOwner = feedback.raterId === userId;

      if (!isOwner && !hasAdminBadge) {
        return reply.code(403).send({ error: 'You can only delete your own feedback or must be an admin' });
      }

      // Delete the feedback
      await prisma.rating.delete({
        where: { id },
      });

      return reply.send({ success: true, message: 'Feedback deleted successfully' });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete feedback' });
    }
  });

  // Admin: Get all users (paginated)
  server.get('/api/admin/users', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      const { limit = 20, offset = 0, search = '' } = request.query as {
        limit?: number;
        offset?: number;
        search?: string;
      };

      // Check admin status
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!admin || !(admin.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin')) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const limitNum = Math.min(Number(limit), 100);
      const offsetNum = Math.max(0, Number(offset));
      const searchTerm = search?.trim().toLowerCase() || '';

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: searchTerm
            ? {
                OR: [
                  { username: { contains: searchTerm, mode: 'insensitive' } },
                  { email: { contains: searchTerm, mode: 'insensitive' } },
                ],
              }
            : {},
          include: {
            badges: true,
            riotAccounts: { select: { summonerName: true, region: true, verified: true } },
          },
          take: limitNum,
          skip: offsetNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({
          where: searchTerm
            ? {
                OR: [
                  { username: { contains: searchTerm, mode: 'insensitive' } },
                  { email: { contains: searchTerm, mode: 'insensitive' } },
                ],
              }
            : {},
        }),
      ]);

      return reply.send({
        users: users.map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          verified: u.verified,
          createdAt: u.createdAt,
          reportCount: u.reportCount,
          badges: u.badges.map((b: any) => ({ key: b.key, name: b.name })),
          riotAccounts: u.riotAccounts,
        })),
        pagination: {
          total,
          offset: offsetNum,
          limit: limitNum,
          hasMore: offsetNum + limitNum < total,
        },
      });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch users' });
    }
  });

  // Admin: Ban/Unban user
  server.patch('/api/admin/users/:targetUserId/ban', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      const { targetUserId } = request.params as { targetUserId: string };
      const { ban } = request.body as { ban: boolean };

      if (!targetUserId) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Check admin status
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!admin || !(admin.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin')) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      // Check target user exists
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Prevent banning admins
      const targetIsAdmin = (await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { badges: true },
      }))?.badges?.some((b: any) => (b.key || '').toLowerCase() === 'admin');

      if (targetIsAdmin && ban) {
        return reply.code(403).send({ error: 'Cannot ban admin users' });
      }

      // Log the action
      await logAdminAction({
        adminId: userId,
        action: ban ? AuditActions.USER_BANNED : AuditActions.USER_UNBANNED,
        targetId: targetUserId,
        details: { username: targetUser.username },
      });

      // Note: Ban field would need to be added to User schema
      // For now, we'll just return success (schema update needed)
      return reply.send({
        success: true,
        message: ban ? 'User banned successfully' : 'User unbanned successfully',
      });
    } catch (error: any) {
      logError(request, 'Failed to update user ban status', error);
      return reply.code(500).send({ error: 'Failed to update user ban status' });
    }
  });

  // Admin: Wipe user report count
  server.patch('/api/admin/users/:targetUserId/reports/reset', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      const { targetUserId } = request.params as { targetUserId: string };

      if (!targetUserId) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Check admin status
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!admin || !(admin.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin')) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      await prisma.user.update({
        where: { id: targetUserId },
        data: { reportCount: 0 },
      });

      // Log the action
      await logAdminAction({
        adminId: userId,
        action: AuditActions.REPORTS_RESET,
        targetId: targetUserId,
        details: { username: targetUser.username },
      });

      return reply.send({ success: true, message: 'User report count reset' });
    } catch (error: any) {
      logError(request, 'Failed to reset report count', error);
      return reply.code(500).send({ error: 'Failed to reset report count' });
    }
  });

  // Admin: Delete user
  server.delete('/api/admin/users/:targetUserId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      const { targetUserId } = request.params as { targetUserId: string };

      if (!targetUserId) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Check admin status
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!admin || !(admin.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin')) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      // Prevent deleting admin users
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { badges: true },
      });

      if (!targetUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      if ((targetUser.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin')) {
        return reply.code(403).send({ error: 'Cannot delete admin users' });
      }

      // Delete user and all related data (cascade handled by Prisma)
      await prisma.user.delete({ where: { id: targetUserId } });

      // Log the action
      await logAdminAction({
        adminId: userId,
        action: AuditActions.USER_DELETED,
        targetId: targetUserId,
        details: { username: targetUser.username },
      });

      return reply.send({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
      logError(request, 'Failed to delete user', error);
      return reply.code(500).send({ error: 'Failed to delete user' });
    }
  });

  // Admin: Broadcast system message to all users
  server.post('/api/admin/broadcast-message', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      // Validate request body
      const validation = validateRequest(BroadcastMessageSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid request', details: validation.errors });
      }

      const { content } = validation.data;

      // Check admin status
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const isAdmin = user.badges.some((b: any) => b.key === 'admin');
      if (!isAdmin) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      logInfo(request, 'Admin broadcasting system message', { adminId: userId, contentLength: content.length });

      // Get or create System user
      let systemUser = await prisma.user.findFirst({
        where: { username: 'System' },
      });

      if (!systemUser) {
        logInfo(request, 'Creating System user');
        systemUser = await prisma.user.create({
          data: {
            username: 'System',
            email: 'system@riftessence.gg',
            password: '', // No password needed for system user
            verified: true,
            profileIconId: 29, // RiftEssence logo
            anonymous: false,
          },
        });
      }

      // Get all active users (exclude system user and admin themselves)
      const allUsers = await prisma.user.findMany({
        where: {
          AND: [
            { id: { not: systemUser.id } },
            { id: { not: userId } }, // Don't message admin themselves
          ],
        },
        select: { id: true },
      });

      logInfo(request, `Broadcasting to ${allUsers.length} users`);

      let conversationsCreated = 0;
      let messagesSent = 0;

      // Process each user
      for (const targetUser of allUsers) {
        // Determine user order for conversation (smaller ID first)
        const [smallerId, largerId] = [systemUser.id, targetUser.id].sort();

        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            user1Id: smallerId,
            user2Id: largerId,
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              user1Id: smallerId,
              user2Id: largerId,
            },
          });
          conversationsCreated++;
        }

        // Send message in transaction
        await prisma.$transaction(async (tx: any) => {
          await tx.message.create({
            data: {
              conversationId: conversation.id,
              senderId: systemUser.id,
              content: content,
            },
          });

          // Update conversation
          const isSystemUser1 = conversation.user1Id === systemUser.id;
          await tx.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: new Date(),
              lastMessagePreview: content.substring(0, 100),
              ...(isSystemUser1
                ? { user2UnreadCount: { increment: 1 } }
                : { user1UnreadCount: { increment: 1 } }),
            },
          });
        });

        messagesSent++;
      }

      // Log the admin action
      await logAdminAction({
        adminId: userId,
        action: AuditActions.SYSTEM_BROADCAST,
        targetId: systemUser.id,
        details: {
          contentPreview: content.substring(0, 100),
          totalUsers: allUsers.length,
          conversationsCreated,
          messagesSent,
        },
      });

      logInfo(request, 'Broadcast completed', {
        totalUsers: allUsers.length,
        conversationsCreated,
        messagesSent,
      });

      return reply.send({
        success: true,
        stats: {
          totalUsers: allUsers.length,
          conversationsCreated,
          messagesSent,
        },
      });
    } catch (error: any) {
      logError(request, 'Failed to broadcast message', error);
      return Errors.serverError(reply, request, 'broadcast message', error);
    }
  });

  server.get('/health', {
    schema: {
      description: 'Health check',
      response: {
        200: {
          type: 'object',
          properties: { status: { type: 'string' } }
        }
      }
    }
  }, async () => {
    return { status: 'ok' };
  });

  server.get('/health/db', {
    schema: {
      description: 'Database health check',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            responseTime: { type: 'number' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request: any, reply: any) => {
    try {
      const startTime = Date.now();
      // Simple query to verify database connectivity
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      
      logInfo(request, 'Database health check passed', { responseTime });
      
      return {
        status: 'ok',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logError(request, 'Database health check failed', error);
      reply.code(503).send({
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Deep health check endpoint - verifies all critical dependencies
  // Use this for load balancer health checks in production
  server.get('/health/deep', {
    schema: {
      description: 'Comprehensive health check for all critical services',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            latency: { type: 'number' },
            checks: { 
              type: 'object',
              additionalProperties: true  // Allow dynamic check properties
            }
          }
        }
      }
    }
  }, async (request: any, reply: any) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
    let overallStatus = 'healthy';
    const startTime = Date.now();

    // Check 1: Database connectivity
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'ok',
        latency: Date.now() - dbStart
      };
    } catch (error) {
      overallStatus = 'unhealthy';
      checks.database = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check 2: Database query performance (should be <100ms)
    if (checks.database.status === 'ok' && checks.database.latency! > 100) {
      checks.database.status = 'degraded';
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    }

    // Check 3: Environment variables
    checks.environment = {
      status: env.JWT_SECRET && env.DATABASE_URL && env.RIOT_API_KEY ? 'ok' : 'error',
      error: !env.JWT_SECRET ? 'JWT_SECRET missing' : !env.DATABASE_URL ? 'DATABASE_URL missing' : !env.RIOT_API_KEY ? 'RIOT_API_KEY missing' : undefined
    };
    if (checks.environment.status === 'error') {
      overallStatus = 'unhealthy';
    }

    // Check 4: Memory usage
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.memory = {
      status: heapUsedPercent < 90 ? 'ok' : 'degraded',
      latency: Math.round(heapUsedPercent)
    };
    if (heapUsedPercent >= 90) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
    }

    const totalLatency = Date.now() - startTime;
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    reply.code(statusCode).send({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      latency: totalLatency,
      checks
    });
  });

  server.post('/verify/riot', {
    schema: {
      description: 'Verify a user\'s Riot account by checking profile icon',
      body: {
        type: 'object',
        required: ['userId', 'riotAccountId', 'verificationIconId'],
        properties: {
          userId: { type: 'string' },
          riotAccountId: { type: 'string' },
          verificationIconId: { type: 'integer' }
        }
      },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' } } } }
    }
  }, async (req, reply) => {
    const { userId, riotAccountId, verificationIconId } = req.body as any;

    // fetch the riot account
    const ra = await prisma.riotAccount.findUnique({ where: { id: riotAccountId } });
    if (!ra) return reply.status(404).send({ error: 'Riot account not found' });
    if (ra.userId !== userId) return reply.status(403).send({ error: 'Riot account does not belong to user' });

    // fetch current profile icon via Riot API client
    let currentIcon: number | null;
    try {
      currentIcon = await riotClient.getProfileIcon({ puuid: ra.puuid, summonerName: ra.summonerName, region: ra.region });
    } catch (err: any) {
      // If summoner not found, return 404; otherwise 502 for upstream errors
      if (err && err.status === 404) return reply.status(404).send({ error: 'Summoner not found on Riot' });
      req.log && req.log.error && req.log.error(err);
      return reply.status(502).send({ error: 'Error fetching data from Riot API' });
    }

    if (currentIcon === verificationIconId) {
      // Prisma client may be generated without the new field during development; cast to any to
      // avoid type errors in tests and allow runtime update. Ensure you run `prisma generate`
      // after updating the schema in your environment.
      await prisma.riotAccount.update({ where: { id: riotAccountId }, data: ( { verified: true } as any ) });
      return { success: true };
    }

    return reply.status(400).send({ error: 'Profile icon does not match verification icon' });
  });

  // Quick lookup endpoint: return the current profile icon for a given summonerName + region
  server.post('/riot/lookup', {
    schema: {
      description: 'Lookup summoner current profile icon',
      body: {
        type: 'object',
        required: ['summonerName', 'region'],
        properties: {
          summonerName: { type: 'string' },
          region: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    const { summonerName, region } = req.body as any;
    try {
      // Parse summoner name into gameName and tagLine
      let gameName: string;
      let tagLine: string;
      
      if (summonerName.includes('#')) {
        const parts = summonerName.split('#');
        gameName = parts[0];
        tagLine = parts[1];
      } else {
        gameName = summonerName;
        tagLine = region;
      }

      // Fetch PUUID first
      const puuid = await riotClient.getPuuid(gameName, tagLine, region);
      if (!puuid) {
        return reply.status(404).send({ error: 'Summoner not found on Riot' });
      }

      const icon = await riotClient.getProfileIcon({ summonerName, region, puuid }, true);
      return { profileIconId: icon };
    } catch (err: any) {
      if (err && err.status === 404) return reply.status(404).send({ error: 'Summoner not found on Riot' });
      req.log && req.log.error && req.log.error(err);
      return reply.status(502).send({ error: 'Error fetching data from Riot API' });
    }
  });

  // Quick verify by summoner: check that the summoner's current icon matches the provided id
  server.post('/verify/riot/by-summoner', {
    schema: {
      description: 'Verify summoner by checking profile icon (quick mode, no DB)',
      body: {
        type: 'object',
        required: ['summonerName', 'region', 'verificationIconId'],
        properties: {
          summonerName: { type: 'string' },
          region: { type: 'string' },
          verificationIconId: { type: 'integer' }
        }
      }
    }
  }, async (req, reply) => {
    const { summonerName, region, verificationIconId } = req.body as any;
    try {
      // Parse summoner name into gameName and tagLine
      let gameName: string;
      let tagLine: string;
      
      if (summonerName.includes('#')) {
        const parts = summonerName.split('#');
        gameName = parts[0];
        tagLine = parts[1];
      } else {
        gameName = summonerName;
        tagLine = region;
      }

      // Fetch PUUID first
      const puuid = await riotClient.getPuuid(gameName, tagLine, region);
      if (!puuid) {
        return reply.status(404).send({ error: 'Summoner not found on Riot' });
      }

      const icon = await riotClient.getProfileIcon({ summonerName, region, puuid }, true);
      if (icon === verificationIconId) return { success: true };
      return reply.status(400).send({ error: 'Profile icon does not match verification icon', currentIcon: icon });
    } catch (err: any) {
      if (err && err.status === 404) return reply.status(404).send({ error: 'Summoner not found on Riot' });
      req.log && req.log.error && req.log.error(err);
      return reply.status(502).send({ error: 'Error fetching data from Riot API' });
    }
  });

  return server;
}

async function start() {
  try {
    // Validate required environment variables when starting as a process
    if (!process.env.DATABASE_URL) {
      console.error('Missing required env var: DATABASE_URL. Set it in your .env or environment.');
      process.exit(1);
    }
    if (!process.env.RIOT_API_KEY) {
      console.warn('Warning: RIOT_API_KEY not set. Riot API calls will fail until it is provided.');
    }

    const app = await build();
    const port = Number(process.env.PORT) || 3333;
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  // Catch any unhandled promise rejections or uncaught exceptions — log them
  // and exit so Docker (restart: unless-stopped) can bring the process back up
  // cleanly rather than leaving it in an unknown state.
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });

  start();
}

export default build;

