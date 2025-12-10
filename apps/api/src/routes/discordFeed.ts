import prisma from '../prisma';

// Role aliases for content parsing
const ROLE_ALIASES: { [key: string]: string } = {
  'top': 'TOP',
  'toplane': 'TOP',
  'toplaner': 'TOP',
  'jungle': 'JUNGLE',
  'jg': 'JUNGLE',
  'jungler': 'JUNGLE',
  'mid': 'MID',
  'midlane': 'MID',
  'midlaner': 'MID',
  'middle': 'MID',
  'adc': 'ADC',
  'ad': 'ADC',
  'carry': 'ADC',
  'support': 'SUPPORT',
  'sup': 'SUPPORT',
  'supp': 'SUPPORT',
};

// VC preference aliases
const VC_ALWAYS: string[] = [
  'always vc',
  'use vc',
  'vc on',
  'vocal',
  'avec voc',
  'with vc',
  'need vc',
  'require vc',
];

const VC_NEVER: string[] = [
  'no voc',
  'no vc',
  "i don't vc",
  "i dont vc",
  "don't vc",
  "dont vc",
  'no calls',
  'mute',
  'pas de vocal',
  'without vc',
  'no vocal',
];

function extractRoleFromContent(content: string): string | null {
  const lowerContent = content.toLowerCase();
  
  for (const [alias, role] of Object.entries(ROLE_ALIASES)) {
    // Match whole words only (word boundaries)
    const regex = new RegExp(`\\b${alias}\\b`);
    if (regex.test(lowerContent)) {
      return role;
    }
  }
  
  return null;
}

// Extract VC preference from message content
function extractVCPreferenceFromContent(content: string): string | null {
  const lowerContent = content.toLowerCase();
  
  // Check for NEVER patterns first (stronger indicator)
  for (const pattern of VC_NEVER) {
    if (lowerContent.includes(pattern)) {
      return 'NEVER';
    }
  }
  
  // Check for ALWAYS patterns
  for (const pattern of VC_ALWAYS) {
    if (lowerContent.includes(pattern)) {
      return 'ALWAYS';
    }
  }
  
  return null;
}

// Middleware to validate bot API key
function validateBotAuth(request: any, reply: any, done: () => void) {
  const authHeader = request.headers.authorization;
  const expectedKey = process.env.DISCORD_BOT_API_KEY;

  if (!expectedKey) {
    reply.status(500).send({ error: 'Bot API key not configured on server' });
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing or invalid authorization header' });
    return;
  }

  const providedKey = authHeader.substring(7); // Remove 'Bearer '
  if (providedKey !== expectedKey) {
    reply.status(403).send({ error: 'Invalid bot API key' });
    return;
  }

  done();
}

export default async function discordFeedRoutes(fastify: any) {
  // GET /api/discord/feed/channels - List feed channels for a community
  fastify.get('/discord/feed/channels', async (request: any, reply: any) => {
    try {
      const { communityId, guildId } = request.query as any;

      const where: any = {};
      if (communityId) where.communityId = communityId;
      if (guildId) where.guildId = guildId;

      const channels = await prisma.discordFeedChannel.findMany({
        where,
        include: {
          community: {
            select: {
              id: true,
              name: true,
              language: true,
            },
          },
        },
      });

      return reply.send({ channels });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch feed channels' });
    }
  });

  // POST /api/discord/feed/channels - Register a feed channel (bot only)
  fastify.post('/discord/feed/channels', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { communityId, guildId, channelId } = request.body as any;

      if (!communityId || !guildId || !channelId) {
        return reply.status(400).send({ error: 'Missing required fields: communityId, guildId, channelId' });
      }

      // Verify community exists and matches guildId
      const community = await prisma.community.findUnique({
        where: { id: communityId },
      });

      if (!community) {
        return reply.status(404).send({ error: 'Community not found' });
      }

      if (community.discordServerId && community.discordServerId !== guildId) {
        return reply.status(400).send({ error: 'Guild ID does not match community Discord server' });
      }

      // Check if channel already registered
      const existing = await prisma.discordFeedChannel.findUnique({
        where: { communityId_channelId: { communityId, channelId } },
      });

      if (existing) {
        return reply.status(400).send({ error: 'Channel already registered for this community' });
      }

      const feedChannel = await prisma.discordFeedChannel.create({
        data: {
          communityId,
          guildId,
          channelId,
        },
      });

      return reply.status(201).send({ success: true, feedChannel });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to register feed channel' });
    }
  });

  // DELETE /api/discord/feed/channels/:id - Remove feed channel (bot only)
  fastify.delete('/discord/feed/channels/:id', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.discordFeedChannel.delete({
        where: { id },
      });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove feed channel' });
    }
  });

  // POST /api/discord/ingest - Ingest a Discord message as an app post (bot only)
  fastify.post('/discord/ingest', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const {
        guildId,
        channelId,
        messageId,
        content,
        authorDiscordId,
        authorDiscordUsername,
        timestamp,
      } = request.body as any;

      if (!guildId || !channelId || !messageId || !content || !authorDiscordId) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      // Find community by guildId
      const community = await prisma.community.findUnique({
        where: { discordServerId: guildId },
      });

      if (!community) {
        return reply.status(404).send({ error: 'Community not found for this Discord server' });
      }

      // Check if feed channel is registered
      const feedChannel = await prisma.discordFeedChannel.findFirst({
        where: { guildId, channelId },
      });

      if (!feedChannel) {
        return reply.status(400).send({ error: 'This channel is not registered as a feed channel' });
      }

      // Try to find linked Discord account
      const discordAccount = await prisma.discordAccount.findUnique({
        where: { discordId: authorDiscordId },
        include: {
          user: {
            include: {
              riotAccounts: true,
              communityMemberships: true,
            },
          },
        },
      });

      let userId: string;
      let postingRiotAccountId: string;
      let region: any = 'EUW'; // Default
      let role: any = 'FILL'; // Default
      let vcPreference: any = 'SOMETIMES'; // Default
      let languages: string[] = [community.language || 'English'];

      // Try to extract role from message content
      const extractedRole = extractRoleFromContent(content);
      if (extractedRole) {
        role = extractedRole;
      }

      // Try to extract VC preference from message content
      const extractedVCPreference = extractVCPreferenceFromContent(content);
      if (extractedVCPreference) {
        vcPreference = extractedVCPreference;
      }

      if (discordAccount && discordAccount.user) {
        // User is linked - use their profile data
        userId = discordAccount.user.id;

        // Auto-join community if not already a member
        const isMember = discordAccount.user.communityMemberships.some(
          (m: any) => m.communityId === community.id
        );

        if (!isMember) {
          await prisma.communityMembership.create({
            data: {
              userId,
              communityId: community.id,
              role: 'MEMBER',
            },
          });
        }

        // Use main Riot account for posting
        const mainAccount = discordAccount.user.riotAccounts.find((acc: any) => acc.isMain) || discordAccount.user.riotAccounts[0];
        
        if (mainAccount) {
          postingRiotAccountId = mainAccount.id;
          region = mainAccount.region || 'EUW';
          // Use user's preferred role if available, otherwise fallback to extracted role or FILL
          if (!extractedRole && discordAccount.user.preferredRole) {
            role = discordAccount.user.preferredRole;
          }
        } else {
          // Create a placeholder Riot account for Discord users without linked Riot
          const placeholderAccount = await prisma.riotAccount.create({
            data: {
              puuid: `discord_${authorDiscordId}`,
              summonerName: authorDiscordUsername || 'Discord User',
              region: region,
              verified: false,
              userId,
            },
          });
          postingRiotAccountId = placeholderAccount.id;
        }

        // Use user's preferences if available
        if (discordAccount.user.primaryRole) role = discordAccount.user.primaryRole;
        if (discordAccount.user.region) region = discordAccount.user.region;
        if (discordAccount.user.vcPreference) vcPreference = discordAccount.user.vcPreference;
        if (discordAccount.user.languages && discordAccount.user.languages.length > 0) {
          languages = discordAccount.user.languages;
        }
      } else {
        // Create anonymous user for Discord-only users
        const anonUser = await prisma.user.create({
          data: {
            username: `discord_${authorDiscordUsername || authorDiscordId}`.substring(0, 20),
            anonymous: true,
          },
        });

        userId = anonUser.id;

        // Create placeholder Riot account
        const placeholderAccount = await prisma.riotAccount.create({
          data: {
            puuid: `discord_${authorDiscordId}`,
            summonerName: authorDiscordUsername || 'Discord User',
            region: region,
            verified: false,
            userId,
          },
        });
        postingRiotAccountId = placeholderAccount.id;

        // Link Discord account to new user
        await prisma.discordAccount.create({
          data: {
            discordId: authorDiscordId,
            username: authorDiscordUsername,
            userId,
          },
        });

        // Auto-join community
        await prisma.communityMembership.create({
          data: {
            userId,
            communityId: community.id,
            role: 'MEMBER',
          },
        });
      }

      // Delete user's old posts before creating new one (prevents spam)
      // This matches the behavior in the app post creation - one post per user at a time
      await prisma.post.deleteMany({
        where: {
          authorId: userId,
        },
      });

      // Create the post
      const post = await prisma.post.create({
        data: {
          authorId: userId,
          postingRiotAccountId,
          region,
          role,
          message: content,
          languages,
          vcPreference,
          duoType: 'BOTH',
          communityId: community.id,
          source: 'discord',
          discordMessageId: messageId,
        },
      });

      return reply.status(201).send({ success: true, post });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to ingest Discord message' });
    }
  });

  // GET /api/discord/outgoing - Get posts to mirror to Discord (bot only)
  fastify.get('/discord/outgoing', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { since, limit = 50 } = request.query as any;

      const where: any = {
        source: 'app',
        discordMirrored: false,
      };

      if (since) {
        where.createdAt = { gt: new Date(since) };
      }

      // Fetch posts and all feed channels so every post is mirrored everywhere
      const [posts, feedChannels] = await Promise.all([
        prisma.post.findMany({
          where,
          take: parseInt(limit),
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              include: {
                riotAccounts: true,
                discordAccount: true,
              },
            },
            community: true,
          },
        }),
        prisma.discordFeedChannel.findMany(),
      ]);

      const formatted = posts.map((post: any) => {
        const mainAccount = post.author.riotAccounts.find((acc: any) => acc.isMain) || post.author.riotAccounts[0];
        const postingAccount = post.author.riotAccounts.find((acc: any) => acc.id === post.postingRiotAccountId) || mainAccount;

        return {
          id: post.id,
          createdAt: post.createdAt,
          message: post.message,
          role: post.role,
          region: post.region,
          languages: post.languages,
          vcPreference: post.vcPreference,
          duoType: post.duoType,
          author: {
            id: post.author.id,
            username: post.author.anonymous ? 'Anonymous' : post.author.username,
            discordUsername: post.author.discordAccount?.username,
            discordId: post.author.discordAccount?.discordId,
          },
          riotAccount: postingAccount ? {
            summonerName: postingAccount.summonerName,
            rank: postingAccount.rank,
            division: postingAccount.division,
            winrate: postingAccount.winrate,
            gameName: postingAccount.gameName,
            tagLine: postingAccount.tagLine,
          } : null,
          feedChannels: feedChannels.map((fc: any) => ({
            channelId: fc.channelId,
            guildId: fc.guildId,
          })),
        };
      });

      return reply.send({ posts: formatted });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch outgoing posts' });
    }
  });

  // PATCH /api/discord/posts/:postId/mirrored - Mark post as mirrored (bot only)
  fastify.patch('/discord/posts/:postId/mirrored', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { postId } = request.params as { postId: string };

      const post = await prisma.post.update({
        where: { id: postId },
        data: { discordMirrored: true },
      });

      return reply.send({ success: true, post });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to mark post as mirrored' });
    }
  });
}
