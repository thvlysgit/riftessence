import build from '../src/index';
import prisma from '../src/prisma';

describe('POST /api/posts', () => {
  let app: any;
  beforeAll(async () => {
    app = await build();
  });

  test('rejects when riot account not owned by user', async () => {
    // create user and riot account for a different user
    const owner = await prisma.user.create({ data: { username: 'owner_' + Date.now() } });
    const other = await prisma.user.create({ data: { username: 'other_' + Date.now() } });
    const riotAcc = await prisma.riotAccount.create({
      data: { puuid: 'p'+Date.now(), summonerName: 'Name#EUW', region: 'EUW', userId: other.id }
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/posts',
      payload: {
        userId: owner.id,
        postingRiotAccountId: riotAcc.id,
        region: 'EUW', role: 'FLEX', message: 'hi', anonymous: false, languages: [], vcPreference: 'SOMETIMES'
      }
    });

    expect(res.statusCode).toBe(403);
  });
});
