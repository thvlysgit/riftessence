import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from './GlobalUI';
import { getAuthHeader } from '../utils/auth';

type FlowId = 'duo' | 'lft' | 'team-management' | 'matchups' | 'scrims' | 'community-growth';
type StepStatus = 'pending' | 'completed' | 'skipped';

type FlowStep = {
  id: string;
  title: string;
  description: string;
  optional?: boolean;
  ctaLabel?: string;
};

type PersistedFlowState = {
  activeFlowId: FlowId | null;
  byFlow: Partial<Record<FlowId, Record<string, StepStatus>>>;
};

type ProfileSnapshot = {
  championList?: string[];
  championTierlist?: Record<string, string[]> | null;
  discordLinked?: boolean;
  discordDmNotifications?: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const STORAGE_KEY = 'riftessence_onboarding_flows_v1';

const FLOW_LABELS: Record<FlowId, string> = {
  duo: 'I want to find a Duo!',
  lft: 'I am looking for an esports team/players for my team!',
  'team-management': 'I want to discover the game-changing team management tool!',
  matchups: 'I want to learn/share specific matchup data for my champion!',
  scrims: 'I am looking for scrims!',
  'community-growth': "I want to boost my community's growth!",
};

const DUO_STEPS: FlowStep[] = [
  {
    id: 'create-account',
    title: 'Create an account',
    description: 'Recommended: use Riot sign-up in the register flow. Other sign-up methods still work.',
    ctaLabel: 'Open Sign Up',
  },
  {
    id: 'link-riot',
    title: 'Link Riot account(s)',
    description: 'Link Riot so you can post in Duo feed. Main + smurf is recommended when relevant.',
    ctaLabel: 'Link Riot',
  },
  {
    id: 'link-discord',
    title: 'Link Discord',
    description: 'Optional but strongly recommended so bot DMs can reach you in Discord by default.',
    optional: true,
    ctaLabel: 'Link Discord',
  },
  {
    id: 'champion-pool',
    title: 'Add champion pool',
    description: 'Optional but recommended. Add at least a minimal pool on your profile.',
    optional: true,
    ctaLabel: 'Open Profile',
  },
  {
    id: 'create-post',
    title: 'Create your Duo post',
    description: 'Create your first post to start receiving responses.',
    ctaLabel: 'Open Post Creation',
  },
  {
    id: 'send-first-message',
    title: 'Set filters and send first message',
    description: 'Optional. Set feed filters, then message someone from a Duo post.',
    optional: true,
    ctaLabel: 'Open Duo Feed',
  },
];

const EMPTY_STATE: PersistedFlowState = {
  activeFlowId: null,
  byFlow: {},
};

function safeParseState(raw: string | null): PersistedFlowState {
  if (!raw) return EMPTY_STATE;
  try {
    const parsed = JSON.parse(raw) as PersistedFlowState;
    return {
      activeFlowId: parsed.activeFlowId || null,
      byFlow: parsed.byFlow || {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

function isChampionPoolConfigured(profile: ProfileSnapshot | null): boolean {
  if (!profile) return false;

  const listCount = Array.isArray(profile.championList) ? profile.championList.length : 0;
  if (listCount > 0) return true;

  if (profile.championTierlist && typeof profile.championTierlist === 'object') {
    return Object.values(profile.championTierlist).some((tier) => Array.isArray(tier) && tier.length > 0);
  }

  return false;
}

export default function HomeOnboardingLobby() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { showToast } = useGlobalUI();
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState<FlowId | null>(null);
  const [flowStepStatuses, setFlowStepStatuses] = useState<Partial<Record<FlowId, Record<string, StepStatus>>>>({});
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileSnapshot | null>(null);
  const [discordLinkLoading, setDiscordLinkLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialState = safeParseState(window.localStorage.getItem(STORAGE_KEY));
    setActiveFlowId(initialState.activeFlowId);
    setFlowStepStatuses(initialState.byFlow || {});

    if (initialState.activeFlowId) {
      setBubbleVisible(true);
      setWindowOpen(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nextState: PersistedFlowState = {
      activeFlowId,
      byFlow: flowStepStatuses,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }, [activeFlowId, flowStepStatuses]);

  useEffect(() => {
    if (!user) {
      setProfileSnapshot(null);
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/api/user/profile`, {
          headers: getAuthHeader(),
          credentials: 'include',
        });

        if (!response.ok) return;
        const profile = await response.json();
        setProfileSnapshot({
          championList: profile.championList,
          championTierlist: profile.championTierlist,
          discordLinked: Boolean(profile.discordLinked ?? profile.discordAccount),
          discordDmNotifications: Boolean(profile.discordDmNotifications),
        });
      } catch {
        // Silent on purpose to avoid noisy home page failures.
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!activeFlowId || activeFlowId !== 'duo') return;

    setFlowStepStatuses((prev) => {
      const current = prev.duo || {};
      const next = { ...current };

      if (user && next['create-account'] !== 'skipped') {
        next['create-account'] = 'completed';
      }

      if ((user?.riotAccountsCount || 0) > 0 && next['link-riot'] !== 'skipped') {
        next['link-riot'] = 'completed';
      }

      const hasDiscordAndDm = Boolean(profileSnapshot?.discordLinked && profileSnapshot?.discordDmNotifications);
      if (hasDiscordAndDm && next['link-discord'] !== 'skipped') {
        next['link-discord'] = 'completed';
      }

      if (isChampionPoolConfigured(profileSnapshot) && next['champion-pool'] !== 'skipped') {
        next['champion-pool'] = 'completed';
      }

      return {
        ...prev,
        duo: next,
      };
    });
  }, [activeFlowId, profileSnapshot, user]);

  const currentDuoStepStatuses = flowStepStatuses.duo || {};

  const duoProgress = useMemo(() => {
    const denominator = DUO_STEPS.filter((step) => currentDuoStepStatuses[step.id] !== 'skipped').length;
    if (denominator <= 0) return 0;

    const completed = DUO_STEPS.filter((step) => currentDuoStepStatuses[step.id] === 'completed').length;
    return Math.round((completed / denominator) * 100);
  }, [currentDuoStepStatuses]);

  const flowProgressById = useMemo(() => {
    return {
      duo: duoProgress,
      lft: 0,
      'team-management': 0,
      matchups: 0,
      scrims: 0,
      'community-growth': 0,
    } as Record<FlowId, number>;
  }, [duoProgress]);

  const setStepStatus = (flowId: FlowId, stepId: string, status: StepStatus) => {
    setFlowStepStatuses((prev) => ({
      ...prev,
      [flowId]: {
        ...(prev[flowId] || {}),
        [stepId]: status,
      },
    }));
  };

  const openFlow = (flowId: FlowId) => {
    if (flowId !== 'duo') {
      showToast('This onboarding flow is planned next. Duo flow is live now.', 'info');
      return;
    }

    setActiveFlowId(flowId);
    setBubbleVisible(true);
    setWindowOpen(true);
  };

  const closeOnboarding = () => {
    setWindowOpen(false);
    setBubbleVisible(false);
    setActiveFlowId(null);
  };

  const openCurrentStepDestination = async (stepId: string) => {
    if (stepId === 'create-account') {
      if (user) {
        showToast('You already have an account. Step marked complete.', 'success');
        setStepStatus('duo', stepId, 'completed');
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
      router.push(`/authenticate?returnUrl=${encodeURIComponent('/')}`);
      return;
    }

    if (stepId === 'link-discord') {
      if (profileSnapshot?.discordLinked) {
        router.push('/settings?dmConsent=1');
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

    if (stepId === 'champion-pool') {
      router.push('/profile?onboarding=champion-pool');
      return;
    }

    if (stepId === 'create-post') {
      router.push('/create');
      return;
    }

    if (stepId === 'send-first-message') {
      router.push('/feed');
    }
  };

  const completeFlowIfReady = async () => {
    const requiredIds = DUO_STEPS.filter((step) => !step.optional).map((step) => step.id);
    const allRequiredDone = requiredIds.every((id) => currentDuoStepStatuses[id] === 'completed');

    if (!allRequiredDone) {
      showToast('Finish required Duo steps first.', 'info');
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

    showToast('Duo onboarding complete. You can still reopen it from the home card anytime.', 'success');
    setWindowOpen(false);
  };

  return (
    <>
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
          {(Object.keys(FLOW_LABELS) as FlowId[]).map((flowId) => {
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
                  onClick={() => openFlow(flowId)}
                  className="w-full px-4 py-2 rounded-lg font-semibold transition-opacity"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                    opacity: 1,
                  }}
                >
                  {isLive ? 'Start Duo Onboarding' : 'Notify Me Later'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {bubbleVisible && activeFlowId === 'duo' && (
        <>
          <div className="fixed right-4 sm:right-6 bottom-6 z-40 flex items-center gap-2">
            <button
              onClick={() => setWindowOpen((prev) => !prev)}
              className="px-4 py-3 rounded-full shadow-xl font-semibold"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                color: 'var(--color-bg-primary)',
              }}
              aria-label="Toggle onboarding window"
            >
              Duo Onboarding {duoProgress}%
            </button>
            <button
              onClick={closeOnboarding}
              className="w-10 h-10 rounded-full text-sm font-bold"
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

          {windowOpen && (
            <div className="fixed right-4 sm:right-6 bottom-24 z-40 w-[min(92vw,430px)] max-h-[70vh] overflow-y-auto rounded-2xl border shadow-2xl"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      Duo Onboarding
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Skipped optional steps are removed from completion percentage.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWindowOpen(false)}
                      className="px-3 py-1 rounded text-sm font-semibold"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                    >
                      Minimize
                    </button>
                    <button
                      onClick={closeOnboarding}
                      className="px-3 py-1 rounded text-sm font-semibold"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="mt-3 h-2 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${duoProgress}%`,
                      background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                    }}
                  />
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{duoProgress}% complete</p>
              </div>

              <div className="p-4 space-y-3">
                {DUO_STEPS.map((step, index) => {
                  const status = currentDuoStepStatuses[step.id] || 'pending';
                  const statusColor = status === 'completed'
                    ? '#34d399'
                    : status === 'skipped'
                    ? '#fbbf24'
                    : 'var(--color-text-secondary)';

                  return (
                    <article
                      key={step.id}
                      className="rounded-xl border p-3"
                      style={{
                        borderColor: status === 'completed' ? 'rgba(52, 211, 153, 0.4)' : 'var(--color-border)',
                        backgroundColor: 'var(--color-bg-primary)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {index + 1}. {step.title}
                        </h4>
                        <span className="text-xs uppercase" style={{ color: statusColor }}>
                          {status}
                        </span>
                      </div>

                      <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        {step.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => void openCurrentStepDestination(step.id)}
                          disabled={step.id === 'link-discord' && discordLinkLoading}
                          className="px-3 py-1.5 rounded text-xs font-semibold"
                          style={{
                            backgroundColor: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-primary)',
                            opacity: step.id === 'link-discord' && discordLinkLoading ? 0.65 : 1,
                          }}
                        >
                          {step.id === 'link-discord' && discordLinkLoading ? 'Connecting...' : step.ctaLabel || 'Open'}
                        </button>

                        <button
                          onClick={() => setStepStatus('duo', step.id, 'completed')}
                          className="px-3 py-1.5 rounded text-xs font-semibold"
                          style={{
                            backgroundColor: 'rgba(52, 211, 153, 0.18)',
                            color: '#34d399',
                          }}
                        >
                          Mark done
                        </button>

                        {step.optional && (
                          <button
                            onClick={() => setStepStatus('duo', step.id, 'skipped')}
                            className="px-3 py-1.5 rounded text-xs font-semibold"
                            style={{
                              backgroundColor: 'rgba(251, 191, 36, 0.18)',
                              color: '#fbbf24',
                            }}
                          >
                            Skip step
                          </button>
                        )}

                        {status !== 'pending' && (
                          <button
                            onClick={() => setStepStatus('duo', step.id, 'pending')}
                            className="px-3 py-1.5 rounded text-xs font-semibold"
                            style={{
                              backgroundColor: 'var(--color-bg-tertiary)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => void completeFlowIfReady()}
                  className="w-full px-4 py-2 rounded-lg font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  Complete Duo Onboarding
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
