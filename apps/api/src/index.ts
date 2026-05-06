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
import riotRsoRoutes from './routes/riotRso';
import userRoutes from './routes/user';
import postsRoutes from './routes/posts';
import lftRoutes from './routes/lft';
import coachingRoutes from './routes/coaching';
import communitiesRoutes from './routes/communities';
import discordFeedRoutes from './routes/discordFeed';
import developerApiRoutes from './routes/developerApi';
import adsRoutes from './routes/ads';
import blocksRoutes from './routes/blocks';
import leaderboardsRoutes from './routes/leaderboards';
import chatRoutes from './routes/chat';
import matchupRoutes from './routes/matchups';
import analyticsRoutes from './routes/analytics';
import badgeRoutes from './routes/badges';
import rateRoutes from './routes/rate';
import teamsRoutes from './routes/teams';
import scrimRoutes from './routes/scrims';
import walletRoutes from './routes/wallet';
import bcrypt from 'bcryptjs';
import { env } from './env';
import { RegisterSchema, LoginSchema, SetPasswordSchema, validateRequest, TurnstileVerifySchema, RatingSchema, BroadcastMessageSchema } from './validation';
import { getUserIdFromRequest } from './middleware/auth';
import { logError, logInfo } from './middleware/logger';
import { Errors } from './middleware/errors';
import { logAdminAction, AuditActions } from './utils/auditLog';

const server = Fastify({ logger: true });

function normalizeClientIp(rawIp: string | null | undefined): string | null {
  if (!rawIp) return null;
  const trimmed = rawIp.trim();
  if (!trimmed) return null;
  if (trimmed === '::1') return '127.0.0.1';
  if (trimmed.startsWith('::ffff:')) return trimmed.slice('::ffff:'.length);
  return trimmed;
}

function extractClientIp(request: any): string | null {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const firstForwarded = typeof forwarded === 'string' ? forwarded.split(',')[0] : null;
  const candidate = firstForwarded || request.ip || request.socket?.remoteAddress || null;
  return normalizeClientIp(candidate);
}

function isBypassBanCheckRoute(pathname: string): boolean {
  if (!pathname) return false;
  return pathname === '/health'
    || pathname === '/health/db'
    || pathname === '/health/deep'
    || pathname.startsWith('/docs');
}

type TimedCacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type AuthBanSnapshot = {
  id: string;
  isBanned: boolean;
  bannedReason: string | null;
  lastKnownIp: string | null;
};

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

const BAN_CHECK_CACHE_TTL_MS = toPositiveInt(process.env.BAN_CHECK_CACHE_TTL_MS, 15000);
const BAN_CHECK_CACHE_MAX_ITEMS = Math.max(100, toPositiveInt(process.env.BAN_CHECK_CACHE_MAX_ITEMS, 2000));

const ipBlacklistDecisionCache = new Map<string, TimedCacheEntry<boolean>>();
const authBanSnapshotCache = new Map<string, TimedCacheEntry<AuthBanSnapshot | null>>();

function readTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.value;
}

function writeTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string, value: T) {
  if (cache.size >= BAN_CHECK_CACHE_MAX_ITEMS) {
    const firstKey = cache.keys().next().value;
    if (typeof firstKey === 'string') {
      cache.delete(firstKey);
    }
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + BAN_CHECK_CACHE_TTL_MS,
  });
}

// Verify JWT_SECRET is properly set before doing anything else
if (!env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
  console.error('The API cannot start without a valid JWT_SECRET.');
  console.error('\nTo generate a secure secret, run:');
  console.error('  node -e "console.log(\\"JWT_SECRET=\\" + require(\\"crypto\\").randomBytes(32).toString(\\"hex\\"))"');
  process.exit(1);
}

async function build() {
  const normalizeOrigin = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  };

  const parseOrigins = (rawValue: string | undefined): string[] => {
    return String(rawValue || '')
      .split(',')
      .map(normalizeOrigin)
      .filter(Boolean);
  };

  const isLocalOrigin = (origin: string): boolean => {
    try {
      const parsed = new URL(origin);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  };

  const configuredOrigins = parseOrigins(env.ALLOW_ORIGIN);
  const frontendOrigins = parseOrigins(env.FRONTEND_URL);

  const productionOrigins = new Set([
    'https://riftessence.app',
    'https://www.riftessence.app',
    ...configuredOrigins,
    ...frontendOrigins,
  ]);

  const developmentOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...configuredOrigins,
    ...frontendOrigins,
  ]);

  const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return true; // server-side calls and curl without origin

    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) return false;

    // Always allow canonical production origins, even if NODE_ENV is misconfigured.
    if (productionOrigins.has(normalizedOrigin)) {
      return true;
    }

    // Allow trusted subdomains under riftessence.app if needed (e.g. previews).
    try {
      const parsed = new URL(normalizedOrigin);
      if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.riftessence.app')) {
        return true;
      }
    } catch {
      // Continue with environment-specific checks below.
    }

    if (env.NODE_ENV !== 'production') {
      return developmentOrigins.has(normalizedOrigin) || isLocalOrigin(normalizedOrigin);
    }

    return false;
  };

  // Register CORS FIRST before any other middleware
  await server.register(cors, {
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) {
        return cb(null, true);
      }

      server.log.warn({ origin }, 'Origin blocked by CORS policy');
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
    maxAge: 86400,
  });

  // Register JWT for secure authentication
  await server.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  // Global enforcement for IP/account blacklists.
  server.addHook('onRequest', async (request: any, reply: any) => {
    const pathname = String(request.url || '').split('?')[0] || '';
    if (isBypassBanCheckRoute(pathname)) {
      return;
    }

    const clientIp = extractClientIp(request);
    if (clientIp) {
      let isBlockedIp = readTimedCache(ipBlacklistDecisionCache, clientIp);

      if (typeof isBlockedIp === 'undefined') {
        try {
          const blockedIp = await prisma.ipBlacklist.findFirst({
            where: { ipAddress: clientIp, active: true },
            select: { id: true },
          });

          isBlockedIp = !!blockedIp;
          writeTimedCache(ipBlacklistDecisionCache, clientIp, isBlockedIp);
        } catch (err) {
          server.log.warn({ err, clientIp }, 'IP blacklist check unavailable');
          return reply.code(503).send({
            error: 'Service temporarily unavailable.',
            code: 'BAN_CHECK_UNAVAILABLE',
          });
        }
      }

      if (isBlockedIp) {
        return reply.code(403).send({
          error: 'Access denied for this IP address.',
          code: 'IP_BLACKLISTED',
        });
      }
    }

    const authHeader = request.headers?.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return;
    }

    try {
      const payload = server.jwt.verify(token) as any;
      const authUserId = payload?.userId as string | undefined;
      if (!authUserId) {
        return;
      }

      let authUser = readTimedCache(authBanSnapshotCache, authUserId);

      if (typeof authUser === 'undefined') {
        try {
          authUser = await prisma.user.findUnique({
            where: { id: authUserId },
            select: {
              id: true,
              isBanned: true,
              bannedReason: true,
              lastKnownIp: true,
            },
          });

          writeTimedCache(authBanSnapshotCache, authUserId, authUser || null);
        } catch (err) {
          server.log.warn({ err, authUserId }, 'Account ban check unavailable');
          return reply.code(503).send({
            error: 'Service temporarily unavailable.',
            code: 'BAN_CHECK_UNAVAILABLE',
          });
        }
      }

      if (!authUser) {
        return reply.code(401).send({ error: 'User not found' });
      }

      if (authUser.isBanned) {
        return reply.code(403).send({
          error: 'Your account has been banned.',
          code: 'ACCOUNT_BANNED',
          reason: authUser.bannedReason || null,
        });
      }

      if (clientIp && authUser.lastKnownIp !== clientIp) {
        try {
          await prisma.user.update({
            where: { id: authUserId },
            data: { lastKnownIp: clientIp },
          });

          writeTimedCache(authBanSnapshotCache, authUserId, {
            ...authUser,
            lastKnownIp: clientIp,
          });
        } catch (err) {
          server.log.warn({ err, authUserId }, 'Failed to update lastKnownIp');
        }
      }

      request.userId = authUserId;
    } catch {
      // Invalid/expired token handling is done by route-level auth checks.
    }
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

  // Register Riot Sign-On (RSO) OAuth routes
  await server.register(riotRsoRoutes, { prefix: '/api/auth/riot' });

  // Register other route groups
  await server.register(userRoutes, { prefix: '/api/user' });
  await server.register(postsRoutes, { prefix: '/api' });
  await server.register(lftRoutes, { prefix: '/api' });
  await server.register(coachingRoutes, { prefix: '/api' });
  await server.register(communitiesRoutes, { prefix: '/api' });
  await server.register(discordFeedRoutes, { prefix: '/api' });
  await server.register(developerApiRoutes, { prefix: '/api' });
  await server.register(adsRoutes, { prefix: '/api' });
  await server.register(blocksRoutes, { prefix: '/api/user' });
  await server.register(leaderboardsRoutes, { prefix: '/api' });
  await server.register(chatRoutes, { prefix: '/api/chat' });
  await server.register(matchupRoutes, { prefix: '/api' });
  await server.register(analyticsRoutes, { prefix: '/api' });
  await server.register(badgeRoutes, { prefix: '/api/badges' });
  await server.register(rateRoutes, { prefix: '/api/rate' });
  await server.register(teamsRoutes, { prefix: '/api' });
  await server.register(scrimRoutes, { prefix: '/api' });
  await server.register(walletRoutes, { prefix: '/api' });

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
          discordDmNotifications: Boolean(u.discordDmNotifications),
          isBanned: Boolean(u.isBanned),
          bannedAt: u.bannedAt,
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
      const { ban, reason } = request.body as { ban: boolean; reason?: string };

      if (!targetUserId || typeof ban !== 'boolean') {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      if (targetUserId === userId) {
        return reply.code(400).send({ error: 'You cannot ban or unban your own account' });
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
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { badges: true },
      });
      if (!targetUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Prevent banning admins
      const targetIsAdmin = (targetUser.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');

      if (targetIsAdmin && ban) {
        return reply.code(403).send({ error: 'Cannot ban admin users' });
      }

      const normalizedReason = typeof reason === 'string' && reason.trim().length > 0
        ? reason.trim()
        : null;
      const now = new Date();

      if (ban) {
        const ipToBlacklist = targetUser.lastKnownIp ? String(targetUser.lastKnownIp).trim() : null;

        await prisma.$transaction(async (tx: any) => {
          await tx.user.update({
            where: { id: targetUserId },
            data: {
              isBanned: true,
              bannedAt: now,
              bannedReason: normalizedReason,
              bannedById: userId,
              bannedIp: ipToBlacklist,
            },
          });

          if (ipToBlacklist) {
            await tx.ipBlacklist.upsert({
              where: { ipAddress: ipToBlacklist },
              update: {
                active: true,
                reason: normalizedReason,
                sourceUserId: targetUserId,
                bannedById: userId,
                liftedAt: null,
              },
              create: {
                ipAddress: ipToBlacklist,
                active: true,
                reason: normalizedReason,
                sourceUserId: targetUserId,
                bannedById: userId,
              },
            });
          }
        });

        await logAdminAction({
          adminId: userId,
          action: AuditActions.USER_BANNED,
          targetId: targetUserId,
          details: {
            username: targetUser.username,
            ipBlacklisted: ipToBlacklist,
            reason: normalizedReason,
          },
        });

        return reply.send({
          success: true,
          message: 'User banned successfully',
          user: {
            id: targetUserId,
            isBanned: true,
            bannedAt: now,
            bannedIp: ipToBlacklist,
          },
        });
      }

      await prisma.$transaction(async (tx: any) => {
        if (targetUser.bannedIp) {
          const otherUsersStillBannedOnIp = await tx.user.count({
            where: {
              id: { not: targetUserId },
              isBanned: true,
              bannedIp: targetUser.bannedIp,
            },
          });

          if (otherUsersStillBannedOnIp === 0) {
            await tx.ipBlacklist.updateMany({
              where: {
                ipAddress: targetUser.bannedIp,
                active: true,
              },
              data: {
                active: false,
                liftedAt: now,
              },
            });
          }
        }

        await tx.user.update({
          where: { id: targetUserId },
          data: {
            isBanned: false,
            bannedAt: null,
            bannedReason: null,
            bannedById: null,
            bannedIp: null,
          },
        });
      });

      // Log the action
      await logAdminAction({
        adminId: userId,
        action: AuditActions.USER_UNBANNED,
        targetId: targetUserId,
        details: {
          username: targetUser.username,
          reason: normalizedReason,
        },
      });

      return reply.send({
        success: true,
        message: 'User unbanned successfully',
        user: {
          id: targetUserId,
          isBanned: false,
          bannedAt: null,
          bannedIp: null,
        },
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

      // Gracefully detach Riot accounts before deleting the user so they can be reclaimed later.
      await prisma.$transaction(async (tx: any) => {
        await tx.riotAccount.updateMany({
          where: { userId: targetUserId },
          data: {
            userId: null,
            isMain: false,
            verified: false,
            rsoLinked: false,
            rsoAccessToken: null,
            rsoRefreshToken: null,
            rsoTokenExpiresAt: null,
          },
        });

        await tx.user.delete({ where: { id: targetUserId } });
      });

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

  // Admin: Queue a Discord DM embed broadcast for linked users with DMs enabled
  server.post('/api/admin/broadcast-message', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      // Validate request body
      const validation = validateRequest(BroadcastMessageSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid request', details: validation.errors });
      }

      const { title, description } = validation.data;
      const rawColor = validation.data.color || '#5865F2';
      const color = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
      const url = validation.data.url?.trim() || null;
      const footer = validation.data.footer?.trim() || null;
      const imageUrl = validation.data.imageUrl?.trim() || null;

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

      logInfo(request, 'Admin queueing Discord DM embed broadcast', {
        adminId: userId,
        titleLength: title.length,
        descriptionLength: description.length,
      });

      const audienceWhere = {
        id: { not: userId },
        username: { not: 'System' },
      };

      const totalAudience = await prisma.user.count({
        where: audienceWhere,
      });

      const recipients = await prisma.user.findMany({
        where: {
          AND: [
            audienceWhere,
            { discordDmNotifications: true },
            { discordAccount: { isNot: null } },
          ],
        },
        select: {
          id: true,
          discordAccount: {
            select: { discordId: true },
          },
        },
      });

      const broadcastId = `admin-broadcast:${Date.now()}`;
      const queueRows = recipients
        .map((recipient: any) => recipient.discordAccount?.discordId)
        .filter((discordId: string | undefined): discordId is string => Boolean(discordId))
        .map((discordId: string) => ({
          recipientDiscordId: discordId,
          senderUsername: 'RiftEssence',
          messagePreview: description.substring(0, 200),
          conversationId: broadcastId,
          kind: 'ADMIN_EMBED',
          embedTitle: title,
          embedDescription: description,
          embedColor: color,
          embedUrl: url,
          embedFooter: footer,
          embedImageUrl: imageUrl,
        }));

      if (queueRows.length > 0) {
        await (prisma as any).discordDmQueue.createMany({
          data: queueRows,
        });
      }

      // Log the admin action
      await logAdminAction({
        adminId: userId,
        action: AuditActions.SYSTEM_BROADCAST,
        targetId: userId,
        details: {
          channel: 'DISCORD_DM',
          title,
          descriptionPreview: description.substring(0, 100),
          totalAudience,
          dmQueued: queueRows.length,
          skippedNoDiscordOrDisabled: Math.max(totalAudience - queueRows.length, 0),
        },
      });

      logInfo(request, 'Discord DM broadcast queued', {
        totalAudience,
        dmQueued: queueRows.length,
      });

      return reply.send({
        success: true,
        stats: {
          totalUsers: totalAudience,
          dmQueued: queueRows.length,
          skippedNoDiscordOrDisabled: Math.max(totalAudience - queueRows.length, 0),
        },
      });
    } catch (error: any) {
      logError(request, 'Failed to queue Discord DM broadcast', error);
      return Errors.serverError(reply, request, 'queue Discord DM broadcast', error);
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

