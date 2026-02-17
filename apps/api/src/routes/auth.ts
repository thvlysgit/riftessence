import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import { RegisterSchema, LoginSchema, SetPasswordSchema, validateRequest, TurnstileVerifySchema } from '../validation';
import { logError } from '../middleware/logger';
import { Errors } from '../middleware/errors';
import { sendDiscordWebhook, createNewUserEmbed } from '../utils/discord-webhook';

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
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
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

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return Errors.invalidCredentials(reply, request);

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

      // Generate new token
      const newToken = fastify.jwt.sign({ userId: user.id });
      
      return reply.send({ token: newToken });
    } catch (error: any) {
      request.log && request.log.error && request.log.error(error);
      return reply.code(500).send({ error: 'Failed to refresh token' });
    }
  });
}
