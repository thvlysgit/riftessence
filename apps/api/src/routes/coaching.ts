import prisma from '../prisma';

export default async function coachingRoutes(fastify: any) {
  // Helper to extract userId from JWT (duplicated for route isolation)
  const getUserIdFromRequest = async (request: any, reply: any): Promise<string | null> => {
    const authHeader = request.headers['authorization'];
    if (!authHeader || typeof authHeader !== 'string') {
      reply.code(401).send({ error: 'Authorization header missing' });
      return null;
    }
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      reply.code(401).send({ error: 'Invalid Authorization header' });
      return null;
    }
    try {
      const payload = fastify.jwt.verify(token) as any;
      if (!payload?.userId) {
        reply.code(401).send({ error: 'Invalid token payload' });
        return null;
      }
      (request as any).userId = payload.userId;
      return payload.userId as string;
    } catch (err) {
      fastify.log.error('JWT verification failed:', err);
      reply.code(401).send({ error: 'Invalid or expired token' });
      return null;
    }
  };

  // GET /api/coaching/posts - Get all coaching posts
  fastify.get('/coaching/posts', async (request: any, reply: any) => {
    try {
      const { region, type, userId } = (request.query || {}) as any;
      const where: any = {};
      
      // Filter by region(s)
      if (region) {
        const regions = Array.isArray(region) ? region : [region];
        if (regions.length > 0) {
          where.region = { in: regions };
        }
      }
      
      // Filter by type (OFFERING/SEEKING)
      if (type && (type === 'OFFERING' || type === 'SEEKING')) {
        where.type = type;
      }

      // Viewer admin status (used by frontend to conditionally show admin controls)
      let viewerIsAdmin = false;
      if (userId) {
        const viewer = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } });
        viewerIsAdmin = (viewer?.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');
      }

      // Filter out blocked users - exclude posts from users the viewer has blocked
      // and posts from users who have blocked the viewer (bidirectional blocking)
      if (userId) {
        const blocksResult = await prisma.$queryRaw<Array<{ blockedId: string }>>`
          SELECT "blockedId" FROM "Block" WHERE "blockerId" = ${userId}
          UNION
          SELECT "blockerId" FROM "Block" WHERE "blockedId" = ${userId}
        `;
        
        const blockedUserIds = blocksResult.map((b: any) => b.blockedId);
        
        if (blockedUserIds.length > 0) {
          where.authorId = { notIn: blockedUserIds };
        }
      }

      const posts = await prisma.coachingPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              discordAccount: {
                select: { username: true }
              }
            },
          },
        },
      });

      // Format posts for frontend
      const formatted = posts.map((post: any) => ({
        id: post.id,
        type: post.type,
        createdAt: post.createdAt,
        region: post.region,
        authorId: post.author.id,
        username: post.author.username,
        discordUsername: post.author?.discordAccount?.username || null,
        discordTag: post.discordTag,
        isAdmin: viewerIsAdmin,
        
        // Common fields
        roles: post.roles,
        languages: post.languages,
        availability: post.availability,
        details: post.details,
        
        // Offering-specific fields
        ...(post.type === 'OFFERING' && {
          coachRank: post.coachRank,
          coachDivision: post.coachDivision,
          specializations: post.specializations,
        }),
      }));

      return reply.send(formatted);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch coaching posts' });
    }
  });

  // POST /api/coaching/posts - Create a new coaching post
  fastify.post('/coaching/posts', async (request: any, reply: any) => {
    try {
      // SECURITY: Extract userId from JWT token, not request body
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const body = request.body as any;
      const { type, region, roles, languages, availability, details, discordTag, coachRank, coachDivision, specializations } = body;

      // Validation
      if (!type || !region) {
        return reply.status(400).send({ error: 'Missing required fields: type, region' });
      }

      if (type !== 'OFFERING' && type !== 'SEEKING') {
        return reply.status(400).send({ error: 'Type must be OFFERING or SEEKING' });
      }

      // Verify user exists and whether they have a Discord linked
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { discordAccount: true } });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      // Require a connected Discord account for creating coaching posts
      if (!user.discordAccount && !discordTag) {
        return reply.status(400).send({ error: 'A Discord account must be linked to your profile or you must provide a Discord tag to create coaching posts' });
      }

      // For OFFERING type, validate coach rank is Emerald or higher
      if (type === 'OFFERING') {
        if (!coachRank) {
          return reply.status(400).send({ error: 'Coach rank is required for OFFERING posts' });
        }

        const validRanks = ['EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
        if (!validRanks.includes(coachRank)) {
          return reply.status(400).send({ error: 'Coach rank must be EMERALD or higher for OFFERING posts' });
        }
      }

      // Check for duplicate posts (one active post per type per user)
      const existingPost = await prisma.coachingPost.findFirst({ 
        where: { authorId: userId, type } 
      });

      if (existingPost) {
        return reply.status(400).send({ 
          error: `You already have an active ${type} post. Please delete it before creating a new one.` 
        });
      }

      // Build data object
      const data: any = {
        type,
        authorId: userId,
        region,
        roles: roles || [],
        languages: languages || [],
        availability: availability || null,
        details: details || null,
        discordTag: discordTag || null,
      };

      // Add offering-specific fields
      if (type === 'OFFERING') {
        data.coachRank = coachRank;
        data.coachDivision = coachDivision || null;
        data.specializations = specializations || [];
      }

      const created = await prisma.coachingPost.create({ data });

      return reply.status(201).send({ success: true, post: created });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create coaching post' });
    }
  });

  // DELETE /api/coaching/posts/:id - Delete a coaching post
  fastify.delete('/coaching/posts/:id', async (request: any, reply: any) => {
    try {
      const { id } = request.params as any;
      const requesterId = await getUserIdFromRequest(request, reply);
      if (!requesterId) return;

      const post = await prisma.coachingPost.findUnique({ where: { id } });
      if (!post) return reply.status(404).send({ error: 'Post not found' });

      const requester = await prisma.user.findUnique({ where: { id: requesterId }, include: { badges: true } });
      if (!requester) return reply.status(404).send({ error: 'User not found' });
      const isAdmin = (requester.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');

      // Allow owners OR admins
      if (post.authorId !== requesterId && !isAdmin) {
        return reply.status(403).send({ error: 'You can only delete your own posts' });
      }

      await prisma.coachingPost.delete({ where: { id } });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete post' });
    }
  });
}
