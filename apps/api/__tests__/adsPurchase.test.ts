jest.mock('../src/middleware/auth', () => ({
  getUserIdFromRequest: jest.fn(),
}));
jest.mock('../src/utils/auditLog', () => ({ logAdminAction: jest.fn() }));
jest.mock('../src/services/economy', () => {
  const original = jest.requireActual('../src/services/economy');
  return {
    ...original,
    operationKey: jest.fn(() => 'operation-1'),
    walletOperation: jest.fn(),
    withWallet: jest.fn(),
    postEntry: jest.fn(),
  };
});
jest.mock('../src/prisma', () => ({
  __esModule: true,
  default: {
    ad: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    adImpression: { findFirst: jest.fn(), create: jest.fn() },
    adClick: { findFirst: jest.fn(), create: jest.fn() },
    adPurchase: { create: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    notification: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    discordDmQueue: { createMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import Fastify from 'fastify';
import prisma from '../src/prisma';
import { getUserIdFromRequest } from '../src/middleware/auth';
import {
  postEntry,
  walletOperation,
  withWallet,
} from '../src/services/economy';
import adsRoutes from '../src/routes/ads';

const db = prisma as any;
const auth = getUserIdFromRequest as jest.Mock;
const debit = postEntry as jest.Mock;
const purchase = walletOperation as jest.Mock;
const lockedWallet = withWallet as jest.Mock;
const payload = {
  title: 'Community spotlight',
  imageUrl: 'https://example.com/banner.png',
  targetUrl: 'https://example.com',
  peAmount: 500,
};

describe('PE impression campaigns', () => {
  const app = Fastify();
  beforeAll(async () => app.register(adsRoutes, { prefix: '/api' }));
  afterAll(async () => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue('owner');
    db.user.findMany.mockResolvedValue([]);
  });

  test('requires at least 500 PE in 100 PE increments', async () => {
    for (const peAmount of [400, 550, -500]) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ads/request-slot',
        payload: { ...payload, peAmount },
      });
      expect(response.statusCode).toBe(400);
    }
    expect(purchase).not.toHaveBeenCalled();
  });

  test('debits PE and creates a pending 15-impression campaign atomically', async () => {
    const tx = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ username: 'Owner', discordAccount: null }),
      },
      ad: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({
          id: 'ad-1',
          title: payload.title,
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
        }),
      },
      adPurchase: { create: jest.fn() },
    };
    purchase.mockImplementation(async (_userId, _key, _payload, work) =>
      work(tx, { id: 'wallet-1' }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/api/ads/request-slot',
      payload,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ peSpent: 500, impressions: 15 });
    expect(tx.ad.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewStatus: 'PENDING',
          impressionBudget: 15,
          remainingImpressions: 15,
          peSpent: 500,
        }),
      }),
    );
    expect(debit).toHaveBeenCalledWith(
      tx,
      { id: 'wallet-1' },
      -500,
      'AD_PURCHASE',
      expect.any(String),
      expect.objectContaining({ adId: 'ad-1' }),
    );
    expect(tx.adPurchase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adId: 'ad-1',
        peAmount: 500,
        impressions: 15,
      }),
    });
  });

  test('the last qualified impression stops delivery', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      ad: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ad-1',
          isActive: true,
          reviewStatus: 'APPROVED',
          targetFeeds: [],
          impressionBudget: 15,
          remainingImpressions: 1,
        }),
        update: jest.fn(),
      },
      adImpression: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    db.$transaction.mockImplementation(async (work: any) => work(tx));
    const response = await app.inject({
      method: 'POST',
      url: '/api/ads/impression',
      payload: { adId: 'ad-1', feed: 'duo' },
    });
    expect(response.json()).toEqual({ success: true, counted: true });
    expect(tx.ad.update).toHaveBeenCalledWith({
      where: { id: 'ad-1' },
      data: { remainingImpressions: 0, isActive: false },
    });
  });

  test('a repeated view does not spend another impression', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      ad: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ad-1',
          isActive: true,
          reviewStatus: 'APPROVED',
          targetFeeds: [],
          impressionBudget: 15,
          remainingImpressions: 8,
        }),
        update: jest.fn(),
      },
      adImpression: {
        findFirst: jest.fn().mockResolvedValue({ id: 'view-1' }),
        create: jest.fn(),
      },
    };
    db.$transaction.mockImplementation(async (work: any) => work(tx));
    const response = await app.inject({
      method: 'POST',
      url: '/api/ads/impression',
      payload: { adId: 'ad-1', feed: 'duo' },
    });
    expect(response.json()).toEqual({ success: true, counted: false });
    expect(tx.adImpression.create).not.toHaveBeenCalled();
    expect(tx.ad.update).not.toHaveBeenCalled();
  });

  test('campaign dashboards are private to the owner and admins', async () => {
    db.ad.findUnique.mockResolvedValue({
      id: 'ad-1',
      createdBy: 'another-user',
      reviewStatus: 'APPROVED',
    });
    db.user.findUnique.mockResolvedValue({ badges: [] });
    const response = await app.inject({
      method: 'GET',
      url: '/api/ads/dashboard/ad-1',
    });
    expect(response.statusCode).toBe(403);
    expect(db.adImpression.findFirst).not.toHaveBeenCalled();
  });

  test('approval activates a pending paid campaign', async () => {
    db.user.findUnique.mockResolvedValue({ badges: [{ key: 'admin' }] });
    db.ad.findUnique.mockResolvedValue({
      id: 'ad-1',
      reviewStatus: 'PENDING',
      startDate: new Date(),
      endDate: new Date(),
      priority: 0,
    });
    const tx = {
      ad: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({
            id: 'ad-1',
            createdBy: 'owner',
            title: payload.title,
            priority: 1,
          }),
      },
    };
    db.$transaction.mockImplementation(async (work: any) => work(tx));
    const response = await app.inject({
      method: 'POST',
      url: '/api/ads/admin/requests/ad-1/approve',
      payload: {},
    });
    expect(response.statusCode).toBe(200);
    expect(tx.ad.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ad-1', reviewStatus: 'PENDING' },
        data: expect.objectContaining({
          reviewStatus: 'APPROVED',
          isActive: true,
        }),
      }),
    );
  });

  test('rejecting a paid campaign refunds PE once and preserves its record', async () => {
    db.user.findUnique.mockResolvedValue({ badges: [{ key: 'admin' }] });
    db.ad.findUnique.mockResolvedValue({
      id: 'ad-1',
      createdBy: 'owner',
      reviewStatus: 'PENDING',
      peSpent: 500,
      requestCreditsSpent: 0,
      title: payload.title,
    });
    const tx = {
      ad: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      adPurchase: { updateMany: jest.fn() },
      wallet: { updateMany: jest.fn() },
      notification: { create: jest.fn() },
    };
    lockedWallet.mockImplementation(async (_id, work) =>
      work(tx, { id: 'wallet-1' }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/api/ads/admin/requests/ad-1/reject',
      payload: {},
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().refundedPe).toBe(500);
    expect(tx.ad.updateMany).toHaveBeenCalledWith({
      where: { id: 'ad-1', reviewStatus: 'PENDING' },
      data: { reviewStatus: 'REJECTED', isActive: false },
    });
    expect(debit).toHaveBeenCalledWith(
      tx,
      { id: 'wallet-1' },
      500,
      'AD_REFUND',
      expect.any(String),
      { adId: 'ad-1' },
      false,
    );
  });
});
