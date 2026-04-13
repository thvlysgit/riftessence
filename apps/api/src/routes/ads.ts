import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { logAdminAction, AuditActions } from '../utils/auditLog';
import crypto from 'crypto';

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
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function adsRoutes(fastify: any) {
  // GET /api/ads - Get active ads for a feed (public)
  fastify.get('/ads', async (request: any, reply: any) => {
    try {
      const { feed, region, rank } = request.query as { feed?: string; region?: string; rank?: string };
      
      const now = new Date();
      
      // Build targeting query
      const where: any = {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      };
      
      // Filter by target feeds
      if (feed) {
        where.OR = [
          { targetFeeds: { isEmpty: true } },  // No targeting = show everywhere
          { targetFeeds: { has: feed } },
        ];
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

  // POST /api/ads/request-slot - Submit an ad slot request using one ad credit
  fastify.post('/ads/request-slot', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { title, description, imageUrl, targetUrl, feed, days } = request.body as {
        title?: string;
        description?: string;
        imageUrl?: string;
        targetUrl?: string;
        feed?: string;
        days?: number;
      };

      const normalizedTitle = String(title || '').trim();
      const normalizedImageUrl = String(imageUrl || '').trim();
      const normalizedTargetUrl = String(targetUrl || '').trim();
      const normalizedDescription = String(description || '').trim();

      if (!normalizedTitle || normalizedTitle.length < 3 || normalizedTitle.length > 80) {
        return reply.code(400).send({ error: 'Title must be between 3 and 80 characters.' });
      }

      if (!isValidHttpUrl(normalizedImageUrl) || !isValidHttpUrl(normalizedTargetUrl)) {
        return reply.code(400).send({ error: 'imageUrl and targetUrl must be valid http/https URLs.' });
      }

      const normalizedFeed = String(feed || '').trim().toLowerCase();
      const targetFeeds = normalizedFeed === 'duo' || normalizedFeed === 'lft' ? [normalizedFeed] : [];

      const requestedDays = Number(days);
      const durationDays = Number.isFinite(requestedDays) ? Math.max(1, Math.min(14, Math.round(requestedDays))) : 3;
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const ad = await prisma.$transaction(async (tx: any) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { adCredits: true },
        });

        if (!user) {
          throw new Error('User not found.');
        }

        if ((user.adCredits || 0) < 1) {
          throw new Error('You need at least one adspace credit.');
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            adCredits: { decrement: 1 },
          },
        });

        return tx.ad.create({
          data: {
            title: normalizedTitle,
            description: normalizedDescription || 'Community ad request (pending staff review).',
            imageUrl: normalizedImageUrl,
            targetUrl: normalizedTargetUrl,
            targetFeeds,
            startDate,
            endDate,
            priority: 0,
            isActive: false,
            createdBy: userId,
          },
          select: {
            id: true,
            title: true,
            targetUrl: true,
            imageUrl: true,
            targetFeeds: true,
            startDate: true,
            endDate: true,
            isActive: true,
            createdAt: true,
          },
        });
      });

      return reply.send({
        success: true,
        ad,
        message: 'Ad request sent. Staff review is required before it goes live.',
      });
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : null;
      if (message && message.length < 200) {
        return reply.code(400).send({ error: message });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to submit ad request.' });
    }
  });

  // POST /api/ads/impression - Track an ad impression
  fastify.post('/ads/impression', async (request: any, reply: any) => {
    try {
      const { adId, feed, userId } = request.body as { adId: string; feed: string; userId?: string };
      
      if (!adId || !feed) {
        return reply.code(400).send({ error: 'adId and feed are required' });
      }
      
      // Get IP for deduplication
      const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
      const ipHash = hashIp(ip);
      
      // Check for recent impression from same user/IP (debounce within 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existingImpression = await prisma.adImpression.findFirst({
        where: {
          adId,
          ipHash,
          createdAt: { gte: oneHourAgo },
        },
      });
      
      if (!existingImpression) {
        await prisma.adImpression.create({
          data: {
            adId,
            userId: userId || null,
            ipHash,
            feed,
          },
        });
      }
      
      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to track impression' });
    }
  });

  // POST /api/ads/click - Track an ad click
  fastify.post('/ads/click', async (request: any, reply: any) => {
    try {
      const { adId, feed, userId } = request.body as { adId: string; feed: string; userId?: string };
      
      if (!adId || !feed) {
        return reply.code(400).send({ error: 'adId and feed are required' });
      }
      
      const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
      const ipHash = hashIp(ip);
      
      await prisma.adClick.create({
        data: {
          adId,
          userId: userId || null,
          ipHash,
          feed,
        },
      });
      
      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to track click' });
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
      
      const formatted = ads.map((ad: any) => ({
        ...ad,
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
      const updates = request.body as any;
      
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
