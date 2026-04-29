import React from 'react';
import Link from 'next/link';
import { HiOutlineSparkles, HiOutlineUsers, HiOutlineBriefcase, HiOutlineBookOpen, HiOutlineBeaker, HiOutlineGlobeAlt } from 'react-icons/hi2';
import SEOHead from '@components/SEOHead';
import OnboardingLobby from '@components/OnboardingLobby';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

type StudioFeature = {
  title: string;
  summary: string;
  href: string;
  accent: string;
  soft: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STUDIO_FEATURES: StudioFeature[] = [
  {
    title: 'Find a Duo',
    summary: 'Jump into the feed, discover players, and start conversations around your role and region.',
    href: '/feed',
    accent: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.12)',
    icon: HiOutlineSparkles,
  },
  {
    title: 'Build a Team',
    summary: 'Create a roster, manage players, and wire Discord so your team can stay coordinated.',
    href: '/teams/dashboard',
    accent: '#14b8a6',
    soft: 'rgba(20, 184, 166, 0.12)',
    icon: HiOutlineUsers,
  },
  {
    title: 'Share Matchups',
    summary: 'Collect champion notes, explore the marketplace, and publish matchup cards your way.',
    href: '/matchups',
    accent: '#ec4899',
    soft: 'rgba(236, 72, 153, 0.12)',
    icon: HiOutlineBookOpen,
  },
  {
    title: 'Run Scrims',
    summary: 'Keep practice moving with scheduled matches, scrim discovery, and event coordination.',
    href: '/teams/scrims',
    accent: '#22c55e',
    soft: 'rgba(34, 197, 94, 0.12)',
    icon: HiOutlineBeaker,
  },
  {
    title: 'Grow a Community',
    summary: 'Connect Discord and route posts into a community flow that keeps members engaged.',
    href: '/communities',
    accent: '#f97316',
    soft: 'rgba(249, 115, 22, 0.12)',
    icon: HiOutlineGlobeAlt,
  },
  {
    title: 'Manage Everything',
    summary: 'Use the team tools for rosters, schedules, and event ops without leaving the workspace.',
    href: '/teams/dashboard',
    accent: '#8b5cf6',
    soft: 'rgba(139, 92, 246, 0.12)',
    icon: HiOutlineBriefcase,
  },
];

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
        title="RiftEssence Studio - Choose Your Path"
        description="Explore RiftEssence from a studio-style homepage that showcases the platform's feature areas and launches the right onboarding path."
        path="/"
        keywords="league of legends duo finder, lol esports team finder, team management for league teams, lol scrim finder, league matchup sharing"
      />

      <div className="min-h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 14% 18%, rgba(56, 189, 248, 0.20), transparent 32%), radial-gradient(circle at 82% 14%, rgba(245, 158, 11, 0.16), transparent 30%), radial-gradient(circle at 50% 88%, rgba(34, 197, 94, 0.14), transparent 34%)',
          }}
        />

        <div className="relative overflow-hidden border-b" style={{ borderColor: 'rgba(148, 163, 184, 0.16)' }}>
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.86) 0%, rgba(2, 6, 23, 0.96) 100%)',
            }}
          />

          <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-18 sm:pt-24 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch">
              <section
                className="overflow-hidden rounded-[36px] border p-7 sm:p-9 lg:p-10"
                style={{
                  borderColor: 'rgba(148, 163, 184, 0.16)',
                  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(2, 6, 23, 0.96) 100%)',
                  boxShadow: '0 30px 90px rgba(2, 6, 23, 0.38)',
                }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ borderColor: 'rgba(148, 163, 184, 0.18)', backgroundColor: 'rgba(15, 23, 42, 0.72)', color: 'rgba(226, 232, 240, 0.72)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))' }} />
                  Onboarding studio
                </div>

                <div className="mt-5 space-y-4">
                  <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl" style={{ color: 'var(--color-text-primary)' }}>
                    Explore RiftEssence by the feature you want, not by a generic menu.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 sm:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                    Choose a path to start guiding your next action, then discover the rest of the product through the studio cards below.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {!user && (
                    <>
                      <Link
                        href="/register"
                        className="rounded-full px-5 py-3 text-sm font-semibold"
                        style={{
                          background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                          color: 'var(--color-bg-primary)',
                        }}
                      >
                        {t('home.getStarted')}
                      </Link>
                      <Link
                        href="/login"
                        className="rounded-full border px-5 py-3 text-sm font-semibold"
                        style={{
                          borderColor: 'rgba(148, 163, 184, 0.18)',
                          color: 'var(--color-text-primary)',
                          backgroundColor: 'rgba(15, 23, 42, 0.72)',
                        }}
                      >
                        {t('nav.login')}
                      </Link>
                    </>
                  )}

                  {user && (
                    <Link
                      href="/feed"
                      className="rounded-full border px-5 py-3 text-sm font-semibold"
                      style={{
                        borderColor: 'rgba(148, 163, 184, 0.18)',
                        color: 'var(--color-text-primary)',
                        backgroundColor: 'rgba(15, 23, 42, 0.72)',
                      }}
                    >
                      Go to Duo Feed
                    </Link>
                  )}
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {[
                    ['Persistent guides', 'Active guides stay with you as you move through the app.'],
                    ['Feature discovery', 'Every major surface is mapped from the home studio.'],
                    ['State-aware completion', 'Progress follows live app data instead of a manual done button.'],
                  ].map(([title, summary]) => (
                    <div key={title} className="rounded-2xl border p-4" style={{ borderColor: 'rgba(148, 163, 184, 0.14)', backgroundColor: 'rgba(15, 23, 42, 0.62)' }}>
                      <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</div>
                      <p className="mt-1 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>{summary}</p>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {STUDIO_FEATURES.slice(0, 3).map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Link
                      key={feature.title}
                      href={feature.href}
                      className="group rounded-[28px] border p-5 transition-all duration-300 hover:-translate-y-1"
                      style={{
                        borderColor: 'rgba(148, 163, 184, 0.16)',
                        background: 'rgba(15, 23, 42, 0.86)',
                        boxShadow: '0 20px 48px rgba(2, 6, 23, 0.20)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border" style={{ borderColor: feature.accent, backgroundColor: feature.soft, color: feature.accent }}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>{feature.title}</div>
                            <p className="mt-1 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>{feature.summary}</p>
                          </div>
                        </div>
                        <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ borderColor: feature.accent, color: feature.accent, backgroundColor: 'rgba(15, 23, 42, 0.72)' }}>
                          Explore
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </aside>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {STUDIO_FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="group rounded-[28px] border p-5 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    borderColor: 'rgba(148, 163, 184, 0.16)',
                    background: 'rgba(15, 23, 42, 0.88)',
                    boxShadow: '0 18px 44px rgba(2, 6, 23, 0.20)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border" style={{ borderColor: feature.accent, backgroundColor: feature.soft, color: feature.accent }}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>{feature.title}</div>
                      <p className="mt-1 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>{feature.summary}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>

          <div className="mt-12">
            <OnboardingLobby />
          </div>
        </div>
      </div>
    </>
  );
}

