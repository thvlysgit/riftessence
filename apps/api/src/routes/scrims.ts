import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';

const SCRIM_FORMATS = ['BO1', 'BO3', 'BO5', 'BLOCK'] as const;
const SCRIM_POST_STATUSES = ['AVAILABLE', 'CANDIDATES', 'SETTLED'] as const;
const SCRIM_PROPOSAL_DECISIONS = ['ACCEPT', 'REJECT', 'DELAY'] as const;
const MANAGEABLE_TEAM_ROLES = ['OWNER', 'MANAGER', 'COACH'] as const;
const RANK_ORDER = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
  'UNRANKED',
] as const;
const DIVISION_ORDER = ['IV', 'III', 'II', 'I'] as const;
const PROPOSAL_TIMEOUT_MS = 10 * 60 * 1000;

type RankName = typeof RANK_ORDER[number];

type ScrimAutoRejectOutcome = {
  proposerUserId: string;
  proposerUsername: string;
  postId: string;
  teamName: string;
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function normalizeRegionKey(region: string): string {
  const lowered = String(region || '').toLowerCase();
  const aliasMap: Record<string, string> = {
    na: 'na',
    euw: 'euw',
    eune: 'eune',
    kr: 'kr',
    jp: 'jp',
    oce: 'oce',
    lan: 'lan',
    las: 'las',
    br: 'br',
    ru: 'ru',
    sg: 'sg',
  };

  return aliasMap[lowered] || lowered || 'euw';
}

function buildOpggMultisearchUrl(region: string, riotIds: string[]): string | null {
  const cleaned = riotIds
    .map((entry) => normalizeString(entry))
    .filter((entry) => entry.length > 0);

  if (cleaned.length === 0) {
    return null;
  }

  const encodedSummoners = cleaned.map((entry) => encodeURIComponent(entry)).join(',');
  return `https://www.op.gg/multisearch/${normalizeRegionKey(region)}?summoners=${encodedSummoners}`;
}

function rankScore(rank: string | null, division: string | null): number | null {
  const normalizedRank = normalizeString(rank).toUpperCase() as RankName;
  if (!RANK_ORDER.includes(normalizedRank)) {
    return null;
  }

  if (normalizedRank === 'UNRANKED') {
    return null;
  }

  const rankIndex = RANK_ORDER.indexOf(normalizedRank);
  const baseScore = rankIndex * 4;

  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(normalizedRank)) {
    return baseScore + 3;
  }

  const normalizedDivision = normalizeString(division).toUpperCase();
  const divisionIndex = DIVISION_ORDER.indexOf(normalizedDivision as typeof DIVISION_ORDER[number]);
  if (divisionIndex < 0) {
    return baseScore + 1;
  }

  return baseScore + divisionIndex;
}

function scoreToRank(score: number): { averageRank: string | null; averageDivision: string | null } {
  if (!Number.isFinite(score) || score < 0) {
    return { averageRank: null, averageDivision: null };
  }

  const clampedScore = Math.min(score, (RANK_ORDER.length - 2) * 4 + 3);
  const rankIndex = Math.floor(clampedScore / 4);
  const divisionIndex = Math.round(clampedScore % 4);
  const rank = RANK_ORDER[Math.max(0, Math.min(rankIndex, RANK_ORDER.length - 2))];

  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank)) {
    return {
      averageRank: rank,
      averageDivision: null,
    };
  }

  return {
    averageRank: rank,
    averageDivision: DIVISION_ORDER[Math.max(0, Math.min(divisionIndex, DIVISION_ORDER.length - 1))],
  };
}

function buildSuggestedStartTimes(upcomingEventsUtc: Date[]): Date[] {
  const now = Date.now();
  const suggestions: Date[] = [];

  for (let i = 0; i < 96 && suggestions.length < 5; i += 1) {
    const candidateMs = now + (i + 2) * 60 * 60 * 1000;
    const hasNearbyEvent = upcomingEventsUtc.some((eventDate) => {
      const diffMs = Math.abs(eventDate.getTime() - candidateMs);
      return diffMs < 90 * 60 * 1000;
    });

    if (!hasNearbyEvent) {
      suggestions.push(new Date(candidateMs));
    }
  }

  if (suggestions.length === 0) {
    return [new Date(now + 2 * 60 * 60 * 1000)];
  }

  return suggestions;
}

function isManageableRole(role: string | null | undefined): boolean {
  const normalized = normalizeString(role).toUpperCase();
  return MANAGEABLE_TEAM_ROLES.includes(normalized as typeof MANAGEABLE_TEAM_ROLES[number]);
}

async function getManageableTeamIds(userId: string): Promise<string[]> {
  const [memberships, ownedTeams] = await Promise.all([
    prisma.teamMember.findMany({
      where: {
        userId,
        role: { in: [...MANAGEABLE_TEAM_ROLES] as any },
      },
      select: { teamId: true },
    }),
    prisma.team.findMany({
      where: { ownerId: userId },
      select: { id: true },
    }),
  ]);

  const ids = new Set<string>();
  memberships.forEach((entry: any) => ids.add(entry.teamId));
  ownedTeams.forEach((entry: any) => ids.add(entry.id));
  return Array.from(ids);
}

async function canManageTeam(userId: string, teamId: string): Promise<boolean> {
  const [team, membership] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true },
    }),
    prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    }),
  ]);

  if (!team) {
    return false;
  }

  if (team.ownerId === userId) {
    return true;
  }

  return isManageableRole(membership?.role);
}

async function assertDiscordReliabilityReady(userId: string, reply: any): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      discordDmNotifications: true,
      discordAccount: {
        select: { discordId: true },
      },
    },
  });

  if (!user || !user.discordAccount?.discordId) {
    reply.status(400).send({
      error: 'Link your Discord account before using Scrim Finder.',
      code: 'SCRIM_DISCORD_REQUIRED',
    });
    return false;
  }

  if (!user.discordDmNotifications) {
    reply.status(400).send({
      error: 'Enable Discord DM notifications before using Scrim Finder.',
      code: 'SCRIM_DM_REQUIRED',
    });
    return false;
  }

  return true;
}

async function enqueueDiscordDmForUser(params: {
  userId: string;
  senderUsername: string;
  messagePreview: string;
  conversationId: string;
}) {
  const recipient = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      discordDmNotifications: true,
      discordAccount: { select: { discordId: true } },
    },
  });

  if (!recipient?.discordDmNotifications || !recipient.discordAccount?.discordId) {
    return;
  }

  await prisma.discordDmQueue.create({
    data: {
      recipientDiscordId: recipient.discordAccount.discordId,
      senderUsername: params.senderUsername,
      messagePreview: params.messagePreview.slice(0, 200),
      conversationId: params.conversationId,
    },
  });
}

async function autoRejectExpiredProposals(): Promise<void> {
  const cutoff = new Date(Date.now() - PROPOSAL_TIMEOUT_MS);

  const candidates = await prisma.scrimProposal.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lte: cutoff },
    },
    include: {
      post: {
        select: {
          id: true,
          teamName: true,
          status: true,
        },
      },
      proposedBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    take: 120,
  });

  const dmQueuePayloads: ScrimAutoRejectOutcome[] = [];

  for (const proposal of candidates as any[]) {
    const now = new Date();

    const result = await prisma.$transaction(async (tx: any) => {
      const latest = await tx.scrimProposal.findUnique({
        where: { id: proposal.id },
        select: {
          id: true,
          status: true,
          createdAt: true,
          postId: true,
          proposedByUserId: true,
        },
      });

      if (!latest || latest.status !== 'PENDING') {
        return null;
      }

      const responseSeconds = Math.max(0, Math.floor((now.getTime() - latest.createdAt.getTime()) / 1000));

      await tx.scrimProposal.update({
        where: { id: latest.id },
        data: {
          status: 'AUTO_REJECTED',
          decisionAt: now,
          autoRejectedAt: now,
          responseSeconds,
        },
      });

      await tx.notification.create({
        data: {
          userId: latest.proposedByUserId,
          type: 'SCRIM_PROPOSAL_AUTO_REJECTED',
          message: `Your scrim proposal to ${proposal.post.teamName} expired after 10 minutes without response.`,
        },
      });

      const activeProposalCount = await tx.scrimProposal.count({
        where: {
          postId: latest.postId,
          status: { in: ['PENDING', 'DELAYED'] },
        },
      });

      const currentPost = await tx.scrimPost.findUnique({
        where: { id: latest.postId },
        select: { status: true },
      });

      if (currentPost?.status !== 'SETTLED' && activeProposalCount === 0) {
        await tx.scrimPost.update({
          where: { id: latest.postId },
          data: { status: 'AVAILABLE' },
        });
      }

      return {
        proposerUserId: latest.proposedByUserId,
        proposerUsername: proposal.proposedBy.username,
        postId: latest.postId,
        teamName: proposal.post.teamName,
      } as ScrimAutoRejectOutcome;
    });

    if (result) {
      dmQueuePayloads.push(result);
    }
  }

  for (const payload of dmQueuePayloads) {
    await enqueueDiscordDmForUser({
      userId: payload.proposerUserId,
      senderUsername: 'Scrim Finder',
      messagePreview: `Your proposal to ${payload.teamName} timed out after 10 minutes.`,
      conversationId: `scrim:${payload.postId}`,
    });
  }
}

export default async function scrimRoutes(fastify: any) {
  // GET /api/scrims/posts - Main scrim feed with filters
  fastify.get('/scrims/posts', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await autoRejectExpiredProposals();

      const { region, status, format, teamId } = (request.query || {}) as {
        region?: string;
        status?: string;
        format?: string;
        teamId?: string;
      };

      const where: any = {};

      if (region && normalizeString(region).length > 0) {
        where.region = normalizeString(region).toUpperCase();
      }

      if (status && SCRIM_POST_STATUSES.includes(normalizeString(status).toUpperCase() as any)) {
        where.status = normalizeString(status).toUpperCase();
      } else {
        where.status = { in: ['AVAILABLE', 'CANDIDATES'] };
      }

      if (format && SCRIM_FORMATS.includes(normalizeString(format).toUpperCase() as any)) {
        where.scrimFormat = normalizeString(format).toUpperCase();
      }

      if (teamId && normalizeString(teamId).length > 0) {
        where.teamId = normalizeString(teamId);
      }

      const manageableTeamIds = await getManageableTeamIds(userId);

      const posts = await prisma.scrimPost.findMany({
        where,
        orderBy: [{ startTimeUtc: 'asc' }, { createdAt: 'desc' }],
        take: 200,
        include: {
          team: {
            select: {
              id: true,
              name: true,
              tag: true,
              region: true,
              iconUrl: true,
            },
          },
          proposals: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              responseSeconds: true,
              lowPriorityAt: true,
              proposerTeamId: true,
              proposerTeam: {
                select: {
                  id: true,
                  name: true,
                  tag: true,
                },
              },
            },
          },
        },
      });

      const formattedPosts = posts.map((post: any) => {
        const pendingCount = post.proposals.filter((proposal: any) => proposal.status === 'PENDING').length;
        const delayedCount = post.proposals.filter((proposal: any) => proposal.status === 'DELAYED').length;
        const acceptedCount = post.proposals.filter((proposal: any) => proposal.status === 'ACCEPTED').length;
        const rejectedCount = post.proposals.filter((proposal: any) => proposal.status === 'REJECTED').length;
        const autoRejectedCount = post.proposals.filter((proposal: any) => proposal.status === 'AUTO_REJECTED').length;

        const responded = post.proposals.filter((proposal: any) => typeof proposal.responseSeconds === 'number');
        const averageResponseMinutes = responded.length > 0
          ? Number((responded.reduce((sum: number, proposal: any) => sum + proposal.responseSeconds, 0) / responded.length / 60).toFixed(1))
          : null;

        const myProposal = post.proposals.find((proposal: any) => manageableTeamIds.includes(proposal.proposerTeamId)) || null;

        return {
          id: post.id,
          teamId: post.teamId,
          teamName: post.teamName,
          teamTag: post.teamTag,
          contactUserId: post.contactUserId,
          region: post.region,
          averageRank: post.averageRank,
          averageDivision: post.averageDivision,
          startTimeUtc: post.startTimeUtc,
          timezoneLabel: post.timezoneLabel,
          scrimFormat: post.scrimFormat,
          teamMultiGgUrl: post.teamMultiGgUrl,
          opggMultisearchUrl: post.opggMultisearchUrl,
          details: post.details,
          status: post.status,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          team: post.team,
          proposalStats: {
            pendingCount,
            delayedCount,
            acceptedCount,
            rejectedCount,
            autoRejectedCount,
            averageResponseMinutes,
          },
          myProposal,
          proposalsPreview: post.proposals.slice(0, 3),
        };
      });

      return reply.send({ posts: formattedPosts });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch scrim posts' });
    }
  });

  // GET /api/scrims/teams/:teamId/prefill - Team prefill + schedule suggestions + OP.GG helpers
  fastify.get('/scrims/teams/:teamId/prefill', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { teamId } = request.params as { teamId: string };

      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
        select: { id: true },
      });

      if (!membership) {
        return reply.status(403).send({ error: 'You must be part of this team to use scrim prefill.' });
      }

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
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
                    select: {
                      rank: true,
                      division: true,
                      gameName: true,
                      tagLine: true,
                    },
                  },
                },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
          events: {
            where: {
              scheduledAt: { gt: new Date() },
            },
            orderBy: { scheduledAt: 'asc' },
            take: 40,
            select: {
              id: true,
              title: true,
              type: true,
              scheduledAt: true,
            },
          },
        },
      });

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      const rankScores = team.members
        .map((member: any) => rankScore(member.user.riotAccounts?.[0]?.rank || null, member.user.riotAccounts?.[0]?.division || null))
        .filter((score: number | null): score is number => typeof score === 'number');

      const averageScore = rankScores.length > 0
        ? rankScores.reduce((sum: number, value: number) => sum + value, 0) / rankScores.length
        : Number.NaN;

      const averageRankSuggestion = scoreToRank(averageScore);

      const riotIds = team.members
        .map((member: any) => {
          const account = member.user.riotAccounts?.[0];
          if (!account?.gameName || !account?.tagLine) return null;
          return `${account.gameName}#${account.tagLine}`;
        })
        .filter((value: string | null): value is string => Boolean(value));

      const suggestedStartTimes = buildSuggestedStartTimes(team.events.map((event: any) => event.scheduledAt));

      return reply.send({
        team: {
          id: team.id,
          name: team.name,
          tag: team.tag,
          region: team.region,
          members: team.members.map((member: any) => ({
            userId: member.userId,
            username: member.user.username,
            role: member.role,
            gameName: member.user.riotAccounts?.[0]?.gameName || null,
            tagLine: member.user.riotAccounts?.[0]?.tagLine || null,
            rank: member.user.riotAccounts?.[0]?.rank || null,
            division: member.user.riotAccounts?.[0]?.division || null,
          })),
        },
        suggestedAverageRank: averageRankSuggestion.averageRank,
        suggestedAverageDivision: averageRankSuggestion.averageDivision,
        suggestedStartTimesUtc: suggestedStartTimes.map((slot) => slot.toISOString()),
        defaultStartTimeUtc: suggestedStartTimes[0]?.toISOString() || null,
        generatedOpggMultisearchUrl: buildOpggMultisearchUrl(team.region, riotIds),
        riotIds,
        disclaimer: 'OP.GG and account identifiers may be stale. Verify manually before posting.',
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to build team prefill for scrims' });
    }
  });

  // POST /api/scrims/posts - Create scrim listing
  fastify.post('/scrims/posts', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      if (!await assertDiscordReliabilityReady(userId, reply)) {
        return;
      }

      const {
        teamId,
        contactUserId,
        averageRank,
        averageDivision,
        startTimeUtc,
        timezoneLabel,
        scrimFormat,
        teamMultiGgUrl,
        opggMultisearchUrl,
        details,
      } = request.body as any;

      const normalizedTeamId = normalizeString(teamId);
      if (!normalizedTeamId) {
        return reply.status(400).send({ error: 'teamId is required' });
      }

      if (!await canManageTeam(userId, normalizedTeamId)) {
        return reply.status(403).send({ error: 'Only owner/manager/coach can create scrim posts for this team' });
      }

      const normalizedFormat = normalizeString(scrimFormat).toUpperCase();
      if (!SCRIM_FORMATS.includes(normalizedFormat as any)) {
        return reply.status(400).send({ error: `scrimFormat must be one of: ${SCRIM_FORMATS.join(', ')}` });
      }

      const parsedStartTime = parseDate(startTimeUtc);
      if (!parsedStartTime) {
        return reply.status(400).send({ error: 'startTimeUtc must be a valid ISO date' });
      }

      const normalizedRank = normalizeString(averageRank).toUpperCase();
      const normalizedDivision = normalizeOptionalString(averageDivision)?.toUpperCase() || null;

      const team = await prisma.team.findUnique({
        where: { id: normalizedTeamId },
        select: {
          id: true,
          name: true,
          tag: true,
          region: true,
        },
      });

      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      const created = await prisma.scrimPost.create({
        data: {
          teamId: normalizedTeamId,
          authorId: userId,
          contactUserId: normalizeOptionalString(contactUserId),
          region: team.region,
          teamName: team.name,
          teamTag: team.tag,
          averageRank: RANK_ORDER.includes(normalizedRank as RankName) ? normalizedRank : null,
          averageDivision: normalizedDivision,
          startTimeUtc: parsedStartTime,
          timezoneLabel: normalizeOptionalString(timezoneLabel),
          scrimFormat: normalizedFormat,
          teamMultiGgUrl: normalizeOptionalString(teamMultiGgUrl),
          opggMultisearchUrl: normalizeOptionalString(opggMultisearchUrl),
          details: normalizeOptionalString(details),
          source: 'app',
          discordMirrored: false,
        },
      });

      return reply.status(201).send({
        success: true,
        post: created,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create scrim post' });
    }
  });

  // POST /api/scrims/posts/:postId/proposals - Propose a scrim
  fastify.post('/scrims/posts/:postId/proposals', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      if (!await assertDiscordReliabilityReady(userId, reply)) {
        return;
      }

      await autoRejectExpiredProposals();

      const { postId } = request.params as { postId: string };
      const { proposerTeamId, message, proposedStartTimeUtc } = request.body as any;
      const normalizedProposerTeamId = normalizeString(proposerTeamId);

      if (!normalizedProposerTeamId) {
        return reply.status(400).send({ error: 'proposerTeamId is required' });
      }

      if (!await canManageTeam(userId, normalizedProposerTeamId)) {
        return reply.status(403).send({ error: 'Only owner/manager/coach can send proposals for this team' });
      }

      const post = await prisma.scrimPost.findUnique({
        where: { id: postId },
        select: {
          id: true,
          status: true,
          teamId: true,
          teamName: true,
          startTimeUtc: true,
        },
      });

      if (!post) {
        return reply.status(404).send({ error: 'Scrim post not found' });
      }

      if (post.teamId === normalizedProposerTeamId) {
        return reply.status(400).send({ error: 'You cannot propose against your own team' });
      }

      if (post.status === 'SETTLED') {
        return reply.status(400).send({ error: 'This scrim post is already settled' });
      }

      const parsedProposedStart = parseDate(proposedStartTimeUtc);

      const now = new Date();
      const upserted = await prisma.$transaction(async (tx: any) => {
        const existing = await tx.scrimProposal.findUnique({
          where: {
            postId_proposerTeamId: {
              postId,
              proposerTeamId: normalizedProposerTeamId,
            },
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (existing?.status === 'PENDING') {
          throw new Error('You already have a pending proposal for this scrim post.');
        }

        const proposal = existing
          ? await tx.scrimProposal.update({
              where: { id: existing.id },
              data: {
                status: 'PENDING',
                message: normalizeOptionalString(message),
                proposedByUserId: userId,
                proposedStartTimeUtc: parsedProposedStart,
                createdAt: now,
                lowPriorityAt: null,
                decisionAt: null,
                decisionByUserId: null,
                autoRejectedAt: null,
                responseSeconds: null,
              },
            })
          : await tx.scrimProposal.create({
              data: {
                postId,
                proposerTeamId: normalizedProposerTeamId,
                targetTeamId: post.teamId,
                proposedByUserId: userId,
                message: normalizeOptionalString(message),
                proposedStartTimeUtc: parsedProposedStart,
              },
            });

        if (post.status === 'AVAILABLE') {
          await tx.scrimPost.update({
            where: { id: postId },
            data: { status: 'CANDIDATES' },
          });
        }

        const targetReceivers = await tx.teamMember.findMany({
          where: {
            teamId: post.teamId,
            role: { in: ['OWNER', 'MANAGER', 'COACH'] },
          },
          select: { userId: true },
        });

        const receiverIds: string[] = Array.from(new Set(
          (targetReceivers as Array<{ userId: string }>).map((receiver) => receiver.userId)
        ));
        if (receiverIds.length > 0) {
          await tx.notification.createMany({
            data: receiverIds.map((receiverId: string) => ({
              userId: receiverId,
              type: 'SCRIM_PROPOSAL_RECEIVED',
              fromUserId: userId,
              message: 'A new scrim proposal has arrived. Review it in Teams > Scrim Finder.',
            })),
          });
        }

        return proposal;
      });

      return reply.status(201).send({
        success: true,
        proposal: upserted,
      });
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('already have a pending proposal')) {
        return reply.status(409).send({ error: message });
      }

      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to send scrim proposal' });
    }
  });

  // GET /api/scrims/proposals/incoming - Proposal inbox for manageable teams
  fastify.get('/scrims/proposals/incoming', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await autoRejectExpiredProposals();

      const manageableTeamIds = await getManageableTeamIds(userId);
      if (manageableTeamIds.length === 0) {
        return reply.send({ proposals: [] });
      }

      const proposals = await prisma.scrimProposal.findMany({
        where: {
          targetTeamId: { in: manageableTeamIds },
          status: { in: ['PENDING', 'DELAYED', 'ACCEPTED', 'REJECTED', 'AUTO_REJECTED'] },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 300,
        include: {
          proposerTeam: {
            select: {
              id: true,
              name: true,
              tag: true,
              region: true,
            },
          },
          post: {
            select: {
              id: true,
              teamId: true,
              teamName: true,
              teamTag: true,
              status: true,
              startTimeUtc: true,
              scrimFormat: true,
              teamMultiGgUrl: true,
              opggMultisearchUrl: true,
            },
          },
        },
      });

      return reply.send({ proposals });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch incoming scrim proposals' });
    }
  });

  // PATCH /api/scrims/proposals/:proposalId/decision - Accept, reject, or delay a proposal
  fastify.patch('/scrims/proposals/:proposalId/decision', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await autoRejectExpiredProposals();

      const { proposalId } = request.params as { proposalId: string };
      const { action } = request.body as { action?: string };
      const normalizedAction = normalizeString(action).toUpperCase();

      if (!SCRIM_PROPOSAL_DECISIONS.includes(normalizedAction as any)) {
        return reply.status(400).send({ error: `action must be one of: ${SCRIM_PROPOSAL_DECISIONS.join(', ')}` });
      }

      const proposal = await prisma.scrimProposal.findUnique({
        where: { id: proposalId },
        include: {
          proposerTeam: {
            select: {
              id: true,
              name: true,
              tag: true,
            },
          },
          post: {
            select: {
              id: true,
              teamName: true,
              status: true,
            },
          },
          proposedBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      if (!proposal) {
        return reply.status(404).send({ error: 'Scrim proposal not found' });
      }

      if (!await canManageTeam(userId, proposal.targetTeamId)) {
        return reply.status(403).send({ error: 'You are not allowed to decide this proposal' });
      }

      if (!['PENDING', 'DELAYED'].includes(proposal.status)) {
        return reply.status(400).send({ error: 'This proposal is already resolved' });
      }

      const now = new Date();
      const responseSeconds = Math.max(0, Math.floor((now.getTime() - proposal.createdAt.getTime()) / 1000));

      const dmTargets: Array<{ userId: string; message: string }> = [];

      const outcome = await prisma.$transaction(async (tx: any) => {
        const latest = await tx.scrimProposal.findUnique({
          where: { id: proposalId },
          select: {
            id: true,
            status: true,
            postId: true,
            createdAt: true,
            proposedByUserId: true,
            proposerTeamId: true,
          },
        });

        if (!latest || !['PENDING', 'DELAYED'].includes(latest.status)) {
          return null;
        }

        if (normalizedAction === 'ACCEPT') {
          await tx.scrimProposal.update({
            where: { id: latest.id },
            data: {
              status: 'ACCEPTED',
              decisionAt: now,
              decisionByUserId: userId,
              responseSeconds,
              lowPriorityAt: null,
            },
          });

          const competing = await tx.scrimProposal.findMany({
            where: {
              postId: latest.postId,
              id: { not: latest.id },
              status: { in: ['PENDING', 'DELAYED'] },
            },
            select: {
              id: true,
              proposedByUserId: true,
            },
          });

          if (competing.length > 0) {
            await tx.scrimProposal.updateMany({
              where: {
                id: { in: competing.map((entry: any) => entry.id) },
              },
              data: {
                status: 'REJECTED',
                decisionAt: now,
                decisionByUserId: userId,
              },
            });
          }

          await tx.scrimPost.update({
            where: { id: latest.postId },
            data: {
              status: 'SETTLED',
              settledAt: now,
            },
          });

          await tx.notification.create({
            data: {
              userId: latest.proposedByUserId,
              type: 'SCRIM_PROPOSAL_ACCEPTED',
              message: `Your scrim proposal was accepted by ${proposal.post.teamName}.`,
            },
          });

          if (competing.length > 0) {
            await tx.notification.createMany({
              data: competing.map((entry: any) => ({
                userId: entry.proposedByUserId,
                type: 'SCRIM_PROPOSAL_REJECTED',
                message: `Your scrim proposal was declined because ${proposal.post.teamName} settled with another opponent.`,
              })),
            });
          }

          return {
            status: 'ACCEPTED',
            rejectedProposalUserIds: competing.map((entry: any) => entry.proposedByUserId),
          };
        }

        if (normalizedAction === 'REJECT') {
          await tx.scrimProposal.update({
            where: { id: latest.id },
            data: {
              status: 'REJECTED',
              decisionAt: now,
              decisionByUserId: userId,
              responseSeconds,
              lowPriorityAt: null,
            },
          });

          await tx.notification.create({
            data: {
              userId: latest.proposedByUserId,
              type: 'SCRIM_PROPOSAL_REJECTED',
              message: `Your scrim proposal was rejected by ${proposal.post.teamName}.`,
            },
          });

          const activeProposalCount = await tx.scrimProposal.count({
            where: {
              postId: latest.postId,
              status: { in: ['PENDING', 'DELAYED'] },
            },
          });

          const currentPost = await tx.scrimPost.findUnique({
            where: { id: latest.postId },
            select: { status: true },
          });

          if (currentPost?.status !== 'SETTLED' && activeProposalCount === 0) {
            await tx.scrimPost.update({
              where: { id: latest.postId },
              data: { status: 'AVAILABLE' },
            });
          }

          return {
            status: 'REJECTED',
            rejectedProposalUserIds: [] as string[],
          };
        }

        await tx.scrimProposal.update({
          where: { id: latest.id },
          data: {
            status: 'DELAYED',
            lowPriorityAt: now,
            decisionAt: now,
            decisionByUserId: userId,
            responseSeconds,
          },
        });

        await tx.notification.create({
          data: {
            userId: latest.proposedByUserId,
            type: 'SCRIM_PROPOSAL_DELAYED',
            message: `${proposal.post.teamName} marked your scrim proposal as low priority and may come back to it as fallback.`,
          },
        });

        return {
          status: 'DELAYED',
          rejectedProposalUserIds: [] as string[],
        };
      });

      if (!outcome) {
        return reply.status(409).send({ error: 'Proposal state changed. Refresh and retry.' });
      }

      if (outcome.status === 'ACCEPTED') {
        dmTargets.push({
          userId: proposal.proposedBy.id,
          message: `${proposal.post.teamName} accepted your scrim proposal.`,
        });

        outcome.rejectedProposalUserIds.forEach((rejectedUserId: string) => {
          dmTargets.push({
            userId: rejectedUserId,
            message: `${proposal.post.teamName} settled with another team. Your proposal was declined.`,
          });
        });
      }

      if (outcome.status === 'REJECTED') {
        dmTargets.push({
          userId: proposal.proposedBy.id,
          message: `${proposal.post.teamName} rejected your scrim proposal.`,
        });
      }

      if (outcome.status === 'DELAYED') {
        dmTargets.push({
          userId: proposal.proposedBy.id,
          message: `${proposal.post.teamName} marked your proposal as low priority fallback.`,
        });
      }

      for (const target of dmTargets) {
        await enqueueDiscordDmForUser({
          userId: target.userId,
          senderUsername: 'Scrim Finder',
          messagePreview: target.message,
          conversationId: `scrim:${proposal.postId}`,
        });
      }

      return reply.send({
        success: true,
        status: outcome.status,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to decide scrim proposal' });
    }
  });
}
