import { randomBytes } from 'crypto';
import prisma from '../prisma';
import * as riotClient from '../riotClient';
import { getUserIdFromRequest } from '../middleware/auth';
import {
  validateRequest,
  CreateRankedOneVOneChallengeSchema,
  RankedOneVOneListQuerySchema,
  CreateRankedOneVOneLobbySchema,
  SyncRankedOneVOneResultSchema,
  RankedOneVOneLeaderboardQuerySchema,
  RankedOneVOneQueueJoinSchema,
  RankedOneVOneStyleChoiceSchema,
  RankedOneVOneGiveUpSchema,
  RankedOneVOneIssueReportSchema,
} from '../validation';

const ACTIVE_CHALLENGE_STATUSES: RankedOneVOneStatus[] = ['PENDING', 'ACCEPTED', 'LOBBY_READY'];
const RESULT_SYNC_ALLOWED_STATUSES: RankedOneVOneStatus[] = ['ACCEPTED', 'LOBBY_READY'];
const STYLE_OPTIONS: RankedOneVOneStyle[] = ['ARAM_STANDARD', 'ARAM_FIRST_BLOOD', 'MID_STANDARD', 'TOP_STANDARD'];
const ACCEPT_TIMEOUT_MS = 3 * 60 * 1000;
const STYLE_TIMEOUT_MS = 60 * 1000;

const ACCEPT_TIMEOUT_WIN_DELTA = 12;
const ACCEPT_TIMEOUT_LOSS_DELTA = -18;
const ACCEPT_TIMEOUT_BOTH_LOSS_DELTA = -10;
const SURRENDER_WIN_DELTA = 14;
const SURRENDER_LOSS_DELTA = -20;

const CUSTOM_GAME_AUTOMATION_NOTE = 'Riot API does not let third-party apps auto-create custom lobbies. Use the generated lobby details in the LoL client.';

type RankedOneVOneStatus = 'PENDING' | 'ACCEPTED' | 'LOBBY_READY' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
type RankedOneVOneStyle = 'ARAM_STANDARD' | 'ARAM_FIRST_BLOOD' | 'MID_STANDARD' | 'TOP_STANDARD';
type RankedOneVOneParticipantResult = 'WIN' | 'LOSS' | 'DRAW';

type VerifiedAccount = {
  puuid: string;
  summonerName: string;
  gameName: string | null;
  tagLine: string | null;
  region: string;
};

type SyncChallengeResult =
  | { ok: true; challenge: any; alreadyCompleted?: boolean }
  | { ok: false; status: number; error: string; details?: any };

const STYLE_METADATA: Record<RankedOneVOneStyle, {
  title: string;
  summary: string;
  map: 'HOWLING_ABYSS' | 'SUMMONERS_RIFT';
  laneFocus: 'ARAM' | 'MID' | 'TOP';
  winCondition: string;
  sideRule: string;
}> = {
  ARAM_STANDARD: {
    title: 'ARAM - Standard Duel',
    summary: 'No bans. First to 100 CS, first blood, or first tower wins.',
    map: 'HOWLING_ABYSS',
    laneFocus: 'ARAM',
    winCondition: 'First to 100 CS OR first blood OR first tower',
    sideRule: 'No side choice advantage',
  },
  ARAM_FIRST_BLOOD: {
    title: 'ARAM - First Blood',
    summary: 'No bans. The first kill immediately wins the duel.',
    map: 'HOWLING_ABYSS',
    laneFocus: 'ARAM',
    winCondition: 'First blood wins',
    sideRule: 'No side choice advantage',
  },
  MID_STANDARD: {
    title: 'Summoner\'s Rift Mid - Standard Duel',
    summary: 'No side selection. First to 100 CS, first blood, or first tower wins.',
    map: 'SUMMONERS_RIFT',
    laneFocus: 'MID',
    winCondition: 'First to 100 CS OR first blood OR first tower',
    sideRule: 'No side choice advantage',
  },
  TOP_STANDARD: {
    title: 'Summoner\'s Rift Top - Standard Duel',
    summary: 'No side selection. First to 100 CS, first blood, or first tower wins.',
    map: 'SUMMONERS_RIFT',
    laneFocus: 'TOP',
    winCondition: 'First to 100 CS OR first blood OR first tower',
    sideRule: 'No side choice advantage',
  },
};

function isSchemaOutOfDateError(error: any): boolean {
  const code = error?.code;
  return code === 'P2021' || code === 'P2022';
}

function sanitizeLobbyPart(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  return cleaned || 'Player';
}

function generateLobbyName(challengerUsername: string, opponentUsername: string): string {
  const c = sanitizeLobbyPart(challengerUsername);
  const o = sanitizeLobbyPart(opponentUsername);
  const suffix = Date.now().toString(36).toUpperCase();
  return `RE-1V1-${c}-VS-${o}-${suffix}`.slice(0, 64);
}

function generateLobbyPassword(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

function toDateFromUnixMillis(value: any): Date | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Date(value);
}

function calculateEloDelta(playerRating: number, opponentRating: number, score: number, kFactor: number = 32): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  return Math.round(kFactor * (score - expected));
}

function isLikelyCustomGame(matchData: any): boolean {
  const queueId = matchData?.info?.queueId;
  const gameType = String(matchData?.info?.gameType || '').toUpperCase();
  return queueId === 0 || gameType === 'CUSTOM_GAME';
}

function pickRandomStyle(options: RankedOneVOneStyle[]): RankedOneVOneStyle {
  const safeOptions = options.length ? options : STYLE_OPTIONS;
  return safeOptions[Math.floor(Math.random() * safeOptions.length)];
}

function resolveStyleChoice(
  challengerChoice: RankedOneVOneStyle | null | undefined,
  opponentChoice: RankedOneVOneStyle | null | undefined,
): RankedOneVOneStyle {
  if (challengerChoice && opponentChoice && challengerChoice === opponentChoice) {
    return challengerChoice;
  }

  if (challengerChoice && opponentChoice && challengerChoice !== opponentChoice) {
    return pickRandomStyle([challengerChoice, opponentChoice]);
  }

  if (challengerChoice) {
    return challengerChoice;
  }

  if (opponentChoice) {
    return opponentChoice;
  }

  return pickRandomStyle(STYLE_OPTIONS);
}

function getStyleMetadata(style: RankedOneVOneStyle | null | undefined) {
  if (!style) {
    return null;
  }
  return STYLE_METADATA[style] || null;
}

function buildLadderTierSnapshot(rating: number) {
  const value = Number.isFinite(rating) ? rating : 1000;

  const tiers: Array<{ tier: string; min: number; max: number | null }> = [
    { tier: 'IRON', min: 0, max: 899 },
    { tier: 'BRONZE', min: 900, max: 999 },
    { tier: 'SILVER', min: 1000, max: 1099 },
    { tier: 'GOLD', min: 1100, max: 1199 },
    { tier: 'PLATINUM', min: 1200, max: 1299 },
    { tier: 'EMERALD', min: 1300, max: 1399 },
    { tier: 'DIAMOND', min: 1400, max: 1499 },
    { tier: 'MASTER', min: 1500, max: 1599 },
    { tier: 'GRANDMASTER', min: 1600, max: 1699 },
    { tier: 'CHALLENGER', min: 1700, max: null },
  ];

  const tier = tiers.find((entry) => entry.max === null ? value >= entry.min : (value >= entry.min && value <= entry.max)) || tiers[2];
  const rawLp = value - tier.min;
  const lp = tier.max === null ? Math.max(0, rawLp) : Math.max(0, Math.min(99, rawLp));

  return {
    tier: tier.tier,
    lp,
  };
}

function buildCustomGameSetup(challenge: any, usernameMap: Map<string, string>) {
  const creatorUserId = challenge.creatorUserId || challenge.hostUserId || challenge.challengerId;
  const joinerUserId = challenge.joinerUserId || (creatorUserId === challenge.challengerId ? challenge.opponentId : challenge.challengerId);
  const styleDetails = getStyleMetadata(challenge.resolvedStyle || null);

  return {
    canAutoCreate: false,
    note: CUSTOM_GAME_AUTOMATION_NOTE,
    style: challenge.resolvedStyle || null,
    styleDetails,
    creatorUserId,
    creatorUsername: usernameMap.get(creatorUserId) || null,
    joinerUserId,
    joinerUsername: usernameMap.get(joinerUserId) || null,
    lobbyName: challenge.lobbyName,
    lobbyPassword: challenge.lobbyPassword,
    recommendedSettings: {
      map: styleDetails?.map || 'SUMMONERS_RIFT',
      mode: 'CLASSIC',
      teamSize: '1v1',
      laneFocus: styleDetails?.laneFocus || 'MID',
      winCondition: styleDetails?.winCondition || 'First objective condition met',
      sideRule: styleDetails?.sideRule || 'No side preference',
      spectators: 'ALL',
    },
  };
}

function formatChallengeForResponse(challenge: any, usernameMap: Map<string, string>, currentUserId: string) {
  const myRole = challenge.challengerId === currentUserId ? 'CHALLENGER' : 'OPPONENT';
  const myAccepted = challenge.challengerId === currentUserId
    ? Boolean(challenge.challengerAcceptedAt)
    : Boolean(challenge.opponentAcceptedAt);
  const opponentAccepted = challenge.challengerId === currentUserId
    ? Boolean(challenge.opponentAcceptedAt)
    : Boolean(challenge.challengerAcceptedAt);

  return {
    ...challenge,
    myRole,
    myAccepted,
    opponentAccepted,
    challengerUsername: usernameMap.get(challenge.challengerId) || null,
    opponentUsername: usernameMap.get(challenge.opponentId) || null,
    winnerUsername: challenge.winnerId ? (usernameMap.get(challenge.winnerId) || null) : null,
    loserUsername: challenge.loserId ? (usernameMap.get(challenge.loserId) || null) : null,
    creatorUsername: challenge.creatorUserId ? (usernameMap.get(challenge.creatorUserId) || null) : null,
    joinerUsername: challenge.joinerUserId ? (usernameMap.get(challenge.joinerUserId) || null) : null,
    forfeitedByUsername: challenge.forfeitedById ? (usernameMap.get(challenge.forfeitedById) || null) : null,
    issueReports: Array.isArray(challenge.issueReports) ? challenge.issueReports : [],
    customGameSetup: buildCustomGameSetup(challenge, usernameMap),
  };
}

async function getVerifiedAccountForRegion(db: any, userId: string, region: string): Promise<VerifiedAccount | null> {
  const account = await db.riotAccount.findFirst({
    where: {
      userId,
      verified: true,
      region,
    },
    orderBy: [
      { isMain: 'desc' },
      { createdAt: 'asc' },
    ],
    select: {
      puuid: true,
      summonerName: true,
      gameName: true,
      tagLine: true,
      region: true,
    },
  });

  return account || null;
}

async function getVerifiedRegions(db: any, userId: string): Promise<string[]> {
  const rows = await db.riotAccount.findMany({
    where: { userId, verified: true },
    select: { region: true },
  });

  return Array.from(new Set(rows.map((row: any) => row.region).filter(Boolean)));
}

async function getUsernameMap(db: any, ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0)));
  if (!uniqueIds.length) {
    return new Map();
  }

  const users = await db.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, username: true },
  });

  return new Map(users.map((u: any) => [u.id, u.username]));
}

function extractParticipant(matchData: any, puuid: string): any | null {
  const participants = Array.isArray(matchData?.info?.participants) ? matchData.info.participants : [];
  return participants.find((p: any) => p?.puuid === puuid) || null;
}

async function findSharedCustomMatch(
  challengerPuuid: string,
  opponentPuuid: string,
  region: string,
  acceptedAt: Date | null,
): Promise<{ matchId: string; matchData: any } | null> {
  const [challengerMatches, opponentMatches] = await Promise.all([
    riotClient.getRecentMatchIds(challengerPuuid, region, 30),
    riotClient.getRecentMatchIds(opponentPuuid, region, 30),
  ]);

  const opponentSet = new Set(opponentMatches);
  const sharedMatchIds = challengerMatches.filter((matchId) => opponentSet.has(matchId));
  if (!sharedMatchIds.length) {
    return null;
  }

  const lowerBound = acceptedAt ? acceptedAt.getTime() - 30 * 60 * 1000 : null;

  for (const matchId of sharedMatchIds) {
    try {
      const matchData = await riotClient.getMatchDetails(matchId, region);
      const gameCreation = Number(matchData?.info?.gameCreation || 0);

      if (lowerBound && gameCreation > 0 && gameCreation < lowerBound) {
        continue;
      }

      if (!isLikelyCustomGame(matchData)) {
        continue;
      }

      const challengerParticipant = extractParticipant(matchData, challengerPuuid);
      const opponentParticipant = extractParticipant(matchData, opponentPuuid);
      if (!challengerParticipant || !opponentParticipant) {
        continue;
      }

      return { matchId, matchData };
    } catch {
      continue;
    }
  }

  return null;
}

function applyResultCounter(updatePayload: any, result: RankedOneVOneParticipantResult) {
  if (result === 'WIN') {
    updatePayload.oneVOneWins = { increment: 1 };
    return;
  }

  if (result === 'LOSS') {
    updatePayload.oneVOneLosses = { increment: 1 };
    return;
  }

  updatePayload.oneVOneDraws = { increment: 1 };
}

async function resolveManualOutcome(
  db: any,
  challenge: any,
  options: {
    status: RankedOneVOneStatus;
    winnerId: string | null;
    loserId: string | null;
    challengerResult: RankedOneVOneParticipantResult;
    opponentResult: RankedOneVOneParticipantResult;
    challengerDelta: number;
    opponentDelta: number;
    forfeitedById?: string | null;
    forfeitReason?: string | null;
  },
): Promise<any> {
  return db.$transaction(async (tx: any) => {
    const [challengerStats, opponentStats] = await Promise.all([
      tx.user.findUnique({
        where: { id: challenge.challengerId },
        select: {
          oneVOneRating: true,
        },
      }),
      tx.user.findUnique({
        where: { id: challenge.opponentId },
        select: {
          oneVOneRating: true,
        },
      }),
    ]);

    const challengerRatingBefore = Number(challengerStats?.oneVOneRating ?? 1000);
    const opponentRatingBefore = Number(opponentStats?.oneVOneRating ?? 1000);

    const challengerRatingAfter = Math.max(0, challengerRatingBefore + options.challengerDelta);
    const opponentRatingAfter = Math.max(0, opponentRatingBefore + options.opponentDelta);

    const challengerRatingDelta = challengerRatingAfter - challengerRatingBefore;
    const opponentRatingDelta = opponentRatingAfter - opponentRatingBefore;

    const challengerUpdate: any = {
      oneVOneRating: challengerRatingAfter,
    };
    const opponentUpdate: any = {
      oneVOneRating: opponentRatingAfter,
    };

    applyResultCounter(challengerUpdate, options.challengerResult);
    applyResultCounter(opponentUpdate, options.opponentResult);

    await Promise.all([
      tx.user.update({ where: { id: challenge.challengerId }, data: challengerUpdate }),
      tx.user.update({ where: { id: challenge.opponentId }, data: opponentUpdate }),
    ]);

    await tx.matchHistory.create({
      data: {
        userId: challenge.challengerId,
        opponentId: challenge.opponentId,
        result: options.challengerResult,
        matchDate: new Date(),
        sharedMatchesCount: 1,
      },
    });

    return tx.rankedOneVOne.update({
      where: { id: challenge.id },
      data: {
        status: options.status,
        completedAt: new Date(),
        resultSource: 'MANUAL',
        winnerId: options.winnerId,
        loserId: options.loserId,
        challengerRatingBefore,
        opponentRatingBefore,
        challengerRatingDelta,
        opponentRatingDelta,
        forfeitedById: options.forfeitedById || null,
        forfeitReason: options.forfeitReason || null,
      },
    });
  });
}

async function maybeExpirePendingChallenge(db: any, challenge: any): Promise<any> {
  if (challenge.status !== 'PENDING') {
    return challenge;
  }

  const nowMs = Date.now();
  const deadlineMs = challenge.acceptDeadlineAt ? new Date(challenge.acceptDeadlineAt).getTime() : null;

  const challengerAccepted = Boolean(challenge.challengerAcceptedAt);
  const opponentAccepted = Boolean(challenge.opponentAcceptedAt);

  if (challengerAccepted && opponentAccepted) {
    return db.rankedOneVOne.update({
      where: { id: challenge.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: challenge.acceptedAt || new Date(),
        styleSelectionDeadlineAt: challenge.styleSelectionDeadlineAt || new Date(Date.now() + STYLE_TIMEOUT_MS),
      },
    });
  }

  if (!deadlineMs || deadlineMs > nowMs) {
    return challenge;
  }

  if (challengerAccepted && !opponentAccepted) {
    return resolveManualOutcome(db, challenge, {
      status: 'EXPIRED',
      winnerId: challenge.challengerId,
      loserId: challenge.opponentId,
      challengerResult: 'WIN',
      opponentResult: 'LOSS',
      challengerDelta: ACCEPT_TIMEOUT_WIN_DELTA,
      opponentDelta: ACCEPT_TIMEOUT_LOSS_DELTA,
      forfeitedById: challenge.opponentId,
      forfeitReason: 'ACCEPT_TIMEOUT',
    });
  }

  if (!challengerAccepted && opponentAccepted) {
    return resolveManualOutcome(db, challenge, {
      status: 'EXPIRED',
      winnerId: challenge.opponentId,
      loserId: challenge.challengerId,
      challengerResult: 'LOSS',
      opponentResult: 'WIN',
      challengerDelta: ACCEPT_TIMEOUT_LOSS_DELTA,
      opponentDelta: ACCEPT_TIMEOUT_WIN_DELTA,
      forfeitedById: challenge.challengerId,
      forfeitReason: 'ACCEPT_TIMEOUT',
    });
  }

  return resolveManualOutcome(db, challenge, {
    status: 'EXPIRED',
    winnerId: null,
    loserId: null,
    challengerResult: 'LOSS',
    opponentResult: 'LOSS',
    challengerDelta: ACCEPT_TIMEOUT_BOTH_LOSS_DELTA,
    opponentDelta: ACCEPT_TIMEOUT_BOTH_LOSS_DELTA,
    forfeitedById: null,
    forfeitReason: 'ACCEPT_TIMEOUT_BOTH',
  });
}

async function maybeResolveStyleSelection(db: any, challenge: any): Promise<any> {
  if (challenge.status !== 'ACCEPTED') {
    return challenge;
  }

  if (challenge.status === 'LOBBY_READY' && challenge.resolvedStyle) {
    return challenge;
  }

  const deadlineMs = challenge.styleSelectionDeadlineAt ? new Date(challenge.styleSelectionDeadlineAt).getTime() : null;
  const deadlinePassed = Boolean(deadlineMs && deadlineMs <= Date.now());

  const hasChallengerChoice = Boolean(challenge.challengerStyleChoice);
  const hasOpponentChoice = Boolean(challenge.opponentStyleChoice);

  if (!deadlinePassed && !(hasChallengerChoice && hasOpponentChoice)) {
    return challenge;
  }

  const resolvedStyle = resolveStyleChoice(challenge.challengerStyleChoice, challenge.opponentStyleChoice);

  const creatorUserId = challenge.creatorUserId || (Math.random() < 0.5 ? challenge.challengerId : challenge.opponentId);
  const joinerUserId = creatorUserId === challenge.challengerId ? challenge.opponentId : challenge.challengerId;

  let lobbyName = challenge.lobbyName;
  if (!lobbyName) {
    const usernameMap = await getUsernameMap(db, [challenge.challengerId, challenge.opponentId]);
    lobbyName = generateLobbyName(
      usernameMap.get(challenge.challengerId) || 'Challenger',
      usernameMap.get(challenge.opponentId) || 'Opponent',
    );
  }

  return db.rankedOneVOne.update({
    where: { id: challenge.id },
    data: {
      status: 'LOBBY_READY',
      resolvedStyle,
      creatorUserId,
      joinerUserId,
      hostUserId: creatorUserId,
      lobbyName,
      lobbyPassword: challenge.lobbyPassword || generateLobbyPassword(),
      lobbyCreatedAt: challenge.lobbyCreatedAt || new Date(),
    },
  });
}

async function maybeAdvanceChallengeState(db: any, challenge: any): Promise<any> {
  let resolved = challenge;

  if (resolved.status === 'PENDING') {
    resolved = await maybeExpirePendingChallenge(db, resolved);
  }

  if (resolved.status === 'ACCEPTED') {
    resolved = await maybeResolveStyleSelection(db, resolved);
  }

  return resolved;
}

async function getActiveChallengeForUser(db: any, userId: string): Promise<any | null> {
  const challenge = await db.rankedOneVOne.findFirst({
    where: {
      status: { in: ACTIVE_CHALLENGE_STATUSES },
      OR: [
        { challengerId: userId },
        { opponentId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    return null;
  }

  return maybeAdvanceChallengeState(db, challenge);
}

async function notifyMatchFound(db: any, challenge: any, usernameMap: Map<string, string>) {
  const challengerUsername = usernameMap.get(challenge.challengerId) || 'Player';
  const opponentUsername = usernameMap.get(challenge.opponentId) || 'Player';
  const message = `[1v1 Match Found] ${challengerUsername} vs ${opponentUsername}. Accept within 3 minutes.`;

  await db.notification.createMany({
    data: [
      {
        userId: challenge.challengerId,
        type: 'ADMIN_TEST',
        fromUserId: challenge.opponentId,
        message,
      },
      {
        userId: challenge.opponentId,
        type: 'ADMIN_TEST',
        fromUserId: challenge.challengerId,
        message,
      },
    ],
  });

  const players = await db.user.findMany({
    where: {
      id: { in: [challenge.challengerId, challenge.opponentId] },
    },
    select: {
      id: true,
      username: true,
      discordDmNotifications: true,
      discordAccount: {
        select: {
          discordId: true,
        },
      },
    },
  });

  const dmRows = players
    .filter((player: any) => player.discordDmNotifications && player.discordAccount?.discordId)
    .map((player: any) => {
      const opponentId = player.id === challenge.challengerId ? challenge.opponentId : challenge.challengerId;
      const opponentUsernameValue = usernameMap.get(opponentId) || 'your opponent';

      return {
        recipientDiscordId: player.discordAccount.discordId,
        senderUsername: 'RiftEssence 1v1',
        messagePreview: `Ranked 1v1 found vs ${opponentUsernameValue}. Accept in app within 3 minutes.`,
        conversationId: challenge.id,
      };
    });

  if (dmRows.length) {
    await db.discordDmQueue.createMany({ data: dmRows });
  }
}

async function syncChallengeFromRiot(
  db: any,
  challenge: any,
  explicitMatchId: string | null,
): Promise<SyncChallengeResult> {
  if (challenge.status === 'COMPLETED') {
    return {
      ok: true,
      challenge,
      alreadyCompleted: true,
    };
  }

  if (!RESULT_SYNC_ALLOWED_STATUSES.includes(challenge.status)) {
    return {
      ok: false,
      status: 400,
      error: `Result sync requires ACCEPTED or LOBBY_READY status (current: ${challenge.status})`,
    };
  }

  const [challengerAccount, opponentAccount] = await Promise.all([
    getVerifiedAccountForRegion(db, challenge.challengerId, challenge.region),
    getVerifiedAccountForRegion(db, challenge.opponentId, challenge.region),
  ]);

  if (!challengerAccount || !opponentAccount) {
    return {
      ok: false,
      status: 400,
      error: 'Both players must still have a verified Riot account in the challenge region to sync result',
    };
  }

  let resolvedMatchId = explicitMatchId || null;
  let matchData: any = null;

  if (resolvedMatchId) {
    try {
      matchData = await riotClient.getMatchDetails(resolvedMatchId, challenge.region);
    } catch {
      return {
        ok: false,
        status: 502,
        error: 'Failed to fetch match from Riot API',
      };
    }
  } else {
    try {
      const sharedMatch = await findSharedCustomMatch(
        challengerAccount.puuid,
        opponentAccount.puuid,
        challenge.region,
        challenge.acceptedAt || challenge.createdAt || null,
      );

      if (!sharedMatch) {
        return {
          ok: false,
          status: 404,
          error: 'No shared custom game found yet. Play the match first, or provide a matchId explicitly.',
        };
      }

      resolvedMatchId = sharedMatch.matchId;
      matchData = sharedMatch.matchData;
    } catch {
      return {
        ok: false,
        status: 502,
        error: 'Failed to fetch recent matches from Riot API',
      };
    }
  }

  if (!matchData) {
    return {
      ok: false,
      status: 400,
      error: 'Match data is unavailable',
    };
  }

  if (!isLikelyCustomGame(matchData)) {
    return {
      ok: false,
      status: 400,
      error: 'Provided match is not recognized as a custom game (required for ranked 1v1)',
      details: {
        queueId: matchData?.info?.queueId ?? null,
        gameType: matchData?.info?.gameType ?? null,
      },
    };
  }

  const challengerParticipant = extractParticipant(matchData, challengerAccount.puuid);
  const opponentParticipant = extractParticipant(matchData, opponentAccount.puuid);

  if (!challengerParticipant || !opponentParticipant) {
    return {
      ok: false,
      status: 400,
      error: 'Provided match does not include both challenge participants',
    };
  }

  const challengerWon = Boolean(challengerParticipant.win);
  const opponentWon = Boolean(opponentParticipant.win);

  let winnerId: string | null = null;
  let loserId: string | null = null;
  let challengerScore = 0.5;

  if (challengerWon !== opponentWon) {
    if (challengerWon) {
      winnerId = challenge.challengerId;
      loserId = challenge.opponentId;
      challengerScore = 1;
    } else {
      winnerId = challenge.opponentId;
      loserId = challenge.challengerId;
      challengerScore = 0;
    }
  }

  const challengerResult: RankedOneVOneParticipantResult = winnerId === challenge.challengerId
    ? 'WIN'
    : winnerId === challenge.opponentId
      ? 'LOSS'
      : 'DRAW';

  const gameStartAt = toDateFromUnixMillis(matchData?.info?.gameCreation);
  const gameEndAt = toDateFromUnixMillis(matchData?.info?.gameEndTimestamp)
    || (gameStartAt && typeof matchData?.info?.gameDuration === 'number'
      ? new Date(gameStartAt.getTime() + (matchData.info.gameDuration * 1000))
      : null);

  const updatedChallenge = await db.$transaction(async (tx: any) => {
    const challengerStats = await tx.user.findUnique({
      where: { id: challenge.challengerId },
      select: {
        oneVOneRating: true,
      },
    });

    const opponentStats = await tx.user.findUnique({
      where: { id: challenge.opponentId },
      select: {
        oneVOneRating: true,
      },
    });

    const challengerRatingBefore = Number(challengerStats?.oneVOneRating ?? 1000);
    const opponentRatingBefore = Number(opponentStats?.oneVOneRating ?? 1000);

    const rawChallengerDelta = calculateEloDelta(challengerRatingBefore, opponentRatingBefore, challengerScore);
    const rawOpponentDelta = -rawChallengerDelta;

    const challengerRatingAfter = Math.max(0, challengerRatingBefore + rawChallengerDelta);
    const opponentRatingAfter = Math.max(0, opponentRatingBefore + rawOpponentDelta);

    const challengerRatingDelta = challengerRatingAfter - challengerRatingBefore;
    const opponentRatingDelta = opponentRatingAfter - opponentRatingBefore;

    const challengerUpdate: any = {
      oneVOneRating: challengerRatingAfter,
    };
    const opponentUpdate: any = {
      oneVOneRating: opponentRatingAfter,
    };

    if (challengerScore === 1) {
      challengerUpdate.oneVOneWins = { increment: 1 };
      opponentUpdate.oneVOneLosses = { increment: 1 };
    } else if (challengerScore === 0) {
      challengerUpdate.oneVOneLosses = { increment: 1 };
      opponentUpdate.oneVOneWins = { increment: 1 };
    } else {
      challengerUpdate.oneVOneDraws = { increment: 1 };
      opponentUpdate.oneVOneDraws = { increment: 1 };
    }

    await Promise.all([
      tx.user.update({ where: { id: challenge.challengerId }, data: challengerUpdate }),
      tx.user.update({ where: { id: challenge.opponentId }, data: opponentUpdate }),
    ]);

    await tx.matchHistory.create({
      data: {
        userId: challenge.challengerId,
        opponentId: challenge.opponentId,
        result: challengerResult,
        matchDate: gameStartAt || new Date(),
        sharedMatchesCount: 1,
      },
    });

    return tx.rankedOneVOne.update({
      where: { id: challenge.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        matchId: resolvedMatchId,
        resultSource: 'RIOT_MATCH',
        winnerId,
        loserId,
        challengerRatingBefore,
        opponentRatingBefore,
        challengerRatingDelta,
        opponentRatingDelta,
        queueId: typeof matchData?.info?.queueId === 'number' ? matchData.info.queueId : null,
        gameMode: matchData?.info?.gameMode || null,
        gameType: matchData?.info?.gameType || null,
        gameStartAt,
        gameEndAt,
        forfeitedById: null,
        forfeitReason: null,
      },
    });
  });

  return {
    ok: true,
    challenge: updatedChallenge,
  };
}

export default async function rankedOneVOneRoutes(fastify: any) {
  const db = prisma as any;

  // GET /api/ranked-1v1/me - current user ladder snapshot + queue state
  fastify.get('/ranked-1v1/me', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const [user, verifiedRegions, queueEntry] = await Promise.all([
        db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            region: true,
            oneVOneRating: true,
            oneVOneWins: true,
            oneVOneLosses: true,
            oneVOneDraws: true,
            discordDmNotifications: true,
          },
        }),
        getVerifiedRegions(db, userId),
        db.rankedOneVOneQueue.findUnique({ where: { userId } }),
      ]);

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const gamesPlayed = (user.oneVOneWins || 0) + (user.oneVOneLosses || 0) + (user.oneVOneDraws || 0);
      const scorePoints = (user.oneVOneWins || 0) + ((user.oneVOneDraws || 0) * 0.5);
      const winrate = gamesPlayed > 0 ? Number(((scorePoints / gamesPlayed) * 100).toFixed(2)) : 0;

      const ladderTier = buildLadderTierSnapshot(Number(user.oneVOneRating || 1000));
      const rankPosition = await db.user.count({
        where: {
          oneVOneRating: { gt: user.oneVOneRating || 1000 },
        },
      }) + 1;

      const activeChallenge = await getActiveChallengeForUser(db, userId);
      const usernameMap = activeChallenge
        ? await getUsernameMap(db, [
          activeChallenge.challengerId,
          activeChallenge.opponentId,
          activeChallenge.winnerId,
          activeChallenge.loserId,
          activeChallenge.hostUserId,
          activeChallenge.creatorUserId,
          activeChallenge.joinerUserId,
          activeChallenge.forfeitedById,
        ])
        : new Map<string, string>();

      return reply.send({
        profile: {
          userId: user.id,
          username: user.username,
          region: user.region,
          rating: Number(user.oneVOneRating || 1000),
          wins: user.oneVOneWins || 0,
          losses: user.oneVOneLosses || 0,
          draws: user.oneVOneDraws || 0,
          gamesPlayed,
          winrate,
          ladderTier,
          rankPosition,
          hasLinkedRiotAccount: verifiedRegions.length > 0,
          verifiedRegions,
          discordDmNotifications: Boolean(user.discordDmNotifications),
        },
        queue: queueEntry
          ? {
            ...queueEntry,
            waitingSeconds: Math.max(0, Math.floor((Date.now() - new Date(queueEntry.createdAt).getTime()) / 1000)),
          }
          : null,
        activeChallenge: activeChallenge
          ? formatChallengeForResponse(activeChallenge, usernameMap, userId)
          : null,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to fetch ranked 1v1 profile' });
    }
  });

  // POST /api/ranked-1v1/queue/join - join matchmaking queue and attempt instant match
  fastify.post('/ranked-1v1/queue/join', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(RankedOneVOneQueueJoinSchema, request.body || {});
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid queue payload', details: validation.errors });
      }

      const { region } = validation.data;

      const verifiedAccount = await getVerifiedAccountForRegion(db, userId, region);
      if (!verifiedAccount) {
        return reply.status(400).send({
          error: `You need a verified Riot account in ${region} to queue for ranked 1v1`,
        });
      }

      const activeChallenge = await getActiveChallengeForUser(db, userId);
      if (activeChallenge) {
        const usernameMap = await getUsernameMap(db, [
          activeChallenge.challengerId,
          activeChallenge.opponentId,
          activeChallenge.winnerId,
          activeChallenge.loserId,
          activeChallenge.hostUserId,
          activeChallenge.creatorUserId,
          activeChallenge.joinerUserId,
          activeChallenge.forfeitedById,
        ]);

        return reply.status(409).send({
          error: 'You already have an active ranked 1v1 challenge',
          challenge: formatChallengeForResponse(activeChallenge, usernameMap, userId),
        });
      }

      await db.rankedOneVOneQueue.upsert({
        where: { userId },
        update: {
          region,
        },
        create: {
          userId,
          region,
        },
      });

      const opponentQueue = await db.rankedOneVOneQueue.findFirst({
        where: {
          region,
          userId: { not: userId },
        },
        orderBy: { createdAt: 'asc' },
      });

      let matchedChallenge: any = null;

      if (opponentQueue) {
        matchedChallenge = await db.$transaction(async (tx: any) => {
          const queueRows = await tx.rankedOneVOneQueue.findMany({
            where: {
              region,
              userId: { in: [userId, opponentQueue.userId] },
            },
            orderBy: { createdAt: 'asc' },
          });

          if (queueRows.length < 2) {
            return null;
          }

          const challengerId = queueRows[0].userId;
          const opponentId = queueRows[1].userId;

          const hasActive = await tx.rankedOneVOne.findFirst({
            where: {
              status: { in: ACTIVE_CHALLENGE_STATUSES },
              OR: [
                { challengerId },
                { opponentId: challengerId },
                { challengerId: opponentId },
                { opponentId },
              ],
            },
          });

          if (hasActive) {
            await tx.rankedOneVOneQueue.deleteMany({
              where: { userId: { in: [challengerId, opponentId] } },
            });
            return null;
          }

          const [challengerAccount, opponentAccount] = await Promise.all([
            getVerifiedAccountForRegion(tx, challengerId, region),
            getVerifiedAccountForRegion(tx, opponentId, region),
          ]);

          if (!challengerAccount || !opponentAccount) {
            await tx.rankedOneVOneQueue.deleteMany({
              where: { userId: { in: [challengerId, opponentId] } },
            });
            return null;
          }

          const usernameRows = await tx.user.findMany({
            where: { id: { in: [challengerId, opponentId] } },
            select: { id: true, username: true },
          });

          if (usernameRows.length < 2) {
            return null;
          }

          const usernameMap = new Map<string, string>(
            usernameRows.map((row: any) => [String(row.id), String(row.username)]),
          );
          const creatorUserId = Math.random() < 0.5 ? challengerId : opponentId;
          const joinerUserId = creatorUserId === challengerId ? opponentId : challengerId;

          const challenge = await tx.rankedOneVOne.create({
            data: {
              challengerId,
              opponentId,
              region,
              status: 'PENDING',
              acceptDeadlineAt: new Date(Date.now() + ACCEPT_TIMEOUT_MS),
              lobbyName: generateLobbyName(
                usernameMap.get(challengerId) || 'Challenger',
                usernameMap.get(opponentId) || 'Opponent',
              ),
              lobbyPassword: generateLobbyPassword(),
              hostUserId: creatorUserId,
              creatorUserId,
              joinerUserId,
            },
          });

          await tx.rankedOneVOneQueue.deleteMany({
            where: {
              userId: { in: [challengerId, opponentId] },
            },
          });

          return challenge;
        });
      }

      if (matchedChallenge) {
        const usernameMap = await getUsernameMap(db, [
          matchedChallenge.challengerId,
          matchedChallenge.opponentId,
          matchedChallenge.hostUserId,
          matchedChallenge.creatorUserId,
          matchedChallenge.joinerUserId,
        ]);

        await notifyMatchFound(db, matchedChallenge, usernameMap);

        return reply.send({
          queued: false,
          matched: true,
          challenge: formatChallengeForResponse(matchedChallenge, usernameMap, userId),
        });
      }

      const queueEntry = await db.rankedOneVOneQueue.findUnique({ where: { userId } });

      return reply.send({
        queued: true,
        matched: false,
        queue: queueEntry,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to join ranked 1v1 queue' });
    }
  });

  // POST /api/ranked-1v1/queue/leave - leave matchmaking queue
  fastify.post('/ranked-1v1/queue/leave', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await db.rankedOneVOneQueue.deleteMany({ where: { userId } });

      return reply.send({
        success: true,
        leftQueue: true,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to leave ranked 1v1 queue' });
    }
  });

  // GET /api/ranked-1v1/queue/status - queue status + active challenge
  fastify.get('/ranked-1v1/queue/status', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const [queueEntry, activeChallenge] = await Promise.all([
        db.rankedOneVOneQueue.findUnique({ where: { userId } }),
        getActiveChallengeForUser(db, userId),
      ]);

      const usernameMap = activeChallenge
        ? await getUsernameMap(db, [
          activeChallenge.challengerId,
          activeChallenge.opponentId,
          activeChallenge.winnerId,
          activeChallenge.loserId,
          activeChallenge.hostUserId,
          activeChallenge.creatorUserId,
          activeChallenge.joinerUserId,
          activeChallenge.forfeitedById,
        ])
        : new Map<string, string>();

      return reply.send({
        queue: queueEntry,
        activeChallenge: activeChallenge
          ? formatChallengeForResponse(activeChallenge, usernameMap, userId)
          : null,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to fetch ranked 1v1 queue status' });
    }
  });

  // GET /api/ranked-1v1/challenges - list current user's challenges
  fastify.get('/ranked-1v1/challenges', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(RankedOneVOneListQuerySchema, request.query);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid query', details: validation.errors });
      }

      const { status, limit, offset } = validation.data;

      const whereClause: any = {
        OR: [
          { challengerId: userId },
          { opponentId: userId },
        ],
      };

      if (status) {
        whereClause.status = status;
      }

      const [challengesRaw, total] = await Promise.all([
        db.rankedOneVOne.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.rankedOneVOne.count({ where: whereClause }),
      ]);

      const challenges: any[] = [];
      for (const challenge of challengesRaw) {
        if (challenge.status === 'PENDING' || challenge.status === 'ACCEPTED') {
          challenges.push(await maybeAdvanceChallengeState(db, challenge));
        } else {
          challenges.push(challenge);
        }
      }

      const idsForNames = challenges.flatMap((challenge: any) => [
        challenge.challengerId,
        challenge.opponentId,
        challenge.winnerId,
        challenge.loserId,
        challenge.hostUserId,
        challenge.creatorUserId,
        challenge.joinerUserId,
        challenge.forfeitedById,
      ]);

      const usernameMap = await getUsernameMap(db, idsForNames);
      const formatted = challenges.map((challenge: any) => formatChallengeForResponse(challenge, usernameMap, userId));

      return reply.send({
        challenges: formatted,
        total,
        limit,
        offset,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to fetch ranked 1v1 challenges' });
    }
  });

  // GET /api/ranked-1v1/challenges/:id - get a specific challenge
  fastify.get('/ranked-1v1/challenges/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };

      const challengeInitial = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!challengeInitial) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      if (challengeInitial.challengerId !== userId && challengeInitial.opponentId !== userId) {
        return reply.status(403).send({ error: 'You do not have access to this challenge' });
      }

      const challenge = await maybeAdvanceChallengeState(db, challengeInitial);

      const usernameMap = await getUsernameMap(db, [
        challenge.challengerId,
        challenge.opponentId,
        challenge.winnerId,
        challenge.loserId,
        challenge.hostUserId,
        challenge.creatorUserId,
        challenge.joinerUserId,
        challenge.forfeitedById,
      ]);

      return reply.send({
        challenge: formatChallengeForResponse(challenge, usernameMap, userId),
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to fetch challenge' });
    }
  });

  // POST /api/ranked-1v1/challenges - direct challenge creation
  fastify.post('/ranked-1v1/challenges', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(CreateRankedOneVOneChallengeSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid challenge payload', details: validation.errors });
      }

      const { opponentId, region, lobbyName, lobbyPassword } = validation.data;

      if (opponentId === userId) {
        return reply.status(400).send({ error: 'You cannot challenge yourself' });
      }

      const [challenger, opponent] = await Promise.all([
        db.user.findUnique({ where: { id: userId }, select: { id: true, username: true } }),
        db.user.findUnique({ where: { id: opponentId }, select: { id: true, username: true } }),
      ]);

      if (!challenger || !opponent) {
        return reply.status(404).send({ error: 'Challenger or opponent not found' });
      }

      const activeChallenge = await db.rankedOneVOne.findFirst({
        where: {
          status: { in: ACTIVE_CHALLENGE_STATUSES },
          OR: [
            { challengerId: userId, opponentId },
            { challengerId: opponentId, opponentId: userId },
          ],
        },
      });

      if (activeChallenge) {
        return reply.status(409).send({
          error: 'An active 1v1 challenge already exists between these users',
          challengeId: activeChallenge.id,
        });
      }

      const [challengerAccount, opponentAccount] = await Promise.all([
        getVerifiedAccountForRegion(db, userId, region),
        getVerifiedAccountForRegion(db, opponentId, region),
      ]);

      if (!challengerAccount || !opponentAccount) {
        return reply.status(400).send({
          error: 'Both players need a verified Riot account in the selected region to play ranked 1v1',
        });
      }

      const challenge = await db.rankedOneVOne.create({
        data: {
          challengerId: userId,
          opponentId,
          region,
          status: 'PENDING',
          acceptDeadlineAt: new Date(Date.now() + ACCEPT_TIMEOUT_MS),
          challengerAcceptedAt: new Date(),
          lobbyName: lobbyName || generateLobbyName(challenger.username, opponent.username),
          lobbyPassword: lobbyPassword || generateLobbyPassword(),
          hostUserId: userId,
          creatorUserId: userId,
          joinerUserId: opponentId,
        },
      });

      const usernameMap = await getUsernameMap(db, [userId, opponentId, challenge.hostUserId, challenge.creatorUserId, challenge.joinerUserId]);

      return reply.status(201).send({
        challenge: formatChallengeForResponse(challenge, usernameMap, userId),
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to create challenge' });
    }
  });

  // POST /api/ranked-1v1/challenges/:id/accept - both players must accept within 3 minutes
  fastify.post('/ranked-1v1/challenges/:id/accept', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };

      const existing = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      if (existing.challengerId !== userId && existing.opponentId !== userId) {
        return reply.status(403).send({ error: 'Only challenge participants can accept this challenge' });
      }

      const challenge = await maybeAdvanceChallengeState(db, existing);

      if (challenge.status !== 'PENDING') {
        return reply.status(400).send({ error: `Challenge cannot be accepted from status ${challenge.status}` });
      }

      const now = new Date();
      const updateData: any = {};

      if (challenge.challengerId === userId && !challenge.challengerAcceptedAt) {
        updateData.challengerAcceptedAt = now;
      }
      if (challenge.opponentId === userId && !challenge.opponentAcceptedAt) {
        updateData.opponentAcceptedAt = now;
      }

      let updated = challenge;

      if (Object.keys(updateData).length > 0) {
        updated = await db.rankedOneVOne.update({
          where: { id },
          data: updateData,
        });
      }

      if (updated.challengerAcceptedAt && updated.opponentAcceptedAt) {
        updated = await db.rankedOneVOne.update({
          where: { id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: updated.acceptedAt || now,
            styleSelectionDeadlineAt: updated.styleSelectionDeadlineAt || new Date(Date.now() + STYLE_TIMEOUT_MS),
          },
        });
      }

      const usernameMap = await getUsernameMap(db, [
        updated.challengerId,
        updated.opponentId,
        updated.hostUserId,
        updated.creatorUserId,
        updated.joinerUserId,
      ]);

      return reply.send({
        challenge: formatChallengeForResponse(updated, usernameMap, userId),
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to accept challenge' });
    }
  });

  // POST /api/ranked-1v1/challenges/:id/style-choice - pick duel style
  fastify.post('/ranked-1v1/challenges/:id/style-choice', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(RankedOneVOneStyleChoiceSchema, request.body || {});
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid style payload', details: validation.errors });
      }

      const { id } = request.params as { id: string };
      const { style } = validation.data;

      const existing = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      if (existing.challengerId !== userId && existing.opponentId !== userId) {
        return reply.status(403).send({ error: 'Only challenge participants can vote on style' });
      }

      let challenge = await maybeAdvanceChallengeState(db, existing);
      if (challenge.status !== 'ACCEPTED') {
        return reply.status(400).send({ error: `Style voting requires ACCEPTED status (current: ${challenge.status})` });
      }

      const updateData: any = challenge.challengerId === userId
        ? { challengerStyleChoice: style }
        : { opponentStyleChoice: style };

      challenge = await db.rankedOneVOne.update({
        where: { id },
        data: updateData,
      });

      challenge = await maybeResolveStyleSelection(db, challenge);

      const usernameMap = await getUsernameMap(db, [
        challenge.challengerId,
        challenge.opponentId,
        challenge.hostUserId,
        challenge.creatorUserId,
        challenge.joinerUserId,
      ]);

      return reply.send({
        challenge: formatChallengeForResponse(challenge, usernameMap, userId),
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to record style vote' });
    }
  });

  // POST /api/ranked-1v1/challenges/:id/create-custom-game - update generated lobby setup
  fastify.post('/ranked-1v1/challenges/:id/create-custom-game', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(CreateRankedOneVOneLobbySchema, request.body || {});
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid lobby payload', details: validation.errors });
      }

      const { id } = request.params as { id: string };
      const { lobbyName, lobbyPassword, hostUserId } = validation.data;

      const existing = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      if (existing.challengerId !== userId && existing.opponentId !== userId) {
        return reply.status(403).send({ error: 'Only challenge participants can edit lobby details' });
      }

      let challenge = await maybeAdvanceChallengeState(db, existing);

      if (!['ACCEPTED', 'LOBBY_READY'].includes(challenge.status)) {
        return reply.status(400).send({ error: `Lobby setup requires ACCEPTED or LOBBY_READY status (current: ${challenge.status})` });
      }

      const resolvedHostUserId = hostUserId || challenge.hostUserId || challenge.creatorUserId || userId;
      if (![challenge.challengerId, challenge.opponentId].includes(resolvedHostUserId)) {
        return reply.status(400).send({ error: 'hostUserId must be one of the challenge participants' });
      }

      if (!challenge.creatorUserId || !challenge.joinerUserId) {
        const creator = challenge.creatorUserId || resolvedHostUserId;
        const joiner = creator === challenge.challengerId ? challenge.opponentId : challenge.challengerId;
        challenge = await db.rankedOneVOne.update({
          where: { id },
          data: {
            creatorUserId: creator,
            joinerUserId: joiner,
          },
        });
      }

      const usernameMapForGeneration = await getUsernameMap(db, [challenge.challengerId, challenge.opponentId]);
      const challengerUsername = usernameMapForGeneration.get(challenge.challengerId) || 'Challenger';
      const opponentUsername = usernameMapForGeneration.get(challenge.opponentId) || 'Opponent';

      const updated = await db.rankedOneVOne.update({
        where: { id },
        data: {
          status: 'LOBBY_READY',
          hostUserId: resolvedHostUserId,
          creatorUserId: challenge.creatorUserId || resolvedHostUserId,
          joinerUserId: challenge.joinerUserId || (resolvedHostUserId === challenge.challengerId ? challenge.opponentId : challenge.challengerId),
          lobbyName: lobbyName || challenge.lobbyName || generateLobbyName(challengerUsername, opponentUsername),
          lobbyPassword: lobbyPassword || challenge.lobbyPassword || generateLobbyPassword(),
          lobbyCreatedAt: new Date(),
        },
      });

      const usernameMap = await getUsernameMap(db, [
        updated.challengerId,
        updated.opponentId,
        updated.hostUserId,
        updated.creatorUserId,
        updated.joinerUserId,
      ]);

      return reply.send({
        challenge: formatChallengeForResponse(updated, usernameMap, userId),
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to create custom game setup' });
    }
  });

  // POST /api/ranked-1v1/challenges/:id/give-up - surrender and take a ranked loss
  fastify.post('/ranked-1v1/challenges/:id/give-up', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(RankedOneVOneGiveUpSchema, request.body || {});
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid surrender payload', details: validation.errors });
      }

      const { reason } = validation.data;
      const { id } = request.params as { id: string };

      const existing = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      if (existing.challengerId !== userId && existing.opponentId !== userId) {
        return reply.status(403).send({ error: 'Only challenge participants can surrender' });
      }

      const challenge = await maybeAdvanceChallengeState(db, existing);

      if (!ACTIVE_CHALLENGE_STATUSES.includes(challenge.status)) {
        return reply.status(400).send({ error: `Challenge cannot be surrendered from status ${challenge.status}` });
      }

      const winnerId = challenge.challengerId === userId ? challenge.opponentId : challenge.challengerId;
      const loserId = userId;

      const resolved = await resolveManualOutcome(db, challenge, {
        status: 'COMPLETED',
        winnerId,
        loserId,
        challengerResult: challenge.challengerId === winnerId ? 'WIN' : 'LOSS',
        opponentResult: challenge.opponentId === winnerId ? 'WIN' : 'LOSS',
        challengerDelta: challenge.challengerId === winnerId ? SURRENDER_WIN_DELTA : SURRENDER_LOSS_DELTA,
        opponentDelta: challenge.opponentId === winnerId ? SURRENDER_WIN_DELTA : SURRENDER_LOSS_DELTA,
        forfeitedById: userId,
        forfeitReason: reason || 'PLAYER_SURRENDER',
      });

      const usernameMap = await getUsernameMap(db, [
        resolved.challengerId,
        resolved.opponentId,
        resolved.winnerId,
        resolved.loserId,
        resolved.forfeitedById,
      ]);

      return reply.send({
        challenge: formatChallengeForResponse(resolved, usernameMap, userId),
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to surrender challenge' });
    }
  });

  // POST /api/ranked-1v1/challenges/:id/report-issue - report no-show / rule violation with evidence URLs
  fastify.post('/ranked-1v1/challenges/:id/report-issue', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(RankedOneVOneIssueReportSchema, request.body || {});
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid report payload', details: validation.errors });
      }

      const { id } = request.params as { id: string };
      const { reason, evidenceUrls } = validation.data;

      const challenge = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!challenge) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      if (challenge.challengerId !== userId && challenge.opponentId !== userId) {
        return reply.status(403).send({ error: 'Only challenge participants can report issues' });
      }

      const existingReports = Array.isArray(challenge.issueReports) ? challenge.issueReports : [];
      const reportPayload = {
        reporterId: userId,
        reason,
        evidenceUrls,
        createdAt: new Date().toISOString(),
      };

      const updated = await db.rankedOneVOne.update({
        where: { id },
        data: {
          issueReports: [...existingReports, reportPayload],
        },
      });

      const usernameMap = await getUsernameMap(db, [
        updated.challengerId,
        updated.opponentId,
        updated.winnerId,
        updated.loserId,
      ]);

      return reply.send({
        challenge: formatChallengeForResponse(updated, usernameMap, userId),
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to report challenge issue' });
    }
  });

  // POST /api/ranked-1v1/challenges/:id/finished - player marks match finished; sync triggers when both finish
  fastify.post('/ranked-1v1/challenges/:id/finished', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(SyncRankedOneVOneResultSchema, request.body || {});
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid payload', details: validation.errors });
      }

      const { matchId } = validation.data;
      const { id } = request.params as { id: string };

      const existing = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      if (existing.challengerId !== userId && existing.opponentId !== userId) {
        return reply.status(403).send({ error: 'Only challenge participants can submit finish status' });
      }

      let challenge = await maybeAdvanceChallengeState(db, existing);
      if (challenge.status === 'COMPLETED') {
        const usernameMap = await getUsernameMap(db, [
          challenge.challengerId,
          challenge.opponentId,
          challenge.winnerId,
          challenge.loserId,
          challenge.hostUserId,
          challenge.creatorUserId,
          challenge.joinerUserId,
          challenge.forfeitedById,
        ]);

        return reply.send({
          challenge: formatChallengeForResponse(challenge, usernameMap, userId),
          alreadyCompleted: true,
        });
      }

      if (!RESULT_SYNC_ALLOWED_STATUSES.includes(challenge.status)) {
        return reply.status(400).send({ error: `Finish confirmation requires ACCEPTED or LOBBY_READY status (current: ${challenge.status})` });
      }

      const finishData: any = challenge.challengerId === userId
        ? { challengerFinishedAt: challenge.challengerFinishedAt || new Date() }
        : { opponentFinishedAt: challenge.opponentFinishedAt || new Date() };

      challenge = await db.rankedOneVOne.update({
        where: { id },
        data: finishData,
      });

      if (!challenge.challengerFinishedAt || !challenge.opponentFinishedAt) {
        const usernameMap = await getUsernameMap(db, [
          challenge.challengerId,
          challenge.opponentId,
          challenge.hostUserId,
          challenge.creatorUserId,
          challenge.joinerUserId,
        ]);

        return reply.send({
          challenge: formatChallengeForResponse(challenge, usernameMap, userId),
          waitingForOpponentFinish: true,
        });
      }

      const syncResult = await syncChallengeFromRiot(db, challenge, matchId || null);

      if (!syncResult.ok) {
        if (syncResult.status === 404) {
          const usernameMap = await getUsernameMap(db, [
            challenge.challengerId,
            challenge.opponentId,
            challenge.hostUserId,
            challenge.creatorUserId,
            challenge.joinerUserId,
          ]);

          return reply.send({
            challenge: formatChallengeForResponse(challenge, usernameMap, userId),
            awaitingRiotSync: true,
            syncMessage: syncResult.error,
          });
        }

        return reply.status(syncResult.status).send({
          error: syncResult.error,
          details: syncResult.details,
        });
      }

      const usernameMap = await getUsernameMap(db, [
        syncResult.challenge.challengerId,
        syncResult.challenge.opponentId,
        syncResult.challenge.winnerId,
        syncResult.challenge.loserId,
        syncResult.challenge.hostUserId,
        syncResult.challenge.creatorUserId,
        syncResult.challenge.joinerUserId,
        syncResult.challenge.forfeitedById,
      ]);

      return reply.send({
        challenge: formatChallengeForResponse(syncResult.challenge, usernameMap, userId),
        synced: true,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to finish challenge' });
    }
  });

  // POST /api/ranked-1v1/challenges/:id/cancel - cancel an active challenge
  fastify.post('/ranked-1v1/challenges/:id/cancel', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };

      const challenge = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!challenge) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      const isParticipant = challenge.challengerId === userId || challenge.opponentId === userId;
      if (!isParticipant) {
        return reply.status(403).send({ error: 'Only challenge participants can cancel this challenge' });
      }

      if (!ACTIVE_CHALLENGE_STATUSES.includes(challenge.status)) {
        return reply.status(400).send({ error: `Challenge cannot be cancelled from status ${challenge.status}` });
      }

      const updated = await db.rankedOneVOne.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      const usernameMap = await getUsernameMap(db, [updated.challengerId, updated.opponentId]);

      return reply.send({
        challenge: formatChallengeForResponse(updated, usernameMap, userId),
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to cancel challenge' });
    }
  });

  // POST /api/ranked-1v1/challenges/:id/sync-result - verify and resolve result from Riot match data
  fastify.post('/ranked-1v1/challenges/:id/sync-result', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(SyncRankedOneVOneResultSchema, request.body || {});
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid sync payload', details: validation.errors });
      }

      const { id } = request.params as { id: string };
      const { matchId } = validation.data;

      const challenge = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!challenge) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      const isParticipant = challenge.challengerId === userId || challenge.opponentId === userId;
      if (!isParticipant) {
        return reply.status(403).send({ error: 'Only challenge participants can sync results' });
      }

      const syncResult = await syncChallengeFromRiot(db, challenge, matchId || null);
      if (!syncResult.ok) {
        return reply.status(syncResult.status).send({
          error: syncResult.error,
          details: syncResult.details,
        });
      }

      const usernameMap = await getUsernameMap(db, [
        syncResult.challenge.challengerId,
        syncResult.challenge.opponentId,
        syncResult.challenge.winnerId,
        syncResult.challenge.loserId,
        syncResult.challenge.hostUserId,
        syncResult.challenge.creatorUserId,
        syncResult.challenge.joinerUserId,
        syncResult.challenge.forfeitedById,
      ]);

      return reply.send({
        challenge: formatChallengeForResponse(syncResult.challenge, usernameMap, userId),
        alreadyCompleted: Boolean(syncResult.alreadyCompleted),
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      if (error?.code === 'P2002') {
        return reply.status(409).send({ error: 'This match has already been used to resolve another challenge' });
      }
      return reply.status(500).send({ error: 'Failed to sync challenge result' });
    }
  });

  // GET /api/ranked-1v1/leaderboard - ranked 1v1 ladder
  fastify.get('/ranked-1v1/leaderboard', async (request: any, reply: any) => {
    try {
      const validation = validateRequest(RankedOneVOneLeaderboardQuerySchema, request.query);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid query', details: validation.errors });
      }

      const { limit, offset } = validation.data;
      const safeLimit = Number(limit || 25);
      const safeOffset = Number(offset || 0);

      const [rows, total] = await Promise.all([
        db.user.findMany({
          where: {
            OR: [
              { oneVOneWins: { gt: 0 } },
              { oneVOneLosses: { gt: 0 } },
              { oneVOneDraws: { gt: 0 } },
            ],
          },
          select: {
            id: true,
            username: true,
            region: true,
            oneVOneRating: true,
            oneVOneWins: true,
            oneVOneLosses: true,
            oneVOneDraws: true,
          },
          orderBy: [
            { oneVOneRating: 'desc' },
            { oneVOneWins: 'desc' },
            { oneVOneLosses: 'asc' },
            { username: 'asc' },
          ],
          take: safeLimit,
          skip: safeOffset,
        }),
        db.user.count({
          where: {
            OR: [
              { oneVOneWins: { gt: 0 } },
              { oneVOneLosses: { gt: 0 } },
              { oneVOneDraws: { gt: 0 } },
            ],
          },
        }),
      ]);

      const entries = rows.map((row: any, index: number) => {
        const gamesPlayed = (row.oneVOneWins || 0) + (row.oneVOneLosses || 0) + (row.oneVOneDraws || 0);
        const scorePoints = (row.oneVOneWins || 0) + ((row.oneVOneDraws || 0) * 0.5);
        const winrate = gamesPlayed > 0 ? Number(((scorePoints / gamesPlayed) * 100).toFixed(2)) : 0;
        const ladderTier = buildLadderTierSnapshot(Number(row.oneVOneRating || 1000));

        return {
          rank: safeOffset + index + 1,
          userId: row.id,
          username: row.username,
          region: row.region,
          rating: row.oneVOneRating,
          wins: row.oneVOneWins,
          losses: row.oneVOneLosses,
          draws: row.oneVOneDraws,
          gamesPlayed,
          winrate,
          ladderTier,
        };
      });

      return reply.send({
        entries,
        total,
        limit: safeLimit,
        offset: safeOffset,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (isSchemaOutOfDateError(error)) {
        return reply.status(503).send({
          error: 'Ranked 1v1 schema is out of date. Apply database updates and regenerate Prisma client.',
          code: 'RANKED_1V1_SCHEMA_OUTDATED',
        });
      }
      return reply.status(500).send({ error: 'Failed to fetch ranked 1v1 leaderboard' });
    }
  });
}
