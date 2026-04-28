import React from 'react';
import { useOnboarding, FlowId } from '../contexts/OnboardingContext';
import { useGlobalUI } from './GlobalUI';

type FlowId_Local = FlowId;

const FLOW_LABELS: Record<FlowId_Local, string> = {
  duo: 'I want to find a Duo!',
  lft: 'I am looking for an esports team/players for my team!',
  'team-management': 'I want to discover the game-changing team management tool!',
  matchups: 'I want to learn/share specific matchup data for my champion!',
  scrims: 'I am looking for scrims!',
  'community-growth': "I want to boost my community's growth!",
};

export default function OnboardingLobby() {
  const { openFlow, flowProgressById } = useOnboarding();
  const { showToast } = useGlobalUI();

  const handleFlowClick = (flowId: FlowId_Local) => {
    if (flowId === 'duo') {
      openFlow(flowId);
    } else {
      showToast(`${flowId} onboarding is planned next. Duo flow is live now.`, 'info');
    }
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
          const isLive = flowId === 'duo';
          const progress = flowProgressById[flowId];
          return (
            <article
              key={flowId}
              className="rounded-2xl p-5 border transition-transform hover:-translate-y-1"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: isLive ? 'var(--color-accent-1)' : 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-xs uppercase tracking-wide px-2 py-1 rounded"
                  style={{
                    backgroundColor: isLive ? 'rgba(16, 185, 129, 0.18)' : 'rgba(251, 191, 36, 0.18)',
                    color: isLive ? '#34d399' : '#fbbf24',
                  }}
                >
                  {isLive ? 'Live' : 'Planned'}
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
                {isLive ? 'Start Duo Onboarding' : 'Notify Me Later'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
