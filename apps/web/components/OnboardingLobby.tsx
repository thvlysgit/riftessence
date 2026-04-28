import React from 'react';
import { useRouter } from 'next/router';
import { HiOutlineSparkles, HiOutlineUsers, HiOutlineBriefcase, HiOutlineBookOpen, HiOutlineBeaker, HiOutlineGlobeAlt, HiOutlineTicket } from 'react-icons/hi2';
import { useOnboarding, FlowId } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';

type FlowIdLocal = FlowId;

type FlowMeta = {
  title: string;
  summary: string;
  accent: string;
  soft: string;
  icon: React.ComponentType<{ className?: string }>;
};

const FLOW_META: Record<FlowIdLocal, FlowMeta> = {
  duo: {
    title: 'Find a Duo',
    summary: 'A fast path to conversation, matchmaking, and first contact.',
    accent: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.12)',
    icon: HiOutlineSparkles,
  },
  lft: {
    title: 'Looking for Team',
    summary: 'Present your profile to teams that are actually recruiting.',
    accent: '#8b5cf6',
    soft: 'rgba(139, 92, 246, 0.12)',
    icon: HiOutlineUsers,
  },
  'team-management': {
    title: 'Team Management',
    summary: 'Roster structure, Discord wiring, and schedule control.',
    accent: '#14b8a6',
    soft: 'rgba(20, 184, 166, 0.12)',
    icon: HiOutlineBriefcase,
  },
  matchups: {
    title: 'Matchups',
    summary: 'Collect champion notes, save useful guides, and publish your own.',
    accent: '#ec4899',
    soft: 'rgba(236, 72, 153, 0.12)',
    icon: HiOutlineBookOpen,
  },
  scrims: {
    title: 'Scrims',
    summary: 'Post practice matches, find opponents, and keep the cadence going.',
    accent: '#22c55e',
    soft: 'rgba(34, 197, 94, 0.12)',
    icon: HiOutlineBeaker,
  },
  'community-growth': {
    title: 'Community Growth',
    summary: 'Feed your Discord with the right posts and keep members engaged.',
    accent: '#f97316',
    soft: 'rgba(249, 115, 22, 0.12)',
    icon: HiOutlineGlobeAlt,
  },
  'team-invite': {
    title: 'Join Invited Team',
    summary: 'Open the exact invite you already received and claim your spot.',
    accent: '#38bdf8',
    soft: 'rgba(56, 189, 248, 0.12)',
    icon: HiOutlineTicket,
  },
};

const FLOW_ORDER: FlowIdLocal[] = ['duo', 'lft', 'team-management', 'matchups', 'scrims', 'community-growth', 'team-invite'];

export default function OnboardingLobby() {
  const router = useRouter();
  const { user } = useAuth();
  const { openFlow, flowProgressById } = useOnboarding();

  const progressValues = FLOW_ORDER.map((flowId) => flowProgressById[flowId] || 0);
  const completeCount = progressValues.filter((progress) => progress >= 100).length;
  const inProgressCount = progressValues.filter((progress) => progress > 0 && progress < 100).length;

  const handleFlowClick = (flowId: FlowIdLocal) => {
    openFlow(flowId);

    if (!user) {
      router.push(`/register?returnUrl=${encodeURIComponent(router.asPath)}&onboarding=${flowId}`);
    }
  };

  return (
    <section
      className="mt-10 overflow-hidden rounded-[32px] border"
      style={{
        borderColor: 'rgba(148, 163, 184, 0.16)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.97) 0%, rgba(2, 6, 23, 0.98) 100%)',
        boxShadow: '0 24px 72px rgba(2, 6, 23, 0.32)',
      }}
    >
      <div className="p-6 sm:p-8 lg:p-10 space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ borderColor: 'rgba(148, 163, 184, 0.18)', backgroundColor: 'rgba(15, 23, 42, 0.72)', color: 'rgba(226, 232, 240, 0.72)' }}>
              <span className="h-2 w-2 rounded-full" style={{ background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))' }} />
              Onboarding studio
            </div>
            <div className="space-y-3">
              <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl" style={{ color: 'var(--color-text-primary)' }}>
                Pick the guide that matches what you are trying to do right now.
              </h2>
              <p className="max-w-2xl text-base leading-7 sm:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                Explore the studio by goal, then open the guide or feature surface that matches the part of RiftEssence you care about most.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
            <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.72)' }}>
              <div className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{FLOW_ORDER.length}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(226, 232, 240, 0.56)' }}>Guides</div>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.72)' }}>
              <div className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{inProgressCount}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(226, 232, 240, 0.56)' }}>Running</div>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.72)' }}>
              <div className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{completeCount}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(226, 232, 240, 0.56)' }}>Finished</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FLOW_ORDER.map((flowId) => {
            const meta = FLOW_META[flowId];
            const progress = flowProgressById[flowId] || 0;
            const Icon = meta.icon;
            const ctaLabel = progress >= 100 ? 'Guide me again' : 'Guide me';
            const statusLabel = progress >= 100 ? 'Completed' : progress > 0 ? 'In progress' : 'Ready';

            return (
              <article
                key={flowId}
                className="group relative overflow-hidden rounded-[28px] border transition-transform duration-300 hover:-translate-y-1"
                style={{
                  borderColor: 'rgba(148, 163, 184, 0.16)',
                  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(15, 23, 42, 0.88) 100%)',
                }}
              >
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: meta.accent }} />
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border" style={{ borderColor: meta.accent, backgroundColor: meta.soft, color: meta.accent }}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: meta.accent, color: meta.accent, backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
                          {statusLabel}
                        </div>
                        <h3 className="text-xl font-black leading-snug tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                          {meta.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border text-sm font-black" style={{ borderColor: meta.accent, color: meta.accent, backgroundColor: meta.soft }}>
                      {progress}%
                    </div>
                  </div>

                  <p className="text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                    {meta.summary}
                  </p>

                  <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.14)' }}>
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: meta.accent }} />
                  </div>

                  <button
                    onClick={() => handleFlowClick(flowId)}
                    className="w-full rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      borderColor: meta.accent,
                      backgroundColor: 'rgba(15, 23, 42, 0.82)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {ctaLabel}
                      <span aria-hidden="true">→</span>
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
