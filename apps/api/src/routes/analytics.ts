import { FastifyInstance } from 'fastify';
import { sendDiscordWebhook, createNewVisitorEmbed } from '../utils/discord-webhook';

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // Track new visitor (called from frontend on first visit)
  fastify.post('/analytics/visitor', async (request: any, reply: any) => {
    try {
      const userAgent = request.headers['user-agent'] || 'Unknown';
      const ip = request.headers['x-forwarded-for'] || request.ip || 'Unknown';

      // Send Discord notification (don't wait for it)
      sendDiscordWebhook(
        '👁️ New website visitor',
        [createNewVisitorEmbed({
          userAgent,
          ip: typeof ip === 'string' ? ip : ip[0],
          timestamp: new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }),
        })]
      ).catch(err => console.error('[Discord] Failed to send visitor webhook:', err));

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to track visitor' });
    }
  });
}
