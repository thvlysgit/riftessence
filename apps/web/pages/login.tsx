import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-accent-1)' }}>Welcome Back</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Sign in to your RiftEssence account</p>
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
                Username or Email
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
                placeholder="Enter your username or email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Password
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
                placeholder="Enter your password"
                required
              />
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>Or</span>
            </div>
          </div>

          {/* Riot Login Option */}
          <Link
            href="/verify-test"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              borderRadius: 'var(--border-radius)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
            Sign in with Riot Account
          </Link>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold" style={{ color: 'var(--color-accent-1)' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
