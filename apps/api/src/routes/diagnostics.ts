import { z } from 'zod';
import prisma from '../prisma';
import { getUserIdFromRequest, requireAdmin } from '../middleware/auth';
import { apiRuntimeSnapshot } from '../services/apiDiagnostics';
import { logAdminAction } from '../utils/auditLog';

const IncidentUpdateSchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']),
  note: z.string().trim().max(1_000).optional().nullable(),
});

function safeInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export default async function diagnosticsRoutes(fastify: any) {
  fastify.get('/admin/diagnostics', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    if (!(await requireAdmin(request, reply, prisma))) return;

    const query = (request.query || {}) as Record<string, unknown>;
    const limit = safeInt(query.limit, 50, 1, 100);
    const status = typeof query.status === 'string' && ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(query.status)
      ? query.status
      : undefined;
    const userFilter = typeof query.user === 'string' ? query.user.trim().slice(0, 200) : '';
    const routeFilter = typeof query.route === 'string' ? query.route.trim().slice(0, 200) : '';
    const matchedUser = userFilter
      ? await prisma.user.findFirst({
          where: { OR: [{ id: userFilter }, { username: { equals: userFilter, mode: 'insensitive' } }] },
          select: { id: true, username: true },
        })
      : null;
    const where = {
      ...(status ? { status } : {}),
      ...(userFilter ? { userId: matchedUser?.id || '__no_matching_user__' } : {}),
      ...(routeFilter ? { route: { contains: routeFilter, mode: 'insensitive' } } : {}),
    };

    try {
      const dbStartedAt = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const databaseLatencyMs = Date.now() - dbStartedAt;
      const [incidents, processRuns, openCount, fatalCount] = await Promise.all([
        prisma.systemIncident.findMany({ where, orderBy: { lastSeenAt: 'desc' }, take: limit }),
        prisma.apiProcessRun.findMany({ orderBy: { startedAt: 'desc' }, take: 12 }),
        prisma.systemIncident.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }),
        prisma.systemIncident.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] }, severity: 'FATAL' } }),
      ]);

      return reply.send({
        runtime: apiRuntimeSnapshot(),
        database: { status: 'ok', latencyMs: databaseLatencyMs },
        summary: { openCount, fatalCount },
        matchedUser,
        incidents,
        processRuns,
      });
    } catch (error) {
      request.log.error({ err: error }, 'Failed to load API diagnostics');
      return reply.code(503).send({
        error: 'Diagnostics storage is unavailable.',
        code: 'DIAGNOSTICS_UNAVAILABLE',
        runtime: apiRuntimeSnapshot(),
        database: { status: 'error' },
      });
    }
  });

  fastify.patch('/admin/diagnostics/incidents/:id', async (request: any, reply: any) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    if (!(await requireAdmin(request, reply, prisma))) return;

    const parsed = IncidentUpdateSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid incident update.', code: 'INVALID_INCIDENT_UPDATE' });
    }
    const id = String(request.params?.id || '');
    const now = new Date();
    try {
      const incident = await prisma.systemIncident.update({
        where: { id },
        data: {
          status: parsed.data.status,
          acknowledgedAt: parsed.data.status === 'ACKNOWLEDGED' ? now : parsed.data.status === 'OPEN' ? null : undefined,
          acknowledgedById: parsed.data.status === 'ACKNOWLEDGED' ? userId : parsed.data.status === 'OPEN' ? null : undefined,
          resolvedAt: parsed.data.status === 'RESOLVED' ? now : null,
          resolvedById: parsed.data.status === 'RESOLVED' ? userId : null,
          resolutionNote: parsed.data.status === 'RESOLVED' ? parsed.data.note || null : null,
        },
      });
      await logAdminAction({
        adminId: userId,
        action: 'SYSTEM_INCIDENT_UPDATED',
        targetId: incident.id,
        details: { status: parsed.data.status, note: parsed.data.note || null },
      });
      return reply.send({ incident });
    } catch (error: any) {
      if (error?.code === 'P2025') return reply.code(404).send({ error: 'Incident not found.' });
      request.log.error({ err: error }, 'Failed to update API incident');
      return reply.code(500).send({ error: 'Failed to update incident.' });
    }
  });
}
