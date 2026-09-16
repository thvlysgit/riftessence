import { GameRound } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { getUserIdFromRequest } from '../middleware/auth';
import {
  EconomyTx,
  EconomyError,
  economyFailure,
  postEntry,
  readSettings,
  utcDay,
  withWallet,
} from '../services/economy';
import {
  applyRecipeAction,
  expireRecipes,
  presentRecipeRound,
  readRecipePuzzle,
  recipeActionSchema,
  recipeIndex,
  recipeReward,
  recipeMistakes,
  repairRecipeTrays,
  RECIPE_COUNT,
} from '../services/recipeRush';

export async function resumeRecipeRound(tx: EconomyTx, round: GameRound) {
  if (round.gameKey !== 'recipe-rush' || round.finished) return round;
  const puzzle = readRecipePuzzle(round);
  const expired = expireRecipes(puzzle);
  const repaired = repairRecipeTrays(puzzle, round.id);
  if (!expired && !repaired) return round;
  return tx.gameRound.update({
    where: { id: round.id },
    data: {
      recipePuzzle: puzzle,
      finished: expired,
      won: false,
    },
  });
}

export default async function recipeRushRoutes(app: FastifyInstance) {
  app.post<{ Params: { roundId: string } }>(
    '/games/rounds/:roundId/recipe',
    async (request, reply) => {
      try {
        const userId = await getUserIdFromRequest(request, reply);
        if (!userId) return;
        const input = recipeActionSchema.parse(request.body);
        const updated = await withWallet(userId, async (tx, wallet) => {
          const round = await tx.gameRound.findFirst({
            where: { id: request.params.roundId, userId, gameKey: 'recipe-rush' },
          });
          if (!round) throw new EconomyError('Puzzle not found.', 404);
          const practice = round.day.startsWith('practice:');
          if (!practice && round.day !== utcDay())
            throw new EconomyError('This daily puzzle has ended. Open today’s puzzle.', 409);
          if (round.finished) return round;
          const puzzle = readRecipePuzzle(round);
          repairRecipeTrays(puzzle, round.id);
          if (!expireRecipes(puzzle)) applyRecipeAction(puzzle, input);
          const finished = recipeIndex(puzzle) === RECIPE_COUNT;
          let rewardPaid = 0;
          if (finished && !practice) {
            const settings = await readSettings(tx);
            const earned = await tx.gameRound.aggregate({
              where: { userId, day: round.day },
              _sum: { rewardPaid: true },
            });
            rewardPaid = settings.gameRewardsEnabled
              ? Math.max(
                  0,
                  Math.min(
                    recipeReward(puzzle, round.rewardOffer),
                    settings.dailyGameCap - (earned._sum.rewardPaid || 0),
                  ),
                )
              : 0;
            if (rewardPaid)
              await postEntry(tx, wallet, rewardPaid, 'GAME_REWARD', 'Recipe Rush completed', {
                roundId: round.id,
                gameKey: round.gameKey,
                day: round.day,
                crafted: puzzle.recipes.filter((r) => r.status === 'crafted').length,
                mistakes: puzzle.recipes.reduce((sum, r) => sum + recipeMistakes(r), 0),
              });
          }
          return tx.gameRound.update({
            where: { id: round.id },
            data: {
              recipePuzzle: puzzle,
              finished,
              rewardPaid,
              won: finished && puzzle.recipes.every((recipe) => recipe.status === 'crafted'),
            },
          });
        });
        reply.header('Cache-Control', 'private, no-store');
        return presentRecipeRound(updated);
      } catch (error) {
        return economyFailure(request, reply, error);
      }
    },
  );
}
