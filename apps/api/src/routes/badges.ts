import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import { requireAdmin } from '../middleware/auth';
import { cacheDel } from '../utils/cache';
import { getOrSetCache } from '../utils/requestCache';

const BADGES_CACHE_KEY = 'api:badges:list:v2';
const PROTECTED_BADGE_KEYS = new Set(['admin']);

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

const BADGES_CACHE_TTL_SECONDS = toPositiveInt(process.env.BADGES_CACHE_TTL_SECONDS, 180);

/**
 * Badge records only describe ownership and labels now. Artwork is a standardized,
 * code-owned system in the web app, so the admin API intentionally exposes no
 * manual create or styling endpoints.
 */
export default async function badgeRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: any, reply: any) => {
    try {
      const payload = await getOrSetCache(BADGES_CACHE_KEY, BADGES_CACHE_TTL_SECONDS, async () => {
        const badges = await prisma.badge.findMany({
          orderBy: { name: 'asc' },
          include: { _count: { select: { users: true } } },
        });
        return { badges };
      });

      return reply.send(payload);
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to fetch badges' });
    }
  });

  fastify.delete('/:badgeId', async (request: any, reply: any) => {
    const adminCheck = await requireAdmin(request, reply, prisma);
    if (!adminCheck) return;

    try {
      const { badgeId } = request.params as { badgeId: string };
      const existingBadge = await prisma.badge.findUnique({
        where: { id: badgeId },
        select: { key: true, name: true },
      });

      if (!existingBadge) return reply.code(404).send({ error: 'Badge not found' });
      if (PROTECTED_BADGE_KEYS.has(existingBadge.key.trim().toLowerCase())) {
        return reply.code(403).send({ error: 'The admin badge controls administrative access and cannot be deleted.' });
      }

      await prisma.badge.delete({ where: { id: badgeId } });
      await cacheDel(BADGES_CACHE_KEY);

      return reply.send({ message: `${existingBadge.name} deleted successfully` });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to delete badge' });
    }
  });
}
