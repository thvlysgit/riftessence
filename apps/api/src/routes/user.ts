import prisma from '../prisma';
import * as riotClient from '../riotClient';
import { createHash } from 'crypto';
import { VerifyRiotSchema, validateRequest } from '../validation';
import { cacheGet, cacheSet } from '../utils/cache';
import { getUserIdFromRequest } from '../middleware/auth';

// Temporary fallback PUUID generator until real Riot PUUID retrieval is implemented.
// Creates a deterministic hash so the same summonerName+region maps to same pseudo value.
function generatePseudoPuuid(summonerName: string, region: string) {
  return createHash('sha256')
    .update(`${summonerName.toLowerCase()}::${region.toUpperCase()}`)
    .digest('hex')
    .slice(0, 32); // shrink to 32 chars to keep indices smaller
}

// Rank score calculation for peak elo tracking
const RANK_VALUES: Record<string, number> = {
  'IRON': 1, 'BRONZE': 2, 'SILVER': 3, 'GOLD': 4, 'PLATINUM': 5,
  'EMERALD': 6, 'DIAMOND': 7, 'MASTER': 8, 'GRANDMASTER': 9, 'CHALLENGER': 10, 'UNRANKED': 0,
};
const DIVISION_VALUES: Record<string, number> = { 'IV': 1, 'III': 2, 'II': 3, 'I': 4 };

function calculateRankScore(rank: string | null, division: string | null, lp: number | null): number {
  if (!rank || rank === 'UNRANKED') return 0;
  const baseScore = (RANK_VALUES[rank] || 0) * 1000;
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank)) {
    return baseScore + (lp || 0);
  }
  return baseScore + (DIVISION_VALUES[division || 'IV'] || 0) * 100;
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

const RIOT_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

export default async function userRoutes(fastify: any) {
  const ensureSingleMainAccount = async (db: any, userId: string) => {
    const accounts = await db.riotAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, isMain: true },
    });

    if (accounts.length === 0) return;

    const mains = accounts.filter((acc: any) => acc.isMain);
    if (mains.length === 1) return;

    await db.riotAccount.updateMany({
      where: { userId },
      data: { isMain: false },
    });

    await db.riotAccount.update({
      where: { id: accounts[0].id },
      data: { isMain: true },
    });
  };

  // Verify Riot account and create/link user
  fastify.post('/verify-riot', async (request: any, reply: any) => {
    try {
      // Log raw request body for debugging
      fastify.log.info({ body: request.body }, 'Verify riot request received (raw body)');
      
      // Validate request body
      const validation = validateRequest(VerifyRiotSchema, request.body);
      if (!validation.success) {
        fastify.log.error({ errors: validation.errors, body: request.body }, 'Verification validation failed');
        return reply.status(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { summonerName, region, verificationIconId, userId } = validation.data;

      fastify.log.info({ summonerName, region, verificationIconId, userId }, 'Verify riot request validated');

      // Parse summoner name into gameName and tagLine first
      let gameName: string;
      let tagLine: string;
      
      if (summonerName.includes('#')) {
        const parts = summonerName.split('#');
        gameName = parts[0];
        tagLine = parts[1];
      } else {
        // Fallback if no tag provided
        gameName = summonerName;
        tagLine = region;
      }

      // Fetch PUUID first (required for profile icon lookup)
      let puuidValue: string;
      try {
        const realPuuid = await riotClient.getPuuid(gameName, tagLine, region);
        if (!realPuuid) {
          return reply.status(404).send({ error: 'Summoner not found on Riot' });
        }
        puuidValue = realPuuid;
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(502).send({ error: 'Error fetching data from Riot API' });
      }

      // Rate limiting: prevent brute force icon guessing
      // Allow max 3 verification attempts per summoner+region per hour
      const rateLimitKey = `riot:verify:attempts:${summonerName.toLowerCase()}:${region}`;
      const attempts = await cacheGet<number>(rateLimitKey) || 0;
      
      if (attempts >= 3) {
        return reply.status(429).send({ 
          error: 'Too many verification attempts. Please try again in 1 hour.',
          retryAfter: 3600 
        });
      }

      // Fetch current icon from Riot API (bypass cache for verification)
      let currentIcon: number | null;
      try {
        currentIcon = await riotClient.getProfileIcon({ summonerName, region, puuid: puuidValue }, true);
      } catch (err: any) {
        if (err && err.status === 404) {
          return reply.status(404).send({ error: 'Summoner not found on Riot' });
        }
        fastify.log.error(err);
        return reply.status(502).send({ error: 'Error fetching data from Riot API' });
      }

      // Check if current icon matches verification icon
      if (currentIcon !== verificationIconId) {
        // Increment failed attempt counter
        await cacheSet(rateLimitKey, attempts + 1, 3600); // 1 hour TTL
        
        return reply.status(400).send({ 
          error: 'Profile icon does not match verification icon',
          currentIcon,
          expectedIcon: verificationIconId,
          attemptsRemaining: 2 - attempts
        });
      }

      // Success! Clear rate limit counter
      await cacheSet(rateLimitKey, 0, 1);

      // Resolve account by stable Riot identity first, then fall back to legacy summonerName+region lookup.
      let riotAccount = await prisma.riotAccount.findUnique({
        where: {
          puuid_region: {
            puuid: puuidValue,
            region: region as any,
          },
        },
        include: { user: true },
      });

      if (!riotAccount) {
        riotAccount = await prisma.riotAccount.findFirst({
          where: { summonerName, region: region as any },
          include: { user: true },
        });
      }

      let user;
      if (riotAccount && riotAccount.user && !userId) {
        // Existing account already linked to a user (and no userId override supplied)
        // Just update verification and use fetched PUUID
        user = riotAccount.user;
        await prisma.riotAccount.update({
          where: { id: riotAccount.id },
          data: {
            verified: true,
            verificationIconId,
            puuid: puuidValue,
            summonerName,
            gameName,
            tagLine,
          },
        });
      } else if (userId) {
        // User is adding another account to their existing profile
        const existingUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) {
          return reply.status(404).send({ error: 'User not found' });
        }
        
        // Check if user has any existing accounts to determine if this should be main
        const existingAccountsCount = await prisma.riotAccount.count({
          where: { userId },
        });
        const shouldBeMain = existingAccountsCount === 0;
        
        // Link riot account to existing user
        if (riotAccount) {
          const previousOwnerUserId = riotAccount.userId && riotAccount.userId !== userId
            ? riotAccount.userId
            : null;

          const updateData: any = {
            userId,
            verified: true,
            verificationIconId,
            puuid: puuidValue,
            summonerName,
            gameName,
            tagLine,
          };

          // If the account is unlinked or moved from another user, assign main only when needed.
          if (!riotAccount.userId || previousOwnerUserId) {
            updateData.isMain = shouldBeMain;
          }

          if (previousOwnerUserId) {
            await prisma.$transaction(async (tx: any) => {
              await tx.riotAccount.update({
                where: { id: riotAccount.id },
                data: updateData,
              });

              await ensureSingleMainAccount(tx, userId);
              await ensureSingleMainAccount(tx, previousOwnerUserId);
            });
          } else {
            await prisma.riotAccount.update({
              where: { id: riotAccount.id },
              data: updateData,
            });

            await ensureSingleMainAccount(prisma, userId);
          }
        } else {
          // Create new riot account linked to user
          await prisma.riotAccount.create({
            data: {
              puuid: puuidValue,
              summonerName,
              gameName,
              tagLine,
              region: region as any,
              verified: true,
              verificationIconId,
              userId,
              isMain: shouldBeMain,
            },
          });

          await ensureSingleMainAccount(prisma, userId);
        }
        user = existingUser;
      } else if (riotAccount && !riotAccount.userId) {
        // Legacy/unlinked Riot account exists: create user and attach this account instead of recreating it.
        const username = `${summonerName.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substr(2, 5)}`;

        user = await prisma.user.create({
          data: {
            username,
            region: region as any,
          },
        });

        await prisma.riotAccount.update({
          where: { id: riotAccount.id },
          data: {
            userId: user.id,
            verified: true,
            verificationIconId,
            puuid: puuidValue,
            summonerName,
            gameName,
            tagLine,
            isMain: true,
          },
        });

        await ensureSingleMainAccount(prisma, user.id);
      } else {
        // New user - create account
        const username = `${summonerName.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substr(2, 5)}`;
        
        user = await prisma.user.create({
          data: {
            username,
            region: region as any,
            riotAccounts: {
              create: {
                puuid: puuidValue,
                summonerName,
                gameName,
                tagLine,
                region: region as any,
                verified: true,
                verificationIconId,
                isMain: true, // First account is always main
              },
            },
          },
          include: {
            riotAccounts: true,
          },
        });
      }

      // Generate JWT token for the user
      const token = fastify.jwt.sign({ userId: user.id });

      return reply.send({
        success: true,
        userId: user.id,
        username: user.username,
        token,
        message: 'Verification successful! You can now access your profile.',
      });
    } catch (error: any) {
      fastify.log.error({
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack,
      }, 'Riot verification failed');
      return reply.status(500).send({ error: 'Failed to verify Riot account' });
    }
  });

  // Get current user profile
  // Supports searching by userId or username via query parameters
  fastify.get('/profile', async (request: any, reply: any) => {
    try {
      const { userId, username, includeHidden } = (request.query as { userId?: string; username?: string; includeHidden?: string }) || {};
      const shouldIncludeHidden = includeHidden === 'true';

      const fullProfileInclude = {
        riotAccounts: true,
        discordAccount: true,
        badges: true,
        ratingsReceived: {
          take: 10,
          orderBy: { createdAt: 'desc' as const },
          include: { rater: { select: { username: true } } },
        },
        communityMemberships: { include: { community: true } },
      };

      const legacyProfileSelect = {
        id: true,
        username: true,
        bio: true,
        region: true,
        vcPreference: true,
        languages: true,
        password: true,
        riotAccounts: {
          select: {
            id: true,
            summonerName: true,
            region: true,
            puuid: true,
          },
        },
        discordAccount: {
          select: {
            username: true,
          },
        },
      };

      const ultraLegacyProfileSelect = {
        id: true,
        username: true,
        password: true,
        bio: true,
        region: true,
        riotAccounts: {
          select: {
            id: true,
            summonerName: true,
            region: true,
          },
        },
      };

      let user: any;
      let authenticatedUserId: string | null = null;
      let targetUserId = userId;
      let usedLegacySchemaFallback = false;
      
      // If no userId or username provided, try to get from JWT token
      if (!userId && !username) {
        const authHeader = request.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const decoded = request.server.jwt.verify(token) as { userId: string };
            authenticatedUserId = decoded.userId;
            targetUserId = decoded.userId;
          } catch (err) {
            // Invalid token, will fall through to default behavior
          }
        }

        // Never fall back to arbitrary users when no explicit profile target is provided.
        if (!targetUserId) {
          return reply.status(401).send({ error: 'Authentication required' });
        }
      }

      try {
        if (targetUserId) {
          user = await prisma.user.findUnique({
            where: { id: targetUserId },
            include: fullProfileInclude,
          });
        } else if (username) {
          user = await prisma.user.findUnique({
            where: { username },
            include: fullProfileInclude,
          });
        }
      } catch (profileQueryError: any) {
        if (!isPrismaSchemaMismatchError(profileQueryError)) {
          throw profileQueryError;
        }

        usedLegacySchemaFallback = true;
        fastify.log.error({
          reqId: request.id,
          code: profileQueryError?.code,
          message: profileQueryError?.message,
        }, 'Profile fallback activated due to schema mismatch. Run prisma migrate deploy.');

        try {
          if (targetUserId) {
            user = await prisma.user.findUnique({
              where: { id: targetUserId },
              select: legacyProfileSelect,
            });
          } else if (username) {
            user = await prisma.user.findUnique({
              where: { username },
              select: legacyProfileSelect,
            });
          }
        } catch (legacyProfileError: any) {
          if (!isPrismaSchemaMismatchError(legacyProfileError)) {
            throw legacyProfileError;
          }

          fastify.log.error({
            reqId: request.id,
            code: legacyProfileError?.code,
            message: legacyProfileError?.message,
          }, 'Profile ultra-legacy fallback activated due to deeper schema mismatch.');

          if (targetUserId) {
            user = await prisma.user.findUnique({
              where: { id: targetUserId },
              select: ultraLegacyProfileSelect,
            });
          } else if (username) {
            user = await prisma.user.findUnique({
              where: { username },
              select: ultraLegacyProfileSelect,
            });
          }
        }
      }

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      if (usedLegacySchemaFallback) {
        user.badges = [];
        user.ratingsReceived = [];
        user.communityMemberships = [];
      }

      user.riotAccounts = user.riotAccounts || [];
      user.badges = user.badges || [];
      user.ratingsReceived = user.ratingsReceived || [];
      user.communityMemberships = user.communityMemberships || [];

      if (authenticatedUserId && user.id === authenticatedUserId && !user.password) {
        try {
          const now = new Date();
          const startOfUtcDay = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0,
            0,
            0,
            0
          ));

          const existingReminder = await prisma.notification.findFirst({
            where: {
              userId: user.id,
              type: 'PASSWORD_SETUP_REMINDER',
              createdAt: { gte: startOfUtcDay },
            },
            select: { id: true },
          });

          if (!existingReminder) {
            await prisma.notification.create({
              data: {
                userId: user.id,
                type: 'PASSWORD_SETUP_REMINDER',
                message: 'Set a password to log back in quickly with username + password only. No email is required, and you can skip the Riot authentication flow next time.',
              },
            });
          }
        } catch (reminderError: any) {
          fastify.log.warn({ err: reminderError, userId: user.id }, 'Could not create daily password setup reminder notification');
        }
      }

      // Filter hidden accounts if not requested to include them
      if (!shouldIncludeHidden) {
        // Don't filter out hidden accounts, just mark them for frontend to hide username
        user.riotAccounts = user.riotAccounts.map((acc: any) => ({
          ...acc,
          // Keep the hidden flag so frontend knows to hide the username
        }));
      }

      // Calculate average ratings
      const avgStars =
        user.ratingsReceived.length > 0
          ? user.ratingsReceived.reduce((sum: number, r: any) => sum + r.stars, 0) / user.ratingsReceived.length
          : 0;
      const avgMoons =
        user.ratingsReceived.length > 0
          ? user.ratingsReceived.reduce((sum: number, r: any) => sum + r.moons, 0) / user.ratingsReceived.length
          : 0;

      // Calculate game activity across all linked accounts with caching
      let totalGamesPerDay = 0;
      let totalGamesPerWeek = 0;
      let profileIconId = null;
      
      if (user.riotAccounts.length > 0) {
        const mainAccount = user.riotAccounts.find((acc: any) => acc.isMain) || user.riotAccounts[0];
        
        // Get profile icon from cache or fetch if needed
        if (mainAccount) {
          if (mainAccount.profileIconId) {
            profileIconId = mainAccount.profileIconId;
          }
        }
        
        for (const acc of user.riotAccounts) {
          try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            // Check if we have recent cached stats (less than 1 hour old)
            if (acc.lastStatsUpdate && new Date(acc.lastStatsUpdate) > oneHourAgo) {
              // Use cached stats
              totalGamesPerDay += acc.gamesPerDay || 0;
              totalGamesPerWeek += acc.gamesPerWeek || 0;
              fastify.log.info({ accountId: acc.id, cached: true }, 'Using cached game activity');
            } else {
              // Fetch fresh stats
              fastify.log.info({ region: acc.region, summonerName: acc.summonerName }, 'Fetching fresh game activity');
              
              // Fetch real PUUID from Riot API
              let realPuuid = acc.puuid;
              let fetchedIconId = null;
              try {
                const gameName = acc.summonerName.split('#')[0] || acc.summonerName;
                const tagLine = acc.summonerName.split('#')[1] || acc.region;
                const routingHost = acc.region === 'NA' ? 'americas.api.riotgames.com' :
                                     ['EUW', 'EUNE'].includes(acc.region) ? 'europe.api.riotgames.com' :
                                     ['KR', 'JP'].includes(acc.region) ? 'asia.api.riotgames.com' :
                                     'americas.api.riotgames.com';
                const accountUrl = `https://${routingHost}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
                const apiKey = process.env.RIOT_API_KEY;
                const accountResp = await fetch(accountUrl, { headers: { 'X-Riot-Token': apiKey || '' } });
                if (accountResp.ok) {
                  const accountData = await accountResp.json();
                  realPuuid = accountData.puuid;
                  
                  // Fetch profile icon if this is the main account
                  if (acc.isMain || acc.id === mainAccount?.id) {
                    try {
                      fetchedIconId = await riotClient.getProfileIcon({
                        puuid: realPuuid,
                        summonerName: acc.summonerName,
                        region: acc.region,
                      });
                      if (fetchedIconId) profileIconId = fetchedIconId;
                    } catch (err) {
                      fastify.log.warn({ err }, 'Failed to fetch profile icon');
                    }
                  }
                }
              } catch (err) {
                fastify.log.warn({ err }, 'Failed to fetch real PUUID');
              }
              
              const activity = await riotClient.calculateGameActivity(realPuuid, acc.region);
              totalGamesPerDay += activity.gamesPerDay;
              totalGamesPerWeek += activity.gamesPerWeek;
              
              // Detect preferred role from match history (only for main account or first account)
              // Always detect if user is missing preferredRole OR secondaryRole
              let detectedRoles = null;
              if ((acc.isMain || acc.id === mainAccount?.id) && (!user.preferredRole || !user.secondaryRole)) {
                try {
                  detectedRoles = await riotClient.detectPreferredRole(realPuuid, acc.region);
                  if (detectedRoles) {
                    fastify.log.info({ detectedRoles, userId: user.id }, 'Detected preferred roles from match history');
                  }
                } catch (err) {
                  fastify.log.warn({ err }, 'Failed to detect preferred role');
                }
              }
              
              // Update cache in database
              await prisma.riotAccount.update({
                where: { id: acc.id },
                data: {
                  gamesPerDay: activity.gamesPerDay,
                  gamesPerWeek: activity.gamesPerWeek,
                  profileIconId: fetchedIconId || acc.profileIconId,
                  lastStatsUpdate: now,
                  puuid: realPuuid, // Update with real PUUID
                },
              });
              
              // Update user's preferred role and secondary role if detected
              // Update if either role is missing
              if (detectedRoles && (!user.preferredRole || !user.secondaryRole)) {
                try {
                  await prisma.user.update({
                    where: { id: user.id },
                    data: {
                      preferredRole: detectedRoles.primary as any,
                      secondaryRole: detectedRoles.secondary as any,
                    },
                    select: {
                      id: true,
                    },
                  });
                } catch (roleUpdateError: any) {
                  if (!isPrismaSchemaMismatchError(roleUpdateError)) {
                    throw roleUpdateError;
                  }

                  fastify.log.warn({
                    reqId: request.id,
                    userId: user.id,
                    code: roleUpdateError?.code,
                    message: roleUpdateError?.message,
                  }, 'Skipping preferred-role persistence due to schema mismatch.');
                }
                user.preferredRole = detectedRoles.primary as any;
                user.secondaryRole = detectedRoles.secondary as any;
              }
              
              fastify.log.info({ activity, accountId: acc.id }, 'Cached fresh game activity');
            }
          } catch (err) {
            fastify.log.warn({ err, accountId: acc.id }, 'Failed to fetch game activity, using cached or zero');
            // Fall back to cached values or zero
            totalGamesPerDay += acc.gamesPerDay || 0;
            totalGamesPerWeek += acc.gamesPerWeek || 0;
          }
        }
      }
      
      fastify.log.info({ totalGamesPerDay, totalGamesPerWeek, profileIconId }, 'Total game activity calculated');

      const normalizedPlaystyles = Array.isArray(user.playstyles) ? user.playstyles : [];
      const normalizedLanguages = Array.isArray(user.languages) ? user.languages : [];
      const normalizedChampionList = Array.isArray(user.championList) ? user.championList : [];
      const normalizedUnlockedCosmetics = Array.isArray(user.unlockedCosmetics) ? user.unlockedCosmetics : [];
      const normalizedChampionTierlist =
        user.championTierlist && typeof user.championTierlist === 'object'
          ? user.championTierlist
          : null;
      const normalizedOnboardingCompleted =
        typeof user.onboardingCompleted === 'boolean'
          ? user.onboardingCompleted
          : user.riotAccounts.length > 0;

      const profileData = {
        id: user.id,
        username: user.username,
        bio: user.bio,
        anonymous: typeof user.anonymous === 'boolean' ? user.anonymous : false,
        playstyles: normalizedPlaystyles,
        primaryRole: user.primaryRole || null,
        preferredRole: user.preferredRole || null, // Auto-detected from match history (most played)
        secondaryRole: user.secondaryRole || null, // Auto-detected second most played role
        region: user.region,
        vcPreference: user.vcPreference,
        languages: normalizedLanguages,
        skillStars: Math.round(avgStars),
        personalityMoons: Math.round(avgMoons),
        reportCount: user.reportCount || 0,
        peakRank: user.peakRank || null,
        peakDivision: user.peakDivision || null,
        peakLp: user.peakLp || null,
        peakDate: user.peakDate?.toISOString() || null,
        badges: user.badges.map((b: any) => ({ key: b.key, name: b.name })),
        championPoolMode: user.championPoolMode || 'TIERLIST',
        championList: normalizedChampionList,
        championTierlist: normalizedChampionTierlist,
        onboardingCompleted: normalizedOnboardingCompleted,
        gamesPerDay: totalGamesPerDay,
        gamesPerWeek: totalGamesPerWeek,
        profileIconId,
        riotAccounts: user.riotAccounts.map((acc: any, index: number) => ({
          id: acc.id,
          gameName: acc.summonerName.split('#')[0] || acc.summonerName,
          tagLine: acc.summonerName.split('#')[1] || acc.region,
          region: acc.region,
          isMain: acc.isMain || false, // Use actual isMain field from database
          verified: acc.verified,
          hidden: acc.hidden || false,
          rank: acc.rank || 'UNRANKED',
          division: acc.division || null,
          winrate: acc.winrate || null,
          profileIconId: acc.isMain || index === 0 ? profileIconId : null,
        })),
        discordLinked: !!user.discordAccount,
        discordUsername: user.discordAccount?.username || null,
        discordDmNotifications: !!user.discordDmNotifications,
        unlockedCosmetics: normalizedUnlockedCosmetics,
        activeUsernameDecoration: user.activeUsernameDecoration || null,
        activeHoverEffect: user.activeHoverEffect || null,
        activeVisualEffect: user.activeVisualEffect || null,
        activeNameplateFont: user.activeNameplateFont || null,
        adCredits: typeof user.adCredits === 'number' ? user.adCredits : 0,
        communities: user.communityMemberships.map((m: any) => ({
          id: m.community.id,
          name: m.community.name,
          role: m.role,
        })),
        feedback: user.ratingsReceived.map((r: any) => ({
          id: r.id,
          stars: r.stars,
          moons: r.moons,
          comment: r.comment,
          date: r.createdAt.toISOString().split('T')[0],
          raterUsername: r.rater?.username || 'Anonymous',
        })),
      };

      return reply.send(profileData);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch profile' });
    }
  });

  // Update user playstyles
  fastify.patch('/playstyles', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      const { playstyles } = request.body as { playstyles: string[] };

      if (!Array.isArray(playstyles) || playstyles.length > 2) {
        return reply.status(400).send({ error: 'Invalid playstyles. Maximum 2 allowed.' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { playstyles },
      });

      return reply.send({ success: true, playstyles: updated.playstyles });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update playstyles' });
    }
  });

  // Mark onboarding as completed
  fastify.post('/onboarding-complete', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await prisma.user.update({
        where: { id: userId },
        data: { onboardingCompleted: true },
      });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to mark onboarding complete' });
    }
  });

  // Update username
  fastify.patch('/username', async (request: any, reply: any) => {
    try {
      const { username } = request.body as { username: string };
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return reply.status(400).send({ error: 'Invalid username' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Check for developer badge to bypass cooldown
      const isDeveloper = user.badges?.some((badge: any) => badge.key?.toLowerCase() === 'developer');

      // Use transaction to prevent race condition:
      // 1. Check cooldown atomically
      // 2. Update username atomically
      // If another request updates in between, transaction will fail and retry
      const updated = await prisma.$transaction(async (tx: any) => {
        const currentUser = await tx.user.findUnique({ where: { id: user.id } });
        if (!currentUser) throw new Error('User no longer exists');

        // Check cooldown within transaction
        if (currentUser.lastUsernameChange) {
          const daysSinceChange = (Date.now() - new Date(currentUser.lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceChange < 30 && !isDeveloper) {
            const daysRemaining = Math.ceil(30 - daysSinceChange);
            throw new Error(`Username can only be changed once every 30 days. ${daysRemaining} days remaining.`);
          }
        }

        // Perform update atomically
        return await tx.user.update({
          where: { id: user.id },
          data: { username: username.trim(), lastUsernameChange: new Date() },
        });
      }, { 
        maxWait: 5000, // Wait up to 5 seconds for lock
        timeout: 10000 // Transaction timeout 10 seconds
      });

      return reply.send({ success: true, username: updated.username });
    } catch (error: any) {
      if (error.message?.includes('only be changed once every')) {
        return reply.status(429).send({ error: error.message });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update username' });
    }
  });

  // Update languages
  fastify.patch('/languages', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      const { languages } = request.body as { languages: string[] };

      if (!Array.isArray(languages)) {
        return reply.status(400).send({ error: 'Invalid languages format' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { languages },
      });

      return reply.send({ success: true, languages: updated.languages });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update languages' });
    }
  });

  // Update user bio
  fastify.patch('/bio', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { bio } = request.body as { bio?: string | null };

      if (bio !== null && bio !== undefined && typeof bio !== 'string') {
        return reply.status(400).send({ error: 'Invalid bio format' });
      }

      const normalizedBio = typeof bio === 'string' ? bio.trim() : '';
      if (normalizedBio.length > 220) {
        return reply.status(400).send({ error: 'Bio must be 220 characters or fewer.' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { bio: normalizedBio.length > 0 ? normalizedBio : null },
      });

      return reply.send({ success: true, bio: updated.bio });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update bio' });
    }
  });

  // Toggle anonymous mode
  fastify.patch('/anonymous', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      const { anonymous } = request.body as { anonymous: boolean };

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { anonymous },
      });

      return reply.send({ success: true, anonymous: updated.anonymous });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update anonymous mode' });
    }
  });

  // Update champion pool
  fastify.patch('/champion-pool', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      const { mode, championList, championTierlist } = request.body as {
        mode: 'LIST' | 'TIERLIST';
        championList?: string[];
        championTierlist?: any;
      };

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Validate champion list (max 5)
      if (mode === 'LIST' && championList && championList.length > 5) {
        return reply.status(400).send({ error: 'Champion list cannot exceed 5 champions' });
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          championPoolMode: mode,
          championList: mode === 'LIST' ? championList || [] : undefined,
          championTierlist: mode === 'TIERLIST' ? championTierlist : undefined,
        },
      });

      return reply.send({
        success: true,
        championPoolMode: updated.championPoolMode,
        championList: updated.championList,
        championTierlist: updated.championTierlist,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update champion pool' });
    }
  });

  // Get user's top played champions (based on mastery)
  fastify.get('/champion-mastery', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const user = await prisma.user.findUnique({ 
        where: { id: userId }, 
        include: { riotAccounts: true } 
      });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Find main account or first account
      const mainAccount = user.riotAccounts.find((acc: any) => acc.isMain) || user.riotAccounts[0];
      if (!mainAccount) {
        return reply.send({ champions: [], error: 'No linked Riot account' });
      }

      // Fetch mastery data
      const masteries = await riotClient.getTopChampionMasteries(
        mainAccount.puuid, 
        mainAccount.region, 
        15 // Get top 15 champions
      );

      return reply.send({ 
        champions: masteries.map(m => m.championName),
        masteryData: masteries 
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.send({ champions: [], error: 'Failed to fetch mastery data' });
    }
  });

  // Refresh Riot stats (rank + winrate) for a user's linked accounts
  fastify.post('/refresh-riot-stats', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      let user: any = null;
      let usedLegacySchemaFallback = false;

      try {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            peakRank: true,
            peakDivision: true,
            peakLp: true,
            riotAccounts: {
              select: {
                id: true,
                summonerName: true,
                region: true,
                rank: true,
                division: true,
                lp: true,
                lastStatsUpdate: true,
              },
            },
          },
        });
      } catch (userQueryError: any) {
        if (!isPrismaSchemaMismatchError(userQueryError)) {
          throw userQueryError;
        }

        usedLegacySchemaFallback = true;
        fastify.log.warn({
          reqId: request.id,
          userId,
          code: userQueryError?.code,
          message: userQueryError?.message,
        }, 'refresh-riot-stats fallback activated due to schema mismatch.');

        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            riotAccounts: {
              select: {
                id: true,
                summonerName: true,
                region: true,
                rank: true,
                division: true,
                lp: true,
                lastStatsUpdate: true,
              },
            },
          },
        });
      }

      if (!user) return reply.status(404).send({ error: 'User not found' });

      const now = Date.now();
      const mostRecentStatsUpdateMs = user.riotAccounts.reduce((latest: number, acc: any) => {
        const updatedAt = acc?.lastStatsUpdate ? new Date(acc.lastStatsUpdate).getTime() : 0;
        return Number.isFinite(updatedAt) && updatedAt > latest ? updatedAt : latest;
      }, 0);

      if (mostRecentStatsUpdateMs > 0) {
        const elapsedMs = now - mostRecentStatsUpdateMs;
        if (elapsedMs >= 0 && elapsedMs < RIOT_REFRESH_COOLDOWN_MS) {
          const retryAfterSeconds = Math.ceil((RIOT_REFRESH_COOLDOWN_MS - elapsedMs) / 1000);
          return reply.send({
            success: true,
            skipped: true,
            reason: 'refresh_cooldown',
            retryAfterSeconds,
          });
        }
      }

      const apiKey = process.env.RIOT_API_KEY;
      if (!apiKey) return reply.status(500).send({ error: 'Riot API key not configured' });

      // Helper functions (inline to avoid circular imports)
      const REGION_TO_PLATFORM: Record<string, string> = {
        NA: 'na1', EUW: 'euw1', EUNE: 'eun1', KR: 'kr', JP: 'jp1', OCE: 'oc1', LAN: 'la1', LAS: 'la2', BR: 'br1', RU: 'ru'
      };
      const REGION_TO_ROUTING: Record<string, string> = {
        NA: 'americas', EUW: 'europe', EUNE: 'europe', KR: 'asia', JP: 'asia', OCE: 'sea', LAN: 'americas', LAS: 'americas', BR: 'americas', RU: 'europe'
      };
      const platformHostForRegion = (region: string) => {
        const p = REGION_TO_PLATFORM[region as keyof typeof REGION_TO_PLATFORM];
        if (!p) throw new Error(`Unsupported region: ${region}`);
        return `${p}.api.riotgames.com`;
      };
      const routingHostForRegion = (region: string) => {
        const r = REGION_TO_ROUTING[region as keyof typeof REGION_TO_ROUTING];
        if (!r) throw new Error(`Unsupported region: ${region}`);
        return `${r}.api.riotgames.com`;
      };

      const updateRiotAccountSafely = async (accountId: string, data: any) => {
        try {
          await prisma.riotAccount.update({
            where: { id: accountId },
            data,
          });
        } catch (updateError: any) {
          if (!isPrismaSchemaMismatchError(updateError)) {
            throw updateError;
          }

          const fallbackData: any = {};
          if (Object.prototype.hasOwnProperty.call(data, 'rank')) fallbackData.rank = data.rank;
          if (Object.prototype.hasOwnProperty.call(data, 'division')) fallbackData.division = data.division;
          if (Object.prototype.hasOwnProperty.call(data, 'winrate')) fallbackData.winrate = data.winrate;

          if (Object.keys(fallbackData).length === 0) {
            return;
          }

          await prisma.riotAccount.update({
            where: { id: accountId },
            data: fallbackData,
          });
        }
      };

      for (const acc of user.riotAccounts) {
        try {
          // Parse gameName/tagLine
          const summonerName = acc.summonerName;
          let gameName: string;
          let tagLine: string;
          if (summonerName.includes('#')) {
            const parts = summonerName.split('#');
            gameName = parts[0];
            tagLine = parts[1];
          } else {
            gameName = summonerName;
            tagLine = acc.region;
          }

          // Get PUUID via account API
          const routingHost = routingHostForRegion(acc.region);
          const accountUrl = `https://${routingHost}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
          const accountResp = await fetch(accountUrl, { headers: { 'X-Riot-Token': apiKey } });
          if (!accountResp.ok) throw new Error(`Account API error ${accountResp.status}`);
          const accountData = await accountResp.json();
          const puuid = accountData.puuid;

          // Get ranked entries directly by PUUID (League v4 now supports this)
          const platformHost = platformHostForRegion(acc.region);
          const leagueUrl = `https://${platformHost}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
          const leagueResp = await fetch(leagueUrl, { headers: { 'X-Riot-Token': apiKey } });
          if (!leagueResp.ok) throw new Error(`League API error ${leagueResp.status}`);
          const entries = await leagueResp.json();

          // Choose entry: always prefer RANKED_SOLO_5x5; fall back to RANKED_FLEX_SR only if unranked in solo
          const tierOrder = ['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER','GRANDMASTER','CHALLENGER'];
          const divisionOrder = ['IV', 'III', 'II', 'I']; // IV is lowest, I is highest
          let bestRank: 'IRON'|'BRONZE'|'SILVER'|'GOLD'|'PLATINUM'|'EMERALD'|'DIAMOND'|'MASTER'|'GRANDMASTER'|'CHALLENGER'|'UNRANKED' = 'UNRANKED';
          let bestDivision: string | null = null;
          let bestWinrate: number | null = null;
          let bestLp: number | null = null;
          if (Array.isArray(entries) && entries.length > 0) {
            const soloEntry = entries.find((e: any) => e.queueType === 'RANKED_SOLO_5x5');
            const flexEntry = entries.find((e: any) => e.queueType === 'RANKED_FLEX_SR');
            // Solo/duo always takes priority; flex is fallback only
            const best = soloEntry || flexEntry;
            if (best) {
              bestRank = (best.tier as any) || 'UNRANKED';
              bestDivision = best.rank || null; // I, II, III, IV (null for Master+)
              const wins = Number(best.wins) || 0;
              const losses = Number(best.losses) || 0;
              const total = wins + losses;
              bestWinrate = total > 0 ? (wins / total) * 100 : null;
              bestLp = typeof best.leaguePoints === 'number' ? best.leaguePoints : null;
            }
          }

          await updateRiotAccountSafely(acc.id, {
            rank: bestRank as any,
            division: bestDivision,
            winrate: bestWinrate,
            lp: bestLp,
          });
        } catch (err) {
          fastify.log.warn({ err }, `Failed to refresh stats for account ${acc.id}`);
        }
      }

      // Update peak elo if current highest rank is higher than stored peak
      let updatedUser: any = null;
      if (!usedLegacySchemaFallback) {
        try {
          updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              peakRank: true,
              peakDivision: true,
              peakLp: true,
              riotAccounts: {
                select: {
                  rank: true,
                  division: true,
                  lp: true,
                },
              },
            },
          });
        } catch (updatedUserError: any) {
          if (!isPrismaSchemaMismatchError(updatedUserError)) {
            throw updatedUserError;
          }

          fastify.log.warn({
            reqId: request.id,
            userId,
            code: updatedUserError?.code,
            message: updatedUserError?.message,
          }, 'Skipping peak elo refresh lookup due to schema mismatch.');
          updatedUser = null;
        }
      }

      if (updatedUser) {
        let highestScore = 0;
        let highestRank: string | null = null;
        let highestDiv: string | null = null;
        let highestLp: number | null = null;
        for (const acc of updatedUser.riotAccounts) {
          const score = calculateRankScore(acc.rank, acc.division, acc.lp);
          if (score > highestScore) {
            highestScore = score;
            highestRank = acc.rank;
            highestDiv = acc.division;
            highestLp = acc.lp;
          }
        }
        const peakScore = calculateRankScore(updatedUser.peakRank, updatedUser.peakDivision, updatedUser.peakLp);
        if (highestScore > peakScore) {
          try {
            await prisma.user.update({
              where: { id: userId },
              data: {
                peakRank: highestRank as any,
                peakDivision: highestDiv,
                peakLp: highestLp,
                peakDate: new Date(),
              },
            });
            fastify.log.info({ userId, peak: { rank: highestRank, division: highestDiv, lp: highestLp } }, 'New peak elo recorded');
          } catch (peakUpdateError: any) {
            if (!isPrismaSchemaMismatchError(peakUpdateError)) {
              throw peakUpdateError;
            }

            fastify.log.warn({
              reqId: request.id,
              userId,
              code: peakUpdateError?.code,
              message: peakUpdateError?.message,
            }, 'Skipping peak elo update due to schema mismatch.');
          }
        }
      }

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      if (isPrismaSchemaMismatchError(error)) {
        return reply.send({
          success: true,
          degraded: true,
          message: 'Stats refresh partially skipped due to schema mismatch. Run prisma migrate deploy.',
        });
      }
      return reply.status(500).send({ error: 'Failed to refresh Riot stats' });
    }
  });

  // Set main Riot account
  fastify.patch('/riot-accounts/:id/set-main', async (request: any, reply: any) => {
    try {
      const requesterId = await getUserIdFromRequest(request, reply);
      if (!requesterId) return;

      const { id } = request.params as { id: string };

      // Find the account to verify it exists
      const account = await prisma.riotAccount.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!account) {
        return reply.status(404).send({ error: 'Riot account not found' });
      }

      if (!account.userId) {
        return reply.status(400).send({ error: 'Account is not linked to a user' });
      }

      if (account.userId !== requesterId) {
        return reply.status(403).send({ error: 'You can only manage your own Riot accounts' });
      }

      // Set all other accounts for this user to isMain=false
      await prisma.riotAccount.updateMany({
        where: { userId: account.userId },
        data: { isMain: false },
      });

      // Set this account as main
      await prisma.riotAccount.update({
        where: { id },
        data: { isMain: true },
      });

      return reply.send({ success: true, message: 'Main account updated' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to set main account' });
    }
  });

  // Toggle hidden status of Riot account
  fastify.patch('/riot-accounts/:id/toggle-hidden', async (request: any, reply: any) => {
    try {
      const requesterId = await getUserIdFromRequest(request, reply);
      if (!requesterId) return;

      const { id } = request.params as { id: string };
      const { hidden } = request.body as { hidden: boolean };

      // Find the account to verify it exists
      const account = await prisma.riotAccount.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!account) {
        return reply.status(404).send({ error: 'Riot account not found' });
      }

      if (!account.userId) {
        return reply.status(400).send({ error: 'Account is not linked to a user' });
      }

      if (account.userId !== requesterId) {
        return reply.status(403).send({ error: 'You can only manage your own Riot accounts' });
      }

      // Update the hidden status
      await prisma.riotAccount.update({
        where: { id },
        data: { hidden: hidden },
      });

      return reply.send({ success: true, message: 'Account visibility updated' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update account visibility' });
    }
  });

  // Remove Riot account
  fastify.delete('/riot-accounts/:id', async (request: any, reply: any) => {
    try {
      const requesterId = await getUserIdFromRequest(request, reply);
      if (!requesterId) return;

      const { id } = request.params as { id: string };

      const account = await prisma.riotAccount.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!account) {
        return reply.status(404).send({ error: 'Riot account not found' });
      }

      if (!account.userId || account.userId !== requesterId) {
        return reply.status(403).send({ error: 'You can only remove your own Riot accounts' });
      }

      // Check if this is the last account for the user
      if (account.userId) {
        const accountCount = await prisma.riotAccount.count({
          where: { userId: account.userId },
        });
        
        if (accountCount === 1) {
          return reply.status(400).send({ error: 'Cannot remove last Riot account. Users must have at least one linked account.' });
        }

        // If removing the main account, set another one as main
        if (account.isMain) {
          const nextAccount = await prisma.riotAccount.findFirst({
            where: { 
              userId: account.userId,
              id: { not: id },
            },
          });
          
          if (nextAccount) {
            await prisma.riotAccount.update({
              where: { id: nextAccount.id },
              data: { isMain: true },
            });
          }
        }
      }

      await prisma.riotAccount.delete({ where: { id } });

      await ensureSingleMainAccount(prisma, requesterId);

      return reply.send({ success: true, message: 'Riot account removed' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove Riot account' });
    }
  });

  // Assign badge to user (admin only)
  fastify.post('/assign-badge', async (request: any, reply: any) => {
    try {
      // SECURITY: Verify admin making the request
      const adminId = await getUserIdFromRequest(request, reply);
      if (!adminId) return;

      // Check if requester is admin
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        include: { badges: true },
      });
      if (!admin || !admin.badges.some((b: any) => b.key === 'admin')) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const { userId, badgeKey } = request.body as { userId: string; badgeKey: string };

      if (!userId || !badgeKey) {
        return reply.status(400).send({ error: 'userId and badgeKey are required' });
      }

      // Find or create badge
      let badge = await prisma.badge.findUnique({ where: { key: badgeKey } });
      if (!badge) {
        return reply.status(404).send({ error: 'Badge not found. Create it first in the database.' });
      }

      // Check if user exists
      const user = await prisma.user.findUnique({ 
        where: { id: userId },
        include: { badges: true },
      });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Check if badge is already assigned
      const alreadyHasBadge = user.badges.some((b: any) => b.key === badgeKey);
      if (alreadyHasBadge) {
        return reply.send({ success: true, message: 'User already has this badge' });
      }

      // Assign badge
      await prisma.user.update({
        where: { id: userId },
        data: {
          badges: {
            connect: { id: badge.id },
          },
        },
      });

      return reply.send({ success: true, message: 'Badge assigned successfully' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to assign badge' });
    }
  });

  // Remove badge from user (admin only)
  fastify.post('/remove-badge', async (request: any, reply: any) => {
    try {
      // SECURITY: Verify admin making the request
      const adminId = await getUserIdFromRequest(request, reply);
      if (!adminId) return;

      // Check if requester is admin
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        include: { badges: true },
      });
      if (!admin || !admin.badges.some((b: any) => b.key === 'admin')) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const { userId, badgeKey } = request.body as { userId: string; badgeKey: string };

      if (!userId || !badgeKey) {
        return reply.status(400).send({ error: 'userId and badgeKey are required' });
      }

      const badge = await prisma.badge.findUnique({ where: { key: badgeKey } });
      if (!badge) {
        return reply.status(404).send({ error: 'Badge not found' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          badges: {
            disconnect: { id: badge.id },
          },
        },
      });

      return reply.send({ success: true, message: 'Badge removed successfully' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove badge' });
    }
  });

  // List all available badges
  fastify.get('/badges', async (request: any, reply: any) => {
    try {
      const badges = await prisma.badge.findMany({
        orderBy: { name: 'asc' },
      });
      return reply.send({ badges });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch badges' });
    }
  });

  // Update badge description (admin only)
  fastify.patch('/badge/:key', async (request: any, reply: any) => {
    try {
      const { key } = request.params as { key: string };
      const { description } = request.body as { description: string };
      const { userId } = request.query as { userId?: string };

      if (!userId) {
        return reply.status(401).send({ error: 'User authentication required' });
      }

      // Check if user has admin badge
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const isAdmin = user.badges?.some((badge: any) => badge.key === 'admin');
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Admin privileges required' });
      }

      // Update badge description
      const badge = await prisma.badge.update({
        where: { key },
        data: { description },
      });

      return reply.send({ success: true, badge });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update badge' });
    }
  });

  // Check if user has admin badge (used for frontend auth checks)
  fastify.get('/check-admin', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return; // getUserIdFromRequest already sent error response

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });

      if (!user) {
        return reply.send({ isAdmin: false });
      }

      const isAdmin = user.badges?.some((badge: any) => badge.key === 'admin');
      return reply.send({ isAdmin });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.send({ isAdmin: false });
    }
  });

  // Search users by username (for user discovery)
  fastify.get('/search', async (request: any, reply: any) => {
    try {
      const { q, limit = 10, offset = 0 } = request.query as { q?: string; limit?: number; offset?: number };

      if (!q || q.trim().length < 2) {
        return reply.send({ users: [], pagination: { total: 0, offset: 0, limit: Math.min(Number(limit), 20), hasMore: false } });
      }

      const limitNum = Math.min(Number(limit), 20);
      const offsetNum = Math.max(0, Number(offset));

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            username: {
              contains: q,
              mode: 'insensitive',
            },
          },
          select: {
            id: true,
            username: true,
            verified: true,
            badges: {
              select: {
                key: true,
                name: true,
              },
            },
            riotAccounts: {
              where: { isMain: true },
              select: {
                id: true,
              },
              take: 1,
            },
          },
          take: limitNum,
          skip: offsetNum,
        }),
        prisma.user.count({
          where: {
            username: {
              contains: q,
              mode: 'insensitive',
            },
          },
        }),
      ]);

      // Fetch profile icons for users with Riot accounts
      const usersWithIcons = await Promise.all(
        users.map(async (user: any) => {
          let profileIconId = null;
          if (user.riotAccounts && user.riotAccounts.length > 0) {
            const mainAccountId = user.riotAccounts[0].id;
            const account = await prisma.riotAccount.findUnique({
              where: { id: mainAccountId },
            });
            if (account && account.puuid) {
              try {
                const iconData = await riotClient.getProfileIcon(
                  { summonerName: account.summonerName, region: account.region, puuid: account.puuid },
                  false
                );
                profileIconId = iconData;
              } catch (err) {
                fastify.log.error('Failed to fetch profile icon:', err);
              }
            }
          }
          return {
            id: user.id,
            username: user.username,
            verified: user.verified,
            badges: user.badges,
            profileIconId,
          };
        })
      );

      return reply.send({
        users: usersWithIcons,
        pagination: {
          total,
          offset: offsetNum,
          limit: limitNum,
          hasMore: offsetNum + limitNum < total,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Search failed' });
    }
  });

  // Toggle Discord DM notifications for chat messages
  fastify.patch('/discord-dm-notifications', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { enabled } = request.body as { enabled: boolean };
      if (typeof enabled !== 'boolean') {
        return reply.code(400).send({ error: 'enabled must be a boolean' });
      }

      // Verify user has a linked Discord account before enabling
      if (enabled) {
        const discordAccount = await prisma.discordAccount.findUnique({
          where: { userId },
        });
        if (!discordAccount) {
          return reply.code(400).send({ error: 'You must link a Discord account before enabling DM notifications' });
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { discordDmNotifications: enabled },
      });

      return reply.send({ success: true, discordDmNotifications: enabled });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to toggle Discord DM notifications' });
    }
  });
}

