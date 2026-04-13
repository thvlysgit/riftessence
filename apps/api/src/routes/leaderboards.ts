import prisma from '../prisma';

type LeaderboardType = 'overall' | 'skill' | 'personality' | 'rank' | 'ingame' | 'prismatic';

const VALID_LEADERBOARD_TYPES = new Set<LeaderboardType>([
  'overall',
  'skill',
  'personality',
  'rank',
  'ingame',
  'prismatic',
]);

const VALID_RANKS = new Set<string>([
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
  'UNRANKED',
]);

const VALID_DIVISIONS = new Set<string>(['I', 'II', 'III', 'IV']);

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

type MainAccountSnapshot = {
  rank: string | null;
  division: string | null;
  lp: number | null;
  winrate: number | null;
  region: string | null;
};

type RatingSnapshot = {
  skillStars: number;
  personalityMoons: number;
  ratingCount: number;
};

function normalizeLeaderboardType(value: unknown): LeaderboardType {
  const normalized = String(value || 'overall').toLowerCase();
  if (VALID_LEADERBOARD_TYPES.has(normalized as LeaderboardType)) {
    return normalized as LeaderboardType;
  }
  return 'overall';
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeRank(value: unknown): string | null {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized || !VALID_RANKS.has(normalized)) return null;
  return normalized;
}

function normalizeDivision(value: unknown): string | null {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized || !VALID_DIVISIONS.has(normalized)) return null;
  return normalized;
}

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

      const activeType = normalizeLeaderboardType(type);

      const parsedLimit = Number(limit);
      const parsedOffset = Number(offset);
      const limitNum = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.floor(parsedLimit), 1), 100) : 100;
      const offsetNum = Number.isFinite(parsedOffset) ? Math.max(0, Math.floor(parsedOffset)) : 0;

      const [users, mainAccountRows] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            username: true,
            verified: true,
            profileIconId: true,
            badges: {
              select: {
                key: true,
                name: true,
              },
              take: 3,
            },
            wallet: {
              select: {
                prismaticEssence: true,
              },
            },
          },
        }),
        prisma.$queryRaw<Array<{
          userId: string | null;
          rank: string | null;
          division: string | null;
          lp: number | null;
          winrate: number | null;
          region: string | null;
        }>>`
          SELECT DISTINCT ON ("userId")
            "userId",
            "rank"::text AS "rank",
            "division",
            "lp",
            "winrate",
            "region"::text AS "region"
          FROM "RiotAccount"
          WHERE "isMain" = true AND "userId" IS NOT NULL
          ORDER BY "userId", "createdAt" DESC
        `,
      ]);

      const mainAccountByUserId = new Map<string, MainAccountSnapshot>();
      mainAccountRows.forEach((row: {
        userId: string | null;
        rank: string | null;
        division: string | null;
        lp: number | null;
        winrate: number | null;
        region: string | null;
      }) => {
        if (!row.userId) return;
        mainAccountByUserId.set(row.userId, {
          rank: normalizeRank(row.rank),
          division: normalizeDivision(row.division),
          lp: toFiniteNumber(row.lp),
          winrate: toFiniteNumber(row.winrate),
          region: row.region ? String(row.region).toUpperCase() : null,
        });
      });

      let ratingsByUserId = new Map<string, RatingSnapshot>();
      if (activeType === 'overall' || activeType === 'skill' || activeType === 'personality') {
        const ratingRows = await prisma.rating.groupBy({
          by: ['receiverId'],
          _avg: {
            stars: true,
            moons: true,
          },
          _count: {
            _all: true,
          },
        });

        ratingsByUserId = new Map(
          ratingRows.map((row: any) => {
            const starsAvg = toFiniteNumber(row?._avg?.stars) || 0;
            const moonsAvg = toFiniteNumber(row?._avg?.moons) || 0;
            const count = toFiniteNumber(row?._count?._all) || 0;
            return [
              row.receiverId,
              {
                skillStars: roundToOneDecimal(starsAvg),
                personalityMoons: roundToOneDecimal(moonsAvg),
                ratingCount: Math.max(0, Math.floor(count)),
              },
            ] as const;
          }),
        );
      }

      // Calculate scores for each user
      const usersWithScores = users.map((user: any) => {
        const mainAccount = mainAccountByUserId.get(user.id) || null;
        const ratingSnapshot = ratingsByUserId.get(user.id) || {
          skillStars: 0,
          personalityMoons: 0,
          ratingCount: 0,
        };

        const skillStars = ratingSnapshot.skillStars;
        const personalityMoons = ratingSnapshot.personalityMoons;

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
          prismaticEssence: user.wallet?.prismaticEssence || 0,
          ratingCount: ratingSnapshot.ratingCount,
        };
      });

      // Filter and sort based on type
      let sorted: typeof usersWithScores = [];
      switch (activeType) {
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
        case 'prismatic':
          sorted = usersWithScores
            .filter((u: any) => u.prismaticEssence > 0)
            .sort((a: any, b: any) => b.prismaticEssence - a.prismaticEssence);
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
