import React from 'react';
import { useOnboarding, FlowId } from '../contexts/OnboardingContext';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

type FlowId_Local = FlowId;

const FLOW_THEME: Record<FlowId_Local, { accent: string; accentSoft: string; glow: string; surface: string; badge: string }> = {
  duo: {
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.14)',
    glow: 'rgba(245, 158, 11, 0.22)',
    surface: 'linear-gradient(180deg, rgba(251, 191, 36, 0.10) 0%, rgba(15, 23, 42, 0.02) 100%)',
    badge: 'rgba(245, 158, 11, 0.16)',
  },
  lft: {
    accent: '#8b5cf6',
    accentSoft: 'rgba(139, 92, 246, 0.14)',
    glow: 'rgba(139, 92, 246, 0.24)',
    surface: 'linear-gradient(180deg, rgba(139, 92, 246, 0.12) 0%, rgba(15, 23, 42, 0.02) 100%)',
    badge: 'rgba(139, 92, 246, 0.16)',
  },
  'team-management': {
    accent: '#14b8a6',
    accentSoft: 'rgba(20, 184, 166, 0.14)',
    glow: 'rgba(20, 184, 166, 0.22)',
    surface: 'linear-gradient(180deg, rgba(20, 184, 166, 0.12) 0%, rgba(15, 23, 42, 0.02) 100%)',
    badge: 'rgba(20, 184, 166, 0.16)',
  },
  matchups: {
    accent: '#ec4899',
    accentSoft: 'rgba(236, 72, 153, 0.14)',
    glow: 'rgba(236, 72, 153, 0.20)',
    surface: 'linear-gradient(180deg, rgba(236, 72, 153, 0.10) 0%, rgba(15, 23, 42, 0.02) 100%)',
    badge: 'rgba(236, 72, 153, 0.16)',
  },
  scrims: {
    accent: '#22c55e',
    accentSoft: 'rgba(34, 197, 94, 0.14)',
    glow: 'rgba(34, 197, 94, 0.22)',
    surface: 'linear-gradient(180deg, rgba(34, 197, 94, 0.10) 0%, rgba(15, 23, 42, 0.02) 100%)',
    badge: 'rgba(34, 197, 94, 0.16)',
  },
  'community-growth': {
    accent: '#f97316',
    accentSoft: 'rgba(249, 115, 22, 0.14)',
    glow: 'rgba(249, 115, 22, 0.22)',
    surface: 'linear-gradient(180deg, rgba(249, 115, 22, 0.11) 0%, rgba(15, 23, 42, 0.02) 100%)',
    badge: 'rgba(249, 115, 22, 0.16)',
  },
  'team-invite': {
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.14)',
    glow: 'rgba(56, 189, 248, 0.22)',
    surface: 'linear-gradient(180deg, rgba(56, 189, 248, 0.11) 0%, rgba(15, 23, 42, 0.02) 100%)',
    badge: 'rgba(56, 189, 248, 0.16)',
  },
};

const FLOW_SUBTEXT: Record<FlowId_Local, string> = {
  duo: 'Fast path to a real conversation. Progress follows you everywhere.',
  lft: 'Match yourself with teams and keep the whole setup stateful.',
  'team-management': 'Rosters, invites, Discord wiring, and schedule management in one path.',
  matchups: 'Browse, save, and publish champion knowledge without the clutter.',
  scrims: 'Post, discover, and run practice with live team state.',
  'community-growth': 'Send your community posts into Discord and keep the setup guided.',
  'team-invite': 'Open the exact invite you already received and join without hunting.',
};

const FLOW_LABELS: Record<FlowId_Local, string> = {
  duo: 'I want to find a Duo!',
  lft: 'I am looking for an esports team/players for my team!',
  'team-management': 'I want to discover the game-changing team management tool!',
  matchups: 'I want to learn/share specific matchup data for my champion!',
  scrims: 'I am looking for scrims!',
  'community-growth': "I want to boost my community's growth!",
  'team-invite': 'I was invited to a team and need to join!',
};

export default function OnboardingLobby() {
  const { openFlow, flowProgressById, setActiveFlowId } = useOnboarding();
  const router = useRouter();
  const { user } = useAuth();
  const completedFlows = Object.values(flowProgressById).filter((progress) => progress >= 100).length;
  const activeFlows = Object.values(flowProgressById).filter((progress) => progress > 0).length;
  const flowTotal = Object.keys(FLOW_LABELS).length;

  const handleFlowClick = (flowId: FlowId_Local) => {
    // If user is not authenticated, persist choice and redirect to register/login
    if (!user) {
      setActiveFlowId(flowId);
      // send them to register with a returnUrl so onboarding resumes after signup
      router.push(`/register?returnUrl=${encodeURIComponent(router.asPath)}&onboarding=${flowId}`);
      return;
    }

    // Authenticated users: open the selected flow directly.
    openFlow(flowId);
  };

  return (
    <section className="mt-10 relative overflow-hidden rounded-[32px] border" style={{ borderColor: 'var(--color-border)', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.04) 0%, rgba(2, 6, 23, 0.02) 100%)', boxShadow: '0 24px 80px rgba(15, 23, 42, 0.16)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(56, 189, 248, 0.10), transparent 34%), radial-gradient(circle at top right, rgba(249, 115, 22, 0.12), transparent 30%), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.08), transparent 34%)' }} />

      <div className="relative p-6 sm:p-8 lg:p-10 space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-[0.18em]" style={{ borderColor: 'rgba(148, 163, 184, 0.24)', color: 'var(--color-text-secondary)', backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(12px)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))' }} />
              Guided onboarding studio
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Pick the path that matches what you are actually trying to do.
              </h2>
              <p className="text-base sm:text-lg max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
                Every flow below is persistent, route-aware, and auto-tracked from live product state. No manual mark-done step. No modal that fights the page.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-full border text-xs font-semibold" style={{ borderColor: 'rgba(148, 163, 184, 0.20)', backgroundColor: 'rgba(15, 23, 42, 0.45)', color: 'var(--color-text-secondary)' }}>
                Persistent across pages
              </span>
              <span className="px-3 py-1.5 rounded-full border text-xs font-semibold" style={{ borderColor: 'rgba(148, 163, 184, 0.20)', backgroundColor: 'rgba(15, 23, 42, 0.45)', color: 'var(--color-text-secondary)' }}>
                Auto-detected completion
              </span>
              <span className="px-3 py-1.5 rounded-full border text-xs font-semibold" style={{ borderColor: 'rgba(148, 163, 184, 0.20)', backgroundColor: 'rgba(15, 23, 42, 0.45)', color: 'var(--color-text-secondary)' }}>
                Real page CTAs
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
            <div className="rounded-2xl border p-4 backdrop-blur-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.16)', background: 'rgba(15, 23, 42, 0.56)', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.14)' }}>
              <div className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{flowTotal}</div>
              <div className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-secondary)' }}>Flows</div>
            </div>
            <div className="rounded-2xl border p-4 backdrop-blur-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.16)', background: 'rgba(15, 23, 42, 0.56)', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.14)' }}>
              <div className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{activeFlows}</div>
              <div className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-secondary)' }}>In progress</div>
            </div>
            <div className="rounded-2xl border p-4 backdrop-blur-xl" style={{ borderColor: 'rgba(148, 163, 184, 0.16)', background: 'rgba(15, 23, 42, 0.56)', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.14)' }}>
              <div className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{completedFlows}</div>
              <div className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-secondary)' }}>Complete</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(Object.keys(FLOW_LABELS) as FlowId_Local[]).map((flowId) => {
          const theme = FLOW_THEME[flowId];
          const progress = flowProgressById[flowId];
          return (
            <article
              key={flowId}
              className="group relative overflow-hidden rounded-[28px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              style={{
                borderColor: 'rgba(148, 163, 184, 0.18)',
                background: theme.surface,
                boxShadow: `0 18px 50px ${theme.glow}`,
              }}
            >
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${theme.accent}, rgba(255,255,255,0.18))` }} />
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: theme.badge, color: theme.accent }}>
                      Auto-tracked
                    </div>
                    <p className="text-lg font-bold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                      {FLOW_LABELS[flowId]}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border text-sm font-black" style={{ borderColor: theme.accent, color: theme.accent, backgroundColor: theme.accentSoft }}>
                    {progress}%
                  </div>
                </div>

                <p className="text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                  {FLOW_SUBTEXT[flowId]}
                </p>

                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(148, 163, 184, 0.16)' }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${theme.accent}, rgba(255,255,255,0.9))` }} />
                </div>

              <button
                onClick={() => handleFlowClick(flowId)}
                className="w-full rounded-2xl px-4 py-3 font-semibold transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${theme.accent}, rgba(255,255,255,0.15))`,
                  color: 'var(--color-bg-primary)',
                  boxShadow: `0 12px 28px ${theme.glow}`,
                }}
              >
                Open flow
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
