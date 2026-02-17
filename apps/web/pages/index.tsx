import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEOHead from '../components/SEOHead';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const { currentTheme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  // Redirect logged-in users to feed
  useEffect(() => {
    if (!loading && user) {
      router.push('/feed');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--color-accent-1)' }}>{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <>
      <SEOHead />
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom right, var(--color-accent-1)/0.1, transparent, transparent)' }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-8 shadow-2xl" style={{ background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))' }}>
              <span className="font-bold text-4xl" style={{ color: 'var(--color-bg-primary)' }}>LFD</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
              {t('home.welcomeTo')} <span style={{ color: 'var(--color-accent-1)' }}>{t('home.platform')}</span>
            </h1>
            
            <p className="text-xl mb-12 max-w-3xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              {t('home.tagline')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/register"
                className="px-8 py-4 font-bold rounded-lg transition-all shadow-lg text-lg"
                style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
              >
                {t('home.getStarted')}
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 font-bold rounded-lg transition-colors text-lg border"
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-accent-1)', color: 'var(--color-accent-1)' }}
              >
                {t('nav.login')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-16" style={{ color: 'var(--color-accent-1)' }}>{t('home.whyTitle')}</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="rounded-xl p-8 border transition-colors" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))' }}>
              <svg className="w-6 h-6" fill="none" stroke="var(--color-bg-primary)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('home.feature1Title')}</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {t('home.feature1Description')}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-xl p-8 border transition-colors" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))' }}>
              <svg className="w-6 h-6" fill="none" stroke="var(--color-bg-primary)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('home.feature2Title')}</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {t('home.feature2Description')}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-xl p-8 border transition-colors" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))' }}>
              <svg className="w-6 h-6" fill="none" stroke="var(--color-bg-primary)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('home.feature3Title')}</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {t('home.feature3Description')}
            </p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-y" style={{ background: 'linear-gradient(to right, var(--color-accent-1)/0.2, var(--color-accent-2)/0.2)', borderColor: 'var(--color-accent-1)/0.3' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>{t('home.readyTitle')}</h2>
          <p className="mb-8 text-lg" style={{ color: 'var(--color-text-secondary)' }}>{t('home.readyDescription')}</p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 font-bold rounded-lg transition-all shadow-lg text-lg"
            style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
          >
            {t('home.createFreeAccount')}
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

