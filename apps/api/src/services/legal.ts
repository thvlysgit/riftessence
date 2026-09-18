import { LEGAL_VERSION, LegalAcceptanceInput } from '../utils/legalPolicy';
import prisma from '../prisma';

export function isValidLegalAcceptance(value: unknown): value is LegalAcceptanceInput {
  const input = value as LegalAcceptanceInput | null;
  return Boolean(input && input.version === LEGAL_VERSION && input.termsAccepted === true &&
    input.privacyAcknowledged === true && input.eligibilityConfirmed === true &&
    ['15-17', '18+'].includes(input.ageGroup) && ['en', 'fr'].includes(input.locale));
}

export function legalAcceptanceData(input: LegalAcceptanceInput, source: string) {
  const acceptedAt = new Date();
  return {
    legalAcceptedVersion: LEGAL_VERSION,
    legalAcceptedAt: acceptedAt,
    legalAgeGroup: input.ageGroup,
    legalAcceptances: { create: { ...legalAcceptanceFields(input), source, acceptedAt } },
  };
}

// Never pass untrusted extra body fields (userId, acceptedAt, source) to Prisma.
export function legalAcceptanceFields(input: LegalAcceptanceInput): LegalAcceptanceInput {
  const { version, termsAccepted, privacyAcknowledged, eligibilityConfirmed, ageGroup, locale } = input;
  return { version, termsAccepted, privacyAcknowledged, eligibilityConfirmed, ageGroup, locale };
}

export const legalRequiredResponse = {
  code: 'LEGAL_ACCEPTANCE_REQUIRED',
  error: 'Please review the terms and privacy notices and confirm your eligibility before using your account.',
  requiredVersion: LEGAL_VERSION,
};

// Runs after the global session check. This covers routes that verify JWTs directly too.
export async function enforceLegalAcceptance(request: any, reply: any) {
  if (!request.userId || request.method === 'OPTIONS') return;
  const path = String(request.url).split('?')[0];
  if (['/api/legal/status', '/api/legal/accept', '/api/auth/login', '/api/auth/register', '/api/auth/logout', '/api/auth/refresh', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/discord/auth', '/api/auth/discord/callback', '/api/auth/riot/auth', '/api/auth/riot/callback'].includes(path)) return;
  if (request.method === 'GET' && path === '/api/user/profile') return;
  try {
    const user = await prisma.user.findUnique({ where: { id: request.userId }, select: { legalAcceptedVersion: true } });
    if (user?.legalAcceptedVersion !== LEGAL_VERSION) return reply.code(428).send(legalRequiredResponse);
  } catch (error) {
    request.log.error(error);
    return reply.code(503).send({ error: 'Could not verify your legal acceptance. Please try again.' });
  }
}
