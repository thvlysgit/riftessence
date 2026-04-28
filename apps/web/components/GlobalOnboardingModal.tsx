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
    closeOnboarding,
    toggleWindow,
    setStepStatus,
  } = useOnboarding();
  const [discordLinkLoading, setDiscordLinkLoading] = useState(false);

  // Don't render if no active flow or user not authenticated
  if (!user || !activeFlowId || !bubbleVisible) {
    return null;
  }

  const progress = flowProgressById[activeFlowId];
  const flowLabel = FLOW_LABELS[activeFlowId];

  const openCurrentStepDestination = useCallback(
    async (stepId: string) => {
      if (stepId === 'create-account') {
        if (user) {
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
    [activeFlowId, router, user, showToast, setStepStatus]
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

  return (
    <>
      {/* Floating Bubble Button - Bottom Right, avoid interference */}
      <div className="fixed right-4 sm:right-6 bottom-6 z-40 flex items-center gap-2">
        <button
          onClick={toggleWindow}
          className="px-4 py-3 rounded-full shadow-xl font-semibold transition-all hover:shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
            color: 'var(--color-bg-primary)',
          }}
          aria-label={`Toggle ${activeFlowId} onboarding window`}
        >
          {activeFlowId.charAt(0).toUpperCase() + activeFlowId.slice(1)} {progress}%
        </button>
        <button
          onClick={closeOnboarding}
          className="w-10 h-10 rounded-full text-sm font-bold transition-opacity hover:opacity-75"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
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
            className="fixed right-4 sm:right-6 bottom-24 z-40 w-[min(92vw,430px)] max-h-[70vh] overflow-y-auto rounded-2xl border shadow-2xl"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Header */}
            <div className="p-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {activeFlowId.charAt(0).toUpperCase() + activeFlowId.slice(1)} Onboarding
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {flowLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleWindow}
                    className="px-3 py-1 rounded text-sm font-semibold transition-opacity hover:opacity-75"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                  >
                    Minimize
                  </button>
                  <button
                    onClick={closeOnboarding}
                    className="px-3 py-1 rounded text-sm font-semibold transition-opacity hover:opacity-75"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                  }}
                />
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {progress}% complete • Skipped optional steps not counted
              </p>
            </div>

            {/* Steps List */}
            <div className="p-4 space-y-3">
              {currentFlowSteps.map((step, index) => {
                const status = currentStepStatuses[step.id] || 'pending';
                const statusColor =
                  status === 'completed' ? '#34d399' : status === 'skipped' ? '#fbbf24' : 'var(--color-text-secondary)';

                return (
                  <article
                    key={step.id}
                    className="rounded-xl border p-3 transition-all"
                    style={{
                      borderColor: status === 'completed' ? 'rgba(52, 211, 153, 0.4)' : 'var(--color-border)',
                      backgroundColor: 'var(--color-bg-primary)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {index + 1}. {step.title}
                        {step.optional && (
                          <span
                            className="ml-2 text-xs"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            (optional)
                          </span>
                        )}
                      </h4>
                      <span className="text-xs uppercase whitespace-nowrap ml-auto" style={{ color: statusColor }}>
                        {status}
                      </span>
                    </div>

                    <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {step.description}
                    </p>

                    {/* Only show CTA button if step is pending */}
                    {status === 'pending' && (
                      <button
                        onClick={() => void openCurrentStepDestination(step.id)}
                        disabled={step.id === 'link-discord' && discordLinkLoading}
                        className="px-3 py-1.5 rounded text-xs font-semibold transition-opacity hover:opacity-85"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-primary)',
                          opacity: step.id === 'link-discord' && discordLinkLoading ? 0.65 : 1,
                        }}
                      >
                        {step.id === 'link-discord' && discordLinkLoading ? 'Connecting...' : step.ctaLabel || 'Open'}
                      </button>
                    )}

                    {/* Show status badge for completed/skipped */}
                    {status !== 'pending' && (
                      <div className="flex items-center gap-1 text-xs px-2 py-1 rounded w-fit" style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                        {status === 'completed' && '✓ Completed'}
                        {status === 'skipped' && '⊘ Skipped'}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t sticky bottom-0 z-10" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
              <button
                onClick={() => void completeFlowIfReady()}
                className="w-full px-4 py-2 rounded-lg font-bold transition-all hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
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
