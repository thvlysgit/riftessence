/**
 * Utility functions for authentication and token handling
 */

/**
 * Extracts the user ID from a JWT token (decoded payload)
 */
export function getUserIdFromToken(token: string): string | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode payload (base64url)
    const payload = JSON.parse(atob(parts[1]));
    return payload.userId || null;
  } catch (e) {
    return null;
  }
}

/**
 * Checks if JWT token is expired or will expire soon (within 1 hour)
 */
export function isTokenExpiringSoon(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return true;
    
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    return (expirationTime - currentTime) < oneHour;
  } catch (e) {
    return true;
  }
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
