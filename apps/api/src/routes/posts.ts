import prisma from '../prisma';
import { CreatePostSchema, validateRequest, PaginationSchema } from '../validation';
import { getOrSetCache } from '../utils/requestCache';
import { cacheDel } from '../utils/cache';
import { enqueueMirrorDeletion } from '../services/discordMirrorDeletionQueue';
import { formatDuoPost, getDuoVerificationAuthorWhere, parseBooleanQuery } from '../utils/developerFeed';
import { getUserIdFromRequest } from '../middleware/auth';

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

const NOTIFICATIONS_CACHE_TTL_SECONDS = toPositiveInt(process.env.NOTIFICATIONS_CACHE_TTL_SECONDS, 6);
const notificationsCacheKey = (userId: string) => `api:notifications:list:v1:user:${userId}`;

async function attachPostingRiotAccounts(posts: any[]) {
  const accountIds = Array.from(new Set(
    posts
      .map((post: any) => post.postingRiotAccountId)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
  ));

  if (accountIds.length === 0) {
    return posts;
  }

  const accounts = await prisma.riotAccount.findMany({
    where: { id: { in: accountIds } },
  });
  const accountById = new Map(accounts.map((account: any) => [account.id, account]));

  return posts.map((post: any) => ({
    ...post,
    postingRiotAccount: accountById.get(post.postingRiotAccountId) || null,
  }));
}

export default async function postsRoutes(fastify: any) {
  // GET /api/posts - Get all posts for feed with pagination
  fastify.get('/posts', async (request: any, reply: any) => {
    try {
      const { region, role, vcPreference, duoType, language, verified, limit = 10, offset = 0 } = (request.query || {}) as any;
      const viewerUserId = await getUserIdFromRequest(request as any, reply as any, false);
      const where: any = {};
      
      // Validate pagination params
      const paginationValidation = validateRequest(PaginationSchema, { 
        limit: limit ? parseInt(limit) : 10, 
        offset: offset ? parseInt(offset) : 0 
      });
      if (!paginationValidation.success) {
        return reply.code(400).send({ error: 'Invalid pagination parameters', details: paginationValidation.errors });
      }
      
      const { limit: validLimit, offset: validOffset } = paginationValidation.data;
      // Type assertions for TypeScript - values are defined after validation
      const limit_final = validLimit ?? 10;
      const offset_final = validOffset ?? 0;
      
      // Handle multiple regions
      if (region) {
        const regions = Array.isArray(region) ? region : [region];
        if (regions.length > 0) {
          where.region = { in: regions };
        }
      }
      
      // Handle multiple roles
      if (role) {
        const roles = Array.isArray(role) ? role : [role];
        if (roles.length > 0) {
          where.role = { in: roles };
        }
      }
      
      // Handle multiple languages - filter posts that have at least one matching language
      if (language) {
        const languages = Array.isArray(language) ? language : [language];
        if (languages.length > 0) {
          where.languages = { hasSome: languages };
        }
      }
      
      if (vcPreference) where.vcPreference = vcPreference;
      if (duoType) where.duoType = duoType;

      if (verified !== undefined && verified !== null) {
        const normalizedVerified = String(verified).trim().toLowerCase();
        if (normalizedVerified && normalizedVerified !== 'all') {
          where.author = getDuoVerificationAuthorWhere(parseBooleanQuery(verified));
        }
      }

      // Check if viewer is admin
      let viewerIsAdmin = false;
      if (viewerUserId) {
        const viewer = await prisma.user.findUnique({ where: { id: viewerUserId }, include: { badges: true } });
        viewerIsAdmin = (viewer?.badges || []).some((b: any) => b.key === 'admin');
      }

      // Filter out blocked users - exclude posts from users the viewer has blocked
      // and posts from users who have blocked the viewer
      if (viewerUserId) {
        const blocksResult = await prisma.$queryRaw<Array<{ blockedId: string }>>`
          SELECT "blockedId" FROM "Block" WHERE "blockerId" = ${viewerUserId}
          UNION
          SELECT "blockerId" FROM "Block" WHERE "blockedId" = ${viewerUserId}
        `;
        
        const blockedUserIds = blocksResult.map((b: any) => b.blockedId);
        
        if (blockedUserIds.length > 0) {
          where.authorId = { notIn: blockedUserIds };
        }
      }

      // Get total count for pagination info
      const totalCount = await prisma.post.count({ where });

      const posts = await prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset_final,
        take: limit_final,
        include: {
          author: {
            include: {
              riotAccounts: true,
              discordAccount: true,
              ratingsReceived: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              isPartner: true,
              inviteLink: true,
            },
          },
        },
      });

      const postsWithPostingAccounts = await attachPostingRiotAccounts(posts);
      const formattedPosts = postsWithPostingAccounts.map((post: any) => formatDuoPost(post, viewerIsAdmin));

      return reply.send({ 
        posts: formattedPosts,
        pagination: {
          total: totalCount,
          limit: limit_final,
          offset: offset_final,
          hasMore: offset_final + limit_final < totalCount,
        }
      });
    } catch (error) {
      fastify.log.error('Error fetching posts:', error);
      return reply.status(500).send({ error: 'Failed to fetch posts' });
    }
  });

  // GET /api/posts/:id - Get a single post by ID (public endpoint for sharing)
  fastify.get('/posts/:id', async (request: any, reply: any) => {
    try {
      const { id } = request.params as any;

      // Find the post with all necessary includes
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          author: {
            include: {
              riotAccounts: true,
              discordAccount: true,
              ratingsReceived: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              isPartner: true,
              inviteLink: true,
            },
          },
        },
      });

      // Return 404 if post not found
      if (!post) {
        return reply.status(404).send({ error: 'Post not found' });
      }

      const [postWithPostingAccount] = await attachPostingRiotAccounts([post]);
      const formattedPost = formatDuoPost(postWithPostingAccount, false);

      return reply.send({ post: formattedPost });
    } catch (error) {
      fastify.log.error('Error fetching post:', error);
      return reply.status(500).send({ error: 'Failed to fetch post' });
    }
  });

  fastify.post('/posts', async (request: any, reply: any) => {
    try {
      const authUserId = await getUserIdFromRequest(request, reply);
      if (!authUserId) return;

      // Validate request body
      const validation = validateRequest(CreatePostSchema, { ...request.body, userId: authUserId });
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { postingRiotAccountId, region, role, secondRole, message, languages, vcPreference, duoType, communityId, userId } = validation.data;

      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      const riotAccountCount = await prisma.riotAccount.count({ where: { userId } });
      if (riotAccountCount === 0) {
        return reply.status(400).send({
          error: 'A Riot account must be linked to your profile to create posts',
          code: 'RIOT_ACCOUNT_REQUIRED',
        });
      }

      // Validate ownership of riot account
      const riotAcc = await prisma.riotAccount.findUnique({ where: { id: postingRiotAccountId } });
      if (!riotAcc) return reply.status(404).send({ error: 'Riot account not found' });
      if (riotAcc.userId !== userId) {
        return reply.status(403).send({ error: 'You do not own this Riot account' });
      }

      const oldMirroredPosts = await prisma.post.findMany({
        where: {
          authorId: userId,
          source: 'app',
          discordMirrored: true,
        },
        select: {
          id: true,
        },
      });

      // Delete user's old posts before creating new one (prevents spam)
      await prisma.post.deleteMany({
        where: { authorId: userId }
      });

      for (const oldPost of oldMirroredPosts) {
        enqueueMirrorDeletion('DUO', oldPost.id);
      }

      // Create Post
      const created = await prisma.post.create({
        data: {
          authorId: userId,
          postingRiotAccountId,
          region: region as any,
          role: role as any,
          secondRole: secondRole as any,
          message: message || null,
          languages,
          vcPreference: vcPreference as any,
          duoType: (duoType || 'BOTH') as any,
          communityId: communityId || null,
          source: 'app',
          discordMirrored: false,
        },
      });

      // Update user's lastPostCreated timestamp
      await prisma.user.update({
        where: { id: userId },
        data: { lastPostCreated: new Date() },
      });

      return reply.status(201).send({ success: true, post: created });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create post' });
    }
  });

  // POST /api/notifications/contact - Send contact request
  fastify.post('/notifications/contact', async (request: any, reply: any) => {
    try {
      const fromUserId = await getUserIdFromRequest(request, reply);
      if (!fromUserId) return;

      const { toUserId, postId } = request.body as any;

      if (!toUserId) {
        return reply.status(400).send({ error: 'Missing recipient user' });
      }

      // Prevent self-contact
      if (fromUserId === toUserId) {
        return reply.status(400).send({ error: 'Cannot send contact request to yourself' });
      }

      // Fetch sender's profile to enrich notification
      const sender = await prisma.user.findUnique({
        where: { id: fromUserId },
        include: {
          riotAccounts: true,
          discordAccount: true,
        },
      });

      if (!sender) {
        return reply.status(404).send({ error: 'Sender not found' });
      }

      const mainAccount = sender.riotAccounts.find((acc: any) => acc.isMain) || sender.riotAccounts[0];
      const senderInfo = {
        username: sender.username,
        rank: mainAccount?.rank || 'UNRANKED',
        winrate: mainAccount?.winrate || null,
        discord: sender.discordAccount?.username || null,
      };

      const message = `${senderInfo.username} (${senderInfo.rank}${senderInfo.winrate ? `, ${senderInfo.winrate.toFixed(1)}% WR` : ''}) wants to duo with you!`;

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          userId: toUserId,
          type: 'CONTACT_REQUEST',
          fromUserId,
          postId: postId || null,
          message,
        },
      });
      await cacheDel(notificationsCacheKey(toUserId));

      return { notification };
    } catch (error) {
      fastify.log.error('Error creating notification:', error);
      return reply.status(500).send({ error: 'Failed to send contact request' });
    }
  });

  // GET /api/notifications - Get user's notifications
  fastify.get('/notifications', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const cacheKey = notificationsCacheKey(userId);
      const payload = await getOrSetCache(cacheKey, NOTIFICATIONS_CACHE_TTL_SECONDS, async () => {
        const notifications = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        const senderIds = Array.from(
          new Set(
            notifications
              .map((notif: any) => notif.fromUserId)
              .filter((id: any) => typeof id === 'string' && id.length > 0)
          )
        );

        const senders = senderIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: senderIds } },
              select: { id: true, username: true },
            })
          : [];

        const senderById = new Map<string, { id: string; username: string }>(
          senders.map((sender: any) => [sender.id, { id: sender.id, username: sender.username }])
        );

        const enriched = notifications.map((notif: any) => {
          const sender = notif.fromUserId ? senderById.get(notif.fromUserId) : null;

          return {
            ...notif,
            senderUsername: sender?.username || null,
            senderProfileLink: sender ? `/profile?username=${encodeURIComponent(sender.username)}` : null,
          };
        });

        return { notifications: enriched };
      });

      return payload;
    } catch (error) {
      fastify.log.error('Error fetching notifications:', error);
      return reply.status(500).send({ error: 'Failed to fetch notifications' });
    }
  });

  // PATCH /api/notifications/:id/read - Mark notification as read
  fastify.patch('/notifications/:id/read', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const { id } = request.params as any;

      const existing = await prisma.notification.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Notification not found' });
      }

      const notification = existing.read ? existing : await prisma.notification.update({
        where: { id },
        data: { read: true },
      });
      await cacheDel(notificationsCacheKey(userId));

      return { notification };
    } catch (error) {
      fastify.log.error('Error marking notification as read:', error);
      return reply.status(500).send({ error: 'Failed to update notification' });
    }
  });

  // PATCH /api/notifications/read-all - Mark all notifications as read for the authenticated user
  fastify.patch('/notifications/read-all', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const result = await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
      await cacheDel(notificationsCacheKey(userId));

      return { success: true, updatedCount: result.count };
    } catch (error) {
      fastify.log.error('Error marking all notifications as read:', error);
      return reply.status(500).send({ error: 'Failed to update notifications' });
    }
  });

  // DELETE /api/posts/:id - Admin-only delete
  fastify.delete('/posts/:id', async (request: any, reply: any) => {
    try {
      const { id } = request.params as any;
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const user = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } });
      if (!user) return reply.status(404).send({ error: 'User not found' });
      const isAdmin = (user.badges || []).some((b: any) => b.key === 'admin');
      if (!isAdmin) return reply.status(403).send({ error: 'Admin badge required' });

      const existingPost = await prisma.post.findUnique({
        where: { id },
        select: {
          id: true,
          source: true,
          discordMirrored: true,
        },
      });

      if (!existingPost) {
        return reply.status(404).send({ error: 'Post not found' });
      }

      await prisma.post.delete({ where: { id } });

      if (existingPost.source === 'app' && existingPost.discordMirrored) {
        enqueueMirrorDeletion('DUO', existingPost.id);
      }

      return { success: true };
    } catch (error) {
      fastify.log.error('Error deleting post:', error);
      return reply.status(500).send({ error: 'Failed to delete post' });
    }
  });
}
