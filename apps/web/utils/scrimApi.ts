import { getAuthToken } from './auth';

export const SCRIM_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export function buildScrimRequestInit(
  token: string | null,
  init: RequestInit = {},
): RequestInit {
  const method = String(init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Fastify rejects bodyless POST requests when intermediaries inject an
  // unsupported or empty content type. Send a valid empty JSON payload for
  // POSTs that intentionally have no business data, while leaving truly bodyless
  // non-POST requests alone.
  if (method === 'POST' && init.body === undefined) {
    init = {
      ...init,
      body: '{}',
    };
  }

  if (init.body !== undefined && init.body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    ...init,
    credentials: init.credentials || 'include',
    headers,
  };
}

export async function scrimApiRequest<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${SCRIM_API_URL}/api${path}`,
    buildScrimRequestInit(getAuthToken(), init),
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Something went wrong');
  }
  return payload as T;
}
