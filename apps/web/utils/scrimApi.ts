import { getAuthToken } from './auth';

export const SCRIM_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export function buildScrimRequestInit(
  token: string | null,
  init: RequestInit = {},
): RequestInit {
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Fastify rejects an empty request when JSON is declared. Only advertise JSON
  // when the request actually contains a body.
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
