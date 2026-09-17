jest.mock('../src/middleware/auth', () => ({
  getUserIdFromRequest: jest.fn(),
}));
jest.mock('../src/prisma', () => ({
  __esModule: true,
  default: {
    matchup: { findMany: jest.fn(), findUnique: jest.fn() },
    savedMatchup: { findMany: jest.fn() },
    matchupCollection: { create: jest.fn(), findUnique: jest.fn() },
    matchupCollectionItem: { deleteMany: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import Fastify from 'fastify';
import prisma from '../src/prisma';
import { getUserIdFromRequest } from '../src/middleware/auth';
import matchupRoutes from '../src/routes/matchups';

const db = prisma as any;
const auth = getUserIdFromRequest as jest.Mock;

describe('matchup collection sharing and grouping', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(matchupRoutes, { prefix: '/api' });
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue(null);
  });

  test('groups saved guides from different champions in one private collection', async () => {
    auth.mockResolvedValue('reader');
    db.matchup.findMany.mockResolvedValue([
      {
        id: 'one',
        myChampion: 'Ahri',
        role: 'MID',
        userId: 'reader',
        isPublic: false,
      },
      {
        id: 'two',
        myChampion: 'Lux',
        role: 'SUPPORT',
        userId: 'author',
        isPublic: true,
      },
    ]);
    db.savedMatchup.findMany.mockResolvedValue([{ matchupId: 'two' }]);
    db.$transaction.mockImplementation(
      (callback: (transaction: any) => Promise<unknown>) => callback(db),
    );
    db.matchupCollection.create.mockImplementation(async ({ data }: any) => ({
      id: 'collection',
      ...data,
      user: { username: 'reader' },
      items: [],
      _count: { items: 2 },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/matchup-collections/group',
      payload: { matchupIds: ['one', 'two'] },
    });

    expect(response.statusCode).toBe(201);
    expect(db.matchupCollection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          champion: null,
          role: null,
          isPublic: false,
          items: {
            create: [
              { matchupId: 'one', position: 0 },
              { matchupId: 'two', position: 1 },
            ],
          },
        }),
      }),
    );
  });

  test("a private guide is readable only through its author's public collection", async () => {
    db.matchup.findUnique.mockResolvedValue({
      id: 'guide',
      userId: 'author',
      isPublic: false,
      likes: [],
      user: { username: 'author' },
    });
    db.matchupCollectionItem.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'item' });

    const denied = await app.inject({
      method: 'GET',
      url: '/api/matchups/guide',
    });
    const shared = await app.inject({
      method: 'GET',
      url: '/api/matchups/guide',
    });

    expect(denied.statusCode).toBe(403);
    expect(shared.statusCode).toBe(200);
    expect(shared.json().matchup.sharedViaCollection).toBe(true);
    expect(db.matchupCollectionItem.findFirst).toHaveBeenCalledWith({
      where: {
        matchupId: 'guide',
        collection: { isPublic: true, userId: 'author' },
      },
      select: { id: true },
    });
  });

  test('public collection omits guides another author made private', async () => {
    db.matchupCollection.findUnique.mockResolvedValue({
      id: 'collection',
      userId: 'owner',
      isPublic: true,
      user: { username: 'owner' },
      _count: { items: 3, savedBy: 0 },
      items: [
        { id: 'own', matchup: { id: 'own', userId: 'owner', isPublic: false } },
        {
          id: 'public',
          matchup: { id: 'public', userId: 'another', isPublic: true },
        },
        {
          id: 'private',
          matchup: { id: 'private', userId: 'another', isPublic: false },
        },
      ],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/matchup-collections/collection',
    });

    expect(response.statusCode).toBe(200);
    expect(
      response.json().collection.items.map((item: any) => item.id),
    ).toEqual(['own', 'public']);
    expect(response.json().collection.itemCount).toBe(2);
  });
});
