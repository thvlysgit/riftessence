import React from 'react';
import Link from 'next/link';
import SEOHead from '@components/SEOHead';
import HomeOnboardingLobby from '@components/HomeOnboardingLobby';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--color-accent-1)' }}>{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="RiftEssence Lobby - Choose Your Path"
        description="Explore RiftEssence features from one lobby and launch focused onboarding flows based on what you want to do first."
        path="/"
        keywords="league of legends duo finder, lol esports team finder, team management for league teams, lol scrim finder, league matchup sharing"
      />

      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="relative overflow-hidden border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 12% 20%, rgba(56, 189, 248, 0.22), transparent 36%), radial-gradient(circle at 82% 18%, rgba(245, 158, 11, 0.18), transparent 38%), radial-gradient(circle at 50% 90%, rgba(34, 197, 94, 0.14), transparent 42%)',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 sm:pt-24 sm:pb-20">
            <div className="max-w-4xl">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mb-6"
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.14)',
                  color: '#67e8f9',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                }}
              >
                Feature Lobby
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                Enter RiftEssence from the door that fits your goal.
              </h1>

              <p className="mt-5 text-base sm:text-lg max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
                Pick an interest card and launch the matching onboarding. Right now, the Duo onboarding flow is fully implemented with progress tracking and optional-step skipping.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {!user && (
                  <>
                    <Link
                      href="/register"
                      className="px-5 py-3 rounded-lg font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                        color: 'var(--color-bg-primary)',
                      }}
                    >
                      {t('home.getStarted')}
                    </Link>
                    <Link
                      href="/login"
                      className="px-5 py-3 rounded-lg font-semibold border"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                        backgroundColor: 'var(--color-bg-secondary)',
                      }}
                    >
                      {t('nav.login')}
                    </Link>
                  </>
                )}

                {user && (
                  <Link
                    href="/feed"
                    className="px-5 py-3 rounded-lg font-semibold border"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      backgroundColor: 'var(--color-bg-secondary)',
                    }}
                  >
                    Go to Duo Feed
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <HomeOnboardingLobby />

          <section
            className="mt-12 rounded-2xl border p-6 sm:p-8"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              What this lobby changes
            </h2>
            <ul className="space-y-2 text-sm sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Choose a feature first, then follow a dedicated onboarding path.</li>
              <li>Onboarding no longer forces itself on page load.</li>
              <li>A floating bubble on the right lets users open, minimize, or close onboarding at any time.</li>
              <li>Progress percentages ignore optional steps that were intentionally skipped.</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

