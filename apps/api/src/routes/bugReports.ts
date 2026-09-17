import { FastifyInstance } from 'fastify';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import {
  parseDiscordContact,
  parseReportEvidence,
} from '../utils/reportEvidence';

const DEFAULT_CHANNEL_ID = '1374090454194323526';
const CHANNEL_ID_PATTERN = /^\d{17,20}$/;

function requireBot(request: any, reply: any): boolean {
  const key = process.env.DISCORD_BOT_API_KEY;
  if (!key) {
    reply.code(503).send({ error: 'Bot API key not configured' });
    return false;
  }
  if (request.headers.authorization !== `Bearer ${key}`) {
    reply.code(403).send({ error: 'Bot access required' });
    return false;
  }
  return true;
}

async function requireAdmin(request: any, reply: any): Promise<string | null> {
  const userId = await getUserIdFromRequest(request, reply);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { badges: true },
  });
  if (
    !user?.badges?.some(
      (badge: { key: string }) => badge.key.toLowerCase() === 'admin',
    )
  ) {
    reply.code(403).send({ error: 'Admin access required' });
    return null;
  }
  return userId;
}

export default async function bugReportRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/discord/bug-reports/outgoing',
    async (request: any, reply: any) => {
      if (!requireBot(request, reply)) return;
      const [reports, settings] = await Promise.all([
        prisma.bugReport.findMany({
          where: { discordMessageId: null },
          include: {
            reporter: {
              select: {
                username: true,
                discordAccount: { select: { username: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 20,
        }),
        prisma.bugReportSettings.findUnique({ where: { id: 'global' } }),
      ]);
      return reply.send({
        reports,
        channelId: settings?.discordChannelId || DEFAULT_CHANNEL_ID,
      });
    },
  );

  fastify.patch(
    '/discord/bug-reports/:id/forwarded',
    async (request: any, reply: any) => {
      if (!requireBot(request, reply)) return;
      const messageId = request.body?.messageId;
      if (
        typeof messageId !== 'string' ||
        !CHANNEL_ID_PATTERN.test(messageId)
      ) {
        return reply.code(400).send({ error: 'Invalid Discord message ID' });
      }
      const result = await prisma.bugReport.updateMany({
        where: { id: request.params.id, discordMessageId: null },
        data: { discordMessageId: messageId, forwardedAt: new Date() },
      });
      return reply.send({ success: result.count === 1 });
    },
  );

  fastify.post(
    '/bug-report',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request: any, reply: any) => {
      const body =
        request.body && typeof request.body === 'object' ? request.body : {};
      const description =
        typeof body.description === 'string' ? body.description.trim() : '';
      const pageUrl =
        typeof body.pageUrl === 'string'
          ? body.pageUrl.trim().slice(0, 500)
          : '';
      const evidence = parseReportEvidence(body.evidenceUrls);
      const discord = parseDiscordContact(body.contactDiscord);
      if (description.length < 10 || description.length > 2000) {
        return reply
          .code(400)
          .send({
            error: 'Bug description must be between 10 and 2000 characters',
          });
      }
      if (evidence.error || discord.error)
        return reply.code(400).send({ error: evidence.error || discord.error });

      try {
        const userId = await getUserIdFromRequest(request, reply, false);
        const report = await prisma.bugReport.create({
          data: {
            description,
            pageUrl,
            evidenceUrls: evidence.urls,
            contactDiscord: discord.contact,
            userAgent: String(request.headers['user-agent'] || '').slice(
              0,
              200,
            ),
            reporterId: userId,
          },
        });
        return reply
          .code(201)
          .send({ success: true, id: report.id, queued: true });
      } catch (error) {
        request.log.error({ error }, 'Failed to save bug report');
        return reply.code(500).send({ error: 'Failed to submit bug report' });
      }
    },
  );

  fastify.get('/admin/bug-reports', async (request: any, reply: any) => {
    if (!(await requireAdmin(request, reply))) return;
    const status = request.query?.status;
    if (status && !['OPEN', 'RESOLVED'].includes(status))
      return reply.code(400).send({ error: 'Invalid status' });
    const [reports, settings] = await Promise.all([
      prisma.bugReport.findMany({
        where: status ? { status } : {},
        include: { reporter: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.bugReportSettings.findUnique({ where: { id: 'global' } }),
    ]);
    return reply.send({
      reports,
      channelId: settings?.discordChannelId || DEFAULT_CHANNEL_ID,
    });
  });

  fastify.put(
    '/admin/bug-report-settings',
    async (request: any, reply: any) => {
      const adminId = await requireAdmin(request, reply);
      if (!adminId) return;
      const channelId =
        typeof request.body?.channelId === 'string'
          ? request.body.channelId.trim()
          : '';
      if (!CHANNEL_ID_PATTERN.test(channelId))
        return reply
          .code(400)
          .send({ error: 'Enter a valid Discord channel ID' });
      const settings = await prisma.bugReportSettings.upsert({
        where: { id: 'global' },
        update: { discordChannelId: channelId, updatedBy: adminId },
        create: {
          id: 'global',
          discordChannelId: channelId,
          updatedBy: adminId,
        },
      });
      return reply.send({ channelId: settings.discordChannelId });
    },
  );

  fastify.patch('/admin/bug-reports/:id', async (request: any, reply: any) => {
    const adminId = await requireAdmin(request, reply);
    if (!adminId) return;
    const { id } = request.params;
    const action = request.body?.action;
    if (!['RESOLVE', 'REOPEN'].includes(action)) {
      return reply.code(400).send({ error: 'Invalid action' });
    }
    const report = await prisma.bugReport.findUnique({ where: { id } });
    if (!report) return reply.code(404).send({ error: 'Bug report not found' });
    const updated = await prisma.bugReport.update({
      where: { id },
      data:
        action === 'RESOLVE'
          ? { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: adminId }
          : { status: 'OPEN', resolvedAt: null, resolvedBy: null },
    });
    return reply.send({ report: updated });
  });
}
