import prisma from '../prisma';

const LFT_GAME_ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;
const LFT_STAFF_NEEDS = ['MANAGER', 'COACH', 'OTHER'] as const;
const LFT_CANDIDATE_TYPES = ['PLAYER', 'MANAGER', 'COACH', 'OTHER'] as const;

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0);
}

function normalizeGameRoles(value: unknown): string[] {
  const allowed = new Set(LFT_GAME_ROLES);
  return normalizeStringArray(value)
    .map((role) => role.toUpperCase())
    .filter((role) => allowed.has(role as typeof LFT_GAME_ROLES[number]));
}

function normalizeStaffNeeds(value: unknown): string[] {
  const allowed = new Set(LFT_STAFF_NEEDS);
  return normalizeStringArray(value)
    .map((role) => role.toUpperCase())
    .filter((role) => allowed.has(role as typeof LFT_STAFF_NEEDS[number]));
}

function normalizeCandidateType(value: unknown): typeof LFT_CANDIDATE_TYPES[number] {
  const raw = String(value || 'PLAYER').trim().toUpperCase();
  const allowed = new Set(LFT_CANDIDATE_TYPES);
  return allowed.has(raw as typeof LFT_CANDIDATE_TYPES[number])
    ? (raw as typeof LFT_CANDIDATE_TYPES[number])
    : 'PLAYER';
}

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
        teamId: post.teamId || null,
        candidateType: post.candidateType || 'PLAYER',
        representedName: post.representedName || null,
        
        // TEAM fields
        ...(post.type === 'TEAM' && {
          teamName: post.teamName,
          rolesNeeded: post.rolesNeeded,
          staffNeeded: post.staffNeeded || [],
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
          details: post.details,
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

      // Behavior:
      // - PLAYER (user looking for a team): only one active post allowed; creating a new one replaces previous
      // - TEAM (team looking for players): one active post per team; creating a new one replaces previous
      let replacedExistingPost = false;

      if (type === 'PLAYER') {
        const removed = await prisma.lftPost.deleteMany({ where: { authorId: userId, type: 'PLAYER' } });
        replacedExistingPost = removed.count > 0;
      }

      // Build data object based on type
      const data: any = {
        type,
        authorId: userId,
        region,
      };

      if (type === 'TEAM') {
        // Team-specific fields
        const {
          teamId,
          rolesNeeded,
          staffNeeded,
          averageRank,
          averageDivision,
          scrims,
          minAvailability,
          coachingAvailability,
          details,
        } = body;

        if (!teamId || typeof teamId !== 'string') {
          return reply.status(400).send({ error: 'Team posts require a valid teamId from Teams Dashboard' });
        }

        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: {
            id: true,
            name: true,
            region: true,
            ownerId: true,
            members: {
              where: { userId },
              select: { role: true },
            },
          },
        });

        if (!team) {
          return reply.status(404).send({ error: 'Team not found. Create a team from Teams Dashboard first.' });
        }

        const canManageTeamPost = team.ownerId === userId || team.members.some((member: any) => member.role === 'MANAGER');
        if (!canManageTeamPost) {
          return reply.status(403).send({ error: 'Only the team owner or managers can publish this team listing.' });
        }

        const normalizedRolesNeeded = normalizeGameRoles(rolesNeeded);
        const normalizedStaffNeeded = normalizeStaffNeeds(staffNeeded);

        if (normalizedRolesNeeded.length === 0 && normalizedStaffNeeded.length === 0) {
          return reply.status(400).send({ error: 'Team posts require at least one player role or staff need.' });
        }

        data.teamId = team.id;
        data.teamName = team.name;
        data.region = team.region;
        data.rolesNeeded = normalizedRolesNeeded;
        data.staffNeeded = normalizedStaffNeeded;
        data.averageRank = averageRank || null;
        data.averageDivision = averageDivision || null;
        data.scrims = scrims !== undefined ? scrims : null;
        data.minAvailability = minAvailability || null;
        data.coachingAvailability = coachingAvailability || null;
        data.details = details || null;

        const removedTeamPosts = await prisma.lftPost.deleteMany({
          where: {
            type: 'TEAM',
            teamId: team.id,
          },
        });
        replacedExistingPost = removedTeamPosts.count > 0;
      } else {
        // Player-specific fields
        const {
          mainRole,
          rank,
          division,
          experience,
          languages,
          skills,
          age,
          availability,
          candidateType,
          representedName,
          details,
        } = body;

        const normalizedCandidateType = normalizeCandidateType(candidateType);
        const normalizedRepresentedName = typeof representedName === 'string' ? representedName.trim() : '';
        const normalizedDetails = typeof details === 'string' ? details.trim() : '';

        if (normalizedCandidateType === 'PLAYER' && !mainRole) {
          return reply.status(400).send({ error: 'Player listings require a main role' });
        }

        if (normalizedCandidateType !== 'PLAYER' && normalizedDetails.length < 20) {
          return reply.status(400).send({ error: 'Coach/manager/other listings require a short details section (min 20 chars)' });
        }

        if (normalizedRepresentedName.length > 80) {
          return reply.status(400).send({ error: 'Represented name is too long (max 80 characters)' });
        }

        data.candidateType = normalizedCandidateType;
        data.representedName = normalizedRepresentedName || null;
        data.mainRole = normalizedCandidateType === 'PLAYER' ? mainRole : null;
        data.rank = rank || null;
        data.division = division || null;
        data.experience = experience || null;
        data.languages = languages || [];
        data.skills = skills || [];
        data.age = age || null;
        data.availability = availability || null;
        data.details = normalizedDetails || null;
      }

      const created = await prisma.lftPost.create({ data });

      return reply.status(201).send({ success: true, updated: replacedExistingPost, post: created });
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

      let canManageTeamPost = false;
      if (post.type === 'TEAM' && post.teamId) {
        const team = await prisma.team.findUnique({
          where: { id: post.teamId },
          select: {
            ownerId: true,
            members: {
              where: { userId: requesterId },
              select: { role: true },
            },
          },
        });

        canManageTeamPost = Boolean(
          team && (team.ownerId === requesterId || team.members.some((member: any) => member.role === 'MANAGER'))
        );
      }

      // Allow post owner, site admins, or authorized team managers/owners for TEAM posts.
      if (post.authorId !== requesterId && !isAdmin && !canManageTeamPost) {
        return reply.status(403).send({ error: 'You are not allowed to delete this post' });
      }

      await prisma.lftPost.delete({ where: { id } });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete post' });
    }
  });
}
