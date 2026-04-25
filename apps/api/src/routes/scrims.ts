import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { randomUUID } from 'crypto';
import { getRecentMatchIds, getMatchDetails } from '../riotClient';
import { enqueueMirrorDeletion } from '../services/discordMirrorDeletionQueue';

const REGULAR_SCRIM_FORMATS = ['BO1', 'BO3', 'BO5'] as const;
const FEARLESS_SCRIM_FORMATS = ['FEARLESS_BO1', 'FEARLESS_BO3', 'FEARLESS_BO5', 'BLOCK'] as const;
const SCRIM_FORMATS = [...REGULAR_SCRIM_FORMATS, ...FEARLESS_SCRIM_FORMATS] as const;
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
const MASTER_PLUS_RANKS = ['MASTER', 'GRANDMASTER', 'CHALLENGER'] as const;
const DIVISION_ORDER = ['IV', 'III', 'II', 'I'] as const;
const PROPOSAL_TIMEOUT_MS = 10 * 60 * 1000;
const SCRIM_DISCORD_NOTIFICATION_TYPES = {
  RECEIVED: 'PROPOSAL_RECEIVED',
  ACCEPTED: 'PROPOSAL_ACCEPTED',
  REJECTED: 'PROPOSAL_REJECTED',
  DELAYED: 'PROPOSAL_DELAYED',
  AUTO_REJECTED: 'PROPOSAL_AUTO_REJECTED',
} as const;
const SCRIM_TEAM_EVENT_NOTIFICATION_TYPES = {
  SERIES_ACCEPTED: 'SCRIM_SERIES_ACCEPTED',
  MATCH_CODE_REGENERATED: 'SCRIM_MATCH_CODE_REGENERATED',
  AUTO_RESULT_CONFIRMED: 'SCRIM_RESULT_AUTO_CONFIRMED',
  MANUAL_RESULT_CONFIRMED: 'SCRIM_RESULT_MANUAL_CONFIRMED',
  AUTO_RESULT_MANUAL_REQUIRED: 'SCRIM_RESULT_MANUAL_REQUIRED',
  MANUAL_CONFLICT_ESCALATED: 'SCRIM_RESULT_CONFLICT_ESCALATION',
} as const;
const SCRIM_AUTO_RESULT_SWEEP_INTERVAL_MS = Math.max(30_000, Number.parseInt(process.env.SCRIM_AUTO_RESULT_SWEEP_INTERVAL_MS || '120000', 10) || 120_000);
const SCRIM_AUTO_RESULT_BATCH_SIZE = Math.max(1, Math.min(20, Number.parseInt(process.env.SCRIM_AUTO_RESULT_BATCH_SIZE || '6', 10) || 6));
const SCRIM_AUTO_RESULT_MATCH_SCAN_LIMIT = Math.max(10, Math.min(60, Number.parseInt(process.env.SCRIM_AUTO_RESULT_MATCH_SCAN_LIMIT || '24', 10) || 24));
const SCRIM_MANUAL_CONFLICT_ESCALATION_THRESHOLD = Math.max(1, Number.parseInt(process.env.SCRIM_CONFLICT_ESCALATION_THRESHOLD || '2', 10) || 2);
const SCRIM_AUTO_RESULT_WINDOW_BUFFER_HOURS = Math.max(1, Number.parseInt(process.env.SCRIM_AUTO_RESULT_WINDOW_BUFFER_HOURS || '2', 10) || 2);
const SCRIM_AUTO_RESULT_MIN_TEAM_PARTICIPANTS = Math.max(1, Number.parseInt(process.env.SCRIM_AUTO_RESULT_MIN_TEAM_PARTICIPANTS || '2', 10) || 2);

let autoResultSweepRunning = false;
let autoResultSweepLastRunAt = 0;

type RankName = typeof RANK_ORDER[number];

type ScrimProposalDecision = typeof SCRIM_PROPOSAL_DECISIONS[number];

class ScrimRouteError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

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

function parseOptionalNonNegativeInt(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.floor(value);
  }

  const normalized = normalizeString(value);
  if (!normalized) return null;

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
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

  if (MASTER_PLUS_RANKS.includes(normalizedRank as typeof MASTER_PLUS_RANKS[number])) {
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

  if (MASTER_PLUS_RANKS.includes(rank as typeof MASTER_PLUS_RANKS[number])) {
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

function buildTeamLabel(team: { name: string; tag?: string | null }): string {
  return team.tag ? `${team.name} [${team.tag}]` : team.name;
}

function getSupportDiscordUrl(): string {
  const direct = normalizeString(process.env.SCRIM_SUPPORT_DISCORD_URL);
  if (direct) return direct;

  const publicUrl = normalizeString(process.env.NEXT_PUBLIC_SUPPORT_DISCORD_URL);
  if (publicUrl) return publicUrl;

  return 'https://discord.gg/riftessence';
}

function scrimFormatToBoGames(scrimFormat: string | null | undefined): number | null {
  const normalized = normalizeString(scrimFormat).toUpperCase();
  if (normalized === 'BO1' || normalized === 'FEARLESS_BO1') return 1;
  if (normalized === 'BO3' || normalized === 'FEARLESS_BO3') return 3;
  if (normalized === 'BO5' || normalized === 'FEARLESS_BO5') return 5;
  return null;
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

async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      badges: {
        select: { key: true },
      },
    },
  });

  return (user?.badges ?? []).some((badge: any) => normalizeString(badge.key).toLowerCase() === 'admin');
}

async function buildTeamOpggMultisearchUrl(db: any, teamId: string): Promise<string | null> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: {
      region: true,
      members: {
        select: {
          user: {
            select: {
              riotAccounts: {
                where: {
                  OR: [
                    { isMain: true },
                    { hidden: false },
                  ],
                },
                orderBy: [
                  { isMain: 'desc' },
                  { createdAt: 'asc' },
                ],
                take: 1,
                select: {
                  gameName: true,
                  tagLine: true,
                  summonerName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!team) {
    return null;
  }

  const riotIds = (team.members as any[])
    .map((member: any) => {
      const account = member.user?.riotAccounts?.[0];
      if (!account) {
        return null;
      }

      const gameName = normalizeString(account.gameName || account.summonerName);
      const tagLine = normalizeString(account.tagLine);
      if (!gameName) {
        return null;
      }

      return tagLine ? `${gameName}#${tagLine}` : gameName;
    })
    .filter(Boolean) as string[];

  return buildOpggMultisearchUrl(team.region, riotIds);
}

function generateScrimMatchCode(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const randomPart = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `SCRIM-${stamp}-${randomPart}`;
}

async function createOrReuseScrimEvent(db: any, params: {
  teamId: string;
  title: string;
  scheduledAt: Date;
  enemyMultigg: string | null;
  createdBy: string;
}): Promise<string | null> {
  const scheduleMs = params.scheduledAt.getTime();
  if (!Number.isFinite(scheduleMs)) {
    return null;
  }

  const windowMs = 10 * 60 * 1000;
  const existing = await db.teamEvent.findFirst({
    where: {
      teamId: params.teamId,
      type: 'SCRIM',
      title: params.title,
      scheduledAt: {
        gte: new Date(scheduleMs - windowMs),
        lte: new Date(scheduleMs + windowMs),
      },
    },
    select: { id: true },
  });

  if (existing?.id) {
    return existing.id;
  }

  const created = await db.teamEvent.create({
    data: {
      teamId: params.teamId,
      title: params.title,
      type: 'SCRIM',
      scheduledAt: params.scheduledAt,
      enemyMultigg: params.enemyMultigg,
      createdBy: params.createdBy,
      description: 'Auto-created from Scrim Finder accepted proposal.',
    },
    select: { id: true },
  });

  return created.id;
}

async function ensureScrimSeriesForProposal(db: any, proposalId: string): Promise<string | null> {
  const proposal = await db.scrimProposal.findUnique({
    where: { id: proposalId },
    include: {
      post: {
        select: {
          id: true,
          teamId: true,
          teamName: true,
          startTimeUtc: true,
          scrimFormat: true,
          opggMultisearchUrl: true,
        },
      },
    },
  });

  if (!proposal || !proposal.post || proposal.status !== 'ACCEPTED') {
    return null;
  }

  const scheduledAt = proposal.post.startTimeUtc;
  const boGames = scrimFormatToBoGames(proposal.post.scrimFormat);
  const autoResultReadyAt = boGames ? new Date(scheduledAt.getTime() + boGames * 60 * 60 * 1000) : null;
  const autoResultStatus = boGames ? 'READY' : 'MANUAL_REQUIRED';
  const hostTeam = await db.team.findUnique({
    where: { id: proposal.targetTeamId },
    select: {
      name: true,
      ownerId: true,
    },
  });
  const guestTeam = await db.team.findUnique({
    where: { id: proposal.proposerTeamId },
    select: {
      name: true,
      ownerId: true,
    },
  });

  const hostEnemyMultigg = await buildTeamOpggMultisearchUrl(db, proposal.proposerTeamId);
  const guestEnemyMultigg = proposal.post.opggMultisearchUrl || await buildTeamOpggMultisearchUrl(db, proposal.targetTeamId);

  const [hostEventId, guestEventId] = await Promise.all([
    hostTeam?.ownerId
      ? createOrReuseScrimEvent(db, {
          teamId: proposal.targetTeamId,
          title: `Scrim vs ${guestTeam?.name || 'Opponent Team'}`,
          scheduledAt,
          enemyMultigg: hostEnemyMultigg,
          createdBy: hostTeam.ownerId,
        })
      : Promise.resolve(null),
    guestTeam?.ownerId
      ? createOrReuseScrimEvent(db, {
          teamId: proposal.proposerTeamId,
          title: `Scrim vs ${proposal.post.teamName || hostTeam?.name || 'Opponent Team'}`,
          scheduledAt,
          enemyMultigg: guestEnemyMultigg,
          createdBy: guestTeam.ownerId,
        })
      : Promise.resolve(null),
  ]);

  const series = await db.scrimSeries.upsert({
    where: { proposalId: proposal.id },
    update: {
      hostEventId: hostEventId,
      guestEventId: guestEventId,
      scheduledAt,
      autoResultStatus,
      autoResultReadyAt,
      autoResultFailureReason: boGames ? null : 'Auto-result unsupported for this scrim format. Use manual winner agreement.',
    },
    create: {
      proposalId: proposal.id,
      postId: proposal.post.id,
      hostTeamId: proposal.targetTeamId,
      guestTeamId: proposal.proposerTeamId,
      hostEventId: hostEventId,
      guestEventId: guestEventId,
      matchCode: generateScrimMatchCode(),
      matchCodeVersion: 1,
      scheduledAt,
      autoResultStatus,
      autoResultReadyAt,
      autoResultFailureReason: boGames ? null : 'Auto-result unsupported for this scrim format. Use manual winner agreement.',
    },
    select: { id: true },
  });

  return series.id;
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

function validateBotAuth(request: any, reply: any, done: () => void) {
  const authHeader = request.headers.authorization;
  const expectedKey = process.env.DISCORD_BOT_API_KEY;

  if (!expectedKey) {
    reply.status(500).send({ error: 'Bot API key not configured on server' });
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing or invalid authorization header' });
    return;
  }

  const providedKey = authHeader.substring(7);
  if (providedKey !== expectedKey) {
    reply.status(403).send({ error: 'Invalid bot API key' });
    return;
  }

  done();
}

async function getTeamDecisionRecipientIds(db: any, teamId: string): Promise<string[]> {
  const [team, managers] = await Promise.all([
    db.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true },
    }),
    db.teamMember.findMany({
      where: {
        teamId,
        role: { in: ['OWNER', 'MANAGER', 'COACH'] },
      },
      select: { userId: true },
    }),
  ]);

  const ids = new Set<string>();
  if (team?.ownerId) ids.add(team.ownerId);
  (managers as Array<{ userId: string }>).forEach((entry) => ids.add(entry.userId));
  return Array.from(ids);
}

async function createScrimDiscordNotifications(db: any, entries: Array<{
  proposalId: string;
  recipientUserId: string;
  type: keyof typeof SCRIM_DISCORD_NOTIFICATION_TYPES;
  message: string;
  actionRequired?: boolean;
}>) {
  if (!entries.length) return;

  const recipientIds = Array.from(new Set(entries.map((entry) => entry.recipientUserId)));
  const recipients = await db.user.findMany({
    where: { id: { in: recipientIds } },
    select: {
      id: true,
      discordDmNotifications: true,
      discordAccount: { select: { discordId: true } },
    },
  });

  const recipientMap = new Map<string, { discordDmNotifications: boolean; discordAccount: { discordId: string } | null }>(
    (recipients as Array<{ id: string; discordDmNotifications: boolean; discordAccount: { discordId: string } | null }>).map((recipient) => [recipient.id, recipient])
  );

  const rows = entries.flatMap((entry) => {
    const recipient = recipientMap.get(entry.recipientUserId);
    if (!recipient?.discordDmNotifications || !recipient.discordAccount?.discordId) {
      return [];
    }

    return [{
      proposalId: entry.proposalId,
      recipientUserId: entry.recipientUserId,
      recipientDiscordId: recipient.discordAccount.discordId,
      type: SCRIM_DISCORD_NOTIFICATION_TYPES[entry.type],
      message: entry.message,
      actionRequired: Boolean(entry.actionRequired),
    }];
  });

  if (rows.length > 0) {
    await db.scrimDiscordNotification.createMany({ data: rows });
  }
}

type ScrimLifecycleEntry = {
  teamId: string;
  title: string;
  message: string;
  appNotificationType:
    | 'SCRIM_SERIES_ACCEPTED'
    | 'SCRIM_MATCH_CODE_REGENERATED'
    | 'SCRIM_RESULT_AUTO_CONFIRMED'
    | 'SCRIM_RESULT_MANUAL_CONFIRMED'
    | 'SCRIM_RESULT_MANUAL_REQUIRED'
    | 'SCRIM_RESULT_CONFLICT_ESCALATION';
};

async function createScrimLifecycleFanout(db: any, params: {
  seriesId: string;
  scheduledAt: Date;
  lifecycleType: keyof typeof SCRIM_TEAM_EVENT_NOTIFICATION_TYPES;
  triggeredByUserId?: string | null;
  triggeredByUsername?: string | null;
  entries: ScrimLifecycleEntry[];
}) {
  if (!params.entries.length) {
    return;
  }

  await db.teamEventNotification.createMany({
    data: params.entries.map((entry) => ({
      teamId: entry.teamId,
      eventId: params.seriesId,
      eventTitle: entry.title,
      eventType: 'SCRIM',
      scheduledAt: params.scheduledAt,
      duration: null,
      description: entry.message,
      enemyLink: null,
      concernedMemberIds: [],
      notificationType: SCRIM_TEAM_EVENT_NOTIFICATION_TYPES[params.lifecycleType],
      triggeredBy: params.triggeredByUsername || 'System',
    })),
  });

  const inAppRows: Array<{
    userId: string;
    type: ScrimLifecycleEntry['appNotificationType'];
    fromUserId: string | null;
    message: string;
  }> = [];
  const dedupe = new Set<string>();

  for (const entry of params.entries) {
    const recipients = await getTeamDecisionRecipientIds(db, entry.teamId);
    for (const recipientUserId of recipients) {
      const dedupeKey = `${recipientUserId}::${entry.appNotificationType}::${entry.message}`;
      if (dedupe.has(dedupeKey)) continue;
      dedupe.add(dedupeKey);
      inAppRows.push({
        userId: recipientUserId,
        type: entry.appNotificationType,
        fromUserId: params.triggeredByUserId || null,
        message: entry.message,
      });
    }
  }

  if (inAppRows.length > 0) {
    await db.notification.createMany({ data: inAppRows });
  }
}

function extractTeamRiotAccounts(team: any): Array<{ puuid: string; region: string }> {
  const identities: Array<{ puuid: string; region: string }> = [];

  for (const member of team?.members || []) {
    const account = member?.user?.riotAccounts?.[0];
    const puuid = normalizeString(account?.puuid);
    const region = normalizeString(account?.region);
    if (!puuid || !region) continue;

    identities.push({ puuid, region });
  }

  const seen = new Set<string>();
  return identities.filter((entry) => {
    const key = `${entry.region}::${entry.puuid}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function detectAutoWinnerForSeries(series: any): Promise<{
  winnerTeamId: string;
  matchId: string;
} | null> {
  const boGames = scrimFormatToBoGames(series?.post?.scrimFormat);
  if (!boGames) {
    return null;
  }

  const hostAccounts = extractTeamRiotAccounts(series.hostTeam);
  const guestAccounts = extractTeamRiotAccounts(series.guestTeam);
  if (hostAccounts.length === 0 || guestAccounts.length === 0) {
    return null;
  }

  const scheduledMs = series?.scheduledAt instanceof Date
    ? series.scheduledAt.getTime()
    : new Date(series?.scheduledAt || 0).getTime();

  if (!Number.isFinite(scheduledMs)) {
    return null;
  }

  const windowStartMs = scheduledMs - 30 * 60 * 1000;
  const windowEndMs = scheduledMs + (boGames + SCRIM_AUTO_RESULT_WINDOW_BUFFER_HOURS) * 60 * 60 * 1000;

  const hostPuuidSet = new Set(hostAccounts.map((entry) => entry.puuid));
  const guestPuuidSet = new Set(guestAccounts.map((entry) => entry.puuid));
  const checkedMatchIds = new Set<string>();
  const scanAccounts = [...hostAccounts, ...guestAccounts];

  for (const account of scanAccounts) {
    let matchIds: string[] = [];
    try {
      matchIds = await getRecentMatchIds(account.puuid, account.region, SCRIM_AUTO_RESULT_MATCH_SCAN_LIMIT);
    } catch {
      continue;
    }

    for (const matchId of matchIds) {
      if (!matchId || checkedMatchIds.has(matchId)) {
        continue;
      }
      checkedMatchIds.add(matchId);

      let matchData: any;
      try {
        matchData = await getMatchDetails(matchId, account.region);
      } catch {
        continue;
      }

      const gameCreationMs = Number(matchData?.info?.gameCreation);
      if (Number.isFinite(gameCreationMs) && (gameCreationMs < windowStartMs || gameCreationMs > windowEndMs)) {
        continue;
      }

      const participants = Array.isArray(matchData?.info?.participants)
        ? matchData.info.participants
        : [];

      if (participants.length === 0) {
        continue;
      }

      const hostParticipants = participants.filter((participant: any) => hostPuuidSet.has(normalizeString(participant?.puuid)));
      const guestParticipants = participants.filter((participant: any) => guestPuuidSet.has(normalizeString(participant?.puuid)));

      if (
        hostParticipants.length < SCRIM_AUTO_RESULT_MIN_TEAM_PARTICIPANTS
        || guestParticipants.length < SCRIM_AUTO_RESULT_MIN_TEAM_PARTICIPANTS
      ) {
        continue;
      }

      const hostWins = hostParticipants.reduce((sum: number, participant: any) => sum + (participant?.win ? 1 : 0), 0);
      const guestWins = guestParticipants.reduce((sum: number, participant: any) => sum + (participant?.win ? 1 : 0), 0);

      if (hostWins === guestWins) {
        continue;
      }

      return {
        winnerTeamId: hostWins > guestWins ? series.hostTeamId : series.guestTeamId,
        matchId,
      };
    }
  }

  return null;
}

async function maybeRunDueAutoResultSweep(fastify?: any): Promise<void> {
  if (autoResultSweepRunning) {
    return;
  }

  const nowMs = Date.now();
  if (nowMs - autoResultSweepLastRunAt < SCRIM_AUTO_RESULT_SWEEP_INTERVAL_MS) {
    return;
  }

  autoResultSweepRunning = true;
  autoResultSweepLastRunAt = nowMs;

  try {
    const dueSeries = await prisma.scrimSeries.findMany({
      where: {
        winnerConfirmedAt: null,
        autoResultStatus: { in: ['READY', 'RUNNING'] },
        autoResultReadyAt: { lte: new Date() },
      },
      orderBy: [{ autoResultReadyAt: 'asc' }, { scheduledAt: 'asc' }],
      take: SCRIM_AUTO_RESULT_BATCH_SIZE,
      include: {
        post: {
          select: {
            scrimFormat: true,
          },
        },
        hostTeam: {
          select: {
            id: true,
            name: true,
            tag: true,
            members: {
              select: {
                user: {
                  select: {
                    riotAccounts: {
                      where: { verified: true },
                      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
                      take: 1,
                      select: {
                        puuid: true,
                        region: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        guestTeam: {
          select: {
            id: true,
            name: true,
            tag: true,
            members: {
              select: {
                user: {
                  select: {
                    riotAccounts: {
                      where: { verified: true },
                      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
                      take: 1,
                      select: {
                        puuid: true,
                        region: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const series of dueSeries as any[]) {
      const now = new Date();

      const claimed = await prisma.scrimSeries.updateMany({
        where: {
          id: series.id,
          winnerConfirmedAt: null,
          autoResultStatus: { in: ['READY', 'RUNNING'] },
        },
        data: {
          autoResultStatus: 'RUNNING',
          autoResultLastCheckedAt: now,
        },
      });

      if (claimed.count === 0) {
        continue;
      }

      const winner = await detectAutoWinnerForSeries(series);
      const hostLabel = buildTeamLabel(series.hostTeam);
      const guestLabel = buildTeamLabel(series.guestTeam);

      if (winner?.winnerTeamId) {
        const winnerLabel = winner.winnerTeamId === series.hostTeamId ? hostLabel : guestLabel;

        await prisma.$transaction(async (tx: any) => {
          const latest = await tx.scrimSeries.findUnique({
            where: { id: series.id },
            select: {
              id: true,
              winnerConfirmedAt: true,
              hostTeamId: true,
              guestTeamId: true,
              scheduledAt: true,
              matchCode: true,
              matchCodeVersion: true,
            },
          });

          if (!latest || latest.winnerConfirmedAt) {
            return;
          }

          await tx.scrimSeries.update({
            where: { id: series.id },
            data: {
              winnerTeamId: winner.winnerTeamId,
              winnerConfirmedAt: now,
              resultSource: 'AUTO_RIOT',
              autoResultStatus: 'CONFIRMED',
              autoResultAttempts: { increment: 1 },
              autoResultLastCheckedAt: now,
              autoResultFailureReason: null,
              autoResultMatchId: winner.matchId,
            },
          });

          const details = `Auto-detected winner: ${winnerLabel}. Match code ${latest.matchCode} (v${latest.matchCodeVersion}).`;
          await createScrimLifecycleFanout(tx, {
            seriesId: latest.id,
            scheduledAt: latest.scheduledAt,
            lifecycleType: 'AUTO_RESULT_CONFIRMED',
            triggeredByUsername: 'Riot Auto Resolver',
            entries: [
              {
                teamId: latest.hostTeamId,
                title: `Auto Result Confirmed • ${hostLabel} vs ${guestLabel}`,
                message: details,
                appNotificationType: 'SCRIM_RESULT_AUTO_CONFIRMED',
              },
              {
                teamId: latest.guestTeamId,
                title: `Auto Result Confirmed • ${hostLabel} vs ${guestLabel}`,
                message: details,
                appNotificationType: 'SCRIM_RESULT_AUTO_CONFIRMED',
              },
            ],
          });
        });

        continue;
      }

      await prisma.$transaction(async (tx: any) => {
        const latest = await tx.scrimSeries.findUnique({
          where: { id: series.id },
          select: {
            id: true,
            winnerConfirmedAt: true,
            hostTeamId: true,
            guestTeamId: true,
            scheduledAt: true,
          },
        });

        if (!latest || latest.winnerConfirmedAt) {
          return;
        }

        await tx.scrimSeries.update({
          where: { id: series.id },
          data: {
            autoResultStatus: 'MANUAL_REQUIRED',
            autoResultAttempts: { increment: 1 },
            autoResultLastCheckedAt: now,
            autoResultFailureReason: 'Auto-result scan could not confidently determine a winner from Riot match history.',
          },
        });

        const message = `Auto-result scan could not confirm ${hostLabel} vs ${guestLabel}. Please use manual winner agreement in Scrim Finder.`;
        await createScrimLifecycleFanout(tx, {
          seriesId: latest.id,
          scheduledAt: latest.scheduledAt,
          lifecycleType: 'AUTO_RESULT_MANUAL_REQUIRED',
          triggeredByUsername: 'Riot Auto Resolver',
          entries: [
            {
              teamId: latest.hostTeamId,
              title: `Manual Winner Agreement Needed • ${hostLabel} vs ${guestLabel}`,
              message,
              appNotificationType: 'SCRIM_RESULT_MANUAL_REQUIRED',
            },
            {
              teamId: latest.guestTeamId,
              title: `Manual Winner Agreement Needed • ${hostLabel} vs ${guestLabel}`,
              message,
              appNotificationType: 'SCRIM_RESULT_MANUAL_REQUIRED',
            },
          ],
        });
      });
    }
  } catch (error: any) {
    if (fastify?.log?.error) {
      fastify.log.error(error);
    } else {
      console.error('[scrims] auto-result sweep failed', error?.message || error);
    }
  } finally {
    autoResultSweepRunning = false;
  }
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
    },
    take: 120,
  });

  for (const proposal of candidates as any[]) {
    const now = new Date();

    await prisma.$transaction(async (tx: any) => {
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

      await createScrimDiscordNotifications(tx, [{
        proposalId: latest.id,
        recipientUserId: latest.proposedByUserId,
        type: 'AUTO_REJECTED',
        message: `Your scrim proposal to ${proposal.post.teamName} expired after 10 minutes without response.`,
      }]);

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

      return true;
    });
  }
}

async function applyScrimProposalDecision(params: {
  proposalId: string;
  action: string;
  actorUserId: string;
}) {
  await autoRejectExpiredProposals();

  const normalizedAction = normalizeString(params.action).toUpperCase() as ScrimProposalDecision;
  if (!SCRIM_PROPOSAL_DECISIONS.includes(normalizedAction)) {
    throw new ScrimRouteError(400, `action must be one of: ${SCRIM_PROPOSAL_DECISIONS.join(', ')}`);
  }

  const proposal = await prisma.scrimProposal.findUnique({
    where: { id: params.proposalId },
    include: {
      post: {
        select: {
          id: true,
          teamId: true,
          teamName: true,
          startTimeUtc: true,
          opggMultisearchUrl: true,
          status: true,
        },
      },
    },
  });

  if (!proposal) {
    throw new ScrimRouteError(404, 'Scrim proposal not found');
  }

  if (!await canManageTeam(params.actorUserId, proposal.targetTeamId)) {
    throw new ScrimRouteError(403, 'You are not allowed to decide this proposal');
  }

  if (!['PENDING', 'DELAYED'].includes(proposal.status)) {
    throw new ScrimRouteError(400, 'This proposal is already resolved');
  }

  const now = new Date();
  const responseSeconds = Math.max(0, Math.floor((now.getTime() - proposal.createdAt.getTime()) / 1000));

  const outcome = await prisma.$transaction(async (tx: any) => {
    const latest = await tx.scrimProposal.findUnique({
      where: { id: params.proposalId },
      select: {
        id: true,
        status: true,
        postId: true,
        createdAt: true,
        proposedByUserId: true,
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
          decisionByUserId: params.actorUserId,
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
            decisionByUserId: params.actorUserId,
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

      await createScrimDiscordNotifications(tx, [{
        proposalId: latest.id,
        recipientUserId: latest.proposedByUserId,
        type: 'ACCEPTED',
        message: `${proposal.post.teamName} accepted your scrim proposal.`,
      }]);

      if (competing.length > 0) {
        await tx.notification.createMany({
          data: competing.map((entry: any) => ({
            userId: entry.proposedByUserId,
            type: 'SCRIM_PROPOSAL_REJECTED',
            message: `Your scrim proposal was declined because ${proposal.post.teamName} settled with another opponent.`,
          })),
        });

        await createScrimDiscordNotifications(tx, competing.map((entry: any) => ({
          proposalId: entry.id,
          recipientUserId: entry.proposedByUserId,
          type: 'REJECTED',
          message: `${proposal.post.teamName} settled with another team. Your proposal was declined.`,
        })));
      }

      const seriesId = await ensureScrimSeriesForProposal(tx, latest.id);

      if (seriesId) {
        const series = await tx.scrimSeries.findUnique({
          where: { id: seriesId },
          select: {
            id: true,
            hostTeamId: true,
            guestTeamId: true,
            matchCode: true,
            matchCodeVersion: true,
            scheduledAt: true,
            autoResultStatus: true,
            hostTeam: {
              select: {
                name: true,
                tag: true,
              },
            },
            guestTeam: {
              select: {
                name: true,
                tag: true,
              },
            },
            post: {
              select: {
                scrimFormat: true,
              },
            },
          },
        });

        if (series) {
          const hostLabel = buildTeamLabel(series.hostTeam);
          const guestLabel = buildTeamLabel(series.guestTeam);
          const hostMessage = `Scrim accepted vs ${guestLabel}. Host responsibility: create the lobby with code ${series.matchCode} (v${series.matchCodeVersion}) before start.`;
          const guestMessage = `Scrim accepted vs ${hostLabel}. Host ${hostLabel} will create the lobby with code ${series.matchCode} (v${series.matchCodeVersion}).`;

          await createScrimLifecycleFanout(tx, {
            seriesId: series.id,
            scheduledAt: series.scheduledAt,
            lifecycleType: 'SERIES_ACCEPTED',
            triggeredByUserId: params.actorUserId,
            entries: [
              {
                teamId: series.hostTeamId,
                title: `Scrim Accepted • ${hostLabel} vs ${guestLabel}`,
                message: hostMessage,
                appNotificationType: 'SCRIM_SERIES_ACCEPTED',
              },
              {
                teamId: series.guestTeamId,
                title: `Scrim Accepted • ${hostLabel} vs ${guestLabel}`,
                message: guestMessage,
                appNotificationType: 'SCRIM_SERIES_ACCEPTED',
              },
            ],
          });

          if (series.autoResultStatus === 'MANUAL_REQUIRED') {
            const manualMessage = `Auto-result is unavailable for format ${series.post.scrimFormat}. Use manual winner agreement after the scrim.`;
            await createScrimLifecycleFanout(tx, {
              seriesId: series.id,
              scheduledAt: series.scheduledAt,
              lifecycleType: 'AUTO_RESULT_MANUAL_REQUIRED',
              triggeredByUsername: 'System',
              entries: [
                {
                  teamId: series.hostTeamId,
                  title: `Manual Winner Agreement Needed • ${hostLabel} vs ${guestLabel}`,
                  message: manualMessage,
                  appNotificationType: 'SCRIM_RESULT_MANUAL_REQUIRED',
                },
                {
                  teamId: series.guestTeamId,
                  title: `Manual Winner Agreement Needed • ${hostLabel} vs ${guestLabel}`,
                  message: manualMessage,
                  appNotificationType: 'SCRIM_RESULT_MANUAL_REQUIRED',
                },
              ],
            });
          }
        }
      }

      return { status: 'ACCEPTED', seriesId };
    }

    if (normalizedAction === 'REJECT') {
      await tx.scrimProposal.update({
        where: { id: latest.id },
        data: {
          status: 'REJECTED',
          decisionAt: now,
          decisionByUserId: params.actorUserId,
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

      await createScrimDiscordNotifications(tx, [{
        proposalId: latest.id,
        recipientUserId: latest.proposedByUserId,
        type: 'REJECTED',
        message: `${proposal.post.teamName} rejected your scrim proposal.`,
      }]);

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

      return { status: 'REJECTED' };
    }

    await tx.scrimProposal.update({
      where: { id: latest.id },
      data: {
        status: 'DELAYED',
        lowPriorityAt: now,
        decisionAt: now,
        decisionByUserId: params.actorUserId,
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

    await createScrimDiscordNotifications(tx, [{
      proposalId: latest.id,
      recipientUserId: latest.proposedByUserId,
      type: 'DELAYED',
      message: `${proposal.post.teamName} marked your proposal as low priority fallback.`,
    }]);

    return { status: 'DELAYED' };
  });

  if (!outcome) {
    throw new ScrimRouteError(409, 'Proposal state changed. Refresh and retry.');
  }

  return outcome;
}

export default async function scrimRoutes(fastify: any) {
  const sweepFlagKey = '__riftessenceScrimAutoResultSweepStarted__';
  if (!(globalThis as any)[sweepFlagKey]) {
    (globalThis as any)[sweepFlagKey] = true;
    setInterval(() => {
      void maybeRunDueAutoResultSweep(fastify);
    }, SCRIM_AUTO_RESULT_SWEEP_INTERVAL_MS);
    fastify.log.info({ intervalMs: SCRIM_AUTO_RESULT_SWEEP_INTERVAL_MS }, 'Started scrim auto-result sweep loop');
  }

  // GET /api/scrims/posts - Main scrim feed with filters
  fastify.get('/scrims/posts', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await autoRejectExpiredProposals();

      const { region, status, format, fearless, teamId } = (request.query || {}) as {
        region?: string;
        status?: string;
        format?: string;
        fearless?: string;
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

      const normalizedFormat = normalizeString(format).toUpperCase();
      const hasSpecificFormat = SCRIM_FORMATS.includes(normalizedFormat as any);

      if (hasSpecificFormat) {
        where.scrimFormat = normalizedFormat;
      }

      const normalizedFearless = normalizeString(fearless).toUpperCase();
      if (!hasSpecificFormat) {
        if (normalizedFearless === 'FEARLESS') {
          where.scrimFormat = { in: [...FEARLESS_SCRIM_FORMATS] as any };
        } else if (normalizedFearless === 'REGULAR') {
          where.scrimFormat = { in: [...REGULAR_SCRIM_FORMATS] as any };
        }
      }

      if (teamId && normalizeString(teamId).length > 0) {
        where.teamId = normalizeString(teamId);
      }

      const [manageableTeamIds, viewerIsAdmin] = await Promise.all([
        getManageableTeamIds(userId),
        isAdminUser(userId),
      ]);

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

      const teamIds = Array.from(new Set((posts as any[]).map((post: any) => post.teamId)));
      const responseAverages = teamIds.length > 0
        ? await prisma.scrimProposal.groupBy({
          by: ['targetTeamId'],
          where: {
            targetTeamId: { in: teamIds },
            responseSeconds: { not: null },
          },
          _avg: {
            responseSeconds: true,
          },
        })
        : [];

      const teamAverageResponseMap = new Map<string, number>();
      (responseAverages as Array<{ targetTeamId: string; _avg: { responseSeconds: number | null } }>).forEach((entry) => {
        if (typeof entry._avg.responseSeconds === 'number' && Number.isFinite(entry._avg.responseSeconds)) {
          teamAverageResponseMap.set(entry.targetTeamId, Number((entry._avg.responseSeconds / 60).toFixed(1)));
        }
      });

      const formattedPosts = posts.map((post: any) => {
        const pendingCount = post.proposals.filter((proposal: any) => proposal.status === 'PENDING').length;
        const delayedCount = post.proposals.filter((proposal: any) => proposal.status === 'DELAYED').length;
        const acceptedCount = post.proposals.filter((proposal: any) => proposal.status === 'ACCEPTED').length;
        const rejectedCount = post.proposals.filter((proposal: any) => proposal.status === 'REJECTED').length;
        const autoRejectedCount = post.proposals.filter((proposal: any) => proposal.status === 'AUTO_REJECTED').length;
        const averageResponseMinutes = teamAverageResponseMap.get(post.teamId) ?? null;

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
          averageLp: post.averageLp,
          startTimeUtc: post.startTimeUtc,
          timezoneLabel: post.timezoneLabel,
          scrimFormat: post.scrimFormat,
          opggMultisearchUrl: post.opggMultisearchUrl,
          details: post.details,
          status: post.status,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          team: post.team,
          canDelete: post.authorId === userId || manageableTeamIds.includes(post.teamId) || viewerIsAdmin,
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

  // GET /api/scrims/discord-notifications - Get pending scrim Discord notifications (bot only)
  fastify.get('/scrims/discord-notifications', { preHandler: validateBotAuth }, async (_request: any, reply: any) => {
    try {
      const notifications = await prisma.scrimDiscordNotification.findMany({
        where: { processed: false },
        orderBy: { createdAt: 'asc' },
        take: 80,
        include: {
          proposal: {
            select: {
              id: true,
              status: true,
              message: true,
              proposedStartTimeUtc: true,
              post: {
                select: {
                  id: true,
                  teamName: true,
                  teamTag: true,
                  startTimeUtc: true,
                  scrimFormat: true,
                  averageLp: true,
                  opggMultisearchUrl: true,
                },
              },
              proposerTeam: {
                select: {
                  id: true,
                  name: true,
                  tag: true,
                  region: true,
                },
              },
              targetTeam: {
                select: {
                  id: true,
                  name: true,
                  tag: true,
                  region: true,
                },
              },
            },
          },
        },
      });

      const proposerTeamIds = Array.from(new Set((notifications as any[])
        .map((entry: any) => normalizeString(entry?.proposal?.proposerTeam?.id))
        .filter((value: string) => value.length > 0)));

      const proposerTeamOpggMap = new Map<string, string | null>();
      await Promise.all(proposerTeamIds.map(async (teamId) => {
        const teamOpgg = await buildTeamOpggMultisearchUrl(prisma, teamId);
        proposerTeamOpggMap.set(teamId, teamOpgg);
      }));

      const mappedNotifications = (notifications as any[]).map((entry: any) => {
        const proposerTeamId = normalizeString(entry?.proposal?.proposerTeam?.id);
        const proposerTeamOpgg = proposerTeamOpggMap.get(proposerTeamId) || null;
        return {
          ...entry,
          proposal: {
            ...entry.proposal,
            post: {
              ...entry.proposal?.post,
              opggMultisearchUrl: proposerTeamOpgg,
            },
          },
        };
      });

      return reply.send({ notifications: mappedNotifications });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch scrim Discord notifications' });
    }
  });

  // PATCH /api/scrims/discord-notifications/:id/processed - Mark scrim Discord notification as processed (bot only)
  fastify.patch('/scrims/discord-notifications/:id/processed', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.scrimDiscordNotification.update({
        where: { id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to mark scrim Discord notification as processed' });
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
        averageLp,
        startTimeUtc,
        timezoneLabel,
        scrimFormat,
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

      if (parsedStartTime.getTime() < Date.now()) {
        return reply.status(400).send({ error: 'startTimeUtc cannot be in the past' });
      }

      const normalizedRank = normalizeString(averageRank).toUpperCase();
      const rankIsValid = RANK_ORDER.includes(normalizedRank as RankName);
      const isMasterPlusRank = MASTER_PLUS_RANKS.includes(normalizedRank as typeof MASTER_PLUS_RANKS[number]);

      const rawDivision = normalizeOptionalString(averageDivision)?.toUpperCase() || null;
      if (rawDivision && !DIVISION_ORDER.includes(rawDivision as typeof DIVISION_ORDER[number])) {
        return reply.status(400).send({ error: `averageDivision must be one of: ${DIVISION_ORDER.join(', ')}` });
      }

      const hasAverageLpInput = averageLp !== undefined && averageLp !== null && normalizeString(String(averageLp)).length > 0;
      const parsedAverageLp = parseOptionalNonNegativeInt(averageLp);
      if (hasAverageLpInput && parsedAverageLp === null) {
        return reply.status(400).send({ error: 'averageLp must be a non-negative integer' });
      }

      if ((parsedAverageLp || 0) > 5000) {
        return reply.status(400).send({ error: 'averageLp must be 5000 or less' });
      }

      const normalizedDivision = !rankIsValid || normalizedRank === 'UNRANKED' || isMasterPlusRank
        ? null
        : rawDivision;
      const normalizedAverageLp = rankIsValid && isMasterPlusRank ? parsedAverageLp : null;

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

      const replacedMirroredPostIds = new Set<string>();

      const created = await prisma.$transaction(async (tx: any) => {
        const activePosts = await tx.scrimPost.findMany({
          where: {
            teamId: normalizedTeamId,
            status: { in: ['AVAILABLE', 'CANDIDATES'] },
          },
          select: {
            id: true,
            source: true,
            discordMirrored: true,
            proposals: {
              where: { status: { in: ['PENDING', 'DELAYED'] } },
              select: {
                id: true,
                proposedByUserId: true,
              },
            },
          },
        });

        const displacedProposals = (activePosts as Array<{ id: string; proposals: Array<{ id: string; proposedByUserId: string }> }>).flatMap((post) => post.proposals);

        if (displacedProposals.length > 0) {
          const displacedUserIds = Array.from(new Set(displacedProposals.map((proposal) => proposal.proposedByUserId)));

          await tx.notification.createMany({
            data: displacedUserIds.map((recipientId) => ({
              userId: recipientId,
              type: 'SCRIM_PROPOSAL_REJECTED',
              message: `${team.name} published a newer scrim slot, so your previous proposal was cleared.`,
            })),
          });

          await createScrimDiscordNotifications(tx, displacedProposals.map((proposal) => ({
            proposalId: proposal.id,
            recipientUserId: proposal.proposedByUserId,
            type: 'REJECTED',
            message: `${team.name} published a newer scrim slot, so your previous proposal was cleared.`,
          })));
        }

        if (activePosts.length > 0) {
          for (const post of activePosts as Array<{ id: string; source: string | null; discordMirrored: boolean }>) {
            if (post.source === 'app' && post.discordMirrored) {
              replacedMirroredPostIds.add(post.id);
            }
          }

          await tx.scrimPost.deleteMany({
            where: {
              id: { in: activePosts.map((post: { id: string }) => post.id) },
            },
          });
        }

        const post = await tx.scrimPost.create({
          data: {
            teamId: normalizedTeamId,
            authorId: userId,
            contactUserId: normalizeOptionalString(contactUserId),
            region: team.region,
            teamName: team.name,
            teamTag: team.tag,
            averageRank: rankIsValid ? normalizedRank : null,
            averageDivision: normalizedDivision,
            averageLp: normalizedAverageLp,
            startTimeUtc: parsedStartTime,
            timezoneLabel: normalizeOptionalString(timezoneLabel),
            scrimFormat: normalizedFormat,
            teamMultiGgUrl: null,
            opggMultisearchUrl: normalizeOptionalString(opggMultisearchUrl),
            details: normalizeOptionalString(details),
            source: 'app',
            discordMirrored: false,
          },
        });

        return post;
      });

      for (const postId of replacedMirroredPostIds) {
        enqueueMirrorDeletion('SCRIM', postId);
      }

      return reply.status(201).send({
        success: true,
        post: created,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create scrim post' });
    }
  });

  // DELETE /api/scrims/posts/:postId - Delete scrim listing (creator/manager/admin)
  fastify.delete('/scrims/posts/:postId', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { postId } = request.params as { postId: string };
      const normalizedPostId = normalizeString(postId);
      if (!normalizedPostId) {
        return reply.status(400).send({ error: 'postId is required' });
      }

      const post = await prisma.scrimPost.findUnique({
        where: { id: normalizedPostId },
        select: {
          id: true,
          teamId: true,
          authorId: true,
          source: true,
          discordMirrored: true,
        },
      });

      if (!post) {
        return reply.status(404).send({ error: 'Scrim post not found' });
      }

      const [canManage, isAdmin] = await Promise.all([
        canManageTeam(userId, post.teamId),
        isAdminUser(userId),
      ]);

      if (post.authorId !== userId && !canManage && !isAdmin) {
        return reply.status(403).send({ error: 'You are not allowed to delete this scrim post' });
      }

      await prisma.scrimPost.delete({
        where: { id: post.id },
      });

      if (post.source === 'app' && post.discordMirrored) {
        enqueueMirrorDeletion('SCRIM', post.id);
      }

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete scrim post' });
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
      const { proposerTeamId, message } = request.body as any;
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

      const now = new Date();
      const upserted = await prisma.$transaction(async (tx: any) => {
        const proposerTeam = await tx.team.findUnique({
          where: { id: normalizedProposerTeamId },
          select: {
            id: true,
            name: true,
            tag: true,
          },
        });

        if (!proposerTeam) {
          throw new Error('Proposer team not found');
        }

        const proposerTeamLabel = buildTeamLabel(proposerTeam);
        const proposerTeamOpgg = await buildTeamOpggMultisearchUrl(tx, normalizedProposerTeamId);
        const proposalNotificationMessage = proposerTeamOpgg
          ? `${proposerTeamLabel} sent a new scrim proposal. OP.GG: ${proposerTeamOpgg}`
          : `${proposerTeamLabel} sent a new scrim proposal.`;

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
                proposedStartTimeUtc: null,
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
                proposedStartTimeUtc: null,
              },
            });

        if (post.status === 'AVAILABLE') {
          await tx.scrimPost.update({
            where: { id: postId },
            data: { status: 'CANDIDATES' },
          });
        }

        const receiverIds = await getTeamDecisionRecipientIds(tx, post.teamId);
        if (receiverIds.length > 0) {
          await tx.notification.createMany({
            data: receiverIds.map((receiverId: string) => ({
              userId: receiverId,
              type: 'SCRIM_PROPOSAL_RECEIVED',
              fromUserId: userId,
              message: proposalNotificationMessage,
            })),
          });

          await createScrimDiscordNotifications(tx, receiverIds.map((receiverId: string) => ({
            proposalId: proposal.id,
            recipientUserId: receiverId,
            type: 'RECEIVED',
            message: proposalNotificationMessage,
            actionRequired: true,
          })));
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
          status: { in: ['PENDING', 'DELAYED'] },
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
              averageLp: true,
              opggMultisearchUrl: true,
            },
          },
        },
      });

      const proposerTeamIds = Array.from(new Set((proposals as any[])
        .map((proposal: any) => normalizeString(proposal.proposerTeamId))
        .filter((value: string) => value.length > 0)));

      const proposerTeamOpggMap = new Map<string, string | null>();
      await Promise.all(proposerTeamIds.map(async (teamId) => {
        const teamOpgg = await buildTeamOpggMultisearchUrl(prisma, teamId);
        proposerTeamOpggMap.set(teamId, teamOpgg);
      }));

      const mappedProposals = (proposals as any[]).map((proposal: any) => {
        const proposerTeamOpgg = proposerTeamOpggMap.get(proposal.proposerTeamId) || null;
        return {
          ...proposal,
          proposerTeamOpggMultisearchUrl: proposerTeamOpgg,
          post: {
            ...proposal.post,
            opggMultisearchUrl: proposerTeamOpgg,
          },
        };
      });

      return reply.send({ proposals: mappedProposals });
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

      const { proposalId } = request.params as { proposalId: string };
      const { action } = request.body as { action?: string };
      const outcome = await applyScrimProposalDecision({
        proposalId,
        action: action || '',
        actorUserId: userId,
      });

      return reply.send({
        success: true,
        status: outcome.status,
        seriesId: (outcome as any).seriesId || null,
      });
    } catch (error: any) {
      if (error instanceof ScrimRouteError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }

      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to decide scrim proposal' });
    }
  });

  // POST /api/scrims/proposals/:proposalId/discord-decision - Accept, reject, or delay from Discord button (bot only)
  fastify.post('/scrims/proposals/:proposalId/discord-decision', { preHandler: validateBotAuth }, async (request: any, reply: any) => {
    try {
      const { proposalId } = request.params as { proposalId: string };
      const { action, discordId } = request.body as { action?: string; discordId?: string };

      if (!discordId || normalizeString(discordId).length === 0) {
        return reply.status(400).send({ error: 'discordId is required' });
      }

      const account = await prisma.discordAccount.findUnique({
        where: { discordId: normalizeString(discordId) },
        select: { userId: true },
      });

      if (!account?.userId) {
        return reply.status(404).send({ error: 'Discord account is not linked to a RiftEssence user' });
      }

      const outcome = await applyScrimProposalDecision({
        proposalId,
        action: action || '',
        actorUserId: account.userId,
      });

      return reply.send({
        success: true,
        status: outcome.status,
        seriesId: (outcome as any).seriesId || null,
      });
    } catch (error: any) {
      if (error instanceof ScrimRouteError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }

      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to process Discord scrim decision' });
    }
  });

  // POST /api/scrims/series/:seriesId/match-code/regenerate - Host-only match code regeneration
  fastify.post('/scrims/series/:seriesId/match-code/regenerate', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { seriesId } = request.params as { seriesId: string };
      const normalizedSeriesId = normalizeString(seriesId);
      if (!normalizedSeriesId) {
        return reply.status(400).send({ error: 'seriesId is required' });
      }

      const current = await prisma.scrimSeries.findUnique({
        where: { id: normalizedSeriesId },
        select: {
          id: true,
          hostTeamId: true,
          winnerConfirmedAt: true,
        },
      });

      if (!current) {
        return reply.status(404).send({ error: 'Scrim series not found' });
      }

      if (!await canManageTeam(userId, current.hostTeamId)) {
        return reply.status(403).send({ error: 'Only host team staff can regenerate this match code' });
      }

      if (current.winnerConfirmedAt) {
        return reply.status(400).send({ error: 'Result already confirmed. Match code cannot be regenerated.' });
      }

      const actor = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      const now = new Date();
      const newCode = generateScrimMatchCode();

      const updated = await prisma.$transaction(async (tx: any) => {
        const series = await tx.scrimSeries.update({
          where: { id: normalizedSeriesId },
          data: {
            matchCode: newCode,
            matchCodeVersion: { increment: 1 },
            matchCodeRegeneratedAt: now,
            matchCodeRegeneratedByTeamId: current.hostTeamId,
          },
          select: {
            id: true,
            hostTeamId: true,
            guestTeamId: true,
            scheduledAt: true,
            matchCode: true,
            matchCodeVersion: true,
            hostTeam: {
              select: {
                name: true,
                tag: true,
              },
            },
            guestTeam: {
              select: {
                name: true,
                tag: true,
              },
            },
          },
        });

        const hostLabel = buildTeamLabel(series.hostTeam);
        const guestLabel = buildTeamLabel(series.guestTeam);
        await createScrimLifecycleFanout(tx, {
          seriesId: series.id,
          scheduledAt: series.scheduledAt,
          lifecycleType: 'MATCH_CODE_REGENERATED',
          triggeredByUserId: userId,
          triggeredByUsername: actor?.username || null,
          entries: [
            {
              teamId: series.hostTeamId,
              title: `Match Code Regenerated • ${hostLabel} vs ${guestLabel}`,
              message: `You regenerated the match code to ${series.matchCode} (v${series.matchCodeVersion}). Share this updated code with your opponent before start.`,
              appNotificationType: 'SCRIM_MATCH_CODE_REGENERATED',
            },
            {
              teamId: series.guestTeamId,
              title: `Match Code Updated • ${hostLabel} vs ${guestLabel}`,
              message: `Host team ${hostLabel} regenerated the match code to ${series.matchCode} (v${series.matchCodeVersion}). Use this latest code.`,
              appNotificationType: 'SCRIM_MATCH_CODE_REGENERATED',
            },
          ],
        });

        return series;
      });

      return reply.send({
        success: true,
        series: {
          id: updated.id,
          matchCode: updated.matchCode,
          matchCodeVersion: updated.matchCodeVersion,
          hostTeamId: updated.hostTeamId,
          guestTeamId: updated.guestTeamId,
          scheduledAt: updated.scheduledAt,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to regenerate match code' });
    }
  });

  // POST /api/scrims/series/:seriesId/lobby-code-used - Host confirms lobby was created with app match code
  fastify.post('/scrims/series/:seriesId/lobby-code-used', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { seriesId } = request.params as { seriesId: string };
      const normalizedSeriesId = normalizeString(seriesId);
      if (!normalizedSeriesId) {
        return reply.status(400).send({ error: 'seriesId is required' });
      }

      const series = await prisma.scrimSeries.findUnique({
        where: { id: normalizedSeriesId },
        select: {
          id: true,
          hostTeamId: true,
        },
      });

      if (!series) {
        return reply.status(404).send({ error: 'Scrim series not found' });
      }

      if (!await canManageTeam(userId, series.hostTeamId)) {
        return reply.status(403).send({ error: 'Only host team staff can confirm lobby creation' });
      }

      await prisma.scrimSeries.update({
        where: { id: series.id },
        data: {
          lobbyCodeUsedAt: new Date(),
          lobbyCodeUsedByUserId: userId,
        },
      });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to confirm lobby code usage' });
    }
  });

  // GET /api/scrims/series/pending-results - Series awaiting winner agreement from both teams
  fastify.get('/scrims/series/pending-results', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await maybeRunDueAutoResultSweep(fastify);

      const manageableTeamIds = await getManageableTeamIds(userId);
      if (manageableTeamIds.length === 0) {
        return reply.send({ series: [] });
      }

      const series = await prisma.scrimSeries.findMany({
        where: {
          winnerConfirmedAt: null,
          OR: [
            { hostTeamId: { in: manageableTeamIds } },
            { guestTeamId: { in: manageableTeamIds } },
          ],
        },
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
        take: 120,
        include: {
          hostTeam: {
            select: {
              id: true,
              name: true,
              tag: true,
            },
          },
          guestTeam: {
            select: {
              id: true,
              name: true,
              tag: true,
            },
          },
          proposal: {
            select: {
              id: true,
              post: {
                select: {
                  id: true,
                  scrimFormat: true,
                  startTimeUtc: true,
                },
              },
            },
          },
        },
      });

      const payload = (series as any[]).map((entry) => {
        const myTeamIds = [entry.hostTeamId, entry.guestTeamId].filter((teamId: string) => manageableTeamIds.includes(teamId));
        const boGames = scrimFormatToBoGames(entry?.proposal?.post?.scrimFormat);
        return {
          id: entry.id,
          matchCode: entry.matchCode,
          matchCodeVersion: entry.matchCodeVersion,
          matchCodeRegeneratedAt: entry.matchCodeRegeneratedAt,
          matchCodeRegeneratedByTeamId: entry.matchCodeRegeneratedByTeamId,
          lobbyCodeUsedAt: entry.lobbyCodeUsedAt,
          lobbyCodeUsedByUserId: entry.lobbyCodeUsedByUserId,
          scheduledAt: entry.scheduledAt,
          hostTeamId: entry.hostTeamId,
          guestTeamId: entry.guestTeamId,
          hostTeam: entry.hostTeam,
          guestTeam: entry.guestTeam,
          hostCreatesLobby: true,
          boGames,
          autoResultStatus: entry.autoResultStatus,
          autoResultReadyAt: entry.autoResultReadyAt,
          autoResultAttempts: entry.autoResultAttempts,
          autoResultFailureReason: entry.autoResultFailureReason,
          autoResultMatchId: entry.autoResultMatchId,
          resultSource: entry.resultSource,
          manualConflictCount: entry.manualConflictCount,
          escalatedAt: entry.escalatedAt,
          firstReporterTeamId: entry.firstReporterTeamId,
          firstReportedWinnerTeamId: entry.firstReportedWinnerTeamId,
          firstReportedAt: entry.firstReportedAt,
          proposal: entry.proposal,
          myTeamIds,
        };
      });

      return reply.send({ series: payload });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch pending scrim results' });
    }
  });

  // POST /api/scrims/series/:seriesId/result - Report winner and require opponent agreement
  fastify.post('/scrims/series/:seriesId/result', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { seriesId } = request.params as { seriesId: string };
      const {
        reportingTeamId,
        winnerTeamId,
      } = request.body as {
        reportingTeamId?: string;
        winnerTeamId?: string;
      };

      const normalizedSeriesId = normalizeString(seriesId);
      const normalizedReportingTeamId = normalizeString(reportingTeamId);
      const normalizedWinnerTeamId = normalizeString(winnerTeamId);

      if (!normalizedSeriesId || !normalizedReportingTeamId || !normalizedWinnerTeamId) {
        return reply.status(400).send({ error: 'seriesId, reportingTeamId, and winnerTeamId are required' });
      }

      if (!await canManageTeam(userId, normalizedReportingTeamId)) {
        return reply.status(403).send({ error: 'You are not allowed to report results for this team' });
      }

      const result = await prisma.$transaction(async (tx: any) => {
        const current = await tx.scrimSeries.findUnique({
          where: { id: normalizedSeriesId },
          select: {
            id: true,
            hostTeamId: true,
            guestTeamId: true,
            winnerTeamId: true,
            winnerConfirmedAt: true,
            resultSource: true,
            firstReporterTeamId: true,
            firstReportedWinnerTeamId: true,
            scheduledAt: true,
            manualConflictCount: true,
            escalatedAt: true,
            lobbyCodeUsedAt: true,
          },
        });

        if (!current) {
          return { errorCode: 404, error: 'Scrim series not found' };
        }

        if (![current.hostTeamId, current.guestTeamId].includes(normalizedReportingTeamId)) {
          return { errorCode: 403, error: 'Reporting team is not part of this scrim series' };
        }

        if (![current.hostTeamId, current.guestTeamId].includes(normalizedWinnerTeamId)) {
          return { errorCode: 400, error: 'winnerTeamId must be one of the teams in this scrim series' };
        }

        if (current.winnerConfirmedAt) {
          return {
            status: 'CONFIRMED',
            winnerTeamId: current.winnerTeamId,
            alreadyConfirmed: true,
            resultSource: current.resultSource || 'MANUAL_AGREEMENT',
          };
        }

        const now = new Date();

        if (!current.firstReporterTeamId) {
          const updated = await tx.scrimSeries.update({
            where: { id: current.id },
            data: {
              firstReporterTeamId: normalizedReportingTeamId,
              firstReportedWinnerTeamId: normalizedWinnerTeamId,
              firstReportedAt: now,
              manualConflictCount: 0,
            },
            select: {
              id: true,
              firstReporterTeamId: true,
              firstReportedWinnerTeamId: true,
            },
          });

          return {
            status: 'PENDING_CONFIRMATION',
            firstReporterTeamId: updated.firstReporterTeamId,
            firstReportedWinnerTeamId: updated.firstReportedWinnerTeamId,
            opponentTeamId: normalizedReportingTeamId === current.hostTeamId ? current.guestTeamId : current.hostTeamId,
          };
        }

        if (current.firstReporterTeamId === normalizedReportingTeamId) {
          const updated = await tx.scrimSeries.update({
            where: { id: current.id },
            data: {
              firstReportedWinnerTeamId: normalizedWinnerTeamId,
              firstReportedAt: now,
              manualConflictCount: 0,
            },
            select: {
              id: true,
              firstReporterTeamId: true,
              firstReportedWinnerTeamId: true,
            },
          });

          return {
            status: 'PENDING_CONFIRMATION',
            firstReporterTeamId: updated.firstReporterTeamId,
            firstReportedWinnerTeamId: updated.firstReportedWinnerTeamId,
            opponentTeamId: normalizedReportingTeamId === current.hostTeamId ? current.guestTeamId : current.hostTeamId,
          };
        }

        if (current.firstReportedWinnerTeamId === normalizedWinnerTeamId) {
          const confirmed = await tx.scrimSeries.update({
            where: { id: current.id },
            data: {
              winnerTeamId: normalizedWinnerTeamId,
              winnerConfirmedAt: now,
              resultSource: 'MANUAL_AGREEMENT',
              autoResultStatus: 'CONFIRMED',
              autoResultFailureReason: null,
            },
            select: {
              id: true,
              winnerTeamId: true,
              winnerConfirmedAt: true,
            },
          });

          return {
            status: 'CONFIRMED',
            winnerTeamId: confirmed.winnerTeamId,
            winnerConfirmedAt: confirmed.winnerConfirmedAt,
            alreadyConfirmed: false,
            resultSource: 'MANUAL_AGREEMENT',
          };
        }

        const conflictState = await tx.scrimSeries.update({
          where: { id: current.id },
          data: {
            manualConflictCount: { increment: 1 },
          },
          select: {
            manualConflictCount: true,
            escalatedAt: true,
            lobbyCodeUsedAt: true,
          },
        });

        let escalated = false;
        let escalatedAt = conflictState.escalatedAt;
        if (!conflictState.escalatedAt && conflictState.manualConflictCount >= SCRIM_MANUAL_CONFLICT_ESCALATION_THRESHOLD) {
          const escalatedSeries = await tx.scrimSeries.update({
            where: { id: current.id },
            data: { escalatedAt: now },
            select: { escalatedAt: true },
          });
          escalated = true;
          escalatedAt = escalatedSeries.escalatedAt;
        }

        return {
          status: 'CONFLICT',
          expectedWinnerTeamId: current.firstReportedWinnerTeamId,
          manualConflictCount: conflictState.manualConflictCount,
          escalated,
          escalatedAt,
          lobbyCodeUsedAt: conflictState.lobbyCodeUsedAt,
        };
      });

      if ((result as any).errorCode) {
        return reply.status((result as any).errorCode).send({ error: (result as any).error });
      }

      const seriesMeta = await prisma.scrimSeries.findUnique({
        where: { id: normalizedSeriesId },
        select: {
          id: true,
          hostTeamId: true,
          guestTeamId: true,
          scheduledAt: true,
          matchCode: true,
          matchCodeVersion: true,
          lobbyCodeUsedAt: true,
          hostTeam: {
            select: {
              name: true,
              tag: true,
            },
          },
          guestTeam: {
            select: {
              name: true,
              tag: true,
            },
          },
        },
      });

      if ((result as any).status === 'PENDING_CONFIRMATION' && seriesMeta && (result as any).opponentTeamId) {
        const hostLabel = buildTeamLabel(seriesMeta.hostTeam);
        const guestLabel = buildTeamLabel(seriesMeta.guestTeam);
        const winnerLabel = (result as any).firstReportedWinnerTeamId === seriesMeta.guestTeamId ? guestLabel : hostLabel;
        const reporterLabel = (result as any).firstReporterTeamId === seriesMeta.guestTeamId ? guestLabel : hostLabel;

        await createScrimLifecycleFanout(prisma, {
          seriesId: seriesMeta.id,
          scheduledAt: seriesMeta.scheduledAt,
          lifecycleType: 'AUTO_RESULT_MANUAL_REQUIRED',
          triggeredByUserId: userId,
          entries: [
            {
              teamId: (result as any).opponentTeamId,
              title: `Winner Confirmation Needed • ${hostLabel} vs ${guestLabel}`,
              message: `${reporterLabel} reported ${winnerLabel} as winner. Confirm or correct the result in Scrim Finder.`,
              appNotificationType: 'SCRIM_RESULT_MANUAL_REQUIRED',
            },
          ],
        });
      }

      if ((result as any).status === 'CONFIRMED' && !(result as any).alreadyConfirmed && seriesMeta) {
        const hostLabel = buildTeamLabel(seriesMeta.hostTeam);
        const guestLabel = buildTeamLabel(seriesMeta.guestTeam);
        const winnerLabel = (result as any).winnerTeamId === seriesMeta.guestTeamId ? guestLabel : hostLabel;
        const sourceLabel = (result as any).resultSource === 'AUTO_RIOT' ? 'Auto' : 'Manual';

        await createScrimLifecycleFanout(prisma, {
          seriesId: seriesMeta.id,
          scheduledAt: seriesMeta.scheduledAt,
          lifecycleType: 'MANUAL_RESULT_CONFIRMED',
          triggeredByUserId: userId,
          entries: [
            {
              teamId: seriesMeta.hostTeamId,
              title: `${sourceLabel} Result Confirmed • ${hostLabel} vs ${guestLabel}`,
              message: `${sourceLabel} winner agreement confirmed. Winner: ${winnerLabel}.`,
              appNotificationType: 'SCRIM_RESULT_MANUAL_CONFIRMED',
            },
            {
              teamId: seriesMeta.guestTeamId,
              title: `${sourceLabel} Result Confirmed • ${hostLabel} vs ${guestLabel}`,
              message: `${sourceLabel} winner agreement confirmed. Winner: ${winnerLabel}.`,
              appNotificationType: 'SCRIM_RESULT_MANUAL_CONFIRMED',
            },
          ],
        });
      }

      if ((result as any).status === 'CONFLICT') {
        const shouldEscalate = ((result as any).manualConflictCount || 0) >= SCRIM_MANUAL_CONFLICT_ESCALATION_THRESHOLD;
        const supportDiscordUrl = getSupportDiscordUrl();

        if ((result as any).escalated && seriesMeta) {
          const hostLabel = buildTeamLabel(seriesMeta.hostTeam);
          const guestLabel = buildTeamLabel(seriesMeta.guestTeam);
          const trustHint = seriesMeta.lobbyCodeUsedAt
            ? 'The host confirmed that this lobby used the RiftEssence app code. Mention that code to speed up support verification.'
            : 'If the lobby used the app-provided code, mention it in your support report.';

          await createScrimLifecycleFanout(prisma, {
            seriesId: seriesMeta.id,
            scheduledAt: seriesMeta.scheduledAt,
            lifecycleType: 'MANUAL_CONFLICT_ESCALATED',
            triggeredByUserId: userId,
            entries: [
              {
                teamId: seriesMeta.hostTeamId,
                title: `Support Escalation Recommended • ${hostLabel} vs ${guestLabel}`,
                message: `Both teams still disagree on the winner. Join support Discord (${supportDiscordUrl}) and share scoreboard screenshots from both sides. ${trustHint}`,
                appNotificationType: 'SCRIM_RESULT_CONFLICT_ESCALATION',
              },
              {
                teamId: seriesMeta.guestTeamId,
                title: `Support Escalation Recommended • ${hostLabel} vs ${guestLabel}`,
                message: `Both teams still disagree on the winner. Join support Discord (${supportDiscordUrl}) and share scoreboard screenshots from both sides. ${trustHint}`,
                appNotificationType: 'SCRIM_RESULT_CONFLICT_ESCALATION',
              },
            ],
          });
        }

        return reply.status(409).send({
          error: shouldEscalate
            ? 'Teams still disagree on winner. Please escalate to support with screenshot evidence.'
            : 'Teams did not agree on winner yet. Ask the opponent to align on the reported winner.',
          expectedWinnerTeamId: (result as any).expectedWinnerTeamId,
          manualConflictCount: (result as any).manualConflictCount || 0,
          support: shouldEscalate
            ? {
                required: true,
                url: supportDiscordUrl,
                guidance: 'Share full post-game scoreboard screenshots from both teams and mention the scrim match code.',
                trustHint: Boolean((result as any).lobbyCodeUsedAt),
              }
            : undefined,
        });
      }

      return reply.send({
        success: true,
        result,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to report scrim result' });
    }
  });

  // GET /api/scrims/reviews/candidates - Team pairs eligible for first-time review
  fastify.get('/scrims/reviews/candidates', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const manageableTeamIds = await getManageableTeamIds(userId);
      if (manageableTeamIds.length === 0) {
        return reply.send({ candidates: [] });
      }

      const series = await prisma.scrimSeries.findMany({
        where: {
          winnerConfirmedAt: { not: null },
          OR: [
            { hostTeamId: { in: manageableTeamIds } },
            { guestTeamId: { in: manageableTeamIds } },
          ],
        },
        orderBy: { winnerConfirmedAt: 'desc' },
        take: 200,
        include: {
          hostTeam: {
            select: {
              id: true,
              name: true,
              tag: true,
            },
          },
          guestTeam: {
            select: {
              id: true,
              name: true,
              tag: true,
            },
          },
        },
      });

      const involvedTeamIds = Array.from(new Set((series as any[]).flatMap((entry) => [entry.hostTeamId, entry.guestTeamId])));
      const existingReviews = involvedTeamIds.length > 0
        ? await prisma.scrimTeamReview.findMany({
            where: {
              reviewerTeamId: { in: involvedTeamIds },
              targetTeamId: { in: involvedTeamIds },
            },
            select: {
              reviewerTeamId: true,
              targetTeamId: true,
            },
          })
        : [];

      const reviewedPairSet = new Set((existingReviews as Array<{ reviewerTeamId: string; targetTeamId: string }>).map((entry) => `${entry.reviewerTeamId}::${entry.targetTeamId}`));
      const candidates: Array<Record<string, any>> = [];

      (series as any[]).forEach((entry) => {
        const pairs: Array<{ reviewerTeamId: string; targetTeamId: string; reviewerTeam: any; targetTeam: any }> = [];

        if (manageableTeamIds.includes(entry.hostTeamId)) {
          pairs.push({
            reviewerTeamId: entry.hostTeamId,
            targetTeamId: entry.guestTeamId,
            reviewerTeam: entry.hostTeam,
            targetTeam: entry.guestTeam,
          });
        }

        if (manageableTeamIds.includes(entry.guestTeamId)) {
          pairs.push({
            reviewerTeamId: entry.guestTeamId,
            targetTeamId: entry.hostTeamId,
            reviewerTeam: entry.guestTeam,
            targetTeam: entry.hostTeam,
          });
        }

        pairs.forEach((pair) => {
          const pairKey = `${pair.reviewerTeamId}::${pair.targetTeamId}`;
          if (reviewedPairSet.has(pairKey)) {
            return;
          }

          reviewedPairSet.add(pairKey);
          candidates.push({
            seriesId: entry.id,
            matchCode: entry.matchCode,
            winnerTeamId: entry.winnerTeamId,
            winnerConfirmedAt: entry.winnerConfirmedAt,
            scheduledAt: entry.scheduledAt,
            reviewerTeamId: pair.reviewerTeamId,
            targetTeamId: pair.targetTeamId,
            reviewerTeam: pair.reviewerTeam,
            targetTeam: pair.targetTeam,
          });
        });
      });

      return reply.send({ candidates });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch scrim review candidates' });
    }
  });

  // POST /api/scrims/reviews - Submit team-vs-team review once per directed pair
  fastify.post('/scrims/reviews', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const {
        seriesId,
        reviewerTeamId,
        targetTeamId,
        politeness,
        punctuality,
        gameplay,
        message,
      } = request.body as {
        seriesId?: string;
        reviewerTeamId?: string;
        targetTeamId?: string;
        politeness?: number;
        punctuality?: number;
        gameplay?: number;
        message?: string;
      };

      const normalizedSeriesId = normalizeString(seriesId);
      const normalizedReviewerTeamId = normalizeString(reviewerTeamId);
      const normalizedTargetTeamId = normalizeString(targetTeamId);

      if (!normalizedSeriesId || !normalizedReviewerTeamId || !normalizedTargetTeamId) {
        return reply.status(400).send({ error: 'seriesId, reviewerTeamId, and targetTeamId are required' });
      }

      if (normalizedReviewerTeamId === normalizedTargetTeamId) {
        return reply.status(400).send({ error: 'reviewerTeamId and targetTeamId must be different teams' });
      }

      const scoreValues = [politeness, punctuality, gameplay].map((value) => Number(value));
      const hasInvalidScore = scoreValues.some((value) => !Number.isFinite(value) || value < 1 || value > 5);
      if (hasInvalidScore) {
        return reply.status(400).send({ error: 'politeness, punctuality, and gameplay must be numbers from 1 to 5' });
      }

      if (!await canManageTeam(userId, normalizedReviewerTeamId)) {
        return reply.status(403).send({ error: 'You are not allowed to submit reviews for this team' });
      }

      const series = await prisma.scrimSeries.findUnique({
        where: { id: normalizedSeriesId },
        select: {
          id: true,
          hostTeamId: true,
          guestTeamId: true,
          winnerConfirmedAt: true,
        },
      });

      if (!series) {
        return reply.status(404).send({ error: 'Scrim series not found' });
      }

      if (!series.winnerConfirmedAt) {
        return reply.status(400).send({ error: 'Result agreement must be completed before leaving a review' });
      }

      const validDirectedPair =
        (normalizedReviewerTeamId === series.hostTeamId && normalizedTargetTeamId === series.guestTeamId)
        || (normalizedReviewerTeamId === series.guestTeamId && normalizedTargetTeamId === series.hostTeamId);

      if (!validDirectedPair) {
        return reply.status(400).send({ error: 'reviewerTeamId/targetTeamId must match the teams in this scrim series' });
      }

      const averageRating = Number(((scoreValues[0] + scoreValues[1] + scoreValues[2]) / 3).toFixed(2));

      const created = await prisma.scrimTeamReview.create({
        data: {
          seriesId: series.id,
          reviewerTeamId: normalizedReviewerTeamId,
          targetTeamId: normalizedTargetTeamId,
          politeness: scoreValues[0],
          punctuality: scoreValues[1],
          gameplay: scoreValues[2],
          averageRating,
          message: normalizeOptionalString(message),
        },
      });

      return reply.status(201).send({
        success: true,
        review: created,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return reply.status(409).send({ error: 'This team pair already has a submitted review.' });
      }

      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to submit scrim review' });
    }
  });
}
