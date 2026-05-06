import build from '../src/index';
import prisma from '../src/prisma';

describe('notification authorization', () => {
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

  test('lists only notifications for the authenticated user', async () => {
    const suffix = Date.now();
    const user = await prisma.user.create({ data: { username: `notif_user_${suffix}` } });
    const other = await prisma.user.create({ data: { username: `notif_other_${suffix}` } });

    const ownNotification = await prisma.notification.create({
      data: { userId: user.id, type: 'ADMIN_TEST', message: 'owned notification' },
    });
    await prisma.notification.create({
      data: { userId: other.id, type: 'ADMIN_TEST', message: 'other notification' },
    });

    const unauthenticated = await app.inject({
      method: 'GET',
      url: '/api/notifications',
    });
    expect(unauthenticated.statusCode).toBe(401);

    const token = app.jwt.sign({ userId: user.id });
    const res = await app.inject({
      method: 'GET',
      url: `/api/notifications?userId=${encodeURIComponent(other.id)}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.notifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ownNotification.id })])
    );
    expect(payload.notifications).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: other.id })])
    );
  });

  test('does not allow marking another user notification as read', async () => {
    const suffix = Date.now();
    const user = await prisma.user.create({ data: { username: `reader_${suffix}` } });
    const other = await prisma.user.create({ data: { username: `owner_${suffix}` } });
    const notification = await prisma.notification.create({
      data: { userId: other.id, type: 'ADMIN_TEST', message: 'private notification' },
    });

    const token = app.jwt.sign({ userId: user.id });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/notifications/${notification.id}/read`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
    const unchanged = await prisma.notification.findUnique({ where: { id: notification.id } });
    expect(unchanged?.read).toBe(false);
  });

  test('contact notifications use the JWT sender instead of body fromUserId', async () => {
    const suffix = Date.now();
    const sender = await prisma.user.create({ data: { username: `sender_${suffix}` } });
    const spoofed = await prisma.user.create({ data: { username: `spoofed_${suffix}` } });
    const recipient = await prisma.user.create({ data: { username: `recipient_${suffix}` } });

    const token = app.jwt.sign({ userId: sender.id });
    const res = await app.inject({
      method: 'POST',
      url: '/api/notifications/contact',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        fromUserId: spoofed.id,
        toUserId: recipient.id,
      },
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.notification.fromUserId).toBe(sender.id);
    expect(payload.notification.fromUserId).not.toBe(spoofed.id);
  });
});
