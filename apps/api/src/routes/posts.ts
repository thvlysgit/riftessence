import prisma from '../prisma';
import { CreatePostSchema, validateRequest } from '../validation';

export default async function postsRoutes(fastify: any) {
  // GET /api/posts - Get all posts for feed
  fastify.get('/posts', async (request: any, reply: any) => {
    try {
      const { region, role, vcPreference, duoType, userId } = (request.query || {}) as any;
      const where: any = {};
      
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
      
      if (vcPreference) where.vcPreference = vcPreference;
      if (duoType) where.duoType = duoType;

      // Check if viewer is admin
      let viewerIsAdmin = false;
      if (userId) {
        const viewer = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } });
        viewerIsAdmin = (viewer?.badges || []).some((b: any) => b.key === 'admin');
      }

      const posts = await prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

      // Format posts for feed display
      const formattedPosts = posts.map((post: any) => {
        const author: any = post.author;
        const postingAccount = author.riotAccounts.find((acc: any) => acc.id === post.postingRiotAccountId);
        const mainAccount = author.riotAccounts.find((acc: any) => acc.isMain) || author.riotAccounts[0];
        const isSameAccount = postingAccount && mainAccount && postingAccount.id === mainAccount.id;
        
        // Calculate average ratings
        const ratings: any[] = author.ratingsReceived || [];
        const skillRatings = ratings.filter((r: any) => r.stars !== null && r.stars !== undefined);
        const personalityRatings = ratings.filter((r: any) => r.moons !== null && r.moons !== undefined);
        
        const avgSkill = skillRatings.length > 0 
          ? skillRatings.reduce((sum: number, r: any) => sum + r.stars, 0) / skillRatings.length 
          : 0;
        const avgPersonality = personalityRatings.length > 0
          ? personalityRatings.reduce((sum: number, r: any) => sum + r.moons, 0) / personalityRatings.length
          : 0;

        return {
          id: post.id,
          createdAt: post.createdAt,
          message: post.message,
          role: post.role,
          region: post.region,
          languages: post.languages,
          vcPreference: post.vcPreference,
          
          // Author info (respect anonymous mode)
          authorId: author.id,
          username: author.anonymous ? 'Anonymous' : author.username,
          isAnonymous: author.anonymous,
          isAdmin: viewerIsAdmin, // Viewer's admin status, not author's
          reportCount: author.reportCount || 0,
          
          // Discord (hide if anonymous)
          discordUsername: author.anonymous ? null : author.discordAccount?.username,
          
          // Riot account posted with
          postingRiotAccount: postingAccount ? {
            gameName: author.anonymous ? 'Hidden' : postingAccount.summonerName?.split('#')[0] || 'Unknown',
            tagLine: author.anonymous ? 'XXX' : postingAccount.summonerName?.split('#')[1] || '0000',
            region: postingAccount.region,
            rank: postingAccount.rank,
            division: postingAccount.division,
            lp: postingAccount.lp,
            winrate: postingAccount.winrate,
          } : null,
          
          // Best rank (from main account, hide name if anonymous)
          bestRank: mainAccount && !isSameAccount ? {
            gameName: author.anonymous ? 'Hidden' : mainAccount.summonerName?.split('#')[0] || 'Unknown',
            tagLine: author.anonymous ? 'XXX' : mainAccount.summonerName?.split('#')[1] || '0000',
            rank: mainAccount.rank,
            division: mainAccount.division,
            lp: mainAccount.lp,
            winrate: mainAccount.winrate,
          } : null,
          
          // Ratings
          ratings: {
            skill: avgSkill,
            personality: avgPersonality,
            skillCount: skillRatings.length,
            personalityCount: personalityRatings.length,
          },
          
          // Community info
          community: post.community ? {
            id: post.community.id,
            name: post.community.name,
            isPartner: post.community.isPartner,
            inviteLink: post.community.inviteLink,
          } : null,
          source: post.source || 'app',
          
          // Flag if posting with main account
          isMainAccount: isSameAccount,
        };
      });

      return { posts: formattedPosts };
    } catch (error) {
      fastify.log.error('Error fetching posts:', error);
      return reply.status(500).send({ error: 'Failed to fetch posts' });
    }
  });

  fastify.post('/posts', async (request: any, reply: any) => {
    try {
      // Validate request body
      const validation = validateRequest(CreatePostSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid input', details: validation.errors });
      }

      const { userId, postingRiotAccountId, region, role, message, languages, vcPreference, duoType, communityId } = validation.data;

      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      // Validate ownership of riot account
      const riotAcc = await prisma.riotAccount.findUnique({ where: { id: postingRiotAccountId } });
      if (!riotAcc) return reply.status(404).send({ error: 'Riot account not found' });
      if (riotAcc.userId !== userId) {
        return reply.status(403).send({ error: 'You do not own this Riot account' });
      }

      // Delete user's old posts before creating new one (prevents spam)
      await prisma.post.deleteMany({
        where: { authorId: userId }
      });

      // Create Post
      const created = await prisma.post.create({
        data: {
          authorId: userId,
          postingRiotAccountId,
          region: region as any,
          role: role as any,
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
      const { fromUserId, toUserId, postId } = request.body as any;

      if (!fromUserId || !toUserId) {
        return reply.status(400).send({ error: 'Missing required fields' });
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

      return { notification };
    } catch (error) {
      fastify.log.error('Error creating notification:', error);
      return reply.status(500).send({ error: 'Failed to send contact request' });
    }
  });

  // GET /api/notifications - Get user's notifications
  fastify.get('/notifications', async (request: any, reply: any) => {
    try {
      const { userId } = request.query as any;

      if (!userId) {
        return reply.status(400).send({ error: 'Missing userId' });
      }

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // Enrich notifications with sender info
      const enriched = await Promise.all(notifications.map(async (notif: any) => {
        let sender = null;
        if (notif.fromUserId) {
          sender = await prisma.user.findUnique({
            where: { id: notif.fromUserId },
            include: { riotAccounts: true, discordAccount: true },
          });
        }

        return {
          ...notif,
          senderUsername: sender?.username || null,
          senderProfileLink: sender ? `/profile?username=${encodeURIComponent(sender.username)}` : null,
        };
      }));

      return { notifications: enriched };
    } catch (error) {
      fastify.log.error('Error fetching notifications:', error);
      return reply.status(500).send({ error: 'Failed to fetch notifications' });
    }
  });

  // PATCH /api/notifications/:id/read - Mark notification as read
  fastify.patch('/notifications/:id/read', async (request: any, reply: any) => {
    try {
      const { id } = request.params as any;

      const notification = await prisma.notification.update({
        where: { id },
        data: { read: true },
      });

      return { notification };
    } catch (error) {
      fastify.log.error('Error marking notification as read:', error);
      return reply.status(500).send({ error: 'Failed to update notification' });
    }
  });

  // DELETE /api/posts/:id - Admin-only delete
  fastify.delete('/posts/:id', async (request: any, reply: any) => {
    try {
      const { id } = request.params as any;
      const { userId } = request.query as any;
      if (!userId) return reply.status(400).send({ error: 'Missing userId' });

      const user = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true } });
      if (!user) return reply.status(404).send({ error: 'User not found' });
      const isAdmin = (user.badges || []).some((b: any) => b.key === 'admin');
      if (!isAdmin) return reply.status(403).send({ error: 'Admin badge required' });

      await prisma.post.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      fastify.log.error('Error deleting post:', error);
      return reply.status(500).send({ error: 'Failed to delete post' });
    }
  });
}
