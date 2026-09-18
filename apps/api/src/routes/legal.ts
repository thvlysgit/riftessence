import { FastifyInstance } from 'fastify';
import { LEGAL_VERSION } from '../utils/legalPolicy';
import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { isValidLegalAcceptance, legalAcceptanceFields, legalRequiredResponse } from '../services/legal';

export default async function legalRoutes(app: FastifyInstance) {
  app.get('/legal/status', async (request, reply) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { legalAcceptedVersion: true, legalAcceptedAt: true, legalAgeGroup: true } });
    return { accepted: user?.legalAcceptedVersion === LEGAL_VERSION, requiredVersion: LEGAL_VERSION, acceptedAt: user?.legalAcceptedAt, ageGroup: user?.legalAgeGroup };
  });

  app.post('/legal/accept', { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request, reply) => {
    const userId = await getUserIdFromRequest(request, reply);
    if (!userId) return;
    if (!isValidLegalAcceptance(request.body)) return reply.code(400).send(legalRequiredResponse);
    const input = legalAcceptanceFields(request.body);
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Serialize acceptance so retries preserve the original receipt and its timestamp.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const receipt = await tx.legalAcceptance.upsert({
        where: { userId_version: { userId, version: LEGAL_VERSION } },
        create: { userId, ...input, source: 'authenticated-review' },
        update: {},
      });
      await tx.user.update({ where: { id: userId }, data: { legalAcceptedVersion: LEGAL_VERSION, legalAcceptedAt: receipt.acceptedAt, legalAgeGroup: receipt.ageGroup } });
    });
    return { accepted: true, version: LEGAL_VERSION };
  });
}
