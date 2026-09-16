import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { comparisonToken } from '../src/services/itemPriceGame';

// Opt in with a dedicated, migrated PostgreSQL database. Never use DATABASE_URL
// implicitly: these tests change global settings and must not touch a live app.
const testUrl = process.env.TEST_DATABASE_URL;
const suite = testUrl ? describe : describe.skip;
suite('PE economy against PostgreSQL', () => {
  let app: FastifyInstance;
  let db: any;
  let settings: any;
  let admin: string;
  const users: string[] = [];
  const prefix = `pe_test_${randomUUID().slice(0, 8)}`;
  const createUser = async () => {
    const user = await db.user.create({ data: { username: `${prefix}_${users.length}` } });
    users.push(user.id);
    return user.id as string;
  };
  const call = (
    userId: string | null,
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    payload?: Record<string, unknown>,
    key?: string,
  ) =>
    app.inject({
      method,
      url: `/api${url}`,
      payload,
      headers: {
        ...(userId ? { authorization: `Bearer ${app.jwt.sign({ userId })}` } : {}),
        ...(key ? { 'idempotency-key': key } : {}),
      },
    });
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (
      !url.pathname.endsWith('_test') ||
      !['127.0.0.1', 'localhost', 'postgres'].includes(url.hostname)
    )
      throw new Error(
        'TEST_DATABASE_URL must point to a local/CI PostgreSQL database ending in _test.',
      );
    process.env.DATABASE_URL = testUrl;
    process.env.JWT_SECRET = 'economy-integration-tests-only-secret';
    process.env.RIOT_API_KEY = 'test-only';
    db = require('../src/prisma').default;
    app = Fastify();
    await app.register(cookie);
    await app.register(jwt, { secret: process.env.JWT_SECRET });
    for (const module of ['wallet', 'games', 'economyAdmin', 'ads'])
      await app.register(require(`../src/routes/${module}`).default, { prefix: '/api' });
    await app.ready();
    settings = await db.economySettings.upsert({
      where: { id: 'global' },
      create: { id: 'global' },
      update: {},
    });
    admin = await createUser();
    const badge = await db.badge.upsert({
      where: { key: 'admin' },
      create: { key: 'admin', name: 'Admin' },
      update: {},
    });
    await db.user.update({ where: { id: admin }, data: { badges: { connect: { id: badge.id } } } });
  }, 30000);
  beforeEach(async () => {
    await db.economySettings.update({
      where: { id: 'global' },
      data: {
        starterGrant: 400,
        dailyCheckin: 60,
        dailySocial: 40,
        championReward: 60,
        soundReward: 60,
        itemReward: 60,
        recipeReward: 60,
        dailyGameCap: 120,
        gameRewardsEnabled: true,
      },
    });
  });
  afterAll(async () => {
    if (db && settings) {
      const { id, updatedAt, ...data } = settings;
      await db.economySettings.update({ where: { id }, data });
      await db.ad.deleteMany({ where: { createdBy: { in: users } } });
      await db.auditLog.deleteMany({ where: { adminId: { in: users } } });
      await db.notification.deleteMany({
        where: { OR: [{ userId: { in: users } }, { fromUserId: { in: users } }] },
      });
      await db.user.deleteMany({ where: { id: { in: users } } });
    }
    await app?.close();
    await db?.$disconnect();
  });
  test('concurrent first visits grant one starter balance and one ledger entry', async () => {
    const user = await createUser();
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => call(user, 'GET', '/wallet/summary')),
    );
    expect(responses.every((r) => r.statusCode === 200)).toBe(true);
    expect(responses.map((r) => r.json().wallet.prismaticEssence)).toEqual(Array(8).fill(400));
    expect(
      await db.walletTransaction.count({ where: { userId: user, type: 'WELCOME_BONUS' } }),
    ).toBe(1);
  });
  test('legacy coins convert exactly once without inflating lifetime earnings or XP', async () => {
    const user = await createUser();
    await db.wallet.create({
      data: {
        userId: user,
        riftCoins: 250,
        prismaticEssence: 600,
        totalPrismaticEarned: 900,
        experience: 100,
      },
    });
    await Promise.all(Array.from({ length: 5 }, () => call(user, 'GET', '/wallet/summary')));
    const wallet = await db.wallet.findUnique({ where: { userId: user } });
    expect(wallet).toMatchObject({
      riftCoins: 0,
      prismaticEssence: 850,
      totalPrismaticEarned: 900,
      experience: 100,
    });
    expect(
      await db.walletTransaction.count({ where: { userId: user, type: 'LEGACY_CONVERSION' } }),
    ).toBe(1);
  });
  test('concurrent daily check-ins pay once; unavailable social challenge cannot mint PE', async () => {
    const user = await createUser();
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => call(user, 'POST', '/wallet/quests/DAILY_CHECKIN/claim', {})),
    );
    expect(responses.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect(responses.filter((r) => r.statusCode === 409)).toHaveLength(3);
    expect((await call(user, 'GET', '/wallet/summary')).json().wallet.prismaticEssence).toBe(460);
    expect(
      (await call(user, 'POST', '/wallet/quests/DAILY_SOCIAL_SPARK/claim', {})).statusCode,
    ).toBe(409);
  });
  test('purchase retries charge once and conflicting payloads cannot reuse an operation ID', async () => {
    const user = await createUser();
    await call(
      admin,
      'POST',
      '/wallet/admin/grant-pe',
      { targetUserId: user, amount: 1000, reason: 'Test funding' },
      randomUUID(),
    );
    const key = randomUUID();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        call(user, 'POST', '/wallet/cosmetics/USERNAME_TIDAL_INK/purchase', {}, key),
      ),
    );
    expect(responses.every((r) => r.statusCode === 200)).toBe(true);
    expect((await call(user, 'GET', '/wallet/summary')).json().wallet.prismaticEssence).toBe(750);
    expect(
      await db.walletTransaction.count({ where: { userId: user, type: 'SHOP_PURCHASE' } }),
    ).toBe(1);
    expect(
      (await call(user, 'POST', '/wallet/cosmetics/USERNAME_ROSE_QUARTZ/purchase', {}, key))
        .statusCode,
    ).toBe(409);
    expect(
      (await call(user, 'POST', '/wallet/cosmetics/USERNAME_TIDAL_INK/activate', {})).statusCode,
    ).toBe(200);
    expect((await db.user.findUnique({ where: { id: user } })).activeUsernameDecoration).toBe(
      'username_tidal_ink',
    );
  });
  test('competing purchases cannot overdraw; unowned and prerequisite items remain locked', async () => {
    const user = await createUser();
    await call(
      admin,
      'POST',
      '/wallet/admin/grant-pe',
      { targetUserId: user, amount: 600, reason: 'Test funding' },
      randomUUID(),
    );
    const results = await Promise.all(
      ['USERNAME_TIDAL_INK', 'USERNAME_ROSE_QUARTZ'].map((item) =>
        call(user, 'POST', `/wallet/cosmetics/${item}/purchase`, {}, randomUUID()),
      ),
    );
    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect(results.filter((r) => r.statusCode === 400)).toHaveLength(1);
    expect(
      (await call(user, 'GET', '/wallet/summary')).json().wallet.prismaticEssence,
    ).toBeGreaterThanOrEqual(0);
    expect(
      (await call(user, 'POST', '/wallet/cosmetics/USERNAME_MOONLIT/activate', {})).statusCode,
    ).toBe(400);
    expect(
      (await call(user, 'POST', '/wallet/cosmetics/BADGE_ORACLE_DICE/purchase', {}, randomUUID()))
        .statusCode,
    ).toBe(400);
  });
  test('a daily round is unique; concurrent winning guesses credit one reward', async () => {
    const user = await createUser();
    const rounds = await Promise.all(
      Array.from({ length: 4 }, () => call(user, 'POST', '/games/archive/start', {})),
    );
    const id = rounds[0].json().id;
    expect(rounds.every((r) => r.statusCode === 200 && r.json().id === id)).toBe(true);
    expect(rounds[0].json().answer).toBeNull();
    const answer = (await db.gameRound.findUnique({ where: { id } })).championId;
    const guesses = await Promise.all(
      Array.from({ length: 5 }, () =>
        call(user, 'POST', `/games/rounds/${id}/guess`, { championId: answer }),
      ),
    );
    expect(guesses.every((r) => r.statusCode === 200 && r.json().rewardPaid === 60)).toBe(true);
    expect(await db.walletTransaction.count({ where: { userId: user, type: 'GAME_REWARD' } })).toBe(
      1,
    );
    expect((await call(user, 'GET', '/wallet/summary')).json().wallet.prismaticEssence).toBe(460);
  });
  test('both game rewards share the cap; practice and paused rewards cannot mint PE', async () => {
    await db.economySettings.update({ where: { id: 'global' }, data: { dailyGameCap: 75 } });
    const user = await createUser();
    for (const game of ['archive', 'soundcheck']) {
      const { id } = (await call(user, 'POST', `/games/${game}/start`, {})).json();
      const answer = (await db.gameRound.findUnique({ where: { id } })).championId;
      expect(
        (await call(user, 'POST', `/games/rounds/${id}/guess`, { championId: answer })).statusCode,
      ).toBe(200);
    }
    expect((await call(user, 'GET', '/games')).json().earnedToday).toBe(75);
    const { id } = (await call(user, 'POST', '/games/archive/start', { practice: true })).json();
    const answer = (await db.gameRound.findUnique({ where: { id } })).championId;
    expect(
      (await call(user, 'POST', `/games/rounds/${id}/guess`, { championId: answer })).json()
        .rewardPaid,
    ).toBe(0);
    const other = await createUser();
    const paused = (await call(other, 'POST', '/games/archive/start', {})).json();
    await db.economySettings.update({
      where: { id: 'global' },
      data: { gameRewardsEnabled: false },
    });
    expect(
      (
        await call(other, 'POST', `/games/rounds/${paused.id}/guess`, {
          championId: (await db.gameRound.findUnique({ where: { id: paused.id } })).championId,
        })
      ).json().rewardPaid,
    ).toBe(0);
  });
  test('audio is authenticated, opaque audio-only bytes and another account cannot play or answer the round', async () => {
    const user = await createUser();
    const other = await createUser();
    const { id } = (await call(user, 'POST', '/games/soundcheck/start', {})).json();
    expect((await call(null, 'GET', `/games/rounds/${id}/audio/0`)).statusCode).toBe(401);
    expect((await call(other, 'GET', `/games/rounds/${id}/audio/0`)).statusCode).toBe(404);
    expect(
      (await call(other, 'POST', `/games/rounds/${id}/guess`, { championId: 'Ahri' })).statusCode,
    ).toBe(404);
    const audio = await call(user, 'GET', `/games/rounds/${id}/audio/0`);
    expect(audio.statusCode).toBe(200);
    expect(audio.headers['content-type']).toBe('audio/mpeg');
    expect(audio.headers['cache-control']).toContain('no-store');
    expect(audio.headers.location).toBeUndefined();
    expect(audio.rawPayload.length).toBeGreaterThan(2500);
  });
  test('duplicate guesses, six failures and expired rounds never pay', async () => {
    const user = await createUser();
    const { id } = (await call(user, 'POST', '/games/archive/start', {})).json();
    const answer = (await db.gameRound.findUnique({ where: { id } })).championId;
    const wrong = require('../src/services/dailyGames')
      .champions.filter((c: any) => c.id !== answer)
      .slice(0, 6);
    for (const champion of wrong) {
      await call(user, 'POST', `/games/rounds/${id}/guess`, { championId: champion.id });
      await call(user, 'POST', `/games/rounds/${id}/guess`, { championId: champion.id });
    }
    const round = await db.gameRound.findUnique({ where: { id } });
    expect(round).toMatchObject({ finished: true, won: false, rewardPaid: 0 });
    expect(round.guesses).toHaveLength(6);
    expect(
      (await call(user, 'POST', `/games/rounds/${id}/guess`, { championId: answer })).json()
        .rewardPaid,
    ).toBe(0);
    const expired = (await call(user, 'POST', '/games/soundcheck/start', {})).json();
    await db.gameRound.update({ where: { id: expired.id }, data: { day: '2000-01-01' } });
    expect(
      (await call(user, 'POST', `/games/rounds/${expired.id}/guess`, { championId: 'Ahri' }))
        .statusCode,
    ).toBe(409);
  });
  const solveRecipes = async (user: string, id: string, skip = 0) => {
    const stored = await db.gameRound.findUnique({ where: { id } });
    let result: any;
    for (let index = skip; index < 3; index++) {
      const recipe = stored.recipePuzzle.recipes[index];
      for (const piece of recipe.tray.filter((p: any) =>
        recipe.ingredientIds.includes(p.item.id),
      )) {
        result = await call(user, 'POST', `/games/rounds/${id}/recipe`, {
          action: 'add',
          index,
          pieceKey: piece.key,
        });
        expect(result.statusCode).toBe(200);
      }
    }
    return result.json();
  };
  test('Recipe Rush validates ownership and ingredients; concurrent mistakes and final submissions charge/pay once', async () => {
    const user = await createUser(),
      other = await createUser();
    expect((await call(null, 'POST', '/games/recipe-rush/start', {})).statusCode).toBe(401);
    const start = (await call(user, 'POST', '/games/recipe-rush/start', {})).json();
    expect(start.current.slots).toBe(2);
    expect(start).not.toHaveProperty('recipePuzzle');
    expect(start.current).not.toHaveProperty('ingredientIds');
    expect(start.history).toEqual([]);
    expect((await call(user, 'GET', '/games')).json().games).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'recipe-rush', reward: 60 })]),
    );
    const id = start.id,
      url = `/games/rounds/${id}/recipe`;
    expect((await call(other, 'POST', url, { action: 'reveal', index: 0 })).statusCode).toBe(404);
    expect(
      (await call(user, 'POST', url, { action: 'add', index: 0, pieceKey: 'fake' })).statusCode,
    ).toBe(400);
    expect((await call(user, 'POST', url, { action: 'reveal', index: 1 })).statusCode).toBe(409);
    expect(
      (await call(user, 'POST', `/games/rounds/${id}/guess`, { championId: 'Ahri' })).statusCode,
    ).toBe(400);
    expect(
      (await call(user, 'POST', `/games/rounds/${id}/price`, { index: 0, choice: 'higher' }))
        .statusCode,
    ).toBe(404);
    const stored = await db.gameRound.findUnique({ where: { id } });
    const first = stored.recipePuzzle.recipes[0];
    const wrong = first.tray.find((p: any) => !first.ingredientIds.includes(p.item.id));
    const wrongResponses = await Promise.all(
      [1, 2, 3].map(() =>
        call(user, 'POST', url, { action: 'add', index: 0, pieceKey: wrong.key }),
      ),
    );
    expect(wrongResponses.map((r) => r.json().mistakes)).toEqual([1, 1, 1]);
    expect((await call(user, 'POST', '/games/recipe-rush/start', {})).json().rewardAvailable).toBe(
      50,
    );
    let last: any;
    for (let index = 0; index < 3; index++) {
      const recipe = stored.recipePuzzle.recipes[index];
      const correct = recipe.tray.filter((p: any) => recipe.ingredientIds.includes(p.item.id));
      for (let n = 0; n < correct.length; n++) {
        const input = { action: 'add', index, pieceKey: correct[n].key };
        if (index === 2 && n === correct.length - 1) {
          const results = await Promise.all([1, 2, 3].map(() => call(user, 'POST', url, input)));
          expect(results.map((r) => r.json().rewardPaid)).toEqual([50, 50, 50]);
          last = results[0].json();
        } else expect((await call(user, 'POST', url, input)).statusCode).toBe(200);
      }
    }
    expect(last).toMatchObject({
      finished: true,
      won: true,
      crafted: 3,
      mistakes: 1,
      current: null,
    });
    expect(await db.walletTransaction.count({ where: { userId: user, type: 'GAME_REWARD' } })).toBe(
      1,
    );
    expect((await call(user, 'POST', url, { action: 'reveal', index: 0 })).json().rewardPaid).toBe(
      50,
    );
  });
  test('Recipe Rush accounts for revealed crafts, shared caps, reward pause and expired daily rounds', async () => {
    const user = await createUser();
    const start = (await call(user, 'POST', '/games/recipe-rush/start', {})).json();
    const reveal = (
      await call(user, 'POST', `/games/rounds/${start.id}/recipe`, { action: 'reveal', index: 0 })
    ).json();
    expect(reveal).toMatchObject({ index: 1, rewardAvailable: 40 });
    expect(reveal.history[0].ingredients).toHaveLength(2);
    expect(await solveRecipes(user, start.id, 1)).toMatchObject({
      rewardPaid: 40,
      won: false,
      crafted: 2,
    });
    const capped = await createUser();
    const archive = (await call(capped, 'POST', '/games/archive/start', {})).json();
    const answer = (await db.gameRound.findUnique({ where: { id: archive.id } })).championId;
    await call(capped, 'POST', `/games/rounds/${archive.id}/guess`, { championId: answer });
    await db.economySettings.update({ where: { id: 'global' }, data: { dailyGameCap: 75 } });
    const capRound = (await call(capped, 'POST', '/games/recipe-rush/start', {})).json();
    expect((await solveRecipes(capped, capRound.id)).rewardPaid).toBe(15);
    const paused = await createUser();
    const pausedRound = (await call(paused, 'POST', '/games/recipe-rush/start', {})).json();
    await db.economySettings.update({
      where: { id: 'global' },
      data: { gameRewardsEnabled: false },
    });
    expect((await solveRecipes(paused, pausedRound.id)).rewardPaid).toBe(0);
    const expired = await createUser();
    const expiredRound = (await call(expired, 'POST', '/games/recipe-rush/start', {})).json();
    await db.gameRound.update({ where: { id: expiredRound.id }, data: { day: '2000-01-01' } });
    expect(
      (
        await call(expired, 'POST', `/games/rounds/${expiredRound.id}/recipe`, {
          action: 'reveal',
          index: 0,
        })
      ).statusCode,
    ).toBe(409);
  });
  test('Recipe Rush practice modes resume independently and the server enforces the timer', async () => {
    const user = await createUser();
    expect(
      (await call(user, 'POST', '/games/recipe-rush/start', { timedPractice: true })).statusCode,
    ).toBe(400);
    const free = (await call(user, 'POST', '/games/recipe-rush/start', { practice: true })).json();
    const timed = (
      await call(user, 'POST', '/games/recipe-rush/start', { practice: true, timedPractice: true })
    ).json();
    expect(free.id).not.toBe(timed.id);
    expect(free.deadlineAt).toBeNull();
    expect(Date.parse(timed.deadlineAt) - Date.parse(timed.serverTime)).toBeGreaterThan(88000);
    expect(
      (await call(user, 'POST', '/games/recipe-rush/start', { practice: true })).json().id,
    ).toBe(free.id);
    expect(
      (
        await call(user, 'POST', '/games/recipe-rush/start', {
          practice: true,
          timedPractice: true,
        })
      ).json().deadlineAt,
    ).toBe(timed.deadlineAt);
    const stored = await db.gameRound.findUnique({ where: { id: timed.id } });
    stored.recipePuzzle.deadlineAt = new Date(Date.now() - 1000).toISOString();
    await db.gameRound.update({
      where: { id: timed.id },
      data: { recipePuzzle: stored.recipePuzzle },
    });
    const late = (
      await call(user, 'POST', `/games/rounds/${timed.id}/recipe`, {
        action: 'add',
        index: 0,
        pieceKey: stored.recipePuzzle.recipes[0].tray[0].key,
      })
    ).json();
    expect(late).toMatchObject({ finished: true, crafted: 0, rewardPaid: 0 });
    expect(late.history.every((r: any) => r.status === 'timeout')).toBe(true);
    expect((await solveRecipes(user, free.id)).rewardPaid).toBe(0);
    const expiredOnResume = (
      await call(user, 'POST', '/games/recipe-rush/start', { practice: true, timedPractice: true })
    ).json();
    expect(expiredOnResume.id).not.toBe(timed.id);
    const saved = await db.gameRound.findUnique({ where: { id: expiredOnResume.id } });
    saved.recipePuzzle.deadlineAt = new Date(Date.now() - 1000).toISOString();
    await db.gameRound.update({
      where: { id: saved.id },
      data: { recipePuzzle: saved.recipePuzzle },
    });
    expect(
      (
        await call(user, 'POST', '/games/recipe-rush/start', {
          practice: true,
          timedPractice: true,
        })
      ).json().finished,
    ).toBe(true);
    expect(await db.walletTransaction.count({ where: { userId: user, type: 'GAME_REWARD' } })).toBe(
      0,
    );
  });
  test('Archive persists five clue types across retries, guesses and practice resumes', async () => {
    const user = await createUser();
    const start = (await call(user, 'POST', '/games/archive/start', {})).json();
    expect(start.clueTypes).toHaveLength(5);
    expect(new Set(start.clueTypes.map((c: any) => c.key)).size).toBe(5);
    const saved = await db.gameRound.findUnique({ where: { id: start.id } });
    expect(saved.clueTypes).toEqual(start.clueTypes.map((c: any) => c.key));
    const guessed = (
      await call(user, 'POST', `/games/rounds/${start.id}/guess`, { championId: 'Ashe' })
    ).json();
    expect(guessed.attempts[0].clues.map((c: any) => c.label)).toEqual(
      start.clueTypes.map((c: any) => c.label),
    );
    expect((await call(user, 'POST', '/games/archive/start', {})).json().clueTypes).toEqual(
      start.clueTypes,
    );
    const practice = (await call(user, 'POST', '/games/archive/start', { practice: true })).json();
    expect(practice.clueTypes).toHaveLength(5);
    expect((await call(user, 'POST', '/games/archive/start', { practice: true })).json()).toEqual(
      practice,
    );
  });
  test('legacy mixed-tier Shopkeeper rounds resume safely and reject stale answers without charging', async () => {
    const user = await createUser();
    const start = (await call(user, 'POST', '/games/shopkeeper/start', {})).json();
    const { default: catalog } = await import('../src/data/item-catalog.json');
    const legacy = {
      version: catalog.version,
      pairs: Array.from({ length: 6 }, () => ({
        reference: { ...catalog.items.find((i) => i.id === '1036')!, tier: 'legendary' },
        challenger: catalog.items.find((i) => i.id === '3031')!,
      })),
    };
    await db.gameRound.update({
      where: { id: start.id },
      data: { itemPuzzle: legacy, guesses: ['higher'] },
    });
    const current = (await call(user, 'POST', '/games/shopkeeper/start', {})).json();
    expect(current.current.reference.tier).toBe(current.current.challenger.tier);
    expect(current.history[0]).toMatchObject({
      correct: true,
      reference: { id: '1036' },
      challenger: { id: '3031' },
    });
    const stale = await call(user, 'POST', `/games/rounds/${start.id}/price`, {
      index: 1,
      choice: 'higher',
      comparisonToken: comparisonToken(legacy as any, 1),
    });
    expect(stale.statusCode).toBe(409);
    expect((await db.gameRound.findUnique({ where: { id: start.id } })).guesses).toEqual([
      'higher',
    ]);
    expect(
      (await call(user, 'POST', `/games/rounds/${start.id}/price`, { index: 1, choice: 'higher' }))
        .statusCode,
    ).toBe(409);
    const accepted = await call(user, 'POST', `/games/rounds/${start.id}/price`, {
      index: 1,
      choice: 'higher',
      comparisonToken: current.current.token,
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().index).toBe(2);
    const saved = await db.gameRound.findUnique({ where: { id: start.id } });
    expect(
      saved.itemPuzzle.pairs.slice(1).every((p: any) => p.reference.tier === p.challenger.tier),
    ).toBe(true);
    expect(saved.rewardPaid).toBe(0);
    expect(saved.itemPuzzle.pairs[0]).toEqual(legacy.pairs[0]);
  });
  test('Shopkeeper protects hidden prices and pays a scored round once despite concurrent retries', async () => {
    const user = await createUser();
    const other = await createUser();
    expect((await call(null, 'POST', '/games/shopkeeper/start', {})).statusCode).toBe(401);
    const start = (await call(user, 'POST', '/games/shopkeeper/start', {})).json();
    expect(start.current.challenger).not.toHaveProperty('price');
    expect((await call(user, 'POST', '/games/shopkeeper/start', {})).json().id).toBe(start.id);
    const stored = await db.gameRound.findUnique({ where: { id: start.id } });
    const directions = stored.itemPuzzle.pairs.map((p: any) =>
      p.challenger.price > p.reference.price ? 'higher' : 'lower',
    );
    expect(
      (await call(other, 'POST', `/games/rounds/${start.id}/price`, { index: 0, choice: 'higher' }))
        .statusCode,
    ).toBe(404);
    expect(
      (await call(user, 'POST', `/games/rounds/${start.id}/price`, { index: 1, choice: 'higher' }))
        .statusCode,
    ).toBe(409);
    expect(
      (await call(user, 'POST', `/games/rounds/${start.id}/price`, { index: 0, choice: 'equal' }))
        .statusCode,
    ).toBe(400);
    expect(
      (await call(user, 'POST', `/games/rounds/${start.id}/guess`, { championId: 'Ahri' }))
        .statusCode,
    ).toBe(400);
    const wrong = directions[0] === 'higher' ? 'lower' : 'higher';
    const first = await Promise.all(
      [1, 2].map(() =>
        call(user, 'POST', `/games/rounds/${start.id}/price`, {
          index: 0,
          choice: wrong,
          comparisonToken: start.current.token,
        }),
      ),
    );
    expect(first.map((r) => r.json().index)).toEqual([1, 1]);
    expect(first[0].json().history[0].challenger.price).toBe(
      stored.itemPuzzle.pairs[0].challenger.price,
    );
    expect((await call(user, 'POST', '/games/shopkeeper/start', {})).json().index).toBe(1);
    for (let index = 1; index < 5; index++)
      await call(user, 'POST', `/games/rounds/${start.id}/price`, {
        index,
        choice: directions[index],
        comparisonToken: comparisonToken(stored.itemPuzzle, index),
      });
    const completed = await Promise.all(
      [1, 2].map(() =>
        call(user, 'POST', `/games/rounds/${start.id}/price`, {
          index: 5,
          choice: directions[5],
          comparisonToken: comparisonToken(stored.itemPuzzle, 5),
        }),
      ),
    );
    expect(completed.map((r) => r.json().rewardPaid)).toEqual([50, 50]);
    expect(completed[0].json()).toMatchObject({ finished: true, score: 5, current: null });
    expect(
      await db.walletTransaction.count({
        where: { userId: user, type: 'GAME_REWARD', amount: 50 },
      }),
    ).toBe(1);
    expect((await call(user, 'GET', '/games')).json().games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'shopkeeper',
          round: expect.objectContaining({ rewardPaid: 50 }),
        }),
      ]),
    );
  });
  test('Shopkeeper respects practice, the shared cap, reward pause, and expiration', async () => {
    const user = await createUser();
    const solve = async (round: any) => {
      const stored = await db.gameRound.findUnique({ where: { id: round.id } });
      let result: any;
      for (let index = 0; index < 6; index++) {
        const pair = stored.itemPuzzle.pairs[index];
        result = await call(user, 'POST', `/games/rounds/${round.id}/price`, {
          index,
          choice: pair.challenger.price > pair.reference.price ? 'higher' : 'lower',
          comparisonToken: comparisonToken(stored.itemPuzzle, index),
        });
      }
      return result.json();
    };
    const practice = (
      await call(user, 'POST', '/games/shopkeeper/start', { practice: true })
    ).json();
    expect((await solve(practice)).rewardPaid).toBe(0);
    const archive = (await call(user, 'POST', '/games/archive/start', {})).json();
    await call(user, 'POST', `/games/rounds/${archive.id}/guess`, {
      championId: (await db.gameRound.findUnique({ where: { id: archive.id } })).championId,
    });
    await db.economySettings.update({ where: { id: 'global' }, data: { dailyGameCap: 75 } });
    const daily = (await call(user, 'POST', '/games/shopkeeper/start', {})).json();
    expect((await solve(daily)).rewardPaid).toBe(15);
    await db.gameRound.update({ where: { id: daily.id }, data: { day: '2000-01-01' } });
    expect(
      (await call(user, 'POST', `/games/rounds/${daily.id}/price`, { index: 0, choice: 'higher' }))
        .statusCode,
    ).toBe(409);
    const paused = (await call(user, 'POST', '/games/shopkeeper/start', {})).json();
    await db.economySettings.update({
      where: { id: 'global' },
      data: { gameRewardsEnabled: false },
    });
    expect((await solve(paused)).rewardPaid).toBe(0);
  });

  test('Archive penalties persist, duplicate guesses are free, and the ledger pays the reduced reward once', async () => {
    const user = await createUser();
    const { id } = (await call(user, 'POST', '/games/archive/start', {})).json();
    const answer = (await db.gameRound.findUnique({ where: { id } })).championId;
    const wrong = answer === 'Ahri' ? 'Ashe' : 'Ahri';
    await call(user, 'POST', `/games/rounds/${id}/guess`, { championId: wrong });
    await call(user, 'POST', `/games/rounds/${id}/guess`, { championId: wrong });
    expect((await call(user, 'POST', '/games/archive/start', {})).json().rewardAvailable).toBe(50);
    const results = await Promise.all(
      [1, 2].map(() => call(user, 'POST', `/games/rounds/${id}/guess`, { championId: answer })),
    );
    expect(results.map((r) => r.json().rewardPaid)).toEqual([50, 50]);
    expect(
      await db.walletTransaction.count({
        where: { userId: user, type: 'GAME_REWARD', amount: 50 },
      }),
    ).toBe(1);
  });
  test('Soundcheck charges once per new ability even concurrently, persists across reloads, and preserves completed rewards', async () => {
    const user = await createUser();
    const { id } = (await call(user, 'POST', '/games/soundcheck/start', {})).json();
    expect((await call(user, 'GET', `/games/rounds/${id}/audio/9`)).statusCode).toBe(400);
    await Promise.all(
      [0, 0, 1, 2].map((slot) => call(user, 'GET', `/games/rounds/${id}/audio/${slot}`)),
    );
    const resumed = (await call(user, 'POST', '/games/soundcheck/start', {})).json();
    expect(resumed.listenedSlots.sort()).toEqual([0, 1, 2]);
    expect(resumed.rewardAvailable).toBe(40);
    const answer = (await db.gameRound.findUnique({ where: { id } })).championId;
    await call(user, 'POST', `/games/rounds/${id}/guess`, {
      championId: answer === 'Ahri' ? 'Ashe' : 'Ahri',
    });
    expect(
      (await call(user, 'POST', `/games/rounds/${id}/guess`, { championId: answer })).json()
        .rewardPaid,
    ).toBe(40);
    await call(user, 'GET', `/games/rounds/${id}/audio/3`);
    expect((await call(user, 'POST', '/games/soundcheck/start', {})).json().rewardPaid).toBe(40);
  });
  test('game suggestions require auth, notify admins exactly once, and support an admin-only review queue', async () => {
    const user = await createUser();
    const input = { idea: 'A map guessing game with tiny screenshots of the Rift.' };
    expect((await call(null, 'POST', '/games/suggestions', input)).statusCode).toBe(401);
    expect((await call(user, 'POST', '/games/suggestions', { idea: ' ' })).statusCode).toBe(400);
    const results = await Promise.all(
      [1, 2].map(() => call(user, 'POST', '/games/suggestions', input)),
    );
    expect(results.map((r) => r.statusCode)).toEqual([201, 201]);
    const id = results[0].json().id;
    expect(results[1].json().id).toBe(id);
    expect(
      await db.notification.count({
        where: { userId: admin, fromUserId: user, message: { startsWith: '[Game Suggestion]' } },
      }),
    ).toBe(1);
    expect((await call(user, 'GET', '/games/admin/suggestions')).statusCode).toBe(403);
    expect(
      (await call(user, 'PUT', `/games/admin/suggestions/${id}`, { reviewed: true })).statusCode,
    ).toBe(403);
    expect((await call(admin, 'GET', '/games/admin/suggestions')).json().suggestions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id, idea: input.idea })]),
    );
    expect(
      (await call(admin, 'PUT', `/games/admin/suggestions/${id}`, { reviewed: true })).statusCode,
    ).toBe(200);
    expect(
      (await call(admin, 'GET', '/games/admin/suggestions?reviewed=true')).json().suggestions,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ id, reviewedBy: admin })]));
    await call(admin, 'PUT', `/games/admin/suggestions/${id}`, { reviewed: false });
    expect((await db.gameSuggestion.findUnique({ where: { id } })).reviewedAt).toBeNull();
  });
  test('admin reports work; settings reject non-admin, invalid values and stale edits', async () => {
    const user = await createUser();
    expect((await call(null, 'GET', '/wallet/admin/economy')).statusCode).toBe(401);
    expect((await call(user, 'GET', '/wallet/admin/economy')).statusCode).toBe(403);
    const result = await call(admin, 'GET', '/wallet/admin/economy?days=7');
    expect(result.statusCode).toBe(200);
    const { settings: current, totals, daily } = result.json();
    expect(totals.circulation).toBeGreaterThan(0);
    expect(daily.length).toBeGreaterThan(0);
    const input = { ...current, dailyCheckin: 75, reason: 'Testing audited updates' };
    expect((await call(user, 'PUT', '/wallet/admin/economy/settings', input)).statusCode).toBe(403);
    expect(
      (await call(admin, 'PUT', '/wallet/admin/economy/settings', { ...input, dailyCheckin: -1 }))
        .statusCode,
    ).toBe(400);
    expect((await call(admin, 'PUT', '/wallet/admin/economy/settings', input)).statusCode).toBe(
      200,
    );
    expect((await call(admin, 'PUT', '/wallet/admin/economy/settings', input)).statusCode).toBe(
      409,
    );
    expect(
      await db.auditLog.count({ where: { adminId: admin, action: 'ECONOMY_SETTINGS_CHANGED' } }),
    ).toBe(1);
  });
  test('admin adjustments are audited, idempotent and cannot remove more than the balance', async () => {
    const user = await createUser();
    const key = randomUUID();
    const payload = { targetUserId: user, amount: 25, reason: 'Test adjustment' };
    expect((await call(user, 'POST', '/wallet/admin/grant-pe', payload, key)).statusCode).toBe(403);
    await Promise.all(
      Array.from({ length: 3 }, () => call(admin, 'POST', '/wallet/admin/grant-pe', payload, key)),
    );
    expect((await call(user, 'GET', '/wallet/summary')).json().wallet.prismaticEssence).toBe(425);
    expect(await db.auditLog.count({ where: { targetId: user } })).toBe(1);
    expect(
      (
        await call(
          admin,
          'POST',
          '/wallet/admin/remove-pe',
          { ...payload, amount: 426 },
          randomUUID(),
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call(
          admin,
          'POST',
          '/wallet/admin/grant-pe',
          { ...payload, reason: '' },
          randomUUID(),
        )
      ).statusCode,
    ).toBe(400);
  });
  test('advertising inquiries and rejection never spend PE or invent credits; retired routes are closed', async () => {
    const user = await createUser();
    await call(user, 'GET', '/wallet/summary');
    const input = {
      title: 'Test community',
      description: 'Local test request',
      discordContact: ' test.discord ',
      specialRequests: 'Prefer weekends.\nCan we arrange a custom banner?',
      targetUrl: 'https://example.com',
      imageUrl: 'https://example.com/banner.png',
      days: 7,
      feed: 'duo',
    };
    const first = await call(user, 'POST', '/ads/request-slot', input);
    expect(first.statusCode).toBe(200);
    const duplicate = await call(user, 'POST', '/ads/request-slot', input);
    expect(duplicate.statusCode).toBe(200);
    expect(await db.ad.count({ where: { createdBy: user } })).toBe(1);
    const ad = await db.ad.findFirst({ where: { createdBy: user } });
    expect(ad.requestCreditsSpent).toBe(0);
    expect(ad.discordContact).toBe('test.discord');
    expect(ad.specialRequests).toBe(input.specialRequests);
    const requests = (await call(admin, 'GET', '/ads/admin/requests')).json().requests;
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ad.id,
          discordContact: 'test.discord',
          specialRequests: input.specialRequests,
        }),
      ]),
    );
    const ownRequest = await call(admin, 'POST', '/ads/request-slot', {
      ...input,
      title: 'Admin submitted inquiry',
    });
    expect((await call(admin, 'GET', '/ads/admin/requests')).json().requests).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ownRequest.json().ad.id })]),
    );
    expect((await call(user, 'GET', '/ads/admin/requests')).statusCode).toBe(403);
    expect(
      (
        await call(user, 'POST', '/ads/request-slot', {
          ...input,
          specialRequests: 'x'.repeat(3001),
        })
      ).statusCode,
    ).toBe(400);
    await call(admin, 'POST', `/ads/admin/requests/${ownRequest.json().ad.id}/approve`, {});
    const publicAds = (await call(null, 'GET', '/ads')).json().ads;
    expect(publicAds.length).toBeGreaterThan(0);
    expect(
      publicAds.every(
        (entry: any) => !('discordContact' in entry) && !('specialRequests' in entry),
      ),
    ).toBe(true);
    expect(
      (await call(admin, 'POST', `/ads/admin/requests/${ad.id}/reject`, {})).json().refundedCredits,
    ).toBe(0);
    expect((await db.user.findUnique({ where: { id: user } })).adCredits).toBe(0);
    expect((await call(user, 'GET', '/wallet/summary')).json().wallet.prismaticEssence).toBe(400);
    for (const route of [
      '/wallet/adspace/buy',
      '/wallet/gamble/coinflip/play',
      '/wallet/actions/cache/purchase',
    ])
      expect((await call(user, 'POST', route, {})).statusCode).toBe(410);
  });
});
