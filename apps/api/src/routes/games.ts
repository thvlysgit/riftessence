import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import {
  EconomyError,
  EconomyTx,
  economyFailure,
  nextReset,
  postEntry,
  readSettings,
  requireEconomyAdmin,
  utcDay,
  withWallet,
} from '../services/economy';
import {
  championById,
  champions,
  GAME_KEYS,
  MAX_GUESSES,
  presentRound,
  selectAnswer,
  sounds,
  roundReward,
} from '../services/dailyGames';
import catalog from '../data/game-catalog.json';

export default async function gameRoutes(app: FastifyInstance) {
  app.get('/games/catalog', async () => ({
    version: catalog.version,
    champions: champions.map((c) => ({ id: c.id, name: c.name })),
    credits: {
      archive: 'https://loldle.net/',
      soundcheck: 'https://lynge.tv/listen/',
      assets: 'Riot Games',
    },
  }));

  app.get('/games', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    try {
      const userId = await getUserIdFromRequest(request, reply, false);
      const day = utcDay();
      const [settings, rounds] = await Promise.all([
        readSettings(),
        userId ? prisma.gameRound.findMany({ where: { userId, day } }) : [],
      ]);
      return {
        day,
        resetAt: nextReset(),
        dailyCap: settings.dailyGameCap,
        rewardsEnabled: settings.gameRewardsEnabled,
        earnedToday: rounds.reduce(
          (sum: number, round: { rewardPaid: number }) => sum + round.rewardPaid,
          0,
        ),
        games: GAME_KEYS.map((key) => ({
          key,
          title: key === 'archive' ? 'Champion Archive' : 'Soundcheck',
          reward: settings.gameRewardsEnabled
            ? key === 'archive'
              ? settings.championReward
              : settings.soundReward
            : 0,
          round: rounds.find((round: { gameKey: string }) => round.gameKey === key)
            ? presentRound(rounds.find((round: { gameKey: string }) => round.gameKey === key))
            : null,
        })),
      };
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });

  app.post<{ Params: { gameKey: string } }>('/games/:gameKey/start', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      const gameKey = z.enum(GAME_KEYS).parse(request.params.gameKey);
      const { practice } = z
        .object({ practice: z.boolean().default(false) })
        .parse(request.body || {});
      const today = utcDay();
      const round = await withWallet(userId, async (tx) => {
        const day = practice ? `practice:${randomUUID()}` : today;
        const previous = await tx.gameRound.findUnique({
          where: { userId_gameKey_day: { userId, gameKey, day } },
        });
        if (previous) return previous;
        if (practice) {
          // Reuse an unfinished practice round, so accidental retries don't spawn extras.
          const open = await tx.gameRound.findFirst({
            where: { userId, gameKey, day: { startsWith: 'practice:' }, finished: false },
            orderBy: { createdAt: 'desc' },
          });
          if (open) return open;
          const count = await tx.gameRound.count({
            where: {
              userId,
              createdAt: { gte: new Date(`${today}T00:00:00Z`) },
              day: { startsWith: 'practice:' },
            },
          });
          if (count >= 100)
            throw new EconomyError(
              'You have reached today’s 100 practice rounds. Come back tomorrow.',
              429,
            );
        }
        const settings = await readSettings(tx);
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new EconomyError('Daily games are not configured on this server.', 503);
        return tx.gameRound.create({
          data: {
            userId,
            gameKey,
            day,
            championId: selectAnswer(gameKey, today, practice, secret),
            rewardOffer:
              !practice && settings.gameRewardsEnabled
                ? gameKey === 'archive'
                  ? settings.championReward
                  : settings.soundReward
                : 0,
          },
        });
      });
      reply.header('Cache-Control', 'private, no-store');
      return presentRound(round);
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });

  app.post<{ Params: { roundId: string } }>(
    '/games/rounds/:roundId/guess',
    async (request, reply) => {
      try {
        const userId = await getUserIdFromRequest(request, reply);
        if (!userId) return;
        const input = z
          .object({ championId: z.string().max(40).optional(), giveUp: z.boolean().default(false) })
          .parse(request.body);
        if (!input.giveUp && (!input.championId || !championById.has(input.championId)))
          throw new EconomyError('Choose a champion from the list.');
        const updated = await withWallet(userId, async (tx, wallet) => {
          const round = await tx.gameRound.findFirst({
            where: { id: request.params.roundId, userId },
          });
          if (!round) throw new EconomyError('Puzzle not found.', 404);
          if (round.finished) return round;
          const practice = round.day.startsWith('practice:');
          if (!practice && round.day !== utcDay())
            throw new EconomyError('This daily puzzle has ended. Open today’s puzzle.', 409);
          if (!input.giveUp && round.guesses.includes(input.championId!)) return round;
          if (round.guesses.length >= MAX_GUESSES)
            throw new EconomyError('No guesses remain.', 409);
          const guesses = input.giveUp ? round.guesses : [...round.guesses, input.championId!];
          const won = !input.giveUp && input.championId === round.championId;
          let rewardPaid = 0;
          if (won && !practice) {
            const settings = await readSettings(tx);
            const earned = await tx.gameRound.aggregate({
              where: { userId, day: round.day },
              _sum: { rewardPaid: true },
            });
            rewardPaid = settings.gameRewardsEnabled
              ? Math.max(
                  0,
                  Math.min(
                    roundReward(round, guesses.length),
                    settings.dailyGameCap - (earned._sum.rewardPaid || 0),
                  ),
                )
              : 0;
            if (rewardPaid)
              await postEntry(
                tx,
                wallet,
                rewardPaid,
                'GAME_REWARD',
                round.gameKey === 'archive' ? 'Champion Archive solved' : 'Soundcheck solved',
                { roundId: round.id, gameKey: round.gameKey, day: round.day },
              );
          }
          return tx.gameRound.update({
            where: { id: round.id },
            data: {
              guesses,
              won,
              rewardPaid,
              finished: won || input.giveUp || guesses.length >= MAX_GUESSES,
            },
          });
        });
        reply.header('Cache-Control', 'private, no-store');
        return presentRound(updated);
      } catch (error) {
        return economyFailure(request, reply, error);
      }
    },
  );

  app.get<{ Params: { roundId: string; slot: string } }>(
    '/games/rounds/:roundId/audio/:slot',
    async (request, reply) => {
      try {
        const userId = await getUserIdFromRequest(request, reply);
        if (!userId) return;
        const slot = z.coerce.number().int().min(0).max(3).parse(request.params.slot);
        const round = await prisma.gameRound.findFirst({
          where: { id: request.params.roundId, userId, gameKey: 'soundcheck' },
        });
        if (!round) throw new EconomyError('Puzzle not found.', 404);
        const clip = sounds[round.championId]?.[slot];
        if (!clip) throw new EconomyError('This ability clip is unavailable.', 404);
        const audio = await readFile(path.resolve(__dirname, '../../assets/soundcheck', clip.file));
        // Use the same lock as guesses so concurrent listening and solving cannot
        // bypass the penalty. Replays and completed rounds never reduce rewards.
        await withWallet(userId, async (tx) => {
          const current = await tx.gameRound.findFirst({ where: { id: round.id, userId } });
          if (!current) throw new EconomyError('Puzzle not found.', 404);
          if (current.finished) return;
          if (!current.day.startsWith('practice:') && current.day !== utcDay())
            throw new EconomyError('This daily puzzle has ended. Open today’s puzzle.', 409);
          if (!current.listenedSlots.includes(slot))
            await tx.gameRound.update({
              where: { id: current.id },
              data: { listenedSlots: { push: slot } },
            });
        });
        // Serve only audio bytes under an opaque round/slot URL. Never redirect to
        // a champion-named source or expose video frames / title metadata.
        return reply.header('Cache-Control', 'private, no-store').type('audio/mpeg').send(audio);
      } catch (error) {
        return economyFailure(request, reply, error);
      }
    },
  );

  app.post('/games/suggestions', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      const { idea } = z.object({ idea: z.string().trim().min(10).max(3000) }).parse(request.body);
      const suggestion = await prisma.$transaction(async (tx: EconomyTx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const duplicate = await tx.gameSuggestion.findFirst({
          where: { userId, idea, reviewed: false },
        });
        if (duplicate) return duplicate;
        const count = await tx.gameSuggestion.count({
          where: { userId, createdAt: { gte: new Date(Date.now() - 86400000) } },
        });
        if (count >= 5)
          throw new EconomyError(
            'You can send up to five game ideas per day. Please try again tomorrow.',
            429,
          );
        const created = await tx.gameSuggestion.create({ data: { userId, idea } });
        const admins = await tx.user.findMany({
          where: { badges: { some: { key: 'admin' } } },
          select: { id: true },
        });
        if (admins.length)
          await tx.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              fromUserId: userId,
              type: 'ADMIN_TEST' as const,
              message: `[Game Suggestion] A new game idea is ready to review: ${idea.slice(
                0,
                160,
              )}`,
            })),
          });
        return created;
      });
      return reply.code(201).send({ id: suggestion.id });
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });

  app.get('/games/admin/suggestions', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      await requireEconomyAdmin(userId);
      const { reviewed, page } = z
        .object({
          reviewed: z.enum(['true', 'false']).default('false'),
          page: z.coerce.number().int().min(1).default(1),
        })
        .parse(request.query);
      const where = { reviewed: reviewed === 'true' };
      const [suggestions, total] = await Promise.all([
        prisma.gameSuggestion.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * 25,
          take: 25,
          include: { user: { select: { username: true } } },
        }),
        prisma.gameSuggestion.count({ where }),
      ]);
      reply.header('Cache-Control', 'private, no-store');
      return { suggestions, total };
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });

  app.put<{ Params: { id: string } }>('/games/admin/suggestions/:id', async (request, reply) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      await requireEconomyAdmin(userId);
      const { reviewed } = z.object({ reviewed: z.boolean() }).parse(request.body);
      const result = await prisma.gameSuggestion.updateMany({
        where: { id: request.params.id },
        data: {
          reviewed,
          reviewedBy: reviewed ? userId : null,
          reviewedAt: reviewed ? new Date() : null,
        },
      });
      if (!result.count) throw new EconomyError('Suggestion not found.', 404);
      return { success: true };
    } catch (error) {
      return economyFailure(request, reply, error);
    }
  });
}
