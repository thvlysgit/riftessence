import prisma from '../prisma';
import * as riotClient from '../riotClient';
import { createHash } from 'crypto';

// Temporary fallback PUUID generator until real Riot PUUID retrieval is implemented.
// Creates a deterministic hash so the same summonerName+region maps to same pseudo value.
function generatePseudoPuuid(summonerName: string, region: string) {
  return createHash('sha256')
    .update(`${summonerName.toLowerCase()}::${region.toUpperCase()}`)
    .digest('hex')
    .slice(0, 32); // shrink to 32 chars to keep indices smaller
}

export default async function userRoutes(fastify: any) {
  // Verify Riot account and create/link user
  fastify.post('/verify-riot', async (request: any, reply: any) => {
    try {
      const { summonerName, region, verificationIconId, userId } = request.body as {
        summonerName: string;
        region: string;
        verificationIconId: number;
        userId?: string;
      };

      fastify.log.info({ summonerName, region, verificationIconId, userId }, 'Verify riot request received');

      if (!summonerName || !region || verificationIconId === undefined) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      // Fetch current icon from Riot API
      let currentIcon: number | null;
      try {
        currentIcon = await riotClient.getProfileIcon({ summonerName, region, puuid: '' });
      } catch (err: any) {
        if (err && err.status === 404) {
          return reply.status(404).send({ error: 'Summoner not found on Riot' });
        }
        fastify.log.error(err);
        return reply.status(502).send({ error: 'Error fetching data from Riot API' });
      }

      // Check if current icon matches verification icon
      if (currentIcon !== verificationIconId) {
        return reply.status(400).send({ 
          error: 'Profile icon does not match verification icon',
          currentIcon,
          expectedIcon: verificationIconId
        });
      }

      // Find Riot account by summonerName + region (might be unlinked)
      let riotAccount = await prisma.riotAccount.findFirst({
        where: { summonerName, region: region as any },
        include: { user: true },
      });

      let user;
      if (riotAccount && riotAccount.user && !userId) {
        // Existing account already linked to a user (and no userId override supplied)
        // Just update verification and normalize blank puuid
        user = riotAccount.user;
        const puuidValue = riotAccount.puuid && riotAccount.puuid.trim() !== ''
          ? riotAccount.puuid
          : generatePseudoPuuid(summonerName, region);
        await prisma.riotAccount.update({
          where: { id: riotAccount.id },
          data: { verified: true, verificationIconId, puuid: puuidValue },
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
        
        // Link riot account to existing user (prevent transfers if already linked)
        if (riotAccount) {
          // Account exists - check if it's already linked to a different user
          if (riotAccount.userId && riotAccount.userId !== userId) {
            return reply.status(400).send({ 
              error: 'This Riot account is already linked to another user. Please unlink it first.' 
            });
          }
          
          // Account exists and either unlinked or already linked to this user - update it
          const puuidValue = riotAccount.puuid && riotAccount.puuid.trim() !== ''
            ? riotAccount.puuid
            : generatePseudoPuuid(summonerName, region);
          await prisma.riotAccount.update({
            where: { id: riotAccount.id },
            data: { userId, verified: true, verificationIconId, puuid: puuidValue, isMain: shouldBeMain },
          });
        } else {
          // Create new riot account linked to user
          const puuidValue = generatePseudoPuuid(summonerName, region);
          await prisma.riotAccount.create({
            data: {
              puuid: puuidValue, // TODO: Replace with real Riot PUUID
              summonerName,
              region: region as any,
              verified: true,
              verificationIconId,
              userId,
              isMain: shouldBeMain,
            },
          });
        }
        user = existingUser;
      } else {
        // New user - create account
        const username = `${summonerName.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substr(2, 5)}`;
        const puuidValue = generatePseudoPuuid(summonerName, region);
        
        user = await prisma.user.create({
          data: {
            username,
            region: region as any,
            riotAccounts: {
              create: {
                puuid: puuidValue, // TODO: Replace with real Riot PUUID
                summonerName,
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

      // TODO: Create session/JWT token here
      return reply.send({
        success: true,
        userId: user.id,
        username: user.username,
        message: 'Verification successful! You can now access your profile.',
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to verify Riot account' });
    }
  });

  // Get current user profile
  // Supports searching by userId or username via query parameters
  fastify.get('/profile', async (request: any, reply: any) => {
    try {
      const { userId, username, includeHidden } = (request.query as { userId?: string; username?: string; includeHidden?: string }) || {};
      const shouldIncludeHidden = includeHidden === 'true';

      let user;
      
      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            riotAccounts: true,
            discordAccount: true,
            badges: true,
            ratingsReceived: { 
              take: 10, 
              orderBy: { createdAt: 'desc' },
              include: { rater: { select: { username: true } } },
            },
            communityMemberships: { include: { community: true } },
          },
        });
      } else if (username) {
        user = await prisma.user.findUnique({
          where: { username },
          include: {
            riotAccounts: true,
            discordAccount: true,
            badges: true,
            ratingsReceived: { 
              take: 10, 
              orderBy: { createdAt: 'desc' },
              include: { rater: { select: { username: true } } },
            },
            communityMemberships: { include: { community: true } },
          },
        });
      } else {
        user = await prisma.user.findFirst({
          include: {
            riotAccounts: true,
            discordAccount: true,
            badges: true,
            ratingsReceived: { 
              take: 10, 
              orderBy: { createdAt: 'desc' },
              include: { rater: { select: { username: true } } },
            },
            communityMemberships: { include: { community: true } },
          },
        });
      }

      // Create a default user if none exists (for development)
      if (!user) {
        user = await prisma.user.create({
          data: { username: 'Summoner123', email: 'user@example.com' },
          include: {
            riotAccounts: true,
            discordAccount: true,
            badges: true,
            ratingsReceived: { 
              take: 10, 
              orderBy: { createdAt: 'desc' },
              include: { rater: { select: { username: true } } },
            },
            communityMemberships: { include: { community: true } },
          },
        });
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
              let detectedRole = null;
              if ((acc.isMain || acc.id === mainAccount?.id) && !user.preferredRole) {
                try {
                  detectedRole = await riotClient.detectPreferredRole(realPuuid, acc.region);
                  if (detectedRole) {
                    fastify.log.info({ detectedRole, userId: user.id }, 'Detected preferred role from match history');
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
              
              // Update user's preferred role if detected
              if (detectedRole && !user.preferredRole) {
                await prisma.user.update({
                  where: { id: user.id },
                  data: { preferredRole: detectedRole as any },
                });
                user.preferredRole = detectedRole as any;
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

      const profileData = {
        id: user.id,
        username: user.username,
        bio: user.bio,
        anonymous: user.anonymous,
        playstyles: user.playstyles,
        primaryRole: user.primaryRole,
        preferredRole: user.preferredRole, // Auto-detected from match history
        region: user.region,
        vcPreference: user.vcPreference,
        languages: user.languages,
        skillStars: Math.round(avgStars),
        personalityMoons: Math.round(avgMoons),
        reportCount: user.reportCount || 0,
        badges: user.badges.map((b: any) => b.name),
        championPoolMode: user.championPoolMode,
        championList: user.championList || [],
        championTierlist: user.championTierlist || null,
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
      const { playstyles } = request.body as { playstyles: string[] };

      if (!Array.isArray(playstyles) || playstyles.length > 2) {
        return reply.status(400).send({ error: 'Invalid playstyles. Maximum 2 allowed.' });
      }

      // TODO: Get userId from authenticated session
      const user = await prisma.user.findFirst();
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

  // Update username
  fastify.patch('/username', async (request: any, reply: any) => {
    try {
      const { username } = request.body as { username: string };
      const userId = request.query?.userId;

      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return reply.status(400).send({ error: 'Invalid username' });
      }

      const user = userId 
        ? await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } })
        : await prisma.user.findFirst({ include: { badges: true } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Check for developer badge to bypass cooldown
      const isDeveloper = user.badges?.some((badge: any) => badge.key === 'developer');

      // Check cooldown (30 days unless developer)
      let bypassedCooldown = null;
      if (user.lastUsernameChange) {
        const daysSinceChange = (Date.now() - new Date(user.lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceChange < 30) {
          const daysRemaining = Math.ceil(30 - daysSinceChange);
          if (!isDeveloper) {
            return reply.status(429).send({ error: `Username can only be changed once every 30 days. ${daysRemaining} days remaining.` });
          }
          bypassedCooldown = `Would have waited ${daysRemaining} more days without Developer badge`;
        }
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { username: username.trim(), lastUsernameChange: new Date() },
      });

      return reply.send({ success: true, username: updated.username, bypassedCooldown });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update username' });
    }
  });

  // Update languages
  fastify.patch('/languages', async (request: any, reply: any) => {
    try {
      const { languages } = request.body as { languages: string[] };
      const userId = request.query?.userId;

      if (!Array.isArray(languages)) {
        return reply.status(400).send({ error: 'Invalid languages format' });
      }

      const user = userId 
        ? await prisma.user.findUnique({ where: { id: userId } })
        : await prisma.user.findFirst();
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

  // Toggle anonymous mode
  fastify.patch('/anonymous', async (request: any, reply: any) => {
    try {
      const { anonymous } = request.body as { anonymous: boolean };

      // TODO: Get userId from authenticated session
      const user = await prisma.user.findFirst();
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
      const { mode, championList, championTierlist } = request.body as {
        mode: 'LIST' | 'TIERLIST';
        championList?: string[];
        championTierlist?: any;
      };
      const { userId } = (request.query as { userId?: string }) || {};

      // TODO: Get userId from authenticated session
      const user = userId
        ? await prisma.user.findUnique({ where: { id: userId } })
        : await prisma.user.findFirst();
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
          championList: mode === 'LIST' ? championList || [] : [],
          championTierlist: mode === 'TIERLIST' ? championTierlist : null,
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

  // Refresh Riot stats (rank + winrate) for a user's linked accounts
  fastify.post('/refresh-riot-stats', async (request: any, reply: any) => {
    try {
      const { userId } = (request.query as { userId?: string }) || {};
      const user = userId
        ? await prisma.user.findUnique({ where: { id: userId }, include: { riotAccounts: true } })
        : await prisma.user.findFirst({ include: { riotAccounts: true } });
      if (!user) return reply.status(404).send({ error: 'User not found' });

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

      // Clear cache to force fresh fetch on next profile load (including role detection)
      for (const acc of user.riotAccounts) {
        await prisma.riotAccount.update({
          where: { id: acc.id },
          data: { lastStatsUpdate: null }, // Clear cache timestamp
        });
      }

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

          // Choose best entry by tier order and division; compute winrate
          const tierOrder = ['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER','GRANDMASTER','CHALLENGER'];
          const divisionOrder = ['IV', 'III', 'II', 'I']; // IV is lowest, I is highest
          let bestRank: 'IRON'|'BRONZE'|'SILVER'|'GOLD'|'PLATINUM'|'EMERALD'|'DIAMOND'|'MASTER'|'GRANDMASTER'|'CHALLENGER'|'UNRANKED' = 'UNRANKED';
          let bestDivision: string | null = null;
          let bestWinrate: number | null = null;
          let bestLp: number | null = null;
          if (Array.isArray(entries) && entries.length > 0) {
            // Sort entries by tier then by division (higher is better)
            entries.sort((a: any, b: any) => {
              const tierDiff = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
              if (tierDiff !== 0) return tierDiff;
              // Same tier, compare divisions (only for tiers that have divisions)
              if (a.rank && b.rank) {
                return divisionOrder.indexOf(a.rank) - divisionOrder.indexOf(b.rank);
              }
              return 0;
            });
            const best = entries[entries.length - 1];
            bestRank = (best.tier as any) || 'UNRANKED';
            bestDivision = best.rank || null; // I, II, III, IV (null for Master+)
            const wins = Number(best.wins) || 0;
            const losses = Number(best.losses) || 0;
            const total = wins + losses;
            bestWinrate = total > 0 ? (wins / total) * 100 : null;
            bestLp = typeof best.leaguePoints === 'number' ? best.leaguePoints : null;
          }

          await prisma.riotAccount.update({
            where: { id: acc.id },
            data: { rank: bestRank as any, division: bestDivision, winrate: bestWinrate, lp: bestLp },
          });
        } catch (err) {
          fastify.log.warn({ err }, `Failed to refresh stats for account ${acc.id}`);
        }
      }

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to refresh Riot stats' });
    }
  });

  // Set main Riot account
  fastify.patch('/riot-accounts/:id/set-main', async (request: any, reply: any) => {
    try {
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
      const { id } = request.params as { id: string };

      const account = await prisma.riotAccount.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!account) {
        return reply.status(404).send({ error: 'Riot account not found' });
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

      await prisma.riotAccount.delete({
        where: { id },
      });

      return reply.send({ success: true, message: 'Riot account removed' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove Riot account' });
    }
  });

  // Assign badge to user
  fastify.post('/assign-badge', async (request: any, reply: any) => {
    try {
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

  // Remove badge from user
  fastify.post('/remove-badge', async (request: any, reply: any) => {
    try {
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
      const { userId } = request.query as { userId?: string };

      if (!userId) {
        return reply.send({ isAdmin: false });
      }

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
      const { q, limit = 10 } = request.query as { q?: string; limit?: number };

      if (!q || q.trim().length < 2) {
        return reply.send({ users: [] });
      }

      const users = await prisma.user.findMany({
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
        },
        take: Math.min(Number(limit), 20),
      });

      return reply.send({ users });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Search failed' });
    }
  });
}

