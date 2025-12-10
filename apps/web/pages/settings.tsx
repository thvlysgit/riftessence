import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const { currentTheme, setTheme, availableThemes } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0B0D12] flex items-center justify-center">
        <div className="text-[#C8AA6E] text-xl">Loading...</div>
      </div>
    );
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Password set successfully! You can now log in with your password.');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to set password');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--color-accent-1)' }}>Account Settings</h1>

        {/* Theme Selection */}
        <div className="border rounded-xl p-6 mb-6" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Theme</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Choose your preferred color theme for the application.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableThemes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => setTheme(theme.name)}
                className="relative p-4 border-2 rounded-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: currentTheme === theme.name ? theme.colors.bgSecondary : theme.colors.bgPrimary,
                  borderColor: currentTheme === theme.name ? theme.colors.accent1 : theme.colors.border,
                  borderRadius: theme.style.borderRadius,
                  boxShadow: currentTheme === theme.name ? theme.style.shadow : 'none',
                }}
              >
                {currentTheme === theme.name && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.colors.accent1 }}>
                    <svg className="w-4 h-4" style={{ color: theme.colors.bgPrimary }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                <div className="mb-3">
                  <h3 className="font-bold text-lg mb-2" style={{ color: theme.colors.textPrimary }}>{theme.displayName}</h3>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.colors.accent1 }}></div>
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.colors.accent2 }}></div>
                    {theme.colors.accent3 && <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.colors.accent3 }}></div>}
                  </div>
                </div>
                
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                  Click to apply
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Account Info */}
        <div className="border rounded-xl p-6 mb-6" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Account Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Username</label>
              <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{user.username}</p>
            </div>
            {user.email && (
              <div>
                <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Email</label>
                <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{user.email}</p>
              </div>
            )}
            <div>
              <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Account Status</label>
              <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {user.verified ? (
                  <span style={{ color: 'var(--color-success)' }}>✓ Verified</span>
                ) : (
                  <span style={{ color: 'var(--color-warning)' }}>Not Verified</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Set/Change Password */}
        <div className="border rounded-xl p-6 mb-6" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Password</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Set a password to enable password-based login. This allows you to sign in without linking a Riot account.
          </p>

          <form onSubmit={handleSetPassword} className="space-y-4">
            {message && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                borderColor: 'var(--color-success)',
                color: 'var(--color-success)',
                border: '1px solid'
              }}>
                {message}
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderColor: 'var(--color-error)',
                color: 'var(--color-error)',
                border: '1px solid'
              }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full max-w-md px-4 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  border: 'var(--border-width) solid',
                  borderRadius: 'var(--border-radius)'
                }}
                placeholder="Enter new password"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full max-w-md px-4 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  border: 'var(--border-width) solid',
                  borderRadius: 'var(--border-radius)'
                }}
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 font-bold rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))`,
                color: saving ? 'var(--color-text-muted)' : 'var(--color-bg-primary)',
                borderRadius: 'var(--border-radius)'
              }}
            >
              {saving ? 'Saving...' : 'Set Password'}
            </button>
          </form>
        </div>

        {/* Riot Account Linking */}
        <div className="border rounded-xl p-6" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Riot Account</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Link your Riot account to verify your rank and access additional features.
          </p>
          <a
            href="/verify-test"
            className="inline-block px-6 py-3 font-bold rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-accent-1)',
              color: 'var(--color-accent-1)',
              border: 'var(--border-width) solid',
              borderRadius: 'var(--border-radius)'
            }}
          >
            Manage Riot Accounts
          </a>
        </div>
      </div>
    </div>
  );
}
