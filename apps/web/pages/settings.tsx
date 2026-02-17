import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { currentTheme, setTheme, availableThemes } = useTheme();
  const { currentLanguage, setLanguage, availableLanguages, t } = useLanguage();
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--color-accent-1)' }}>{t('common.loading')}</div>
      </div>
    );
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError(t('settings.password.error.match'));
      return;
    }

    if (password.length < 6) {
      setError(t('settings.password.error.length'));
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
        setMessage(t('settings.password.success'));
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to set password');
      }
    } catch (err) {
      setError(t('settings.password.error.network'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--color-accent-1)' }}>{t('settings.title')}</h1>

        {/* Language Selection */}
        <div className="border rounded-xl p-6 mb-6" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>{t('settings.language.title')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.language.description')}
          </p>
          
          <div className="flex items-center gap-3">
            <select
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full max-w-md px-4 py-3 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: 'var(--border-width) solid',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
            {currentLanguage === 'fr' && (
              <span className="px-2 py-1 text-xs font-semibold rounded" style={{
                backgroundColor: 'rgba(251, 146, 60, 0.15)',
                color: '#fb923c',
                border: '1px solid #fb923c'
              }}>
                BETA
              </span>
            )}
          </div>
        </div>

        {/* Theme Selection */}
        <div className="border rounded-xl p-6 mb-6" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>{t('settings.theme.title')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.theme.description')}
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
                  
                  {/* Spinner Preview */}
                  <div className="flex justify-center mb-3" style={{ height: '50px', overflow: 'visible' }}>
                    <div style={{ 
                      transform: 'scale(0.5)', 
                      transformOrigin: 'center',
                    }}>
                      <ThemeContext.Provider value={{
                        currentTheme: theme.name,
                        theme: theme,
                        setTheme: () => {},
                        availableThemes: availableThemes
                      }}>
                        <LoadingSpinner compact={true} />
                      </ThemeContext.Provider>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.colors.accent1 }}></div>
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.colors.accent2 }}></div>
                    {theme.colors.accent3 && <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.colors.accent3 }}></div>}
                  </div>
                </div>
                
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                  {t('theme.clickToApply')}
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
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>{t('settings.account.title')}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('settings.account.username')}</label>
              <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{user.username}</p>
            </div>
            {user.email && (
              <div>
                <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('settings.account.email')}</label>
                <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{user.email}</p>
              </div>
            )}
            <div>
              <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('settings.account.status')}</label>
              <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {user.verified ? (
                  <span style={{ color: 'var(--color-success)' }}>{t('settings.account.verified')}</span>
                ) : (
                  <span style={{ color: 'var(--color-warning)' }}>{t('settings.account.notVerified')}</span>
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
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>{t('settings.password.title')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.password.description')}
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
                {t('settings.password.new')}
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
                {t('settings.password.confirm')}
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
                placeholder={t('settings.password.confirm')}
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
              {saving ? t('settings.password.setting') : t('settings.password.set')}
            </button>
          </form>
        </div>

        {/* Riot Account Linking */}
        <div className="border rounded-xl p-6" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>{t('settings.riot.title')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.riot.description')}
          </p>
          <a
            href="/authenticate"
            className="inline-block px-6 py-3 font-bold rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-accent-1)',
              color: 'var(--color-accent-1)',
              border: 'var(--border-width) solid',
              borderRadius: 'var(--border-radius)'
            }}
          >
            {t('settings.riot.manage')}
          </a>
        </div>
      </div>
    </div>
  );
}
