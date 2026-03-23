import prisma from '../prisma';
import * as riotClient from '../riotClient';
import { validateRequest } from '../validation';
import { cacheGet, cacheSet } from '../utils/cache';
import { z } from 'zod';

// ============================================================
// RATE SCHEMAS
// ============================================================

const RateLookupSchema = z.object({
  summonerName: z.string().min(1).max(100),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']),
});

const RateVerifySchema = z.object({
  summonerName: z.string().min(1).max(100),
  region: z.enum(['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU']),
  verificationIconId: z.number().int().min(0),
  receiverUsername: z.string().min(1), // The user being rated
});

const RateSubmitSchema = z.object({
  raterToken: z.string().min(1),
  receiverId: z.string().min(1),
  stars: z.number().int().min(1).max(5),
  moons: z.number().int().min(1).max(5),
  comment: z.string().max(300, 'Comment too long (max 300 characters)').optional(),
});

// Helper to parse Riot ID
function parseRiotId(summonerName: string, region: string): { gameName: string; tagLine: string } {
  if (summonerName.includes('#')) {
    const parts = summonerName.split('#');
    return { gameName: parts[0], tagLine: parts[1] };
  }
  return { gameName: summonerName, tagLine: region };
}

// Helper to find shared matches between two PUUIDs
async function findSharedMatches(
  puuid1: string,
  puuid2: string,
  region: string
): Promise<{ sharedMatchIds: string[]; count: number }> {
  try {
    // Fetch recent matches for both players (last 50 each for performance)
    const [matches1, matches2] = await Promise.all([
      riotClient.getRecentMatchIds(puuid1, region, 50),
      riotClient.getRecentMatchIds(puuid2, region, 50),
    ]);

    // Find intersection
    const matches2Set = new Set(matches2);
    const sharedMatchIds = matches1.filter(id => matches2Set.has(id));

    return {
      sharedMatchIds,
      count: sharedMatchIds.length,
    };
  } catch (err) {
    console.error('[SharedMatches] Error finding shared matches:', err);
    return { sharedMatchIds: [], count: 0 };
  }
}

export default async function rateRoutes(fastify: any) {
  // Get target user's public profile for rating page
  fastify.get('/:username', async (request: any, reply: any) => {
    try {
      const { username } = request.params;

      const user = await prisma.user.findUnique({
        where: { username },
        include: {
          riotAccounts: {
            where: { isMain: true, hidden: false },
            take: 1,
          },
          ratingsReceived: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Calculate average ratings
      const ratings = user.ratingsReceived;
      const avgStars = ratings.length > 0
        ? Math.round(ratings.reduce((sum: number, r: { stars: number }) => sum + r.stars, 0) / ratings.length)
        : 0;
      const avgMoons = ratings.length > 0
        ? Math.round(ratings.reduce((sum: number, r: { moons: number }) => sum + r.moons, 0) / ratings.length)
        : 0;

      const mainAccount = user.riotAccounts[0];

      return reply.send({
        user: {
          id: user.id,
          username: user.username,
          mainAccount: mainAccount ? {
            gameName: mainAccount.gameName || mainAccount.summonerName,
            tagLine: mainAccount.tagLine,
            region: mainAccount.region,
            rank: mainAccount.rank,
            division: mainAccount.division,
            profileIconId: mainAccount.profileIconId,
          } : null,
          skillStars: avgStars,
          personalityMoons: avgMoons,
          feedbackCount: ratings.length,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch user profile' });
    }
  });

  // Lookup rater's Riot account (step 1 of verification)
  fastify.post('/lookup', async (request: any, reply: any) => {
    try {
      const validation = validateRequest(RateLookupSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { summonerName, region } = validation.data;
      const { gameName, tagLine } = parseRiotId(summonerName, region);

      // Fetch PUUID
      let puuid: string | null;
      try {
        puuid = await riotClient.getPuuid(gameName, tagLine, region);
        if (!puuid) {
          return reply.status(404).send({ error: 'Summoner not found on Riot' });
        }
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(502).send({ error: 'Error fetching data from Riot API' });
      }

      // Fetch current profile icon
      let currentIcon: number | null;
      try {
        currentIcon = await riotClient.getProfileIcon({ summonerName, region, puuid }, false);
      } catch (err: any) {
        if (err?.status === 404) {
          return reply.status(404).send({ error: 'Summoner not found on Riot' });
        }
        fastify.log.error(err);
        return reply.status(502).send({ error: 'Error fetching data from Riot API' });
      }

      return reply.send({
        success: true,
        puuid,
        profileIconId: currentIcon,
        gameName,
        tagLine,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to lookup Riot account' });
    }
  });

  // Verify rater's identity and check shared matches
  fastify.post('/verify', async (request: any, reply: any) => {
    try {
      const validation = validateRequest(RateVerifySchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { summonerName, region, verificationIconId, receiverUsername } = validation.data;
      const { gameName, tagLine } = parseRiotId(summonerName, region);

      // Find the receiver user
      const receiver = await prisma.user.findUnique({
        where: { username: receiverUsername },
        include: {
          riotAccounts: {
            where: { verified: true },
          },
        },
      });

      if (!receiver) {
        return reply.status(404).send({ error: 'User to rate not found' });
      }

      if (!receiver.riotAccounts.length) {
        return reply.status(400).send({ error: 'User has no verified Riot accounts' });
      }

      // Rate limiting: prevent brute force icon guessing
      const rateLimitKey = `rate:verify:attempts:${summonerName.toLowerCase()}:${region}`;
      const attempts = await cacheGet<number>(rateLimitKey) || 0;

      if (attempts >= 3) {
        return reply.status(429).send({
          error: 'Too many verification attempts. Please try again in 1 hour.',
          retryAfter: 3600
        });
      }

      // Fetch PUUID
      let raterPuuid: string;
      try {
        const puuid = await riotClient.getPuuid(gameName, tagLine, region);
        if (!puuid) {
          return reply.status(404).send({ error: 'Summoner not found on Riot' });
        }
        raterPuuid = puuid;
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(502).send({ error: 'Error fetching data from Riot API' });
      }

      // Fetch current icon (bypass cache for verification)
      let currentIcon: number | null;
      try {
        currentIcon = await riotClient.getProfileIcon({ summonerName, region, puuid: raterPuuid }, true);
      } catch (err: any) {
        if (err?.status === 404) {
          return reply.status(404).send({ error: 'Summoner not found on Riot' });
        }
        fastify.log.error(err);
        return reply.status(502).send({ error: 'Error fetching data from Riot API' });
      }

      // Verify icon matches
      if (currentIcon !== verificationIconId) {
        await cacheSet(rateLimitKey, attempts + 1, 3600);
        return reply.status(400).send({
          error: 'Profile icon does not match verification icon',
          currentIcon,
          expectedIcon: verificationIconId,
          attemptsRemaining: 2 - attempts
        });
      }

      // Clear rate limit on success
      await cacheSet(rateLimitKey, 0, 1);

      // Check for shared matches with any of receiver's Riot accounts
      let totalSharedMatches = 0;
      for (const receiverAccount of receiver.riotAccounts) {
        // Only check accounts in the same region cluster
        const { count } = await findSharedMatches(raterPuuid, receiverAccount.puuid, region);
        totalSharedMatches += count;
      }

      if (totalSharedMatches === 0) {
        return reply.status(403).send({
          error: 'No shared games found with this player. You must have played at least one game together to rate them.',
          sharedMatchesCount: 0
        });
      }

      // Find or create minimal user for rater
      let raterUser = await prisma.riotAccount.findFirst({
        where: { puuid: raterPuuid, region: region as any },
        include: { user: true },
      }).then((r: { user: any } | null) => r?.user);

      if (!raterUser) {
        // Create minimal user (no password/email)
        const username = `${gameName.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substr(2, 5)}`;

        raterUser = await prisma.user.create({
          data: {
            username,
            region: region as any,
            riotAccounts: {
              create: {
                puuid: raterPuuid,
                summonerName,
                gameName,
                tagLine,
                region: region as any,
                verified: true,
                verificationIconId,
                isMain: true,
              },
            },
          },
        });
      }

      // Check if already rated this user
      const existingRating = await prisma.rating.findFirst({
        where: { raterId: raterUser.id, receiverId: receiver.id },
      });

      if (existingRating) {
        return reply.status(400).send({ error: 'You have already rated this user' });
      }

      // Generate short-lived token for the rating session
      const raterToken = fastify.jwt.sign({
        raterId: raterUser.id,
        receiverId: receiver.id,
        sharedMatchesCount: totalSharedMatches,
        purpose: 'external_rating'
      }, { expiresIn: '15m' });

      return reply.send({
        success: true,
        raterToken,
        raterUserId: raterUser.id,
        sharedMatchesCount: totalSharedMatches,
        receiver: {
          id: receiver.id,
          username: receiver.username,
        }
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to verify Riot account' });
    }
  });

  // Submit rating
  fastify.post('/submit', async (request: any, reply: any) => {
    try {
      const validation = validateRequest(RateSubmitSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { raterToken, receiverId, stars, moons, comment } = validation.data;

      // Verify token
      let tokenData: { raterId: string; receiverId: string; sharedMatchesCount: number; purpose: string };
      try {
        tokenData = fastify.jwt.verify(raterToken);
      } catch (err) {
        return reply.status(401).send({ error: 'Invalid or expired rating session. Please verify again.' });
      }

      // Validate token purpose and receiver
      if (tokenData.purpose !== 'external_rating') {
        return reply.status(401).send({ error: 'Invalid token' });
      }

      if (tokenData.receiverId !== receiverId) {
        return reply.status(403).send({ error: 'Token does not match the user being rated' });
      }

      const raterId = tokenData.raterId;

      // Self-rating check
      if (raterId === receiverId) {
        return reply.status(400).send({ error: 'You cannot rate yourself' });
      }

      // Get rater info for notification
      const rater = await prisma.user.findUnique({
        where: { id: raterId },
        include: { badges: true },
      });

      if (!rater) {
        return reply.status(404).send({ error: 'Rater not found' });
      }

      const hasDeveloperBadge = rater.badges?.some((b: any) => b.key?.toLowerCase() === 'developer');

      if (!hasDeveloperBadge) {
        // Check daily rate limit (10 ratings per day)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const ratingsToday = await prisma.rating.count({
          where: {
            raterId,
            createdAt: { gte: oneDayAgo },
          },
        });

        if (ratingsToday >= 10) {
          return reply.status(429).send({ error: 'Daily rating limit reached. You can submit up to 10 ratings per day.' });
        }

        // Check cooldown and duplicate in transaction
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        try {
          await prisma.$transaction(async (tx: any) => {
            const existingFeedback = await tx.rating.findFirst({
              where: { raterId, receiverId },
            });

            if (existingFeedback) {
              throw new Error('ALREADY_RATED');
            }

            const recentRating = await tx.rating.findFirst({
              where: {
                raterId,
                createdAt: { gte: fiveMinutesAgo },
              },
            });

            if (recentRating) {
              throw new Error('COOLDOWN_ACTIVE');
            }
          });
        } catch (error: any) {
          if (error.message === 'ALREADY_RATED') {
            return reply.status(400).send({ error: 'You have already rated this user' });
          }
          if (error.message === 'COOLDOWN_ACTIVE') {
            return reply.status(429).send({ error: 'You can only rate once every 5 minutes' });
          }
          throw error;
        }
      }

      // Create rating
      const rating = await prisma.rating.create({
        data: {
          raterId,
          receiverId,
          stars,
          moons,
          comment: comment || '',
          sharedMatchesCount: tokenData.sharedMatchesCount,
        },
      });

      // Create notification for receiver
      await prisma.notification.create({
        data: {
          userId: receiverId,
          type: 'FEEDBACK_RECEIVED',
          fromUserId: raterId,
          feedbackId: rating.id,
          message: `You received ${stars} stars and ${moons} moons from ${rater.username}`,
        },
      });

      return reply.send({
        success: true,
        rating: {
          id: rating.id,
          stars: rating.stars,
          moons: rating.moons,
        }
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to submit rating' });
    }
  });
}
