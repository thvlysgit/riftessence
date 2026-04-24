import prisma from '../prisma';

// Ordered ranks for filter comparison (index = strength)
const RANK_ORDER = [
  'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
  'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER',
];

const ROLE_FORWARDING_RANK_KEYS = [...RANK_ORDER, 'UNRANKED'];
const ROLE_FORWARDING_LANGUAGE_KEYS = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Polish',
  'Russian',
  'Turkish',
  'Korean',
  'Japanese',
  'Chinese',
];

const LANGUAGE_KEY_LOOKUP: Record<string, string> = ROLE_FORWARDING_LANGUAGE_KEYS.reduce((acc: Record<string, string>, key: string) => {
  acc[key.toLowerCase()] = key;
  return acc;
}, {} as Record<string, string>);

const DISCORD_ROLE_ID_REGEX = /^\d{6,30}$/;

function rankIndex(rank: string | null | undefined): number {
  if (!rank) return -1;
  return RANK_ORDER.indexOf(rank);
}

/** Returns true if `rank` falls within [min, max] (inclusive, null = no bound). */
function rankInRange(rank: string | null | undefined, min: string | null | undefined, max: string | null | undefined): boolean {
  if (!min && !max) return true; // no filter
  const ri = rankIndex(rank);
  if (ri < 0) return true; // UNRANKED passes through
  if (min && ri < rankIndex(min)) return false;
  if (max && ri > rankIndex(max)) return false;
  return true;
}

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

function normalizeDiscordRoleId(raw: any): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const mentionMatch = trimmed.match(/^<@&(\d+)>$/);
  const roleId = mentionMatch ? mentionMatch[1] : trimmed;
  return DISCORD_ROLE_ID_REGEX.test(roleId) ? roleId : null;
}

function normalizeRankKey(raw: any): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase();
  return ROLE_FORWARDING_RANK_KEYS.includes(normalized) ? normalized : null;
}

function normalizeLanguageKey(raw: any): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  return LANGUAGE_KEY_LOOKUP[normalized] || null;
}

function normalizeLanguageArray(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value: any) => normalizeLanguageKey(value))
    .filter((value: string | null): value is string => Boolean(value));
}

function matchesLanguageFilter(filterLanguages: any, postLanguages: any): boolean {
  const normalizedFilter = normalizeLanguageArray(filterLanguages);
  if (normalizedFilter.length === 0) return true;

  const normalizedPostLanguages = normalizeLanguageArray(postLanguages);
  if (normalizedPostLanguages.length === 0) return false;

  const filterSet = new Set(normalizedFilter);
  return normalizedPostLanguages.some((language) => filterSet.has(language));
}

function normalizeRoleMap(raw: any, kind: 'RANK' | 'LANGUAGE'): Record<string, string> {
  const output: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return output;
  }

  for (const [key, value] of Object.entries(raw)) {
    const normalizedKey = kind === 'RANK' ? normalizeRankKey(key) : normalizeLanguageKey(key);
    const normalizedRoleId = normalizeDiscordRoleId(value);
    if (normalizedKey && normalizedRoleId) {
      output[normalizedKey] = normalizedRoleId;
    }
  }

  return output;
}

function pickBestRank(riotAccounts: Array<{ rank: string | null; isMain: boolean }>): string | null {
  if (!Array.isArray(riotAccounts) || riotAccounts.length === 0) {
    return null;
  }

  const main = riotAccounts.find((acc) => acc.isMain);
  const rankedMain = main?.rank ? normalizeRankKey(main.rank) : null;
  if (rankedMain) {
    return rankedMain;
  }

  for (const account of riotAccounts) {
    const rank = normalizeRankKey(account.rank);
    if (rank) {
      return rank;
    }
  }

  return 'UNRANKED';
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
      const {
        communityId, guildId, channelId,
        feedType = 'DUO',
        filterRegions = [],
        filterRoles = [],
        filterLanguages = [],
        filterMinRank = null,
        filterMaxRank = null,
      } = request.body as any;

      const normalizedFilterLanguages = Array.isArray(filterLanguages)
        ? filterLanguages
            .map((value: any) => (typeof value === 'string' ? value.trim() : ''))
            .filter((value: string) => value.length > 0)
        : [];

      if (!communityId || !guildId || !channelId) {
        return reply.status(400).send({ error: 'Missing required fields: communityId, guildId, channelId' });
      }

      if (!['DUO', 'LFT', 'SCRIM'].includes(feedType)) {
        return reply.status(400).send({ error: 'feedType must be DUO, LFT, or SCRIM' });
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

      // Enforce 5-channel-per-guild limit
      const channelCount = await prisma.discordFeedChannel.count({
        where: { guildId },
      });
      if (channelCount >= 5) {
        return reply.status(400).send({ error: 'Maximum of 5 feed channels per server. Remove an existing channel first.' });
      }

      // Check if this exact config already exists
      const existing = await prisma.discordFeedChannel.findUnique({
        where: { guildId_channelId_feedType: { guildId, channelId, feedType } },
      });

      if (existing) {
        // Update filters instead of erroring
        const updated = await prisma.discordFeedChannel.update({
          where: { id: existing.id },
          data: { filterRegions, filterRoles, filterLanguages: normalizedFilterLanguages, filterMinRank, filterMaxRank },
        });
        return reply.send({ success: true, feedChannel: updated, updated: true });
      }

      const feedChannel = await prisma.discordFeedChannel.create({
        data: {
          communityId,
          guildId,
          channelId,
          feedType,
          filterRegions,
          filterRoles,
          filterLanguages: normalizedFilterLanguages,
          filterMinRank: filterMinRank || null,
          filterMaxRank: filterMaxRank || null,
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

  // GET /api/discord/outgoing - Get DUO posts to mirror to Discord (bot only)
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

      // Fetch posts and DUO-type feed channels
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
                championPoolMode: true,
                championList: true,
                championTierlist: true,
              },
            },
            community: true,
          },
        }),
        prisma.discordFeedChannel.findMany({
          where: { feedType: 'DUO' },
        }),
      ]);

      const formatted = posts.map((post: any) => {
        const mainAccount = post.author.riotAccounts.find((acc: any) => acc.isMain) || post.author.riotAccounts[0];
        const postingAccount = post.author.riotAccounts.find((acc: any) => acc.id === post.postingRiotAccountId) || mainAccount;

        // Filter channels: only include channels whose filters match this post
        const matchingChannels = feedChannels.filter((fc: any) => {
          // Region filter
          if (fc.filterRegions && fc.filterRegions.length > 0) {
            if (!fc.filterRegions.includes(post.region)) return false;
          }
          // Role filter
          if (fc.filterRoles && fc.filterRoles.length > 0) {
            if (!fc.filterRoles.includes(post.role)) return false;
          }
          // Language filter
          if (!matchesLanguageFilter(fc.filterLanguages, post.languages)) return false;
          // Rank filter (use posting account rank)
          const postRank = postingAccount?.rank || null;
          if (!rankInRange(postRank, fc.filterMinRank, fc.filterMaxRank)) return false;
          return true;
        });

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
          championPoolMode: post.author.championPoolMode || null,
          championList: Array.isArray(post.author.championList) ? post.author.championList : [],
          championTierlist: post.author.championTierlist || null,
          communityId: post.community?.id || null,
          communitySlug: post.community?.slug || null,
          communityName: post.community?.name || null,
          feedChannels: matchingChannels.map((fc: any) => ({
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

  // GET /api/discord/outgoing-lft - Get LFT posts to mirror to Discord (bot only)
  fastify.get('/discord/outgoing-lft', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { since, limit = 50 } = request.query as any;

      const where: any = {
        source: 'app',
        discordMirrored: false,
      };

      if (since) {
        where.createdAt = { gt: new Date(since) };
      }

      const [posts, feedChannels] = await Promise.all([
        prisma.lftPost.findMany({
          where,
          take: parseInt(limit),
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              include: {
                riotAccounts: true,
                discordAccount: true,
                championPoolMode: true,
                championList: true,
                championTierlist: true,
              },
            },
          },
        }),
        prisma.discordFeedChannel.findMany({
          where: { feedType: 'LFT' },
        }),
      ]);

      const formatted = posts.map((post: any) => {
        // For TEAM posts, use averageRank. For PLAYER posts, use rank.
        const postRank = post.type === 'TEAM' ? post.averageRank : post.rank;

        // Filter channels
        const matchingChannels = feedChannels.filter((fc: any) => {
          if (fc.filterRegions && fc.filterRegions.length > 0) {
            if (!fc.filterRegions.includes(post.region)) return false;
          }

          if (fc.filterLanguages && fc.filterLanguages.length > 0) {
            if (post.type === 'PLAYER') {
              if (!matchesLanguageFilter(fc.filterLanguages, post.languages)) return false;
            }
          }

          if (!rankInRange(postRank, fc.filterMinRank, fc.filterMaxRank)) return false;
          return true;
        });

        return {
          id: post.id,
          type: post.type,
          teamId: post.teamId || null,
          createdAt: post.createdAt,
          region: post.region,
          candidateType: post.candidateType || 'PLAYER',
          representedName: post.representedName || null,
          author: {
            id: post.author.id,
            username: post.author.username,
            discordUsername: post.author.discordAccount?.username,
            discordId: post.author.discordAccount?.discordId,
          },
          championPoolMode: post.author.championPoolMode || null,
          // TEAM fields
          teamName: post.teamName,
          rolesNeeded: post.rolesNeeded,
          averageRank: post.averageRank,
          averageDivision: post.averageDivision,
          scrims: post.scrims,
          minAvailability: post.minAvailability,
          coachingAvailability: post.coachingAvailability,
          details: post.details,
          // PLAYER fields
          mainRole: post.mainRole,
          rank: post.rank,
          division: post.division,
          championPool: post.author.championPoolMode === 'TIERLIST' && post.author.championTierlist
            ? [
                ...(Array.isArray(post.author.championTierlist.S) ? post.author.championTierlist.S : []),
                ...(Array.isArray(post.author.championTierlist.A) ? post.author.championTierlist.A : []),
                ...(Array.isArray(post.author.championTierlist.B) ? post.author.championTierlist.B : []),
                ...(Array.isArray(post.author.championTierlist.C) ? post.author.championTierlist.C : []),
              ]
            : Array.isArray(post.author.championList) ? post.author.championList : [],
          championTierlist: post.author.championTierlist || null,
          experience: post.experience,
          languages: post.languages,
          skills: post.skills,
          availability: post.availability,
          feedChannels: matchingChannels.map((fc: any) => ({
            channelId: fc.channelId,
            guildId: fc.guildId,
          })),
        };
      });

      return reply.send({ posts: formatted });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch outgoing LFT posts' });
    }
  });

  // GET /api/discord/outgoing-scrims - Get Scrim Finder posts to mirror to Discord (bot only)
  fastify.get('/discord/outgoing-scrims', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { since, limit = 50 } = request.query as any;

      const where: any = {
        source: 'app',
        discordMirrored: false,
      };

      if (since) {
        where.createdAt = { gt: new Date(since) };
      }

      const [posts, feedChannels] = await Promise.all([
        prisma.scrimPost.findMany({
          where,
          take: parseInt(limit),
          orderBy: { createdAt: 'asc' },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                tag: true,
                iconUrl: true,
                region: true,
              },
            },
            author: {
              select: {
                id: true,
                username: true,
                discordAccount: {
                  select: {
                    discordId: true,
                    username: true,
                  },
                },
              },
            },
            proposals: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        }),
        prisma.discordFeedChannel.findMany({
          where: { feedType: 'SCRIM' },
        }),
      ]);

      const formatted = posts.map((post: any) => {
        const matchingChannels = feedChannels.filter((fc: any) => {
          if (fc.filterRegions && fc.filterRegions.length > 0) {
            if (!fc.filterRegions.includes(post.region)) return false;
          }

          if (!rankInRange(post.averageRank, fc.filterMinRank, fc.filterMaxRank)) return false;
          return true;
        });

        return {
          id: post.id,
          teamId: post.teamId,
          createdAt: post.createdAt,
          region: post.region,
          teamName: post.teamName,
          teamTag: post.teamTag,
          averageRank: post.averageRank,
          averageDivision: post.averageDivision,
          startTimeUtc: post.startTimeUtc,
          timezoneLabel: post.timezoneLabel,
          scrimFormat: post.scrimFormat,
          opggMultisearchUrl: post.opggMultisearchUrl,
          details: post.details,
          status: post.status,
          proposalCount: post.proposals.length,
          team: post.team,
          author: {
            id: post.author.id,
            username: post.author.username,
            discordUsername: post.author.discordAccount?.username || null,
            discordId: post.author.discordAccount?.discordId || null,
          },
          feedChannels: matchingChannels.map((fc: any) => ({
            channelId: fc.channelId,
            guildId: fc.guildId,
          })),
        };
      });

      return reply.send({ posts: formatted });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch outgoing scrim posts' });
    }
  });

  // PATCH /api/discord/scrim-posts/:postId/mirrored - Mark Scrim post as mirrored (bot only)
  fastify.patch('/discord/scrim-posts/:postId/mirrored', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { postId } = request.params as { postId: string };

      const post = await prisma.scrimPost.update({
        where: { id: postId },
        data: { discordMirrored: true },
      });

      return reply.send({ success: true, post });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to mark scrim post as mirrored' });
    }
  });

  // PATCH /api/discord/lft-posts/:postId/mirrored - Mark LFT post as mirrored (bot only)
  fastify.patch('/discord/lft-posts/:postId/mirrored', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { postId } = request.params as { postId: string };

      const post = await prisma.lftPost.update({
        where: { id: postId },
        data: { discordMirrored: true },
      });

      return reply.send({ success: true, post });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to mark LFT post as mirrored' });
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

  // GET /api/discord/dm-queue - Get pending DM notifications (bot only)
  fastify.get('/discord/dm-queue', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const pendingDms = await prisma.discordDmQueue.findMany({
        where: { sent: false },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      return reply.send({ dms: pendingDms });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch DM queue' });
    }
  });

  // PATCH /api/discord/dm-queue/:id/sent - Mark a DM notification as sent (bot only)
  fastify.patch('/discord/dm-queue/:id/sent', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.discordDmQueue.update({
        where: { id },
        data: { sent: true },
      });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to mark DM as sent' });
    }
  });

  // POST /api/discord/dm-reply - Send a chat reply from Discord DM modal (bot only)
  fastify.post('/discord/dm-reply', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { discordId, conversationId, content } = request.body as {
        discordId?: string;
        conversationId?: string;
        content?: string;
      };

      const trimmedContent = typeof content === 'string' ? content.trim() : '';

      if (!discordId || !conversationId || !trimmedContent) {
        return reply.status(400).send({ error: 'Missing required fields: discordId, conversationId, content' });
      }

      if (trimmedContent.length > 2000) {
        return reply.status(400).send({ error: 'Message too long (max 2000 characters)' });
      }

      const discordAccount = await prisma.discordAccount.findUnique({
        where: { discordId },
        select: { userId: true },
      });

      if (!discordAccount) {
        return reply.status(404).send({ error: 'User not linked to Discord' });
      }

      const senderId = discordAccount.userId;

      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [{ user1Id: senderId }, { user2Id: senderId }],
        },
        select: {
          id: true,
          user1Id: true,
          user2Id: true,
        },
      });

      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found or access denied' });
      }

      const recipientId = conversation.user1Id === senderId ? conversation.user2Id : conversation.user1Id;

      const blockExists = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: senderId, blockedId: recipientId },
            { blockerId: recipientId, blockedId: senderId },
          ],
        },
      });

      if (blockExists) {
        return reply.status(403).send({ error: 'Cannot send message' });
      }

      const isSenderUser1 = conversation.user1Id === senderId;

      const createdMessage = await prisma.$transaction(async (tx: any) => {
        const message = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId,
            content: trimmedContent,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        });

        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: trimmedContent.substring(0, 100),
            ...(isSenderUser1
              ? { user2UnreadCount: { increment: 1 } }
              : { user1UnreadCount: { increment: 1 } }),
          },
        });

        return message;
      });

      // Forward Discord DM preview to the recipient if they opted in.
      try {
        const recipientUser = await prisma.user.findUnique({
          where: { id: recipientId },
          select: {
            discordDmNotifications: true,
            discordAccount: { select: { discordId: true } },
          },
        });

        if (recipientUser?.discordDmNotifications && recipientUser.discordAccount?.discordId) {
          await prisma.discordDmQueue.create({
            data: {
              recipientDiscordId: recipientUser.discordAccount.discordId,
              senderUsername: createdMessage.sender.username || 'Someone',
              messagePreview: trimmedContent.substring(0, 200),
              conversationId: conversation.id,
            },
          });
        }
      } catch (dmQueueError: any) {
        fastify.log.error(dmQueueError, 'Failed to queue follow-up Discord DM notification after dm-reply');
      }

      return reply.send({
        success: true,
        messageId: createdMessage.id,
        createdAt: createdMessage.createdAt,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send chat reply from Discord' });
    }
  });

  // GET /api/discord/role-forwarding - Get role-forwarding config for a linked guild (bot only)
  fastify.get('/discord/role-forwarding', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { guildId } = request.query as { guildId?: string };
      if (!guildId) {
        return reply.status(400).send({ error: 'Missing required query parameter: guildId' });
      }

      const community = await (prisma as any).community.findUnique({
        where: { discordServerId: guildId },
        select: {
          id: true,
          name: true,
          discordRankRoleMap: true,
          discordLanguageRoleMap: true,
        },
      });

      if (!community) {
        return reply.status(404).send({ error: 'No linked community found for this Discord server' });
      }

      const rankRoleMap = normalizeRoleMap(community.discordRankRoleMap, 'RANK');
      const languageRoleMap = normalizeRoleMap(community.discordLanguageRoleMap, 'LANGUAGE');

      return reply.send({
        success: true,
        guildId,
        communityId: community.id,
        communityName: community.name,
        rankRoleMap,
        languageRoleMap,
        configuredRanks: Object.keys(rankRoleMap).length,
        configuredLanguages: Object.keys(languageRoleMap).length,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch role forwarding config' });
    }
  });

  // PATCH /api/discord/role-forwarding - Set or clear one rank/language mapping (bot only)
  fastify.patch('/discord/role-forwarding', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { guildId, type, key, roleId } = request.body as {
        guildId?: string;
        type?: 'RANK' | 'LANGUAGE' | string;
        key?: string;
        roleId?: string | null;
      };

      if (!guildId || !type || !key) {
        return reply.status(400).send({ error: 'Missing required fields: guildId, type, key' });
      }

      const normalizedType = String(type).toUpperCase();
      if (normalizedType !== 'RANK' && normalizedType !== 'LANGUAGE') {
        return reply.status(400).send({ error: 'type must be RANK or LANGUAGE' });
      }

      const normalizedKey = normalizedType === 'RANK' ? normalizeRankKey(key) : normalizeLanguageKey(key);
      if (!normalizedKey) {
        return reply.status(400).send({ error: `Invalid ${normalizedType === 'RANK' ? 'rank' : 'language'} key` });
      }

      const normalizedRoleId = roleId === null || roleId === undefined || roleId === ''
        ? null
        : normalizeDiscordRoleId(roleId);

      if (roleId !== null && roleId !== undefined && roleId !== '' && !normalizedRoleId) {
        return reply.status(400).send({ error: 'Invalid Discord role ID' });
      }

      const community = await (prisma as any).community.findUnique({
        where: { discordServerId: guildId },
        select: {
          id: true,
          name: true,
          discordRankRoleMap: true,
          discordLanguageRoleMap: true,
        },
      });

      if (!community) {
        return reply.status(404).send({ error: 'No linked community found for this Discord server' });
      }

      const rankRoleMap = normalizeRoleMap(community.discordRankRoleMap, 'RANK');
      const languageRoleMap = normalizeRoleMap(community.discordLanguageRoleMap, 'LANGUAGE');

      if (normalizedType === 'RANK') {
        if (normalizedRoleId) {
          rankRoleMap[normalizedKey] = normalizedRoleId;
        } else {
          delete rankRoleMap[normalizedKey];
        }
      } else {
        if (normalizedRoleId) {
          languageRoleMap[normalizedKey] = normalizedRoleId;
        } else {
          delete languageRoleMap[normalizedKey];
        }
      }

      await (prisma as any).community.update({
        where: { id: community.id },
        data: {
          discordRankRoleMap: rankRoleMap as any,
          discordLanguageRoleMap: languageRoleMap as any,
        },
      });

      return reply.send({
        success: true,
        guildId,
        communityId: community.id,
        communityName: community.name,
        action: normalizedRoleId ? 'SET' : 'REMOVED',
        type: normalizedType,
        key: normalizedKey,
        rankRoleMap,
        languageRoleMap,
        configuredRanks: Object.keys(rankRoleMap).length,
        configuredLanguages: Object.keys(languageRoleMap).length,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update role forwarding config' });
    }
  });

  // POST /api/discord/role-forwarding/sync - Build sync payload for role assignment (bot only)
  fastify.post('/discord/role-forwarding/sync', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { guildId } = request.body as { guildId?: string };
      if (!guildId) {
        return reply.status(400).send({ error: 'Missing required field: guildId' });
      }

      const community = await (prisma as any).community.findUnique({
        where: { discordServerId: guildId },
        select: {
          id: true,
          name: true,
          discordRankRoleMap: true,
          discordLanguageRoleMap: true,
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  languages: true,
                  discordAccount: {
                    select: { discordId: true },
                  },
                  riotAccounts: {
                    select: {
                      rank: true,
                      isMain: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!community) {
        return reply.status(404).send({ error: 'No linked community found for this Discord server' });
      }

      const rankRoleMap = normalizeRoleMap(community.discordRankRoleMap, 'RANK');
      const languageRoleMap = normalizeRoleMap(community.discordLanguageRoleMap, 'LANGUAGE');
      const managedRoleIds = Array.from(new Set([...Object.values(rankRoleMap), ...Object.values(languageRoleMap)]));

      const summary = {
        totalMembers: community.memberships.length,
        eligibleMembers: 0,
        missingDiscordLink: 0,
        missingRiotLink: 0,
        noMatchingMapping: 0,
      };

      const members = community.memberships.map((membership: any) => {
        const user = membership.user;
        const discordId = user.discordAccount?.discordId || null;

        if (!discordId) {
          summary.missingDiscordLink += 1;
          return {
            userId: user.id,
            username: user.username,
            discordId: null,
            rank: null,
            languages: Array.isArray(user.languages) ? user.languages : [],
            desiredRoleIds: [] as string[],
            status: 'MISSING_DISCORD_LINK',
          };
        }

        const bestRank = pickBestRank(Array.isArray(user.riotAccounts) ? user.riotAccounts : []);
        if (!bestRank) {
          summary.missingRiotLink += 1;
          return {
            userId: user.id,
            username: user.username,
            discordId,
            rank: null,
            languages: Array.isArray(user.languages) ? user.languages : [],
            desiredRoleIds: [] as string[],
            status: 'MISSING_RIOT_LINK',
          };
        }

        const desiredRoleIds = new Set<string>();

        const mappedRankRole = rankRoleMap[bestRank];
        if (mappedRankRole) {
          desiredRoleIds.add(mappedRankRole);
        }

        const normalizedLanguages = Array.isArray(user.languages)
          ? user.languages
              .map((lang: string) => normalizeLanguageKey(lang))
              .filter((lang: string | null): lang is string => Boolean(lang))
          : [];

        for (const language of normalizedLanguages) {
          const mappedLanguageRole = languageRoleMap[language];
          if (mappedLanguageRole) {
            desiredRoleIds.add(mappedLanguageRole);
          }
        }

        if (desiredRoleIds.size === 0) {
          summary.noMatchingMapping += 1;
          return {
            userId: user.id,
            username: user.username,
            discordId,
            rank: bestRank,
            languages: normalizedLanguages,
            desiredRoleIds: [] as string[],
            status: 'NO_MATCHING_MAPPING',
          };
        }

        summary.eligibleMembers += 1;
        return {
          userId: user.id,
          username: user.username,
          discordId,
          rank: bestRank,
          languages: normalizedLanguages,
          desiredRoleIds: Array.from(desiredRoleIds),
          status: 'ELIGIBLE',
        };
      });

      return reply.send({
        success: true,
        enabled: managedRoleIds.length > 0,
        guildId,
        communityId: community.id,
        communityName: community.name,
        rankRoleMap,
        languageRoleMap,
        managedRoleIds,
        summary,
        members,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate role forwarding sync payload' });
    }
  });

  // ============================================================
  // Team Event Discord Notifications
  // ============================================================

  // GET /api/discord/team-events - Get pending team event notifications (bot only)
  fastify.get('/discord/team-events', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const notifications = await prisma.teamEventNotification.findMany({
        where: { processed: false },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: {
          team: {
            select: {
              id: true,
              name: true,
              tag: true,
              discordWebhookUrl: true,
              discordScrimCodeWebhookUrl: true,
              discordNotifyEvents: true,
              discordMentionMode: true,
              discordMentionRoleId: true,
              discordRoleMentions: true,
              discordPingRecurrence: true,
              discordLastChannelPingAt: true,
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      discordDmNotifications: true,
                      discordAccount: {
                        select: { discordId: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const formatted = notifications.map((n: any) => ({
        ...(function resolveDelivery() {
          const isScrimLifecycle = typeof n.notificationType === 'string' && n.notificationType.startsWith('SCRIM_');
          const webhookUrl = isScrimLifecycle && n.team.discordScrimCodeWebhookUrl
            ? n.team.discordScrimCodeWebhookUrl
            : n.team.discordWebhookUrl;
          const notifyEnabled = isScrimLifecycle ? true : n.team.discordNotifyEvents;
          return { webhookUrl, notifyEnabled };
        })(),
        id: n.id,
        teamId: n.teamId,
        teamName: n.team.name,
        teamTag: n.team.tag,
        eventId: n.eventId,
        eventTitle: n.eventTitle,
        eventType: n.eventType,
        scheduledAt: n.scheduledAt,
        duration: n.duration,
        description: n.description,
        enemyLink: n.enemyLink,
        notificationType: n.notificationType,
        triggeredBy: n.triggeredBy,
        concernedMemberIds: Array.isArray(n.concernedMemberIds) ? n.concernedMemberIds : [],
        mentionMode: n.team.discordMentionMode || 'EVERYONE',
        mentionRoleId: n.team.discordMentionRoleId || null,
        roleMentions: (n.team.discordRoleMentions && typeof n.team.discordRoleMentions === 'object' && !Array.isArray(n.team.discordRoleMentions))
          ? n.team.discordRoleMentions
          : {},
        pingRecurrenceEnabled: Boolean(n.team.discordPingRecurrence),
        lastChannelPingAt: n.team.discordLastChannelPingAt,
        createdAt: n.createdAt,
        members: n.team.members.map((m: any) => ({
          id: m.user.id,
          username: m.user.username,
          role: m.role,
          discordId: m.user.discordAccount?.discordId || null,
          dmEnabled: Boolean(m.user.discordDmNotifications && m.user.discordAccount?.discordId)
        }))
      }));

      return reply.send({ notifications: formatted });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch team event notifications' });
    }
  });

  // PATCH /api/discord/team-events/:id/processed - Mark notification as processed (bot only)
  fastify.patch('/discord/team-events/:id/processed', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };
      const payload = request.body && typeof request.body === 'object' ? request.body : {};
      const { recordPing } = payload as { recordPing?: boolean };

      const updated = await prisma.teamEventNotification.update({
        where: { id },
        data: { processed: true },
        select: { teamId: true },
      });

      if (recordPing) {
        await prisma.team.update({
          where: { id: updated.teamId },
          data: { discordLastChannelPingAt: new Date() },
        });
      }

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to mark notification as processed' });
    }
  });

  // GET /api/discord/team-event-reminders - Get due team event reminders (bot only)
  fastify.get('/discord/team-event-reminders', { preHandler: validateBotAuth }, async (_request: any, reply: any) => {
    try {
      const reminders = await prisma.teamEventReminder.findMany({
        where: {
          processed: false,
          remindAt: { lte: new Date() },
          team: { discordRemindersEnabled: true },
        },
        orderBy: { remindAt: 'asc' },
        take: 50,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              type: true,
              description: true,
              scheduledAt: true,
              duration: true,
              enemyMultigg: true,
              concernedMemberIds: true,
              attendances: {
                select: {
                  userId: true,
                  status: true,
                },
              },
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              tag: true,
              discordWebhookUrl: true,
              discordMentionMode: true,
              discordMentionRoleId: true,
              discordRoleMentions: true,
              discordPingRecurrence: true,
              discordLastChannelPingAt: true,
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      discordDmNotifications: true,
                      discordAccount: {
                        select: { discordId: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const formatted = reminders.map((n: any) => ({
        id: n.id,
        teamId: n.teamId,
        teamName: n.team.name,
        teamTag: n.team.tag,
        webhookUrl: n.team.discordWebhookUrl,
        eventId: n.eventId,
        eventTitle: n.event.title,
        eventType: n.event.type,
        scheduledAt: n.event.scheduledAt,
        duration: n.event.duration,
        description: n.event.description,
        enemyLink: n.event.enemyMultigg,
        reminderMinutes: n.reminderMinutes,
        remindAt: n.remindAt,
        concernedMemberIds: Array.isArray(n.event.concernedMemberIds) ? n.event.concernedMemberIds : [],
        mentionMode: n.team.discordMentionMode || 'EVERYONE',
        mentionRoleId: n.team.discordMentionRoleId || null,
        roleMentions: (n.team.discordRoleMentions && typeof n.team.discordRoleMentions === 'object' && !Array.isArray(n.team.discordRoleMentions))
          ? n.team.discordRoleMentions
          : {},
        pingRecurrenceEnabled: Boolean(n.team.discordPingRecurrence),
        lastChannelPingAt: n.team.discordLastChannelPingAt,
        createdAt: n.createdAt,
        members: n.team.members.map((m: any) => ({
          id: m.user.id,
          username: m.user.username,
          role: m.role,
          discordId: m.user.discordAccount?.discordId || null,
          dmEnabled: Boolean(m.user.discordDmNotifications && m.user.discordAccount?.discordId)
        })),
        attendances: Array.isArray(n.event.attendances)
          ? n.event.attendances.map((a: any) => ({
              userId: a.userId,
              status: a.status,
            }))
          : [],
      }));

      return reply.send({ reminders: formatted });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch due team event reminders' });
    }
  });

  // PATCH /api/discord/team-event-reminders/:id/processed - Mark reminder as processed (bot only)
  fastify.patch('/discord/team-event-reminders/:id/processed', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };
      const payload = request.body && typeof request.body === 'object' ? request.body : {};
      const { recordPing } = payload as { recordPing?: boolean };

      const updated = await prisma.teamEventReminder.update({
        where: { id },
        data: { processed: true },
        select: { teamId: true },
      });

      if (recordPing) {
        await prisma.team.update({
          where: { id: updated.teamId },
          data: { discordLastChannelPingAt: new Date() },
        });
      }

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to mark reminder as processed' });
    }
  });

  // POST /api/discord/team-events/:eventId/attendance - Update attendance via Discord button (bot only)
  fastify.post('/discord/team-events/:eventId/attendance', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { eventId } = request.params as { eventId: string };
      const { discordId, status } = request.body as { discordId: string; status: string };

      if (!discordId || !status) {
        return reply.status(400).send({ error: 'Missing discordId or status' });
      }

      // Find user by Discord ID
      const discordAccount = await prisma.discordAccount.findUnique({
        where: { discordId },
        select: { userId: true }
      });

      if (!discordAccount) {
        fastify.log.warn({ discordId, eventId }, 'Discord attendance update rejected: user not linked');
        return reply.status(404).send({ error: 'User not linked to Discord' });
      }

      const userId = discordAccount.userId;

      // Check if event exists
      const event = await prisma.teamEvent.findUnique({
        where: { id: eventId },
        include: {
          team: {
            include: {
              members: { where: { userId } }
            }
          }
        }
      });

      if (!event) {
        fastify.log.warn({ eventId, discordId }, 'Discord attendance update rejected: event not found');
        return reply.status(404).send({ error: 'Event not found' });
      }

      // Check if user is team member
      if (event.team.members.length === 0) {
        fastify.log.warn({ eventId, discordId, userId }, 'Discord attendance update rejected: non-member attempted response');
        return reply.status(403).send({ error: 'Not a team member' });
      }

      if (event.concernedMemberIds?.length > 0 && !event.concernedMemberIds.includes(userId)) {
        fastify.log.warn({ eventId, discordId, userId }, 'Discord attendance update rejected: user not concerned by event');
        return reply.status(403).send({ error: 'Not concerned by this event' });
      }

      const validStatuses = ['PRESENT', 'ABSENT', 'UNSURE'];
      if (!validStatuses.includes(status)) {
        fastify.log.warn({ eventId, discordId, status }, 'Discord attendance update rejected: invalid status');
        return reply.status(400).send({ error: 'Invalid status' });
      }

      // Upsert attendance
      const attendance = await prisma.teamEventAttendance.upsert({
        where: { eventId_userId: { eventId, userId } },
        update: { status: status as any },
        create: {
          eventId,
          userId,
          status: status as any
        }
      });

      // Get username for response
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });

      return reply.send({
        success: true,
        username: user?.username,
        status: attendance.status
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update attendance' });
    }
  });

  // PATCH /api/discord/team-events/:eventId/message - Store Discord message ID for event (bot only)
  fastify.patch('/discord/team-events/:eventId/message', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { eventId } = request.params as { eventId: string };
      const { messageId } = request.body as { messageId: string };

      await prisma.teamEvent.update({
        where: { id: eventId },
        data: { discordMessageId: messageId }
      });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to store message ID' });
    }
  });
}
