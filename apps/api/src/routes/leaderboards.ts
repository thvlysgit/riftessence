import prisma from '../prisma';

// Rank tier values for scoring (higher is better)
const RANK_VALUES: Record<string, number> = {
  'IRON': 1,
  'BRONZE': 2,
  'SILVER': 3,
  'GOLD': 4,
  'PLATINUM': 5,
  'EMERALD': 6,
  'DIAMOND': 7,
  'MASTER': 8,
  'GRANDMASTER': 9,
  'CHALLENGER': 10,
  'UNRANKED': 0,
};

// Division values (higher is better, reversed from in-game)
const DIVISION_VALUES: Record<string, number> = {
  'IV': 1,
  'III': 2,
  'II': 3,
  'I': 4,
};

function calculateRankScore(rank: string | null, division: string | null, lp: number | null): number {
  if (!rank || rank === 'UNRANKED') return 0;
  
  const baseScore = (RANK_VALUES[rank] || 0) * 1000;
  
  // Master+ uses LP directly
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank)) {
    return baseScore + (lp || 0);
  }
  
  // Other ranks use division (0-400 range)
  const divScore = (DIVISION_VALUES[division || 'IV'] || 0) * 100;
  return baseScore + divScore;
}

function calculateInGameSkillScore(rank: string | null, division: string | null, lp: number | null, winrate: number | null): number {
  const rankScore = calculateRankScore(rank, division, lp);
  const winrateMultiplier = (winrate || 50) / 50; // 50% = 1.0x, 55% = 1.1x, 60% = 1.2x, 65% = 1.3x
  return Math.round(rankScore * winrateMultiplier);
}

function calculateOverallScore(
  skillStars: number,
  personalityMoons: number,
  rank: string | null,
  division: string | null,
  lp: number | null,
  winrate: number | null
): number {
  // Weighted combination:
  // - Skill stars: 30% (0-5 scale, multiply by 600 to get 0-3000 range)
  // - Personality moons: 20% (0-5 scale, multiply by 400 to get 0-2000 range)
  // - Rank: 30% (0-10000+ range, divide by 4 to normalize)
  // - Winrate: 20% (0-100 scale, multiply by 20 to get 0-2000 range)
  
  const skillScore = skillStars * 600;
  const personalityScore = personalityMoons * 400;
  const rankScore = calculateRankScore(rank, division, lp) / 4;
  const winrateScore = (winrate || 50) * 20;
  
  return skillScore + personalityScore + rankScore + winrateScore;
}

export default async function leaderboardRoutes(fastify: any) {
  fastify.get('/leaderboards', async (request: any, reply: any) => {
    try {
      const { type = 'overall', limit = 100, offset = 0 } = request.query as {
        type?: string;
        limit?: number;
        offset?: number;
      };

      const limitNum = Math.min(Number(limit), 100);
      const offsetNum = Math.max(0, Number(offset));

      // Fetch users with all necessary data
      const users = await prisma.user.findMany({
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
              rank: true,
              division: true,
              lp: true,
              winrate: true,
              region: true,
            },
            take: 1,
          },
          ratingsReceived: {
            select: {
              stars: true,
              moons: true,
            },
          },
        },
      });

      // Calculate scores for each user
      const usersWithScores = users.map((user: any) => {
        const mainAccount = user.riotAccounts[0] || null;
        
        // Calculate average ratings
        const ratings = user.ratingsReceived || [];
        const avgStars = ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + (r.stars || 0), 0) / ratings.length
          : 0;
        const avgMoons = ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + (r.moons || 0), 0) / ratings.length
          : 0;

        const skillStars = Math.round(avgStars * 10) / 10; // 1 decimal
        const personalityMoons = Math.round(avgMoons * 10) / 10;
        
        const rank = mainAccount?.rank || null;
        const division = mainAccount?.division || null;
        const lp = mainAccount?.lp || null;
        const winrate = mainAccount?.winrate || null;
        const region = mainAccount?.region || null;

        const rankScore = calculateRankScore(rank, division, lp);
        const inGameSkillScore = calculateInGameSkillScore(rank, division, lp, winrate);
        const overallScore = calculateOverallScore(skillStars, personalityMoons, rank, division, lp, winrate);

        return {
          id: user.id,
          username: user.username,
          verified: user.verified,
          profileIconId: user.profileIconId,
          badges: user.badges,
          skillStars,
          personalityMoons,
          rank,
          division,
          lp,
          winrate,
          region,
          rankScore,
          inGameSkillScore,
          overallScore,
          ratingCount: ratings.length,
        };
      });

      // Filter and sort based on type
      let sorted: typeof usersWithScores = [];
      switch (type) {
        case 'skill':
          sorted = usersWithScores
            .filter((u: any) => u.ratingCount >= 3) // Require at least 3 ratings
            .sort((a: any, b: any) => b.skillStars - a.skillStars);
          break;
        case 'personality':
          sorted = usersWithScores
            .filter((u: any) => u.ratingCount >= 3)
            .sort((a: any, b: any) => b.personalityMoons - a.personalityMoons);
          break;
        case 'rank':
          sorted = usersWithScores
            .filter((u: any) => u.rank && u.rank !== 'UNRANKED')
            .sort((a: any, b: any) => b.rankScore - a.rankScore);
          break;
        case 'ingame':
          sorted = usersWithScores
            .filter((u: any) => u.rank && u.rank !== 'UNRANKED' && u.winrate !== null)
            .sort((a: any, b: any) => b.inGameSkillScore - a.inGameSkillScore);
          break;
        case 'overall':
        default:
          sorted = usersWithScores
            .filter((u: any) => u.ratingCount >= 1 && u.rank && u.rank !== 'UNRANKED')
            .sort((a: any, b: any) => b.overallScore - a.overallScore);
          break;
      }

      const total = sorted.length;
      const paged = sorted.slice(offsetNum, offsetNum + limitNum);

      // Add rank position
      const withRank = paged.map((user: any, index: number) => ({
        ...user,
        position: offsetNum + index + 1,
      }));

      return reply.send({
        leaderboard: withRank,
        pagination: {
          total,
          offset: offsetNum,
          limit: limitNum,
          hasMore: offsetNum + limitNum < total,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch leaderboard' });
    }
  });
}
