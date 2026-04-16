import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import { requireAdmin } from '../middleware/auth';
import { getOrSetCache } from '../utils/requestCache';

const PROTECTED_PRESTIGE_BADGE_KEYS = new Set([
  'shop_fortune_coin',
  'shop_oracle_dice',
  'shop_jackpot_crown',
  'shop_vault_ascendant',
]);

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

const BADGES_CACHE_TTL_SECONDS = toPositiveInt(process.env.BADGES_CACHE_TTL_SECONDS, 180);

/**
 * Badge Management Routes (Admin only)
 * CRUD operations for badge creation, editing, deletion
 */
export default async function badgeRoutes(fastify: FastifyInstance) {
  // Get all badges
  fastify.get('/', async (request: any, reply: any) => {
    try {
      const payload = await getOrSetCache('api:badges:list:v1', BADGES_CACHE_TTL_SECONDS, async () => {
        const badges = await prisma.badge.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { users: true }
            }
          }
        });

        return { badges };
      });

      return reply.send(payload);
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to fetch badges' });
    }
  });

  // Create new badge (admin only)
  fastify.post('/', async (request: any, reply: any) => {
    const adminCheck = await requireAdmin(request, reply, prisma);
    if (!adminCheck) return;

    try {
      const { key, name, description, icon, bgColor, borderColor, textColor, hoverBg, shape, animation } = request.body as {
        key: string;
        name: string;
        description?: string;
        icon?: string;
        bgColor?: string;
        borderColor?: string;
        textColor?: string;
        hoverBg?: string;
        shape?: string;
        animation?: string;
      };

      if (!key || !name) {
        return reply.code(400).send({ error: 'Key and name are required' });
      }

      if (PROTECTED_PRESTIGE_BADGE_KEYS.has(String(key).trim().toLowerCase())) {
        return reply.code(403).send({ error: 'This prestige badge key is reserved and managed by the cosmetics system.' });
      }

      // Check if badge key already exists
      const existing = await prisma.badge.findUnique({ where: { key } });
      if (existing) {
        return reply.code(400).send({ error: 'Badge with this key already exists' });
      }

      const badge = await prisma.badge.create({
        data: {
          key,
          name,
          description: description || null,
          icon: icon || 'trophy',
          bgColor: bgColor || 'rgba(96, 165, 250, 0.20)',
          borderColor: borderColor || '#60A5FA',
          textColor: textColor || '#93C5FD',
          hoverBg: hoverBg || 'rgba(96, 165, 250, 0.30)',
          shape: shape || 'squircle',
          animation: animation || 'breathe',
        },
      });

      return reply.send({ badge, message: 'Badge created successfully' });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to create badge' });
    }
  });

  // Update badge (admin only)
  fastify.patch('/:badgeId', async (request: any, reply: any) => {
    const adminCheck = await requireAdmin(request, reply, prisma);
    if (!adminCheck) return;

    try {
      const { badgeId } = request.params as { badgeId: string };
      const { name, description, icon, bgColor, borderColor, textColor, hoverBg, shape, animation } = request.body as {
        name?: string;
        description?: string;
        icon?: string;
        bgColor?: string;
        borderColor?: string;
        textColor?: string;
        hoverBg?: string;
        shape?: string;
        animation?: string;
      };

      const existingBadge = await prisma.badge.findUnique({
        where: { id: badgeId },
        select: { key: true },
      });

      if (!existingBadge) {
        return reply.code(404).send({ error: 'Badge not found' });
      }

      if (PROTECTED_PRESTIGE_BADGE_KEYS.has(existingBadge.key.toLowerCase())) {
        return reply.code(403).send({ error: 'Prestige shop badges are hardcoded and cannot be edited.' });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (icon !== undefined) updateData.icon = icon;
      if (bgColor !== undefined) updateData.bgColor = bgColor;
      if (borderColor !== undefined) updateData.borderColor = borderColor;
      if (textColor !== undefined) updateData.textColor = textColor;
      if (hoverBg !== undefined) updateData.hoverBg = hoverBg;
      if (shape !== undefined) updateData.shape = shape;
      if (animation !== undefined) updateData.animation = animation;

      const badge = await prisma.badge.update({
        where: { id: badgeId },
        data: updateData,
      });

      return reply.send({ badge, message: 'Badge updated successfully' });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to update badge' });
    }
  });

  // Delete badge (admin only)
  fastify.delete('/:badgeId', async (request: any, reply: any) => {
    const adminCheck = await requireAdmin(request, reply, prisma);
    if (!adminCheck) return;

    try {
      const { badgeId } = request.params as { badgeId: string };

      const existingBadge = await prisma.badge.findUnique({
        where: { id: badgeId },
        select: { key: true },
      });

      if (!existingBadge) {
        return reply.code(404).send({ error: 'Badge not found' });
      }

      if (PROTECTED_PRESTIGE_BADGE_KEYS.has(existingBadge.key.toLowerCase())) {
        return reply.code(403).send({ error: 'Prestige shop badges are hardcoded and cannot be deleted.' });
      }

      await prisma.badge.delete({
        where: { id: badgeId },
      });

      return reply.send({ message: 'Badge deleted successfully' });
    } catch (error: any) {
      request.log?.error(error);
      return reply.code(500).send({ error: 'Failed to delete badge' });
    }
  });
}
