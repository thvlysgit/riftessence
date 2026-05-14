import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { sendDiscordWebhook, createNewUserEmbed } from '../utils/discord-webhook';
import * as riotClient from '../riotClient';
import { syncUserVerification } from '../utils/verification';
import { setAuthSessionCookie } from '../utils/sessionCookie';
import { createOAuthState, parseOAuthState } from '../utils/oauthState';

/**
 * Riot Sign-On (RSO) OAuth integration routes
 * Handles Riot account authentication via OAuth 2.0
 *
 * RSO Endpoints:
 * - Authorization: https://auth.riotgames.com/authorize
 * - Token: https://auth.riotgames.com/token
 * - User Info: https://auth.riotgames.com/userinfo
 */

const RSO_AUTH_URL = 'https://auth.riotgames.com/authorize';
const RSO_TOKEN_URL = 'https://auth.riotgames.com/token';
const RSO_USERINFO_URL = 'https://auth.riotgames.com/userinfo';
const RSO_LOGOUT_URL = 'https://auth.riotgames.com/logout';

// RSO scopes - openid and cpid are required for basic auth
// cpid gives us the PUUID
const RSO_SCOPES = 'openid cpid';

interface RsoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
}

interface RsoUserInfo {
  sub: string;  // PUUID
  cpid?: string; // Also PUUID
}

type RsoOAuthState = {
  userId?: string;
  timestamp: number;
  mode: 'link' | 'register';
};

export default async function riotRsoRoutes(fastify: FastifyInstance) {
  /**
   * GET /login
   * Initiates RSO OAuth flow for linking to existing user
   * Requires authenticated user (linking flow)
   */
  fastify.get('/login', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const clientId = process.env.RIOT_RSO_CLIENT_ID;
      const redirectUri = process.env.RIOT_RSO_REDIRECT_URI || 'http://localhost:3333/api/auth/riot/callback';

      if (!clientId) {
        return reply.code(500).send({ error: 'Riot RSO client ID not configured' });
      }

      const state = createOAuthState({
        userId,
        mode: 'link' // Linking to existing account
      });

      const authUrl = new URL(RSO_AUTH_URL);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', RSO_SCOPES);
      authUrl.searchParams.set('state', state);

      return reply.send({ url: authUrl.toString() });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to generate Riot RSO auth URL' });
    }
  });

  /**
   * GET /auth
   * Initiates RSO OAuth flow for new user registration/login
   * Does NOT require authenticated user (registration/login flow)
   */
  fastify.get('/auth', async (request: any, reply: any) => {
    try {
      const clientId = process.env.RIOT_RSO_CLIENT_ID;
      const redirectUri = process.env.RIOT_RSO_REDIRECT_URI || 'http://localhost:3333/api/auth/riot/callback';

      if (!clientId) {
        return reply.code(500).send({ error: 'Riot RSO client ID not configured' });
      }

      const state = createOAuthState({
        mode: 'register' // New registration/login
      });

      const authUrl = new URL(RSO_AUTH_URL);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', RSO_SCOPES);
      authUrl.searchParams.set('state', state);

      return reply.send({ url: authUrl.toString() });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to generate Riot RSO auth URL' });
    }
  });

  /**
   * GET /callback
   * RSO OAuth callback handler
   * Handles both linking and registration flows
   */
  fastify.get('/callback', async (request: any, reply: any) => {
    try {
      const { code, state, error: oauthError, error_description } = request.query as {
        code?: string;
        state?: string;
        error?: string;
        error_description?: string;
      };

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Handle OAuth errors
      if (oauthError) {
        request.log?.error(`RSO OAuth error: ${oauthError} - ${error_description}`);
        return reply.redirect(`${frontendUrl}/authenticate?error=${encodeURIComponent(error_description || oauthError)}`);
      }

      if (!code || !state) {
        return reply.redirect(`${frontendUrl}/authenticate?error=missing_params`);
      }

      const stateData = parseOAuthState<RsoOAuthState>(state);
      if (!stateData) {
        return reply.redirect(`${frontendUrl}/authenticate?error=invalid_state`);
      }

      const clientId = process.env.RIOT_RSO_CLIENT_ID;
      const clientSecret = process.env.RIOT_RSO_CLIENT_SECRET;
      const redirectUri = process.env.RIOT_RSO_REDIRECT_URI || 'http://localhost:3333/api/auth/riot/callback';

      if (!clientId || !clientSecret) {
        return reply.redirect(`${frontendUrl}/authenticate?error=rso_not_configured`);
      }

      // Exchange code for access token
      const tokenResponse = await fetch(RSO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        request.log?.error('RSO token exchange failed:', errorText);
        return reply.redirect(`${frontendUrl}/authenticate?error=token_exchange_failed`);
      }

      const tokenData: RsoTokenResponse = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch user info (PUUID)
      const userInfoResponse = await fetch(RSO_USERINFO_URL, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!userInfoResponse.ok) {
        request.log?.error('RSO userinfo fetch failed:', await userInfoResponse.text());
        return reply.redirect(`${frontendUrl}/authenticate?error=userinfo_failed`);
      }

      const userInfo: RsoUserInfo = await userInfoResponse.json();
      const puuid = userInfo.sub || userInfo.cpid;

      if (!puuid) {
        request.log?.error('No PUUID in RSO response:', userInfo);
        return reply.redirect(`${frontendUrl}/authenticate?error=no_puuid`);
      }

      // Fetch summoner name from Riot API using PUUID
      let summonerName: string | null = null;
      let tagLine: string | null = null;
      let region: string = 'EUW';

      try {
        // Try to get account info from Riot API
        const accountInfo = await riotClient.getAccountByPuuid(puuid);
        if (accountInfo) {
          summonerName = accountInfo.gameName;
          tagLine = accountInfo.tagLine;
          region = accountInfo.region || 'EUW';
        }
      } catch (err) {
        request.log?.warn('Could not fetch account info from Riot API:', err);
        // Continue anyway - we have the PUUID which is the important part
      }

      // Handle based on mode
      if (stateData.mode === 'link' && stateData.userId) {
        // LINKING MODE: Link to existing user
        return await handleLinkMode(fastify, request, reply, {
          userId: stateData.userId,
          puuid,
          summonerName,
          tagLine,
          region,
          accessToken,
          refreshToken: tokenData.refresh_token,
          frontendUrl,
        });
      } else {
        // REGISTRATION MODE: Create new user or login existing
        return await handleRegisterMode(fastify, request, reply, {
          puuid,
          summonerName,
          tagLine,
          region,
          accessToken,
          refreshToken: tokenData.refresh_token,
          frontendUrl,
        });
      }
    } catch (error: any) {
      request.log?.error('RSO callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/authenticate?error=callback_failed`);
    }
  });

  /**
   * DELETE /unlink
   * Unlink Riot account from user
   * Requires authenticated user
   */
  fastify.delete('/unlink', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { accountId } = request.query as { accountId?: string };

      if (accountId) {
        // Unlink specific account
        const account = await prisma.riotAccount.findFirst({
          where: { id: accountId, userId },
        });

        if (!account) {
          return reply.code(404).send({ error: 'Riot account not found or not owned by user' });
        }

        await prisma.riotAccount.delete({ where: { id: accountId } });
        await syncUserVerification(userId);
      } else {
        // Unlink all RSO-linked accounts for this user
        await prisma.riotAccount.deleteMany({
          where: { userId, rsoLinked: true },
        });
        await syncUserVerification(userId);
      }

      return reply.send({ success: true, message: 'Riot account unlinked' });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to unlink Riot account' });
    }
  });

  /**
   * GET /logout
   * Initiate RSO logout (optional - revokes RSO session)
   */
  fastify.get('/logout', async (request: any, reply: any) => {
    try {
      const clientId = process.env.RIOT_RSO_CLIENT_ID;
      const postLogoutUri = process.env.RIOT_RSO_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000';

      if (!clientId) {
        // If RSO not configured, just redirect to frontend
        return reply.redirect(postLogoutUri);
      }

      const logoutUrl = new URL(RSO_LOGOUT_URL);
      logoutUrl.searchParams.set('client_id', clientId);
      logoutUrl.searchParams.set('redirect_uri', postLogoutUri);

      return reply.redirect(logoutUrl.toString());
    } catch (error: any) {
      request.log?.error(error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(frontendUrl);
    }
  });

  /**
   * GET /status
   * Check RSO configuration status
   */
  fastify.get('/status', async (request: any, reply: any) => {
    const clientId = process.env.RIOT_RSO_CLIENT_ID;
    const clientSecret = process.env.RIOT_RSO_CLIENT_SECRET;

    return reply.send({
      configured: !!(clientId && clientSecret),
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    });
  });
}

/**
 * Handle linking mode - link Riot account to existing user
 */
async function handleLinkMode(
  fastify: FastifyInstance,
  request: any,
  reply: any,
  data: {
    userId: string;
    puuid: string;
    summonerName: string | null;
    tagLine: string | null;
    region: string;
    accessToken: string;
    refreshToken?: string;
    frontendUrl: string;
  }
) {
  const { userId, puuid, summonerName, tagLine, region, accessToken, refreshToken, frontendUrl } = data;

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return reply.redirect(`${frontendUrl}/authenticate?error=user_not_found`);
  }

  // Check if this PUUID is already linked to another user
  const existingAccount = await prisma.riotAccount.findFirst({
    where: { puuid },
  });

  if (existingAccount && existingAccount.userId !== userId) {
    return reply.redirect(`${frontendUrl}/authenticate?error=account_already_linked`);
  }

  // Check if user already has accounts to determine if this should be main
  const existingAccountsCount = await prisma.riotAccount.count({
    where: { userId },
  });
  const shouldBeMain = existingAccountsCount === 0;

  // Create or update the Riot account link
  const displayName = summonerName && tagLine ? `${summonerName}#${tagLine}` : puuid.slice(0, 8);

  await prisma.riotAccount.upsert({
    where: { puuid },
    update: {
      summonerName: displayName,
      region: region as any,
      verified: true,
      rsoLinked: true,
      rsoAccessToken: accessToken,
      rsoRefreshToken: refreshToken || null,
      userId,
    },
    create: {
      puuid,
      summonerName: displayName,
      region: region as any,
      verified: true,
      rsoLinked: true,
      rsoAccessToken: accessToken,
      rsoRefreshToken: refreshToken || null,
      isMain: shouldBeMain,
      userId,
    },
  });

  await syncUserVerification(userId);

  return reply.redirect(`${frontendUrl}/profile?riot=linked`);
}

/**
 * Handle registration mode - create new user or login existing
 */
async function handleRegisterMode(
  fastify: FastifyInstance,
  request: any,
  reply: any,
  data: {
    puuid: string;
    summonerName: string | null;
    tagLine: string | null;
    region: string;
    accessToken: string;
    refreshToken?: string;
    frontendUrl: string;
  }
) {
  const { puuid, summonerName, tagLine, region, accessToken, refreshToken, frontendUrl } = data;

  // Check if this PUUID is already linked to a user
  const existingAccount = await prisma.riotAccount.findFirst({
    where: { puuid },
    include: { user: true },
  });

  let user;
  let isNewUser = false;

  if (existingAccount && existingAccount.user) {
    // Existing user - login
    user = existingAccount.user;

    // Update the RSO tokens
    await prisma.riotAccount.update({
      where: { id: existingAccount.id },
      data: {
        rsoLinked: true,
        rsoAccessToken: accessToken,
        rsoRefreshToken: refreshToken || null,
        verified: true,
      },
    });
  } else {
    // New user - create account
    isNewUser = true;
    const displayName = summonerName && tagLine ? `${summonerName}#${tagLine}` : `Summoner_${puuid.slice(0, 8)}`;
    const username = summonerName || `user_${puuid.slice(0, 8)}`;

    user = await prisma.user.create({
      data: {
        username,
        region: region as any,
        riotAccounts: {
          create: {
            puuid,
            summonerName: displayName,
            region: region as any,
            verified: true,
            rsoLinked: true,
            rsoAccessToken: accessToken,
            rsoRefreshToken: refreshToken || null,
            isMain: true,
          },
        },
      },
    });

    // Send Discord notification for new user (async)
    sendDiscordWebhook(
      '🎮 New user registered via Riot RSO!',
      [createNewUserEmbed({
        username: user.username,
        region: user.region || undefined,
        timestamp: new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }),
      })]
    ).catch(err => console.error('[Discord] Failed to send RSO registration webhook:', err));
  }

  await syncUserVerification(user.id);

  // Generate JWT token
  const token = fastify.jwt.sign({ userId: user.id });
  setAuthSessionCookie(reply, token);

  return reply.redirect(`${frontendUrl}/authenticate?rso=success&isNew=${isNewUser}`);
}
