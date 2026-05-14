/**
 * Utility functions for authentication and token handling
 */

const COOKIE_SESSION_MARKER_KEY = 'lfd_session_present';
const COOKIE_SESSION_AUTH_PLACEHOLDER = '__cookie_session__';
const API_FETCH_CREDENTIALS_PATCH_KEY = '__riftessenceApiFetchCredentialsPatched';

export function isCookieSessionPlaceholder(token: string | null | undefined): boolean {
  return token === COOKIE_SESSION_AUTH_PLACEHOLDER;
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
    const payload = atob(base64Url + padding);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Extracts the user ID from a JWT token (decoded payload)
 */
export function getUserIdFromToken(token: string): string | null {
  if (isCookieSessionPlaceholder(token)) {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('lfd_userId');
    } catch {
      return null;
    }
  }
  const payload = decodeJwtPayload(token);
  return payload?.userId || null;
}

/**
 * Checks if JWT token is expired or will expire soon (within 1 hour)
 */
export function isTokenExpiringSoon(token: string): boolean {
  if (isCookieSessionPlaceholder(token)) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;

  const expirationTime = payload.exp * 1000;
  const currentTime = Date.now();
  const oneHour = 60 * 60 * 1000;

  return (expirationTime - currentTime) < oneHour;
}

/**
 * Checks if JWT token is already expired.
 */
export function isTokenExpired(token: string): boolean {
  if (isCookieSessionPlaceholder(token)) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return (payload.exp * 1000) <= Date.now();
}

// Global refresh promise to prevent race conditions
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempts to refresh the authentication token
 * Returns new token if successful, null otherwise
 * RACE CONDITION FIX: Prevents multiple simultaneous refresh attempts
 */
export async function refreshAuthToken(apiUrl: string): Promise<string | null> {
  // Return existing refresh promise if already refreshing
  if (refreshPromise) {
    return refreshPromise;
  }
  
  const currentToken = getAuthToken();
  
  refreshPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentToken) {
        headers.Authorization = `Bearer ${currentToken}`;
      }

      const res = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setAuthToken(data.token);
          return data.token;
        }
      }
      return null;
    } catch (e) {
      console.error('Failed to refresh token:', e);
      return null;
    } finally {
      // Clear promise after completion
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

/**
 * Gets a legacy JWT token from localStorage, or a non-secret cookie-session marker.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('lfd_token') || (hasCookieSessionMarker() ? COOKIE_SESSION_AUTH_PLACEHOLDER : null);
  } catch (e) {
    console.error('Failed to read auth token from localStorage:', e);
    return null;
  }
}

/**
 * Marks the browser as having a cookie session without writing JWTs to localStorage.
 */
export function setAuthToken(_token: string): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = decodeJwtPayload(_token);
    localStorage.removeItem('lfd_token');
    if (payload?.userId) {
      localStorage.setItem('lfd_userId', payload.userId);
    }
    localStorage.setItem(COOKIE_SESSION_MARKER_KEY, '1');
  } catch (e) {
    console.error('Failed to mark auth session:', e);
  }
}

export function markCookieSessionPresent(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (userId) {
      localStorage.setItem('lfd_userId', userId);
    }
    localStorage.setItem(COOKIE_SESSION_MARKER_KEY, '1');
  } catch (e) {
    console.error('Failed to mark cookie session:', e);
  }
}

function hasCookieSessionMarker(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(COOKIE_SESSION_MARKER_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Removes JWT token from localStorage
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('lfd_token');
    localStorage.removeItem(COOKIE_SESSION_MARKER_KEY);
  } catch (e) {
    console.error('Failed to clear auth token from localStorage:', e);
  }
}

/**
 * Clears all authentication-related data from localStorage
 * This includes the JWT token and any legacy userId keys
 */
export function clearAllAuthState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('lfd_token');
    localStorage.removeItem('lfd_userId'); // Legacy key cleanup
    localStorage.removeItem(COOKIE_SESSION_MARKER_KEY);
  } catch (e) {
    console.error('Failed to clear auth state from localStorage:', e);
  }
}

/**
 * Creates Authorization header with Bearer token
 */
export function getAuthHeader(): { Authorization: string } | {} {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function installApiFetchCredentials(apiUrl: string): void {
  if (typeof window === 'undefined') return;

  const win = window as any;
  if (win[API_FETCH_CREDENTIALS_PATCH_KEY]) return;
  win[API_FETCH_CREDENTIALS_PATCH_KEY] = true;

  const nativeFetch = window.fetch.bind(window);
  const normalizedApiUrl = apiUrl.replace(/\/$/, '');

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    const isConfiguredApi = normalizedApiUrl && rawUrl.startsWith(`${normalizedApiUrl}/`);
    const isRelativeApi = rawUrl.startsWith('/api/');

    if (!isConfiguredApi && !isRelativeApi) {
      return nativeFetch(input, init);
    }

    return nativeFetch(input, {
      ...init,
      credentials: init?.credentials || 'include',
    });
  };
}
