import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { RiotAuthButton } from '@components/RiotBrand';
import { DiscordIcon } from '../src/components/DiscordBrand';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const { t } = useLanguage();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      router.push('/feed');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(usernameOrEmail, password);

    if (result.success) {
      router.push('/feed');
    } else {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
  };

  const handleDiscordAuth = async () => {
    setError('');
    setDiscordLoading(true);

    try {
      const returnUrl = typeof router.query.returnUrl === 'string' ? router.query.returnUrl : '/feed';
      const res = await fetch(`${API_URL}/api/auth/discord/auth?returnUrl=${encodeURIComponent(returnUrl)}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to start Discord sign in');
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || 'Failed to start Discord sign in');
      setDiscordLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 mb-4 shadow-lg"
            style={{
              background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))',
              borderRadius: 'var(--border-radius)',
              color: 'var(--color-bg-primary)',
            }}
          >
            <span className="font-bold text-2xl">LFD</span>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-accent-1)' }}>{t('auth.welcomeBack')}</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>{t('auth.signInTo')}</p>
        </div>

        {/* Login Form */}
        <div 
          className="border p-8 shadow-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="usernameOrEmail" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {t('auth.usernameOrEmail')}
              </label>
              <input
                id="usernameOrEmail"
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full px-4 py-3 border transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                placeholder={t('auth.enterUsernameOrEmail')}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {t('common.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                placeholder={t('auth.enterPassword')}
                required
              />
              <div className="mt-2 flex items-center justify-between">
                <Link href="/forgot-password" className="text-xs font-semibold" style={{ color: 'var(--color-accent-1)' }}>
                  Password Forgotten?
                </Link>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Riot login can recover access too
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                If your email is linked, you can reset by email. Otherwise, sign in with Riot and set a new password later.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                color: 'var(--color-bg-primary)',
                borderRadius: 'var(--border-radius)',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>{t('common.or')}</span>
            </div>
          </div>

          {/* Riot Login Option */}
          <RiotAuthButton label={t('auth.signInWithRiot')} />

          <button
            type="button"
            onClick={handleDiscordAuth}
            disabled={discordLoading}
            className="w-full mt-3 py-3 font-semibold rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              backgroundColor: '#5865F2',
              color: '#ffffff',
            }}
          >
            <DiscordIcon className="w-5 h-5" />
            {discordLoading ? 'Connecting Discord...' : 'Sign In With Discord'}
          </button>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="font-semibold" style={{ color: 'var(--color-accent-1)' }}>
              {t('auth.createOne')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
