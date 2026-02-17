import build from '../src/index';
import prisma from '../src/prisma';

describe('DELETE /api/lft/posts/:id (admin + owner)', () => {
  let app: any;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    try {
      await app?.close?.();
    } finally {
      await prisma.$disconnect();
    }
  });

  test('admin can delete another user\'s LFT post', async () => {
    await prisma.badge.upsert({
      where: { key: 'admin' },
      update: { name: 'Admin' },
      create: { key: 'admin', name: 'Admin' },
    });

    const admin = await prisma.user.create({
      data: {
        username: 'admin_' + Date.now(),
        badges: { connect: { key: 'admin' } },
      },
    });

    const author = await prisma.user.create({
      data: { username: 'author_' + Date.now() },
    });

    const post = await prisma.lftPost.create({
      data: {
        type: 'TEAM',
        authorId: author.id,
        region: 'EUW',
        teamName: 'Team_' + Date.now(),
        rolesNeeded: ['MID'],
      },
    });

    const token = app.jwt.sign({ userId: admin.id });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/lft/posts/${post.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true });

    const deleted = await prisma.lftPost.findUnique({ where: { id: post.id } });
    expect(deleted).toBeNull();
  });

  test('non-admin cannot delete another user\'s LFT post', async () => {
    const user = await prisma.user.create({
      data: { username: 'user_' + Date.now() },
    });

    const author = await prisma.user.create({
      data: { username: 'author2_' + Date.now() },
    });

    const post = await prisma.lftPost.create({
      data: {
        type: 'PLAYER',
        authorId: author.id,
        region: 'EUW',
        mainRole: 'MID',
      },
    });

    const token = app.jwt.sign({ userId: user.id });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/lft/posts/${post.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
  });

  test('owner can delete own LFT post', async () => {
    const author = await prisma.user.create({
      data: { username: 'owner_' + Date.now() },
    });

    const post = await prisma.lftPost.create({
      data: {
        type: 'PLAYER',
        authorId: author.id,
        region: 'EUW',
        mainRole: 'MID',
      },
    });

    const token = app.jwt.sign({ userId: author.id });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/lft/posts/${post.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true });
  });
});
