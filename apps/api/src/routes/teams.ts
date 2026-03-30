import prisma from '../prisma';

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

  // Helper to check if user is team owner or admin
  const isTeamOwnerOrAdmin = async (userId: string, teamId: string): Promise<boolean> => {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return false;
    if (team.ownerId === userId) return true;
    
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } });
    return (user?.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');
  };

  // Helper to check if user is team member
  const isTeamMember = async (userId: string, teamId: string): Promise<boolean> => {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    });
    return !!member;
  };

  // ==================== TEAM CRUD ====================

  // GET /api/teams - Get user's teams (as owner or member)
  fastify.get('/teams', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      // Get teams where user is a member (includes teams they own)
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
                select: { members: true, events: true, invitations: true }
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
        memberCount: m.team._count.members,
        eventCount: m.team._count.events,
        pendingInvites: m.team._count.invitations,
        members: m.team.members.map((mem: any) => ({
          userId: mem.userId,
          username: mem.user.username,
          role: mem.role,
          isOwner: mem.isOwner,
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

      // Get user's primary role for default member role
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Create team and add owner as first member
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
              role: user.primaryRole || 'FILL',
              isOwner: true
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
            isOwner: m.isOwner,
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

  // GET /api/teams/:id - Get team details
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
                    select: { rank: true, division: true }
                  }
                } 
              }
            },
            orderBy: { joinedAt: 'asc' }
          },
          invitations: {
            where: { status: 'PENDING' },
            include: {
              invitedUser: { select: { id: true, username: true } }
            }
          },
          events: {
            where: { scheduledAt: { gte: new Date() } },
            orderBy: { scheduledAt: 'asc' },
            take: 10
          }
        }
      });

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      // Check if user is a member
      const isMember = await isTeamMember(userId, id);
      if (!isMember) {
        return reply.status(403).send({ error: 'You are not a member of this team' });
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
        myRole: myMembership?.role || null,
        members: team.members.map((m: any) => ({
          userId: m.userId,
          username: m.user.username,
          role: m.role,
          isOwner: m.isOwner,
          joinedAt: m.joinedAt,
          rank: m.user.riotAccounts?.[0]?.rank || null,
          division: m.user.riotAccounts?.[0]?.division || null
        })),
        pendingInvitations: team.ownerId === userId ? team.invitations.map((inv: any) => ({
          id: inv.id,
          userId: inv.userId,
          username: inv.invitedUser.username,
          role: inv.role,
          status: inv.status,
          invitedAt: inv.invitedAt
        })) : [],
        upcomingEvents: team.events.map((e: any) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          description: e.description,
          scheduledAt: e.scheduledAt,
          duration: e.duration
        })),
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

      if (!await isTeamOwnerOrAdmin(userId, id)) {
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

      if (!await isTeamOwnerOrAdmin(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can delete team' });
      }

      await prisma.team.delete({ where: { id } });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete team' });
    }
  });

  // ==================== TEAM MEMBERS ====================

  // GET /api/teams/:id/members - Get team roster
  fastify.get('/teams/:id/members', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;

      if (!await isTeamMember(userId, id)) {
        return reply.status(403).send({ error: 'You are not a member of this team' });
      }

      const members = await prisma.teamMember.findMany({
        where: { teamId: id },
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
      });

      return reply.send(members.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        username: m.user.username,
        role: m.role,
        isOwner: m.isOwner,
        joinedAt: m.joinedAt,
        rank: m.user.riotAccounts?.[0]?.rank || null,
        division: m.user.riotAccounts?.[0]?.division || null,
        riotId: m.user.riotAccounts?.[0] 
          ? `${m.user.riotAccounts[0].gameName}#${m.user.riotAccounts[0].tagLine}`
          : null
      })));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch members' });
    }
  });

  // PUT /api/teams/:id/members/:userId - Update member role (owner only)
  fastify.put('/teams/:id/members/:memberId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, memberId } = request.params as any;
      const { role } = request.body as any;

      if (!await isTeamOwnerOrAdmin(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can update member roles' });
      }

      if (!role) {
        return reply.status(400).send({ error: 'Role is required' });
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

  // DELETE /api/teams/:id/members/:userId - Remove member (owner or self)
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

      // Allow self-leave or owner removal
      const isOwner = team.ownerId === userId;
      const isSelf = memberId === userId;
      
      if (!isOwner && !isSelf) {
        const user = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } });
        const isAdmin = (user?.badges || []).some((b: any) => (b.key || '').toLowerCase() === 'admin');
        if (!isAdmin) {
          return reply.status(403).send({ error: 'Only team owner can remove members' });
        }
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

  // ==================== TEAM INVITATIONS ====================

  // GET /api/teams/invitations - Get user's pending invitations
  fastify.get('/teams/invitations', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const invitations = await prisma.teamInvitation.findMany({
        where: { userId, status: 'PENDING' },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              tag: true,
              region: true,
              owner: { select: { id: true, username: true } },
              _count: { select: { members: true } }
            }
          }
        },
        orderBy: { invitedAt: 'desc' }
      });

      return reply.send(invitations.map((inv: any) => ({
        id: inv.id,
        teamId: inv.team.id,
        teamName: inv.team.name,
        teamTag: inv.team.tag,
        teamRegion: inv.team.region,
        ownerUsername: inv.team.owner.username,
        memberCount: inv.team._count.members,
        role: inv.role,
        message: inv.message,
        invitedAt: inv.invitedAt
      })));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch invitations' });
    }
  });

  // POST /api/teams/:id/invite - Invite user to team (owner only)
  fastify.post('/teams/:id/invite', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;
      const { username, role, message } = request.body as any;

      if (!await isTeamOwnerOrAdmin(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can invite members' });
      }

      if (!username || !role) {
        return reply.status(400).send({ error: 'Username and role are required' });
      }

      // Find user to invite
      const invitedUser = await prisma.user.findUnique({ where: { username } });
      if (!invitedUser) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Check if already a member
      if (await isTeamMember(invitedUser.id, id)) {
        return reply.status(400).send({ error: 'User is already a team member' });
      }

      // Check for existing pending invitation
      const existing = await prisma.teamInvitation.findUnique({
        where: { teamId_userId: { teamId: id, userId: invitedUser.id } }
      });
      if (existing && existing.status === 'PENDING') {
        return reply.status(400).send({ error: 'Invitation already pending' });
      }

      // Check team size limit (max 10 members)
      const memberCount = await prisma.teamMember.count({ where: { teamId: id } });
      if (memberCount >= 10) {
        return reply.status(400).send({ error: 'Team is full (max 10 members)' });
      }

      // Create or update invitation
      const invitation = await prisma.teamInvitation.upsert({
        where: { teamId_userId: { teamId: id, userId: invitedUser.id } },
        update: { status: 'PENDING', role, message: message || null, invitedAt: new Date(), respondedAt: null },
        create: { teamId: id, userId: invitedUser.id, role, message: message || null }
      });

      return reply.status(201).send({ success: true, invitation });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send invitation' });
    }
  });

  // PUT /api/teams/invitations/:id - Accept or decline invitation
  fastify.put('/teams/invitations/:invitationId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { invitationId } = request.params as any;
      const { action } = request.body as any; // 'accept' or 'decline'

      if (!action || !['accept', 'decline'].includes(action)) {
        return reply.status(400).send({ error: 'Action must be "accept" or "decline"' });
      }

      const invitation = await prisma.teamInvitation.findUnique({
        where: { id: invitationId },
        include: { team: true }
      });

      if (!invitation) {
        return reply.status(404).send({ error: 'Invitation not found' });
      }

      if (invitation.userId !== userId) {
        return reply.status(403).send({ error: 'This invitation is not for you' });
      }

      if (invitation.status !== 'PENDING') {
        return reply.status(400).send({ error: 'Invitation has already been responded to' });
      }

      if (action === 'accept') {
        // Check team size limit
        const memberCount = await prisma.teamMember.count({ where: { teamId: invitation.teamId } });
        if (memberCount >= 10) {
          return reply.status(400).send({ error: 'Team is full (max 10 members)' });
        }

        // Add as member and update invitation
        await prisma.$transaction([
          prisma.teamMember.create({
            data: {
              teamId: invitation.teamId,
              userId,
              role: invitation.role,
              isOwner: false
            }
          }),
          prisma.teamInvitation.update({
            where: { id: invitationId },
            data: { status: 'ACCEPTED', respondedAt: new Date() }
          })
        ]);
      } else {
        // Decline
        await prisma.teamInvitation.update({
          where: { id: invitationId },
          data: { status: 'DECLINED', respondedAt: new Date() }
        });
      }

      return reply.send({ success: true, action });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to respond to invitation' });
    }
  });

  // DELETE /api/teams/:id/invitations/:invitationId - Cancel invitation (owner only)
  fastify.delete('/teams/:id/invitations/:invitationId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, invitationId } = request.params as any;

      if (!await isTeamOwnerOrAdmin(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can cancel invitations' });
      }

      await prisma.teamInvitation.delete({ where: { id: invitationId } });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to cancel invitation' });
    }
  });

  // ==================== TEAM EVENTS ====================

  // GET /api/teams/:id/events - Get team events
  fastify.get('/teams/:id/events', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;
      const { past } = request.query as any; // ?past=true to include past events

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
        take: 50
      });

      return reply.send(events.map((e: any) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        description: e.description,
        scheduledAt: e.scheduledAt,
        duration: e.duration,
        createdBy: e.createdBy,
        createdAt: e.createdAt
      })));
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch events' });
    }
  });

  // POST /api/teams/:id/events - Create team event (members can create)
  fastify.post('/teams/:id/events', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;
      const { title, type, description, scheduledAt, duration } = request.body as any;

      if (!await isTeamMember(userId, id)) {
        return reply.status(403).send({ error: 'You are not a member of this team' });
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

  // PUT /api/teams/:id/events/:eventId - Update event (creator or owner)
  fastify.put('/teams/:id/events/:eventId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, eventId } = request.params as any;
      const { title, type, description, scheduledAt, duration } = request.body as any;

      const event = await prisma.teamEvent.findUnique({ where: { id: eventId } });
      if (!event || event.teamId !== id) {
        return reply.status(404).send({ error: 'Event not found' });
      }

      // Allow creator or team owner
      const isOwner = await isTeamOwnerOrAdmin(userId, id);
      if (event.createdBy !== userId && !isOwner) {
        return reply.status(403).send({ error: 'Only event creator or team owner can update' });
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

  // DELETE /api/teams/:id/events/:eventId - Delete event (creator or owner)
  fastify.delete('/teams/:id/events/:eventId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, eventId } = request.params as any;

      const event = await prisma.teamEvent.findUnique({ where: { id: eventId } });
      if (!event || event.teamId !== id) {
        return reply.status(404).send({ error: 'Event not found' });
      }

      // Allow creator or team owner
      const isOwner = await isTeamOwnerOrAdmin(userId, id);
      if (event.createdBy !== userId && !isOwner) {
        return reply.status(403).send({ error: 'Only event creator or team owner can delete' });
      }

      await prisma.teamEvent.delete({ where: { id: eventId } });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete event' });
    }
  });
}
