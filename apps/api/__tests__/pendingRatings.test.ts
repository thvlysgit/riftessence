jest.mock('../src/prisma', () => ({ __esModule: true, default: {
  pendingRating: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  riotAccount: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(), create: jest.fn() },
  guestRatingIdentity: { findUnique: jest.fn(), findMany: jest.fn() },
  rating: { findUnique: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn() },
  notification: { create: jest.fn() }, block: { findFirst: jest.fn() }, user: { create: jest.fn() },
  $transaction: jest.fn(), $queryRaw: jest.fn(), $executeRaw: jest.fn(),
} }));
import prisma from '../src/prisma';
import { publishPendingRating } from '../src/services/pendingRatings';

describe('pending rating publication', () => {
  let pending: any;
  beforeEach(() => {
    jest.resetAllMocks();
    pending = { id: 'draft', receiverId: 'receiver', status: 'PENDING', stars: 4, moons: 5, comment: 'Good teammate',
      sharedMatchesCount: 2, sharedMatchesCheckedAt: new Date(), eligibleRaterPuuids: ['rater-puuid'], eligibleReceiverAccountIds: ['receiver-account'],
      attempt: { id: 'proof', status: 'VERIFIED', puuid: 'rater-puuid', gameName: 'Rater', region: 'EUW', userId: null } };
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
    prisma.pendingRating.findUnique.mockImplementation(async () => pending);
    prisma.pendingRating.update.mockImplementation(async ({ data }: any) => Object.assign(pending, data));
    prisma.pendingRating.findMany.mockResolvedValue([pending]);
    prisma.riotAccount.findMany.mockResolvedValue([{ id: 'receiver-account', puuid: 'receiver-puuid', region: 'EUW' }]);
    prisma.riotAccount.count.mockResolvedValue(1);
    prisma.riotAccount.findUnique.mockResolvedValue({ id: 'account', userId: 'rater', verified: true, user: { id: 'rater', username: 'Rater' } });
    prisma.rating.count.mockResolvedValue(0);
    prisma.guestRatingIdentity.findMany.mockResolvedValue([]);
    prisma.rating.create.mockResolvedValue({ id: 'published' });
  });

  test('publishes exactly once, with one notification, and only after verified ownership', async () => {
    await publishPendingRating(pending);
    await publishPendingRating(pending);
    expect(prisma.rating.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.rating.create).toHaveBeenCalledWith({ data: expect.objectContaining({ stars: 4, moons: 5, sharedMatchesCount: 2 }) });
    expect(pending.status).toBe('PUBLISHED');
    expect(pending.ratingId).toBe('published');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  test.each(['ACTIVE', 'FAILED', 'CANCELLED'])('never materializes a rating for %s ownership', async status => {
    pending.attempt.status = status;
    await publishPendingRating(pending);
    expect(prisma.rating.create).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  test('no shared games rejects without public effects', async () => {
    pending.sharedMatchesCount = 0;
    await publishPendingRating(pending);
    expect(pending.status).toBe('REJECTED');
    expect(prisma.rating.create).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  test('revoked recipient link rejects previously recorded match evidence', async () => {
    prisma.riotAccount.count.mockResolvedValue(0);
    await publishPendingRating(pending);
    expect(pending.status).toBe('REJECTED');
    expect(prisma.rating.create).not.toHaveBeenCalled();
  });

  test('existing rating rejects the pending duplicate without notification', async () => {
    prisma.rating.findFirst.mockResolvedValueOnce({ id: 'old' });
    await publishPendingRating(pending);
    expect(pending.status).toBe('REJECTED');
    expect(prisma.rating.create).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  test('an unlinked signed-in account cannot publish even with a previously successful proof', async () => {
    pending.attempt.userId = 'rater'; pending.attempt.riotAccountId = 'removed-account';
    await publishPendingRating(pending);
    expect(pending.status).toBe('REJECTED');
    expect(prisma.rating.create).not.toHaveBeenCalled();
  });

  test('cooldown defers, and daily quota rejects, without public effects', async () => {
    prisma.rating.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'recent' });
    await publishPendingRating(pending);
    expect(pending.status).toBe('PENDING');
    expect(pending.nextPublishAt).toBeInstanceOf(Date);
    prisma.rating.count.mockResolvedValue(10);
    await publishPendingRating(pending);
    expect(pending.status).toBe('REJECTED');
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  test('self-rating and blocked accounts are rejected', async () => {
    pending.attempt.userId = 'receiver';
    await publishPendingRating(pending);
    expect(pending.status).toBe('REJECTED');
    pending.status = 'PENDING'; pending.attempt.userId = null;
    prisma.block.findFirst.mockResolvedValue({ id: 'block' });
    await publishPendingRating(pending);
    expect(pending.status).toBe('REJECTED');
    expect(prisma.rating.create).not.toHaveBeenCalled();
  });

  test('a guest author does not reserve a Riot account or block later registration', async () => {
    prisma.riotAccount.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'guest-author', username: 'Guest' });
    await publishPendingRating(pending);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ guestRatingIdentity: { create: { puuid: 'rater-puuid' } } }) });
    expect(prisma.riotAccount.create).not.toHaveBeenCalled();
    expect(pending.status).toBe('PUBLISHED');
  });

  test('a later signed-in rating still checks the previous guest identity', async () => {
    prisma.guestRatingIdentity.findMany.mockResolvedValue([{ userId: 'previous-guest' }]);
    prisma.rating.findFirst.mockResolvedValueOnce({ id: 'previous-rating' });
    await publishPendingRating(pending);
    expect(prisma.rating.findFirst).toHaveBeenCalledWith({ where: { raterId: { in: ['rater', 'previous-guest'] }, receiverId: 'receiver' } });
    expect(pending.status).toBe('REJECTED');
    expect(prisma.rating.create).not.toHaveBeenCalled();
  });
});
