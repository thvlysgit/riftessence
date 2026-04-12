import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';

export default async function communitiesRoutes(fastify: any) {
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
  // GET /api/communities - List all communities with optional filters
  fastify.get('/communities', async (request: any, reply: any) => {
    try {
      const { region, isPartner, search, discordServerId, limit } = (request.query || {}) as any;
      const where: any = {};

      const parsedLimit = Number.parseInt(String(limit), 10);
      const take = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? undefined : Math.min(parsedLimit, 500);
      
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
        take,
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

      let viewerUserId: string | null = null;
      const authHeader = request.headers?.authorization;
      if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        if (token) {
          try {
            const payload = fastify.jwt.verify(token) as any;
            if (payload?.userId) {
              viewerUserId = payload.userId as string;
            }
          } catch {
            // Optional viewer context only; ignore invalid auth here.
          }
        }
      }

      let viewerMembershipRole: string | null = null;
      let viewerCanManageMembers = false;
      if (viewerUserId) {
        const [viewerMembership, viewerUser] = await Promise.all([
          prisma.communityMembership.findUnique({
            where: { userId_communityId: { userId: viewerUserId, communityId: id } },
          }),
          prisma.user.findUnique({
            where: { id: viewerUserId },
            include: { badges: true },
          }),
        ]);

        viewerMembershipRole = viewerMembership?.role || null;
        const viewerIsAppAdmin = Boolean(viewerUser?.badges?.some((b: any) => b.key === 'admin'));
        viewerCanManageMembers = viewerIsAppAdmin || viewerMembershipRole === 'ADMIN';
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
        viewerMembershipRole,
        viewerCanManageMembers,
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
      // SECURITY: Extract userId from JWT token, not request body
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { name, description, language, regions, inviteLink, discordServerId } = request.body as any;

      if (!name || !language || !regions || !Array.isArray(regions)) {
        return reply.status(400).send({ error: 'Missing required fields: name, language, regions' });
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
      // SECURITY: Extract userId from JWT token, not request body
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };
      const { name, description, language, regions, inviteLink, isPartner } = request.body as any;

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
      // SECURITY: Extract userId from JWT token, not request body
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };

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
      // SECURITY: Extract userId from JWT token, not query params
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };

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

  // DELETE /api/communities/:id/members/:memberUserId - Remove a community member (community admin/app-admin only)
  fastify.delete('/communities/:id/members/:memberUserId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, memberUserId } = request.params as { id: string; memberUserId: string };
      if (!id || !memberUserId) {
        return reply.status(400).send({ error: 'Missing required params' });
      }

      if (memberUserId === userId) {
        return reply.status(400).send({ error: 'Use leave community to remove yourself' });
      }

      const [actingMembership, targetMembership, actingUser] = await Promise.all([
        prisma.communityMembership.findUnique({
          where: { userId_communityId: { userId, communityId: id } },
        }),
        prisma.communityMembership.findUnique({
          where: { userId_communityId: { userId: memberUserId, communityId: id } },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          include: { badges: true },
        }),
      ]);

      const isAppAdmin = Boolean(actingUser?.badges?.some((b: any) => b.key === 'admin'));
      if (!isAppAdmin && actingMembership?.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Only community admins can remove members' });
      }

      if (!targetMembership) {
        return reply.status(404).send({ error: 'Target user is not a member of this community' });
      }

      if (!isAppAdmin && targetMembership.role === 'ADMIN') {
        return reply.status(403).send({ error: 'Only app admins can remove another community admin' });
      }

      if (targetMembership.role === 'ADMIN') {
        const adminCount = await prisma.communityMembership.count({
          where: {
            communityId: id,
            role: 'ADMIN',
          },
        });

        if (adminCount <= 1) {
          return reply.status(400).send({ error: 'Cannot remove the last remaining community admin' });
        }
      }

      await prisma.communityMembership.delete({ where: { id: targetMembership.id } });
      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove community member' });
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

  // ──────────────────────────────────────────────
  // Discord Bot Link Code Flow
  // ──────────────────────────────────────────────

  // Bot auth middleware
  const validateBotAuth = (request: any, reply: any, done: () => void) => {
    const authHeader = request.headers.authorization;
    const expectedKey = process.env.DISCORD_BOT_API_KEY;
    if (!expectedKey) { reply.status(500).send({ error: 'Bot API key not configured' }); return; }
    if (!authHeader || !authHeader.startsWith('Bearer ')) { reply.status(401).send({ error: 'Missing authorization' }); return; }
    if (authHeader.substring(7) !== expectedKey) { reply.status(403).send({ error: 'Invalid bot API key' }); return; }
    done();
  };

  // POST /api/communities/link-code - Generate a link code (bot only)
  fastify.post('/communities/link-code', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { guildId, guildName } = request.body as any;
      if (!guildId || !guildName) {
        return reply.status(400).send({ error: 'Missing required fields: guildId, guildName' });
      }

      // Check if this Discord server is already linked to a community
      const existingCommunity = await prisma.community.findUnique({
        where: { discordServerId: guildId },
      });
      if (existingCommunity) {
        return reply.status(400).send({ error: `This server is already linked to the community "${existingCommunity.name}".` });
      }

      // Invalidate any previous unused codes for this guild
      await prisma.communityLinkCode.updateMany({
        where: { guildId, used: false },
        data: { used: true },
      });

      // Generate unique 8-char code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const linkCode = await prisma.communityLinkCode.create({
        data: {
          code,
          guildId,
          guildName,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      });

      return reply.status(201).send({ success: true, code: linkCode.code, expiresAt: linkCode.expiresAt });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate link code' });
    }
  });

  // POST /api/communities/verify-code - Verify a link code and create community (user auth)
  fastify.post('/communities/verify-code', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { code, name, description, language, regions, inviteLink } = request.body as any;

      if (!code) {
        return reply.status(400).send({ error: 'Link code is required' });
      }
      if (!name || !regions || !Array.isArray(regions) || regions.length === 0) {
        return reply.status(400).send({ error: 'Missing required fields: name, regions' });
      }

      // Find the link code
      const linkCode = await prisma.communityLinkCode.findUnique({
        where: { code: code.toUpperCase().trim() },
      });

      if (!linkCode) {
        return reply.status(404).send({ error: 'Invalid link code. Please generate a new one with /linkserver in Discord.' });
      }

      if (linkCode.used) {
        return reply.status(400).send({ error: 'This code has already been used. Generate a new one with /linkserver.' });
      }

      if (new Date() > linkCode.expiresAt) {
        return reply.status(400).send({ error: 'This code has expired. Generate a new one with /linkserver.' });
      }

      // Check if Discord server already linked
      const existingCommunity = await prisma.community.findUnique({
        where: { discordServerId: linkCode.guildId },
      });
      if (existingCommunity) {
        return reply.status(400).send({ error: 'This Discord server is already linked to a community.' });
      }

      // Generate slug
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const existingSlug = await prisma.community.findUnique({ where: { slug } });
      if (existingSlug) {
        return reply.status(400).send({ error: 'A community with this name already exists. Choose a different name.' });
      }

      // Mark code as used
      await prisma.communityLinkCode.update({
        where: { id: linkCode.id },
        data: { used: true },
      });

      // Create community linked to the Discord server
      const community = await prisma.community.create({
        data: {
          name,
          slug,
          description: description || null,
          language: language || 'English',
          regions: regions || [],
          inviteLink: inviteLink || null,
          discordServerId: linkCode.guildId,
        },
      });

      // Make the user the community ADMIN
      await prisma.communityMembership.create({
        data: {
          userId,
          communityId: community.id,
          role: 'ADMIN',
        },
      });

      return reply.status(201).send({
        success: true,
        community,
        guildName: linkCode.guildName,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to verify code and create community' });
    }
  });

  // DELETE /api/communities/:id - Delete a community (admin only)
  fastify.delete('/communities/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };

      // Check admin status
      const membership = await prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId, communityId: id } },
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { badges: true },
      });
      const isAppAdmin = user?.badges.some((b: any) => b.key === 'admin');

      if ((!membership || membership.role !== 'ADMIN') && !isAppAdmin) {
        return reply.status(403).send({ error: 'Only community admins can delete a community' });
      }

      // Delete all related data (cascades handle feed channels)
      await prisma.communityMembership.deleteMany({ where: { communityId: id } });
      await prisma.post.updateMany({ where: { communityId: id }, data: { communityId: null } });
      await prisma.lftPost.updateMany({ where: { communityId: id }, data: { communityId: null } });
      await prisma.community.delete({ where: { id } });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete community' });
    }
  });

  // POST /api/communities/:id/auto-join - Auto-join from Discord referral link (user auth)
  fastify.post('/communities/:id/auto-join', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };

      const community = await prisma.community.findUnique({ where: { id } });
      if (!community) {
        return reply.status(404).send({ error: 'Community not found' });
      }

      // Check if already a member
      const existing = await prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId, communityId: id } },
      });

      if (existing) {
        return reply.send({ success: true, alreadyMember: true, community });
      }

      await prisma.communityMembership.create({
        data: {
          userId,
          communityId: id,
          role: 'MEMBER',
        },
      });

      return reply.send({ success: true, alreadyMember: false, community });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to auto-join community' });
    }
  });
}
