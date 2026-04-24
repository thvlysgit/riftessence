import prisma from '../prisma';
import { getPuuid } from '../riotClient';
import {
  sendTeamDiscordWebhook,
  validateDiscordWebhook,
  createTeamMemberJoinedEmbed
} from '../utils/discord-webhook';

// Valid team roles
const TEAM_ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS', 'MANAGER', 'OWNER', 'COACH'] as const;
const PLAYER_ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS'] as const;
const STAFF_ROLES = ['MANAGER', 'COACH'] as const;
const TEAM_EVENT_TYPES = ['SCRIM', 'PRACTICE', 'VOD_REVIEW', 'TOURNAMENT', 'TEAM_MEETING'] as const;
const DISCORD_MENTION_MODES = ['EVERYONE', 'ROLE', 'TEAM_ROLE_MAP'] as const;
const MIN_TEAM_REMINDER_MINUTES = 5;
const MAX_TEAM_REMINDER_MINUTES = 7 * 24 * 60;
const MAX_TEAM_REMINDER_OPTIONS = 8;
const DRAFT_ALLOWED_SIDES = ['BLUE', 'RED'] as const;
const DRAFT_ALLOWED_ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'] as const;
const DRAFT_BAN_COUNT = 5;
const DRAFT_PICK_COUNT = 10;

export default async function teamsRoutes(fastify: any) {
  const isSchemaOutOfDateError = (error: any) => {
    const code = error?.code;
    return code === 'P2021' || code === 'P2022';
  };

  const buildConcernedEventFilter = (userId: string) => ({
    OR: [
      { concernedMemberIds: { isEmpty: true } },
      { concernedMemberIds: { has: userId } },
    ],
  });

  const normalizeDiscordRoleId = (raw: any): string | null => {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const mentionMatch = trimmed.match(/^<@&(\d+)>$/);
    const roleId = mentionMatch ? mentionMatch[1] : trimmed;
    return /^\d{6,30}$/.test(roleId) ? roleId : null;
  };

  const sanitizeRoleMentionMap = (raw: any) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {} as Record<string, string>;
    }

    const result: Record<string, string> = {};
    for (const role of TEAM_ROLES) {
      const normalized = normalizeDiscordRoleId((raw as Record<string, any>)[role]);
      if (normalized) {
        result[role] = normalized;
      }
    }
    return result;
  };

  const normalizeStoredReminderDelays = (raw: any): number[] => {
    if (!Array.isArray(raw)) return [];

    const unique = new Set<number>();
    for (const entry of raw) {
      const parsed = typeof entry === 'number' ? entry : parseInt(String(entry), 10);
      if (!Number.isInteger(parsed)) continue;
      if (parsed < MIN_TEAM_REMINDER_MINUTES || parsed > MAX_TEAM_REMINDER_MINUTES) continue;
      unique.add(parsed);
    }

    return Array.from(unique).sort((a, b) => a - b);
  };

  const sanitizeReminderDelayMinutes = (raw: any): { value: number[]; error: string | null } => {
    if (!Array.isArray(raw)) {
      return { value: [], error: 'reminderDelaysMinutes must be an array of minutes' };
    }

    if (raw.length > MAX_TEAM_REMINDER_OPTIONS) {
      return {
        value: [],
        error: `You can configure up to ${MAX_TEAM_REMINDER_OPTIONS} reminder delays`,
      };
    }

    const unique = new Set<number>();
    for (const entry of raw) {
      const parsed = typeof entry === 'number' ? entry : parseInt(String(entry), 10);
      if (!Number.isInteger(parsed)) {
        return { value: [], error: 'Reminder delays must be whole minutes' };
      }

      if (parsed < MIN_TEAM_REMINDER_MINUTES || parsed > MAX_TEAM_REMINDER_MINUTES) {
        return {
          value: [],
          error: `Reminder delays must be between ${MIN_TEAM_REMINDER_MINUTES} and ${MAX_TEAM_REMINDER_MINUTES} minutes`,
        };
      }

      unique.add(parsed);
    }

    return { value: Array.from(unique).sort((a, b) => a - b), error: null };
  };

  const areNumberArraysEqual = (a: number[], b: number[]): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  const buildReminderRowsForEvent = (params: {
    teamId: string;
    eventId: string;
    scheduledAt: Date;
    reminderDelaysMinutes: number[];
  }) => {
    const nowMs = Date.now();
    const rows: Array<{ teamId: string; eventId: string; reminderMinutes: number; remindAt: Date }> = [];

    for (const reminderMinutes of params.reminderDelaysMinutes) {
      const remindAtMs = params.scheduledAt.getTime() - reminderMinutes * 60 * 1000;
      if (remindAtMs <= nowMs) continue;

      rows.push({
        teamId: params.teamId,
        eventId: params.eventId,
        reminderMinutes,
        remindAt: new Date(remindAtMs),
      });
    }

    return rows;
  };

  const queueEventReminders = async (params: {
    teamId: string;
    eventId: string;
    scheduledAt: Date;
    remindersEnabled: boolean;
    reminderDelaysMinutes: number[];
  }) => {
    await prisma.teamEventReminder.deleteMany({
      where: { eventId: params.eventId },
    });

    if (!params.remindersEnabled || params.reminderDelaysMinutes.length === 0) {
      return;
    }

    const rows = buildReminderRowsForEvent(params);
    if (rows.length === 0) {
      return;
    }

    await prisma.teamEventReminder.createMany({
      data: rows,
      skipDuplicates: true,
    });
  };

  const rebuildUpcomingTeamReminders = async (params: {
    teamId: string;
    remindersEnabled: boolean;
    reminderDelaysMinutes: number[];
  }) => {
    const upcomingEvents = await prisma.teamEvent.findMany({
      where: {
        teamId: params.teamId,
        scheduledAt: { gt: new Date() },
      },
      select: {
        id: true,
        scheduledAt: true,
      },
      take: 500,
    });

    const upcomingEventIds = upcomingEvents.map((event: { id: string; scheduledAt: Date }) => event.id);
    if (upcomingEventIds.length > 0) {
      await prisma.teamEventReminder.deleteMany({
        where: {
          teamId: params.teamId,
          eventId: { in: upcomingEventIds },
        },
      });
    }

    if (!params.remindersEnabled || params.reminderDelaysMinutes.length === 0) {
      return;
    }

    const rows = upcomingEvents.flatMap((event: { id: string; scheduledAt: Date }) => buildReminderRowsForEvent({
      teamId: params.teamId,
      eventId: event.id,
      scheduledAt: event.scheduledAt,
      reminderDelaysMinutes: params.reminderDelaysMinutes,
    }));

    if (rows.length === 0) {
      return;
    }

    await prisma.teamEventReminder.createMany({
      data: rows,
      skipDuplicates: true,
    });
  };

  const normalizeConcernedMemberIds = async (teamId: string, raw: any): Promise<{ value: string[]; error: string | null }> => {
    if (raw === undefined || raw === null) {
      return { value: [], error: null };
    }

    if (!Array.isArray(raw)) {
      return { value: [], error: 'concernedMemberIds must be an array of user IDs' };
    }

    const uniqueMemberIds = Array.from(new Set(
      raw
        .filter((entry: any) => typeof entry === 'string')
        .map((entry: string) => entry.trim())
        .filter((entry: string) => entry.length > 0)
    ));

    if (uniqueMemberIds.length === 0) {
      return { value: [], error: null };
    }

    const members = await prisma.teamMember.findMany({
      where: {
        teamId,
        userId: { in: uniqueMemberIds },
      },
      select: { userId: true },
    });

    if (members.length !== uniqueMemberIds.length) {
      return { value: [], error: 'Some selected concerned members are not part of this team' };
    }

    return { value: uniqueMemberIds, error: null };
  };

  const normalizeDraftChampionValue = (value: any): string => {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, 64);
  };

  const parseDraftPayload = (raw: any): {
    value: {
      name: string;
      blueBans: string[];
      redBans: string[];
      picks: Array<{ side: 'BLUE' | 'RED'; champion: string; assignedRole: 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP' | null }>;
    } | null;
    error: string | null;
  } => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { value: null, error: 'Invalid payload' };
    }

    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name) {
      return { value: null, error: 'Draft name is required' };
    }
    if (name.length > 80) {
      return { value: null, error: 'Draft name must be 80 characters or less' };
    }

    const normalizeBans = (value: any, label: string): { value: string[] | null; error: string | null } => {
      if (!Array.isArray(value) || value.length !== DRAFT_BAN_COUNT) {
        return { value: null, error: `${label} must contain exactly ${DRAFT_BAN_COUNT} slots` };
      }
      return {
        value: value.map((entry: any) => normalizeDraftChampionValue(entry)),
        error: null,
      };
    };

    const blue = normalizeBans(raw.blueBans, 'blueBans');
    if (blue.error) return { value: null, error: blue.error };
    const red = normalizeBans(raw.redBans, 'redBans');
    if (red.error) return { value: null, error: red.error };

    if (!Array.isArray(raw.picks) || raw.picks.length !== DRAFT_PICK_COUNT) {
      return { value: null, error: `picks must contain exactly ${DRAFT_PICK_COUNT} slots` };
    }

    const picks: Array<{ side: 'BLUE' | 'RED'; champion: string; assignedRole: 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP' | null }> = [];
    for (const entry of raw.picks) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return { value: null, error: 'Each pick slot must be an object' };
      }

      const side = typeof entry.side === 'string' ? entry.side.toUpperCase() : '';
      if (!DRAFT_ALLOWED_SIDES.includes(side as any)) {
        return { value: null, error: 'Pick side must be BLUE or RED' };
      }

      const assignedRoleRaw = entry.assignedRole;
      const assignedRole = typeof assignedRoleRaw === 'string' ? assignedRoleRaw.toUpperCase() : null;
      if (assignedRole !== null && !DRAFT_ALLOWED_ROLES.includes(assignedRole as any)) {
        return { value: null, error: 'Pick assignedRole must be TOP, JGL, MID, ADC, SUP, or null' };
      }

      picks.push({
        side: side as 'BLUE' | 'RED',
        champion: normalizeDraftChampionValue(entry.champion),
        assignedRole: assignedRole as 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP' | null,
      });
    }

    return {
      value: {
        name,
        blueBans: blue.value || [],
        redBans: red.value || [],
        picks,
      },
      error: null,
    };
  };

  const getDiscordBotAuthorized = (request: any, reply: any): boolean => {
    const authHeader = request.headers.authorization;
    const expectedKey = process.env.DISCORD_BOT_API_KEY;

    if (!expectedKey) {
      reply.status(500).send({ error: 'Bot API key not configured on server' });
      return false;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Missing or invalid authorization header' });
      return false;
    }

    const providedKey = authHeader.substring(7);
    if (providedKey !== expectedKey) {
      reply.status(403).send({ error: 'Invalid bot API key' });
      return false;
    }

    return true;
  };

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

  const canAccessTeamDrafts = async (userId: string, teamId: string): Promise<boolean> => {
    if (await isTeamOwner(userId, teamId)) return true;
    return isTeamMember(userId, teamId);
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
              },
              events: {
                where: {
                  scheduledAt: { gte: new Date() },
                  ...buildConcernedEventFilter(userId),
                },
                select: { id: true }
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
        iconUrl: m.team.iconUrl,
        region: m.team.region,
        ownerId: m.team.ownerId,
        ownerUsername: m.team.owner.username,
        isOwner: m.team.ownerId === userId,
        myRole: m.role,
        canEditSchedule: m.team.ownerId === userId || m.role === 'MANAGER' || m.role === 'COACH',
        memberCount: m.team._count.members,
        eventCount: m.team._count.events,
        upcomingEventCount: m.team.events.length,
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
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Teams schema is not up to date. Run database schema sync (prisma db push or migrations) and retry.',
          code: 'TEAM_SCHEMA_OUTDATED',
        });
      }
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

      // Create team and add owner as first member with a normal team role.
      // Ownership permissions are derived from team.ownerId, not member.role.
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
              role: 'SUBS'
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
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Teams schema is not up to date. Run database schema sync (prisma db push or migrations) and retry.',
          code: 'TEAM_SCHEMA_OUTDATED',
        });
      }
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
                    where: { OR: [{ isMain: true }, { hidden: false }] },
                    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
                    take: 1,
                    select: { rank: true, division: true, lp: true, gameName: true, tagLine: true, region: true }
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
            where: {
              scheduledAt: { gte: new Date() },
              ...buildConcernedEventFilter(userId),
            },
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

      const [
        isMember,
        canManage,
        canEditScheduleValue,
        finalizedSeries,
        reviewsAggregate,
        recentReviews,
      ] = await Promise.all([
        isTeamMember(userId, id),
        canManageRoster(userId, id),
        canEditSchedule(userId, id),
        prisma.scrimSeries.findMany({
          where: {
            winnerConfirmedAt: { not: null },
            OR: [
              { hostTeamId: id },
              { guestTeamId: id },
            ],
          },
          select: {
            winnerTeamId: true,
          },
        }),
        prisma.scrimTeamReview.aggregate({
          where: { targetTeamId: id },
          _avg: { averageRating: true },
          _count: { _all: true },
        }),
        prisma.scrimTeamReview.findMany({
          where: {
            targetTeamId: id,
            message: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: 25,
          include: {
            reviewerTeam: {
              select: {
                id: true,
                name: true,
                tag: true,
              },
            },
            series: {
              select: {
                id: true,
                matchCode: true,
                scheduledAt: true,
              },
            },
          },
        }),
      ]);

      const totalSeries = finalizedSeries.length;
      const wins = finalizedSeries.filter((entry: any) => entry.winnerTeamId === id).length;
      const losses = Math.max(0, totalSeries - wins);
      const winRate = totalSeries > 0 ? Number(((wins / totalSeries) * 100).toFixed(1)) : null;

      const averageRating = typeof reviewsAggregate._avg.averageRating === 'number'
        ? Number(reviewsAggregate._avg.averageRating.toFixed(2))
        : null;
      const reviewCount = reviewsAggregate._count._all || 0;
      
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
        iconUrl: team.iconUrl,
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
        canEditSchedule: canEditScheduleValue,
        members: team.members.map((m: any) => {
          const riotAccount = m.user.riotAccounts?.[0];
          return {
            id: m.id,
            userId: m.userId,
            username: m.user.username,
            role: m.role,
            joinedAt: m.joinedAt,
            rank: riotAccount?.rank || null,
            division: riotAccount?.division || null,
            lp: riotAccount?.lp || null,
            gameName: riotAccount?.gameName || null,
            tagLine: riotAccount?.tagLine || null,
            riotRegion: riotAccount?.region || null,
          };
        }),
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
          concernedMemberIds: e.concernedMemberIds || [],
          attendances: e.attendances.map((a: any) => ({
            userId: a.userId,
            status: a.status
          }))
        })) : [],
        scrimPerformance: {
          totalSeries,
          wins,
          losses,
          winRate,
        },
        scrimReputation: {
          averageRating,
          reviewCount,
          recentReviews: (recentReviews as any[]).map((review) => ({
            id: review.id,
            reviewerTeam: review.reviewerTeam,
            politeness: review.politeness,
            punctuality: review.punctuality,
            gameplay: review.gameplay,
            averageRating: review.averageRating,
            message: review.message,
            createdAt: review.createdAt,
            series: review.series,
          })),
        },
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
      const { name, tag, description, region, iconUrl } = request.body as any;

      if (!await isTeamOwner(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can update team' });
      }

      if (name && (name.length < 2 || name.length > 50)) {
        return reply.status(400).send({ error: 'Team name must be 2-50 characters' });
      }

      if (tag && (tag.length < 2 || tag.length > 5)) {
        return reply.status(400).send({ error: 'Team tag must be 2-5 characters' });
      }

      // Validate iconUrl if provided
      if (iconUrl && !iconUrl.match(/^https?:\/\/.+/)) {
        return reply.status(400).send({ error: 'Icon URL must be a valid HTTP/HTTPS URL' });
      }

      const updated = await prisma.team.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(tag !== undefined && { tag: tag || null }),
          ...(description !== undefined && { description: description || null }),
          ...(region && { region }),
          ...(iconUrl !== undefined && { iconUrl: iconUrl || null })
        }
      });

      return reply.send({ success: true, team: updated });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update team' });
    }
  });

  // PUT /api/teams/:id/transfer - Transfer ownership (owner only)
  fastify.put('/teams/:id/transfer', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;
      const { newOwnerId } = request.body as any;

      if (!newOwnerId) {
        return reply.status(400).send({ error: 'New owner ID is required' });
      }

      // Check if user is current owner
      if (!await isTeamOwner(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can transfer ownership' });
      }

      // Verify new owner is a team member
      const newOwnerMembership = await prisma.teamMember.findFirst({
        where: { teamId: id, userId: newOwnerId }
      });

      if (!newOwnerMembership) {
        return reply.status(400).send({ error: 'New owner must be a team member' });
      }

      // Ownership transfer updates ownership only.
      // Member roles remain role-based responsibilities and are not overwritten.
      await prisma.$transaction(async (tx: any) => {
        // Update team owner
        await tx.team.update({
          where: { id },
          data: { ownerId: newOwnerId }
        });

        // Backward compatibility: if previous owner still has legacy OWNER role,
        // map it to MANAGER so OWNER is no longer used as a hard role.
        const previousOwnerMember = await tx.teamMember.findUnique({
          where: { teamId_userId: { teamId: id, userId: userId } },
          select: { role: true },
        });

        if (previousOwnerMember?.role === 'OWNER') {
          await tx.teamMember.update({
            where: { teamId_userId: { teamId: id, userId: userId } },
            data: { role: 'MANAGER' },
          });
        }
      });

      return reply.send({ success: true, message: 'Ownership transferred successfully' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to transfer ownership' });
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

      // Get team info for Discord notification
      const teamForNotification = await prisma.team.findUnique({
        where: { id },
        select: { name: true, tag: true, discordWebhookUrl: true, discordNotifyMembers: true }
      });

      const joiningUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });

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

      // Send Discord notification if configured
      if (teamForNotification?.discordWebhookUrl && teamForNotification.discordNotifyMembers) {
        sendTeamDiscordWebhook(teamForNotification.discordWebhookUrl, undefined, [
          createTeamMemberJoinedEmbed({
            teamName: teamForNotification.name,
            teamTag: teamForNotification.tag,
            username: joiningUser?.username || 'Unknown',
            role: matchingSpot.role
          })
        ]).catch(err => fastify.log.error('Discord notification failed:', err));
      }

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
      const { past, start, end } = request.query as any;

      if (!await isTeamMember(userId, id)) {
        return reply.status(403).send({ error: 'You are not a member of this team' });
      }

      const where: any = { teamId: id };

      const hasRange = Boolean(start || end);
      if (hasRange) {
        const startDate = start ? new Date(start) : null;
        const endDate = end ? new Date(end) : null;

        if (start && (!startDate || Number.isNaN(startDate.getTime()))) {
          return reply.status(400).send({ error: 'Invalid start date' });
        }
        if (end && (!endDate || Number.isNaN(endDate.getTime()))) {
          return reply.status(400).send({ error: 'Invalid end date' });
        }

        where.scheduledAt = {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        };
      } else if (!past) {
        where.scheduledAt = { gte: new Date() };
      }
      Object.assign(where, buildConcernedEventFilter(userId));

      const events = await prisma.teamEvent.findMany({
        where,
        orderBy: { scheduledAt: past ? 'desc' : 'asc' },
        take: hasRange ? 200 : 50,
        include: {
          attendances: {
            include: {
              user: { select: { id: true, username: true } }
            }
          },
          assignedCoaches: {
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
        enemyMultigg: e.enemyMultigg,
        concernedMemberIds: e.concernedMemberIds || [],
        createdBy: e.createdBy,
        createdAt: e.createdAt,
        attendances: e.attendances.map((a: any) => ({
          userId: a.userId,
          username: a.user.username,
          status: a.status
        })),
        assignedCoaches: e.assignedCoaches.map((c: any) => ({
          userId: c.userId,
          username: c.user.username
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
      const { title, type, description, scheduledAt, duration, enemyMultigg, assignedCoachIds, concernedMemberIds } = request.body as any;

      if (!await canEditSchedule(userId, id)) {
        return reply.status(403).send({ error: 'Only owner, manager, or coach can create events' });
      }

      if (!title || !type || !scheduledAt) {
        return reply.status(400).send({ error: 'Title, type, and scheduledAt are required' });
      }

      if (!TEAM_EVENT_TYPES.includes(type)) {
        return reply.status(400).send({ error: `Type must be one of: ${TEAM_EVENT_TYPES.join(', ')}` });
      }

      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return reply.status(400).send({ error: 'Invalid scheduledAt date' });
      }

      const normalizedConcerned = await normalizeConcernedMemberIds(id, concernedMemberIds);
      if (normalizedConcerned.error) {
        return reply.status(400).send({ error: normalizedConcerned.error });
      }

      // Get team info for Discord notification
      const team = await prisma.team.findUnique({
        where: { id },
        select: {
          name: true,
          tag: true,
          discordWebhookUrl: true,
          discordNotifyEvents: true,
          discordRemindersEnabled: true,
          discordReminderDelaysMinutes: true,
        }
      });

      const event = await prisma.teamEvent.create({
        data: {
          teamId: id,
          title,
          type,
          description: description || null,
          scheduledAt: scheduledDate,
          duration: duration ? parseInt(duration) : null,
          enemyMultigg: (type === 'SCRIM' || type === 'TOURNAMENT') ? (enemyMultigg || null) : null,
          concernedMemberIds: normalizedConcerned.value,
          createdBy: userId
        }
      });

      // If VOD_REVIEW and coaches specified, create coach assignments
      if (type === 'VOD_REVIEW' && assignedCoachIds && Array.isArray(assignedCoachIds) && assignedCoachIds.length > 0) {
        await prisma.teamEventCoach.createMany({
          data: assignedCoachIds.map((coachId: string) => ({
            eventId: event.id,
            userId: coachId
          }))
        });
      }

      // Queue Discord notification if configured (bot will send with buttons)
      if (team?.discordNotifyEvents) {
        const creator = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true }
        });
        
        await prisma.teamEventNotification.create({
          data: {
            teamId: id,
            eventId: event.id,
            eventTitle: title,
            eventType: type,
            scheduledAt: scheduledDate,
            duration: duration ? parseInt(duration) : null,
            description: description || null,
            enemyLink: (type === 'SCRIM' || type === 'TOURNAMENT') ? (enemyMultigg || null) : null,
            concernedMemberIds: normalizedConcerned.value,
            notificationType: 'CREATED',
            triggeredBy: creator?.username || 'Unknown'
          }
        });
      }

      await queueEventReminders({
        teamId: id,
        eventId: event.id,
        scheduledAt: scheduledDate,
        remindersEnabled: Boolean(team?.discordRemindersEnabled),
        reminderDelaysMinutes: normalizeStoredReminderDelays(team?.discordReminderDelaysMinutes),
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
      const { title, type, description, scheduledAt, duration, enemyMultigg, assignedCoachIds, concernedMemberIds } = request.body as any;

      if (!await canEditSchedule(userId, id)) {
        return reply.status(403).send({ error: 'Only owner, manager, or coach can update events' });
      }

      const event = await prisma.teamEvent.findUnique({ where: { id: eventId } });
      if (!event || event.teamId !== id) {
        return reply.status(404).send({ error: 'Event not found' });
      }

      if (event.concernedMemberIds?.length > 0 && !event.concernedMemberIds.includes(userId)) {
        return reply.status(403).send({ error: 'You are not concerned by this event' });
      }

      if (type && !TEAM_EVENT_TYPES.includes(type)) {
        return reply.status(400).send({ error: `Type must be one of: ${TEAM_EVENT_TYPES.join(', ')}` });
      }

      let scheduledDate;
      if (scheduledAt) {
        scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
          return reply.status(400).send({ error: 'Invalid scheduledAt date' });
        }
      }

      let normalizedConcernedMemberIds: string[] | undefined = undefined;
      if (concernedMemberIds !== undefined) {
        const normalizedConcerned = await normalizeConcernedMemberIds(id, concernedMemberIds);
        if (normalizedConcerned.error) {
          return reply.status(400).send({ error: normalizedConcerned.error });
        }
        normalizedConcernedMemberIds = normalizedConcerned.value;
      }

      const eventType = type || event.type;

      const updated = await prisma.teamEvent.update({
        where: { id: eventId },
        data: {
          ...(title && { title }),
          ...(type && { type }),
          ...(description !== undefined && { description: description || null }),
          ...(scheduledDate && { scheduledAt: scheduledDate }),
          ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
          ...(enemyMultigg !== undefined && (eventType === 'SCRIM' || eventType === 'TOURNAMENT') && { enemyMultigg: enemyMultigg || null }),
          ...(normalizedConcernedMemberIds !== undefined && { concernedMemberIds: normalizedConcernedMemberIds })
        }
      });

      // Update coach assignments for VOD_REVIEW events
      if (eventType === 'VOD_REVIEW' && assignedCoachIds !== undefined) {
        // Remove existing assignments
        await prisma.teamEventCoach.deleteMany({ where: { eventId } });
        
        // Add new assignments
        if (Array.isArray(assignedCoachIds) && assignedCoachIds.length > 0) {
          await prisma.teamEventCoach.createMany({
            data: assignedCoachIds.map((coachId: string) => ({
              eventId,
              userId: coachId
            }))
          });
        }
      }

      // Queue Discord notification if configured
      const team = await prisma.team.findUnique({
        where: { id },
        select: {
          name: true,
          tag: true,
          discordWebhookUrl: true,
          discordNotifyEvents: true,
          discordRemindersEnabled: true,
          discordReminderDelaysMinutes: true,
        }
      });
      
      if (team?.discordNotifyEvents) {
        const updater = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true }
        });
        
        await prisma.teamEventNotification.create({
          data: {
            teamId: id,
            eventId: updated.id,
            eventTitle: updated.title,
            eventType: updated.type,
            scheduledAt: updated.scheduledAt,
            duration: updated.duration,
            description: updated.description,
            enemyLink: updated.enemyMultigg,
            concernedMemberIds: updated.concernedMemberIds || [],
            notificationType: 'UPDATED',
            triggeredBy: updater?.username || 'Unknown'
          }
        });
      }

      await queueEventReminders({
        teamId: id,
        eventId: updated.id,
        scheduledAt: updated.scheduledAt,
        remindersEnabled: Boolean(team?.discordRemindersEnabled),
        reminderDelaysMinutes: normalizeStoredReminderDelays(team?.discordReminderDelaysMinutes),
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

      // Get team info for Discord notification before deleting
      const team = await prisma.team.findUnique({
        where: { id },
        select: { name: true, tag: true, discordWebhookUrl: true, discordNotifyEvents: true }
      });

      // Queue Discord notification if configured (before deletion)
      if (team?.discordNotifyEvents) {
        const deleter = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true }
        });
        
        await prisma.teamEventNotification.create({
          data: {
            teamId: id,
            eventId: eventId, // Keep reference even after deletion
            eventTitle: event.title,
            eventType: event.type,
            scheduledAt: event.scheduledAt,
            duration: event.duration,
            description: event.description,
            enemyLink: event.enemyMultigg,
            concernedMemberIds: event.concernedMemberIds || [],
            notificationType: 'DELETED',
            triggeredBy: deleter?.username || 'Unknown'
          }
        });
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

  // ==================== DISCORD INTEGRATION ====================

  // GET /api/teams/:id/discord - Get Discord settings
  fastify.get('/teams/:id/discord', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;

      // Only team owner can view Discord settings
      if (!await isTeamOwner(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can view Discord settings' });
      }

      const team = await prisma.team.findUnique({
        where: { id },
        select: {
          discordWebhookUrl: true,
          discordScrimCodeWebhookUrl: true,
          discordNotifyEvents: true,
          discordNotifyMembers: true,
          discordMentionMode: true,
          discordMentionRoleId: true,
          discordRoleMentions: true,
          discordPingRecurrence: true,
          discordRemindersEnabled: true,
          discordReminderDelaysMinutes: true,
        }
      });

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      // Validate webhook if it exists
      let webhookValid: boolean | undefined;
      let channelName: string | undefined;
      let guildName: string | undefined;
      let scrimCodeWebhookValid: boolean | undefined;
      let scrimCodeChannelName: string | undefined;
      let scrimCodeGuildName: string | undefined;
      
      if (team.discordWebhookUrl) {
        try {
          const validation = await validateDiscordWebhook(team.discordWebhookUrl);
          webhookValid = validation.valid;
          channelName = validation.channelName;
          guildName = validation.guildName;
        } catch {
          webhookValid = false;
        }
      }

      if (team.discordScrimCodeWebhookUrl) {
        try {
          const validation = await validateDiscordWebhook(team.discordScrimCodeWebhookUrl);
          scrimCodeWebhookValid = validation.valid;
          scrimCodeChannelName = validation.channelName;
          scrimCodeGuildName = validation.guildName;
        } catch {
          scrimCodeWebhookValid = false;
        }
      }

      return reply.send({
        webhookUrl: team.discordWebhookUrl,
        scrimCodeWebhookUrl: team.discordScrimCodeWebhookUrl,
        notifyEvents: team.discordNotifyEvents,
        notifyMembers: team.discordNotifyMembers,
        mentionMode: team.discordMentionMode || 'EVERYONE',
        mentionRoleId: team.discordMentionRoleId || null,
        roleMentions: (team.discordRoleMentions && typeof team.discordRoleMentions === 'object' && !Array.isArray(team.discordRoleMentions))
          ? team.discordRoleMentions
          : {},
        pingRecurrence: Boolean(team.discordPingRecurrence),
        remindersEnabled: Boolean(team.discordRemindersEnabled),
        reminderDelaysMinutes: normalizeStoredReminderDelays(team.discordReminderDelaysMinutes),
        webhookValid,
        channelName,
        guildName,
        scrimCodeWebhookValid,
        scrimCodeChannelName,
        scrimCodeGuildName,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get Discord settings' });
    }
  });

  // POST /api/teams/:id/discord - Set Discord webhook and settings (combined endpoint)
  fastify.post('/teams/:id/discord', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;
      const {
        webhookUrl,
        scrimCodeWebhookUrl,
        notifyEvents,
        notifyMembers,
        mentionMode,
        mentionRoleId,
        roleMentions,
        pingRecurrence,
        remindersEnabled,
        reminderDelaysMinutes,
      } = request.body as any;

      // Only team owner can configure Discord
      if (!await isTeamOwner(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can configure Discord' });
      }

      const existingTeam = await prisma.team.findUnique({
        where: { id },
        select: {
          discordWebhookUrl: true,
          discordScrimCodeWebhookUrl: true,
          discordNotifyEvents: true,
          discordNotifyMembers: true,
          discordMentionMode: true,
          discordMentionRoleId: true,
          discordRoleMentions: true,
          discordPingRecurrence: true,
          discordRemindersEnabled: true,
          discordReminderDelaysMinutes: true,
        },
      });

      if (!existingTeam) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      const updateData: any = {};
      let channelName: string | undefined;
      let guildName: string | undefined;
      let webhookValid = false;
      let scrimCodeChannelName: string | undefined;
      let scrimCodeGuildName: string | undefined;
      let scrimCodeWebhookValid = false;

      const reminderDelaysProvided = Object.prototype.hasOwnProperty.call(request.body || {}, 'reminderDelaysMinutes');
      let normalizedReminderDelaysFromPayload: number[] | undefined;

      if (reminderDelaysProvided) {
        const normalizedReminderDelays = sanitizeReminderDelayMinutes(reminderDelaysMinutes);
        if (normalizedReminderDelays.error) {
          return reply.status(400).send({ error: normalizedReminderDelays.error });
        }

        normalizedReminderDelaysFromPayload = normalizedReminderDelays.value;
        updateData.discordReminderDelaysMinutes = normalizedReminderDelays.value;
      }

      if (typeof remindersEnabled === 'boolean') {
        updateData.discordRemindersEnabled = remindersEnabled;
      }

      if (typeof pingRecurrence === 'boolean') {
        updateData.discordPingRecurrence = pingRecurrence;
      }

      const existingReminderDelays = normalizeStoredReminderDelays(existingTeam.discordReminderDelaysMinutes);
      const nextReminderDelays = normalizedReminderDelaysFromPayload ?? existingReminderDelays;
      const nextRemindersEnabled = typeof remindersEnabled === 'boolean'
        ? remindersEnabled
        : Boolean(existingTeam.discordRemindersEnabled);

      if (nextRemindersEnabled && nextReminderDelays.length === 0) {
        return reply.status(400).send({ error: 'Select at least one reminder delay when reminders are enabled' });
      }

      // If webhook URL provided, validate and save it
      if (webhookUrl !== undefined) {
        if (webhookUrl) {
          const validation = await validateDiscordWebhook(webhookUrl);
          if (!validation.valid) {
            return reply.status(400).send({ error: 'Invalid Discord webhook URL. Please check the URL and try again.' });
          }
          updateData.discordWebhookUrl = webhookUrl;
          channelName = validation.channelName;
          guildName = validation.guildName;
          webhookValid = true;
        } else {
          updateData.discordWebhookUrl = null;
        }
      }

      if (scrimCodeWebhookUrl !== undefined) {
        if (scrimCodeWebhookUrl) {
          const validation = await validateDiscordWebhook(scrimCodeWebhookUrl);
          if (!validation.valid) {
            return reply.status(400).send({ error: 'Invalid scrim code webhook URL. Please check the URL and try again.' });
          }
          updateData.discordScrimCodeWebhookUrl = scrimCodeWebhookUrl;
          scrimCodeChannelName = validation.channelName;
          scrimCodeGuildName = validation.guildName;
          scrimCodeWebhookValid = true;
        } else {
          updateData.discordScrimCodeWebhookUrl = null;
        }
      }

      // Update notification settings
      if (typeof notifyEvents === 'boolean') updateData.discordNotifyEvents = notifyEvents;
      if (typeof notifyMembers === 'boolean') updateData.discordNotifyMembers = notifyMembers;

      if (mentionMode !== undefined) {
        if (!DISCORD_MENTION_MODES.includes(mentionMode)) {
          return reply.status(400).send({ error: `mentionMode must be one of: ${DISCORD_MENTION_MODES.join(', ')}` });
        }
        updateData.discordMentionMode = mentionMode;
        if (mentionMode !== 'ROLE') {
          updateData.discordMentionRoleId = null;
        }
      }

      if (mentionRoleId !== undefined) {
        const normalizedRoleId = normalizeDiscordRoleId(mentionRoleId);
        if (mentionRoleId && !normalizedRoleId) {
          return reply.status(400).send({ error: 'Invalid Discord role ID. Use a numeric role ID or <@&roleId> mention.' });
        }
        updateData.discordMentionRoleId = normalizedRoleId;
      }

      if (roleMentions !== undefined) {
        updateData.discordRoleMentions = sanitizeRoleMentionMap(roleMentions);
      }

      const reminderConfigChanged =
        nextRemindersEnabled !== Boolean(existingTeam.discordRemindersEnabled)
        || !areNumberArraysEqual(nextReminderDelays, existingReminderDelays);

      const team = await prisma.team.update({
        where: { id },
        data: updateData,
        select: {
          name: true,
          tag: true,
          discordWebhookUrl: true,
          discordScrimCodeWebhookUrl: true,
          discordNotifyEvents: true,
          discordNotifyMembers: true,
          discordMentionMode: true,
          discordMentionRoleId: true,
          discordRoleMentions: true,
          discordPingRecurrence: true,
          discordRemindersEnabled: true,
          discordReminderDelaysMinutes: true,
        }
      });

      if (reminderConfigChanged) {
        await rebuildUpcomingTeamReminders({
          teamId: id,
          remindersEnabled: nextRemindersEnabled,
          reminderDelaysMinutes: nextReminderDelays,
        });
      }

      return reply.send({
        success: true,
        webhookUrl: team.discordWebhookUrl,
        scrimCodeWebhookUrl: team.discordScrimCodeWebhookUrl,
        notifyEvents: team.discordNotifyEvents,
        notifyMembers: team.discordNotifyMembers,
        mentionMode: team.discordMentionMode || 'EVERYONE',
        mentionRoleId: team.discordMentionRoleId || null,
        roleMentions: (team.discordRoleMentions && typeof team.discordRoleMentions === 'object' && !Array.isArray(team.discordRoleMentions))
          ? team.discordRoleMentions
          : {},
        pingRecurrence: Boolean(team.discordPingRecurrence),
        remindersEnabled: Boolean(team.discordRemindersEnabled),
        reminderDelaysMinutes: normalizeStoredReminderDelays(team.discordReminderDelaysMinutes),
        webhookValid: team.discordWebhookUrl ? webhookValid : undefined,
        channelName,
        guildName,
        scrimCodeWebhookValid: team.discordScrimCodeWebhookUrl ? scrimCodeWebhookValid : undefined,
        scrimCodeChannelName,
        scrimCodeGuildName,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to save Discord settings' });
    }
  });

  // DELETE /api/teams/:id/discord - Remove Discord webhook
  fastify.delete('/teams/:id/discord', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;

      // Only team owner can configure Discord
      if (!await isTeamOwner(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can configure Discord' });
      }

      await prisma.$transaction([
        prisma.team.update({
          where: { id },
          data: {
            discordWebhookUrl: null,
            discordScrimCodeWebhookUrl: null,
            discordNotifyEvents: true,
            discordNotifyMembers: false,
            discordPingRecurrence: true,
            discordLastChannelPingAt: null,
            discordRemindersEnabled: false,
            discordReminderDelaysMinutes: [],
          }
        }),
        prisma.teamEventReminder.deleteMany({
          where: { teamId: id, processed: false },
        })
      ]);

      return reply.send({ success: true, message: 'Discord webhook removed' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove Discord webhook' });
    }
  });

  // POST /api/teams/:id/discord/test - Send test notification
  fastify.post('/teams/:id/discord/test', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;
      const body = request.body && typeof request.body === 'object' ? request.body : {};
      const requestedWebhookUrl = typeof (body as any).webhookUrl === 'string'
        ? (body as any).webhookUrl.trim()
        : '';
      const webhookToTest = requestedWebhookUrl || null;

      // Only team owner can test webhook
      if (!await isTeamOwner(userId, id)) {
        return reply.status(403).send({ error: 'Only team owner can test webhook' });
      }

      const team = await prisma.team.findUnique({
        where: { id },
        select: { name: true, tag: true, discordWebhookUrl: true }
      });

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      const targetWebhook = webhookToTest || team.discordWebhookUrl;
      if (!targetWebhook) {
        return reply.status(400).send({ error: 'No Discord webhook configured. Add one first or provide webhookUrl in test request.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });

      const success = await sendTeamDiscordWebhook(targetWebhook, undefined, [{
        title: '🧪 Test Notification',
        description: `This is a test notification from **${team.name}**${team.tag ? ` [${team.tag}]` : ''}`,
        color: 0xC8AA6E,
        fields: [
          {
            name: 'Triggered By',
            value: user?.username || 'Unknown',
            inline: true,
          },
          {
            name: 'Status',
            value: '✅ Working correctly!',
            inline: true,
          }
        ],
        footer: { text: 'RiftEssence Team Notifications' },
        timestamp: new Date().toISOString(),
      }]);

      if (success) {
        return reply.send({ success: true, message: 'Test notification sent!' });
      } else {
        return reply.status(500).send({ error: 'Failed to send test notification' });
      }
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send test notification' });
    }
  });

  // ==================== TEAM DRAFTS ====================

  // GET /api/teams/:id/drafts - List saved drafts for a team
  fastify.get('/teams/:id/drafts', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };
      if (!await canAccessTeamDrafts(userId, id)) {
        return reply.status(403).send({ error: 'Only team members can access team drafts' });
      }

      const drafts = await prisma.teamDraft.findMany({
        where: { teamId: id },
        orderBy: { updatedAt: 'desc' },
        include: {
          team: { select: { name: true, tag: true } },
        },
      });

      return reply.send({ drafts });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch team drafts' });
    }
  });

  // POST /api/teams/:id/drafts - Create a saved draft
  fastify.post('/teams/:id/drafts', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };
      if (!await canAccessTeamDrafts(userId, id)) {
        return reply.status(403).send({ error: 'Only team members can save team drafts' });
      }

      const parsed = parseDraftPayload(request.body);
      if (parsed.error || !parsed.value) {
        return reply.status(400).send({ error: parsed.error || 'Invalid draft payload' });
      }

      const created = await prisma.teamDraft.create({
        data: {
          teamId: id,
          createdById: userId,
          name: parsed.value.name,
          blueBans: parsed.value.blueBans,
          redBans: parsed.value.redBans,
          picks: parsed.value.picks,
        },
        include: {
          team: { select: { name: true, tag: true } },
        },
      });

      return reply.status(201).send({ draft: created });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to save draft' });
    }
  });

  // PUT /api/teams/:id/drafts/:draftId - Update a saved draft
  fastify.put('/teams/:id/drafts/:draftId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, draftId } = request.params as { id: string; draftId: string };
      if (!await canAccessTeamDrafts(userId, id)) {
        return reply.status(403).send({ error: 'Only team members can update team drafts' });
      }

      const existing = await prisma.teamDraft.findFirst({ where: { id: draftId, teamId: id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Draft not found' });
      }

      const parsed = parseDraftPayload(request.body);
      if (parsed.error || !parsed.value) {
        return reply.status(400).send({ error: parsed.error || 'Invalid draft payload' });
      }

      const updated = await prisma.teamDraft.update({
        where: { id: draftId },
        data: {
          name: parsed.value.name,
          blueBans: parsed.value.blueBans,
          redBans: parsed.value.redBans,
          picks: parsed.value.picks,
          createdById: userId,
        },
        include: {
          team: { select: { name: true, tag: true } },
        },
      });

      return reply.send({ draft: updated });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update draft' });
    }
  });

  // DELETE /api/teams/:id/drafts/:draftId - Delete a saved draft
  fastify.delete('/teams/:id/drafts/:draftId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id, draftId } = request.params as { id: string; draftId: string };
      if (!await canAccessTeamDrafts(userId, id)) {
        return reply.status(403).send({ error: 'Only team members can delete team drafts' });
      }

      const existing = await prisma.teamDraft.findFirst({ where: { id: draftId, teamId: id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Draft not found' });
      }

      await prisma.teamDraft.delete({ where: { id: draftId } });
      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete draft' });
    }
  });

  // GET /api/teams/discord-drafts/options?guildId=...&discordId=...
  // Bot-only route used by /send-draft menu flow.
  fastify.get('/teams/discord-drafts/options', async (request: any, reply: any) => {
    if (!getDiscordBotAuthorized(request, reply)) return;

    try {
      const { guildId, discordId } = request.query as { guildId?: string; discordId?: string };

      if (!guildId || !discordId) {
        return reply.status(400).send({ error: 'Missing required query parameters: guildId, discordId' });
      }

      const user = await prisma.discordAccount.findUnique({
        where: { discordId },
        select: { userId: true },
      });

      if (!user?.userId) {
        fastify.log.warn({ guildId, discordId }, 'Discord send-draft rejected: account not linked');
        return reply.status(200).send({
          status: 'MISSING_DISCORD_LINK',
          teams: [],
        });
      }

      const teams = await prisma.team.findMany({
        where: {
          OR: [
            { ownerId: user.userId },
            { members: { some: { userId: user.userId } } },
          ],
        },
        select: {
          id: true,
          name: true,
          tag: true,
          drafts: {
            select: {
              id: true,
              name: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 25,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      });

      if (teams.length === 0) {
        fastify.log.warn({ guildId, discordId, userId: user.userId }, 'Discord send-draft rejected: no team membership');
        return reply.status(200).send({
          status: 'NO_TEAM_MEMBERSHIP',
          teams: [],
        });
      }

      const totalDrafts = teams.reduce((sum: number, team: any) => sum + (team.drafts?.length || 0), 0);
      if (totalDrafts === 0) {
        fastify.log.warn({ guildId, discordId, userId: user.userId }, 'Discord send-draft rejected: no saved drafts');
        return reply.status(200).send({
          status: 'NO_SAVED_DRAFTS',
          teams,
        });
      }

      return reply.send({
        status: 'READY',
        teams,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch draft options' });
    }
  });

  // GET /api/teams/discord-drafts/:draftId?discordId=...
  // Bot-only route to fetch one draft once selected in Discord menu.
  fastify.get('/teams/discord-drafts/:draftId', async (request: any, reply: any) => {
    if (!getDiscordBotAuthorized(request, reply)) return;

    try {
      const { draftId } = request.params as { draftId: string };
      const { discordId } = request.query as { discordId?: string };

      if (!draftId || !discordId) {
        return reply.status(400).send({ error: 'Missing required parameters: draftId and discordId' });
      }

      const user = await prisma.discordAccount.findUnique({
        where: { discordId },
        select: { userId: true },
      });

      if (!user?.userId) {
        fastify.log.warn({ draftId, discordId }, 'Discord send-draft rejected during draft fetch: account not linked');
        return reply.status(404).send({ error: 'Linked RiftEssence account not found for this Discord user' });
      }

      const draft = await prisma.teamDraft.findFirst({
        where: {
          id: draftId,
          team: {
            OR: [
              { ownerId: user.userId },
              { members: { some: { userId: user.userId } } },
            ],
          },
        },
        include: {
          team: { select: { id: true, name: true, tag: true } },
          createdBy: { select: { id: true, username: true } },
        },
      });

      if (!draft) {
        fastify.log.warn({ draftId, discordId, userId: user.userId }, 'Discord send-draft rejected during draft fetch: missing access');
        return reply.status(404).send({ error: 'Draft not found or inaccessible' });
      }

      return reply.send({ draft });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch selected draft' });
    }
  });
}
