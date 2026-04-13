import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { validateRequest } from '../validation';

function parseBoundedInt(raw: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.max(min, Math.min(max, rounded));
}

const STARTER_RIFT_COINS = parseBoundedInt(process.env.RIFTCOINS_STARTER_GRANT, 1500, 0, 5_000_000);
const DEFAULT_PRISMATIC_SUPPLY_CAP = parseBoundedInt(process.env.PRISMATIC_SUPPLY_CAP, 1_000_000, 100_000, 20_000_000);
const DEFAULT_PRISMATIC_BASE_PRICE_RC = parseBoundedInt(process.env.PRISMATIC_BASE_PRICE_RC, 40, 1, 100_000);
const DEFAULT_PRISMATIC_SLOPE_RC = parseBoundedInt(process.env.PRISMATIC_SLOPE_RC, 320, 1, 100_000);
const DEFAULT_PRISMATIC_SELL_SPREAD_BPS = parseBoundedInt(process.env.PRISMATIC_SELL_SPREAD_BPS, 700, 0, 5_000);

const QUEST_DEFINITIONS = {
  DAILY_CHECKIN: {
    title: 'Daily Check-In',
    description: 'Claim this once per day for easy RiftCoins.',
    rewardRiftCoins: 120,
    repeatWindow: 'DAILY',
  },
  COMPLETE_PROFILE: {
    title: 'Complete Profile',
    description: 'Add bio, region, primary role, and at least one language.',
    rewardRiftCoins: 300,
    repeatWindow: 'ONE_TIME',
  },
  CREATE_FIRST_DUO_POST: {
    title: 'Create First Duo Post',
    description: 'Publish your first LFD duo post.',
    rewardRiftCoins: 180,
    repeatWindow: 'ONE_TIME',
  },
  JOIN_FIRST_COMMUNITY: {
    title: 'Join First Community',
    description: 'Join any community to unlock this bonus.',
    rewardRiftCoins: 220,
    repeatWindow: 'ONE_TIME',
  },
} as const;

type QuestKey = keyof typeof QUEST_DEFINITIONS;
const QUEST_KEYS = Object.keys(QUEST_DEFINITIONS) as QuestKey[];

type WalletRow = {
  id: string;
  userId: string;
  riftCoins: number;
  prismaticEssence: number;
  totalRiftCoinsEarned: number;
  totalRiftCoinsSpent: number;
  createdAt: Date;
  updatedAt: Date;
};

type MarketRow = {
  id: string;
  totalSupplyCap: number;
  circulatingSupply: number;
  basePriceRc: number;
  slopeRc: number;
  sellSpreadBps: number;
  lastTradePriceRc: number | null;
};

type TradeDirection = 'BUY_PE' | 'SELL_PE';

const WalletConvertSchema = z.object({
  direction: z.enum(['BUY_PE', 'SELL_PE']),
  amount: z.preprocess((value) => Number(value), z.number().int().min(1).max(50_000)),
});

const WalletQuoteQuerySchema = z.object({
  direction: z.enum(['BUY_PE', 'SELL_PE']),
  amount: z.preprocess((value) => Number(value), z.number().int().min(1).max(50_000)),
});

const WalletTransactionsQuerySchema = z.object({
  limit: z.preprocess((value) => (value === undefined ? 40 : Number(value)), z.number().int().min(1).max(100)).default(40),
  offset: z.preprocess((value) => (value === undefined ? 0 : Number(value)), z.number().int().min(0)).default(0),
  currency: z.enum(['ALL', 'RIFT_COINS', 'PRISMATIC_ESSENCE']).default('ALL'),
});

function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getNextUtcMidnightIso(date = new Date()) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0));
  return next.toISOString();
}

function computeSpotBuyPriceRc(market: MarketRow, supplyOverride?: number) {
  const totalSupplyCap = Math.max(1, market.totalSupplyCap);
  const supply = Math.max(0, Math.min(supplyOverride ?? market.circulatingSupply, totalSupplyCap));
  const utilization = supply / totalSupplyCap;
  return Math.max(1, Math.ceil(market.basePriceRc + (market.slopeRc * utilization)));
}

function computeSpotSellPriceRc(market: MarketRow, supplyOverride?: number) {
  const buyPrice = computeSpotBuyPriceRc(market, supplyOverride);
  const multiplier = (10_000 - market.sellSpreadBps) / 10_000;
  return Math.max(1, Math.floor(buyPrice * multiplier));
}

function computeCurveAreaRc(market: MarketRow, startSupply: number, endSupply: number) {
  const totalSupplyCap = Math.max(1, market.totalSupplyCap);
  const safeStart = Math.max(0, Math.min(startSupply, totalSupplyCap));
  const safeEnd = Math.max(0, Math.min(endSupply, totalSupplyCap));

  if (safeEnd <= safeStart) return 0;

  const baseTerm = market.basePriceRc * (safeEnd - safeStart);
  const squaredDelta = (safeEnd * safeEnd) - (safeStart * safeStart);
  const slopeTerm = (market.slopeRc * squaredDelta) / (2 * totalSupplyCap);

  return baseTerm + slopeTerm;
}

function calculateBuyCostRc(market: MarketRow, quantity: number) {
  const start = market.circulatingSupply;
  const end = start + quantity;
  return Math.max(1, Math.ceil(computeCurveAreaRc(market, start, end)));
}

function calculateSellGrossRc(market: MarketRow, quantity: number) {
  const end = market.circulatingSupply;
  const start = end - quantity;
  return Math.max(1, Math.floor(computeCurveAreaRc(market, start, end)));
}

function calculateSellProceedsRc(market: MarketRow, quantity: number) {
  const gross = calculateSellGrossRc(market, quantity);
  return Math.max(0, Math.floor(gross * ((10_000 - market.sellSpreadBps) / 10_000)));
}

function getQuestClaimWindow(questKey: QuestKey, now = new Date()) {
  const definition = QUEST_DEFINITIONS[questKey];
  return definition.repeatWindow === 'DAILY' ? getUtcDateKey(now) : 'ONE_TIME';
}

async function ensureMarketState(db: any): Promise<MarketRow> {
  const market = await db.prismaticMarket.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      totalSupplyCap: DEFAULT_PRISMATIC_SUPPLY_CAP,
      circulatingSupply: 0,
      basePriceRc: DEFAULT_PRISMATIC_BASE_PRICE_RC,
      slopeRc: DEFAULT_PRISMATIC_SLOPE_RC,
      sellSpreadBps: DEFAULT_PRISMATIC_SELL_SPREAD_BPS,
    },
  });

  return market as MarketRow;
}

async function ensureWalletState(userId: string, db: any): Promise<WalletRow> {
  const existing = await db.wallet.findUnique({ where: { userId } });
  if (existing) {
    return existing as WalletRow;
  }

  try {
    const created = await db.wallet.create({
      data: {
        userId,
        riftCoins: STARTER_RIFT_COINS,
        totalRiftCoinsEarned: STARTER_RIFT_COINS,
      },
    });

    if (STARTER_RIFT_COINS > 0) {
      await db.walletTransaction.create({
        data: {
          walletId: created.id,
          userId,
          currency: 'RIFT_COINS',
          type: 'WELCOME_BONUS',
          amount: STARTER_RIFT_COINS,
          balanceAfter: STARTER_RIFT_COINS,
          note: 'Welcome bonus',
          metadata: { source: 'wallet_init' },
        },
      });
    }

    return created as WalletRow;
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const racedWallet = await db.wallet.findUnique({ where: { userId } });
      if (racedWallet) {
        return racedWallet as WalletRow;
      }
    }
    throw error;
  }
}

function buildMarketSnapshot(market: MarketRow) {
  const spotBuyPriceRc = computeSpotBuyPriceRc(market);
  const spotSellPriceRc = computeSpotSellPriceRc(market);
  const availableSupply = Math.max(0, market.totalSupplyCap - market.circulatingSupply);
  const utilizationPct = market.totalSupplyCap > 0
    ? Number(((market.circulatingSupply / market.totalSupplyCap) * 100).toFixed(2))
    : 0;
  const spotMidPrice = Math.round((spotBuyPriceRc + spotSellPriceRc) / 2);
  const marketCapRc = Math.round(market.circulatingSupply * spotMidPrice);

  return {
    totalSupplyCap: market.totalSupplyCap,
    circulatingSupply: market.circulatingSupply,
    availableSupply,
    utilizationPct,
    spotBuyPriceRc,
    spotSellPriceRc,
    lastTradePriceRc: market.lastTradePriceRc,
    marketCapRc,
    sellSpreadBps: market.sellSpreadBps,
    basePriceRc: market.basePriceRc,
    slopeRc: market.slopeRc,
  };
}

function buildTradeQuote(
  market: MarketRow,
  wallet: WalletRow,
  direction: TradeDirection,
  amount: number
) {
  if (!Number.isInteger(amount) || amount < 1) {
    return {
      direction,
      amount,
      canExecute: false,
      reason: 'Amount must be at least 1.',
    };
  }

  if (direction === 'BUY_PE') {
    const remainingSupply = Math.max(0, market.totalSupplyCap - market.circulatingSupply);
    if (amount > remainingSupply) {
      return {
        direction,
        amount,
        canExecute: false,
        reason: `Only ${remainingSupply.toLocaleString()} Prismatic Essence is currently available.`,
      };
    }

    const riftCoinsCost = calculateBuyCostRc(market, amount);
    const averageUnitPriceRc = Math.max(1, Math.ceil(riftCoinsCost / amount));

    if (wallet.riftCoins < riftCoinsCost) {
      return {
        direction,
        amount,
        canExecute: false,
        reason: `You need ${riftCoinsCost.toLocaleString()} RiftCoins, but only have ${wallet.riftCoins.toLocaleString()}.`,
        riftCoinsCost,
        averageUnitPriceRc,
      };
    }

    const postSupply = market.circulatingSupply + amount;

    return {
      direction,
      amount,
      canExecute: true,
      reason: null,
      riftCoinsCost,
      averageUnitPriceRc,
      postTradeWallet: {
        riftCoins: wallet.riftCoins - riftCoinsCost,
        prismaticEssence: wallet.prismaticEssence + amount,
      },
      postTradeMarket: {
        circulatingSupply: postSupply,
        spotBuyPriceRc: computeSpotBuyPriceRc(market, postSupply),
        spotSellPriceRc: computeSpotSellPriceRc(market, postSupply),
      },
    };
  }

  if (amount > market.circulatingSupply) {
    return {
      direction,
      amount,
      canExecute: false,
      reason: 'Sell amount exceeds global circulating supply.',
    };
  }

  if (amount > wallet.prismaticEssence) {
    return {
      direction,
      amount,
      canExecute: false,
      reason: `You only hold ${wallet.prismaticEssence.toLocaleString()} Prismatic Essence.`,
    };
  }

  const riftCoinsProceeds = calculateSellProceedsRc(market, amount);
  const averageUnitPriceRc = Math.max(1, Math.floor(riftCoinsProceeds / amount));
  const postSupply = market.circulatingSupply - amount;

  return {
    direction,
    amount,
    canExecute: true,
    reason: null,
    riftCoinsProceeds,
    averageUnitPriceRc,
    postTradeWallet: {
      riftCoins: wallet.riftCoins + riftCoinsProceeds,
      prismaticEssence: wallet.prismaticEssence - amount,
    },
    postTradeMarket: {
      circulatingSupply: postSupply,
      spotBuyPriceRc: computeSpotBuyPriceRc(market, postSupply),
      spotSellPriceRc: computeSpotSellPriceRc(market, postSupply),
    },
  };
}

async function buildWalletSummary(userId: string) {
  const [wallet, market] = await Promise.all([
    ensureWalletState(userId, prisma),
    ensureMarketState(prisma),
  ]);

  const marketSnapshot = buildMarketSnapshot(market);
  const prismaticValueInRc = wallet.prismaticEssence * marketSnapshot.spotSellPriceRc;
  const totalEstimatedValueRc = wallet.riftCoins + prismaticValueInRc;

  return {
    wallet: {
      riftCoins: wallet.riftCoins,
      prismaticEssence: wallet.prismaticEssence,
      totalRiftCoinsEarned: wallet.totalRiftCoinsEarned,
      totalRiftCoinsSpent: wallet.totalRiftCoinsSpent,
      updatedAt: wallet.updatedAt,
    },
    market: marketSnapshot,
    portfolio: {
      prismaticValueInRc,
      totalEstimatedValueRc,
    },
    economyGuidance: {
      recommendedPrismaticSupplyCap: 1_000_000,
      recommendedStarterRiftCoins: 1_500,
      recommendedDailyRiftCoinsRange: {
        min: 80,
        max: 220,
      },
      note: 'A 1,000,000 Prismatic Essence cap keeps scarcity meaningful for launch communities while still supporting healthy trading volume.',
    },
  };
}

async function loadQuestStatuses(userId: string) {
  const today = getUtcDateKey();

  const [user, claims] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        bio: true,
        region: true,
        primaryRole: true,
        languages: true,
        _count: {
          select: {
            posts: true,
            communityMemberships: true,
          },
        },
      },
    }),
    prisma.walletQuestClaim.findMany({
      where: {
        userId,
        questKey: {
          in: QUEST_KEYS as any,
        },
      },
      select: {
        questKey: true,
        claimWindow: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) return [];

  return QUEST_KEYS.map((questKey) => {
    const definition = QUEST_DEFINITIONS[questKey];
    const questClaims = claims.filter((claim: any) => claim.questKey === questKey);
    const hasClaimedOnce = questClaims.some((claim: any) => claim.claimWindow === 'ONE_TIME');
    const hasClaimedToday = questClaims.some((claim: any) => claim.claimWindow === today);

    let eligible = true;
    let completed = false;
    let available = false;
    let reason: string | null = null;
    let nextClaimAt: string | null = null;

    if (questKey === 'DAILY_CHECKIN') {
      completed = false;
      available = !hasClaimedToday;
      if (!available) {
        reason = 'Already claimed today.';
        nextClaimAt = getNextUtcMidnightIso();
      }
    }

    if (questKey === 'COMPLETE_PROFILE') {
      const hasBio = Boolean(user.bio && user.bio.trim().length > 0);
      const hasRegion = Boolean(user.region);
      const hasPrimaryRole = Boolean(user.primaryRole);
      const hasLanguage = Array.isArray(user.languages) && user.languages.length > 0;

      eligible = hasBio && hasRegion && hasPrimaryRole && hasLanguage;
      completed = hasClaimedOnce;
      available = eligible && !completed;

      if (!eligible) {
        reason = 'Add bio, region, primary role, and at least one language to unlock this reward.';
      } else if (completed) {
        reason = 'Already claimed.';
      }
    }

    if (questKey === 'CREATE_FIRST_DUO_POST') {
      eligible = (user._count?.posts || 0) > 0;
      completed = hasClaimedOnce;
      available = eligible && !completed;

      if (!eligible) {
        reason = 'Create your first duo post to unlock this reward.';
      } else if (completed) {
        reason = 'Already claimed.';
      }
    }

    if (questKey === 'JOIN_FIRST_COMMUNITY') {
      eligible = (user._count?.communityMemberships || 0) > 0;
      completed = hasClaimedOnce;
      available = eligible && !completed;

      if (!eligible) {
        reason = 'Join your first community to unlock this reward.';
      } else if (completed) {
        reason = 'Already claimed.';
      }
    }

    return {
      key: questKey,
      title: definition.title,
      description: definition.description,
      rewardRiftCoins: definition.rewardRiftCoins,
      repeatWindow: definition.repeatWindow,
      available,
      eligible,
      completed,
      reason,
      nextClaimAt,
    };
  });
}

function mapTransactionRow(transaction: any) {
  return {
    id: transaction.id,
    currency: transaction.currency,
    type: transaction.type,
    amount: transaction.amount,
    balanceAfter: transaction.balanceAfter,
    unitPriceRc: transaction.unitPriceRc,
    note: transaction.note,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt,
  };
}

export default async function walletRoutes(fastify: FastifyInstance) {
  fastify.get('/wallet/summary', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const summary = await buildWalletSummary(userId);
      return reply.send(summary);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to load wallet summary');
      return reply.code(500).send({ error: 'Failed to load wallet summary.' });
    }
  });

  fastify.get('/wallet/transactions', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await ensureWalletState(userId, prisma);

      const validation = validateRequest(WalletTransactionsQuerySchema, request.query || {});
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid query parameters', details: validation.errors });
      }

      const { limit, offset, currency } = validation.data;
      const where: any = { userId };
      if (currency !== 'ALL') {
        where.currency = currency;
      }

      const [transactions, total] = await Promise.all([
        prisma.walletTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.walletTransaction.count({ where }),
      ]);

      return reply.send({
        transactions: transactions.map(mapTransactionRow),
        total,
        limit,
        offset,
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to load wallet transactions');
      return reply.code(500).send({ error: 'Failed to load wallet transactions.' });
    }
  });

  fastify.get('/wallet/quote', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(WalletQuoteQuerySchema, request.query || {});
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid quote parameters', details: validation.errors });
      }

      const direction = validation.data.direction as TradeDirection;
      const amount = Number(validation.data.amount);
      if (!Number.isInteger(amount) || amount < 1) {
        return reply.code(400).send({ error: 'Amount must be a positive integer.' });
      }

      const [wallet, market] = await Promise.all([
        ensureWalletState(userId, prisma),
        ensureMarketState(prisma),
      ]);

      const quote = buildTradeQuote(market, wallet, direction, amount);
      return reply.send({
        direction,
        amount,
        quote,
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to generate wallet quote');
      return reply.code(500).send({ error: 'Failed to generate quote.' });
    }
  });

  fastify.post('/wallet/convert', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const validation = validateRequest(WalletConvertSchema, request.body || {});
      if (!validation.success) {
        return reply.code(400).send({ error: 'Invalid conversion payload', details: validation.errors });
      }

      const direction = validation.data.direction as TradeDirection;
      const amount = Number(validation.data.amount);
      if (!Number.isInteger(amount) || amount < 1) {
        return reply.code(400).send({ error: 'Amount must be a positive integer.' });
      }

      const tradeResult = await prisma.$transaction(async (tx: any) => {
        const [wallet, market] = await Promise.all([
          ensureWalletState(userId, tx),
          ensureMarketState(tx),
        ]);

        const quote = buildTradeQuote(market, wallet, direction, amount);
        if (!quote.canExecute) {
          throw new Error(quote.reason || 'Trade cannot be executed.');
        }

        if (direction === 'BUY_PE') {
          const riftCoinsCost = quote.riftCoinsCost as number;
          const averageUnitPriceRc = quote.averageUnitPriceRc as number;
          const postWallet = quote.postTradeWallet as { riftCoins: number; prismaticEssence: number };
          const postMarket = quote.postTradeMarket as { circulatingSupply: number };

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              riftCoins: postWallet.riftCoins,
              prismaticEssence: postWallet.prismaticEssence,
              totalRiftCoinsSpent: { increment: riftCoinsCost },
            },
          });

          await tx.prismaticMarket.update({
            where: { id: market.id },
            data: {
              circulatingSupply: postMarket.circulatingSupply,
              lastTradePriceRc: averageUnitPriceRc,
            },
          });

          await tx.walletTransaction.createMany({
            data: [
              {
                walletId: wallet.id,
                userId,
                currency: 'RIFT_COINS',
                type: 'CONVERT_BUY_PRISMATIC',
                amount: -riftCoinsCost,
                balanceAfter: postWallet.riftCoins,
                unitPriceRc: averageUnitPriceRc,
                note: `Bought ${amount.toLocaleString()} Prismatic Essence`,
                metadata: { direction, amount },
              },
              {
                walletId: wallet.id,
                userId,
                currency: 'PRISMATIC_ESSENCE',
                type: 'CONVERT_BUY_PRISMATIC',
                amount,
                balanceAfter: postWallet.prismaticEssence,
                unitPriceRc: averageUnitPriceRc,
                note: `Purchased with ${riftCoinsCost.toLocaleString()} RiftCoins`,
                metadata: { direction, amount },
              },
            ],
          });

          return {
            direction,
            amount,
            riftCoinsCost,
            averageUnitPriceRc,
          };
        }

        const riftCoinsProceeds = quote.riftCoinsProceeds as number;
        const averageUnitPriceRc = quote.averageUnitPriceRc as number;
        const postWallet = quote.postTradeWallet as { riftCoins: number; prismaticEssence: number };
        const postMarket = quote.postTradeMarket as { circulatingSupply: number };

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            riftCoins: postWallet.riftCoins,
            prismaticEssence: postWallet.prismaticEssence,
            totalRiftCoinsEarned: { increment: riftCoinsProceeds },
          },
        });

        await tx.prismaticMarket.update({
          where: { id: market.id },
          data: {
            circulatingSupply: postMarket.circulatingSupply,
            lastTradePriceRc: averageUnitPriceRc,
          },
        });

        await tx.walletTransaction.createMany({
          data: [
            {
              walletId: wallet.id,
              userId,
              currency: 'PRISMATIC_ESSENCE',
              type: 'CONVERT_SELL_PRISMATIC',
              amount: -amount,
              balanceAfter: postWallet.prismaticEssence,
              unitPriceRc: averageUnitPriceRc,
              note: `Sold ${amount.toLocaleString()} Prismatic Essence`,
              metadata: { direction, amount },
            },
            {
              walletId: wallet.id,
              userId,
              currency: 'RIFT_COINS',
              type: 'CONVERT_SELL_PRISMATIC',
              amount: riftCoinsProceeds,
              balanceAfter: postWallet.riftCoins,
              unitPriceRc: averageUnitPriceRc,
              note: `Converted into ${riftCoinsProceeds.toLocaleString()} RiftCoins`,
              metadata: { direction, amount },
            },
          ],
        });

        return {
          direction,
          amount,
          riftCoinsProceeds,
          averageUnitPriceRc,
        };
      });

      const summary = await buildWalletSummary(userId);
      return reply.send({
        success: true,
        trade: {
          ...tradeResult,
          executedAt: new Date().toISOString(),
        },
        summary,
      });
    } catch (error: any) {
      if (error?.message && typeof error.message === 'string' && error.message.length < 160) {
        return reply.code(400).send({ error: error.message });
      }
      request.log.error({ err: error }, 'Failed to execute wallet conversion');
      return reply.code(500).send({ error: 'Failed to execute conversion.' });
    }
  });

  fastify.get('/wallet/quests', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      await ensureWalletState(userId, prisma);
      const quests = await loadQuestStatuses(userId);

      return reply.send({ quests });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to load wallet quests');
      return reply.code(500).send({ error: 'Failed to load wallet quests.' });
    }
  });

  fastify.post('/wallet/quests/:questKey/claim', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const rawQuestKey = String(request.params?.questKey || '').toUpperCase();
      if (!QUEST_KEYS.includes(rawQuestKey as QuestKey)) {
        return reply.code(404).send({ error: 'Quest not found.' });
      }

      const questKey = rawQuestKey as QuestKey;
      const definition = QUEST_DEFINITIONS[questKey];
      const statuses = await loadQuestStatuses(userId);
      const status = statuses.find((entry: any) => entry.key === questKey);

      if (!status) {
        return reply.code(404).send({ error: 'Quest status not found.' });
      }

      if (!status.available) {
        return reply.code(400).send({ error: status.reason || 'Quest is not currently claimable.' });
      }

      const claimWindow = getQuestClaimWindow(questKey);
      const reward = definition.rewardRiftCoins;

      try {
        await prisma.$transaction(async (tx: any) => {
          const wallet = await ensureWalletState(userId, tx);
          const nextRiftCoins = wallet.riftCoins + reward;

          await tx.walletQuestClaim.create({
            data: {
              userId,
              questKey,
              claimWindow,
              rewardRiftCoins: reward,
              metadata: { source: 'wallet_quest' },
            },
          });

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              riftCoins: nextRiftCoins,
              totalRiftCoinsEarned: { increment: reward },
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId,
              currency: 'RIFT_COINS',
              type: 'QUEST_REWARD',
              amount: reward,
              balanceAfter: nextRiftCoins,
              note: `${definition.title} reward`,
              metadata: { questKey, claimWindow },
            },
          });
        });
      } catch (error: any) {
        if (error?.code === 'P2002') {
          return reply.code(409).send({ error: 'Quest already claimed for this window.' });
        }
        throw error;
      }

      const [summary, quests] = await Promise.all([
        buildWalletSummary(userId),
        loadQuestStatuses(userId),
      ]);

      return reply.send({
        success: true,
        rewardRiftCoins: reward,
        questKey,
        summary,
        quests,
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to claim wallet quest');
      return reply.code(500).send({ error: 'Failed to claim quest.' });
    }
  });
}
