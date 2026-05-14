import { FastifyReply, FastifyRequest } from 'fastify';

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'lfd_session';

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getSessionCookieOptions() {
  const domain = process.env.SESSION_COOKIE_DOMAIN?.trim();

  return {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: toPositiveInt(process.env.SESSION_COOKIE_MAX_AGE_SECONDS, 12 * 60 * 60),
    ...(domain ? { domain } : {}),
  };
}

export function getSessionCookieToken(request: FastifyRequest): string | null {
  const cookies = (request as any).cookies;
  const token = cookies?.[SESSION_COOKIE_NAME];
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

export function setAuthSessionCookie(reply: FastifyReply, token: string) {
  (reply as any).setCookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
}

export function clearAuthSessionCookie(reply: FastifyReply) {
  (reply as any).clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
}
