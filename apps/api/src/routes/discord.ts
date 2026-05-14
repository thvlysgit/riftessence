import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { syncUserVerification } from '../utils/verification';
import { setAuthSessionCookie } from '../utils/sessionCookie';
import { createOAuthState, parseOAuthState } from '../utils/oauthState';

type DiscordOAuthState = {
  userId?: string;
  timestamp: number;
  mode?: 'link' | 'register';
  returnUrl?: string | null;
};

/**
 * Discord OAuth integration routes
 * Handles Discord account linking/unlinking
 */
export default async function discordRoutes(fastify: FastifyInstance) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const discordScope = process.env.DISCORD_OAUTH_SCOPE || 'identify email';

  const buildDiscordAuthUrl = (state: string) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3333/api/auth/discord/callback';

    if (!clientId) {
      return null;
    }

    return `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(discordScope)}&prompt=consent&state=${encodeURIComponent(state)}`;
  };

  const sanitizeUsername = (raw: string) => raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);

  const buildUniqueUsername = async (base: string) => {
    const fallbackBase = sanitizeUsername(base) || 'discord_user';
    let candidate = fallbackBase;

    for (let index = 0; index < 30; index += 1) {
      const existing = await prisma.user.findUnique({ where: { username: candidate } });
      if (!existing) {
        return candidate;
      }

      const suffix = `_${Math.random().toString(36).slice(2, 6)}`;
      candidate = `${fallbackBase.slice(0, Math.max(3, 20 - suffix.length))}${suffix}`;
    }

    return `discord_${Date.now().toString(36)}`;
  };

  const redirectDiscordError = (reply: any, code: string, message: string) => {
    fastify.log.error({ code, message }, 'Discord OAuth failed');
    return reply.redirect(`${frontendUrl}/authenticate?discord=error&error=${encodeURIComponent(code)}`);
  };

  // Initiate Discord OAuth flow
  fastify.get('/login', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const authUrl = buildDiscordAuthUrl(createOAuthState({
        userId,
        mode: 'link',
      }));

      if (!authUrl) {
        return reply.code(500).send({ error: 'Discord client ID not configured' });
      }
      
      return reply.send({ url: authUrl });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to generate Discord auth URL' });
    }
  });

  // Initiate Discord OAuth flow for login/registration
  fastify.get('/auth', async (request: any, reply: any) => {
    try {
      const { returnUrl } = request.query as { returnUrl?: string };

      const state = createOAuthState({
        mode: 'register',
        returnUrl: typeof returnUrl === 'string' ? returnUrl : null,
      });

      const authUrl = buildDiscordAuthUrl(state);
      if (!authUrl) {
        return reply.code(500).send({ error: 'Discord client ID not configured' });
      }

      return reply.send({ url: authUrl });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to generate Discord auth URL' });
    }
  });

  // Discord OAuth callback
  fastify.get('/callback', async (request: any, reply: any) => {
    try {
      const { code, state } = request.query as { code?: string; state?: string };
      
      if (!code || !state) {
        return redirectDiscordError(reply, 'missing_params', 'Missing code or state parameter');
      }

      const stateData = parseOAuthState<DiscordOAuthState>(state);
      if (!stateData) {
        return redirectDiscordError(reply, 'invalid_state', 'Invalid or expired state parameter');
      }

      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3333/api/auth/discord/callback';

      if (!process.env.DISCORD_CLIENT_ID || !clientSecret) {
        return redirectDiscordError(reply, 'discord_not_configured', 'Discord OAuth not configured');
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        request.log?.error('Discord token exchange failed:', await tokenResponse.text());
        return redirectDiscordError(reply, 'token_exchange_failed', 'Failed to exchange Discord authorization code');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch Discord user info
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResponse.ok) {
        request.log?.error('Discord user fetch failed:', await userResponse.text());
        return redirectDiscordError(reply, 'userinfo_failed', 'Failed to fetch Discord user info');
      }

      const discordUser = await userResponse.json();

      const mode = stateData.mode || (stateData.userId ? 'link' : 'register');

      if (mode === 'link') {
        if (!stateData.userId) {
          return redirectDiscordError(reply, 'missing_params', 'Invalid state for link mode');
        }

        // Check if this Discord account is already linked to another user
        const existingLink = await prisma.discordAccount.findUnique({
          where: { discordId: discordUser.id },
        });

        if (existingLink && existingLink.userId !== stateData.userId) {
          return redirectDiscordError(reply, 'account_already_linked', 'This Discord account is already linked to another user');
        }

        const isFirstLinkForUser = !existingLink;

        // Create or update Discord account link
        await prisma.discordAccount.upsert({
          where: { discordId: discordUser.id },
          update: {
            username: discordUser.username,
            discriminator: discordUser.discriminator || null,
            userId: stateData.userId,
          },
          create: {
            discordId: discordUser.id,
            username: discordUser.username,
            discriminator: discordUser.discriminator || null,
            userId: stateData.userId,
          },
        });

        if (isFirstLinkForUser) {
          await prisma.user.update({
            where: { id: stateData.userId },
            data: { discordDmNotifications: true },
          });
        }

        await syncUserVerification(stateData.userId);
        return reply.redirect(`${frontendUrl}/profile?discord=linked&promptDiscordDm=1`);
      }

      // Register/login mode
      const existingLink = await prisma.discordAccount.findUnique({
        where: { discordId: discordUser.id },
        include: { user: true },
      });

      let user = existingLink?.user;
      let isNew = false;

      if (!user) {
        isNew = true;
        const username = await buildUniqueUsername(discordUser.global_name || discordUser.username || `discord_${discordUser.id}`);
        user = await prisma.user.create({
          data: {
            username,
            email: discordUser.email || null,
            discordDmNotifications: true,
          },
        });

        await prisma.discordAccount.create({
          data: {
            discordId: discordUser.id,
            username: discordUser.username,
            discriminator: discordUser.discriminator || null,
            userId: user.id,
          },
        });
      } else {
        await prisma.discordAccount.update({
          where: { discordId: discordUser.id },
          data: {
            username: discordUser.username,
            discriminator: discordUser.discriminator || null,
            userId: user.id,
          },
        });
      }

      await syncUserVerification(user.id);

      const token = fastify.jwt.sign({ userId: user.id });
      setAuthSessionCookie(reply, token);
      const returnUrl = typeof stateData.returnUrl === 'string' && stateData.returnUrl.startsWith('/')
        ? stateData.returnUrl
        : '/feed';
      return reply.redirect(`${frontendUrl}/authenticate?discord=success&isNew=${isNew}&returnUrl=${encodeURIComponent(returnUrl)}&promptDiscordDm=1`);
    } catch (error: any) {
      request.log?.error(error);
      return redirectDiscordError(reply, 'callback_failed', 'Discord linking failed');
    }
  });

  // Unlink Discord account
  fastify.delete('/unlink', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const discordAccount = await prisma.discordAccount.findUnique({
        where: { userId },
      });

      if (!discordAccount) {
        return reply.code(404).send({ error: 'No Discord account linked' });
      }

      await prisma.discordAccount.delete({
        where: { userId },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { discordDmNotifications: false },
      });

      await syncUserVerification(userId);

      return reply.send({ success: true, message: 'Discord account unlinked' });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to unlink Discord account' });
    }
  });
}
