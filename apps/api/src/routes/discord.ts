import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';

/**
 * Discord OAuth integration routes
 * Handles Discord account linking/unlinking
 */
export default async function discordRoutes(fastify: FastifyInstance) {
  // Initiate Discord OAuth flow
  fastify.get('/login', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

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
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to generate Discord auth URL' });
    }
  });

  // Discord OAuth callback
  fastify.get('/callback', async (request: any, reply: any) => {
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
        request.log?.error('Discord token exchange failed:', await tokenResponse.text());
        return reply.code(502).send({ error: 'Failed to exchange Discord authorization code' });
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch Discord user info
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResponse.ok) {
        request.log?.error('Discord user fetch failed:', await userResponse.text());
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
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/profile?discord=linked`);
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Discord linking failed' });
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

      return reply.send({ success: true, message: 'Discord account unlinked' });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to unlink Discord account' });
    }
  });
}
