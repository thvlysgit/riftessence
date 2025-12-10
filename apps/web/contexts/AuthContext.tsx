import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface User {
  id: string;
  username: string;
  email?: string;
  bio?: string;
  verified: boolean;
  badges?: Array<{ key: string; name: string }>;
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

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userId = localStorage.getItem('lfd_userId');
        if (!userId) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/user/profile?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          setUser({
            id: data.id,
            username: data.username,
            email: data.email,
            bio: data.bio,
            verified: data.verified,
            badges: data.badges?.map((b: any) => ({ key: b.key, name: b.name })),
          });
        } else {
          // Invalid userId, clear it
          localStorage.removeItem('lfd_userId');
        }
      } catch (err) {
        console.error('Failed to load user:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('lfd_userId', data.userId);
        setUser({
          id: data.userId,
          username: data.username,
          email: data.email,
          bio: data.bio,
          verified: data.verified,
          badges: data.badges,
        });
        return { success: true };
      } else {
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

      if (res.ok) {
        localStorage.setItem('lfd_userId', data.userId);
        setUser({
          id: data.userId,
          username: data.username,
          email: data.email,
          bio: undefined,
          verified: false,
          badges: [],
        });
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('lfd_userId');
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    try {
      const userId = localStorage.getItem('lfd_userId');
      if (!userId) return;

      const res = await fetch(`${API_URL}/api/user/profile?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          bio: data.bio,
          verified: data.verified,
          badges: data.badges?.map((b: any) => ({ key: b.key, name: b.name })),
        });
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
