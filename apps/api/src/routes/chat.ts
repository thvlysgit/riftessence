import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { Errors } from '../middleware/errors';
import { z } from 'zod';
import { validateRequest } from '../validation';

// Validation schemas
const SendMessageSchema = z.object({
  recipientId: z.string().min(1),
  content: z.string().min(1).max(2000, 'Message too long (max 2000 characters)'),
});

export default async function chatRoutes(fastify: FastifyInstance) {
  
  // Get all conversations for current user
  fastify.get('/conversations', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      // Get all conversations where user is participant
      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
        include: {
          user1: {
            select: {
              id: true,
              username: true,
              verified: true,
              anonymous: true,
              riotAccounts: {
                select: {
                  rank: true,
                  region: true,
                  profileIconId: true,
                },
                where: { isMain: true },
                take: 1,
              },
            },
          },
          user2: {
            select: {
              id: true,
              username: true,
              verified: true,
              anonymous: true,
              riotAccounts: {
                select: {
                  rank: true,
                  region: true,
                  profileIconId: true,
                },
                where: { isMain: true },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
      });

      // Format conversations to show the "other" user and unread count for current user
      const formattedConversations = conversations.map((conv: any) => {
        const isUser1 = conv.user1Id === userId;
        const otherUser = isUser1 ? conv.user2 : conv.user1;
        const unreadCount = isUser1 ? conv.user1UnreadCount : conv.user2UnreadCount;

        return {
          id: conv.id,
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            verified: otherUser.verified,
            profileIconId: otherUser.riotAccounts[0]?.profileIconId || null,
            rank: otherUser.riotAccounts[0]?.rank || 'UNRANKED',
            region: otherUser.riotAccounts[0]?.region || null,
          },
          lastMessageAt: conv.lastMessageAt,
          lastMessagePreview: conv.lastMessagePreview,
          unreadCount,
        };
      });

      return reply.send({ conversations: formattedConversations });
    } catch (error: any) {
      Errors.serverError(reply, request, 'get conversations', error);
    }
  });

  // Get messages in a specific conversation
  fastify.get('/conversations/:conversationId/messages', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { conversationId } = request.params;

      // Verify user is participant in this conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
      });

      if (!conversation) {
        return reply.code(404).send({ error: 'Conversation not found or access denied' });
      }

      // Get messages
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 100, // Limit to last 100 messages
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              riotAccounts: {
                select: {
                  profileIconId: true,
                },
                where: { isMain: true },
                take: 1,
              },
            },
          },
        },
      });

      // Mark all messages as read for this user
      const isUser1 = conversation.user1Id === userId;
      await prisma.$transaction([
        // Update message read status
        prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: userId },
            read: false,
          },
          data: { read: true },
        }),
        // Reset unread count for this user
        prisma.conversation.update({
          where: { id: conversationId },
          data: isUser1 
            ? { user1UnreadCount: 0 }
            : { user2UnreadCount: 0 },
        }),
      ]);

      // Format messages to flatten profileIconId
      const formattedMessages = messages.map((msg: any) => ({
        ...msg,
        sender: {
          id: msg.sender.id,
          username: msg.sender.username,
          profileIconId: msg.sender.riotAccounts[0]?.profileIconId || null,
        },
      }));

      return reply.send({ messages: formattedMessages });
    } catch (error: any) {
      Errors.serverError(reply, request, 'get messages', error);
    }
  });

  // Send a message (creates conversation if doesn't exist)
  fastify.post('/messages', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(SendMessageSchema, request.body);
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { recipientId, content } = validation.data;

      // Check if user is trying to message themselves
      if (userId === recipientId) {
        return reply.code(400).send({ error: 'You cannot message yourself' });
      }

      // Check if recipient exists
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, username: true },
      });

      if (!recipient) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Check if either user has blocked the other
      const blockExists = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: recipientId },
            { blockerId: recipientId, blockedId: userId },
          ],
        },
      });

      if (blockExists) {
        return reply.code(403).send({ error: 'Cannot send message' });
      }

      // Find or create conversation (ensure user1Id < user2Id for consistency)
      const [smallerId, largerId] = [userId, recipientId].sort();
      
      let conversation = await prisma.conversation.findFirst({
        where: {
          user1Id: smallerId,
          user2Id: largerId,
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            user1Id: smallerId,
            user2Id: largerId,
            lastMessageAt: new Date(),
            lastMessagePreview: content.substring(0, 100),
          },
        });
      }

      // Create message and update conversation in a transaction
      const isUser1 = conversation.user1Id === userId;
      const result = await prisma.$transaction(async (tx: any) => {
        // Create the message
        const message = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: userId,
            content,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                riotAccounts: {
                  select: {
                    profileIconId: true,
                  },
                  where: { isMain: true },
                  take: 1,
                },
              },
            },
          },
        });

        // Update conversation
        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: content.substring(0, 100),
            ...(isUser1 
              ? { user2UnreadCount: { increment: 1 } }
              : { user1UnreadCount: { increment: 1 }
            }),
          },
        });

        return message;
      });

      // Format message to flatten profileIconId
      const formattedMessage = {
        ...result,
        sender: {
          id: result.sender.id,
          username: result.sender.username,
          profileIconId: result.sender.riotAccounts[0]?.profileIconId || null,
        },
      };

      return reply.send({ message: formattedMessage });
    } catch (error: any) {
      Errors.serverError(reply, request, 'send message', error);
    }
  });

  // Get unread message count
  fastify.get('/unread-count', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
        select: {
          user1Id: true,
          user1UnreadCount: true,
          user2UnreadCount: true,
        },
      });

      const totalUnread = conversations.reduce((sum: number, conv: any) => {
        return sum + (conv.user1Id === userId ? conv.user1UnreadCount : conv.user2UnreadCount);
      }, 0);

      return reply.send({ unreadCount: totalUnread });
    } catch (error: any) {
      Errors.serverError(reply, request, 'get unread count', error);
    }
  });

  // Get or create conversation with a specific user
  fastify.post('/conversations/with/:userId', async (request: any, reply: any) => {
    try {
      const currentUserId = await getUserIdFromRequest(request, reply);
      if (!currentUserId) return;

      const { userId: otherUserId } = request.params;

      if (currentUserId === otherUserId) {
        return reply.code(400).send({ error: 'Cannot create conversation with yourself' });
      }

      // Check if other user exists
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true },
      });

      if (!otherUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Check for blocks
      const blockExists = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: currentUserId, blockedId: otherUserId },
            { blockerId: otherUserId, blockedId: currentUserId },
          ],
        },
      });

      if (blockExists) {
        return reply.code(403).send({ error: 'Cannot create conversation' });
      }

      // Find or create conversation
      const [smallerId, largerId] = [currentUserId, otherUserId].sort();
      
      let conversation = await prisma.conversation.findFirst({
        where: {
          user1Id: smallerId,
          user2Id: largerId,
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            user1Id: smallerId,
            user2Id: largerId,
          },
        });
      }

      return reply.send({ conversationId: conversation.id });
    } catch (error: any) {
      Errors.serverError(reply, request, 'create conversation', error);
    }
  });
}
