import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { getAuthHeader } from '../utils/auth';

export type FlowId = 'duo' | 'lft' | 'team-management' | 'matchups' | 'scrims' | 'community-growth';
export type StepStatus = 'pending' | 'completed' | 'skipped';

export interface FlowStep {
  id: string;
  title: string;
  description: string;
  optional?: boolean;
  ctaLabel?: string;
}

interface ProfileSnapshot {
  championList?: string[];
  championTierlist?: Record<string, string[]> | null;
  discordLinked?: boolean;
  discordDmNotifications?: boolean;
  discordServerId?: string;
  teamCount?: number;
  postsCount?: number;
  conversationsCount?: number;
}

interface PersistedFlowState {
  activeFlowId: FlowId | null;
  byFlow: Partial<Record<FlowId, Record<string, StepStatus>>>;
}

interface OnboardingContextType {
  activeFlowId: FlowId | null;
  windowOpen: boolean;
  bubbleVisible: boolean;
  flowProgressById: Record<FlowId, number>;
  flowStepStatuses: Partial<Record<FlowId, Record<string, StepStatus>>>;
  currentFlow: FlowId | null;
  currentFlowSteps: FlowStep[];
  currentStepStatuses: Record<string, StepStatus>;
  profileSnapshot: ProfileSnapshot | null;

  openFlow: (flowId: FlowId) => void;
  closeOnboarding: () => void;
  toggleWindow: () => void;
  setStepStatus: (flowId: FlowId, stepId: string, status: StepStatus) => void;
  setActiveFlowId: (flowId: FlowId | null) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

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
    title: 'Link Discord + enable DMs',
    description: 'Optional but strongly recommended so you can receive in-app DMs in Discord.',
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

const LFT_STEPS: FlowStep[] = [
  {
    id: 'create-account',
    title: 'Create an account',
    description: 'Get started with your LFT profile.',
    ctaLabel: 'Open Sign Up',
  },
  {
    id: 'link-riot',
    title: 'Link Riot account(s)',
    description: 'Link your Riot account to showcase your rank and accounts.',
    ctaLabel: 'Link Riot',
  },
  {
    id: 'link-discord',
    title: 'Link Discord + enable DMs',
    description: 'Optional but recommended for team communications.',
    optional: true,
    ctaLabel: 'Link Discord',
  },
  {
    id: 'champion-pool',
    title: 'Add your champion pool',
    description: 'Optional. Let teams know your main champions.',
    optional: true,
    ctaLabel: 'Open Profile',
  },
  {
    id: 'create-post',
    title: 'Create your LFT post',
    description: 'Post your profile to find teams looking for players.',
    ctaLabel: 'Open Post Creation',
  },
];

const TEAM_MANAGEMENT_STEPS: FlowStep[] = [
  {
    id: 'create-account',
    title: 'Create an account',
    description: 'Get started with team management.',
    ctaLabel: 'Open Sign Up',
  },
  {
    id: 'create-roster',
    title: 'Create your roster',
    description: 'Add your team name and configure basic team info.',
    ctaLabel: 'Create Team',
  },
  {
    id: 'add-players',
    title: 'Add at least one player',
    description: 'Invite or add players to your roster.',
    ctaLabel: 'Manage Roster',
  },
  {
    id: 'link-discord-webhook',
    title: 'Input Discord webhook',
    description: 'Connect your Discord server for match notifications.',
    ctaLabel: 'Team Settings',
  },
  {
    id: 'schedule-event',
    title: 'Schedule your first event',
    description: 'Schedule a scrim or match to get started.',
    ctaLabel: 'Schedule Event',
  },
];

const MATCHUPS_STEPS: FlowStep[] = [
  {
    id: 'create-account',
    title: 'Create an account',
    description: 'Get started with matchup data sharing.',
    ctaLabel: 'Open Sign Up',
  },
  {
    id: 'link-riot',
    title: 'Link Riot account(s)',
    description: 'Verify your champion pool.',
    ctaLabel: 'Link Riot',
  },
  {
    id: 'create-matchup',
    title: 'Create your first matchup',
    description: 'Document a matchup you know well and share insights.',
    ctaLabel: 'Open Matchups',
  },
  {
    id: 'configure-details',
    title: 'Configure matchup details',
    description: 'Optional. Add champion bans and detailed notes.',
    optional: true,
    ctaLabel: 'Open Matchups',
  },
  {
    id: 'share-insights',
    title: 'Share with the community',
    description: 'Optional. Help others learn from your experience.',
    optional: true,
    ctaLabel: 'View Community',
  },
];

const SCRIMS_STEPS: FlowStep[] = [
  {
    id: 'create-account',
    title: 'Create an account',
    description: 'Get started with scrims.',
    ctaLabel: 'Open Sign Up',
  },
  {
    id: 'create-team',
    title: 'Create or join a team',
    description: 'Set up your team roster for scrims.',
    ctaLabel: 'Create Team',
  },
  {
    id: 'configure-scrim',
    title: 'Configure your scrim settings',
    description: 'Set team size, game mode, and availability.',
    ctaLabel: 'Team Settings',
  },
  {
    id: 'post-scrim',
    title: 'Post or find a scrim',
    description: 'Start hosting or looking for scrim matches.',
    ctaLabel: 'Find Scrims',
  },
  {
    id: 'start-match',
    title: 'Start your first match',
    description: 'Optional. Launch your first scrim.',
    optional: true,
    ctaLabel: 'Start Match',
  },
];

const COMMUNITY_GROWTH_STEPS: FlowStep[] = [
  {
    id: 'create-account',
    title: 'Create an account',
    description: 'Get started with community growth tools.',
    ctaLabel: 'Open Sign Up',
  },
  {
    id: 'link-discord-server',
    title: 'Link Discord server',
    description: 'Connect your Discord server and add the bot.',
    ctaLabel: 'Link Server',
  },
  {
    id: 'create-community',
    title: 'Create your community profile',
    description: 'Set up your community name and description.',
    ctaLabel: 'Create Community',
  },
  {
    id: 'setup-forwarding',
    title: 'Set up Duo posts forwarding',
    description: 'Optional. Forward Duo posts to your Discord for visibility.',
    optional: true,
    ctaLabel: 'Community Settings',
  },
];

const FLOW_STEPS: Record<FlowId, FlowStep[]> = {
  duo: DUO_STEPS,
  lft: LFT_STEPS,
  'team-management': TEAM_MANAGEMENT_STEPS,
  matchups: MATCHUPS_STEPS,
  scrims: SCRIMS_STEPS,
  'community-growth': COMMUNITY_GROWTH_STEPS,
};

function isChampionPoolConfigured(profile: ProfileSnapshot | null): boolean {
  if (!profile) return false;
  const listCount = Array.isArray(profile.championList) ? profile.championList.length : 0;
  if (listCount > 0) return true;
  if (profile.championTierlist && typeof profile.championTierlist === 'object') {
    return Object.values(profile.championTierlist).some((tier) => Array.isArray(tier) && tier.length > 0);
  }
  return false;
}

function safeParseState(raw: string | null): PersistedFlowState {
  if (!raw) return { activeFlowId: null, byFlow: {} };
  try {
    const parsed = JSON.parse(raw) as PersistedFlowState;
    return {
      activeFlowId: parsed.activeFlowId || null,
      byFlow: parsed.byFlow || {},
    };
  } catch {
    return { activeFlowId: null, byFlow: {} };
  }
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [activeFlowId, setActiveFlowId] = useState<FlowId | null>(null);
  const [flowStepStatuses, setFlowStepStatuses] = useState<Partial<Record<FlowId, Record<string, StepStatus>>>>({});
  const [windowOpen, setWindowOpen] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileSnapshot | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initialState = safeParseState(window.localStorage.getItem(STORAGE_KEY));
    setActiveFlowId(initialState.activeFlowId);
    setFlowStepStatuses(initialState.byFlow || {});
    if (initialState.activeFlowId) {
      setBubbleVisible(true);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextState: PersistedFlowState = {
      activeFlowId,
      byFlow: flowStepStatuses,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }, [activeFlowId, flowStepStatuses]);

  // Load profile snapshot
  useEffect(() => {
    if (!user) {
      setProfileSnapshot(null);
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/api/user/profile`, {
          headers: getAuthHeader(),
        });
        if (!response.ok) return;
        const profile = await response.json();
        setProfileSnapshot({
          championList: profile.championList,
          championTierlist: profile.championTierlist,
          discordLinked: Boolean(profile.discordLinked ?? profile.discordAccount),
          discordDmNotifications: Boolean(profile.discordDmNotifications),
          discordServerId: profile.discordServerId,
          teamCount: profile.teams?.length || 0,
          postsCount: profile.postsCount || 0,
          conversationsCount: profile.conversations?.length || 0,
        });
      } catch {
        // Silent on purpose
      }
    };

    loadProfile();
  }, [user]);

  // Auto-detect steps for all flows
  useEffect(() => {
    if (!user || !activeFlowId) return;

    setFlowStepStatuses((prev) => {
      const current = prev[activeFlowId] || {};
      const next = { ...current };

      // Generic account check for all flows
      if (user && next['create-account'] !== 'skipped') {
        next['create-account'] = 'completed';
      }

      // Riot account check for flows that need it
      if (['duo', 'lft', 'matchups'].includes(activeFlowId)) {
        if ((user?.riotAccountsCount || 0) > 0 && next['link-riot'] !== 'skipped') {
          next['link-riot'] = 'completed';
        }
      }

      // Discord + DM check for flows that need it
      if (['duo', 'lft'].includes(activeFlowId)) {
        const hasDiscordAndDm = Boolean(profileSnapshot?.discordLinked && profileSnapshot?.discordDmNotifications);
        if (hasDiscordAndDm && next['link-discord'] !== 'skipped') {
          next['link-discord'] = 'completed';
        }
      }

      // Champion pool check for flows that need it
      if (['duo', 'lft', 'matchups'].includes(activeFlowId)) {
        if (isChampionPoolConfigured(profileSnapshot) && next['champion-pool'] !== 'skipped') {
          next['champion-pool'] = 'completed';
        }
      }

      // Duo post creation check
      if (activeFlowId === 'duo') {
        if ((profileSnapshot?.postsCount || 0) > 0 && next['create-post'] !== 'skipped') {
          next['create-post'] = 'completed';
        }
      }

      // LFT post creation check
      if (activeFlowId === 'lft') {
        if ((profileSnapshot?.postsCount || 0) > 0 && next['create-post'] !== 'skipped') {
          next['create-post'] = 'completed';
        }
      }

      // Team management checks
      if (activeFlowId === 'team-management') {
        if ((profileSnapshot?.teamCount || 0) > 0 && next['create-roster'] !== 'skipped') {
          next['create-roster'] = 'completed';
        }
      }

      // Community growth checks
      if (activeFlowId === 'community-growth') {
        if (profileSnapshot?.discordLinked && next['link-discord-server'] !== 'skipped') {
          next['link-discord-server'] = 'completed';
        }
      }

      return {
        ...prev,
        [activeFlowId]: next,
      };
    });
  }, [activeFlowId, profileSnapshot, user]);

  // Calculate progress for each flow
  const flowProgressById = useMemo(() => {
    const result: Record<FlowId, number> = {
      duo: 0,
      lft: 0,
      'team-management': 0,
      matchups: 0,
      scrims: 0,
      'community-growth': 0,
    };

    (Object.keys(FLOW_STEPS) as FlowId[]).forEach((flowId) => {
      const statuses = flowStepStatuses[flowId] || {};
      const steps = FLOW_STEPS[flowId];
      const denominator = steps.filter((step) => statuses[step.id] !== 'skipped').length;

      if (denominator <= 0) {
        result[flowId] = 0;
        return;
      }

      const completed = steps.filter((step) => statuses[step.id] === 'completed').length;
      result[flowId] = Math.round((completed / denominator) * 100);
    });

    return result;
  }, [flowStepStatuses]);

  const currentFlowSteps = activeFlowId ? FLOW_STEPS[activeFlowId] : [];
  const currentStepStatuses = activeFlowId ? (flowStepStatuses[activeFlowId] || {}) : {};

  const setStepStatus = useCallback(
    (flowId: FlowId, stepId: string, status: StepStatus) => {
      setFlowStepStatuses((prev) => ({
        ...prev,
        [flowId]: {
          ...(prev[flowId] || {}),
          [stepId]: status,
        },
      }));
    },
    []
  );

  const handleOpenFlow = useCallback((flowId: FlowId) => {
    setActiveFlowId(flowId);
    setBubbleVisible(true);
    setWindowOpen(true);
  }, []);

  const handleCloseOnboarding = useCallback(() => {
    setWindowOpen(false);
    setBubbleVisible(false);
    setActiveFlowId(null);
  }, []);

  const handleToggleWindow = useCallback(() => {
    setWindowOpen((prev) => !prev);
  }, []);

  const value: OnboardingContextType = {
    activeFlowId,
    windowOpen,
    bubbleVisible,
    flowProgressById,
    flowStepStatuses,
    currentFlow: activeFlowId,
    currentFlowSteps,
    currentStepStatuses,
    profileSnapshot,
    openFlow: handleOpenFlow,
    closeOnboarding: handleCloseOnboarding,
    toggleWindow: handleToggleWindow,
    setStepStatus,
    setActiveFlowId,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
