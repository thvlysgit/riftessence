import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const turnstileRef = useRef<{ getResponse: () => string }>(null);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      router.push('/feed');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError('Username must be between 3 and 20 characters');
      return;
    }

    setLoading(true);

    // Get CAPTCHA token if Turnstile is available
    let turnstileToken = '';
    if (typeof window !== 'undefined' && (window as any).turnstile) {
      turnstileToken = (window as any).turnstile.getResponse();
      if (!turnstileToken) {
        setError('Please complete the CAPTCHA verification');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, turnstileToken }),
      });

      const data = await res.json();

      if (res.ok) {
        // Log in automatically after registration
        const loginResult = await register(username, email, password);
        if (loginResult.success) {
          router.push('/feed');
        } else {
          setError('Registration successful! Please log in.');
          router.push('/login');
        }
      } else {
        setError(data.error || data.details?.password || data.details?.email || data.details?.username || 'Registration failed');
        setLoading(false);
        // Reset CAPTCHA on error
        if (typeof window !== 'undefined' && (window as any).turnstile) {
          (window as any).turnstile.reset();
        }
      }
    } catch (err) {
      setError('Network error during registration');
      setLoading(false);
    }

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
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-accent-1)' }}>Create Account</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Join the RiftEssence community</p>
        </div>

        {/* Register Form */}
        <div 
          className="border p-8 shadow-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                placeholder="Choose a username"
                required
                minLength={3}
                maxLength={20}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>3-20 characters</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                placeholder="your@email.com"
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
                placeholder="Create a password"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>At least 6 characters</p>
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
                className="w-full px-4 py-3 border transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>

            {/* Turnstile CAPTCHA Widget */}
            <div className="flex justify-center my-4">
              <div
                ref={turnstileRef as any}
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAADnPIDtiyQMFkO7'}
                data-theme="dark"
              ></div>
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
              {loading ? 'Creating Account...' : 'Create Account'}
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
            Sign up with Riot Account
          </Link>

          {/* Sign In Link */}
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold" style={{ color: 'var(--color-accent-1)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
