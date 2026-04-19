import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken, setAuthToken, clearAllAuthState, getAuthHeader, isTokenExpiringSoon, isTokenExpired, refreshAuthToken } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface User {
  id: string;
  username: string;
  email?: string;
  bio?: string;
  region?: string | null;
  verified: boolean;
  badges?: Array<{ key: string; name: string }>;
  riotAccountsCount?: number;
  onboardingCompleted?: boolean;
  profileIconId?: number;
  discordLinked?: boolean;
  discordUsername?: string | null;
  activeUsernameDecoration?: string | null;
  activeHoverEffect?: string | null;
  activeNameplateFont?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isBannedPayload = (payload: any) => (
    payload?.code === 'ACCOUNT_BANNED' || payload?.code === 'IP_BLACKLISTED'
  );

  const isInvalidSessionPayload = (payload: any) => {
    const code = String(payload?.code || '').toUpperCase();
    const message = String(payload?.error || '').toLowerCase();
    return code === 'UNAUTHORIZED'
      || code === 'TOKEN_EXPIRED'
      || code === 'INVALID_TOKEN'
      || message.includes('unauthorized')
      || message.includes('invalid token')
      || message.includes('token expired');
  };

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = getAuthToken();
        if (token) {
          // Try refresh when nearing expiry, but do not force logout on transient failures.
          if (isTokenExpiringSoon(token) && !isTokenExpired(token)) {
            const newToken = await refreshAuthToken(API_URL);
            if (!newToken) {
              console.warn('Token refresh failed during bootstrap; keeping current session token for now.');
            }
          }

          const fetchProfile = async () => fetch(`${API_URL}/api/user/profile`, {
            headers: getAuthHeader(),
          });

          let res = await fetchProfile();
          if (res.status === 401) {
            const refreshed = await refreshAuthToken(API_URL);
            if (refreshed) {
              res = await fetchProfile();
            }
          }

          if (res.ok) {
            const data = await res.json();
            setUser({
              id: data.id,
              username: data.username,
              region: data.region || null,
              email: data.email,
              bio: data.bio,
              verified: data.verified,
              badges: data.badges?.map((b: any) => ({ key: b.key, name: b.name })),
              riotAccountsCount: data.riotAccounts?.length || 0,
              onboardingCompleted: data.onboardingCompleted || false,
              profileIconId: data.profileIconId,
              discordLinked: Boolean(data.discordLinked ?? data.discordAccount),
              discordUsername: data.discordUsername || null,
              activeUsernameDecoration: data.activeUsernameDecoration || null,
              activeHoverEffect: data.activeHoverEffect || null,
              activeNameplateFont: data.activeNameplateFont || null,
            });
          } else {
            let payload: any = null;
            try {
              payload = await res.json();
            } catch {
              payload = null;
            }

            if (res.status === 403 && isBannedPayload(payload)) {
              clearAllAuthState();
              setUser(null);
              router.push('/banned');
            } else if (res.status === 401 || (res.status === 403 && isInvalidSessionPayload(payload))) {
              // Only clear session for explicit auth failures.
              clearAllAuthState();
              setUser(null);
            } else {
              // Keep session token on transient backend/network errors to avoid false disconnects.
              console.warn('Profile bootstrap failed without auth invalidation.', { status: res.status, payload });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load user:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Check token expiration every 10 minutes
    const intervalId = setInterval(async () => {
      const token = getAuthToken();
      if (!token) return;

      if (isTokenExpired(token)) {
        clearAllAuthState();
        setUser(null);
        router.push('/');
        return;
      }

      if (isTokenExpiringSoon(token)) {
        const newToken = await refreshAuthToken(API_URL);
        if (!newToken) {
          console.warn('Background token refresh failed; user remains signed in until token expires.');
        }
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [router]);

  const login = async (usernameOrEmail: string, password: string) => {
    // Check if already logged in
    if (user) {
      return { success: false, error: 'You are already logged in. Please log out first.' };
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();

      if (res.status === 403 && isBannedPayload(data)) {
        clearAllAuthState();
        setUser(null);
        router.push('/banned');
        return { success: false, error: data.error || 'Your account is banned.' };
      }

      if (res.ok) {
        // Store JWT token
        if (data.token) {
          setAuthToken(data.token);
        }
        setUser({
          id: data.userId,
          username: data.username,
          region: data.region || null,
          email: data.email,
          bio: data.bio,
          verified: data.verified,
          badges: data.badges,
          riotAccountsCount: data.riotAccountsCount || 0,
          onboardingCompleted: data.onboardingCompleted || false,
          profileIconId: data.profileIconId,
          discordLinked: Boolean(data.discordLinked ?? data.discordAccount),
          discordUsername: data.discordUsername || null,
          activeUsernameDecoration: data.activeUsernameDecoration || null,
          activeHoverEffect: data.activeHoverEffect || null,
          activeNameplateFont: data.activeNameplateFont || null,
        });
        return { success: true };
      } else {
        // Provide more specific error for rate limiting
        if (res.status === 429) {
          return { success: false, error: 'Too many login attempts. Please try again later.' };
        }
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.status === 403 && isBannedPayload(data)) {
        clearAllAuthState();
        setUser(null);
        router.push('/banned');
        return { success: false, error: data.error || 'Access denied.' };
      }

      if (res.ok) {
        // Store JWT token
        if (data.token) {
          setAuthToken(data.token);
        }
        setUser({
          id: data.userId,
          username: data.username,
          email: data.email,
          bio: undefined,
          verified: false,
          badges: [],
          riotAccountsCount: 0,
          onboardingCompleted: false,
          profileIconId: undefined,
          discordLinked: false,
          discordUsername: null,
          activeUsernameDecoration: null,
          activeHoverEffect: null,
          activeNameplateFont: null,
        });
        return { success: true };
      } else {
        // Provide more specific error for rate limiting
        if (res.status === 429) {
          return { success: false, error: 'Too many registration attempts. Please try again later.' };
        }
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    clearAllAuthState();
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const fetchProfile = async () => fetch(`${API_URL}/api/user/profile`, {
        headers: getAuthHeader(),
      });

      let res = await fetchProfile();
      if (res.status === 401) {
        const refreshed = await refreshAuthToken(API_URL);
        if (refreshed) {
          res = await fetchProfile();
        }
      }

      if (res.ok) {
        const data = await res.json();
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          bio: data.bio,
          verified: data.verified,
          badges: data.badges?.map((b: any) => ({ key: b.key, name: b.name })),
          riotAccountsCount: data.riotAccounts?.length || 0,
          onboardingCompleted: data.onboardingCompleted || false,
          profileIconId: data.profileIconId,
          discordLinked: Boolean(data.discordLinked ?? data.discordAccount),
          discordUsername: data.discordUsername || null,
          activeUsernameDecoration: data.activeUsernameDecoration || null,
          activeHoverEffect: data.activeHoverEffect || null,
          activeNameplateFont: data.activeNameplateFont || null,
        });
      } else {
        let payload: any = null;
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }

        if (res.status === 403 && isBannedPayload(payload)) {
          clearAllAuthState();
          setUser(null);
          router.push('/banned');
        } else if (res.status === 401 || (res.status === 403 && isInvalidSessionPayload(payload))) {
          clearAllAuthState();
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
