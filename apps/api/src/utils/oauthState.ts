import { createHmac, timingSafeEqual } from 'crypto';

const STATE_TTL_MS = 10 * 60 * 1000;

type OAuthStatePayload = {
  timestamp: number;
  [key: string]: unknown;
};

function getStateSecret(): string {
  return process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || '';
}

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, 'base64');
}

function sign(payload: string, secret: string): string {
  return toBase64Url(createHmac('sha256', secret).update(payload).digest());
}

export function createOAuthState(payload: Omit<OAuthStatePayload, 'timestamp'>): string {
  const secret = getStateSecret();
  if (!secret) {
    throw new Error('OAUTH_STATE_SECRET or JWT_SECRET must be configured');
  }

  const encodedPayload = toBase64Url(JSON.stringify({
    ...payload,
    timestamp: Date.now(),
  }));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function parseOAuthState<T extends OAuthStatePayload>(state: string): T | null {
  const secret = getStateSecret();
  if (!secret) return null;

  const [encodedPayload, signature] = state.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8')) as T;
    if (!payload?.timestamp || Date.now() - payload.timestamp > STATE_TTL_MS) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
