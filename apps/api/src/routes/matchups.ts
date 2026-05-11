import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import {
  validateRequest,
  CreateMatchupSchema,
  UpdateMatchupSchema,
  MatchupQuerySchema,
  PublicMatchupQuerySchema,
  CreateMatchupCollectionSchema,
  UpdateMatchupCollectionSchema,
  MatchupCollectionQuerySchema,
} from '../validation';

const formatCollection = (collection: any, userId?: string | null, isSaved = false) => ({
  ...collection,
  authorId: collection.userId,
  authorUsername: collection.user?.username || 'Unknown',
  itemCount: collection._count?.items ?? collection.items?.length ?? 0,
  isOwned: Boolean(userId && collection.userId === userId),
  isSaved,
});

export default async function matchupRoutes(fastify: FastifyInstance) {
  // GET /api/matchup-collections - Get user's owned and saved collections
  fastify.get('/matchup-collections', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const validation = validateRequest(MatchupCollectionQuerySchema, request.query);
    if (!validation.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: validation.errors });
    }

    const { champion, role, limit, offset } = validation.data as {
      champion?: string;
      role?: string;
      limit: number;
      offset: number;
    };

    const filterWhere: any = {};
    if (champion) filterWhere.champion = champion;
    if (role) filterWhere.role = role;

    try {
      const ownedCollections = await prisma.matchupCollection.findMany({
        where: { userId, ...filterWhere },
        include: {
          user: { select: { id: true, username: true } },
          _count: { select: { items: true, savedBy: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const savedCollectionRecords = await prisma.savedMatchupCollection.findMany({
        where: { userId },
        include: {
          collection: {
            include: {
              user: { select: { id: true, username: true } },
              _count: { select: { items: true, savedBy: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const savedCollections = savedCollectionRecords
        .filter((record: any) => {
          if (!record.collection) return false;
          if (champion && record.collection.champion !== champion) return false;
          if (role && record.collection.role !== role) return false;
          return true;
        })
        .map((record: any) => formatCollection(record.collection, userId, true));

      const ownedWithMeta = ownedCollections.map((collection: any) => formatCollection(collection, userId, false));
      const collections = [...ownedWithMeta, ...savedCollections].sort((a: any, b: any) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });

      const paginatedCollections = collections.slice(offset, offset + limit);

      return reply.send({
        collections: paginatedCollections,
        total: collections.length,
        limit,
        offset,
        hasMore: offset + limit < collections.length,
      });
    } catch (error: any) {
      request.log.error({ err: error, userId }, 'Failed to fetch matchup collections');
      return reply.code(500).send({ error: 'Failed to fetch matchup collections' });
    }
  });

  // POST /api/matchup-collections - Create a champion collection
  fastify.post('/matchup-collections', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const validation = validateRequest(CreateMatchupCollectionSchema, request.body);
    if (!validation.success) {
      return reply.code(400).send({ error: 'Invalid collection data', details: validation.errors });
    }

    try {
      const collection = await prisma.matchupCollection.create({
        data: {
          ...validation.data,
          userId,
        },
        include: {
          user: { select: { id: true, username: true } },
          _count: { select: { items: true, savedBy: true } },
        },
      });

      return reply.code(201).send({ collection: formatCollection(collection, userId) });
    } catch (error: any) {
      request.log.error({ err: error, userId }, 'Failed to create matchup collection');
      return reply.code(500).send({ error: 'Failed to create matchup collection' });
    }
  });

  // GET /api/matchup-collections/public - Browse shared collections
  fastify.get('/matchup-collections/public', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply, false);

    const validation = validateRequest(MatchupCollectionQuerySchema, request.query);
    if (!validation.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: validation.errors });
    }

    const { champion, role, limit, offset } = validation.data as {
      champion?: string;
      role?: string;
      limit: number;
      offset: number;
    };

    const where: any = { isPublic: true };
    if (champion) where.champion = champion;
    if (role) where.role = role;

    try {
      const collections = await prisma.matchupCollection.findMany({
        where,
        include: {
          user: { select: { id: true, username: true } },
          _count: { select: { items: true, savedBy: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      });

      let savedCollectionIds = new Set<string>();
      if (userId) {
        const savedCollections = await prisma.savedMatchupCollection.findMany({
          where: { userId },
          select: { collectionId: true },
        });
        savedCollectionIds = new Set(savedCollections.map((collection: { collectionId: string }) => collection.collectionId));
      }

      const total = await prisma.matchupCollection.count({ where });

      return reply.send({
        collections: collections.map((collection: any) => formatCollection(collection, userId, savedCollectionIds.has(collection.id))),
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to fetch public matchup collections');
      return reply.code(500).send({ error: 'Failed to fetch public matchup collections' });
    }
  });

  // GET /api/matchup-collections/:id - Get one collection with its cards
  fastify.get('/matchup-collections/:id', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply, false);
    const { id } = request.params;

    try {
      const collection = await prisma.matchupCollection.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, username: true } },
          items: {
            orderBy: { position: 'asc' },
            include: {
              matchup: {
                include: {
                  user: { select: { id: true, username: true } },
                },
              },
            },
          },
          _count: { select: { items: true, savedBy: true } },
        },
      });

      if (!collection) {
        return reply.code(404).send({ error: 'Collection not found' });
      }

      if (!collection.isPublic && collection.userId !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      return reply.send({ collection: formatCollection(collection, userId) });
    } catch (error: any) {
      request.log.error({ err: error, userId, collectionId: id }, 'Failed to fetch matchup collection');
      return reply.code(500).send({ error: 'Failed to fetch matchup collection' });
    }
  });

  // PUT /api/matchup-collections/:id - Update collection metadata
  fastify.put('/matchup-collections/:id', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const { id } = request.params;
    const validation = validateRequest(UpdateMatchupCollectionSchema, request.body);
    if (!validation.success) {
      return reply.code(400).send({ error: 'Invalid collection data', details: validation.errors });
    }

    try {
      const existing = await prisma.matchupCollection.findUnique({ where: { id }, select: { userId: true } });
      if (!existing) return reply.code(404).send({ error: 'Collection not found' });
      if (existing.userId !== userId) return reply.code(403).send({ error: 'Access denied' });

      const collection = await prisma.matchupCollection.update({
        where: { id },
        data: validation.data,
        include: {
          user: { select: { id: true, username: true } },
          _count: { select: { items: true, savedBy: true } },
        },
      });

      return reply.send({ collection: formatCollection(collection, userId) });
    } catch (error: any) {
      request.log.error({ err: error, userId, collectionId: id }, 'Failed to update matchup collection');
      return reply.code(500).send({ error: 'Failed to update matchup collection' });
    }
  });

  // DELETE /api/matchup-collections/:id - Delete an owned collection
  fastify.delete('/matchup-collections/:id', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const { id } = request.params;

    try {
      const existing = await prisma.matchupCollection.findUnique({ where: { id }, select: { userId: true } });
      if (!existing) return reply.code(404).send({ error: 'Collection not found' });
      if (existing.userId !== userId) return reply.code(403).send({ error: 'Access denied' });

      await prisma.matchupCollection.delete({ where: { id } });
      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error({ err: error, userId, collectionId: id }, 'Failed to delete matchup collection');
      return reply.code(500).send({ error: 'Failed to delete matchup collection' });
    }
  });

  // POST /api/matchup-collections/:id/items - Add an accessible matchup to a champion collection
  fastify.post('/matchup-collections/:id/items', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const { id } = request.params;
    const { matchupId } = request.body || {};
    if (!matchupId || typeof matchupId !== 'string') {
      return reply.code(400).send({ error: 'matchupId is required' });
    }

    try {
      const collection = await prisma.matchupCollection.findUnique({ where: { id } });
      if (!collection) return reply.code(404).send({ error: 'Collection not found' });
      if (collection.userId !== userId) return reply.code(403).send({ error: 'Access denied' });

      const matchup = await prisma.matchup.findUnique({ where: { id: matchupId } });
      if (!matchup) return reply.code(404).send({ error: 'Matchup not found' });
      if (!matchup.isPublic && matchup.userId !== userId) {
        return reply.code(403).send({ error: 'Cannot add a private matchup you do not own' });
      }
      if (matchup.myChampion !== collection.champion) {
        return reply.code(400).send({ error: 'Matchup champion must match collection champion' });
      }

      const lastItem = await prisma.matchupCollectionItem.findFirst({
        where: { collectionId: id },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      const item = await prisma.matchupCollectionItem.create({
        data: {
          collectionId: id,
          matchupId,
          position: (lastItem?.position ?? -1) + 1,
        },
      });

      return reply.code(201).send({ item });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return reply.code(409).send({ error: 'Matchup is already in this collection' });
      }
      request.log.error({ err: error, userId, collectionId: id, matchupId }, 'Failed to add matchup to collection');
      return reply.code(500).send({ error: 'Failed to add matchup to collection' });
    }
  });

  // DELETE /api/matchup-collections/:id/items/:itemId - Remove a card from an owned collection
  fastify.delete('/matchup-collections/:id/items/:itemId', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const { id, itemId } = request.params;

    try {
      const collection = await prisma.matchupCollection.findUnique({ where: { id }, select: { userId: true } });
      if (!collection) return reply.code(404).send({ error: 'Collection not found' });
      if (collection.userId !== userId) return reply.code(403).send({ error: 'Access denied' });

      await prisma.matchupCollectionItem.deleteMany({ where: { id: itemId, collectionId: id } });
      return reply.code(204).send();
    } catch (error: any) {
      request.log.error({ err: error, userId, collectionId: id, itemId }, 'Failed to remove collection item');
      return reply.code(500).send({ error: 'Failed to remove collection item' });
    }
  });

  // POST /api/matchup-collections/:id/save - Save a public collection to user's library
  fastify.post('/matchup-collections/:id/save', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const { id } = request.params;

    try {
      const collection = await prisma.matchupCollection.findUnique({ where: { id } });
      if (!collection) return reply.code(404).send({ error: 'Collection not found' });
      if (!collection.isPublic) return reply.code(403).send({ error: 'Collection is not public' });
      if (collection.userId === userId) return reply.code(400).send({ error: 'Cannot save your own collection' });

      await prisma.savedMatchupCollection.upsert({
        where: { userId_collectionId: { userId, collectionId: id } },
        update: {},
        create: { userId, collectionId: id },
      });

      return reply.code(201).send({ success: true });
    } catch (error: any) {
      request.log.error({ err: error, userId, collectionId: id }, 'Failed to save matchup collection');
      return reply.code(500).send({ error: 'Failed to save matchup collection' });
    }
  });

  // DELETE /api/matchup-collections/:id/saved - Remove a saved collection
  fastify.delete('/matchup-collections/:id/saved', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;

    const { id } = request.params;

    try {
      await prisma.savedMatchupCollection.deleteMany({
        where: { userId, collectionId: id },
      });

      return reply.code(204).send();
    } catch (error: any) {
      request.log.error({ err: error, userId, collectionId: id }, 'Failed to remove saved matchup collection');
      return reply.code(500).send({ error: 'Failed to remove saved matchup collection' });
    }
  });
  
  // GET /api/matchups - Get user's matchups (owned + saved, with optional filters)
  fastify.get('/matchups', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    
    const validation = validateRequest(MatchupQuerySchema, request.query);
    if (!validation.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: validation.errors });
    }
    
    const { myChampion, role, difficulty, limit, offset } = validation.data as {
      userId?: string;
      myChampion?: string;
      role?: string;
      difficulty?: string;
      limit: number;
      offset: number;
    };
    
    try {
      // Build where clause for filters (excluding userId since we handle that separately)
      const filterWhere: any = {};
      if (myChampion) filterWhere.myChampion = myChampion;
      if (role) filterWhere.role = role;
      if (difficulty) filterWhere.difficulty = difficulty;
      
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
          if (difficulty && sm.matchup.difficulty !== difficulty) return false;
          
          return true;
        })
        .map((sm: any) => ({
          ...sm.matchup,
          authorId: sm.matchup.userId,
          authorUsername: sm.matchup.user?.username || 'Unknown',
          isSaved: true,
          isOwned: false,
        }));
      
      // Mark owned matchups
      const ownedWithMeta = ownedMatchups.map((m: any) => ({
        ...m,
        authorId: m.userId,
        authorUsername: m.user?.username || 'Unknown',
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
      
      return reply.send({
        matchups: paginatedMatchups,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      });
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
  
  // GET /api/matchups/:id - Get single matchup (public matchups viewable without auth)
  fastify.get('/matchups/:id', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply, false); // Optional auth
    
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
      
      // Format response with author info
      const likeCount = matchup.likes.filter((l: any) => l.isLike).length;
      const dislikeCount = matchup.likes.filter((l: any) => !l.isLike).length;
      const userVote = userId ? matchup.likes.find((l: any) => l.userId === userId) : null;
      
      const formattedMatchup = {
        ...matchup,
        authorId: matchup.userId,
        authorUsername: matchup.user?.username || 'Unknown',
        likeCount,
        dislikeCount,
        userVote: userVote ? (userVote.isLike ? 'like' : 'dislike') : null,
      };
      
      return reply.send({ matchup: formattedMatchup });
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
  
  // GET /api/matchups/count - Get user's matchup library count (for smart default view)
  fastify.get('/matchups/count', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    
    try {
      // Count owned matchups
      const ownedCount = await prisma.matchup.count({
        where: { userId },
      });
      
      // Count saved matchups
      const savedCount = await prisma.savedMatchup.count({
        where: { userId },
      });
      
      const total = ownedCount + savedCount;
      
      return reply.send({ count: total, owned: ownedCount, saved: savedCount });
    } catch (error: any) {
      request.log.error({ err: error, userId }, 'Failed to get matchup count');
      return reply.code(500).send({ error: 'Failed to get matchup count' });
    }
  });
  
  // GET /api/matchups/featured - Get trending and best-rated matchups for marketplace
  fastify.get('/matchups/featured', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply, false); // Optional auth
    
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Get all public matchups with their likes
      const publicMatchups = await prisma.matchup.findMany({
        where: { isPublic: true },
        include: {
          user: {
            select: { id: true, username: true },
          },
          likes: {
            select: { isLike: true, createdAt: true, userId: true },
          },
        },
      });
      
      // Check which matchups user has saved
      let userSavedMatchups: { matchupId: string }[] = [];
      if (userId) {
        userSavedMatchups = await prisma.savedMatchup.findMany({
          where: { userId },
          select: { matchupId: true },
        });
      }
      
      // Calculate scores for each matchup
      const processedMatchups = publicMatchups.map((m: any) => {
        const likeCount = m.likes.filter((l: any) => l.isLike).length;
        const dislikeCount = m.likes.filter((l: any) => !l.isLike).length;
        const totalVotes = likeCount + dislikeCount;
        
        // Trending score: interactions in last 7 days
        const recentInteractions = m.likes.filter((l: any) => 
          new Date(l.createdAt) >= sevenDaysAgo
        ).length;
        
        // Best rated score: weighted by engagement
        // Formula: likeCount * (likeCount / totalVotes) - gives higher weight to guides with more votes AND good ratio
        const ratingScore = totalVotes > 0 
          ? likeCount * (likeCount / totalVotes)
          : 0;
        
        const userVote = userId ? m.likes.find((l: any) => l.userId === userId) : null;
        const isDownloaded = userId ? userSavedMatchups.some(sm => sm.matchupId === m.id) : false;
        
        return {
          id: m.id,
          myChampion: m.myChampion,
          enemyChampion: m.enemyChampion,
          role: m.role,
          difficulty: m.difficulty,
          title: m.title,
          description: m.description,
          authorId: m.userId,
          authorUsername: m.user?.username || 'Unknown',
          likeCount,
          dislikeCount,
          downloadCount: m.downloadCount,
          userVote: userVote ? (userVote.isLike ? 'like' : 'dislike') : null,
          isDownloaded,
          createdAt: m.createdAt,
          recentInteractions,
          ratingScore,
        };
      });
      
      // Get top 3 trending (most recent interactions)
      const trending = [...processedMatchups]
        .sort((a, b) => b.recentInteractions - a.recentInteractions || b.downloadCount - a.downloadCount)
        .slice(0, 3);
      
      // Get top 3 best rated (highest rating score, minimum 1 vote to qualify)
      const bestRated = [...processedMatchups]
        .filter(m => (m.likeCount + m.dislikeCount) >= 1)
        .sort((a, b) => b.ratingScore - a.ratingScore || b.downloadCount - a.downloadCount)
        .slice(0, 3);
      
      return reply.send({ trending, bestRated });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to fetch featured matchups');
      return reply.code(500).send({ error: 'Failed to fetch featured matchups' });
    }
  });
  
  // GET /api/matchups/public - Browse public matchups (marketplace)
  fastify.get('/matchups/public', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply, false); // Optional auth
    
    const validation = validateRequest(PublicMatchupQuerySchema, request.query);
    if (!validation.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: validation.errors });
    }
    
    const { search, myChampion, enemyChampion, role, difficulty, sortBy, limit, offset } = validation.data as {
      search?: string;
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
    if (search) {
      where.OR = [
        { myChampion: { contains: search, mode: 'insensitive' } },
        { enemyChampion: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
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
      
      return reply.send({
        matchups: finalMatchups,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      });
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
