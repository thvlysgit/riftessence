import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useOnboarding, FlowId } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from './GlobalUI';
import { getAuthHeader } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type FlowTheme = {
  accent: string;
  soft: string;
  ink: string;
};

const FLOW_LABELS: Record<FlowId, string> = {
  duo: 'I want to find a Duo!',
  lft: 'I am looking for an esports team/players for my team!',
  'team-management': 'I want to discover the game-changing team management tool!',
  matchups: 'I want to learn/share specific matchup data for my champion!',
  scrims: 'I am looking for scrims!',
  'community-growth': "I want to boost my community's growth!",
  'team-invite': 'I was invited to a team and need to join!',
};

const FLOW_THEMES: Record<FlowId, FlowTheme> = {
  duo: { accent: '#f59e0b', soft: 'rgba(245, 158, 11, 0.12)', ink: '#f59e0b' },
  lft: { accent: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.12)', ink: '#8b5cf6' },
  'team-management': { accent: '#14b8a6', soft: 'rgba(20, 184, 166, 0.12)', ink: '#14b8a6' },
  matchups: { accent: '#ec4899', soft: 'rgba(236, 72, 153, 0.12)', ink: '#ec4899' },
  scrims: { accent: '#22c55e', soft: 'rgba(34, 197, 94, 0.12)', ink: '#22c55e' },
  'community-growth': { accent: '#f97316', soft: 'rgba(249, 115, 22, 0.12)', ink: '#f97316' },
  'team-invite': { accent: '#38bdf8', soft: 'rgba(56, 189, 248, 0.12)', ink: '#38bdf8' },
};

export default function GlobalOnboardingModal() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { showToast, confirm } = useGlobalUI();
  const {
    activeFlowIds,
    activeFlowId,
    windowOpen,
    bubbleVisible,
    currentFlowSteps,
    currentStepStatuses,
    flowProgressById,
    teamInviteSnapshots,
    closeOnboarding,
    toggleWindow,
    openFlow,
    setStepStatus,
  } = useOnboarding();
  const [discordLinkLoading, setDiscordLinkLoading] = useState(false);

  const currentFlowId = activeFlowId || activeFlowIds[activeFlowIds.length - 1] || 'duo';
  const currentTheme = FLOW_THEMES[currentFlowId];
  const progress = flowProgressById[currentFlowId] || 0;
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
          credentials: 'include',
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
              credentials: 'include',
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
          showToast('Discord server linking coming soon.', 'info');
          return;
        }
      }

      if (stepId === 'champion-pool') {
        router.push(`/profile?onboarding=champion-pool&returnUrl=${encodeURIComponent(router.asPath)}`);
        return;
      }

      if (stepId === 'create-post') {
        if (currentFlowId === 'lft') {
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

      if (stepId === 'configure-scrim' || stepId === 'post-scrim' || stepId === 'start-match') {
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
    [activeFlowId, currentFlowId, router, setStepStatus, showToast, teamInviteSnapshots, user]
  );

  const completeFlowIfReady = useCallback(async () => {
    const requiredSteps = currentFlowSteps.filter((step) => !step.optional);
    const allRequiredDone = requiredSteps.every((step) => currentStepStatuses[step.id] === 'completed');

    if (!allRequiredDone) {
      showToast(`Finish required ${currentFlowId} steps first.`, 'info');
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

    showToast(`${currentFlowId} onboarding complete! You can still reopen it anytime.`, 'success');
    closeOnboarding();
  }, [closeOnboarding, currentFlowId, currentFlowSteps, currentStepStatuses, refreshUser, showToast, user]);

  const handleCloseCurrentFlow = useCallback(async () => {
    const label = FLOW_LABELS[currentFlowId] || 'this guide';
    const confirmed = await confirm({
      title: 'Give up guide?',
      message: `If you close ${label.toLowerCase()}, it will be removed from your active guides. You can reopen it later.`,
      confirmText: 'Give up guide',
      cancelText: 'Keep guide',
    });

    if (confirmed) {
      closeOnboarding();
    }
  }, [closeOnboarding, confirm, currentFlowId]);

  if (!user || !bubbleVisible) {
    return null;
  }

  const renderDockCard = (flowId: FlowId) => {
    const theme = FLOW_THEMES[flowId];
    const flowProgress = flowProgressById[flowId] || 0;
    const label = FLOW_LABELS[flowId];
    const isFocused = flowId === currentFlowId;
    const ctaLabel = flowProgress >= 100 ? 'Guide me again' : 'Guide me';

    return (
      <button
        key={flowId}
        onClick={() => openFlow(flowId)}
        className={`group w-[260px] rounded-[22px] border px-4 py-3 text-left transition-all duration-200 ${isFocused ? 'translate-x-1' : 'hover:-translate-y-0.5'}`}
        style={{
          borderColor: isFocused ? theme.accent : 'rgba(148, 163, 184, 0.18)',
          background: isFocused ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.86)',
          boxShadow: isFocused ? `0 18px 28px ${theme.soft}` : '0 10px 20px rgba(2, 6, 23, 0.22)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: theme.accent, color: theme.accent, backgroundColor: 'rgba(15, 23, 42, 0.72)' }}>
              {flowProgress >= 100 ? 'Completed' : 'Guide'}
            </div>
            <div className="text-sm font-bold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
              {label}
            </div>
          </div>
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full border text-xs font-black" style={{ borderColor: theme.accent, color: theme.accent, backgroundColor: theme.soft }}>
            {flowProgress}%
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.14)' }}>
          <div className="h-full rounded-full" style={{ width: `${flowProgress}%`, background: theme.accent }} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs" style={{ color: 'rgba(226, 232, 240, 0.70)' }}>
            {flowProgress >= 100 ? 'Ready to revisit' : flowProgress > 0 ? 'Continue the guide' : 'Start the guide'}
          </span>
          <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: theme.accent, color: theme.accent, backgroundColor: theme.soft }}>
            {ctaLabel}
          </span>
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="fixed left-4 bottom-6 z-40 flex max-h-[calc(100vh-1.5rem)] flex-col-reverse gap-3 overflow-visible sm:left-6">
        {activeFlowIds.slice(-3).map((flowId) => renderDockCard(flowId))}
      </div>

      {windowOpen && (
        <div className="fixed left-4 bottom-32 z-40 w-[min(92vw,520px)] sm:left-6">
          <div
            className="flex max-h-[72vh] flex-col overflow-hidden rounded-[30px] border"
            style={{
              borderColor: currentTheme.accent,
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.97) 0%, rgba(15, 23, 42, 0.92) 100%)',
              boxShadow: `0 28px 70px ${currentTheme.soft}`,
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'rgba(148, 163, 184, 0.14)' }}>
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: currentTheme.accent, color: currentTheme.accent, backgroundColor: 'rgba(15, 23, 42, 0.72)' }}>
                  {progress >= 100 ? 'Revisit guide' : 'Guided flow'}
                </div>
                <h3 className="mt-2 text-xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {currentFlowId.charAt(0).toUpperCase() + currentFlowId.slice(1).replace('-', ' ')}
                </h3>
                <p className="mt-1 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                  {flowLabel}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start">
                <button
                  onClick={toggleWindow}
                  className="inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.78)',
                    color: 'var(--color-text-primary)',
                    borderColor: 'rgba(148, 163, 184, 0.18)',
                  }}
                >
                  Minimize
                </button>
                <button
                  onClick={() => void handleCloseCurrentFlow()}
                  className="inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{
                    backgroundColor: 'rgba(127, 29, 29, 0.28)',
                    color: '#fecaca',
                    borderColor: 'rgba(248, 113, 113, 0.30)',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="border-b px-5 py-4" style={{ borderColor: 'rgba(148, 163, 184, 0.14)' }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.14)' }}>
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: currentTheme.accent }} />
                </div>
                <div className="flex-none rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: currentTheme.accent, color: currentTheme.accent, backgroundColor: currentTheme.soft }}>
                  {progress}%
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-3 pr-1">
                {currentFlowSteps.map((step, index) => {
                  const status = currentStepStatuses[step.id] || 'pending';
                  const statusColor = status === 'completed' ? currentTheme.accent : status === 'skipped' ? '#fbbf24' : 'rgba(226, 232, 240, 0.68)';

                  return (
                    <article
                      key={step.id}
                      className="rounded-[22px] border p-4"
                      style={{
                        borderColor: status === 'completed' ? currentTheme.accent : 'rgba(148, 163, 184, 0.16)',
                        backgroundColor: 'rgba(2, 6, 23, 0.36)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border text-sm font-black" style={{ borderColor: currentTheme.accent, color: currentTheme.accent, backgroundColor: currentTheme.soft }}>
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold leading-snug sm:text-base" style={{ color: 'var(--color-text-primary)' }}>
                              {step.title}
                              {step.optional && <span className="ml-2 text-xs font-medium" style={{ color: 'rgba(226, 232, 240, 0.58)' }}>optional</span>}
                            </h4>
                            <p className="mt-1 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                              {step.description}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: statusColor, color: statusColor, backgroundColor: 'rgba(15, 23, 42, 0.66)' }}>
                          {status}
                        </span>
                      </div>

                      {status === 'pending' && (
                        <button
                          onClick={() => void openCurrentStepDestination(step.id)}
                          disabled={step.id === 'link-discord' && discordLinkLoading}
                          className="mt-4 inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-xs font-semibold transition-all hover:-translate-y-0.5"
                          style={{
                            borderColor: currentTheme.accent,
                            backgroundColor: currentTheme.soft,
                            color: 'var(--color-text-primary)',
                            opacity: step.id === 'link-discord' && discordLinkLoading ? 0.65 : 1,
                          }}
                        >
                          {step.id === 'link-discord' && discordLinkLoading ? 'Connecting...' : step.ctaLabel || 'Open'}
                        </button>
                      )}

                      {status !== 'pending' && (
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium" style={{ color: statusColor }}>
                          <span className="rounded-full border px-2.5 py-1" style={{ borderColor: `${statusColor}55`, backgroundColor: `${statusColor}12` }}>
                            {status === 'completed' ? 'Completed' : 'Skipped'}
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="border-t px-5 py-4" style={{ borderColor: 'rgba(148, 163, 184, 0.14)', backgroundColor: 'rgba(15, 23, 42, 0.82)' }}>
              <button
                onClick={() => void completeFlowIfReady()}
                className="w-full rounded-2xl border px-4 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: currentTheme.accent,
                  backgroundColor: currentTheme.soft,
                  color: 'var(--color-text-primary)',
                }}
              >
                Complete {currentFlowId} Onboarding
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
