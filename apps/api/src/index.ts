import 'dotenv/config';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import prisma from './prisma';
import * as riotClient from './riotClient';
import userRoutes from './routes/user';
import postsRoutes from './routes/posts';
import lftRoutes from './routes/lft';
import communitiesRoutes from './routes/communities';
import discordFeedRoutes from './routes/discordFeed';
import bcrypt from 'bcryptjs';
import { RegisterSchema, LoginSchema, SetPasswordSchema, validateRequest, TurnstileVerifySchema } from './validation';

const server = Fastify({ logger: true });

async function build() {
  // Register CORS to allow the frontend (Next.js) to call this API from the browser.
  // By default it uses ALLOW_ORIGIN env var or allows all origins in development.
  await server.register(cors, {
    origin: process.env.ALLOW_ORIGIN || true,
    credentials: true, // Allow cookies to be sent with requests
  });

  // Register rate limiting: 10 requests per 15 minutes per IP
  await server.register(rateLimit, {
    max: 10,
    timeWindow: '15 minutes',
    cache: 10000,
    allowList: ['127.0.0.1'], // Allow localhost for dev
    skip: (request: any) => {
      // Skip rate limiting for health check and documentation
      return request.url === '/health' || request.url.startsWith('/docs');
    },
  });

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

  // Lightweight auth endpoints (register/login/set-password)
  // Implemented inline to avoid missing build artifacts in some environments
  server.post('/api/auth/register', async (request: any, reply: any) => {
    try {
      // Validate request body
      const validation = validateRequest(RegisterSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { username, email, password } = validation.data;

      // Verify CAPTCHA token (if provided)
      const turnstileToken = (request.body as any)?.turnstileToken;
      if (turnstileToken && process.env.TURNSTILE_SECRET_KEY) {
        const turnstileValidation = validateRequest(TurnstileVerifySchema, { token: turnstileToken });
        if (!turnstileValidation.success) {
          return reply.code(400).send({ error: 'Invalid CAPTCHA token' });
        }

        try {
          const verifyResp = await fetch('https://challenges.cloudflare.com/turnstile/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secret: process.env.TURNSTILE_SECRET_KEY,
              response: turnstileToken,
            }),
          });

          const result = await verifyResp.json();
          if (!result.success) {
            return reply.code(400).send({ error: 'CAPTCHA verification failed' });
          }
        } catch (err) {
          request.log?.error('CAPTCHA verification error:', err);
          return reply.code(500).send({ error: 'CAPTCHA verification failed' });
        }
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: username, mode: 'insensitive' } },
            { email: { equals: email, mode: 'insensitive' } },
          ],
        },
      });
      if (existingUser) {
        if (existingUser.username?.toLowerCase() === username.toLowerCase()) {
          return reply.code(400).send({ error: 'Username already taken' });
        }
        return reply.code(400).send({ error: 'Email already registered' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { username, email, password: hashedPassword } });
      return reply.send({ userId: user.id, username: user.username, email: user.email });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create account' });
    }
  });

  server.post('/api/auth/login', async (request: any, reply: any) => {
    try {
      // Validate request body
      const validation = validateRequest(LoginSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { usernameOrEmail, password } = validation.data;
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: usernameOrEmail, mode: 'insensitive' } },
            { email: { equals: usernameOrEmail, mode: 'insensitive' } },
          ],
        },
        include: { badges: true },
      });
      if (!user) return reply.code(401).send({ error: 'Invalid credentials' });
      if (!user.password) return reply.code(401).send({ error: 'This account uses Riot login only. Please set a password first.' });
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return reply.code(401).send({ error: 'Invalid credentials' });
      return reply.send({
        userId: user.id,
        username: user.username,
        email: user.email,
        bio: (user as any).bio,
        verified: (user as any).verified,
        badges: user.badges.map((b: any) => ({ key: b.key, name: b.name })),
      });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Login failed' });
    }
  });

  server.post('/api/auth/set-password', async (request: any, reply: any) => {
    try {
      // Validate request body
      const validation = validateRequest(SetPasswordSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { userId, password } = validation.data;
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
      return reply.send({ message: 'Password set successfully' });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to set password' });
    }
  });

  // Discord OAuth endpoints
  server.get('/api/auth/discord/login', async (request: any, reply: any) => {
    try {
      const { userId } = request.query as { userId?: string };
      if (!userId) {
        return reply.code(400).send({ error: 'userId query parameter is required' });
      }

      const clientId = process.env.DISCORD_CLIENT_ID;
      const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3333/api/auth/discord/callback';
      
      if (!clientId) {
        return reply.code(500).send({ error: 'Discord client ID not configured' });
      }

      // Generate state token including userId for verification on callback
      const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
      
      const authUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify&state=${encodeURIComponent(state)}`;
      
      return reply.send({ url: authUrl });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate Discord auth URL' });
    }
  });

  server.get('/api/auth/discord/callback', async (request: any, reply: any) => {
    try {
      const { code, state } = request.query as { code?: string; state?: string };
      
      if (!code || !state) {
        return reply.code(400).send({ error: 'Missing code or state parameter' });
      }

      // Decode and validate state
      let stateData: { userId: string; timestamp: number };
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch {
        return reply.code(400).send({ error: 'Invalid state parameter' });
      }

      // Verify state timestamp (prevent replay attacks - 10 min window)
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        return reply.code(400).send({ error: 'State token expired' });
      }

      const clientId = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3333/api/auth/discord/callback';

      if (!clientId || !clientSecret) {
        return reply.code(500).send({ error: 'Discord OAuth not configured' });
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        request.log && request.log.error && request.log.error('Discord token exchange failed:', await tokenResponse.text());
        return reply.code(502).send({ error: 'Failed to exchange Discord authorization code' });
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch Discord user info
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResponse.ok) {
        request.log && request.log.error && request.log.error('Discord user fetch failed:', await userResponse.text());
        return reply.code(502).send({ error: 'Failed to fetch Discord user info' });
      }

      const discordUser = await userResponse.json();

      // Check if this Discord account is already linked to another user
      const existingLink = await prisma.discordAccount.findUnique({
        where: { discordId: discordUser.id },
      });

      if (existingLink && existingLink.userId !== stateData.userId) {
        return reply.code(400).send({ error: 'This Discord account is already linked to another user' });
      }

      // Create or update Discord account link
      await prisma.discordAccount.upsert({
        where: { discordId: discordUser.id },
        update: {
          username: discordUser.username,
          discriminator: discordUser.discriminator || null,
        },
        create: {
          discordId: discordUser.id,
          username: discordUser.username,
          discriminator: discordUser.discriminator || null,
          userId: stateData.userId,
        },
      });

      // Redirect to frontend profile page with success
      return reply.redirect('http://localhost:3000/profile?discord=linked');
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Discord linking failed' });
    }
  });

  server.delete('/api/auth/discord/unlink', async (request: any, reply: any) => {
    try {
      const { userId } = request.query as { userId?: string };
      
      if (!userId) {
        return reply.code(400).send({ error: 'userId query parameter is required' });
      }

      const discordAccount = await prisma.discordAccount.findUnique({
        where: { userId },
      });

      if (!discordAccount) {
        return reply.code(404).send({ error: 'No Discord account linked' });
      }

      await prisma.discordAccount.delete({
        where: { userId },
      });

      return reply.send({ success: true, message: 'Discord account unlinked' });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to unlink Discord account' });
    }
  });

  // Register other route groups
  await server.register(userRoutes, { prefix: '/api/user' });
  await server.register(postsRoutes, { prefix: '/api' });
  await server.register(lftRoutes, { prefix: '/api' });
  await server.register(communitiesRoutes, { prefix: '/api' });
  await server.register(discordFeedRoutes, { prefix: '/api' });

  // Feedback endpoint
  server.post('/api/feedback', async (request: any, reply: any) => {
    try {
      const { receiverId, stars, moons, comment } = request.body as {
        receiverId: string;
        stars: number;
        moons: number;
        comment?: string;
      };

      // Get current user from localStorage (in production, use proper auth)
      const userId = request.headers['x-user-id'] || (request.body as any).raterId;
      
      if (!userId || !receiverId) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

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

      const hasDeveloperBadge = rater?.badges.some((b: any) => b.key === 'Developer');

      if (!hasDeveloperBadge) {
        // Check if user has linked Riot account
        const raterRiotAccount = await prisma.riotAccount.findFirst({
          where: { userId, verified: true },
        });

        if (!raterRiotAccount) {
          return reply.code(403).send({ error: 'You must have a verified Riot account to give feedback' });
        }

        // Check if feedback already exists (one per pair)
        const existingFeedback = await prisma.rating.findFirst({
          where: { raterId: userId, receiverId },
        });

        if (existingFeedback) {
          return reply.code(400).send({ error: 'You have already rated this user' });
        }

        // TODO: Check match history (requires match tracking implementation)
        // For now, skip this check in development
      }

      // Create feedback
      const rating = await prisma.rating.create({
        data: {
          raterId: userId,
          receiverId,
          stars,
          moons,
          comment: comment || '',
          sharedMatchesCount: 1, // TODO: Calculate from match history
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
      const { reportedUserId, reason } = request.body as {
        reportedUserId: string;
        reason: string;
      };

      const userId = request.headers['x-user-id'] || (request.body as any).reporterId;

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
      const hasDeveloperBadge = reporter.badges?.some((b: any) => b.key === 'Developer');
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
      const { userId } = request.query as { userId?: string };

      if (!userId) {
        return reply.code(400).send({ error: 'userId is required' });
      }

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
      const { id } = request.params as { id: string };
      const { action, userId } = request.body as { action: 'ACCEPT' | 'REJECT' | 'DISMISS'; userId: string };

      if (!userId || !action) {
        return reply.code(400).send({ error: 'userId and action are required' });
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

  // Delete feedback endpoint (admin only)
  server.delete('/api/feedback/:id', async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string };

      if (!userId || !id) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Check if user has Admin badge
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const hasAdminBadge = (user.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');
      if (!hasAdminBadge) {
        return reply.code(403).send({ error: 'You must be an admin to delete feedback' });
      }

      // Delete the feedback
      const deletedFeedback = await prisma.rating.delete({
        where: { id },
      });

      if (!deletedFeedback) {
        return reply.code(404).send({ error: 'Feedback not found' });
      }

      return reply.send({ success: true, message: 'Feedback deleted successfully' });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete feedback' });
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
      const icon = await riotClient.getProfileIcon({ summonerName, region, puuid: '' });
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
      const icon = await riotClient.getProfileIcon({ summonerName, region, puuid: '' });
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
  start();
}

export default build;

