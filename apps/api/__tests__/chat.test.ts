import build from '../src/index';
import prisma from '../src/prisma';

describe('chat routes', () => {
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

  async function createChatPair(suffix: string) {
    const userA = await prisma.user.create({ data: { username: `chat_a_${suffix}` } });
    const userB = await prisma.user.create({ data: { username: `chat_b_${suffix}` } });
    const [user1Id, user2Id] = [userA.id, userB.id].sort();
    const conversation = await prisma.conversation.create({
      data: {
        user1Id,
        user2Id,
      },
    });

    return { userA, userB, conversation };
  }

  test('message history returns the latest page in chronological display order', async () => {
    const suffix = String(Date.now());
    const { userA, userB, conversation } = await createChatPair(suffix);

    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    await prisma.message.createMany({
      data: Array.from({ length: 60 }, (_, index) => ({
        conversationId: conversation.id,
        senderId: index % 2 === 0 ? userA.id : userB.id,
        content: `msg-${String(index).padStart(2, '0')}`,
        createdAt: new Date(createdAt.getTime() + index * 1000),
      })),
    });

    const token = app.jwt.sign({ userId: userA.id });
    const res = await app.inject({
      method: 'GET',
      url: `/api/chat/conversations/${conversation.id}/messages?limit=50`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.messages).toHaveLength(50);
    expect(payload.messages[0].content).toBe('msg-10');
    expect(payload.messages[49].content).toBe('msg-59');
    expect(payload.pagination.hasMore).toBe(true);
    expect(payload.pagination.nextCursor).toBe(payload.messages[0].id);
  });

  test('fetching messages does not mark them as read', async () => {
    const suffix = `${Date.now()}_read_fetch`;
    const { userA, userB, conversation } = await createChatPair(suffix);
    const isUserAUser1 = conversation.user1Id === userA.id;

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userB.id,
        content: 'unread hello',
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: isUserAUser1 ? { user1UnreadCount: 1 } : { user2UnreadCount: 1 },
    });

    const token = app.jwt.sign({ userId: userA.id });
    const res = await app.inject({
      method: 'GET',
      url: `/api/chat/conversations/${conversation.id}/messages`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const unchangedMessage = await prisma.message.findUnique({ where: { id: message.id } });
    const unchangedConversation = await prisma.conversation.findUnique({ where: { id: conversation.id } });
    expect(unchangedMessage?.read).toBe(false);
    expect(isUserAUser1 ? unchangedConversation?.user1UnreadCount : unchangedConversation?.user2UnreadCount).toBe(1);
  });

  test('read endpoint marks incoming messages as read and resets unread count', async () => {
    const suffix = `${Date.now()}_read_post`;
    const { userA, userB, conversation } = await createChatPair(suffix);
    const isUserAUser1 = conversation.user1Id === userA.id;

    const incoming = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userB.id,
        content: 'please read',
      },
    });
    const own = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userA.id,
        content: 'own message remains unread false state irrelevant',
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: isUserAUser1 ? { user1UnreadCount: 1 } : { user2UnreadCount: 1 },
    });

    const token = app.jwt.sign({ userId: userA.id });
    const res = await app.inject({
      method: 'POST',
      url: `/api/chat/conversations/${conversation.id}/read`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.readCount).toBe(1);

    const incomingAfter = await prisma.message.findUnique({ where: { id: incoming.id } });
    const ownAfter = await prisma.message.findUnique({ where: { id: own.id } });
    const conversationAfter = await prisma.conversation.findUnique({ where: { id: conversation.id } });
    expect(incomingAfter?.read).toBe(true);
    expect(ownAfter?.read).toBe(false);
    expect(isUserAUser1 ? conversationAfter?.user1UnreadCount : conversationAfter?.user2UnreadCount).toBe(0);
  });
});
