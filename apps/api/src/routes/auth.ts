import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import { RegisterSchema, LoginSchema, SetPasswordSchema, validateRequest, TurnstileVerifySchema } from '../validation';
import { logError } from '../middleware/logger';
import { Errors } from '../middleware/errors';
import { sendDiscordWebhook, createNewUserEmbed } from '../utils/discord-webhook';

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

function isPrismaSchemaMismatchError(error: any): boolean {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code === 'P2021' || code === 'P2022') {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist')
    || message.includes('relation') && message.includes('does not exist');
}

export default async function authRoutes(fastify: FastifyInstance) {
  // Register new user with username/email/password
  fastify.post('/register', async (request: any, reply: any) => {
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
          logError(request, 'CAPTCHA verification error', err);
          return reply.code(500).send({ error: 'CAPTCHA verification failed' });
        }
      }

      // Check if username or email already exists
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

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const clientIp = extractClientIp(request);
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          lastKnownIp: clientIp,
        },
      });

      // Send Discord notification (async, don't wait)
      sendDiscordWebhook(
        '🎉 New user registered!',
        [createNewUserEmbed({
          username: user.username,
          region: user.region || undefined,
          timestamp: new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }),
        })]
      ).catch(err => console.error('[Discord] Failed to send registration webhook:', err));

      // Generate JWT token
      const token = fastify.jwt.sign({ userId: user.id });

      return reply.send({
        userId: user.id,
        username: user.username,
        email: user.email,
        token,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create account' });
    }
  });

  // Login with username/email and password
  fastify.post('/login', async (request: any, reply: any) => {
    try {
      // Validate request body
      const validation = validateRequest(LoginSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { usernameOrEmail, password } = validation.data;

      // Find user by username or email.
      // Fallback avoids hard outages if production schema lags behind code.
      let user: any = null;
      let usedLegacySchemaFallback = false;

      try {
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: usernameOrEmail, mode: 'insensitive' } },
              { email: { equals: usernameOrEmail, mode: 'insensitive' } },
            ],
          },
          include: {
            badges: true,
            riotAccounts: true,
          },
        });
      } catch (queryError: any) {
        if (!isPrismaSchemaMismatchError(queryError)) {
          throw queryError;
        }

        usedLegacySchemaFallback = true;
        request.log?.error?.({
          reqId: request.id,
          code: queryError?.code,
          message: queryError?.message,
        }, 'Login fallback activated due to schema mismatch. Run prisma migrate deploy.');

        user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: usernameOrEmail, mode: 'insensitive' } },
              { email: { equals: usernameOrEmail, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            username: true,
            email: true,
            password: true,
            bio: true,
            verified: true,
          },
        });
      }

      if (!user) return Errors.invalidCredentials(reply, request);
      // SECURITY FIX: Use generic error to prevent user enumeration
      if (!user.password) return Errors.invalidCredentials(reply, request);

      if (!usedLegacySchemaFallback && user.isBanned) {
        return reply.code(403).send({
          error: 'Your account has been banned.',
          code: 'ACCOUNT_BANNED',
          reason: user.bannedReason || null,
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return Errors.invalidCredentials(reply, request);

      const clientIp = extractClientIp(request);
      if (!usedLegacySchemaFallback && clientIp && user.lastKnownIp !== clientIp) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastKnownIp: clientIp },
        });
      }

      let badges: Array<{ key: string; name: string }> = [];
      let riotAccountsCount = 0;
      let onboardingCompleted = false;

      if (!usedLegacySchemaFallback) {
        badges = user.badges.map((b: any) => ({ key: b.key, name: b.name }));
        riotAccountsCount = user.riotAccounts.length;
        onboardingCompleted = user.onboardingCompleted || false;
      } else {
        try {
          const [badgeRows, riotCount] = await Promise.all([
            prisma.badge.findMany({
              where: { userId: user.id },
              select: { key: true, name: true },
            }),
            prisma.riotAccount.count({ where: { userId: user.id } }),
          ]);

          badges = badgeRows;
          riotAccountsCount = riotCount;
          onboardingCompleted = riotCount > 0;
        } catch (fallbackMetaError: any) {
          request.log?.warn?.({
            reqId: request.id,
            message: fallbackMetaError?.message,
          }, 'Login fallback: failed to load badges/riot account count');
        }
      }

      // Generate JWT token
      const token = fastify.jwt.sign({ userId: user.id });

      return reply.send({
        userId: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        verified: user.verified,
        badges,
        riotAccountsCount,
        onboardingCompleted,
        token,
      });
    } catch (error: any) {
      Errors.serverError(reply, request, 'login', error);
    }
  });

  // Set password for existing user (e.g., if they only had Riot login before)
  fastify.post('/set-password', async (request: any, reply: any) => {
    try {
      // Validate request body
      const validation = validateRequest(SetPasswordSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { userId, password } = validation.data;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return reply.send({ message: 'Password set successfully' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to set password' });
    }
  });

  // Token refresh endpoint
  fastify.post('/refresh', async (request: any, reply: any) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      
      // Verify and decode the token
      let decoded: any;
      try {
        decoded = request.server.jwt.verify(token);
      } catch (err) {
        return reply.code(401).send({ error: 'Invalid or expired token' });
      }

      // Check if user still exists
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      if (user.isBanned) {
        return reply.code(403).send({
          error: 'Your account has been banned.',
          code: 'ACCOUNT_BANNED',
          reason: user.bannedReason || null,
        });
      }

      // Generate new token
      const newToken = fastify.jwt.sign({ userId: user.id });
      
      return reply.send({ token: newToken });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to refresh token' });
    }
  });
}
