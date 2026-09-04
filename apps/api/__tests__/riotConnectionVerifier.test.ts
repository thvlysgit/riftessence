jest.mock('../src/prisma', () => ({ __esModule: true, default: {
  riotVerificationAttempt: { findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
  riotAccount: { updateMany: jest.fn(), deleteMany: jest.fn() }, $transaction: jest.fn(),
} }));
jest.mock('../src/riotClient', () => ({ getProfileIcon: jest.fn() }));
jest.mock('../src/utils/verification', () => ({ syncUserVerification: jest.fn() }));
jest.mock('../src/services/pendingRatings', () => ({ processPendingRatings: jest.fn() }));
import prisma from '../src/prisma';
import * as riot from '../src/riotClient';
import { processDueRiotConnectionVerifications } from '../src/services/riotConnectionVerifier';

describe('durable Riot verification checks', () => {
  let attempt: any;
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:05:00Z'));
    attempt = { id: 'proof', status: 'ACTIVE', checkCount: 0, targetIconId: 7,
      startedAt: new Date('2026-09-04T12:00:00Z'), nextCheckAt: new Date('2026-09-04T12:05:00Z'),
      puuid: 'puuid', summonerName: 'Player#EUW', region: 'EUW', userId: null };
    prisma.riotVerificationAttempt.findMany.mockImplementation(async () => [{ ...attempt }]);
    prisma.riotVerificationAttempt.updateMany.mockImplementation(async ({ where, data }: any) => {
      if (where.status !== attempt.status || where.checkCount !== attempt.checkCount) return { count: 0 };
      if (where.nextCheckAt instanceof Date && +where.nextCheckAt !== +attempt.nextCheckAt) return { count: 0 };
      Object.assign(attempt, data); return { count: 1 };
    });
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
    prisma.riotAccount.updateMany.mockResolvedValue({ count: 1 });
    (riot.getProfileIcon as jest.Mock).mockResolvedValue(7);
  });
  afterEach(() => jest.useRealTimers());

  test('5/15/30 checks use the original confirmation clock; guests never get account privileges', async () => {
    await processDueRiotConnectionVerifications();
    expect(attempt.status).toBe('ACTIVE'); expect(attempt.checkCount).toBe(1);
    expect(attempt.nextCheckAt.toISOString()).toBe('2026-09-04T12:15:00.000Z');
    jest.setSystemTime(new Date('2026-09-04T12:15:00Z'));
    await processDueRiotConnectionVerifications();
    expect(attempt.status).toBe('ACTIVE'); expect(attempt.checkCount).toBe(2);
    expect(attempt.nextCheckAt.toISOString()).toBe('2026-09-04T12:30:00.000Z');
    jest.setSystemTime(new Date('2026-09-04T12:30:00Z'));
    await processDueRiotConnectionVerifications();
    expect(attempt.status).toBe('VERIFIED'); expect(attempt.nextCheckAt).toBeNull();
    expect(prisma.riotAccount.updateMany).not.toHaveBeenCalled();
  });

  test('final mismatch fails and disconnects only the pending owned account', async () => {
    attempt.checkCount = 2; attempt.userId = 'user'; attempt.riotAccountId = 'account';
    (riot.getProfileIcon as jest.Mock).mockResolvedValue(99);
    await processDueRiotConnectionVerifications();
    expect(attempt.status).toBe('FAILED');
    expect(prisma.riotAccount.deleteMany).toHaveBeenCalledWith({ where: { id: 'account', userId: 'user', verified: false } });
    expect(prisma.riotAccount.updateMany).not.toHaveBeenCalled();
  });

  test.each([null, 'outage'])('missing icon / outage (%s) does not consume a check or fail ownership', async value => {
    if (value === 'outage') (riot.getProfileIcon as jest.Mock).mockRejectedValue(new Error('429'));
    else (riot.getProfileIcon as jest.Mock).mockResolvedValue(null);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await processDueRiotConnectionVerifications();
    expect(attempt.status).toBe('ACTIVE'); expect(attempt.checkCount).toBe(0);
    expect(attempt.nextCheckAt.toISOString()).toBe('2026-09-04T12:10:00.000Z');
    warn.mockRestore();
  });

  test('lost lease prevents stale worker from granting verification', async () => {
    attempt.checkCount = 2; attempt.userId = 'user'; attempt.riotAccountId = 'account';
    (riot.getProfileIcon as jest.Mock).mockImplementation(async () => {
      attempt.nextCheckAt = new Date('2026-09-04T12:15:00Z'); return 7;
    });
    await processDueRiotConnectionVerifications();
    expect(attempt.status).toBe('ACTIVE');
    expect(prisma.riotAccount.updateMany).not.toHaveBeenCalled();
  });
});
