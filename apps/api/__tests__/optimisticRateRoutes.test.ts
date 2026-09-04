jest.mock('../src/riotClient', () => ({ getPuuid: jest.fn(), getProfileIcon: jest.fn() }));
jest.mock('../src/prisma', () => ({ __esModule: true, default: {
  user: { findUnique: jest.fn() },
  pendingRating: { findUnique: jest.fn(), updateMany: jest.fn(), upsert: jest.fn() },
  rating: { create: jest.fn() }, notification: { create: jest.fn() },
} }));
jest.mock('../src/services/riotVerification', () => ({
  ...jest.requireActual('../src/services/riotVerification'),
  prepareRiotVerification: jest.fn(), confirmRiotVerification: jest.fn(),
}));
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import prisma from '../src/prisma';
import routes from '../src/routes/rate';
import { prepareRiotVerification, confirmRiotVerification } from '../src/services/riotVerification';

describe('optimistic guest rating HTTP flow', () => {
  let app: any; let pending: any; let token: string;
  beforeAll(async () => {
    app = Fastify(); await app.register(jwt, { secret: 'test-only-rating-secret-never-for-production' });
    await app.register(routes, { prefix: '/api/rate' });
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    pending = { id: 'pending', receiverId: 'receiver', attemptId: 'proof', status: 'DRAFT', createdAt: new Date(),
      attempt: { id: 'proof', userId: null, targetIconId: 7, status: 'ACTIVE', startedAt: new Date() } };
    prisma.pendingRating.findUnique.mockImplementation(async () => pending);
    prisma.pendingRating.upsert.mockImplementation(async () => pending);
    prisma.pendingRating.updateMany.mockImplementation(async ({ data }: any) => {
      if (pending.status !== 'DRAFT') return { count: 0 };
      Object.assign(pending, data); return { count: 1 };
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'receiver', riotAccounts: [{ puuid: 'receiver-puuid' }] });
    (prepareRiotVerification as jest.Mock).mockResolvedValue(pending.attempt);
    (confirmRiotVerification as jest.Mock).mockResolvedValue(pending.attempt);
    token = app.jwt.sign({ purpose: 'pending_rating', pendingId: 'pending', receiverId: 'receiver' });
  });
  const submit = (payload: any) => app.inject({ method: 'POST', url: '/api/rate/submit', payload });
  const data = () => ({ raterToken: token, receiverId: 'receiver', stars: 4, moons: 5, comment: 'Great' });

  test('lookup returns a server icon and a receipt, never a login identity', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/rate/lookup', payload: {
      summonerName: 'Player#EUW', region: 'EUW', receiverUsername: 'receiver', verificationIconId: 99,
    } });
    expect(response.statusCode).toBe(200);
    expect(response.json().attempt.targetIconId).toBe(7);
    const payload = app.jwt.verify(response.json().raterToken);
    expect(payload.purpose).toBe('pending_rating');
    expect(payload.userId).toBeUndefined(); expect(payload.raterId).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  test('old user-chosen icon verification is rejected; acknowledgement is required', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/rate/verify', payload: {
      summonerName: 'Player#EUW', region: 'EUW', verificationIconId: 7, receiverUsername: 'receiver',
    } });
    expect(response.statusCode).toBe(400);
    expect(confirmRiotVerification).not.toHaveBeenCalled();
    const accepted = await app.inject({ method: 'POST', url: '/api/rate/verify', payload: { raterToken: token, keepIconFor30Minutes: true } });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().attempt.status).toBe('ACTIVE');
  });

  test('submission saves privately; a double submit cannot alter or publish it', async () => {
    expect((await submit(data())).statusCode).toBe(202);
    expect(pending.status).toBe('PENDING');
    expect((await submit({ ...data(), stars: 1 })).statusCode).toBe(202);
    expect(pending.stars).toBe(4);
    expect(prisma.rating.create).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  test('expired or wrong-purpose JWTs and receiver swaps are rejected', async () => {
    expect((await submit({ ...data(), raterToken: 'forged' })).statusCode).toBe(401);
    const expired = app.jwt.sign({ purpose: 'pending_rating', pendingId: 'pending', receiverId: 'receiver' }, { expiresIn: -1 });
    expect((await submit({ ...data(), raterToken: expired })).statusCode).toBe(401);
    const login = app.jwt.sign({ userId: 'rater' });
    expect((await submit({ ...data(), raterToken: login })).statusCode).toBe(401);
    expect((await submit({ ...data(), receiverId: 'someone-else' })).statusCode).toBe(403);
    expect(prisma.pendingRating.updateMany).not.toHaveBeenCalled();
  });

  test.each(['AWAITING_CONFIRMATION', 'FAILED', 'CANCELLED'])('does not accept ratings with %s attempts', async status => {
    pending.attempt.status = status;
    expect((await submit(data())).statusCode).toBe(409);
    expect(prisma.pendingRating.updateMany).not.toHaveBeenCalled();
  });

  test('failed proof shows rejection immediately even before publication cleanup runs', async () => {
    pending.status = 'PENDING'; pending.attempt.status = 'FAILED';
    const response = await app.inject({ method: 'POST', url: '/api/rate/status', payload: { raterToken: token } });
    expect(response.json().status).toBe('REJECTED');
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
