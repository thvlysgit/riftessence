import { FastifyInstance } from 'fastify';

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // Retired: routine visitor IP/user-agent notifications have no operational purpose.
  fastify.post('/analytics/visitor', async (request: any, reply: any) => {
    return reply.code(410).send({ error: 'Visitor notifications have been retired.' });
  });
}
