import Fastify from 'fastify';

jest.mock('../src/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    user: { findMany: jest.fn() },
    riotAccount: { findMany: jest.fn() },
    rating: { groupBy: jest.fn() },
  },
}));
jest.mock('../src/services/apiDiagnostics', () => ({
  recordRequestFailure: jest.fn(),
}));

import prisma from '../src/prisma';
import leaderboardRoutes from '../src/routes/leaderboards';

describe('leaderboard routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = Fastify({ logger: false });
    await app.register(leaderboardRoutes, { prefix: '/api' });

    (prisma.user.findMany as jest.Mock).mockResolvedValue([{
      id: 'user-1',
      username: 'Player One',
      verified: true,
      badges: [],
      wallet: { prismaticEssence: 12 },
    }]);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{
      userId: 'user-1',
      rank: 'DIAMOND',
      division: 'I',
      lp: 50,
      winrate: 55,
      region: 'EUW',
      profileIconId: 26,
    }]);
    (prisma.rating.groupBy as jest.Mock).mockResolvedValue([{
      receiverId: 'user-1',
      _avg: { stars: 4, moons: 5 },
      _count: { _all: 3 },
    }]);
  });

  afterEach(async () => {
    await app.close();
  });

  test('loads the profile icon from the main Riot account', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/leaderboards?type=overall',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().leaderboard).toEqual([
      expect.objectContaining({
        id: 'user-1',
        profileIconId: 26,
        rank: 'DIAMOND',
      }),
    ]);

    const userSelection = (prisma.user.findMany as jest.Mock).mock.calls[0][0].select;
    expect(userSelection).not.toHaveProperty('profileIconId');
  });
});
