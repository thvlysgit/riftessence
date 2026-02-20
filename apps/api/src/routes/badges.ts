import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import { requireAdmin } from '../middleware/auth';

/**
 * Badge Management Routes (Admin only)
 * CRUD operations for badge creation, editing, deletion
 */
export default async function badgeRoutes(fastify: FastifyInstance) {
  // Get all badges
  fastify.get('/', async (request: any, reply: any) => {
    try {
      const badges = await prisma.badge.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { users: true }
          }
        }
      });
      return reply.send({ badges });
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
      const { key, name, description, icon, bgColor, borderColor, textColor, hoverBg } = request.body as {
        key: string;
        name: string;
        description?: string;
        icon?: string;
        bgColor?: string;
        borderColor?: string;
        textColor?: string;
        hoverBg?: string;
      };

      if (!key || !name) {
        return reply.code(400).send({ error: 'Key and name are required' });
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
          icon: icon || '🏆',
          bgColor: bgColor || 'rgba(96, 165, 250, 0.20)',
          borderColor: borderColor || '#60A5FA',
          textColor: textColor || '#93C5FD',
          hoverBg: hoverBg || 'rgba(96, 165, 250, 0.30)',
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
      const { name, description, icon, bgColor, borderColor, textColor, hoverBg } = request.body as {
        name?: string;
        description?: string;
        icon?: string;
        bgColor?: string;
        borderColor?: string;
        textColor?: string;
        hoverBg?: string;
      };

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (icon !== undefined) updateData.icon = icon;
      if (bgColor !== undefined) updateData.bgColor = bgColor;
      if (borderColor !== undefined) updateData.borderColor = borderColor;
      if (textColor !== undefined) updateData.textColor = textColor;
      if (hoverBg !== undefined) updateData.hoverBg = hoverBg;

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
