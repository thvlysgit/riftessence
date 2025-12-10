import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register new user with username/email/password
  fastify.post('/register', async (request: any, reply: any) => {
    try {
      const { username, email, password } = request.body as {
        username: string;
        email: string;
        password: string;
      };

      // Validation
      if (!username || !email || !password) {
        return reply.code(400).send({ error: 'Username, email, and password are required' });
      }

      if (username.length < 3 || username.length > 20) {
        return reply.code(400).send({ error: 'Username must be between 3 and 20 characters' });
      }

      if (password.length < 6) {
        return reply.code(400).send({ error: 'Password must be at least 6 characters' });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.code(400).send({ error: 'Invalid email format' });
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
        if (existingUser.username.toLowerCase() === username.toLowerCase()) {
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

      return reply.send({
        userId: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create account' });
    }
  });

  // Login with username/email and password
  fastify.post('/login', async (request: any, reply: any) => {
    try {
      const { usernameOrEmail, password } = request.body as {
        usernameOrEmail: string;
        password: string;
      };

      if (!usernameOrEmail || !password) {
        return reply.code(400).send({ error: 'Username/email and password are required' });
      }

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
        },
      });

      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Check if user has a password set
      if (!user.password) {
        return reply.code(401).send({ error: 'This account uses Riot login only. Please link a Riot account or contact support.' });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      return reply.send({
        userId: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        verified: user.verified,
        badges: user.badges.map((b: any) => ({ key: b.key, name: b.name })),
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Login failed' });
    }
  });

  // Set password for existing user (e.g., if they only had Riot login before)
  fastify.post('/set-password', async (request: any, reply: any) => {
    try {
      const { userId, password } = request.body as {
        userId: string;
        password: string;
      };

      if (!userId || !password) {
        return reply.code(400).send({ error: 'User ID and password are required' });
      }

      if (password.length < 6) {
        return reply.code(400).send({ error: 'Password must be at least 6 characters' });
      }

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
}
