import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { validateRequest, CreateMatchupSchema, UpdateMatchupSchema, MatchupQuerySchema, PublicMatchupQuerySchema } from '../validation';

export default async function matchupRoutes(fastify: FastifyInstance) {
  
  // GET /api/matchups - Get user's matchups (owned + saved, with optional filters)
  fastify.get('/matchups', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    
    const validation = validateRequest(MatchupQuerySchema, request.query);
    if (!validation.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: validation.errors });
    }
    
    const { myChampion, role, limit, offset } = validation.data as {
      userId?: string;
      myChampion?: string;
      role?: string;
      limit: number;
      offset: number;
    };
    
    try {
      // Build where clause for filters (excluding userId since we handle that separately)
      const filterWhere: any = {};
      if (myChampion) filterWhere.myChampion = myChampion;
      if (role) filterWhere.role = role;
      
      // Get owned matchups
      const ownedMatchups = await prisma.matchup.findMany({
        where: {
          userId,
          ...filterWhere,
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true },
          },
          _count: {
            select: {
              likes: { where: { isLike: true } },
            },
          },
        },
      });
      
      // Get saved matchups (bookmarked from marketplace)
      const savedMatchupRecords = await prisma.savedMatchup.findMany({
        where: { userId },
        include: {
          matchup: {
            include: {
              user: {
                select: { id: true, username: true },
              },
              _count: {
                select: {
                  likes: { where: { isLike: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      // Extract matchups from saved records, filter, and mark them as saved
      const savedMatchups = savedMatchupRecords
        .filter((sm: any) => {
          if (!sm.matchup) return false; // Filter out null matchups (deleted originals)
          
          // Apply filters
          if (myChampion && sm.matchup.myChampion !== myChampion) return false;
          if (role && sm.matchup.role !== role) return false;
          
          return true;
        })
        .map((sm: any) => ({
          ...sm.matchup,
          isSaved: true,
          isOwned: false,
        }));
      
      // Mark owned matchups
      const ownedWithMeta = ownedMatchups.map((m: any) => ({
        ...m,
        isSaved: false,
        isOwned: true,
      }));
      
      // Merge and sort by updatedAt
      const allMatchups = [...ownedWithMeta, ...savedMatchups].sort((a: any, b: any) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA; // Newest first
      });
      
      // Apply pagination
      const paginatedMatchups = allMatchups.slice(offset, offset + limit);
      const total = allMatchups.length;
      
      return reply.send({ matchups: paginatedMatchups, total, limit, offset });
    } catch (error: any) {
      request.log.error({ err: error, userId }, 'Failed to fetch matchups');
      return reply.code(500).send({ error: 'Failed to fetch matchups' });
    }
  });
  
  // POST /api/matchups - Create new matchup
  fastify.post('/matchups', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    
    const validation = validateRequest(CreateMatchupSchema, { ...request.body, userId });
    if (!validation.success) {
      return reply.code(400).send({ error: 'Invalid matchup data', details: validation.errors });
    }
    
    try {
      const matchup = await prisma.matchup.create({
        data: validation.data,
      });
      
      return reply.code(201).send({ matchup });
    } catch (error: any) {
      request.log.error({ err: error, userId }, 'Failed to create matchup');
      return reply.code(500).send({ error: 'Failed to create matchup' });
    }
  });
  
  // GET /api/matchups/:id - Get single matchup
  fastify.get('/matchups/:id', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    
    const { id } = request.params;
    
    try {
      const matchup = await prisma.matchup.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, username: true },
          },
          likes: {
            select: { userId: true, isLike: true },
          },
          _count: {
            select: {
              likes: { where: { isLike: true } },
            },
          },
        },
      });
      
      if (!matchup) {
        return reply.code(404).send({ error: 'Matchup not found' });
      }
      
      // Only owner can view private matchups
      if (!matchup.isPublic && matchup.userId !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      return reply.send({ matchup });
    } catch (error: any) {
      request.log.error({ err: error, userId, matchupId: id }, 'Failed to fetch matchup');
      return reply.code(500).send({ error: 'Failed to fetch matchup' });
    }
  });
  
  // PUT /api/matchups/:id - Update matchup
  fastify.put('/matchups/:id', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    
    const { id } = request.params;
    
    const validation = validateRequest(UpdateMatchupSchema, request.body);
    if (!validation.success) {
      return reply.code(400).send({ error: 'Invalid matchup data', details: validation.errors });
    }
    
    try {
      // Check ownership
      const existing = await prisma.matchup.findUnique({ where: { id }, select: { userId: true } });
      if (!existing) {
        return reply.code(404).send({ error: 'Matchup not found' });
      }
      if (existing.userId !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      const matchup = await prisma.matchup.update({
        where: { id },
        data: validation.data,
      });
      
      return reply.send({ matchup });
    } catch (error: any) {
      request.log.error({ err: error, userId, matchupId: id }, 'Failed to update matchup');
      return reply.code(500).send({ error: 'Failed to update matchup' });
    }
  });
  
  // DELETE /api/matchups/:id - Delete matchup
  fastify.delete('/matchups/:id', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    
    const { id } = request.params;
    
    try {
      // Check ownership
      const existing = await prisma.matchup.findUnique({ where: { id }, select: { userId: true } });
      if (!existing) {
        return reply.code(404).send({ error: 'Matchup not found' });
      }
      if (existing.userId !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      await prisma.matchup.delete({ where: { id } });
      
      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error({ err: error, userId, matchupId: id }, 'Failed to delete matchup');
      return reply.code(500).send({ error: 'Failed to delete matchup' });
    }
  });
  
  // GET /api/matchups/public - Browse public matchups (marketplace)
  fastify.get('/matchups/public', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply, false); // Optional auth
    
    const validation = validateRequest(PublicMatchupQuerySchema, request.query);
    if (!validation.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: validation.errors });
    }
    
    const { myChampion, enemyChampion, role, difficulty, sortBy, limit, offset } = validation.data as {
      myChampion?: string;
      enemyChampion?: string;
      role?: string;
      difficulty?: string;
      sortBy: 'newest' | 'mostLiked' | 'mostDownloaded';
      limit: number;
      offset: number;
    };
    
    const where: any = { isPublic: true };
    if (myChampion) where.myChampion = myChampion;
    if (enemyChampion) where.enemyChampion = enemyChampion;
    if (role) where.role = role;
    if (difficulty) where.difficulty = difficulty;
    
    try {
      let orderBy: any = { createdAt: 'desc' }; // newest
      if (sortBy === 'mostDownloaded') {
        orderBy = { downloadCount: 'desc' };
      }
      // Note: mostLiked requires raw SQL or client-side sorting due to Prisma limitations
      // For now, we'll fetch and sort client-side
      
      const matchups = await prisma.matchup.findMany({
        where,
        orderBy,
        take: limit + 50, // Fetch more for client-side sorting
        skip: offset,
        include: {
          user: {
            select: { id: true, username: true },
          },
          _count: {
            select: {
              likes: { where: { isLike: true } },
            },
          },
          likes: {
            select: { isLike: true, userId: true },
          },
        },
      });
      
      // Calculate like counts and sort if needed
      // Check which matchups user has saved to their library (for button display)
      let userSavedMatchups: any[] = [];
      if (userId) {
        userSavedMatchups = await prisma.savedMatchup.findMany({
          where: { userId },
          select: { matchupId: true },
        });
      }
      
      let processedMatchups = matchups.map((m: any) => {
        const likeCount = m.likes.filter((l: any) => l.isLike).length;
        const dislikeCount = m.likes.filter((l: any) => !l.isLike).length;
        const userVote = userId ? m.likes.find((l: any) => l.userId === userId) : null;
        // isDownloaded means "user currently has this saved in their library" for button display
        const isDownloaded = userId ? userSavedMatchups.some(
          sm => sm.matchupId === m.id
        ) : false;
        
        return {
          ...m,
          authorId: m.userId,
          authorUsername: m.user?.username || 'Unknown',
          likeCount,
          dislikeCount,
          netLikes: likeCount - dislikeCount,
          userVote: userVote ? (userVote.isLike ? 'like' : 'dislike') : null,
          isDownloaded,
        };
      });
      
      if (sortBy === 'mostLiked') {
        processedMatchups.sort((a: any, b: any) => b.netLikes - a.netLikes);
      }
      
      // Apply limit after sorting
      const finalMatchups = processedMatchups.slice(0, limit);
      
      const total = await prisma.matchup.count({ where });
      
      return reply.send({ matchups: finalMatchups, total, limit, offset });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to fetch public matchups');
      return reply.code(500).send({ error: 'Failed to fetch public matchups' });
    }
  });
  
  // POST /api/matchups/:id/vote - Like or dislike a public matchup (toggle)
  fastify.post('/matchups/:id/vote', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    
    const { id } = request.params;
    const { isLike } = request.body;
    
    if (typeof isLike !== 'boolean') {
      return reply.code(400).send({ error: 'isLike must be a boolean' });
    }
    
    try {
      // Check if matchup exists and is public
      const matchup = await prisma.matchup.findUnique({ where: { id }, select: { isPublic: true, userId: true } });
      if (!matchup) {
        return reply.code(404).send({ error: 'Matchup not found' });
      }
      if (!matchup.isPublic) {
        return reply.code(403).send({ error: 'Cannot vote on private matchup' });
      }
      if (matchup.userId === userId) {
        return reply.code(400).send({ error: 'Cannot vote on your own matchup' });
      }
      
      // Check if user already voted
      const existingVote = await prisma.matchupLike.findUnique({
        where: { userId_matchupId: { userId, matchupId: id } },
      });
      
      if (existingVote) {
        // If same vote, remove it (toggle off)
        if (existingVote.isLike === isLike) {
          await prisma.matchupLike.delete({
            where: { id: existingVote.id },
          });
        } else {
          // Change vote
          await prisma.matchupLike.update({
            where: { id: existingVote.id },
            data: { isLike },
          });
        }
      } else {
        // Create new vote
        await prisma.matchupLike.create({
          data: { userId, matchupId: id, isLike },
        });
      }
      
      // Fetch updated counts and user vote
      const likes = await prisma.matchupLike.findMany({
        where: { matchupId: id },
        select: { isLike: true, userId: true },
      });
      
      const likeCount = likes.filter((l: { isLike: boolean }) => l.isLike).length;
      const dislikeCount = likes.filter((l: { isLike: boolean }) => !l.isLike).length;
      const userVote = likes.find((l: { userId: string }) => l.userId === userId);
      
      return reply.send({ 
        likeCount, 
        dislikeCount, 
        userVote: userVote ? (userVote.isLike ? 'like' : 'dislike') : null 
      });
    } catch (error: any) {
      request.log.error({ err: error, userId, matchupId: id }, 'Failed to vote on matchup');
      return reply.code(500).send({ error: 'Failed to vote on matchup' });
    }
  });
  
  // POST /api/matchups/:id/download - Save a public matchup to user's library (bookmark system)
  fastify.post('/matchups/:id/download', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    
    const { id } = request.params;
    
    try {
      // Fetch public matchup
      const original = await prisma.matchup.findUnique({ where: { id } });
      if (!original) {
        return reply.code(404).send({ error: 'Matchup not found' });
      }
      if (!original.isPublic) {
        return reply.code(403).send({ error: 'Matchup is not public' });
      }
      
      // Check if user has already downloaded this specific matchup before (for analytics)
      const existingDownload = await prisma.matchupDownload.findUnique({
        where: {
          userId_matchupId: {
            userId,
            matchupId: id,
          },
        },
      });
      
      const isFirstDownload = !existingDownload;
      
      // Create SavedMatchup record (adds to library, not a full copy)
      const existingSave = await prisma.savedMatchup.findUnique({
        where: {
          userId_matchupId: {
            userId,
            matchupId: id,
          },
        },
      });
      
      if (existingSave) {
        // Already saved, just return success
        return reply.code(200).send({
          matchup: original,
          downloadCount: original.downloadCount,
          isFirstDownload: false,
          alreadySaved: true,
        });
      }
      
      // Create saved record
      await prisma.savedMatchup.create({
        data: {
          userId,
          matchupId: id,
        },
      });
      
      // Track this download if it's the first time (for analytics)
      let newDownloadCount = original.downloadCount;
      if (isFirstDownload) {
        await prisma.matchupDownload.create({
          data: {
            userId,
            matchupId: id,
          },
        });
        
        // Increment download count on original only for first-time downloads
        const updatedOriginal = await prisma.matchup.update({
          where: { id },
          data: { downloadCount: { increment: 1 } },
          select: { downloadCount: true },
        });
        newDownloadCount = updatedOriginal.downloadCount;
      }
      
      return reply.code(201).send({ 
        matchup: original, 
        downloadCount: newDownloadCount,
        isFirstDownload,
        alreadySaved: false,
      });
    } catch (error: any) {
      request.log.error({ err: error, userId, matchupId: id }, 'Failed to save matchup');
      return reply.code(500).send({ error: 'Failed to save matchup' });
    }
  });
  
  // DELETE /api/matchups/:id/saved - Remove a public matchup from user's library (unbookmark)
  fastify.delete('/matchups/:id/saved', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    
    const { id } = request.params;
    
    try {
      // Delete the SavedMatchup record (note: download count stays, MatchupDownload stays)
      await prisma.savedMatchup.deleteMany({
        where: {
          userId,
          matchupId: id,
        },
      });
      
      return reply.code(204).send();
    } catch (error: any) {
      request.log.error({ err: error, userId, matchupId: id }, 'Failed to remove saved matchup');
      return reply.code(500).send({ error: 'Failed to remove saved matchup' });
    }
  });
}
