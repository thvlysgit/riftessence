jest.mock('../src/prisma', () => ({ __esModule: true, default: {
  riotVerificationAttempt: { findUnique: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
  riotAccount: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(), $queryRaw: jest.fn(), $executeRaw: jest.fn(),
} }));
jest.mock('../src/riotClient', () => ({ getPuuid: jest.fn(), getProfileIcon: jest.fn() }));
import prisma from '../src/prisma';
import * as riot from '../src/riotClient';
import { prepareRiotVerification, confirmRiotVerification } from '../src/services/riotVerification';

describe('shared Riot challenge service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
    prisma.riotVerificationAttempt.count.mockResolvedValue(0);
    prisma.riotVerificationAttempt.create.mockImplementation(async ({ data }: any) => ({ ...data, id: 'proof' }));
    (riot.getPuuid as jest.Mock).mockResolvedValue('puuid');
    (riot.getProfileIcon as jest.Mock).mockResolvedValue(7);
  });
  test('server always assigns a different icon', async () => {
    for (let i = 0; i < 40; i++) {
      const attempt = await prepareRiotVerification('Player#EUW', 'EUW', null);
      expect(attempt.targetIconId).not.toBe(7);
      expect(attempt.targetIconId).toBeGreaterThanOrEqual(0);
      expect(attempt.targetIconId).toBeLessThan(29);
    }
  });
  test('reuses a signed-in active link but never exposes it to a guest', async () => {
    const active = { id: 'existing', userId: 'owner', region: 'EUW', targetIconId: 3 };
    prisma.riotVerificationAttempt.findFirst.mockResolvedValue(active);
    expect(await prepareRiotVerification('Player#EUW', 'EUW', 'owner')).toEqual(active);
    await expect(prepareRiotVerification('Player#EUW', 'EUW', null)).rejects.toThrow(/already in progress/);
    expect(prisma.riotVerificationAttempt.create).not.toHaveBeenCalled();
  });
  test('null icon and identity rate limits do not create a challenge', async () => {
    (riot.getProfileIcon as jest.Mock).mockResolvedValueOnce(null);
    await expect(prepareRiotVerification('Player#EUW', 'EUW', null)).rejects.toThrow(/return your icon/);
    prisma.riotVerificationAttempt.count.mockResolvedValue(3);
    await expect(prepareRiotVerification('Player#EUW', 'EUW', null)).rejects.toThrow(/Too many/);
    expect(prisma.riotVerificationAttempt.create).not.toHaveBeenCalled();
  });
  test('confirmation retries preserve the clock and do not create extra links', async () => {
    const attempt = { id: 'proof', userId: null, status: 'ACTIVE', startedAt: new Date() };
    prisma.riotVerificationAttempt.findUnique.mockResolvedValue(attempt);
    expect(await confirmRiotVerification('proof', null)).toEqual(attempt);
    expect(prisma.riotVerificationAttempt.update).not.toHaveBeenCalled();
    expect(prisma.riotAccount.create).not.toHaveBeenCalled();
  });
  test('an expired or someone else’s challenge cannot be confirmed', async () => {
    prisma.riotVerificationAttempt.findUnique.mockResolvedValue({ userId: null, status: 'AWAITING_CONFIRMATION', createdAt: new Date(Date.now() - 16 * 60_000) });
    await expect(confirmRiotVerification('proof', null)).rejects.toThrow(/expired/);
    await expect(confirmRiotVerification('proof', 'attacker')).rejects.toThrow(/not found/);
    expect(prisma.riotVerificationAttempt.update).not.toHaveBeenCalled();
  });

  test('attaching an unowned legacy row never carries over verified permissions', async () => {
    prisma.riotVerificationAttempt.findUnique.mockResolvedValue({
      id: 'proof', userId: 'new-owner', status: 'AWAITING_CONFIRMATION', createdAt: new Date(),
      puuid: 'puuid', region: 'EUW', targetIconId: 7,
    });
    prisma.riotAccount.findUnique.mockResolvedValue({ id: 'legacy', userId: null, verified: true });
    prisma.riotAccount.update.mockResolvedValue({ id: 'legacy' });
    await confirmRiotVerification('proof', 'new-owner');
    expect(prisma.riotAccount.update).toHaveBeenCalledWith({ where: { id: 'legacy' },
      data: { userId: 'new-owner', verificationIconId: 7, verified: false } });
    expect(prisma.riotVerificationAttempt.update).toHaveBeenCalledWith({ where: { id: 'proof' },
      data: expect.objectContaining({ status: 'ACTIVE' }) });
  });
});
