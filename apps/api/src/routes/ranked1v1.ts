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
} from '../validation';

const ACTIVE_CHALLENGE_STATUSES = ['PENDING', 'ACCEPTED', 'LOBBY_READY'];
const RESULT_SYNC_ALLOWED_STATUSES = ['ACCEPTED', 'LOBBY_READY'];
const CUSTOM_GAME_AUTOMATION_NOTE = 'Riot API does not let third-party apps auto-create custom lobbies. Use the generated lobby details in the LoL client.';

type RankedOneVOneStatus = 'PENDING' | 'ACCEPTED' | 'LOBBY_READY' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

type VerifiedAccount = {
  puuid: string;
  summonerName: string;
  gameName: string | null;
  tagLine: string | null;
  region: string;
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

function buildCustomGameSetup(challenge: any, usernameMap: Map<string, string>) {
  const hostUserId = challenge.hostUserId || challenge.challengerId;

  return {
    canAutoCreate: false,
    note: CUSTOM_GAME_AUTOMATION_NOTE,
    hostUserId,
    hostUsername: usernameMap.get(hostUserId) || null,
    lobbyName: challenge.lobbyName,
    lobbyPassword: challenge.lobbyPassword,
    recommendedSettings: {
      map: 'SUMMONERS_RIFT',
      mode: 'CLASSIC',
      teamSize: '1v1',
      spectators: 'ALL',
    },
  };
}

function formatChallengeForResponse(challenge: any, usernameMap: Map<string, string>, currentUserId: string) {
  const myRole = challenge.challengerId === currentUserId ? 'CHALLENGER' : 'OPPONENT';

  return {
    ...challenge,
    myRole,
    challengerUsername: usernameMap.get(challenge.challengerId) || null,
    opponentUsername: usernameMap.get(challenge.opponentId) || null,
    winnerUsername: challenge.winnerId ? (usernameMap.get(challenge.winnerId) || null) : null,
    loserUsername: challenge.loserId ? (usernameMap.get(challenge.loserId) || null) : null,
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

async function getUsernameMap(db: any, ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === 'string' && id.length > 0)));
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

export default async function rankedOneVOneRoutes(fastify: any) {
  const db = prisma as any;

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

      const [challenges, total] = await Promise.all([
        db.rankedOneVOne.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        db.rankedOneVOne.count({ where: whereClause }),
      ]);

      const idsForNames = challenges.flatMap((challenge: any) => [
        challenge.challengerId,
        challenge.opponentId,
        challenge.winnerId,
        challenge.loserId,
        challenge.hostUserId,
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

      const challenge = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!challenge) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      if (challenge.challengerId !== userId && challenge.opponentId !== userId) {
        return reply.status(403).send({ error: 'You do not have access to this challenge' });
      }

      const usernameMap = await getUsernameMap(db, [
        challenge.challengerId,
        challenge.opponentId,
        challenge.winnerId,
        challenge.loserId,
        challenge.hostUserId,
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

  // POST /api/ranked-1v1/challenges - create challenge
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
          status: 'PENDING' as RankedOneVOneStatus,
          lobbyName: lobbyName || generateLobbyName(challenger.username, opponent.username),
          lobbyPassword: lobbyPassword || generateLobbyPassword(),
          hostUserId: userId,
        },
      });

      const usernameMap = await getUsernameMap(db, [userId, opponentId, challenge.hostUserId]);

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

  // POST /api/ranked-1v1/challenges/:id/accept - accept incoming challenge
  fastify.post('/ranked-1v1/challenges/:id/accept', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as { id: string };

      const challenge = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!challenge) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      if (challenge.opponentId !== userId) {
        return reply.status(403).send({ error: 'Only the challenged player can accept this challenge' });
      }

      if (challenge.status !== 'PENDING') {
        return reply.status(400).send({ error: `Challenge cannot be accepted from status ${challenge.status}` });
      }

      const updated = await db.rankedOneVOne.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      const usernameMap = await getUsernameMap(db, [updated.challengerId, updated.opponentId, updated.hostUserId]);

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

  // POST /api/ranked-1v1/challenges/:id/create-custom-game - generate/update lobby setup
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

      const challenge = await db.rankedOneVOne.findUnique({ where: { id } });
      if (!challenge) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }

      const isParticipant = challenge.challengerId === userId || challenge.opponentId === userId;
      if (!isParticipant) {
        return reply.status(403).send({ error: 'Only challenge participants can create lobby details' });
      }

      if (!['ACCEPTED', 'LOBBY_READY'].includes(challenge.status)) {
        return reply.status(400).send({ error: `Lobby setup requires ACCEPTED challenge status (current: ${challenge.status})` });
      }

      const resolvedHostUserId = hostUserId || challenge.hostUserId || userId;
      if (![challenge.challengerId, challenge.opponentId].includes(resolvedHostUserId)) {
        return reply.status(400).send({ error: 'hostUserId must be one of the challenge participants' });
      }

      const usernameMapForGeneration = await getUsernameMap(db, [challenge.challengerId, challenge.opponentId]);
      const challengerUsername = usernameMapForGeneration.get(challenge.challengerId) || 'Challenger';
      const opponentUsername = usernameMapForGeneration.get(challenge.opponentId) || 'Opponent';

      const updated = await db.rankedOneVOne.update({
        where: { id },
        data: {
          status: 'LOBBY_READY',
          hostUserId: resolvedHostUserId,
          lobbyName: lobbyName || challenge.lobbyName || generateLobbyName(challengerUsername, opponentUsername),
          lobbyPassword: lobbyPassword || challenge.lobbyPassword || generateLobbyPassword(),
          lobbyCreatedAt: new Date(),
        },
      });

      const usernameMap = await getUsernameMap(db, [
        updated.challengerId,
        updated.opponentId,
        updated.hostUserId,
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

      if (challenge.status === 'COMPLETED') {
        const usernameMap = await getUsernameMap(db, [
          challenge.challengerId,
          challenge.opponentId,
          challenge.winnerId,
          challenge.loserId,
          challenge.hostUserId,
        ]);

        return reply.send({
          challenge: formatChallengeForResponse(challenge, usernameMap, userId),
          alreadyCompleted: true,
        });
      }

      if (!RESULT_SYNC_ALLOWED_STATUSES.includes(challenge.status)) {
        return reply.status(400).send({
          error: `Result sync requires ACCEPTED or LOBBY_READY status (current: ${challenge.status})`,
        });
      }

      const [challengerAccount, opponentAccount] = await Promise.all([
        getVerifiedAccountForRegion(db, challenge.challengerId, challenge.region),
        getVerifiedAccountForRegion(db, challenge.opponentId, challenge.region),
      ]);

      if (!challengerAccount || !opponentAccount) {
        return reply.status(400).send({
          error: 'Both players must still have a verified Riot account in the challenge region to sync result',
        });
      }

      let resolvedMatchId = matchId || null;
      let matchData: any = null;

      if (resolvedMatchId) {
        try {
          matchData = await riotClient.getMatchDetails(resolvedMatchId, challenge.region);
        } catch (riotError: any) {
          fastify.log.error(riotError);
          return reply.status(502).send({ error: 'Failed to fetch match from Riot API' });
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
            return reply.status(404).send({
              error: 'No shared custom game found yet. Play the match first, or provide a matchId explicitly.',
            });
          }

          resolvedMatchId = sharedMatch.matchId;
          matchData = sharedMatch.matchData;
        } catch (riotError: any) {
          fastify.log.error(riotError);
          return reply.status(502).send({ error: 'Failed to fetch recent matches from Riot API' });
        }
      }

      if (!matchData) {
        return reply.status(400).send({ error: 'Match data is unavailable' });
      }

      if (!isLikelyCustomGame(matchData)) {
        return reply.status(400).send({
          error: 'Provided match is not recognized as a custom game (required for ranked 1v1)',
          queueId: matchData?.info?.queueId ?? null,
          gameType: matchData?.info?.gameType ?? null,
        });
      }

      const challengerParticipant = extractParticipant(matchData, challengerAccount.puuid);
      const opponentParticipant = extractParticipant(matchData, opponentAccount.puuid);

      if (!challengerParticipant || !opponentParticipant) {
        return reply.status(400).send({
          error: 'Provided match does not include both challenge participants',
        });
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

      const challengerResult = winnerId === challenge.challengerId
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
            oneVOneWins: true,
            oneVOneLosses: true,
            oneVOneDraws: true,
          },
        });

        const opponentStats = await tx.user.findUnique({
          where: { id: challenge.opponentId },
          select: {
            oneVOneRating: true,
            oneVOneWins: true,
            oneVOneLosses: true,
            oneVOneDraws: true,
          },
        });

        const challengerRatingBefore = Number(challengerStats?.oneVOneRating ?? 1000);
        const opponentRatingBefore = Number(opponentStats?.oneVOneRating ?? 1000);
        const challengerRatingDelta = calculateEloDelta(challengerRatingBefore, opponentRatingBefore, challengerScore);
        const opponentRatingDelta = -challengerRatingDelta;

        const challengerUpdate: any = {
          oneVOneRating: { increment: challengerRatingDelta },
        };
        const opponentUpdate: any = {
          oneVOneRating: { increment: opponentRatingDelta },
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
          where: { id },
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
          },
        });
      });

      const usernameMap = await getUsernameMap(db, [
        updatedChallenge.challengerId,
        updatedChallenge.opponentId,
        updatedChallenge.winnerId,
        updatedChallenge.loserId,
        updatedChallenge.hostUserId,
      ]);

      return reply.send({
        challenge: formatChallengeForResponse(updatedChallenge, usernameMap, userId),
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
          take: limit,
          skip: offset,
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

        return {
          rank: offset + index + 1,
          userId: row.id,
          username: row.username,
          region: row.region,
          rating: row.oneVOneRating,
          wins: row.oneVOneWins,
          losses: row.oneVOneLosses,
          draws: row.oneVOneDraws,
          gamesPlayed,
          winrate,
        };
      });

      return reply.send({
        entries,
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
      return reply.status(500).send({ error: 'Failed to fetch ranked 1v1 leaderboard' });
    }
  });
}
