import React from 'react';
import { useOnboarding, FlowId } from '../contexts/OnboardingContext';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

type FlowId_Local = FlowId;

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
    <section className="mt-10">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Pick your path
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Start with the feature you care about. Each onboarding has its own progress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(Object.keys(FLOW_LABELS) as FlowId_Local[]).map((flowId) => {
          const progress = flowProgressById[flowId];
          return (
            <article
              key={flowId}
              className="rounded-2xl p-5 border transition-transform hover:-translate-y-1"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-xs uppercase tracking-wide px-2 py-1 rounded"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.18)',
                    color: '#34d399',
                  }}
                >
                  Live
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {progress}% complete
                </span>
              </div>

              <p className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {FLOW_LABELS[flowId]}
              </p>

              <button
                onClick={() => handleFlowClick(flowId)}
                className="w-full px-4 py-2 rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                }}
              >
                Start Onboarding
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
