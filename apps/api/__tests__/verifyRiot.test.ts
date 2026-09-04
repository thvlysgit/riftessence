jest.mock('../src/riotClient', () => ({ getProfileIcon: jest.fn() }));
jest.mock('../src/routes/scrims', () => ({ __esModule: true, default: async () => {} }));
process.env.JWT_SECRET = 'test-only-retired-route-secret-20260904';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/unused';
process.env.RIOT_API_KEY = 'test-only-key-never-used';
import * as riotClient from '../src/riotClient';
const prismaMock = {
  riotAccount: { findUnique: jest.fn(), update: jest.fn() },
  ipBlacklist: { findFirst: jest.fn().mockResolvedValue(null) },
  inputControlRule: { findMany: jest.fn().mockResolvedValue([]) },
};
(global as any).__PRISMA_MOCK = prismaMock;

describe('retired client-chosen Riot verification endpoints', () => {
  let app: any;
  beforeAll(async () => {
    const { default: build } = await import('../src/index');
    app = await build();
  });
  afterAll(async () => { await app?.close(); });

  test.each(['/verify/riot', '/verify/riot/by-summoner', '/api/user/verify-riot'])('%s cannot grant verification or login', async url => {
    const response = await app.inject({
      method: 'POST', url,
      payload: { summonerName: 'Victim#EUW', region: 'EUW', userId: 'victim', riotAccountId: 'account', verificationIconId: 7 },
    });
    expect(response.statusCode).toBe(410);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(prismaMock.riotAccount.update).not.toHaveBeenCalled();
    expect(riotClient.getProfileIcon).not.toHaveBeenCalled();
  });
});
