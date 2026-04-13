/**
 * Utility functions for authentication and token handling
 */

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
  const payload = decodeJwtPayload(token);
  return payload?.userId || null;
}

/**
 * Checks if JWT token is expired or will expire soon (within 1 hour)
 */
export function isTokenExpiringSoon(token: string): boolean {
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
  if (!currentToken) return null;
  
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
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
 * Gets stored JWT token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('lfd_token');
  } catch (e) {
    console.error('Failed to read auth token from localStorage:', e);
    return null;
  }
}

/**
 * Stores JWT token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('lfd_token', token);
  } catch (e) {
    console.error('Failed to store auth token in localStorage:', e);
  }
}

/**
 * Removes JWT token from localStorage
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('lfd_token');
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
