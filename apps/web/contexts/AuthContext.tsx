import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken, setAuthToken, clearAllAuthState, getAuthHeader, isTokenExpiringSoon, refreshAuthToken } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface User {
  id: string;
  username: string;
  email?: string;
  bio?: string;
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

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = getAuthToken();
        if (token) {
          // Check if token needs refresh
          if (isTokenExpiringSoon(token)) {
            const newToken = await refreshAuthToken(API_URL);
            if (!newToken) {
              // Refresh failed, clear token and redirect to login
              clearAllAuthState();
              setUser(null);
              router.push('/');
              setLoading(false);
              return;
            }
          }

          const res = await fetch(`${API_URL}/api/user/profile`, {
            headers: getAuthHeader(),
          });
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
            } else {
              // Invalid token, clear it
              clearAllAuthState();
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
      if (token && isTokenExpiringSoon(token)) {
        const newToken = await refreshAuthToken(API_URL);
        if (!newToken) {
          // Refresh failed, clear token and redirect to login
          clearAllAuthState();
          setUser(null);
          router.push('/');
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

      const res = await fetch(`${API_URL}/api/user/profile`, {
        headers: getAuthHeader(),
      });
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
