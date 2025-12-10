jest.mock('../src/riotClient');
const riotClient = require('../src/riotClient');

const prismaMock = {
  riotAccount: {
    findUnique: jest.fn(),
    update: jest.fn(),
  }
};

// Inject the mock via global so the app module can pick it up without initializing a real client.
(global as any).__PRISMA_MOCK = prismaMock;
const prisma = require('../src/prisma').default;

// Require the app after mocks are in place so the module imports are mocked correctly.
const build = require('../src/index').default;

describe('POST /verify/riot', () => {
  let app: any;
  beforeAll(async () => {
    app = await build();
  });

  beforeEach(() => {
    prisma.riotAccount.findUnique.mockReset();
    prisma.riotAccount.update.mockReset();
    riotClient.getProfileIcon.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  test('succeeds when icons match and marks verified', async () => {
    const fakeAccount = { id: 'ra-1', puuid: 'puuid-1', summonerName: 'Summ', region: 'NA', userId: 'user-1', verified: false };
    prisma.riotAccount.findUnique.mockResolvedValue(fakeAccount);
    riotClient.getProfileIcon.mockResolvedValue(1234);
    prisma.riotAccount.update.mockResolvedValue({ ...fakeAccount, verified: true });

    const res = await app.inject({ method: 'POST', url: '/verify/riot', payload: { userId: 'user-1', riotAccountId: 'ra-1', verificationIconId: 1234 } });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(prisma.riotAccount.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ra-1' }, data: { verified: true } }));
  });

  test('fails when icons do not match', async () => {
    const fakeAccount = { id: 'ra-2', puuid: 'puuid-2', summonerName: 'Summ2', region: 'NA', userId: 'user-2', verified: false };
    prisma.riotAccount.findUnique.mockResolvedValue(fakeAccount);
    riotClient.getProfileIcon.mockResolvedValue(9999);

    const res = await app.inject({ method: 'POST', url: '/verify/riot', payload: { userId: 'user-2', riotAccountId: 'ra-2', verificationIconId: 1234 } });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toMatch(/Profile icon/);
    expect(prisma.riotAccount.update).not.toHaveBeenCalled();
  });
});
