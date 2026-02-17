import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';

export default async function blocksRoutes(fastify: any) {
  // Block a user
  fastify.post('/block', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const { targetUserId } = request.body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return reply.code(400).send({ error: 'targetUserId is required' });
    }

    if (userId === targetUserId) {
      return reply.code(400).send({ error: 'Cannot block yourself' });
    }

    try {
      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Check if already blocked
      const existingBlock = await prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: userId,
            blockedId: targetUserId,
          },
        },
      });

      if (existingBlock) {
        return reply.code(400).send({ error: 'User is already blocked' });
      }

      // Create the block
      await prisma.block.create({
        data: {
          blockerId: userId,
          blockedId: targetUserId,
        },
      });

      return reply.code(200).send({ success: true, message: 'User blocked successfully' });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to block user' });
    }
  });

  // Unblock a user
  fastify.delete('/block', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const { targetUserId } = request.body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return reply.code(400).send({ error: 'targetUserId is required' });
    }

    try {
      // Delete the block if it exists
      const deletedBlock = await prisma.block.deleteMany({
        where: {
          blockerId: userId,
          blockedId: targetUserId,
        },
      });

      if (deletedBlock.count === 0) {
        return reply.code(404).send({ error: 'Block not found' });
      }

      return reply.code(200).send({ success: true, message: 'User unblocked successfully' });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to unblock user' });
    }
  });

  // Check if a user is blocked
  fastify.get('/block/status/:targetUserId', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const { targetUserId } = request.params;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return reply.code(400).send({ error: 'targetUserId is required' });
    }

    try {
      const block = await prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: userId,
            blockedId: targetUserId,
          },
        },
      });

      return reply.code(200).send({ isBlocked: !!block });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to check block status' });
    }
  });

  // Get list of blocked users
  fastify.get('/blocks', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    try {
      const blocks = await prisma.block.findMany({
        where: { blockerId: userId },
        include: {
          blocked: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const blockedUsers = blocks.map((block: any) => ({
        id: block.blocked.id,
        username: block.blocked.username,
        blockedAt: block.createdAt,
      }));

      return reply.code(200).send({ blockedUsers });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch blocked users' });
    }
  });
}
