import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import {
  RegisterSchema,
  LoginSchema,
  SetPasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  validateRequest,
  TurnstileVerifySchema,
} from '../validation';
import { getUserIdFromRequest } from '../middleware/auth';
import { logError } from '../middleware/logger';
import { Errors } from '../middleware/errors';
import { sendDiscordWebhook, createNewUserEmbed } from '../utils/discord-webhook';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

function extractBearerToken(authHeader: unknown): string | null {
  if (typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

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

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getFrontendBaseUrl(): string {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }

  const firstAllowedOrigin = String(process.env.ALLOW_ORIGIN || '')
    .split(',')
    .map((entry) => entry.trim())
    .find(Boolean);

  if (firstAllowedOrigin) {
    return firstAllowedOrigin.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}

function getPasswordHashFingerprint(password: string | null | undefined): string {
  return crypto
    .createHash('sha256')
    .update(password || 'NO_PASSWORD_SET')
    .digest('hex');
}

function passwordResetEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM_EMAIL
  );
}

let passwordResetTransporter: nodemailer.Transporter | null = null;

function getPasswordResetTransporter(): nodemailer.Transporter | null {
  if (!passwordResetEmailConfigured()) {
    return null;
  }

  if (passwordResetTransporter) {
    return passwordResetTransporter;
  }

  const smtpPort = toPositiveInt(process.env.SMTP_PORT, 587);
  const secureSetting = String(process.env.SMTP_SECURE || '').toLowerCase();
  const secure = secureSetting === '1' || secureSetting === 'true';

  passwordResetTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return passwordResetTransporter;
}

async function sendPasswordResetEmail(
  recipientEmail: string,
  resetUrl: string,
  expiresInMinutes: number
): Promise<boolean> {
  const transporter = getPasswordResetTransporter();
  if (!transporter || !process.env.SMTP_FROM_EMAIL) {
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'RiftEssence';
  const from = `${fromName} <${process.env.SMTP_FROM_EMAIL}>`;

  await transporter.sendMail({
    from,
    to: recipientEmail,
    subject: 'Reset your RiftEssence password',
    text:
      `We received a request to reset your RiftEssence password.\n\n` +
      `Use this link within ${expiresInMinutes} minutes:\n${resetUrl}\n\n` +
      `You can also recover access by signing in with Riot.\n\n` +
      `If you did not request this, you can ignore this email.`,
    html:
      `<p>We received a request to reset your RiftEssence password.</p>` +
      `<p><a href=\"${resetUrl}\">Reset password</a></p>` +
      `<p>This link expires in <strong>${expiresInMinutes} minutes</strong>.</p>` +
      `<p>You can also recover access by signing in with Riot.</p>` +
      `<p>If you did not request this, you can ignore this email.</p>`,
  });

  return true;
}

export default async function authRoutes(fastify: FastifyInstance) {
  // Register new user with username/email/password
  fastify.post('/register', {
    config: {
      rateLimit: {
        max: 8,
        timeWindow: '15 minutes',
      },
    },
  }, async (request: any, reply: any) => {
    try {
      // Validate request body
      const validation = validateRequest(RegisterSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { username, email, password } = validation.data;

      // Verify CAPTCHA token when Turnstile is configured.
      const turnstileToken = (request.body as any)?.turnstileToken;
      if (process.env.TURNSTILE_SECRET_KEY) {
        if (!turnstileToken) {
          return reply.code(400).send({ error: 'CAPTCHA verification required' });
        }

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
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
      },
    },
  }, async (request: any, reply: any) => {
    try {
      // Validate request body
      const validation = validateRequest(LoginSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { usernameOrEmail, password } = validation.data;

      // Find user by username or email
      const user = await prisma.user.findFirst({
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

      if (!user) return Errors.invalidCredentials(reply, request);
      // SECURITY FIX: Use generic error to prevent user enumeration
      if (!user.password) return Errors.invalidCredentials(reply, request);

      if (user.isBanned) {
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
      if (clientIp && user.lastKnownIp !== clientIp) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastKnownIp: clientIp },
        });
      }

      // Generate JWT token
      const token = fastify.jwt.sign({ userId: user.id });

      return reply.send({
        userId: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        verified: user.verified,
        badges: user.badges.map((b: any) => ({ key: b.key, name: b.name })),
        riotAccountsCount: user.riotAccounts.length,
        onboardingCompleted: user.onboardingCompleted || false,
        token,
      });
    } catch (error: any) {
      Errors.serverError(reply, request, 'login', error);
    }
  });

  // Set password for existing user (e.g., if they only had Riot login before)
  fastify.post('/set-password', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
  }, async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      // Validate request body
      const validation = validateRequest(SetPasswordSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { password } = validation.data;
      
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

  // Request password reset email
  fastify.post('/forgot-password', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
  }, async (request: any, reply: any) => {
    try {
      if (!passwordResetEmailConfigured()) {
        return reply.code(503).send({
          error:
            'Password recovery email is not configured yet. Use Riot sign-in to recover access, then set a password from your profile settings.',
        });
      }

      const validation = validateRequest(ForgotPasswordSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { email } = validation.data;
      const genericResponse = {
        message: 'If an account exists for this email, a recovery link has been sent.',
      };

      const user = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
        },
        select: {
          id: true,
          password: true,
          email: true,
        },
      });

      if (!user?.email) {
        return reply.send(genericResponse);
      }

      const expiresInMinutes = toPositiveInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 30);
      const resetToken = fastify.jwt.sign(
        {
          userId: user.id,
          purpose: 'password_reset',
          passwordHashFingerprint: getPasswordHashFingerprint(user.password),
        },
        { expiresIn: `${expiresInMinutes}m` }
      );

      const baseUrl = getFrontendBaseUrl();
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

      try {
        await sendPasswordResetEmail(user.email, resetUrl, expiresInMinutes);
      } catch (mailError) {
        fastify.log.error({ err: mailError, userId: user.id }, 'Failed to send password reset email');
      }

      return reply.send(genericResponse);
    } catch (error: any) {
      Errors.serverError(reply, request, 'forgot-password', error);
    }
  });

  // Reset password with a valid reset token
  fastify.post('/reset-password', {
    config: {
      rateLimit: {
        max: 8,
        timeWindow: '15 minutes',
      },
    },
  }, async (request: any, reply: any) => {
    try {
      const validation = validateRequest(ResetPasswordSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { token, password } = validation.data;

      let payload: any;
      try {
        payload = request.server.jwt.verify(token);
      } catch {
        return reply.code(400).send({ error: 'Invalid or expired reset link' });
      }

      if (!payload || payload.purpose !== 'password_reset' || typeof payload.userId !== 'string') {
        return reply.code(400).send({ error: 'Invalid or expired reset link' });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, password: true },
      });

      if (!user) {
        return reply.code(400).send({ error: 'Invalid or expired reset link' });
      }

      const currentFingerprint = getPasswordHashFingerprint(user.password);
      if (currentFingerprint !== payload.passwordHashFingerprint) {
        return reply.code(400).send({ error: 'Invalid or expired reset link' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return reply.send({ message: 'Password reset successfully' });
    } catch (error: any) {
      Errors.serverError(reply, request, 'reset-password', error);
    }
  });

  // Token refresh endpoint
  fastify.post('/refresh', async (request: any, reply: any) => {
    try {
      const token = extractBearerToken(request.headers['authorization']);
      if (!token) {
        return reply.code(401).send({ error: 'No token provided' });
      }
      
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
