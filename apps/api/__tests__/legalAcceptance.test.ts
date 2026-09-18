jest.mock('../src/prisma', () => ({ __esModule: true, default: {
  user: { findUnique: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
} }));
jest.mock('../src/middleware/auth', () => ({ getUserIdFromRequest: jest.fn() }));
jest.mock('../src/utils/discord-webhook', () => ({ sendDiscordWebhook: jest.fn(), createNewUserEmbed: jest.fn() }));

import Fastify from 'fastify';
import prisma from '../src/prisma';
import { getUserIdFromRequest } from '../src/middleware/auth';
import legalRoutes from '../src/routes/legal';
import authRoutes from '../src/routes/auth';
import { enforceLegalAcceptance, isValidLegalAcceptance, legalAcceptanceData } from '../src/services/legal';
import { LEGAL_VERSION } from '../src/utils/legalPolicy';

const db = prisma as any;
const valid = { version: LEGAL_VERSION, termsAccepted: true, privacyAcknowledged: true, eligibilityConfirmed: true, ageGroup: '15-17' as const, locale: 'fr' as const };

describe('legal acceptance across registration methods', () => {
  const app = Fastify();
  beforeAll(async () => { await app.register(legalRoutes, { prefix: '/api' }); await app.register(authRoutes, { prefix: '/api/auth' }); });
  afterAll(() => app.close());
  beforeEach(() => { jest.clearAllMocks(); (getUserIdFromRequest as jest.Mock).mockResolvedValue('user-1'); });

  test('rejects missing, old, partially accepted and ineligible declarations', () => {
    for (const value of [null, {}, { ...valid, version: 'old' }, { ...valid, termsAccepted: false }, { ...valid, privacyAcknowledged: false }, { ...valid, eligibilityConfirmed: false }, { ...valid, ageGroup: 'under-15' }, { ...valid, termsAccepted: 'true' }]) expect(isValidLegalAcceptance(value)).toBe(false);
    expect(isValidLegalAcceptance(valid)).toBe(true);
  });

  test('password registration cannot omit legal acceptance even with valid account fields', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'NewPlayer', email: 'player@example.com', password: 'TestPlayer123!' } });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('LEGAL_ACCEPTANCE_REQUIRED');
    expect(db.user.create).not.toHaveBeenCalled();
  });

  test('password account creation receives its acceptance receipt atomically', () => {
    const data = legalAcceptanceData(valid, 'password-registration');
    expect(data.legalAcceptances.create).toMatchObject({ ...valid, source: 'password-registration', acceptedAt: data.legalAcceptedAt });
    expect(data.legalAcceptedVersion).toBe(LEGAL_VERSION);
  });

  test('old accounts and OAuth-created accounts with no receipt are required to review', async () => {
    db.user.findUnique.mockResolvedValue({ legalAcceptedVersion: null });
    const response = await app.inject({ method: 'GET', url: '/api/legal/status' });
    expect(response.json()).toMatchObject({ accepted: false, requiredVersion: LEGAL_VERSION });
  });

  test('acceptance retries keep the original receipt timestamp and age declaration', async () => {
    const acceptedAt = new Date('2026-09-18T12:00:00Z');
    const tx = { $queryRaw: jest.fn(), legalAcceptance: { upsert: jest.fn().mockResolvedValue({ acceptedAt, ageGroup: '15-17' }) }, user: { update: jest.fn() } };
    db.$transaction.mockImplementation((work: any) => work(tx));
    const response = await app.inject({ method: 'POST', url: '/api/legal/accept', payload: { ...valid, userId: 'another-user', acceptedAt: '2000-01-01', source: 'forged' } });
    expect(response.statusCode).toBe(200);
    expect(tx.legalAcceptance.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
    expect(tx.legalAcceptance.upsert.mock.calls[0][0].create).toEqual({ ...valid, userId: 'user-1', source: 'authenticated-review' });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { legalAcceptedVersion: LEGAL_VERSION, legalAcceptedAt: acceptedAt, legalAgeGroup: '15-17' } });
  });

  test('invalid submissions do not create acceptance records', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/legal/accept', payload: { ...valid, termsAccepted: false } });
    expect(response.statusCode).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test.each(['/api/posts', '/api/chat/messages', '/api/wallet/quests/claim', '/api/auth/set-password', '/api/auth/discord/login'])('pending accounts cannot bypass acceptance via %s', async url => {
    db.user.findUnique.mockResolvedValue({ legalAcceptedVersion: null });
    const reply: any = { code: jest.fn().mockReturnThis(), send: jest.fn() };
    await enforceLegalAcceptance({ userId: 'oauth-user', url, method: 'POST' }, reply);
    expect(reply.code).toHaveBeenCalledWith(428);
  });

  test('accepted accounts proceed, while a failed database check fails closed', async () => {
    const reply: any = { code: jest.fn().mockReturnThis(), send: jest.fn() };
    const request = { userId: 'user-1', url: '/api/posts', method: 'POST', log: { error: jest.fn() } };
    db.user.findUnique.mockResolvedValueOnce({ legalAcceptedVersion: LEGAL_VERSION });
    await enforceLegalAcceptance(request, reply);
    expect(reply.send).not.toHaveBeenCalled();
    db.user.findUnique.mockRejectedValueOnce(new Error('Database unavailable'));
    await enforceLegalAcceptance(request, reply);
    expect(reply.code).toHaveBeenCalledWith(503);
  });

  test.each(['/api/legal/status', '/api/legal/accept', '/api/auth/logout', '/api/auth/discord/callback', '/api/auth/riot/callback'])('keeps review, logout and OAuth bootstrap available: %s', async url => {
    const reply: any = { code: jest.fn().mockReturnThis(), send: jest.fn() };
    await enforceLegalAcceptance({ userId: 'user-1', url, method: 'POST' }, reply);
    expect(reply.send).not.toHaveBeenCalled();
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});
