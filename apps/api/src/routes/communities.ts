import prisma from '../prisma';

export default async function communitiesRoutes(fastify: any) {
  // GET /api/communities - List all communities with optional filters
  fastify.get('/communities', async (request: any, reply: any) => {
    try {
      const { region, isPartner, search, discordServerId, limit = 50 } = (request.query || {}) as any;
      const where: any = {};
      
      // Search by Discord server ID (bot integration)
      if (discordServerId) {
        where.discordServerId = discordServerId;
      }
      
      if (region) {
        const regions = Array.isArray(region) ? region : [region];
        where.regions = { hasSome: regions };
      }
      
      if (isPartner === 'true') {
        where.isPartner = true;
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const communities = await prisma.community.findMany({
        where,
        take: parseInt(limit),
        orderBy: [
          { isPartner: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          _count: {
            select: { memberships: true, posts: true },
          },
        },
      });

      const formatted = communities.map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        language: c.language,
        regions: c.regions,
        inviteLink: c.inviteLink,
        isPartner: c.isPartner,
        memberCount: c._count.memberships,
        postCount: c._count.posts,
        createdAt: c.createdAt,
      }));

      return reply.send({ communities: formatted });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch communities' });
    }
  });

  // GET /api/communities/:id - Get community details
  fastify.get('/communities/:id', async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };

      const community = await prisma.community.findUnique({
        where: { id },
        include: {
          _count: {
            select: { memberships: true, posts: true, lftPosts: true },
          },
          memberships: {
            take: 50,
            orderBy: { joinedAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  badges: true,
                },
              },
            },
          },
        },
      });

      if (!community) {
        return reply.status(404).send({ error: 'Community not found' });
      }

      return reply.send({
        id: community.id,
        name: community.name,
        slug: community.slug,
        description: community.description,
        language: community.language,
        regions: community.regions,
        inviteLink: community.inviteLink,
        discordServerId: community.discordServerId,
        isPartner: community.isPartner,
        memberCount: community._count.memberships,
        postCount: community._count.posts,
        lftPostCount: community._count.lftPosts,
        createdAt: community.createdAt,
        members: community.memberships.map((m: any) => ({
          userId: m.user.id,
          username: m.user.username,
          role: m.role,
          joinedAt: m.joinedAt,
          badges: m.user.badges.map((b: any) => ({ key: b.key, name: b.name })),
        })),
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch community' });
    }
  });

  // POST /api/communities - Register a new community
  fastify.post('/communities', async (request: any, reply: any) => {
    try {
      const { name, description, language, regions, inviteLink, discordServerId, userId } = request.body as any;

      if (!name || !language || !regions || !Array.isArray(regions)) {
        return reply.status(400).send({ error: 'Missing required fields: name, language, regions' });
      }

      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }

      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Check if slug already exists
      const existingSlug = await prisma.community.findUnique({ where: { slug } });
      if (existingSlug) {
        return reply.status(400).send({ error: 'A community with this name already exists' });
      }

      // Check if Discord server already registered
      if (discordServerId) {
        const existingDiscord = await prisma.community.findUnique({
          where: { discordServerId },
        });
        if (existingDiscord) {
          return reply.status(400).send({ error: 'This Discord server is already registered' });
        }
      }

      // Create community
      const community = await prisma.community.create({
        data: {
          name,
          slug,
          description: description || null,
          language: language || 'English',
          regions: regions || [],
          inviteLink: inviteLink || null,
          discordServerId: discordServerId || null,
        },
      });

      // Auto-join the creator as ADMIN
      await prisma.communityMembership.create({
        data: {
          userId,
          communityId: community.id,
          role: 'ADMIN',
        },
      });

      return reply.status(201).send({ success: true, community });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create community' });
    }
  });

  // PATCH /api/communities/:id - Update community (admin/owner only)
  fastify.patch('/communities/:id', async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };
      const { userId, name, description, language, regions, inviteLink, isPartner } = request.body as any;

      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }

      // Check if user is admin/moderator of community
      const membership = await prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId, communityId: id } },
      });

      // Also check if user has admin badge for isPartner changes
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });
      const isAppAdmin = user?.badges.some((b: any) => b.key === 'admin');

      if (!membership && !isAppAdmin) {
        return reply.status(403).send({ error: 'You are not a member of this community' });
      }

      if (membership && membership.role === 'MEMBER' && !isAppAdmin) {
        return reply.status(403).send({ error: 'Only community admins can update community settings' });
      }

      const updateData: any = {};
      if (name) {
        updateData.name = name;
        updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      if (description !== undefined) updateData.description = description;
      if (language) updateData.language = language;
      if (regions) updateData.regions = regions;
      if (inviteLink !== undefined) updateData.inviteLink = inviteLink;
      
      // Only app admins can change partner status
      if (isPartner !== undefined && isAppAdmin) {
        updateData.isPartner = isPartner;
      }

      const updated = await prisma.community.update({
        where: { id },
        data: updateData,
      });

      return reply.send({ success: true, community: updated });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update community' });
    }
  });

  // POST /api/communities/:id/join - Join a community
  fastify.post('/communities/:id/join', async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string };

      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }

      // Check if community exists
      const community = await prisma.community.findUnique({ where: { id } });
      if (!community) {
        return reply.status(404).send({ error: 'Community not found' });
      }

      // Check if already member
      const existing = await prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId, communityId: id } },
      });

      if (existing) {
        return reply.status(400).send({ error: 'Already a member of this community' });
      }

      // Create membership
      const membership = await prisma.communityMembership.create({
        data: {
          userId,
          communityId: id,
          role: 'MEMBER',
        },
      });

      return reply.send({ success: true, membership });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to join community' });
    }
  });

  // DELETE /api/communities/:id/leave - Leave a community
  fastify.delete('/communities/:id/leave', async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };
      const { userId } = request.query as { userId: string };

      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }

      const membership = await prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId, communityId: id } },
      });

      if (!membership) {
        return reply.status(404).send({ error: 'Not a member of this community' });
      }

      await prisma.communityMembership.delete({
        where: { id: membership.id },
      });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to leave community' });
    }
  });

  // GET /api/communities/:id/posts - Get posts for a community
  fastify.get('/communities/:id/posts', async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };
      const { limit = 25, type = 'post' } = request.query as any;

      if (type === 'lft') {
        const posts = await prisma.lftPost.findMany({
          where: { communityId: id },
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              include: {
                riotAccounts: true,
                discordAccount: true,
              },
            },
          },
        });

        return reply.send({ posts });
      }

      const posts = await prisma.post.findMany({
        where: { communityId: id },
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            include: {
              riotAccounts: true,
              discordAccount: true,
              ratingsReceived: true,
            },
          },
        },
      });

      return reply.send({ posts });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch community posts' });
    }
  });
}
