import prisma from '../prisma';

export default async function lftRoutes(fastify: any) {
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
  // GET /api/lft/posts - Get all LFT posts
  fastify.get('/lft/posts', async (request: any, reply: any) => {
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
      
      // Filter by type (TEAM/PLAYER)
      if (type && (type === 'TEAM' || type === 'PLAYER')) {
        where.type = type;
      }

      // Viewer admin status (used by frontend to conditionally show admin controls)
      let viewerIsAdmin = false;
      if (userId) {
        const viewer = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } });
        viewerIsAdmin = (viewer?.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');
      }

      // Filter out blocked users - exclude posts from users the viewer has blocked
      // and posts from users who have blocked the viewer
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

      const posts = await prisma.lftPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              preferredRole: true,
              secondaryRole: true,
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
        isAdmin: viewerIsAdmin,
        preferredRole: post.author.preferredRole,
        secondaryRole: post.author.secondaryRole,
        
        // TEAM fields
        ...(post.type === 'TEAM' && {
          teamName: post.teamName,
          rolesNeeded: post.rolesNeeded,
          averageRank: post.averageRank,
          averageDivision: post.averageDivision,
          scrims: post.scrims,
          minAvailability: post.minAvailability,
          coachingAvailability: post.coachingAvailability,
          details: post.details,
        }),
        
        // PLAYER fields
        ...(post.type === 'PLAYER' && {
          mainRole: post.mainRole,
          rank: post.rank,
          division: post.division,
          experience: post.experience,
          languages: post.languages,
          skills: post.skills,
          age: post.age,
          availability: post.availability,
        }),
      }));

      return reply.send(formatted);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch LFT posts' });
    }
  });

  // POST /api/lft/posts - Create a new LFT post
  fastify.post('/lft/posts', async (request: any, reply: any) => {
    try {
      // SECURITY: Extract userId from JWT token, not request body
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const body = request.body as any;
      const { type, region } = body;

      // Validation
      if (!type || !region) {
        return reply.status(400).send({ error: 'Missing required fields: type, region' });
      }

      if (type !== 'TEAM' && type !== 'PLAYER') {
        return reply.status(400).send({ error: 'Type must be TEAM or PLAYER' });
      }

      // Verify user exists and whether they have a Discord linked
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { discordAccount: true } });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      // Require a connected Discord account for creating either type of post
      if (!user.discordAccount) {
        return reply.status(400).send({ error: 'A Discord account must be linked to your profile to create LFT posts' });
      }

      // Count existing posts per type
      const existingTeamCount = await prisma.lftPost.count({ where: { authorId: userId, type: 'TEAM' } });
      const existingPlayerCount = await prisma.lftPost.count({ where: { authorId: userId, type: 'PLAYER' } });

      // Behavior:
      // - PLAYER (user looking for a team): only one active post allowed; creating a new one replaces previous (auto-delete)
      // - TEAM (team looking for players): up to 5 active posts allowed; teamName must be unique per user; do NOT auto-delete
      if (type === 'PLAYER') {
        // Remove any previous PLAYER posts for this user so the new post replaces them
        await prisma.lftPost.deleteMany({ where: { authorId: userId, type: 'PLAYER' } });
      }

      if (type === 'TEAM') {
        if (existingTeamCount >= 5) {
          return reply.status(400).send({ error: 'You can have up to 5 Team posts at the same time. Please delete an existing one before creating another.' });
        }
      }

      // Build data object based on type
      const data: any = {
        type,
        authorId: userId,
        region,
      };

      if (type === 'TEAM') {
        // Team-specific fields
        const { teamName, rolesNeeded, averageRank, averageDivision, scrims, minAvailability, coachingAvailability, details } = body;
        
        if (!teamName || !rolesNeeded || rolesNeeded.length === 0) {
          return reply.status(400).send({ error: 'Team posts require teamName and rolesNeeded' });
        }
        // Ensure the user doesn't already have a TEAM post with the same teamName
        const duplicate = await prisma.lftPost.findFirst({ where: { authorId: userId, type: 'TEAM', teamName } });
        if (duplicate) {
          return reply.status(400).send({ error: 'You already have a Team post with that team name. Please choose a different team name or delete the existing post.' });
        }
        data.teamName = teamName;
        data.rolesNeeded = rolesNeeded;
        data.averageRank = averageRank || null;
        data.averageDivision = averageDivision || null;
        data.scrims = scrims !== undefined ? scrims : null;
        data.minAvailability = minAvailability || null;
        data.coachingAvailability = coachingAvailability || null;
        data.details = details || null;
      } else {
        // Player-specific fields
        const { mainRole, rank, division, experience, languages, skills, age, availability } = body;
        
        if (!mainRole) {
          return reply.status(400).send({ error: 'Player posts require mainRole' });
        }

        data.mainRole = mainRole;
        data.rank = rank || null;
        data.division = division || null;
        data.experience = experience || null;
        data.languages = languages || [];
        data.skills = skills || [];
        data.age = age || null;
        data.availability = availability || null;
      }

      const created = await prisma.lftPost.create({ data });

      return reply.status(201).send({ success: true, post: created });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create LFT post' });
    }
  });

  // DELETE /api/lft/posts/:id - Delete an LFT post
  fastify.delete('/lft/posts/:id', async (request: any, reply: any) => {
    try {
      const { id } = request.params as any;
      const requesterId = await getUserIdFromRequest(request, reply);
      if (!requesterId) return;

      const post = await prisma.lftPost.findUnique({ where: { id } });
      if (!post) return reply.status(404).send({ error: 'Post not found' });

      const requester = await prisma.user.findUnique({ where: { id: requesterId }, include: { badges: true } });
      if (!requester) return reply.status(404).send({ error: 'User not found' });
      const isAdmin = (requester.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');

      // Allow owners OR admins
      if (post.authorId !== requesterId && !isAdmin) {
        return reply.status(403).send({ error: 'You can only delete your own posts' });
      }

      await prisma.lftPost.delete({ where: { id } });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete post' });
    }
  });
}
