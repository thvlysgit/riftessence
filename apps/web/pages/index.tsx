import React from 'react';
import Link from 'next/link';
import {
  HiArrowRight,
  HiOutlineBeaker,
  HiOutlineBookOpen,
  HiOutlineBriefcase,
  HiOutlineGlobeAlt,
  HiOutlineSparkles,
  HiOutlineUsers,
} from 'react-icons/hi2';
import SEOHead from '@components/SEOHead';
import OnboardingLobby from '@components/OnboardingLobby';
import { LoadingSpinner } from '@components/LoadingSpinner';
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
    summary: 'Filter by role, region, language, rank, voice preference, and playstyle before you start a conversation.',
    href: '/feed',
    accent: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.14)',
    icon: HiOutlineSparkles,
  },
  {
    title: 'Build a Team',
    summary: 'Create rosters, invite players, connect Discord, and keep team operations in one focused workspace.',
    href: '/teams/dashboard',
    accent: '#14b8a6',
    soft: 'rgba(20, 184, 166, 0.14)',
    icon: HiOutlineUsers,
  },
  {
    title: 'Share Matchups',
    summary: 'Write matchup notes, save private sheets, and publish guides players can actually use in draft.',
    href: '/matchups',
    accent: '#ec4899',
    soft: 'rgba(236, 72, 153, 0.14)',
    icon: HiOutlineBookOpen,
  },
  {
    title: 'Run Scrims',
    summary: 'Schedule practice, find opponents, and keep recurring team activity from turning into message chaos.',
    href: '/teams/scrims',
    accent: '#22c55e',
    soft: 'rgba(34, 197, 94, 0.14)',
    icon: HiOutlineBeaker,
  },
  {
    title: 'Grow a Community',
    summary: 'Register a community, link Discord, and route platform activity into places your members already use.',
    href: '/communities',
    accent: '#f97316',
    soft: 'rgba(249, 115, 22, 0.14)',
    icon: HiOutlineGlobeAlt,
  },
  {
    title: 'Manage Everything',
    summary: 'Move from discovery to roster, calendar, posts, events, and reminders without rebuilding context.',
    href: '/teams/dashboard',
    accent: '#8b5cf6',
    soft: 'rgba(139, 92, 246, 0.14)',
    icon: HiOutlineBriefcase,
  },
];

const LANDING_STATS = [
  ['Duo finder', 'Role, rank, region, language'],
  ['Team ops', 'Rosters, Discord, schedule'],
  ['Knowledge base', 'Matchups, coaching, guides'],
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="RiftEssence - League of Legends Duo, Team, and Matchup Hub"
        description="Find duo partners, build League of Legends teams, coordinate scrims, grow communities, and share matchup knowledge in one premium workspace."
        path="/"
        keywords="league of legends duo finder, lol esports team finder, team management for league teams, lol scrim finder, league matchup sharing"
      />

      <main className="min-h-screen overflow-hidden" style={{ backgroundColor: 'transparent' }}>
        <section className="relative overflow-hidden border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(90deg, var(--color-bg-primary) 0%, var(--color-bg-primary) 46%, rgba(0, 0, 0, 0.74) 76%, rgba(0, 0, 0, 0.42) 100%), url(/assets/og-image.png)',
              backgroundPosition: '72% center',
              backgroundSize: 'cover',
              opacity: 0.82,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 12% 18%, var(--accent-primary-bg), transparent 34%), radial-gradient(circle at 82% 18%, var(--theme-soft-highlight), transparent 32%)',
            }}
          />

          <div className="relative mx-auto grid min-h-[76vh] max-w-7xl content-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
            <div className="max-w-3xl">
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase"
                style={{
                  borderColor: 'var(--accent-primary-border)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.16em',
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: 'var(--btn-gradient)' }} />
                Beta League workspace
              </div>

              <h1 className="mt-6 text-5xl font-black leading-[0.95] sm:text-6xl lg:text-7xl" style={{ color: 'var(--color-text-primary)' }}>
                RiftEssence
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 sm:text-xl" style={{ color: 'var(--color-text-secondary)' }}>
                A premium League of Legends hub for finding the right duo, building serious teams, coordinating practice, and keeping matchup knowledge close at hand.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={user ? '/feed' : '/register'} className="btn-primary inline-flex items-center gap-2">
                  {user ? 'Open Duo Feed' : t('home.getStarted')}
                  <HiArrowRight className="h-4 w-4" />
                </Link>
                <Link href={user ? '/profile' : '/login'} className="btn-secondary inline-flex items-center gap-2">
                  {user ? 'View Profile' : t('nav.login')}
                </Link>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {LANDING_STATS.map(([title, detail]) => (
                  <div key={title} className="theme-premium-surface rounded-2xl p-4">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
                    <p className="mt-1 text-xs leading-5" style={{ color: 'var(--color-text-muted)' }}>{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden items-end lg:flex">
              <div className="w-full space-y-4">
                {STUDIO_FEATURES.slice(0, 3).map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <Link
                      key={feature.title}
                      href={feature.href}
                      className="theme-premium-surface group block rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border"
                            style={{ borderColor: feature.accent, backgroundColor: feature.soft, color: feature.accent }}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h2 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>{feature.title}</h2>
                            <p className="mt-1 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>{feature.summary}</p>
                          </div>
                        </div>
                        <HiArrowRight className="mt-1 h-5 w-5 flex-none transition-transform group-hover:translate-x-1" style={{ color: feature.accent }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: 'var(--color-accent-1)', letterSpacing: '0.16em' }}>
                Choose your path
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                Start with the workflow that matters today.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
              The homepage keeps the guide system, but wraps it in the same theme language as the rest of the app.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {STUDIO_FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="theme-premium-surface group rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border"
                      style={{ borderColor: feature.accent, backgroundColor: feature.soft, color: feature.accent }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>{feature.title}</h3>
                        <HiArrowRight className="h-4 w-4 flex-none transition-transform group-hover:translate-x-1" style={{ color: feature.accent }} />
                      </div>
                      <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>{feature.summary}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <OnboardingLobby />
        </section>
      </main>
    </>
  );
}
