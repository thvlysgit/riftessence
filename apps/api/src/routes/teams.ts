import prisma from '../prisma';
import { getPuuid } from '../riotClient';

// Valid team roles
const TEAM_ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS', 'MANAGER', 'OWNER', 'COACH'] as const;
const PLAYER_ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS'] as const;
const STAFF_ROLES = ['MANAGER', 'COACH'] as const;

export default async function teamsRoutes(fastify: any) {
  // Helper to extract userId from JWT
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

  // Helper to check if user is team owner
  const isTeamOwner = async (userId: string, teamId: string): Promise<boolean> => {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    return team?.ownerId === userId;
  };

  // Helper to check if user can manage roster (OWNER or MANAGER)
  const canManageRoster = async (userId: string, teamId: string): Promise<boolean> => {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return false;
    if (team.ownerId === userId) return true;
    
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    });
    return member?.role === 'MANAGER';
  };

  // Helper to check if user can edit schedule (OWNER, MANAGER, COACH)
  const canEditSchedule = async (userId: string, teamId: string): Promise<boolean> => {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return false;
    if (team.ownerId === userId) return true;
    
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    });
    return member?.role === 'MANAGER' || member?.role === 'COACH';
  };

  // Helper to check if user is team member
  const isTeamMember = async (userId: string, teamId: string): Promise<boolean> => {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    });
    return !!member;
  };

  // Helper to get user's Riot account PUUID
  const getUserPuuid = async (userId: string): Promise<string | null> => {
    const account = await prisma.riotAccount.findFirst({
      where: { userId, isMain: true }
    });
    return account?.puuid || null;
  };

  // ==================== TEAM CRUD ====================

  // GET /api/teams - Get user's teams (as owner or member)
  fastify.get('/teams', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const memberships = await prisma.teamMember.findMany({
        where: { userId },
        include: {
          team: {
            include: {
              owner: { select: { id: true, username: true } },
              members: {
                include: {
                  user: { select: { id: true, username: true } }
                }
              },
              _count: {
                select: { members: true, events: true, pendingSpots: true }
              }
            }
          }
        }
      });

      const teams = memberships.map((m: any) => ({
        id: m.team.id,
        name: m.team.name,
        tag: m.team.tag,
        description: m.team.description,
        region: m.team.region,
        ownerId: m.team.ownerId,
        ownerUsername: m.team.owner.username,
        isOwner: m.team.ownerId === userId,
        myRole: m.role,
        canEditSchedule: m.team.ownerId === userId || m.role === 'MANAGER' || m.role === 'COACH',
        memberCount: m.team._count.members,
        eventCount: m.team._count.events,
        pendingCount: m.team._count.pendingSpots,
        members: m.team.members.map((mem: any) => ({
          userId: mem.userId,
          username: mem.user.username,
          role: mem.role,
          joinedAt: mem.joinedAt
        })),
        createdAt: m.team.createdAt,
        updatedAt: m.team.updatedAt
      }));

      return reply.send(teams);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch teams' });
    }
  });

  // POST /api/teams - Create a new team
  fastify.post('/teams', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { name, tag, description, region } = request.body as any;

      if (!name || !region) {
        return reply.status(400).send({ error: 'Team name and region are required' });
      }

      if (name.length < 2 || name.length > 50) {
        return reply.status(400).send({ error: 'Team name must be 2-50 characters' });
      }

      if (tag && (tag.length < 2 || tag.length > 5)) {
        return reply.status(400).send({ error: 'Team tag must be 2-5 characters' });
      }

      // Limit teams per user (max 5 owned teams)
      const ownedCount = await prisma.team.count({ where: { ownerId: userId } });
      if (ownedCount >= 5) {
        return reply.status(400).send({ error: 'You can own up to 5 teams' });
      }

      // Create team and add owner as first member with OWNER role
      const team = await prisma.team.create({
        data: {
          name,
          tag: tag || null,
          description: description || null,
          region,
          ownerId: userId,
          members: {
            create: {
              userId,
              role: 'OWNER'
            }
          }
        },
        include: {
          owner: { select: { id: true, username: true } },
          members: {
            include: {
              user: { select: { id: true, username: true } }
            }
          }
        }
      });

      return reply.status(201).send({
        success: true,
        team: {
          id: team.id,
          name: team.name,
          tag: team.tag,
          description: team.description,
          region: team.region,
          ownerId: team.ownerId,
          ownerUsername: team.owner.username,
          members: team.members.map((m: any) => ({
            userId: m.userId,
            username: m.user.username,
            role: m.role,
            joinedAt: m.joinedAt
          })),
          createdAt: team.createdAt
        }
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create team' });
    }
  });

  // GET /api/teams/:id - Get team details (public for link sharing, returns canJoin info)
  fastify.get('/teams/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;

      const team = await prisma.team.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, username: true } },
          members: {
            include: {
              user: { 
                select: { 
                  id: true, 
                  username: true,
                  riotAccounts: {
                    where: { isMain: true },
                    select: { rank: true, division: true, gameName: true, tagLine: true }
                  }
                } 
              }
            },
            orderBy: { joinedAt: 'asc' }
          },
          pendingSpots: {
            orderBy: { addedAt: 'asc' }
          },
          events: {
            where: { scheduledAt: { gte: new Date() } },
            orderBy: { scheduledAt: 'asc' },
            take: 10,
            include: {
              attendances: true
            }
          }
        }
      });

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      const isMember = await isTeamMember(userId, id);
      const canManage = await canManageRoster(userId, id);
      
      // Check if user can join (has pending spot matching their account)
      let canJoin = false;
      let pendingSpotId: string | null = null;
      let pendingSpotRole: string | null = null;
      
      if (!isMember) {
        // Check by PUUID (for players)
        const userPuuid = await getUserPuuid(userId);
        if (userPuuid) {
          const spotByPuuid = team.pendingSpots.find((s: any) => s.puuid === userPuuid);
          if (spotByPuuid) {
            canJoin = true;
            pendingSpotId = spotByPuuid.id;
            pendingSpotRole = spotByPuuid.role;
          }
        }
        
        // Check by username (for staff)
        if (!canJoin) {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            const spotByUsername = team.pendingSpots.find((s: any) => 
              s.username && s.username.toLowerCase() === user.username.toLowerCase()
            );
            if (spotByUsername) {
              canJoin = true;
              pendingSpotId = spotByUsername.id;
              pendingSpotRole = spotByUsername.role;
            }
          }
        }
      }

      const myMembership = team.members.find((m: any) => m.userId === userId);

      return reply.send({
        id: team.id,
        name: team.name,
        tag: team.tag,
        description: team.description,
        region: team.region,
        ownerId: team.ownerId,
        ownerUsername: team.owner.username,
        isOwner: team.ownerId === userId,
        isMember,
        canJoin,
        pendingSpotId,
        pendingSpotRole,
        myRole: myMembership?.role || null,
        canManageRoster: canManage,
        canEditSchedule: await canEditSchedule(userId, id),
        members: team.members.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          username: m.user.username,
          role: m.role,
          joinedAt: m.joinedAt,
          rank: m.user.riotAccounts?.[0]?.rank || null,
          division: m.user.riotAccounts?.[0]?.division || null,
          riotId: m.user.riotAccounts?.[0] 
            ? `${m.user.riotAccounts[0].gameName}#${m.user.riotAccounts[0].tagLine}`
            : null
        })),
        pendingRoster: canManage ? team.pendingSpots.map((spot: any) => ({
          id: spot.id,
          riotId: spot.riotId,
          username: spot.username,
          role: spot.role,
          addedAt: spot.addedAt
        })) : [],
        upcomingEvents: isMember ? team.events.map((e: any) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          description: e.description,
          scheduledAt: e.scheduledAt,
          duration: e.duration,
          attendances: e.attendances.map((a: any) => ({
            userId: a.userId,
            status: a.status
          }))
        })) : [],
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch team' });
    }
  });

  // PUT /api/teams/:id - Update team (owner only)
  fastify.put('/teams/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;
      const { name, tag, description, region } = request.body as any;

      if (!await isTeamOwner(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can update team' });
      }

      if (name && (name.length < 2 || name.length > 50)) {
        return reply.status(400).send({ error: 'Team name must be 2-50 characters' });
      }

      if (tag && (tag.length < 2 || tag.length > 5)) {
        return reply.status(400).send({ error: 'Team tag must be 2-5 characters' });
      }

      const updated = await prisma.team.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(tag !== undefined && { tag: tag || null }),
          ...(description !== undefined && { description: description || null }),
          ...(region && { region })
        }
      });

      return reply.send({ success: true, team: updated });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update team' });
    }
  });

  // DELETE /api/teams/:id - Delete team (owner only)
  fastify.delete('/teams/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;

      if (!await isTeamOwner(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can delete team' });
      }

      await prisma.team.delete({ where: { id } });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete team' });
    }
  });

  // ==================== ROSTER MANAGEMENT ====================

  // POST /api/teams/:id/roster - Add pending spot (OWNER/MANAGER only)
  // For players: { riotId: "Player#TAG", role: "TOP" }
  // For staff: { username: "username", role: "MANAGER" or "COACH" }
  fastify.post('/teams/:id/roster', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;
      const { riotId, username, role } = request.body as any;

      if (!await canManageRoster(userId, id)) {
        return reply.status(403).send({ error: 'Only owner or manager can add to roster' });
      }

      if (!role || !TEAM_ROLES.includes(role)) {
        return reply.status(400).send({ error: `Role must be one of: ${TEAM_ROLES.join(', ')}` });
      }

      // Cannot add OWNER role (there's only one owner)
      if (role === 'OWNER') {
        return reply.status(400).send({ error: 'Cannot add another owner' });
      }

      const team = await prisma.team.findUnique({ where: { id } });
      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      // Check team size limit (max 15 total including pending)
      const memberCount = await prisma.teamMember.count({ where: { teamId: id } });
      const pendingCount = await prisma.teamPendingSpot.count({ where: { teamId: id } });
      if (memberCount + pendingCount >= 15) {
        return reply.status(400).send({ error: 'Team roster is full (max 15 spots)' });
      }

      // Staff roles require username
      if (STAFF_ROLES.includes(role as any)) {
        if (!username) {
          return reply.status(400).send({ error: 'Username is required for Manager/Coach roles' });
        }

        // Verify user exists
        const staffUser = await prisma.user.findUnique({ where: { username } });
        if (!staffUser) {
          return reply.status(404).send({ error: 'User not found. They must have a riftessence profile first.' });
        }

        // Check if already a member
        const existingMember = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: id, userId: staffUser.id } }
        });
        if (existingMember) {
          return reply.status(400).send({ error: 'User is already a team member' });
        }

        // Check if already pending
        const existingPending = await prisma.teamPendingSpot.findFirst({
          where: { teamId: id, username: { equals: username, mode: 'insensitive' } }
        });
        if (existingPending) {
          return reply.status(400).send({ error: 'User already has a pending spot' });
        }

        const spot = await prisma.teamPendingSpot.create({
          data: {
            teamId: id,
            username,
            role
          }
        });

        return reply.status(201).send({ success: true, spot });
      }

      // Player roles require riotId
      if (PLAYER_ROLES.includes(role as any)) {
        if (!riotId) {
          return reply.status(400).send({ error: 'Riot ID is required for player roles' });
        }

        // Parse Riot ID
        const riotIdParts = riotId.split('#');
        if (riotIdParts.length !== 2) {
          return reply.status(400).send({ error: 'Invalid Riot ID format. Use: GameName#TAG' });
        }
        const [gameName, tagLine] = riotIdParts;

        // Validate Riot ID via Riot API
        let puuid: string | null = null;
        try {
          puuid = await getPuuid(gameName, tagLine, team.region);
        } catch (err: any) {
          fastify.log.error('Riot API error:', err);
          return reply.status(500).send({ error: 'Failed to verify Riot ID. Please try again.' });
        }

        if (!puuid) {
          return reply.status(404).send({ error: 'Riot ID not found. Please check the name and tag.' });
        }

        // Check if PUUID already in a team (as member)
        const existingMember = await prisma.teamMember.findFirst({
          where: {
            user: {
              riotAccounts: {
                some: { puuid }
              }
            }
          },
          include: { team: { select: { name: true } } }
        });
        if (existingMember) {
          return reply.status(400).send({ 
            error: `This player is already in team "${existingMember.team.name}"` 
          });
        }

        // Check if already pending in THIS team
        const existingPending = await prisma.teamPendingSpot.findUnique({
          where: { teamId_puuid: { teamId: id, puuid } }
        });
        if (existingPending) {
          return reply.status(400).send({ error: 'This Riot ID already has a pending spot' });
        }

        const spot = await prisma.teamPendingSpot.create({
          data: {
            teamId: id,
            riotId,
            puuid,
            role
          }
        });

        return reply.status(201).send({ success: true, spot });
      }

      return reply.status(400).send({ error: 'Invalid role type' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to add to roster' });
    }
  });

  // DELETE /api/teams/:id/roster/:spotId - Remove pending spot (OWNER/MANAGER only)
  fastify.delete('/teams/:id/roster/:spotId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, spotId } = request.params as any;

      if (!await canManageRoster(userId, id)) {
        return reply.status(403).send({ error: 'Only owner or manager can remove roster spots' });
      }

      const spot = await prisma.teamPendingSpot.findUnique({ where: { id: spotId } });
      if (!spot || spot.teamId !== id) {
        return reply.status(404).send({ error: 'Pending spot not found' });
      }

      await prisma.teamPendingSpot.delete({ where: { id: spotId } });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove roster spot' });
    }
  });

  // POST /api/teams/:id/join - Join team (claim pending spot)
  fastify.post('/teams/:id/join', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;

      // Check if already a member
      if (await isTeamMember(userId, id)) {
        return reply.status(400).send({ error: 'You are already a member of this team' });
      }

      const team = await prisma.team.findUnique({
        where: { id },
        include: { pendingSpots: true }
      });

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      // Find matching pending spot
      let matchingSpot: any = null;

      // Check by PUUID
      const userPuuid = await getUserPuuid(userId);
      if (userPuuid) {
        matchingSpot = team.pendingSpots.find((s: any) => s.puuid === userPuuid);
      }

      // Check by username
      if (!matchingSpot) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          matchingSpot = team.pendingSpots.find((s: any) => 
            s.username && s.username.toLowerCase() === user.username.toLowerCase()
          );
        }
      }

      if (!matchingSpot) {
        return reply.status(403).send({ error: 'You have not been added to this team\'s roster' });
      }

      // Join team and remove pending spot
      await prisma.$transaction([
        prisma.teamMember.create({
          data: {
            teamId: id,
            userId,
            role: matchingSpot.role
          }
        }),
        prisma.teamPendingSpot.delete({ where: { id: matchingSpot.id } })
      ]);

      return reply.send({ success: true, role: matchingSpot.role });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to join team' });
    }
  });

  // ==================== TEAM MEMBERS ====================

  // PUT /api/teams/:id/members/:memberId - Update member role (OWNER/MANAGER only)
  fastify.put('/teams/:id/members/:memberId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, memberId } = request.params as any;
      const { role } = request.body as any;

      if (!await canManageRoster(userId, id)) {
        return reply.status(403).send({ error: 'Only owner or manager can update roles' });
      }

      if (!role || !TEAM_ROLES.includes(role)) {
        return reply.status(400).send({ error: `Role must be one of: ${TEAM_ROLES.join(', ')}` });
      }

      // Cannot change to OWNER
      if (role === 'OWNER') {
        return reply.status(400).send({ error: 'Cannot assign OWNER role. Transfer ownership instead.' });
      }

      const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: memberId } }
      });

      if (!member) {
        return reply.status(404).send({ error: 'Member not found' });
      }

      // Cannot change owner's role
      const team = await prisma.team.findUnique({ where: { id } });
      if (team?.ownerId === memberId) {
        return reply.status(400).send({ error: 'Cannot change team owner\'s role' });
      }

      const updated = await prisma.teamMember.update({
        where: { teamId_userId: { teamId: id, userId: memberId } },
        data: { role }
      });

      return reply.send({ success: true, member: updated });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update member' });
    }
  });

  // DELETE /api/teams/:id/members/:memberId - Remove member (OWNER/MANAGER or self)
  fastify.delete('/teams/:id/members/:memberId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, memberId } = request.params as any;

      const team = await prisma.team.findUnique({ where: { id } });
      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      // Owner cannot be removed
      if (memberId === team.ownerId) {
        return reply.status(400).send({ error: 'Team owner cannot be removed. Transfer ownership or delete team.' });
      }

      // Allow self-leave, owner removal, or manager removal
      const isSelf = memberId === userId;
      const canManage = await canManageRoster(userId, id);
      
      if (!isSelf && !canManage) {
        return reply.status(403).send({ error: 'Only owner/manager can remove members' });
      }

      await prisma.teamMember.delete({
        where: { teamId_userId: { teamId: id, userId: memberId } }
      });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove member' });
    }
  });

  // ==================== TEAM EVENTS ====================

  // GET /api/teams/:id/events - Get team events
  fastify.get('/teams/:id/events', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;
      const { past } = request.query as any;

      if (!await isTeamMember(userId, id)) {
        return reply.status(403).send({ error: 'You are not a member of this team' });
      }

      const where: any = { teamId: id };
      if (!past) {
        where.scheduledAt = { gte: new Date() };
      }

      const events = await prisma.teamEvent.findMany({
        where,
        orderBy: { scheduledAt: past ? 'desc' : 'asc' },
        take: 50,
        include: {
          attendances: {
            include: {
              user: { select: { id: true, username: true } }
            }
          }
        }
      });

      return reply.send(events.map((e: any) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        description: e.description,
        scheduledAt: e.scheduledAt,
        duration: e.duration,
        createdBy: e.createdBy,
        createdAt: e.createdAt,
        attendances: e.attendances.map((a: any) => ({
          userId: a.userId,
          username: a.user.username,
          status: a.status
        }))
      })));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch events' });
    }
  });

  // POST /api/teams/:id/events - Create team event (OWNER/MANAGER/COACH only)
  fastify.post('/teams/:id/events', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;
      const { title, type, description, scheduledAt, duration } = request.body as any;

      if (!await canEditSchedule(userId, id)) {
        return reply.status(403).send({ error: 'Only owner, manager, or coach can create events' });
      }

      if (!title || !type || !scheduledAt) {
        return reply.status(400).send({ error: 'Title, type, and scheduledAt are required' });
      }

      const validTypes = ['SCRIM', 'PRACTICE', 'VOD_REVIEW', 'TOURNAMENT', 'TEAM_MEETING'];
      if (!validTypes.includes(type)) {
        return reply.status(400).send({ error: `Type must be one of: ${validTypes.join(', ')}` });
      }

      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return reply.status(400).send({ error: 'Invalid scheduledAt date' });
      }

      const event = await prisma.teamEvent.create({
        data: {
          teamId: id,
          title,
          type,
          description: description || null,
          scheduledAt: scheduledDate,
          duration: duration ? parseInt(duration) : null,
          createdBy: userId
        }
      });

      return reply.status(201).send({ success: true, event });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create event' });
    }
  });

  // PUT /api/teams/:id/events/:eventId - Update event (OWNER/MANAGER/COACH only)
  fastify.put('/teams/:id/events/:eventId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, eventId } = request.params as any;
      const { title, type, description, scheduledAt, duration } = request.body as any;

      if (!await canEditSchedule(userId, id)) {
        return reply.status(403).send({ error: 'Only owner, manager, or coach can update events' });
      }

      const event = await prisma.teamEvent.findUnique({ where: { id: eventId } });
      if (!event || event.teamId !== id) {
        return reply.status(404).send({ error: 'Event not found' });
      }

      const validTypes = ['SCRIM', 'PRACTICE', 'VOD_REVIEW', 'TOURNAMENT', 'TEAM_MEETING'];
      if (type && !validTypes.includes(type)) {
        return reply.status(400).send({ error: `Type must be one of: ${validTypes.join(', ')}` });
      }

      let scheduledDate;
      if (scheduledAt) {
        scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
          return reply.status(400).send({ error: 'Invalid scheduledAt date' });
        }
      }

      const updated = await prisma.teamEvent.update({
        where: { id: eventId },
        data: {
          ...(title && { title }),
          ...(type && { type }),
          ...(description !== undefined && { description: description || null }),
          ...(scheduledDate && { scheduledAt: scheduledDate }),
          ...(duration !== undefined && { duration: duration ? parseInt(duration) : null })
        }
      });

      return reply.send({ success: true, event: updated });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update event' });
    }
  });

  // DELETE /api/teams/:id/events/:eventId - Delete event (OWNER/MANAGER/COACH only)
  fastify.delete('/teams/:id/events/:eventId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, eventId } = request.params as any;

      if (!await canEditSchedule(userId, id)) {
        return reply.status(403).send({ error: 'Only owner, manager, or coach can delete events' });
      }

      const event = await prisma.teamEvent.findUnique({ where: { id: eventId } });
      if (!event || event.teamId !== id) {
        return reply.status(404).send({ error: 'Event not found' });
      }

      await prisma.teamEvent.delete({ where: { id: eventId } });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete event' });
    }
  });

  // PUT /api/teams/:id/events/:eventId/attendance - Toggle attendance status (any member)
  fastify.put('/teams/:id/events/:eventId/attendance', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, eventId } = request.params as any;

      if (!await isTeamMember(userId, id)) {
        return reply.status(403).send({ error: 'You are not a member of this team' });
      }

      const event = await prisma.teamEvent.findUnique({ where: { id: eventId } });
      if (!event || event.teamId !== id) {
        return reply.status(404).send({ error: 'Event not found' });
      }

      // Get current attendance or create new
      const existing = await prisma.teamEventAttendance.findUnique({
        where: { eventId_userId: { eventId, userId } }
      });

      // Cycle: UNSURE -> ABSENT -> PRESENT -> UNSURE
      const statusCycle: Record<string, string> = {
        'UNSURE': 'ABSENT',
        'ABSENT': 'PRESENT',
        'PRESENT': 'UNSURE'
      };

      const currentStatus = existing?.status || 'UNSURE';
      const newStatus = statusCycle[currentStatus] || 'ABSENT';

      const attendance = await prisma.teamEventAttendance.upsert({
        where: { eventId_userId: { eventId, userId } },
        update: { status: newStatus as any },
        create: { eventId, userId, status: newStatus as any }
      });

      return reply.send({ success: true, status: attendance.status });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update attendance' });
    }
  });
}
