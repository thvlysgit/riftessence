import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useOnboarding, FlowId } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from './GlobalUI';
import { getAuthHeader } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const FLOW_LABELS: Record<FlowId, string> = {
  duo: 'I want to find a Duo!',
  lft: 'I am looking for an esports team/players for my team!',
  'team-management': 'I want to discover the game-changing team management tool!',
  matchups: 'I want to learn/share specific matchup data for my champion!',
  scrims: 'I am looking for scrims!',
  'community-growth': "I want to boost my community's growth!",
  'team-invite': 'I was invited to a team and need to join!',
};

const FLOW_THEME: Record<FlowId, { accent: string; accentSoft: string; accentGlow: string; panelGlow: string; badge: string }> = {
  duo: { accent: '#f59e0b', accentSoft: 'rgba(245, 158, 11, 0.14)', accentGlow: 'rgba(245, 158, 11, 0.18)', panelGlow: 'rgba(245, 158, 11, 0.22)', badge: 'rgba(245, 158, 11, 0.18)' },
  lft: { accent: '#8b5cf6', accentSoft: 'rgba(139, 92, 246, 0.14)', accentGlow: 'rgba(139, 92, 246, 0.18)', panelGlow: 'rgba(139, 92, 246, 0.22)', badge: 'rgba(139, 92, 246, 0.18)' },
  'team-management': { accent: '#14b8a6', accentSoft: 'rgba(20, 184, 166, 0.14)', accentGlow: 'rgba(20, 184, 166, 0.18)', panelGlow: 'rgba(20, 184, 166, 0.22)', badge: 'rgba(20, 184, 166, 0.18)' },
  matchups: { accent: '#ec4899', accentSoft: 'rgba(236, 72, 153, 0.14)', accentGlow: 'rgba(236, 72, 153, 0.18)', panelGlow: 'rgba(236, 72, 153, 0.20)', badge: 'rgba(236, 72, 153, 0.18)' },
  scrims: { accent: '#22c55e', accentSoft: 'rgba(34, 197, 94, 0.14)', accentGlow: 'rgba(34, 197, 94, 0.18)', panelGlow: 'rgba(34, 197, 94, 0.22)', badge: 'rgba(34, 197, 94, 0.18)' },
  'community-growth': { accent: '#f97316', accentSoft: 'rgba(249, 115, 22, 0.14)', accentGlow: 'rgba(249, 115, 22, 0.18)', panelGlow: 'rgba(249, 115, 22, 0.22)', badge: 'rgba(249, 115, 22, 0.18)' },
  'team-invite': { accent: '#38bdf8', accentSoft: 'rgba(56, 189, 248, 0.14)', accentGlow: 'rgba(56, 189, 248, 0.18)', panelGlow: 'rgba(56, 189, 248, 0.22)', badge: 'rgba(56, 189, 248, 0.18)' },
};

export default function GlobalOnboardingModal() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { showToast } = useGlobalUI();
  const {
    activeFlowId,
    windowOpen,
    bubbleVisible,
    currentFlowSteps,
    currentStepStatuses,
    flowProgressById,
    teamInviteSnapshots,
    closeOnboarding,
    toggleWindow,
    setStepStatus,
  } = useOnboarding();
  const [discordLinkLoading, setDiscordLinkLoading] = useState(false);
  const currentFlowId = activeFlowId || 'duo';
  const flowTheme = FLOW_THEME[currentFlowId];
  const progress = flowProgressById[currentFlowId];
  const flowLabel = FLOW_LABELS[currentFlowId];

  const openCurrentStepDestination = useCallback(
    async (stepId: string) => {
      if (stepId === 'create-account') {
        if (user && activeFlowId) {
          showToast('You already have an account. Step marked complete.', 'success');
          setStepStatus(activeFlowId, stepId, 'completed');
          return;
        }
        router.push('/register');
        return;
      }

      if (!user) {
        showToast('Please create an account first to continue this onboarding.', 'info');
        router.push('/register');
        return;
      }

      if (stepId === 'link-riot') {
        router.push(`/authenticate?returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'join-invited-team') {
        const inviteTeamId = teamInviteSnapshots[0]?.teamId;

        if (inviteTeamId) {
          router.push(`/teams/${inviteTeamId}?joinInvite=1&returnUrl=${encodeURIComponent(router.asPath)}`);
          return;
        }

        showToast('No pending team invite was found.', 'info');
        return;
      }

      if (stepId === 'link-discord' || stepId === 'link-discord-server') {
        const profileSnapshot = await fetch(`${API_URL}/api/user/profile`, {
          headers: getAuthHeader(),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        const discordLinked = profileSnapshot && Boolean(profileSnapshot.discordLinked ?? profileSnapshot.discordAccount);

        if (stepId === 'link-discord') {
          if (discordLinked) {
            router.push(`/settings?dmConsent=1&returnUrl=${encodeURIComponent(router.asPath)}`);
            return;
          }

          setDiscordLinkLoading(true);
          try {
            const response = await fetch(`${API_URL}/api/auth/discord/login`, {
              headers: getAuthHeader(),
            });

            if (!response.ok) {
              const data = await response.json().catch(() => ({}));
              throw new Error(data.error || 'Failed to get Discord auth URL');
            }

            const data = await response.json();
            window.location.href = data.url;
          } catch (error: any) {
            showToast(error.message || 'Failed to start Discord linking', 'error');
          } finally {
            setDiscordLinkLoading(false);
          }
          return;
        }

        if (stepId === 'link-discord-server') {
          // Placeholder for Discord server linking
          showToast('Discord server linking coming soon.', 'info');
          return;
        }
      }

      if (stepId === 'champion-pool') {
        router.push(`/profile?onboarding=champion-pool&returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'create-post') {
          // For LFT flow, open the LFT create modal; for Duo use generic create page
          if (activeFlowId === 'lft') {
            router.push(`/lft?openCreate=1&returnUrl=${encodeURIComponent(router.asPath)}`);
          } else {
            router.push(`/create?returnUrl=${encodeURIComponent(router.asPath)}`);
          }
        return;
      }

      if (stepId === 'send-first-message') {
        router.push(`/feed?returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'create-roster' || stepId === 'create-team') {
        router.push(`/teams/dashboard?openCreate=1&returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'add-players') {
        router.push(`/teams/dashboard?openRoster=1&returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'link-discord-webhook' || stepId === 'team-settings') {
        router.push(`/teams/discord?returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'schedule-event') {
        router.push(`/teams/schedule?openCreate=1&returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'browse-marketplace') {
        router.push(`/matchups/marketplace?returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'add-to-library') {
        router.push(`/matchups?returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'create-matchup' || stepId === 'configure-details' || stepId === 'share-insights') {
        router.push(`/matchups/create?returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (
        stepId === 'configure-scrim' ||
        stepId === 'post-scrim' ||
        stepId === 'start-match'
      ) {
        if (stepId === 'configure-scrim') {
          router.push(`/teams/discord?returnUrl=${encodeURIComponent(router.asPath)}`);
          return;
        }

        if (stepId === 'post-scrim') {
          router.push(`/teams/scrims?returnUrl=${encodeURIComponent(router.asPath)}`);
          return;
        }

        router.push(`/teams/schedule?openCreate=1&returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'create-community' || stepId === 'link-discord-server') {
        router.push(`/communities/register?returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'setup-forwarding') {
        router.push(`/communities/guide?returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }
    },
    [activeFlowId, router, showToast, setStepStatus, teamInviteSnapshots, user]
  );

  const completeFlowIfReady = useCallback(async () => {
    const requiredSteps = currentFlowSteps.filter((step) => !step.optional);
    const allRequiredDone = requiredSteps.every((step) => currentStepStatuses[step.id] === 'completed');

    if (!allRequiredDone) {
      showToast(`Finish required ${activeFlowId} steps first.`, 'info');
      return;
    }

    if (user && !user.onboardingCompleted) {
      try {
        await fetch(`${API_URL}/api/user/onboarding-complete`, {
          method: 'POST',
          headers: getAuthHeader(),
        });
        await refreshUser();
      } catch {
        // Keep UI flow non-blocking if backend mark fails.
      }
    }

    showToast(`${activeFlowId} onboarding complete! You can still reopen it anytime.`, 'success');
    closeOnboarding();
  }, [activeFlowId, currentFlowSteps, currentStepStatuses, user, showToast, closeOnboarding, refreshUser]);

  if (!user || !activeFlowId || !bubbleVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Bubble Button - Bottom Right, avoid interference */}
      <div className="fixed left-4 sm:left-6 bottom-6 z-40 flex flex-col items-start gap-2 sm:flex-row sm:items-end">
        <button
          onClick={toggleWindow}
          className="group relative flex items-center gap-3 rounded-[24px] border px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.88) 100%)',
            borderColor: flowTheme.accent,
            boxShadow: `0 18px 40px ${flowTheme.accentGlow}`,
            color: 'var(--color-bg-primary)',
            backdropFilter: 'blur(18px)',
            minWidth: '220px',
          }}
          aria-label={`Toggle ${activeFlowId} onboarding window`}
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border text-sm font-black" style={{ borderColor: flowTheme.accent, backgroundColor: flowTheme.accentSoft, color: flowTheme.accent }}>
            {progress}%
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.24em]" style={{ color: 'rgba(226, 232, 240, 0.68)' }}>
              Onboarding dock
            </span>
            <span className="block truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Continue {currentFlowId.replace('-', ' ')}
            </span>
          </span>
        </button>
        <button
          onClick={closeOnboarding}
          className="flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition-all hover:-translate-y-0.5 hover:opacity-90"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            color: 'var(--color-text-primary)',
            borderColor: 'rgba(148, 163, 184, 0.24)',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)',
            backdropFilter: 'blur(18px)',
          }}
          aria-label="Close onboarding"
        >
          x
        </button>
      </div>

      {/* Modal Window */}
      {windowOpen && (
        <>
          {/* Backdrop overlay (semi-transparent) */}
          <div
            className="fixed inset-0 z-30 bg-black bg-opacity-30 transition-opacity"
            onClick={closeOnboarding}
            aria-label="Close onboarding"
          />

          {/* Modal Panel - Fixed bottom-right to not interfere with page content */}
          <div
            className="fixed left-4 sm:left-6 bottom-24 z-40 w-[min(92vw,460px)] max-h-[72vh] overflow-y-auto rounded-[30px] border shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(15, 23, 42, 0.88) 100%)',
              borderColor: flowTheme.accent,
              boxShadow: `0 28px 80px ${flowTheme.panelGlow}`,
              backdropFilter: 'blur(22px)',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${flowTheme.accent}, rgba(255,255,255,0.12))` }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 28%), radial-gradient(circle at bottom right, rgba(255,255,255,0.03), transparent 34%)' }} />

            {/* Header */}
            <div className="relative p-5 border-b sticky top-0 z-10" style={{ borderColor: 'rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.58)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[75%] space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: flowTheme.badge, color: flowTheme.accent }}>
                    Guided path
                  </div>
                  <h3 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                    {activeFlowId.charAt(0).toUpperCase() + activeFlowId.slice(1)} Onboarding
                  </h3>
                  <p className="text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                    {flowLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleWindow}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.64)', color: 'var(--color-text-primary)', borderColor: 'rgba(148, 163, 184, 0.18)' }}
                  >
                    Minimize
                  </button>
                  <button
                    onClick={closeOnboarding}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.64)', color: 'var(--color-text-primary)', borderColor: 'rgba(148, 163, 184, 0.18)' }}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(148, 163, 184, 0.12)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${flowTheme.accent}, rgba(255,255,255,0.92))`,
                      boxShadow: `0 0 18px ${flowTheme.accentGlow}`,
                    }}
                  />
                </div>
                <div className="flex-none rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: flowTheme.accent, color: flowTheme.accent, backgroundColor: flowTheme.accentSoft }}>
                  {progress}%
                </div>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(226, 232, 240, 0.62)' }}>
                Optional steps are excluded automatically
              </p>
            </div>

            {/* Steps List */}
            <div className="relative p-4 space-y-3">
              {currentFlowSteps.map((step, index) => {
                const status = currentStepStatuses[step.id] || 'pending';
                const statusColor =
                  status === 'completed' ? flowTheme.accent : status === 'skipped' ? '#fbbf24' : 'rgba(226, 232, 240, 0.70)';

                return (
                  <article
                    key={step.id}
                    className="group rounded-[22px] border p-4 transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      borderColor: status === 'completed' ? flowTheme.accent : 'rgba(148, 163, 184, 0.18)',
                      background: status === 'completed' ? 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : 'rgba(2, 6, 23, 0.34)',
                      boxShadow: `0 14px 30px ${status === 'completed' ? flowTheme.accentGlow : 'rgba(15, 23, 42, 0.18)'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border text-sm font-black" style={{ borderColor: flowTheme.accent, color: flowTheme.accent, backgroundColor: flowTheme.accentSoft }}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm sm:text-base" style={{ color: 'var(--color-text-primary)' }}>
                            {step.title}
                            {step.optional && (
                              <span className="ml-2 text-xs font-medium" style={{ color: 'rgba(226, 232, 240, 0.62)' }}>
                                optional
                              </span>
                            )}
                          </h4>
                          <p className="mt-1 text-xs sm:text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap" style={{ borderColor: statusColor, color: statusColor, backgroundColor: status === 'pending' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)' }}>
                        {status}
                      </span>
                    </div>

                    {/* Only show CTA button if step is pending */}
                    {status === 'pending' && (
                      <button
                        onClick={() => void openCurrentStepDestination(step.id)}
                        disabled={step.id === 'link-discord' && discordLinkLoading}
                        className="inline-flex items-center justify-center rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                          background: `linear-gradient(135deg, ${flowTheme.accent}, rgba(255,255,255,0.18))`,
                          color: 'var(--color-bg-primary)',
                          boxShadow: `0 10px 24px ${flowTheme.accentGlow}`,
                          opacity: step.id === 'link-discord' && discordLinkLoading ? 0.65 : 1,
                        }}
                      >
                        {step.id === 'link-discord' && discordLinkLoading ? 'Connecting...' : step.ctaLabel || 'Open'}
                      </button>
                    )}

                    {/* Show status badge for completed/skipped */}
                    {status !== 'pending' && (
                      <div className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full w-fit" style={{ backgroundColor: `${statusColor}14`, color: statusColor }}>
                        {status === 'completed' && '✓ Completed'}
                        {status === 'skipped' && '⊘ Skipped'}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Footer */}
            <div className="relative p-4 border-t sticky bottom-0 z-10" style={{ borderColor: 'rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.72)' }}>
              <button
                onClick={() => void completeFlowIfReady()}
                className="w-full rounded-2xl px-4 py-3 font-bold transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${flowTheme.accent}, rgba(255,255,255,0.14))`,
                  color: 'var(--color-bg-primary)',
                  boxShadow: `0 14px 30px ${flowTheme.accentGlow}`,
                }}
              >
                Complete {activeFlowId} Onboarding
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
