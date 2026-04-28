import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';
import { getAuthHeader } from '../utils/auth';

export type FlowId = 'duo' | 'lft' | 'team-management' | 'matchups' | 'scrims' | 'community-growth' | 'team-invite';
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
  messagesSentCount?: number;
  conversationsCount?: number;
  communities?: Array<{ id: string; name: string; role: string }>;
}

interface TeamSnapshot {
  id: string;
  memberCount?: number;
  upcomingEventCount?: number;
  discordWebhookUrl?: string | null;
  discordScrimCodeWebhookUrl?: string | null;
  discordNotifyEvents?: boolean;
  webhookValid?: boolean;
  scrimCodeWebhookValid?: boolean;
}

interface TeamInviteSnapshot {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  pendingSpotId: string;
  role: string;
  canJoin: boolean;
  addedAt: string;
}

interface MatchupCountSnapshot {
  count: number;
  owned: number;
  saved: number;
}

interface ScrimFeedSnapshot {
  count: number;
}

interface LftPostsSnapshot {
  count: number;
}

interface TeamDiscordSnapshot {
  webhookUrl?: string | null;
  scrimCodeWebhookUrl?: string | null;
  webhookValid?: boolean;
  scrimCodeWebhookValid?: boolean;
  notifyEvents?: boolean;
}

interface PersistedFlowState {
  activeFlowIds: FlowId[];
  focusedFlowId: FlowId | null;
  activeFlowId: FlowId | null;
  windowOpen: boolean;
  byFlow: Partial<Record<FlowId, Record<string, StepStatus>>>;
}

interface OnboardingContextType {
  activeFlowIds: FlowId[];
  activeFlowId: FlowId | null;
  windowOpen: boolean;
  bubbleVisible: boolean;
  flowProgressById: Record<FlowId, number>;
  flowStepStatuses: Partial<Record<FlowId, Record<string, StepStatus>>>;
  currentFlow: FlowId | null;
  currentFlowSteps: FlowStep[];
  currentStepStatuses: Record<string, StepStatus>;
  profileSnapshot: ProfileSnapshot | null;
  teamInviteSnapshots: TeamInviteSnapshot[];

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
  'team-invite': 'I was invited to a team and need to join!',
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
    id: 'send-test',
    title: 'Send a Discord test',
    description: 'Confirm notifications reach Discord correctly.',
    ctaLabel: 'Test Webhook',
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
    id: 'browse-marketplace',
    title: 'Visit the marketplace',
    description: 'Open the matchup marketplace and browse shared guides.',
    ctaLabel: 'Browse Marketplace',
  },
  {
    id: 'add-to-library',
    title: 'Add one matchup to your library',
    description: 'Save a matchup guide from the marketplace.',
    ctaLabel: 'Save Matchup',
  },
  {
    id: 'create-matchup',
    title: 'Create your own matchup card',
    description: 'Optional. Add your own guide to the library.',
    optional: true,
    ctaLabel: 'Create Matchup',
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
    description: 'Forward Duo posts to your Discord for visibility.',
    ctaLabel: 'Community Settings',
  },
];

const TEAM_INVITE_STEPS: FlowStep[] = [
  {
    id: 'link-riot',
    title: 'Link Riot account',
    description: 'You need a linked Riot account before you can claim an invite spot.',
    ctaLabel: 'Link Riot',
  },
  {
    id: 'join-invited-team',
    title: 'Join your invited team',
    description: 'Open the invited team page and accept your pending spot.',
    ctaLabel: 'Open Team Invite',
  },
];

const FLOW_STEPS: Record<FlowId, FlowStep[]> = {
  duo: DUO_STEPS,
  lft: LFT_STEPS,
  'team-management': TEAM_MANAGEMENT_STEPS,
  matchups: MATCHUPS_STEPS,
  scrims: SCRIMS_STEPS,
  'community-growth': COMMUNITY_GROWTH_STEPS,
  'team-invite': TEAM_INVITE_STEPS,
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
  if (!raw) return { activeFlowIds: [], focusedFlowId: null, activeFlowId: null, windowOpen: false, byFlow: {} };
  try {
    const parsed = JSON.parse(raw) as PersistedFlowState;
    const activeFlowIds = Array.isArray(parsed.activeFlowIds)
      ? parsed.activeFlowIds.filter((flowId): flowId is FlowId => Object.keys(FLOW_STEPS).includes(flowId))
      : parsed.activeFlowId
        ? [parsed.activeFlowId]
        : [];
    const focusedFlowId = parsed.focusedFlowId || parsed.activeFlowId || activeFlowIds[activeFlowIds.length - 1] || null;
    return {
      activeFlowIds,
      focusedFlowId,
      activeFlowId: focusedFlowId,
      windowOpen: typeof parsed.windowOpen === 'boolean' ? parsed.windowOpen : Boolean(focusedFlowId),
      byFlow: parsed.byFlow || {},
    };
  } catch {
    return { activeFlowIds: [], focusedFlowId: null, activeFlowId: null, windowOpen: false, byFlow: {} };
  }
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [activeFlowIds, setActiveFlowIds] = useState<FlowId[]>([]);
  const [focusedFlowId, setFocusedFlowId] = useState<FlowId | null>(null);
  const [flowStepStatuses, setFlowStepStatuses] = useState<Partial<Record<FlowId, Record<string, StepStatus>>>>({});
  const [windowOpen, setWindowOpen] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileSnapshot | null>(null);
  const [teamSnapshots, setTeamSnapshots] = useState<TeamSnapshot[]>([]);
  const [teamDiscordSnapshot, setTeamDiscordSnapshot] = useState<TeamDiscordSnapshot | null>(null);
  const [teamInviteSnapshots, setTeamInviteSnapshots] = useState<TeamInviteSnapshot[]>([]);
  const [matchupCountSnapshot, setMatchupCountSnapshot] = useState<MatchupCountSnapshot | null>(null);
  const [lftPostsSnapshot, setLftPostsSnapshot] = useState<LftPostsSnapshot | null>(null);
  const [scrimFeedSnapshot, setScrimFeedSnapshot] = useState<ScrimFeedSnapshot | null>(null);
  const previousStorageKeyRef = useRef<string | null>(null);
  const onboardingStorageKey = user?.id ? `${STORAGE_KEY}:${user.id}` : null;

  // Initialize from localStorage per account; logged-out sessions keep no persisted onboarding state.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!onboardingStorageKey) {
      const previousStorageKey = previousStorageKeyRef.current;
      if (previousStorageKey) {
        window.localStorage.removeItem(previousStorageKey);
      }

      previousStorageKeyRef.current = null;
      setActiveFlowIds([]);
      setFocusedFlowId(null);
      setFlowStepStatuses({});
      setWindowOpen(false);
      return;
    }

    const initialState = safeParseState(window.localStorage.getItem(onboardingStorageKey));
    setActiveFlowIds(initialState.activeFlowIds);
    setFocusedFlowId(initialState.focusedFlowId);
    setFlowStepStatuses(initialState.byFlow || {});
    setWindowOpen(initialState.windowOpen);
    previousStorageKeyRef.current = onboardingStorageKey;
  }, [onboardingStorageKey]);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!onboardingStorageKey) return;

    const nextState: PersistedFlowState = {
      activeFlowIds,
      focusedFlowId,
      activeFlowId: focusedFlowId,
      windowOpen,
      byFlow: flowStepStatuses,
    };
    window.localStorage.setItem(onboardingStorageKey, JSON.stringify(nextState));
  }, [activeFlowIds, flowStepStatuses, focusedFlowId, onboardingStorageKey, windowOpen]);

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
          postsCount: profile.postsCount || profile._count?.posts || 0,
          messagesSentCount: profile.messagesSentCount || profile._count?.messagesSent || 0,
          conversationsCount: profile.conversationsCount || profile.messagesSentCount || profile._count?.messagesSent || 0,
        });
      } catch {
        // Silent on purpose
      }
    };

    loadProfile();
  }, [router.pathname, user]);

  // Load team snapshot for team-management and scrims onboarding
  useEffect(() => {
    if (!user) {
      setTeamSnapshots([]);
      setTeamDiscordSnapshot(null);
      setTeamInviteSnapshots([]);
      return;
    }

    const loadTeams = async () => {
      try {
        const response = await fetch(`${API_URL}/api/teams`, {
          headers: getAuthHeader(),
        });

        if (!response.ok) return;

        const teams = await response.json();
        setTeamSnapshots(Array.isArray(teams) ? teams.map((team: any) => ({
          id: team.id,
          memberCount: team.memberCount,
          upcomingEventCount: team.upcomingEventCount,
        })) : []);
      } catch {
        // Silent on purpose
      }
    };

    loadTeams();
  }, [user]);

  // Load pending team invites so the onboarding can open the exact invited team
  useEffect(() => {
    if (!user) {
      setTeamInviteSnapshots([]);
      return;
    }

    const loadTeamInvites = async () => {
      try {
        const response = await fetch(`${API_URL}/api/teams/invites`, {
          headers: getAuthHeader(),
        });

        if (!response.ok) return;

        const invites = await response.json();
        if (!Array.isArray(invites)) return;

        setTeamInviteSnapshots((prev) => {
          if (invites.length === 0) {
            return prev.length > 0 ? prev : [];
          }

          return invites.map((invite: any) => ({
            teamId: invite.teamId,
            teamName: invite.teamName,
            teamTag: invite.teamTag || null,
            pendingSpotId: invite.pendingSpotId,
            role: invite.role,
            canJoin: Boolean(invite.canJoin),
            addedAt: invite.addedAt,
          }));
        });
      } catch {
        // Silent on purpose
      }
    };

    loadTeamInvites();
  }, [user]);

  // Load Discord settings for the first managed team, if available
  useEffect(() => {
    if (!user || teamSnapshots.length === 0) {
      setTeamDiscordSnapshot(null);
      return;
    }

    const loadTeamDiscord = async () => {
      try {
        const response = await fetch(`${API_URL}/api/teams/${teamSnapshots[0].id}/discord`, {
          headers: getAuthHeader(),
        });

        if (!response.ok) return;

        const settings = await response.json();
        setTeamDiscordSnapshot({
          webhookUrl: settings.webhookUrl || null,
          scrimCodeWebhookUrl: settings.scrimCodeWebhookUrl || null,
          webhookValid: Boolean(settings.webhookValid),
          scrimCodeWebhookValid: Boolean(settings.scrimCodeWebhookValid),
          notifyEvents: settings.notifyEvents ?? true,
        });
      } catch {
        // Silent on purpose
      }
    };

    loadTeamDiscord();
  }, [teamSnapshots, user]);

  // Load matchup library stats for matchups onboarding
  useEffect(() => {
    if (!user) {
      setMatchupCountSnapshot(null);
      return;
    }

    const loadMatchupCount = async () => {
      try {
        const response = await fetch(`${API_URL}/api/matchups/count`, {
          headers: getAuthHeader(),
        });

        if (!response.ok) return;

        const countData = await response.json();
        setMatchupCountSnapshot({
          count: Number(countData.count) || 0,
          owned: Number(countData.owned) || 0,
          saved: Number(countData.saved) || 0,
        });
      } catch {
        // Silent on purpose
      }
    };

    loadMatchupCount();
  }, [user]);

  // Load LFT post stats for the LFT onboarding
  useEffect(() => {
    if (!user?.id) {
      setLftPostsSnapshot(null);
      return;
    }

    const loadLftPosts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/lft/posts?userId=${encodeURIComponent(user.id)}`, {
          headers: getAuthHeader(),
        });

        if (!response.ok) return;

        const posts = await response.json();
        setLftPostsSnapshot({ count: Array.isArray(posts) ? posts.filter((post: any) => post?.authorId === user.id).length : 0 });
      } catch {
        // Silent on purpose
      }
    };

    loadLftPosts();
  }, [user?.id]);

  // Load scrim feed stats for scrims onboarding
  useEffect(() => {
    if (!user) {
      setScrimFeedSnapshot(null);
      return;
    }

    const loadScrimFeed = async () => {
      try {
        const response = await fetch(`${API_URL}/api/scrims/posts`, {
          headers: getAuthHeader(),
        });

        if (!response.ok) return;

        const feed = await response.json();
        const scrimPosts = Array.isArray(feed?.posts) ? feed.posts.length : Array.isArray(feed) ? feed.length : 0;
        setScrimFeedSnapshot({ count: scrimPosts });
      } catch {
        // Silent on purpose
      }
    };

    loadScrimFeed();
  }, [user]);

  // Auto-detect steps for the focused flow
  useEffect(() => {
    if (!user || !focusedFlowId) return;

    setFlowStepStatuses((prev) => {
      const current = prev[focusedFlowId] || {};
      const next = { ...current };
      const pathname = router.pathname || '/';
      const hasTeam = teamSnapshots.length > 0;
      const hasManagedPlayerCount = teamSnapshots.some((team) => (team.memberCount || 0) > 1);
      const hasTeamWebhook = Boolean(teamDiscordSnapshot?.webhookUrl || teamDiscordSnapshot?.scrimCodeWebhookUrl);
      const hasValidTeamWebhook = Boolean(teamDiscordSnapshot?.webhookValid || teamDiscordSnapshot?.scrimCodeWebhookValid);
      const hasUpcomingTeamEvents = teamSnapshots.some((team) => (team.upcomingEventCount || 0) > 0);
      const invitedTeamIds = new Set(teamInviteSnapshots.map((invite) => invite.teamId));
      const hasTeamInvite = teamInviteSnapshots.length > 0;
      const communityCount = profileSnapshot?.communities?.length || 0;
      const lftPostCount = lftPostsSnapshot?.count || 0;
      const matchupSavedCount = matchupCountSnapshot?.saved || 0;
      const matchupOwnedCount = matchupCountSnapshot?.owned || 0;
      const scrimFeedCount = scrimFeedSnapshot?.count || 0;

      // Generic account check for all flows
      if (user && next['create-account'] !== 'skipped') {
        next['create-account'] = 'completed';
      }

      // Riot account check for flows that need it
      if (['duo', 'lft', 'matchups'].includes(focusedFlowId)) {
        if ((user?.riotAccountsCount || 0) > 0 && next['link-riot'] !== 'skipped') {
          next['link-riot'] = 'completed';
        }
      }

      // Discord + DM check for flows that need it
      if (['duo', 'lft'].includes(focusedFlowId)) {
        const hasDiscordAndDm = Boolean(profileSnapshot?.discordLinked && profileSnapshot?.discordDmNotifications);
        if (hasDiscordAndDm && next['link-discord'] !== 'skipped') {
          next['link-discord'] = 'completed';
        }
      }

      // Champion pool check for flows that need it
      if (['duo', 'lft', 'matchups'].includes(focusedFlowId)) {
        if (isChampionPoolConfigured(profileSnapshot) && next['champion-pool'] !== 'skipped') {
          next['champion-pool'] = 'completed';
        }
      }

      if (focusedFlowId === 'team-invite') {
        if ((user?.riotAccountsCount || 0) > 0 && next['link-riot'] !== 'skipped') {
          next['link-riot'] = 'completed';
        }

        if (hasTeamInvite && teamSnapshots.some((team) => invitedTeamIds.has(team.id)) && next['join-invited-team'] !== 'skipped') {
          next['join-invited-team'] = 'completed';
        }
      }

      // Duo post creation check
      if (focusedFlowId === 'duo') {
        if ((profileSnapshot?.postsCount || 0) > 0 && next['create-post'] !== 'skipped') {
          next['create-post'] = 'completed';
        }
        if ((profileSnapshot?.messagesSentCount || profileSnapshot?.conversationsCount || 0) > 0 && next['send-first-message'] !== 'skipped') {
          next['send-first-message'] = 'completed';
        }
      }

      // LFT post creation check
      if (focusedFlowId === 'lft') {
        if (lftPostCount > 0 && next['create-post'] !== 'skipped') {
          next['create-post'] = 'completed';
        }
      }

      // Team management checks
      if (focusedFlowId === 'team-management') {
        if (hasTeam && next['create-roster'] !== 'skipped') {
          next['create-roster'] = 'completed';
        }
        if (hasManagedPlayerCount && next['add-players'] !== 'skipped') {
          next['add-players'] = 'completed';
        }
        if (hasTeamWebhook && next['link-discord-webhook'] !== 'skipped') {
          next['link-discord-webhook'] = 'completed';
        }
        if (hasValidTeamWebhook && next['send-test'] !== 'skipped') {
          next['send-test'] = 'completed';
        }
        if (hasUpcomingTeamEvents && next['schedule-event'] !== 'skipped') {
          next['schedule-event'] = 'completed';
        }
      }

      // Matchups checks
      if (focusedFlowId === 'matchups') {
        if (pathname === '/matchups/marketplace' && next['browse-marketplace'] !== 'skipped') {
          next['browse-marketplace'] = 'completed';
        }
        if (matchupSavedCount > 0 && next['add-to-library'] !== 'skipped') {
          next['add-to-library'] = 'completed';
        }
        if (matchupOwnedCount > 0 && next['create-matchup'] !== 'skipped') {
          next['create-matchup'] = 'completed';
        }
      }

      // Scrims checks
      if (focusedFlowId === 'scrims') {
        if (hasTeam && next['create-team'] !== 'skipped') {
          next['create-team'] = 'completed';
        }
        if (hasTeamWebhook && next['configure-scrim'] !== 'skipped') {
          next['configure-scrim'] = 'completed';
        }
        if ((scrimFeedCount > 0 || pathname === '/teams/scrims') && next['post-scrim'] !== 'skipped') {
          next['post-scrim'] = 'completed';
        }
        if (hasUpcomingTeamEvents && next['start-match'] !== 'skipped') {
          next['start-match'] = 'completed';
        }
      }

      // Community growth checks
      if (focusedFlowId === 'community-growth') {
        if (communityCount > 0 && next['link-discord-server'] !== 'skipped') {
          next['link-discord-server'] = 'completed';
        }
        if (communityCount > 0 && next['create-community'] !== 'skipped') {
          next['create-community'] = 'completed';
        }
        if (communityCount > 0 && pathname === '/communities/guide' && next['setup-forwarding'] !== 'skipped') {
          next['setup-forwarding'] = 'completed';
        }
      }

      return {
        ...prev,
        [focusedFlowId]: next,
      };
    });
  }, [focusedFlowId, lftPostsSnapshot, matchupCountSnapshot, profileSnapshot, router.pathname, scrimFeedSnapshot, teamDiscordSnapshot, teamInviteSnapshots, teamSnapshots, user]);

  // If a persisted flow exists and the user just authenticated, open the onboarding window automatically
  useEffect(() => {
    if (user && focusedFlowId) {
      setWindowOpen(true);
    }
  }, [user, focusedFlowId]);

  useEffect(() => {
    if (user && activeFlowIds.length === 0 && teamInviteSnapshots.length > 0) {
      setActiveFlowIds(['team-invite']);
      setFocusedFlowId('team-invite');
      setWindowOpen(true);
    }
  }, [activeFlowIds.length, setActiveFlowIds, setFocusedFlowId, teamInviteSnapshots.length, user]);

  // Calculate progress for each flow
  const flowProgressById = useMemo(() => {
    const result: Record<FlowId, number> = {
      duo: 0,
      lft: 0,
      'team-management': 0,
      matchups: 0,
      scrims: 0,
      'community-growth': 0,
      'team-invite': 0,
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

  const currentFlowSteps = focusedFlowId ? FLOW_STEPS[focusedFlowId] : [];
  const currentStepStatuses = focusedFlowId ? (flowStepStatuses[focusedFlowId] || {}) : {};

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
    setActiveFlowIds((prev) => {
      const next = [...prev.filter((existingFlowId) => existingFlowId !== flowId), flowId];
      return next.slice(-3);
    });
    setFocusedFlowId(flowId);
    setWindowOpen(true);
  }, []);

  const handleCloseOnboarding = useCallback(() => {
    setActiveFlowIds((prev) => {
      if (!focusedFlowId) return prev;
      const next = prev.filter((flowId) => flowId !== focusedFlowId);
      setFocusedFlowId(next[next.length - 1] || null);
      setWindowOpen(false);
      return next;
    });
  }, [focusedFlowId]);

  const handleToggleWindow = useCallback(() => {
    if (!focusedFlowId && activeFlowIds.length > 0) {
      setFocusedFlowId(activeFlowIds[activeFlowIds.length - 1]);
    }
    setWindowOpen((prev) => !prev);
  }, [activeFlowIds, focusedFlowId]);

  const value: OnboardingContextType = {
    activeFlowIds,
    activeFlowId: focusedFlowId,
    windowOpen,
    bubbleVisible: activeFlowIds.length > 0,
    flowProgressById,
    flowStepStatuses,
    currentFlow: focusedFlowId,
    currentFlowSteps,
    currentStepStatuses,
    profileSnapshot,
    teamInviteSnapshots,
    openFlow: handleOpenFlow,
    closeOnboarding: handleCloseOnboarding,
    toggleWindow: handleToggleWindow,
    setStepStatus,
    setActiveFlowId: (flowId: FlowId | null) => {
      if (!flowId) {
        setFocusedFlowId(null);
        return;
      }
      handleOpenFlow(flowId);
    },
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
