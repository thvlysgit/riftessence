import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { logAdminAction } from '../utils/auditLog';
import crypto from 'crypto';
import { EconomyError, economyFailure, operationKey, postEntry, walletOperation, withWallet } from '../services/economy';

const MIN_AD_PE = 500;
const MAX_AD_PE = 1_000_000;
const impressionsForPe = (pe: number) => (pe / 100) * 3;

// Helper to check if user is admin
async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { badges: true },
  });
  return (user?.badges || []).some((b: any) => b.key === 'admin');
}

// Helper to hash IP for deduplication (privacy-preserving)
function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + 'ad_salt').digest('hex').substring(0, 16);
}

function isValidHttpUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && !parsed.username && !parsed.password &&
      parsed.hostname !== 'localhost' && !parsed.hostname.endsWith('.local') &&
      !/^(?:127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(parsed.hostname);
  } catch {
    return false;
  }
}

const VALID_AD_REGIONS = new Set([
  'NA',
  'EUW',
  'EUNE',
  'KR',
  'JP',
  'OCE',
  'LAN',
  'LAS',
  'BR',
  'RU',
]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getRequestedAdCredits(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 1;
  return Math.max(1, Math.round(diffMs / MS_PER_DAY));
}

function truncateForDm(value: string, max = 200): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}...`;
}

type CreatorMeta = {
  username: string;
  isAdmin: boolean;
};

export default async function adsRoutes(fastify: any) {
  const notifyAdminsAboutAdRequest = async (input: {
    adId: string;
    requesterId: string;
    requesterUsername: string;
    title: string;
    feedLabel: string;
    regionLabel: string;
    peAmount: number;
    impressions: number;
  }) => {
    const marker = `[ad:${input.adId}]`;
    const alreadyNotified = await prisma.notification.findFirst({ where: { fromUserId: input.requesterId, message: { contains: marker } } });
    if (alreadyNotified) return;
    const admins = await prisma.user.findMany({
      where: {
        badges: {
          some: { key: 'admin' },
        },
      },
      select: {
        id: true,
        discordDmNotifications: true,
        discordAccount: {
          select: {
            discordId: true,
          },
        },
      },
    });

    if (admins.length === 0) return;

    const message = `[Ad Request] ${input.requesterUsername} submitted "${input.title}" (${input.feedLabel}, ${input.regionLabel}, ${input.peAmount} PE for ${input.impressions} impressions). ${marker}`;

    await prisma.notification.createMany({
      data: admins.map((admin: any) => ({
        userId: admin.id,
        type: 'ADMIN_TEST',
        fromUserId: input.requesterId,
        message,
      })),
    });

    const dmTargets = admins
      .filter((admin: any) => admin.discordDmNotifications && admin.discordAccount?.discordId)
      .map((admin: any) => admin.discordAccount.discordId as string);

    if (dmTargets.length === 0) return;

    const dmPreview = truncateForDm(
      `New ad request from ${input.requesterUsername}: ${input.title} (${input.feedLabel}, ${input.regionLabel}, ${input.peAmount} PE for ${input.impressions} impressions).`
    );

    await prisma.discordDmQueue.createMany({
      data: dmTargets.map((discordId: string) => ({
        recipientDiscordId: discordId,
        senderUsername: input.requesterUsername,
        messagePreview: dmPreview,
        conversationId: `ad-request:${input.adId}`,
      })),
    });
  };

  // GET /api/ads - Get active ads for a feed (public)
  fastify.get('/ads', async (request: any, reply: any) => {
    try {
      const { feed, region, rank } = request.query as { feed?: string; region?: string; rank?: string };
      
      const now = new Date();
      
      // Build targeting query
      const where: any = {
        isActive: true,
        reviewStatus: 'APPROVED',
        OR: [
          { impressionBudget: null, startDate: { lte: now }, endDate: { gte: now } },
          { impressionBudget: { not: null }, remainingImpressions: { gt: 0 } },
        ],
      };
      
      // Filter by target feeds
      if (feed) {
        where.AND = [{ OR: [
          { targetFeeds: { isEmpty: true } },  // No targeting = show everywhere
          { targetFeeds: { has: feed } },
        ] }];
      }
      
      const ads = await prisma.ad.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          targetUrl: true,
          targetRegions: true,
          targetMinRank: true,
          targetMaxRank: true,
          targetFeeds: true,
          priority: true,
        },
      });
      
      // Client-side will handle region/rank filtering based on user's profile
      return reply.send({ ads });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch ads' });
    }
  });

  // GET /api/ads/settings - Get ad display settings (public)
  fastify.get('/ads/settings', async (request: any, reply: any) => {
    try {
      let settings = await prisma.adSettings.findUnique({
        where: { id: 'default' },
      });
      
      // Create default settings if not exists
      if (!settings) {
        settings = await prisma.adSettings.create({
          data: {
            id: 'default',
            duoFeedAdFrequency: 5,
            lftFeedAdFrequency: 5,
          },
        });
      }
      
      return reply.send({
        duoFeedAdFrequency: settings.duoFeedAdFrequency,
        lftFeedAdFrequency: settings.lftFeedAdFrequency,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch ad settings' });
    }
  });

  fastify.get('/ads/my-requests', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      const requests = await prisma.ad.findMany({ where: { createdBy: userId }, orderBy: { createdAt: 'desc' }, take: 20,
        select: { id: true, title: true, isActive: true, endDate: true, reviewStatus: true, impressionBudget: true, remainingImpressions: true, peSpent: true } });
      return { requests };
    } catch (error) { request.log.error(error); return reply.code(500).send({ error: 'Could not load your requests.' }); }
  });

  // A request buys a fixed impression budget. Rejection refunds it in full.
  fastify.post('/ads/request-slot', { config: { rateLimit: { max: 5, timeWindow: '1 day' } } }, async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { title, description, imageUrl, targetUrl, feed, peAmount, targetRegion, discordContact, specialRequests } = (request.body || {}) as {
        title?: string;
        description?: string;
        imageUrl?: string;
        targetUrl?: string;
        feed?: string;
        peAmount?: number;
        targetRegion?: string;
        discordContact?: string;
        specialRequests?: string;
      };

      if ((discordContact !== undefined && typeof discordContact !== 'string') || (specialRequests !== undefined && typeof specialRequests !== 'string')) {
        return reply.code(400).send({ error: 'Discord contact and special requests must be text.' });
      }
      const normalizedDiscord = (discordContact || '').trim();
      const normalizedRequests = (specialRequests || '').trim();
      if (normalizedDiscord.length > 100 || normalizedRequests.length > 3000) {
        return reply.code(400).send({ error: 'Discord contact must be at most 100 characters and special requests at most 3,000 characters.' });
      }

      const normalizedTitle = String(title || '').trim();
      const normalizedImageUrl = String(imageUrl || '').trim();
      const normalizedTargetUrl = String(targetUrl || '').trim();
      const normalizedDescription = String(description || '').trim();
      if (normalizedDescription.length > 500 || normalizedImageUrl.length > 2000 || normalizedTargetUrl.length > 2000) {
        return reply.code(400).send({ error: 'Description or URL is too long.' });
      }

      if (!normalizedTitle || normalizedTitle.length < 3 || normalizedTitle.length > 80) {
        return reply.code(400).send({ error: 'Title must be between 3 and 80 characters.' });
      }

      if (!isValidHttpUrl(normalizedImageUrl) || !isValidHttpUrl(normalizedTargetUrl)) {
        return reply.code(400).send({ error: 'Image and destination must be public HTTPS URLs.' });
      }

      const normalizedFeed = String(feed || '').trim().toLowerCase();
      const targetFeeds = normalizedFeed === 'duo' || normalizedFeed === 'lft' ? [normalizedFeed] : [];

      const normalizedRegion = String(targetRegion || '').trim().toUpperCase();
      const targetRegions = normalizedRegion && normalizedRegion !== 'ALL'
        ? [normalizedRegion]
        : [];

      if (targetRegions.length > 0 && !VALID_AD_REGIONS.has(targetRegions[0])) {
        return reply.code(400).send({ error: 'Invalid target region.' });
      }

      if (typeof peAmount !== 'number' || !Number.isSafeInteger(peAmount) || peAmount < MIN_AD_PE || peAmount > MAX_AD_PE || peAmount % 100 !== 0) {
        return reply.code(400).send({ error: 'Choose at least 500 PE in increments of 100.' });
      }
      const impressions = impressionsForPe(peAmount);
      const key = operationKey(request);
      const requestResult = await walletOperation(userId, key, { title: normalizedTitle, description: normalizedDescription, imageUrl: normalizedImageUrl, targetUrl: normalizedTargetUrl, targetFeeds, targetRegions, peAmount, normalizedDiscord, normalizedRequests }, async (tx, wallet) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { username: true, discordAccount: { select: { username: true } } },
        });

        if (!user) throw new EconomyError('User not found.', 404);
        const pendingCount = await tx.ad.count({ where: { createdBy: userId, reviewStatus: 'PENDING' } });
        if (pendingCount >= 3) throw new EconomyError('You already have three requests awaiting review.');

        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + MS_PER_DAY);

        const ad = await tx.ad.create({
          data: {
            title: normalizedTitle,
            description: normalizedDescription || 'Community ad request (pending staff review).',
            imageUrl: normalizedImageUrl,
            targetUrl: normalizedTargetUrl,
            targetRegions: targetRegions as any,
            targetFeeds,
            startDate,
            endDate,
            priority: 0,
            isActive: false,
            createdBy: userId,
            requestCreditsSpent: 0,
            reviewStatus: 'PENDING',
            peSpent: peAmount,
            impressionBudget: impressions,
            remainingImpressions: impressions,
            discordContact: normalizedDiscord || user.discordAccount?.username || null,
            specialRequests: normalizedRequests || null,
          },
          select: {
            id: true,
            title: true,
            targetUrl: true,
            imageUrl: true,
            targetRegions: true,
            targetFeeds: true,
            startDate: true,
            endDate: true,
            isActive: true,
            reviewStatus: true,
            createdAt: true,
          },
        });
        await postEntry(tx, wallet, -peAmount, 'AD_PURCHASE', `Ad campaign: ${normalizedTitle}`, { adId: ad.id, impressions });
        await tx.adPurchase.create({ data: { adId: ad.id, purchaserId: userId, peAmount, impressions } });
        return {
          ad: { ...ad, startDate: ad.startDate.toISOString(), endDate: ad.endDate.toISOString(), createdAt: ad.createdAt.toISOString() },
          requesterUsername: user.username,
        };
      });

      const feedLabel = targetFeeds.length > 0 ? targetFeeds.join(', ') : 'all feeds';
      const regionLabel = targetRegions.length > 0 ? targetRegions.join(', ') : 'all regions';

      try {
        await notifyAdminsAboutAdRequest({
          adId: requestResult.ad.id,
          requesterId: userId,
          requesterUsername: requestResult.requesterUsername,
          title: normalizedTitle,
          feedLabel,
          regionLabel,
          peAmount,
          impressions,
        });
      } catch (notifyError: any) {
        fastify.log.error(notifyError, 'Failed to dispatch ad request admin notifications');
      }

      return reply.send({
        success: true,
        ad: requestResult.ad,
        peSpent: peAmount,
        impressions,
        message: `Your ${impressions}-impression campaign is awaiting approval. If it is rejected, ${peAmount} PE will be refunded.`,
      });
    } catch (error: any) {
      return economyFailure(request, reply, error);
    }
  });

  // POST /api/ads/impression - Track an ad impression
  fastify.post('/ads/impression', { config: { rateLimit: { max: 60, timeWindow: '15 minutes' } } }, async (request: any, reply: any) => {
    try {
      const { adId, feed } = (request.body || {}) as { adId: string; feed: string };
      const userId = await getUserIdFromRequest(request as any, reply as any, false);
      if (typeof adId !== 'string' || !adId || !['duo', 'lft'].includes(feed)) {
        return reply.code(400).send({ error: 'Valid adId and feed are required' });
      }
      const ipHash = hashIp(request.ip || 'unknown');
      const counted = await prisma.$transaction(async (tx: any) => {
        // Serializing by ad guarantees two concurrent views cannot spend the last impression twice.
        await tx.$queryRaw`SELECT "id" FROM "Ad" WHERE "id" = ${adId} FOR UPDATE`;
        const ad = await tx.ad.findUnique({ where: { id: adId } });
        const now = new Date();
        if (!ad || !ad.isActive || ad.reviewStatus !== 'APPROVED' ||
          (ad.targetFeeds.length && !ad.targetFeeds.includes(feed)) ||
          (ad.impressionBudget === null && (ad.startDate > now || ad.endDate < now)) ||
          (ad.impressionBudget !== null && (!ad.remainingImpressions || ad.remainingImpressions <= 0))) return false;

        const existing = await tx.adImpression.findFirst({
          where: { adId, ipHash, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
        });
        if (existing) return false;
        await tx.adImpression.create({ data: { adId, userId: userId || null, ipHash, feed } });
        if (ad.impressionBudget !== null) {
          const remaining = ad.remainingImpressions - 1;
          await tx.ad.update({ where: { id: adId }, data: { remainingImpressions: remaining, ...(remaining === 0 ? { isActive: false } : {}) } });
        }
        return true;
      });
      return reply.send({ success: true, counted });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to track impression' });
    }
  });

  // POST /api/ads/click - Track an ad click
  fastify.post('/ads/click', { config: { rateLimit: { max: 60, timeWindow: '15 minutes' } } }, async (request: any, reply: any) => {
    try {
      const { adId, feed } = (request.body || {}) as { adId: string; feed: string };
      const userId = await getUserIdFromRequest(request as any, reply as any, false);
      
      if (typeof adId !== 'string' || !adId || !['duo', 'lft'].includes(feed)) {
        return reply.code(400).send({ error: 'Valid adId and feed are required' });
      }
      const ad = await prisma.ad.findUnique({ where: { id: adId }, select: { isActive: true, reviewStatus: true, targetFeeds: true } });
      if (!ad || ad.reviewStatus !== 'APPROVED' || (ad.targetFeeds.length && !ad.targetFeeds.includes(feed))) {
        return reply.code(404).send({ error: 'Ad not available' });
      }
      const ipHash = hashIp(request.ip || 'unknown');
      if (!ad.isActive) {
        const viewed = await prisma.adImpression.findFirst({ where: { adId, ipHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
        if (!viewed) return reply.send({ success: true, counted: false });
      }
      const recent = await prisma.adClick.findFirst({ where: { adId, ipHash, createdAt: { gte: new Date(Date.now() - 30_000) } } });
      if (recent) return reply.send({ success: true, counted: false });
      await prisma.adClick.create({
        data: {
          adId,
          userId: userId || null,
          ipHash,
          feed,
        },
      });
      
      return reply.send({ success: true, counted: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to track click' });
    }
  });

  fastify.get('/ads/my-dashboard', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      const ads = await prisma.ad.findMany({
        where: { createdBy: userId, reviewStatus: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, imageUrl: true, isActive: true, impressionBudget: true, remainingImpressions: true, peSpent: true, startDate: true, endDate: true, _count: { select: { impressions: true, clicks: true } } },
      });
      return reply.send({ ads: ads.map((ad: any) => ({ ...ad, impressionCount: ad._count.impressions, clickCount: ad._count.clicks, _count: undefined })) });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Could not load ad dashboards.' });
    }
  });

  fastify.get('/ads/dashboard/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      const { id } = request.params as { id: string };
      const ad = await prisma.ad.findUnique({ where: { id }, include: { _count: { select: { impressions: true, clicks: true } } } });
      if (!ad) return reply.code(404).send({ error: 'Ad not found.' });
      if (ad.createdBy !== userId && !(await isAdmin(userId))) return reply.code(403).send({ error: 'This dashboard is private.' });
      if (ad.reviewStatus !== 'APPROVED') return reply.code(404).send({ error: 'Dashboard available after approval.' });

      const since = new Date(Date.now() - 29 * MS_PER_DAY);
      since.setUTCHours(0, 0, 0, 0);
      const [impressionDays, clickDays, impressionsByFeed, clicksByFeed, purchases] = await Promise.all([
        prisma.$queryRaw<Array<{ day: string; count: number }>>`SELECT DATE("createdAt")::text AS day, COUNT(*)::int AS count FROM "AdImpression" WHERE "adId" = ${id} AND "createdAt" >= ${since} GROUP BY DATE("createdAt") ORDER BY day`,
        prisma.$queryRaw<Array<{ day: string; count: number }>>`SELECT DATE("createdAt")::text AS day, COUNT(*)::int AS count FROM "AdClick" WHERE "adId" = ${id} AND "createdAt" >= ${since} GROUP BY DATE("createdAt") ORDER BY day`,
        prisma.adImpression.groupBy({ by: ['feed'], where: { adId: id }, _count: { _all: true } }),
        prisma.adClick.groupBy({ by: ['feed'], where: { adId: id }, _count: { _all: true } }),
        prisma.adPurchase.findMany({ where: { adId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, peAmount: true, impressions: true, refundedAt: true, createdAt: true } }),
      ]);
      const daily = new Map<string, { day: string; impressions: number; clicks: number }>();
      for (const row of impressionDays) daily.set(row.day, { day: row.day, impressions: row.count, clicks: 0 });
      for (const row of clickDays) {
        const value = daily.get(row.day) || { day: row.day, impressions: 0, clicks: 0 };
        value.clicks = row.count;
        daily.set(row.day, value);
      }
      const feeds = new Map<string, { feed: string; impressions: number; clicks: number }>();
      for (const row of impressionsByFeed) feeds.set(row.feed, { feed: row.feed, impressions: row._count._all, clicks: 0 });
      for (const row of clicksByFeed) {
        const value = feeds.get(row.feed) || { feed: row.feed, impressions: 0, clicks: 0 };
        value.clicks = row._count._all;
        feeds.set(row.feed, value);
      }
      return reply.send({
        ad: { id: ad.id, title: ad.title, imageUrl: ad.imageUrl, targetUrl: ad.targetUrl, targetFeeds: ad.targetFeeds, targetRegions: ad.targetRegions, createdBy: ad.createdBy, isActive: ad.isActive, impressionBudget: ad.impressionBudget, remainingImpressions: ad.remainingImpressions, peSpent: ad.peSpent, startDate: ad.startDate, endDate: ad.endDate },
        metrics: { impressions: ad._count.impressions, clicks: ad._count.clicks, ctr: ad._count.impressions ? Number((ad._count.clicks / ad._count.impressions * 100).toFixed(2)) : 0 },
        daily: Array.from({ length: 30 }, (_, index) => {
          const day = new Date(since.getTime() + index * MS_PER_DAY).toISOString().slice(0, 10);
          return daily.get(day) || { day, impressions: 0, clicks: 0 };
        }),
        feeds: [...feeds.values()],
        purchases,
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Could not load ad dashboard.' });
    }
  });

  fastify.get('/ads/admin/analytics', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      if (!(await isAdmin(userId))) return reply.code(403).send({ error: 'Admin access required' });
      const [totalAds, activeAds, pendingAds, paidAds, impressions, clicks, purchases, recentPurchases] = await Promise.all([
        prisma.ad.count(),
        prisma.ad.count({ where: { isActive: true, reviewStatus: 'APPROVED' } }),
        prisma.ad.count({ where: { reviewStatus: 'PENDING' } }),
        prisma.ad.count({ where: { impressionBudget: { not: null }, reviewStatus: 'APPROVED' } }),
        prisma.adImpression.count(),
        prisma.adClick.count(),
        prisma.adPurchase.aggregate({ _sum: { peAmount: true, impressions: true }, _count: { _all: true }, where: { refundedAt: null } }),
        prisma.adPurchase.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
      ]);
      const adIds = [...new Set(recentPurchases.map((purchase: any) => purchase.adId))];
      const userIds = [...new Set(recentPurchases.map((purchase: any) => purchase.purchaserId))];
      const [ads, users] = await Promise.all([
        prisma.ad.findMany({ where: { id: { in: adIds } }, select: { id: true, title: true, reviewStatus: true } }),
        prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } }),
      ]);
      const adDetails = new Map<string, { title: string; reviewStatus: string }>(ads.map((ad: any) => [ad.id, { title: ad.title, reviewStatus: ad.reviewStatus }]));
      const usernames = new Map<string, string>(users.map((user: any) => [user.id, user.username]));
      return reply.send({
        totals: { totalAds, activeAds, pendingAds, paidAds, impressions, clicks, purchases: purchases._count._all, peSpent: purchases._sum.peAmount || 0, impressionsPurchased: purchases._sum.impressions || 0 },
        recentPurchases: recentPurchases.map((purchase: any) => ({ ...purchase, adTitle: adDetails.get(purchase.adId)?.title || 'Deleted ad', dashboardAvailable: adDetails.get(purchase.adId)?.reviewStatus === 'APPROVED', username: usernames.get(purchase.purchaserId) || 'Former user' })),
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Could not load ad analytics.' });
    }
  });

  // ============================================================
  // Admin-only routes
  // ============================================================

  // GET /api/ads/admin - Get all ads with stats (admin only)
  fastify.get('/ads/admin', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      
      if (!(await isAdmin(userId))) {
        return reply.code(403).send({ error: 'Admin access required' });
      }
      
      const ads = await prisma.ad.findMany({
        where: { reviewStatus: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              impressions: true,
              clicks: true,
            },
          },
        },
      });

      const creatorIds = Array.from(new Set(ads.map((ad: any) => ad.createdBy).filter(Boolean)));
      const creators = creatorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: {
              id: true,
              username: true,
              badges: {
                select: { key: true },
              },
            },
          })
        : [];

      const creatorMap = new Map<string, CreatorMeta>(
        creators.map((creator: any) => [
          creator.id,
          {
            username: creator.username,
            isAdmin: (creator.badges || []).some((badge: any) => badge.key === 'admin'),
          },
        ])
      );
      
      const formatted = ads.map((ad: any) => ({
        ...ad,
        createdByUsername: creatorMap.get(ad.createdBy)?.username || null,
        createdByIsAdmin: Boolean(creatorMap.get(ad.createdBy)?.isAdmin),
        impressionCount: ad._count.impressions,
        clickCount: ad._count.clicks,
        ctr: ad._count.impressions > 0 
          ? ((ad._count.clicks / ad._count.impressions) * 100).toFixed(2) + '%'
          : '0%',
      }));
      
      return reply.send({ ads: formatted });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch ads' });
    }
  });

  // GET /api/ads/admin/requests - Get pending user-submitted ad requests (admin only)
  fastify.get('/ads/admin/requests', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      if (!(await isAdmin(userId))) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const ads = await prisma.ad.findMany({
        where: { reviewStatus: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              impressions: true,
              clicks: true,
            },
          },
        },
      });

      const creatorIds = Array.from(new Set(ads.map((ad: any) => ad.createdBy).filter(Boolean)));
      const creators = creatorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: {
              id: true,
              username: true,
              badges: {
                select: { key: true },
              },
            },
          })
        : [];

      const creatorMap = new Map<string, CreatorMeta>(
        creators.map((creator: any) => [
          creator.id,
          {
            username: creator.username,
            isAdmin: (creator.badges || []).some((badge: any) => badge.key === 'admin'),
          },
        ])
      );

      const requests = ads
        .filter((ad: any) => ad.requestCreditsSpent !== null || !creatorMap.get(ad.createdBy)?.isAdmin)
        .map((ad: any) => ({
          ...ad,
          requesterUsername: creatorMap.get(ad.createdBy)?.username || null,
          requestedCredits: ad.requestCreditsSpent ?? getRequestedAdCredits(ad.startDate, ad.endDate),
          impressionCount: ad._count.impressions,
          clickCount: ad._count.clicks,
          ctr: ad._count.impressions > 0
            ? ((ad._count.clicks / ad._count.impressions) * 100).toFixed(2) + '%'
            : '0%',
        }));

      return reply.send({ requests });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch ad requests' });
    }
  });

  // POST /api/ads/admin/requests/:id/approve - Promote request to managed ad library (admin only)
  fastify.post('/ads/admin/requests/:id/approve', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      if (!(await isAdmin(userId))) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const { id } = request.params as { id: string };
      const { priority, durationDays } = (request.body || {}) as { priority?: number; durationDays?: number };

      const existing = await prisma.ad.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: 'Ad request not found' });
      }

      if (existing.reviewStatus !== 'PENDING') {
        return reply.code(409).send({ error: 'This request has already been reviewed.' });
      }

      const nextStartDate = new Date();
      const parsedDays = Number(durationDays);
      const nextDurationDays = Number.isFinite(parsedDays)
        ? Math.max(1, Math.min(30, Math.round(parsedDays)))
        : null;
      const nextEndDate = nextDurationDays
        ? new Date(nextStartDate.getTime() + nextDurationDays * 24 * 60 * 60 * 1000)
        : new Date(nextStartDate.getTime() + getRequestedAdCredits(existing.startDate, existing.endDate) * MS_PER_DAY);

      const parsedPriority = Number(priority);
      const nextPriority = Number.isFinite(parsedPriority)
        ? Math.max(0, Math.min(100, Math.round(parsedPriority)))
        : Math.max(1, existing.priority || 0);

      const ad = await prisma.$transaction(async (tx: any) => {
        const updated = await tx.ad.updateMany({
          where: { id, reviewStatus: 'PENDING' },
          data: { reviewStatus: 'APPROVED', isActive: true, startDate: nextStartDate, endDate: nextEndDate, priority: nextPriority },
        });
        if (!updated.count) throw new EconomyError('This request has already been reviewed.', 409);
        return tx.ad.findUniqueOrThrow({ where: { id } });
      });

      const sideEffects = await Promise.allSettled([
        prisma.notification.create({ data: { userId: ad.createdBy, type: 'ADMIN_TEST', message: `[Ad Request Approved] "${ad.title}" is now live in adspace.` } }),
        logAdminAction({ adminId: userId, action: 'AD_UPDATED', targetId: ad.id, details: { requestApproved: true, priority: ad.priority } }),
      ]);
      for (const result of sideEffects) if (result.status === 'rejected') fastify.log.error(result.reason, 'Ad approval follow-up failed');

      return reply.send({ success: true, ad });
    } catch (error: any) {
      return economyFailure(request, reply, error);
    }
  });

  // POST /api/ads/admin/requests/:id/reject - Reject ad request and optionally refund a credit (admin only)
  fastify.post('/ads/admin/requests/:id/reject', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      if (!(await isAdmin(userId))) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const { id } = request.params as { id: string };
      const { refundCredit = true, reason } = (request.body || {}) as { refundCredit?: boolean; reason?: string };

      const existing = await prisma.ad.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: 'Ad request not found' });
      }

      if (existing.reviewStatus !== 'PENDING') {
        return reply.code(409).send({ error: 'This request has already been reviewed.' });
      }

      const refundableCredits = existing.requestCreditsSpent ?? getRequestedAdCredits(existing.startDate, existing.endDate);

      await withWallet(existing.createdBy, async (tx, wallet) => {
        const changed = await tx.ad.updateMany({ where: { id, reviewStatus: 'PENDING' }, data: { reviewStatus: 'REJECTED', isActive: false } });
        if (!changed.count) throw new EconomyError('This request has already been reviewed.', 409);
        if (existing.peSpent > 0) {
          await postEntry(tx, wallet, existing.peSpent, 'AD_REFUND', `Rejected ad: ${existing.title}`, { adId: id }, false);
          await tx.wallet.updateMany({ where: { id: wallet.id, totalPrismaticSpent: { gte: existing.peSpent } }, data: { totalPrismaticSpent: { decrement: existing.peSpent } } });
          await tx.adPurchase.updateMany({ where: { adId: id, refundedAt: null }, data: { refundedAt: new Date() } });
        } else if (refundCredit && refundableCredits > 0) {
          await tx.user.update({ where: { id: existing.createdBy }, data: { adCredits: { increment: refundableCredits } } });
        }
        await tx.notification.create({ data: {
          userId: existing.createdBy, type: 'ADMIN_TEST',
          message: `[Ad Request Rejected] "${existing.title}" was not approved.${existing.peSpent > 0 ? ` ${existing.peSpent} PE were refunded.` : refundCredit && refundableCredits > 0 ? ` ${refundableCredits} legacy credits were refunded.` : ''}${reason ? ` Reason: ${String(reason).slice(0, 180)}` : ''}`,
        } });
      });

      try {
        await logAdminAction({ adminId: userId, action: 'AD_UPDATED', targetId: id, details: { requestRejected: true, refundedPe: existing.peSpent, refundedCredits: existing.peSpent ? 0 : refundCredit ? refundableCredits : 0, reason: reason || null } });
      } catch (auditError) { fastify.log.error(auditError, 'Ad rejection audit failed'); }

      return reply.send({ success: true, refundedPe: existing.peSpent, refundedCredits: existing.peSpent ? 0 : refundCredit ? refundableCredits : 0 });
    } catch (error: any) {
      return economyFailure(request, reply, error);
    }
  });

  // POST /api/ads/admin - Create a new ad (admin only)
  fastify.post('/ads/admin', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      
      if (!(await isAdmin(userId))) {
        return reply.code(403).send({ error: 'Admin access required' });
      }
      
      const {
        title,
        description,
        imageUrl,
        targetUrl,
        targetRegions,
        targetMinRank,
        targetMaxRank,
        targetFeeds,
        startDate,
        endDate,
        priority,
        isActive,
      } = request.body as any;
      
      if (!title || !imageUrl || !targetUrl || !startDate || !endDate) {
        return reply.code(400).send({ error: 'title, imageUrl, targetUrl, startDate, and endDate are required' });
      }
      if (!isValidHttpUrl(imageUrl) || !isValidHttpUrl(targetUrl)) {
        return reply.code(400).send({ error: 'Image and destination must be public HTTPS URLs.' });
      }
      
      const ad = await prisma.ad.create({
        data: {
          title,
          description: description || null,
          imageUrl,
          targetUrl,
          targetRegions: targetRegions || [],
          targetMinRank: targetMinRank || null,
          targetMaxRank: targetMaxRank || null,
          targetFeeds: targetFeeds || [],
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          priority: priority || 0,
          isActive: isActive !== false,
          createdBy: userId,
        },
      });
      
      await logAdminAction({ adminId: userId, action: 'AD_CREATED', targetId: ad.id, details: { title, targetUrl } });
      
      return reply.send({ ad });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create ad' });
    }
  });

  // PUT /api/ads/admin/:id - Update an ad (admin only)
  fastify.put('/ads/admin/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      
      if (!(await isAdmin(userId))) {
        return reply.code(403).send({ error: 'Admin access required' });
      }
      
      const { id } = request.params as { id: string };
      const input = (request.body || {}) as any;
      const allowed = ['title', 'description', 'imageUrl', 'targetUrl', 'targetRegions', 'targetMinRank', 'targetMaxRank', 'targetFeeds', 'startDate', 'endDate', 'priority', 'isActive'];
      const updates = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key))) as any;
      if ((updates.imageUrl && !isValidHttpUrl(updates.imageUrl)) || (updates.targetUrl && !isValidHttpUrl(updates.targetUrl))) {
        return reply.code(400).send({ error: 'Image and destination must be public HTTPS URLs.' });
      }
      const existing = await prisma.ad.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: 'Ad not found' });
      if (existing.reviewStatus !== 'APPROVED') return reply.code(409).send({ error: 'Review this request before editing it.' });
      if (existing.impressionBudget !== null && updates.isActive && !existing.remainingImpressions) {
        return reply.code(409).send({ error: 'This campaign has used all its impressions.' });
      }

      // Convert date strings to Date objects if present
      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.endDate) updates.endDate = new Date(updates.endDate);
      
      const ad = await prisma.ad.update({
        where: { id },
        data: updates,
      });
      
      await logAdminAction({ adminId: userId, action: 'AD_UPDATED', targetId: ad.id, details: { updates } });
      
      return reply.send({ ad });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to update ad' });
    }
  });

  // DELETE /api/ads/admin/:id - Delete an ad (admin only)
  fastify.delete('/ads/admin/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      
      if (!(await isAdmin(userId))) {
        return reply.code(403).send({ error: 'Admin access required' });
      }
      
      const { id } = request.params as { id: string };
      
      // Get ad info before deletion for audit log
      const ad = await prisma.ad.findUnique({ where: { id } });
      if (!ad) return reply.code(404).send({ error: 'Ad not found' });
      if (ad.peSpent > 0) return reply.code(409).send({ error: 'Paid campaigns retain their history. Pause the ad instead.' });
      
      await prisma.ad.delete({ where: { id } });
      
      await logAdminAction({ adminId: userId, action: 'AD_DELETED', targetId: id, details: { title: ad?.title } });
      
      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete ad' });
    }
  });

  // PUT /api/ads/settings - Update ad settings (admin only)
  fastify.put('/ads/settings', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      
      if (!(await isAdmin(userId))) {
        return reply.code(403).send({ error: 'Admin access required' });
      }
      
      const { duoFeedAdFrequency, lftFeedAdFrequency } = request.body as any;
      
      const settings = await prisma.adSettings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          duoFeedAdFrequency: duoFeedAdFrequency || 5,
          lftFeedAdFrequency: lftFeedAdFrequency || 5,
          updatedBy: userId,
        },
        update: {
          duoFeedAdFrequency: duoFeedAdFrequency ?? undefined,
          lftFeedAdFrequency: lftFeedAdFrequency ?? undefined,
          updatedBy: userId,
        },
      });
      
      await logAdminAction({ adminId: userId, action: 'AD_SETTINGS_UPDATED', details: { duoFeedAdFrequency, lftFeedAdFrequency } });
      
      return reply.send({ settings });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to update ad settings' });
    }
  });

  // GET /api/ads/admin/:id/stats - Get detailed stats for an ad (admin only)
  fastify.get('/ads/admin/:id/stats', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;
      
      if (!(await isAdmin(userId))) {
        return reply.code(403).send({ error: 'Admin access required' });
      }
      
      const { id } = request.params as { id: string };
      
      const ad = await prisma.ad.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              impressions: true,
              clicks: true,
            },
          },
        },
      });
      
      if (!ad) {
        return reply.code(404).send({ error: 'Ad not found' });
      }
      
      // Get daily breakdown for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const [impressionsByDay, clicksByDay, impressionsByFeed, clicksByFeed] = await Promise.all([
        prisma.adImpression.groupBy({
          by: ['createdAt'],
          where: { adId: id, createdAt: { gte: thirtyDaysAgo } },
          _count: true,
        }),
        prisma.adClick.groupBy({
          by: ['createdAt'],
          where: { adId: id, createdAt: { gte: thirtyDaysAgo } },
          _count: true,
        }),
        prisma.adImpression.groupBy({
          by: ['feed'],
          where: { adId: id },
          _count: true,
        }),
        prisma.adClick.groupBy({
          by: ['feed'],
          where: { adId: id },
          _count: true,
        }),
      ]);
      
      return reply.send({
        ad,
        totalImpressions: ad._count.impressions,
        totalClicks: ad._count.clicks,
        ctr: ad._count.impressions > 0 
          ? ((ad._count.clicks / ad._count.impressions) * 100).toFixed(2) + '%'
          : '0%',
        impressionsByFeed: impressionsByFeed.reduce((acc: any, item: any) => {
          acc[item.feed] = item._count;
          return acc;
        }, {}),
        clicksByFeed: clicksByFeed.reduce((acc: any, item: any) => {
          acc[item.feed] = item._count;
          return acc;
        }, {}),
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch ad stats' });
    }
  });
}
