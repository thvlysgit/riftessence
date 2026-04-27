import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SEOHead from '@components/SEOHead';
import NoAccess from '@components/NoAccess';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import { useGlobalUI } from '@components/GlobalUI';
import { useRememberedTeamSelection } from '../../utils/useRememberedTeamSelection';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const ALL_REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
const MASTER_PLUS_RANKS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER']);
const SCRIM_FORMAT_OPTIONS = [
  { value: 'BO1', label: 'Regular BO1', fearless: false },
  { value: 'BO3', label: 'Regular BO3', fearless: false },
  { value: 'BO5', label: 'Regular BO5', fearless: false },
  { value: 'FEARLESS_BO1', label: 'Fearless BO1', fearless: true },
  { value: 'FEARLESS_BO3', label: 'Fearless BO3', fearless: true },
  { value: 'FEARLESS_BO5', label: 'Fearless BO5', fearless: true },
  { value: 'BLOCK', label: 'Fearless Block', fearless: true },
] as const;
const SCRIM_STATUSES = ['AVAILABLE', 'CANDIDATES', 'SETTLED'];
const MANAGEABLE_TEAM_ROLES = new Set(['OWNER', 'MANAGER', 'COACH']);
const RANKS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER', 'UNRANKED'];
const DIVISIONS = ['IV', 'III', 'II', 'I'];
const DRAFT_KEY = 'riftessence_scrim_finder_draft_v1';
const SCRIMS_EXPLAINER_VIDEO_URL = process.env.NEXT_PUBLIC_SCRIMS_EXPLAINER_VIDEO_URL || '';

interface TeamSummary {
  id: string;
  name: string;
  tag: string | null;
  region: string;
  myRole: string;
  isOwner: boolean;
}

interface TeamPrefillResponse {
  suggestedAverageRank: string | null;
  suggestedAverageDivision: string | null;
  suggestedStartTimesUtc: string[];
  defaultStartTimeUtc: string | null;
  generatedOpggMultisearchUrl: string | null;
  disclaimer: string;
}

interface ScrimFeedPost {
  id: string;
  teamId: string;
  teamName: string;
  teamTag: string | null;
  region: string;
  averageRank: string | null;
  averageDivision: string | null;
  averageLp: number | null;
  startTimeUtc: string;
  timezoneLabel: string | null;
  scrimFormat: string;
  opggMultisearchUrl: string | null;
  details: string | null;
  status: string;
  createdAt: string;
  canDelete: boolean;
  proposalStats: {
    pendingCount: number;
    delayedCount: number;
    acceptedCount: number;
    rejectedCount: number;
    autoRejectedCount: number;
    averageResponseMinutes: number | null;
  };
  myProposal: {
    id: string;
    status: string;
    createdAt: string;
    lowPriorityAt: string | null;
    proposerTeam: {
      id: string;
      name: string;
      tag: string | null;
    };
  } | null;
}

interface PendingScrimSeries {
  id: string;
  matchCode: string;
  matchCodeVersion: number;
  matchCodeRegeneratedAt: string | null;
  matchCodeRegeneratedByTeamId: string | null;
  lobbyCodeUsedAt: string | null;
  lobbyCodeUsedByUserId: string | null;
  scheduledAt: string;
  hostTeamId: string;
  guestTeamId: string;
  hostCreatesLobby: boolean;
  boGames: number | null;
  autoResultStatus: 'PENDING' | 'READY' | 'RUNNING' | 'CONFIRMED' | 'MANUAL_REQUIRED' | 'FAILED';
  autoResultReadyAt: string | null;
  autoResultAttempts: number;
  autoResultFailureReason: string | null;
  autoResultMatchId: string | null;
  resultSource: 'MANUAL_AGREEMENT' | 'AUTO_RIOT' | null;
  manualConflictCount: number;
  escalatedAt: string | null;
  hostTeam: {
    id: string;
    name: string;
    tag: string | null;
  };
  guestTeam: {
    id: string;
    name: string;
    tag: string | null;
  };
  firstReporterTeamId: string | null;
  firstReportedWinnerTeamId: string | null;
  myTeamIds: string[];
}

interface ScrimReviewCandidate {
  seriesId: string;
  matchCode: string;
  winnerTeamId: string;
  winnerConfirmedAt: string;
  scheduledAt: string;
  reviewerTeamId: string;
  targetTeamId: string;
  reviewerTeam: {
    id: string;
    name: string;
    tag: string | null;
  };
  targetTeam: {
    id: string;
    name: string;
    tag: string | null;
  };
}

type ResultDraft = {
  reportingTeamId: string;
  winnerTeamId: string;
};

type ReviewDraft = {
  politeness: number;
  punctuality: number;
  gameplay: number;
  message: string;
};

type PostForm = {
  averageRank: string;
  averageDivision: string;
  averageLp: string;
  startLocalTime: string;
  scrimFormat: string;
  opggMultisearchUrl: string;
  details: string;
};

type ProposalForm = {
  proposerTeamId: string;
  message: string;
};

function toLocalInputValue(isoUtc: string | null | undefined): string {
  if (!isoUtc) return '';
  const date = new Date(isoUtc);
  if (!Number.isFinite(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function nowLocalInputValue(): string {
  return toLocalInputValue(new Date().toISOString());
}

function toUtcIso(localDateTime: string): string | null {
  if (!localDateTime) return null;
  const date = new Date(localDateTime);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function formatLocalDateTime(isoUtc: string | null | undefined): string {
  if (!isoUtc) return 'Unknown';
  const date = new Date(isoUtc);
  if (!Number.isFinite(date.getTime())) return 'Unknown';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function toYoutubeEmbedUrl(rawUrl: string): string | null {
  const normalized = normalizeUrl(rawUrl || '');
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let videoId = '';

    if (hostname === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || '';
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      }
    }

    if (!videoId || !/^[A-Za-z0-9_-]{6,}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube.com/embed/${videoId}?rel=0`;
  } catch {
    return null;
  }
}

function isFearlessFormat(format: string | null | undefined): boolean {
  const normalized = String(format || '').toUpperCase();
  return normalized.startsWith('FEARLESS_') || normalized === 'BLOCK';
}

function formatLabel(format: string | null | undefined): string {
  const normalized = String(format || '').toUpperCase();
  if (normalized === 'FEARLESS_BO1') return 'Fearless BO1';
  if (normalized === 'FEARLESS_BO3') return 'Fearless BO3';
  if (normalized === 'FEARLESS_BO5') return 'Fearless BO5';
  if (normalized === 'BLOCK') return 'Fearless Block';
  if (normalized === 'BO1') return 'Regular BO1';
  if (normalized === 'BO3') return 'Regular BO3';
  if (normalized === 'BO5') return 'Regular BO5';
  return normalized || 'Unknown';
}

function statusColor(status: string): string {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'AVAILABLE') return '#22C55E';
  if (normalized === 'CANDIDATES') return '#F59E0B';
  if (normalized === 'SETTLED') return '#60A5FA';
  if (normalized === 'PENDING') return '#F59E0B';
  if (normalized === 'DELAYED') return '#8B5CF6';
  if (normalized === 'ACCEPTED') return '#22C55E';
  if (normalized === 'REJECTED' || normalized === 'AUTO_REJECTED') return '#EF4444';
  return '#9CA3AF';
}

function formatAverageRank(rank: string | null | undefined, division: string | null | undefined, lp?: number | string | null): string {
  if (!rank) return 'Unspecified';

  const normalizedRank = String(rank).toUpperCase();
  if (MASTER_PLUS_RANKS.has(normalizedRank)) {
    const numericLp = typeof lp === 'number' ? lp : Number.parseInt(String(lp || ''), 10);
    if (Number.isFinite(numericLp) && numericLp >= 0) {
      return `${rank} ${numericLp} LP`;
    }
    return rank;
  }

  return division ? `${rank} ${division}` : rank;
}

function rankAccent(rank: string | null | undefined): string {
  const normalized = String(rank || '').toUpperCase();
  if (normalized === 'CHALLENGER') return '#F59E0B';
  if (normalized === 'GRANDMASTER') return '#EF4444';
  if (normalized === 'MASTER') return '#A855F7';
  if (normalized === 'DIAMOND') return '#38BDF8';
  if (normalized === 'EMERALD') return '#10B981';
  if (normalized === 'PLATINUM') return '#14B8A6';
  if (normalized === 'GOLD') return '#FBBF24';
  if (normalized === 'SILVER') return '#CBD5E1';
  if (normalized === 'BRONZE') return '#B45309';
  if (normalized === 'IRON') return '#6B7280';
  return '#64748B';
}

function formatTeamLabel(team: { name: string; tag: string | null }): string {
  return team.tag ? `${team.name} [${team.tag}]` : team.name;
}

function formatAutoResultStatus(status: PendingScrimSeries['autoResultStatus']): { label: string; color: string } {
  if (status === 'READY') return { label: 'Auto-check scheduled', color: '#2563EB' };
  if (status === 'RUNNING') return { label: 'Auto-check running', color: '#F59E0B' };
  if (status === 'CONFIRMED') return { label: 'Auto-check confirmed winner', color: '#22C55E' };
  if (status === 'MANUAL_REQUIRED') return { label: 'Manual winner agreement required', color: '#EF4444' };
  if (status === 'FAILED') return { label: 'Auto-check failed', color: '#EF4444' };
  return { label: 'Awaiting auto-check scheduling', color: '#64748B' };
}

export default function TeamsScrimsPage() {
  const { user } = useAuth();
  const { showToast, confirm } = useGlobalUI();

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useRememberedTeamSelection(teams.map((team) => team.id));
  const [prefill, setPrefill] = useState<TeamPrefillResponse | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);

  const [postForm, setPostForm] = useState<PostForm>({
    averageRank: '',
    averageDivision: '',
    averageLp: '',
    startLocalTime: '',
    scrimFormat: 'BO3',
    opggMultisearchUrl: '',
    details: '',
  });

  const [feedPosts, setFeedPosts] = useState<ScrimFeedPost[]>([]);
  const [pendingSeries, setPendingSeries] = useState<PendingScrimSeries[]>([]);
  const [reviewCandidates, setReviewCandidates] = useState<ScrimReviewCandidate[]>([]);

  const [feedLoading, setFeedLoading] = useState(true);
  const [pendingSeriesLoading, setPendingSeriesLoading] = useState(true);
  const [reviewCandidatesLoading, setReviewCandidatesLoading] = useState(true);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [resultSubmittingSeriesId, setResultSubmittingSeriesId] = useState<string | null>(null);
  const [regeneratingSeriesId, setRegeneratingSeriesId] = useState<string | null>(null);
  const [markingLobbySeriesId, setMarkingLobbySeriesId] = useState<string | null>(null);
  const [reviewSubmittingKey, setReviewSubmittingKey] = useState<string | null>(null);
  const [focusedMatchCodeSeriesId, setFocusedMatchCodeSeriesId] = useState<string | null>(null);
  const [hideWinnerAgreementQueue, setHideWinnerAgreementQueue] = useState(false);
  const [hidePostScrimReviews, setHidePostScrimReviews] = useState(false);

  const [activeProposalPostId, setActiveProposalPostId] = useState<string | null>(null);
  const [proposalForm, setProposalForm] = useState<ProposalForm>({
    proposerTeamId: '',
    message: '',
  });
  const [resultDrafts, setResultDrafts] = useState<Record<string, ResultDraft>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});

  const [filterRegion, setFilterRegion] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('AVAILABLE');
  const [filterFormat, setFilterFormat] = useState('ALL');
  const [filterFearless, setFilterFearless] = useState<'ALL' | 'REGULAR' | 'FEARLESS'>('ALL');
  const [regionPrefilled, setRegionPrefilled] = useState(false);

  const manageableTeams = useMemo(() => {
    return teams.filter((team) => team.isOwner || MANAGEABLE_TEAM_ROLES.has(team.myRole));
  }, [teams]);

  const selectedTeam = useMemo(() => manageableTeams.find((team) => team.id === selectedTeamId) || null, [manageableTeams, selectedTeamId]);
  const minimumStartLocalTime = useMemo(() => nowLocalInputValue(), []);
  const scrimsExplainerEmbedUrl = useMemo(() => toYoutubeEmbedUrl(SCRIMS_EXPLAINER_VIDEO_URL), []);

  const reviewPairKey = (candidate: Pick<ScrimReviewCandidate, 'reviewerTeamId' | 'targetTeamId'>): string => {
    return `${candidate.reviewerTeamId}::${candidate.targetTeamId}`;
  };

  const fetchTeams = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      const manageable = (data || []).filter((team: TeamSummary) => team.isOwner || MANAGEABLE_TEAM_ROLES.has(team.myRole));
      setTeams(manageable);
    } catch (error) {
      console.error('Failed to fetch teams for scrims page', error);
      showToast('Failed to fetch teams', 'error');
    }
  };

  const fetchFeed = async () => {
    const token = getAuthToken();
    if (!token) return;

    setFeedLoading(true);

    try {
      const query = new URLSearchParams();
      if (filterRegion !== 'ALL') query.set('region', filterRegion);
      if (filterStatus !== 'ALL') query.set('status', filterStatus);
      if (filterFormat !== 'ALL') query.set('format', filterFormat);
      if (filterFormat === 'ALL' && filterFearless !== 'ALL') query.set('fearless', filterFearless);

      const response = await fetch(`${API_URL}/api/scrims/posts?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch scrim feed');
      }

      setFeedPosts(payload.posts || []);
    } catch (error: any) {
      console.error('Failed to load scrim feed', error);
      showToast(error?.message || 'Failed to load scrim feed', 'error');
    } finally {
      setFeedLoading(false);
    }
  };

  const fetchPendingSeries = async () => {
    const token = getAuthToken();
    if (!token) return;

    setPendingSeriesLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/scrims/series/pending-results`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch pending scrim result confirmations');
      }

      const rows: PendingScrimSeries[] = payload.series || [];
      setPendingSeries(rows);
      setResultDrafts((prev) => {
        const next: Record<string, ResultDraft> = {};
        rows.forEach((entry) => {
          const existing = prev[entry.id];
          const defaultReportingTeamId = entry.myTeamIds?.[0] || '';
          const defaultWinnerTeamId = entry.firstReportedWinnerTeamId || entry.hostTeamId;
          next[entry.id] = {
            reportingTeamId: existing?.reportingTeamId || defaultReportingTeamId,
            winnerTeamId: existing?.winnerTeamId || defaultWinnerTeamId,
          };
        });
        return next;
      });
    } catch (error: any) {
      console.error('Failed to load pending scrim results', error);
      showToast(error?.message || 'Failed to load pending scrim results', 'error');
    } finally {
      setPendingSeriesLoading(false);
    }
  };

  const fetchReviewCandidates = async () => {
    const token = getAuthToken();
    if (!token) return;

    setReviewCandidatesLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/scrims/reviews/candidates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch review candidates');
      }

      const rows: ScrimReviewCandidate[] = payload.candidates || [];
      setReviewCandidates(rows);
      setReviewDrafts((prev) => {
        const next: Record<string, ReviewDraft> = {};
        rows.forEach((candidate) => {
          const key = reviewPairKey(candidate);
          next[key] = prev[key] || {
            politeness: 5,
            punctuality: 5,
            gameplay: 5,
            message: '',
          };
        });
        return next;
      });
    } catch (error: any) {
      console.error('Failed to load review candidates', error);
      showToast(error?.message || 'Failed to load review candidates', 'error');
    } finally {
      setReviewCandidatesLoading(false);
    }
  };

  const fetchPrefill = async (teamId: string) => {
    const token = getAuthToken();
    if (!token || !teamId) return;

    setPrefillLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/scrims/teams/${teamId}/prefill`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load team prefill');
      }

      setPrefill(payload);
      setPostForm((prev) => ({
        ...prev,
        averageRank: prev.averageRank || payload.suggestedAverageRank || '',
        averageDivision: prev.averageDivision || payload.suggestedAverageDivision || '',
        startLocalTime: prev.startLocalTime || toLocalInputValue(payload.defaultStartTimeUtc),
        opggMultisearchUrl: payload.generatedOpggMultisearchUrl || prev.opggMultisearchUrl || '',
      }));
    } catch (error: any) {
      console.error('Failed to load prefill', error);
      showToast(error?.message || 'Failed to load team prefill', 'error');
    } finally {
      setPrefillLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void fetchTeams();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    void fetchFeed();
    void fetchPendingSeries();
    void fetchReviewCandidates();
  }, [user?.id, filterRegion, filterStatus, filterFormat, filterFearless]);

  useEffect(() => {
    if (!user) return;

    const interval = window.setInterval(() => {
      void fetchPendingSeries();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    if (regionPrefilled) return;

    if (!user?.region || filterRegion !== 'ALL') {
      if (user?.region) {
        setRegionPrefilled(true);
      }
      return;
    }

    const normalized = String(user.region).toUpperCase();
    if (ALL_REGIONS.includes(normalized)) {
      setFilterRegion(normalized);
    }

    setRegionPrefilled(true);
  }, [user?.region, filterRegion, regionPrefilled]);

  useEffect(() => {
    if (!selectedTeamId) {
      setPrefill(null);
      return;
    }

    void fetchPrefill(selectedTeamId);
  }, [selectedTeamId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedRaw = window.localStorage.getItem(DRAFT_KEY);
      if (!savedRaw) return;
      const saved = JSON.parse(savedRaw) as { selectedTeamId?: string; postForm?: PostForm };
      if (saved.selectedTeamId) setSelectedTeamId(saved.selectedTeamId);
      if (saved.postForm) {
        setPostForm((prev) => ({ ...prev, ...saved.postForm }));
      }
    } catch (error) {
      console.warn('Could not restore Scrim Finder draft', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        selectedTeamId,
        postForm,
      }));
    } catch {
      // Ignore write failures.
    }
  }, [selectedTeamId, postForm]);

  const handleCreatePost = async (event: React.FormEvent) => {
    event.preventDefault();

    const token = getAuthToken();
    if (!token) return;

    if (!selectedTeamId) {
      showToast('Select a team first', 'error');
      return;
    }

    if (!postForm.startLocalTime) {
      showToast('Start date/time is required', 'error');
      return;
    }

    const startTimeUtc = toUtcIso(postForm.startLocalTime);
    if (!startTimeUtc) {
      showToast('Invalid date/time', 'error');
      return;
    }

    if (new Date(startTimeUtc).getTime() < Date.now()) {
      showToast('Start time cannot be in the past', 'error');
      return;
    }

    setPostSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/scrims/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamId: selectedTeamId,
          averageRank: postForm.averageRank || null,
          averageDivision: postForm.averageDivision || null,
          averageLp: MASTER_PLUS_RANKS.has(postForm.averageRank) && postForm.averageLp !== ''
            ? Number.parseInt(postForm.averageLp, 10)
            : null,
          startTimeUtc,
          timezoneLabel: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
          scrimFormat: postForm.scrimFormat,
          opggMultisearchUrl: normalizeUrl(postForm.opggMultisearchUrl),
          details: postForm.details.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to publish scrim post');
      }

      const shouldCreateSchedule = await confirm({
        title: 'Create Schedule Event?',
        message: 'Do you want to create a 50-minute Team Schedule event for this scrim slot?',
        confirmText: 'Create Event',
        cancelText: 'Skip',
      });

      if (shouldCreateSchedule) {
        const scheduleResponse = await fetch(`${API_URL}/api/teams/${selectedTeamId}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: 'Scrim Finder Slot',
            type: 'SCRIM',
            description: postForm.details.trim() || 'Created from Scrim Finder post.',
            scheduledAt: startTimeUtc,
            duration: 50,
            enemyMultigg: normalizeUrl(postForm.opggMultisearchUrl),
          }),
        });

        if (!scheduleResponse.ok) {
          const schedulePayload = await scheduleResponse.json().catch(() => ({}));
          showToast(schedulePayload.error || 'Scrim post published but schedule event creation failed', 'info');
        } else {
          showToast('Scrim post published and schedule event created', 'success');
        }
      } else {
        showToast('Scrim post published without creating a schedule event', 'success');
      }

      setPostForm((prev) => ({
        ...prev,
        details: '',
      }));
      await fetchFeed();
    } catch (error: any) {
      console.error('Failed to publish scrim post', error);
      showToast(error?.message || 'Failed to publish scrim post', 'error');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleSubmitProposal = async (post: ScrimFeedPost) => {
    const token = getAuthToken();
    if (!token) return;

    if (!proposalForm.proposerTeamId) {
      showToast('Select your proposing team', 'error');
      return;
    }

    setProposalSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/scrims/posts/${post.id}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          proposerTeamId: proposalForm.proposerTeamId,
          message: proposalForm.message.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send scrim proposal');
      }

      showToast('Proposal sent', 'success');
      setActiveProposalPostId(null);
      setProposalForm({ proposerTeamId: '', message: '' });
      await fetchFeed();
    } catch (error: any) {
      console.error('Failed to send proposal', error);
      showToast(error?.message || 'Failed to send proposal', 'error');
    } finally {
      setProposalSubmitting(false);
    }
  };

  const handleDeletePost = async (post: ScrimFeedPost) => {
    const token = getAuthToken();
    if (!token) return;

    const confirmed = await confirm({
      title: 'Delete Scrim Post?',
      message: `This will remove ${post.teamName}'s listing and all related pending proposals.`,
      confirmText: 'Delete Post',
      cancelText: 'Cancel',
    });

    if (!confirmed) {
      return;
    }

    setDeletingPostId(post.id);

    try {
      const response = await fetch(`${API_URL}/api/scrims/posts/${post.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete scrim post');
      }

      showToast('Scrim post deleted', 'success');
      await fetchFeed();
    } catch (error: any) {
      console.error('Failed to delete scrim post', error);
      showToast(error?.message || 'Failed to delete scrim post', 'error');
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleReportResult = async (seriesId: string) => {
    const token = getAuthToken();
    if (!token) return;

    const draft = resultDrafts[seriesId];
    if (!draft?.reportingTeamId || !draft?.winnerTeamId) {
      showToast('Choose a reporting team and winner team', 'error');
      return;
    }

    setResultSubmittingSeriesId(seriesId);

    try {
      const response = await fetch(`${API_URL}/api/scrims/series/${seriesId}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportingTeamId: draft.reportingTeamId,
          winnerTeamId: draft.winnerTeamId,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409 && payload?.support?.required && payload?.support?.url) {
          throw new Error(`${payload.error} Support: ${payload.support.url}`);
        }
        throw new Error(payload.error || 'Failed to submit result');
      }

      const status = payload?.result?.status || 'PENDING_CONFIRMATION';
      if (status === 'CONFIRMED') {
        const source = payload?.result?.resultSource;
        showToast(source === 'AUTO_RIOT' ? 'Result auto-confirmed from Riot history' : 'Result confirmed by both teams', 'success');
      } else {
        showToast('Result submitted. Waiting for opponent confirmation.', 'info');
      }

      await Promise.all([
        fetchPendingSeries(),
        fetchReviewCandidates(),
      ]);
    } catch (error: any) {
      console.error('Failed to submit scrim result', error);
      showToast(error?.message || 'Failed to submit scrim result', 'error');
    } finally {
      setResultSubmittingSeriesId(null);
    }
  };

  const handleRegenerateMatchCode = async (series: PendingScrimSeries) => {
    const token = getAuthToken();
    if (!token) return;

    setRegeneratingSeriesId(series.id);

    try {
      const response = await fetch(`${API_URL}/api/scrims/series/${series.id}/match-code/regenerate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to regenerate match code');
      }

      showToast('Match code regenerated and sent to both teams', 'success');
      setFocusedMatchCodeSeriesId(series.id);
      await fetchPendingSeries();
    } catch (error: any) {
      console.error('Failed to regenerate match code', error);
      showToast(error?.message || 'Failed to regenerate match code', 'error');
    } finally {
      setRegeneratingSeriesId(null);
    }
  };

  const handleMarkLobbyCreated = async (series: PendingScrimSeries) => {
    const token = getAuthToken();
    if (!token) return;

    setMarkingLobbySeriesId(series.id);

    try {
      const response = await fetch(`${API_URL}/api/scrims/series/${series.id}/lobby-code-used`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to record lobby creation');
      }

      showToast('Lobby creation recorded. This helps trust support review if needed.', 'success');
      await fetchPendingSeries();
    } catch (error: any) {
      console.error('Failed to record lobby creation', error);
      showToast(error?.message || 'Failed to record lobby creation', 'error');
    } finally {
      setMarkingLobbySeriesId(null);
    }
  };

  const handleSubmitReview = async (candidate: ScrimReviewCandidate) => {
    const token = getAuthToken();
    if (!token) return;

    const key = reviewPairKey(candidate);
    const draft = reviewDrafts[key];
    if (!draft) {
      showToast('Review draft is missing', 'error');
      return;
    }

    setReviewSubmittingKey(key);

    try {
      const response = await fetch(`${API_URL}/api/scrims/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          seriesId: candidate.seriesId,
          reviewerTeamId: candidate.reviewerTeamId,
          targetTeamId: candidate.targetTeamId,
          politeness: draft.politeness,
          punctuality: draft.punctuality,
          gameplay: draft.gameplay,
          message: draft.message.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to submit review');
      }

      showToast('Review submitted', 'success');
      await fetchReviewCandidates();
    } catch (error: any) {
      console.error('Failed to submit scrim review', error);
      showToast(error?.message || 'Failed to submit review', 'error');
    } finally {
      setReviewSubmittingKey(null);
    }
  };

  const proposalEligibleTeams = useMemo(() => {
    if (!activeProposalPostId) return manageableTeams;
    const post = feedPosts.find((entry) => entry.id === activeProposalPostId);
    if (!post) return manageableTeams;
    return manageableTeams.filter((team) => team.id !== post.teamId);
  }, [activeProposalPostId, manageableTeams, feedPosts]);

  const feedSummary = useMemo(() => {
    return {
      total: feedPosts.length,
      available: feedPosts.filter((post) => post.status === 'AVAILABLE').length,
      candidates: feedPosts.filter((post) => post.status === 'CANDIDATES').length,
    };
  }, [feedPosts]);

  const focusedMatchCodeSeries = useMemo(() => {
    if (!focusedMatchCodeSeriesId) return null;
    return pendingSeries.find((series) => series.id === focusedMatchCodeSeriesId) || null;
  }, [focusedMatchCodeSeriesId, pendingSeries]);

  const focusedSeriesHostManaged = useMemo(() => {
    if (!focusedMatchCodeSeries) return false;
    return focusedMatchCodeSeries.myTeamIds.includes(focusedMatchCodeSeries.hostTeamId);
  }, [focusedMatchCodeSeries]);

  const focusedSeriesAutoResultMeta = useMemo(() => {
    if (!focusedMatchCodeSeries) return null;
    return formatAutoResultStatus(focusedMatchCodeSeries.autoResultStatus);
  }, [focusedMatchCodeSeries]);

  const copyMatchCode = async (matchCode: string) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }

      await navigator.clipboard.writeText(matchCode);
      showToast('Match code copied to clipboard', 'success');
    } catch {
      showToast('Could not copy match code automatically. Copy it manually from the popup.', 'info');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (focusedMatchCodeSeriesId) return;
    if (pendingSeries.length === 0) return;

    const candidate = pendingSeries[0];
    const marker = `${candidate.matchCode}::${candidate.matchCodeVersion}`;
    const seenKey = `riftessence_scrim_popup_seen_${candidate.id}`;
    const seenMarker = window.localStorage.getItem(seenKey);
    if (seenMarker === marker) {
      return;
    }

    window.localStorage.setItem(seenKey, marker);
    setFocusedMatchCodeSeriesId(candidate.id);
  }, [pendingSeries, focusedMatchCodeSeriesId]);

  useEffect(() => {
    if (!focusedMatchCodeSeriesId) return;
    const stillExists = pendingSeries.some((series) => series.id === focusedMatchCodeSeriesId);
    if (!stillExists) {
      setFocusedMatchCodeSeriesId(null);
    }
  }, [focusedMatchCodeSeriesId, pendingSeries]);

  if (!user) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-5xl mx-auto">
          <NoAccess action="view" showButtons={true} />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Teams Scrim Finder"
        description="Publish team scrim availability, filter opponents, and manage proposals with timezone-adaptive scheduling."
        path="/teams/scrims"
        keywords="scrim finder, league scrims, teams scrims, esports scheduling"
      />

      <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-6xl mx-auto space-y-6">
          <header
            className="border rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(120deg, var(--color-bg-secondary) 0%, rgba(59, 130, 246, 0.12) 58%, rgba(251, 191, 36, 0.1) 100%)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.24) 0%, transparent 72%)' }} />
            <div className="absolute -left-12 bottom-0 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 72%)' }} />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  RiftEssence Team Matchmaking
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold mt-1" style={{ color: 'var(--color-accent-1)' }}>
                  Teams Scrim Finder
                </h1>
                <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Publish availability, evaluate opponents quickly, and decide proposals from Notifications or Discord.
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Start time is saved once in UTC and automatically rendered in each viewer&apos;s local timezone.
                </p>
              </div>

              <Link
                href="/teams/dashboard"
                className="px-4 py-2.5 rounded-lg font-semibold border transition-all hover:opacity-85"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                Back to Teams Dashboard
              </Link>
            </div>

            <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-lg px-3 py-2 border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Live Posts</p>
                <p className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>{feedSummary.total}</p>
              </div>
              <div className="rounded-lg px-3 py-2 border" style={{ borderColor: 'rgba(34,197,94,0.45)', backgroundColor: 'rgba(34,197,94,0.12)' }}>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: '#4ADE80' }}>Available</p>
                <p className="text-xl font-extrabold" style={{ color: '#22C55E' }}>{feedSummary.available}</p>
              </div>
              <div className="rounded-lg px-3 py-2 border" style={{ borderColor: 'rgba(251,191,36,0.45)', backgroundColor: 'rgba(251,191,36,0.12)' }}>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: '#FCD34D' }}>In Consideration</p>
                <p className="text-xl font-extrabold" style={{ color: '#F59E0B' }}>{feedSummary.candidates}</p>
              </div>
            </div>
          </header>

          <section
            className="border rounded-2xl p-5"
            style={{
              background: 'linear-gradient(155deg, var(--color-bg-secondary) 0%, rgba(14,165,233,0.09) 100%)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>How Scrim Finder Works</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  A quick tutorial video will be available soon to explain host ownership, match code flow, and winner agreement.
                </p>
              </div>
            </div>

            {scrimsExplainerEmbedUrl ? (
              <div className="mt-4 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
                <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src={scrimsExplainerEmbedUrl}
                    title="Scrim Finder explainer"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div
                className="mt-4 rounded-xl border p-4"
                style={{ borderColor: 'rgba(14,165,233,0.45)', backgroundColor: 'rgba(14,165,233,0.1)' }}
              >
                <p className="text-sm font-semibold" style={{ color: '#7DD3FC' }}>
                  Tutorial coming soon
                </p>
                <p className="text-xs mt-1" style={{ color: '#BAE6FD' }}>
                  This section will automatically show the explainer once NEXT_PUBLIC_SCRIMS_EXPLAINER_VIDEO_URL is configured.
                </p>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section
              className="xl:col-span-1 border p-5 rounded-2xl"
              style={{
                background: 'linear-gradient(160deg, var(--color-bg-secondary) 0%, rgba(59, 130, 246, 0.08) 100%)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Publish Scrim Availability</h2>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                After publishing, you will be asked whether to create a schedule event.
              </p>

              <form className="space-y-4" onSubmit={handleCreatePost}>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Team
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(event) => setSelectedTeamId(event.target.value)}
                    className="w-full px-3 py-2 rounded border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="">Select team</option>
                    {manageableTeams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}{team.tag ? ` [${team.tag}]` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Average Rank
                    </label>
                    <select
                      value={postForm.averageRank}
                      onChange={(event) => setPostForm((prev) => ({
                        ...prev,
                        averageRank: event.target.value,
                        averageDivision: MASTER_PLUS_RANKS.has(event.target.value) || event.target.value === 'UNRANKED'
                          ? ''
                          : prev.averageDivision,
                        averageLp: MASTER_PLUS_RANKS.has(event.target.value) ? prev.averageLp : '',
                      }))}
                      className="w-full px-3 py-2 rounded border"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="">Select</option>
                      {RANKS.map((rank) => (
                        <option key={rank} value={rank}>{rank}</option>
                      ))}
                    </select>
                  </div>
                  {MASTER_PLUS_RANKS.has(postForm.averageRank) ? (
                    <div>
                      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        LP
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        step={1}
                        value={postForm.averageLp}
                        onChange={(event) => setPostForm((prev) => ({ ...prev, averageLp: event.target.value }))}
                        className="w-full px-3 py-2 rounded border"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                        placeholder="e.g. 350"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Division
                      </label>
                      <select
                        value={postForm.averageDivision}
                        disabled={!postForm.averageRank || postForm.averageRank === 'UNRANKED'}
                        onChange={(event) => setPostForm((prev) => ({ ...prev, averageDivision: event.target.value }))}
                        className="w-full px-3 py-2 rounded border disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        <option value="">-</option>
                        {DIVISIONS.map((division) => (
                          <option key={division} value={division}>{division}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className="rounded-xl px-3 py-2 border"
                    style={{
                      borderColor: 'rgba(59,130,246,0.45)',
                      background: 'linear-gradient(145deg, rgba(59,130,246,0.18), rgba(30,64,175,0.08))',
                    }}
                  >
                    <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#93C5FD' }}>
                      Start Time Focus
                    </p>
                    <p className="text-sm font-extrabold mt-1" style={{ color: '#DBEAFE' }}>
                      {postForm.startLocalTime ? formatLocalDateTime(toUtcIso(postForm.startLocalTime)) : 'Pick a start slot'}
                    </p>
                  </div>
                  <div
                    className="rounded-xl px-3 py-2 border"
                    style={{
                      borderColor: `${rankAccent(postForm.averageRank)}77`,
                      background: `linear-gradient(145deg, ${rankAccent(postForm.averageRank)}2B, rgba(15,23,42,0.08))`,
                    }}
                  >
                    <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                      Average Rank Focus
                    </p>
                    <p className="text-sm font-extrabold mt-1" style={{ color: rankAccent(postForm.averageRank) }}>
                      {formatAverageRank(postForm.averageRank, postForm.averageDivision, postForm.averageLp)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Start (local time)
                    </label>
                    <input
                      type="datetime-local"
                      min={minimumStartLocalTime}
                      value={postForm.startLocalTime}
                      onChange={(event) => setPostForm((prev) => ({ ...prev, startLocalTime: event.target.value }))}
                      className="w-full px-3 py-2 rounded border"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Format
                    </label>
                    <select
                      value={postForm.scrimFormat}
                      onChange={(event) => setPostForm((prev) => ({ ...prev, scrimFormat: event.target.value }))}
                      className="w-full px-3 py-2 rounded border"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {SCRIM_FORMAT_OPTIONS.map((format) => (
                        <option key={format.value} value={format.value}>{format.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                    OP.GG multisearch URL
                  </label>
                  <input
                    type="text"
                    value={postForm.opggMultisearchUrl}
                    onChange={(event) => setPostForm((prev) => ({ ...prev, opggMultisearchUrl: event.target.value }))}
                    placeholder="https://www.op.gg/multisearch/..."
                    className="w-full px-3 py-2 rounded border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {prefill?.disclaimer || 'Verify generated accounts manually before posting.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Notes
                  </label>
                  <textarea
                    value={postForm.details}
                    onChange={(event) => setPostForm((prev) => ({ ...prev, details: event.target.value }))}
                    rows={4}
                    placeholder="Any expectations, constraints, or extra context..."
                    className="w-full px-3 py-2 rounded border resize-y"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={postSubmitting || !selectedTeam}
                  className="w-full py-2.5 rounded font-bold transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  {postSubmitting ? 'Publishing...' : 'Publish Scrim Post'}
                </button>
              </form>

              {prefillLoading && (
                <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>Loading team prefill...</p>
              )}
              {!prefillLoading && ((prefill?.suggestedStartTimesUtc?.length || 0) > 0) && (
                <div className="mt-4 p-3 rounded border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Suggested start windows</p>
                  <div className="flex flex-wrap gap-2">
                    {(prefill?.suggestedStartTimesUtc || []).slice(0, 3).map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setPostForm((prev) => ({ ...prev, startLocalTime: toLocalInputValue(slot) }))}
                        className="text-xs px-2 py-1 rounded border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      >
                        {formatLocalDateTime(slot)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="xl:col-span-2 space-y-6">
              <div
                className="border p-4 rounded-2xl"
                style={{
                  background: 'linear-gradient(150deg, var(--color-bg-secondary) 0%, rgba(16, 185, 129, 0.08) 100%)',
                  borderColor: 'var(--color-border)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold mr-auto" style={{ color: 'var(--color-text-primary)' }}>Scrim Feed</h2>

                  <span className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    {feedSummary.total} listings
                  </span>

                  <select
                    value={filterRegion}
                    onChange={(event) => setFilterRegion(event.target.value)}
                    className="px-3 py-2 rounded border text-sm"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="ALL">All regions</option>
                    {ALL_REGIONS.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(event) => setFilterStatus(event.target.value)}
                    className="px-3 py-2 rounded border text-sm"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="ALL">Any status</option>
                    {SCRIM_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>

                  <select
                    value={filterFormat}
                    onChange={(event) => setFilterFormat(event.target.value)}
                    className="px-3 py-2 rounded border text-sm"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="ALL">Any format</option>
                    {SCRIM_FORMAT_OPTIONS.map((format) => (
                      <option key={format.value} value={format.value}>{format.label}</option>
                    ))}
                  </select>

                  <select
                    value={filterFearless}
                    onChange={(event) => setFilterFearless(event.target.value as 'ALL' | 'REGULAR' | 'FEARLESS')}
                    className="px-3 py-2 rounded border text-sm"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="ALL">All drafting styles</option>
                    <option value="REGULAR">Regular BO only</option>
                    <option value="FEARLESS">Fearless only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section
                  className="border rounded-2xl p-4"
                  style={{
                    background: 'linear-gradient(145deg, var(--color-bg-secondary) 0%, rgba(37,99,235,0.1) 100%)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Winner Agreement Queue</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                        {pendingSeries.length} pending
                      </span>
                      <button
                        type="button"
                        onClick={() => setHideWinnerAgreementQueue((prev) => !prev)}
                        className="text-xs px-2 py-1 rounded-full border font-semibold"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                      >
                        {hideWinnerAgreementQueue ? 'Show' : 'Hide'}
                      </button>
                    </div>
                  </div>

                  <div
                    className="rounded-xl border p-3 mb-3"
                    style={{
                      borderColor: 'rgba(59,130,246,0.4)',
                      background: 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(15,23,42,0.22))',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: '#BFDBFE' }}>
                      Match Code + Winner Agreement
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#DBEAFE' }}>
                      Host team (the original scrim post) creates and can regenerate the lobby code. Opponent receives updates automatically. Winner agreement remains the fallback path.
                    </p>
                  </div>

                  {hideWinnerAgreementQueue ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Winner agreement queue is hidden for this session. Click Show to reopen.
                    </p>
                  ) : pendingSeriesLoading ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading pending scrim result confirmations...</p>
                  ) : pendingSeries.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No pending result agreements right now.</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingSeries.map((series) => {
                        const draft = resultDrafts[series.id] || {
                          reportingTeamId: series.myTeamIds?.[0] || '',
                          winnerTeamId: series.firstReportedWinnerTeamId || series.hostTeamId,
                        };
                        const iAmHost = series.myTeamIds.includes(series.hostTeamId);
                        const resolvedWinnerTeamId = draft.winnerTeamId === series.guestTeamId ? series.guestTeamId : series.hostTeamId;
                        const loserTeamId = resolvedWinnerTeamId === series.hostTeamId ? series.guestTeamId : series.hostTeamId;
                        const winnerTeam = resolvedWinnerTeamId === series.hostTeamId ? series.hostTeam : series.guestTeam;
                        const loserTeam = loserTeamId === series.hostTeamId ? series.hostTeam : series.guestTeam;
                        const autoResultMeta = formatAutoResultStatus(series.autoResultStatus);
                        const firstReporterLabel = series.firstReporterTeamId === series.guestTeamId
                          ? formatTeamLabel(series.guestTeam)
                          : formatTeamLabel(series.hostTeam);
                        const firstWinnerLabel = series.firstReportedWinnerTeamId === series.guestTeamId
                          ? formatTeamLabel(series.guestTeam)
                          : formatTeamLabel(series.hostTeam);

                        return (
                          <div
                            key={series.id}
                            className="rounded-xl border p-3"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}
                          >
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {formatTeamLabel(series.hostTeam)} vs {formatTeamLabel(series.guestTeam)}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                              Scheduled {formatLocalDateTime(series.scheduledAt)}
                            </p>

                            <div className="mt-2 rounded-lg border p-2.5" style={{ borderColor: 'rgba(37,99,235,0.45)', backgroundColor: 'rgba(37,99,235,0.12)' }}>
                              <p className="text-xs font-semibold" style={{ color: '#BFDBFE' }}>
                                Host team (original scrim post): {formatTeamLabel(series.hostTeam)}
                              </p>
                              <p className="text-[11px] mt-1" style={{ color: '#DBEAFE' }}>
                                Host creates the lobby with the current match code. Opponent joins with the same code.
                              </p>
                            </div>

                            <div className="mt-2 rounded-lg border p-2.5" style={{ borderColor: `${autoResultMeta.color}66`, backgroundColor: `${autoResultMeta.color}22` }}>
                              <p className="text-xs font-semibold" style={{ color: autoResultMeta.color }}>
                                {autoResultMeta.label}
                              </p>
                              {series.autoResultReadyAt && (
                                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                  First automated scan target: {formatLocalDateTime(series.autoResultReadyAt)}
                                  {series.boGames ? ` (${series.boGames}h after start for BO${series.boGames})` : ''}
                                </p>
                              )}
                              {series.autoResultFailureReason && (
                                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                  {series.autoResultFailureReason}
                                </p>
                              )}
                            </div>

                            <div
                              className="mt-2 rounded-lg border p-3"
                              style={{
                                borderColor: 'rgba(59,130,246,0.45)',
                                background: 'linear-gradient(145deg, rgba(59,130,246,0.14), rgba(30,64,175,0.08))',
                              }}
                            >
                              <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#BFDBFE' }}>
                                Match Code
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span
                                  className="px-2.5 py-1 rounded-md border text-sm font-extrabold tracking-wide"
                                  style={{
                                    borderColor: 'rgba(147,197,253,0.45)',
                                    backgroundColor: 'rgba(15,23,42,0.35)',
                                    color: '#DBEAFE',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                  }}
                                >
                                  {series.matchCode}
                                </span>
                                <span className="text-[11px] font-semibold px-2 py-1 rounded border" style={{ borderColor: 'rgba(191,219,254,0.35)', color: '#BFDBFE' }}>
                                  v{series.matchCodeVersion}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void copyMatchCode(series.matchCode)}
                                  className="px-2.5 py-1 rounded-md text-xs font-semibold border"
                                  style={{ borderColor: 'rgba(147,197,253,0.45)', color: '#BFDBFE' }}
                                >
                                  Copy code
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFocusedMatchCodeSeriesId(series.id)}
                                  className="px-2.5 py-1 rounded-md text-xs font-semibold border"
                                  style={{ borderColor: 'rgba(191,219,254,0.45)', color: '#DBEAFE' }}
                                >
                                  Open popup
                                </button>
                              </div>
                              {series.matchCodeRegeneratedAt && (
                                <p className="text-[11px] mt-2" style={{ color: '#BFDBFE' }}>
                                  Last regenerated: {formatLocalDateTime(series.matchCodeRegeneratedAt)}
                                </p>
                              )}
                              {series.lobbyCodeUsedAt && (
                                <p className="text-[11px] mt-1" style={{ color: '#86EFAC' }}>
                                  Host confirmed lobby created with app code at {formatLocalDateTime(series.lobbyCodeUsedAt)}.
                                </p>
                              )}
                              <p className="text-[11px] mt-2" style={{ color: '#BFDBFE' }}>
                                You can create the game with this code, or directly agree on winner and loser below.
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={!iAmHost || regeneratingSeriesId === series.id}
                                  onClick={() => void handleRegenerateMatchCode(series)}
                                  className="px-2.5 py-1 rounded-md text-xs font-semibold border disabled:opacity-50"
                                  style={{ borderColor: 'rgba(245,158,11,0.6)', color: '#FCD34D' }}
                                >
                                  {regeneratingSeriesId === series.id ? 'Regenerating...' : 'Host: Regenerate Code'}
                                </button>
                                <button
                                  type="button"
                                  disabled={!iAmHost || markingLobbySeriesId === series.id}
                                  onClick={() => void handleMarkLobbyCreated(series)}
                                  className="px-2.5 py-1 rounded-md text-xs font-semibold border disabled:opacity-50"
                                  style={{ borderColor: 'rgba(34,197,94,0.6)', color: '#86EFAC' }}
                                >
                                  {markingLobbySeriesId === series.id ? 'Saving...' : 'Host: Mark Lobby Created'}
                                </button>
                              </div>
                              {!iAmHost && (
                                <p className="text-[11px] mt-2" style={{ color: '#FDE68A' }}>
                                  Waiting for host {formatTeamLabel(series.hostTeam)} to create and maintain the lobby code.
                                </p>
                              )}
                            </div>

                            {series.firstReporterTeamId && (
                              <p className="text-xs mt-1" style={{ color: '#F59E0B' }}>
                                First report: {firstReporterLabel} marked {firstWinnerLabel} as winner. Opponent confirmation required.
                              </p>
                            )}

                            <label className="mt-3 block text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                              Reporting Team
                            </label>
                            <select
                              value={draft.reportingTeamId}
                              onChange={(event) => setResultDrafts((prev) => ({
                                ...prev,
                                [series.id]: {
                                  ...draft,
                                  reportingTeamId: event.target.value,
                                },
                              }))}
                              className="mt-1 w-full px-3 py-2 rounded border text-sm"
                              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            >
                              <option value="">Choose reporting team</option>
                              {series.myTeamIds.map((teamId) => {
                                const label = teamId === series.hostTeamId ? formatTeamLabel(series.hostTeam) : formatTeamLabel(series.guestTeam);
                                return (
                                  <option key={teamId} value={teamId}>{label}</option>
                                );
                              })}
                            </select>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                              <div
                                className="rounded-lg border p-3"
                                style={{
                                  borderColor: 'rgba(34,197,94,0.45)',
                                  background: 'linear-gradient(145deg, rgba(34,197,94,0.15), rgba(15,23,42,0.12))',
                                }}
                              >
                                <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#86EFAC' }}>
                                  Winner Section
                                </p>
                                <p className="text-xs mt-1" style={{ color: '#BBF7D0' }}>
                                  Select the team that won.
                                </p>
                                <div className="mt-2 grid grid-cols-1 gap-2">
                                  {[series.hostTeam, series.guestTeam].map((team) => {
                                    const isSelected = resolvedWinnerTeamId === team.id;
                                    return (
                                      <button
                                        key={team.id}
                                        type="button"
                                        onClick={() => setResultDrafts((prev) => ({
                                          ...prev,
                                          [series.id]: {
                                            ...draft,
                                            winnerTeamId: team.id,
                                          },
                                        }))}
                                        className="px-3 py-2 rounded-md border text-sm text-left font-semibold"
                                        style={{
                                          borderColor: isSelected ? 'rgba(34,197,94,0.7)' : 'var(--color-border)',
                                          backgroundColor: isSelected ? 'rgba(34,197,94,0.2)' : 'var(--color-bg-secondary)',
                                          color: isSelected ? '#DCFCE7' : 'var(--color-text-primary)',
                                        }}
                                      >
                                        {formatTeamLabel(team)}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div
                                className="rounded-lg border p-3"
                                style={{
                                  borderColor: 'rgba(239,68,68,0.45)',
                                  background: 'linear-gradient(145deg, rgba(239,68,68,0.14), rgba(15,23,42,0.12))',
                                }}
                              >
                                <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#FCA5A5' }}>
                                  Loser Section
                                </p>
                                <p className="text-xs mt-1" style={{ color: '#FECACA' }}>
                                  Auto-filled from the selected winner.
                                </p>
                                <div
                                  className="mt-2 px-3 py-2 rounded-md border text-sm font-semibold"
                                  style={{
                                    borderColor: 'rgba(239,68,68,0.5)',
                                    backgroundColor: 'rgba(127,29,29,0.35)',
                                    color: '#FEE2E2',
                                  }}
                                >
                                  {formatTeamLabel(loserTeam)}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleReportResult(series.id)}
                              disabled={resultSubmittingSeriesId === series.id || !draft.reportingTeamId}
                              className="mt-3 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white' }}
                            >
                              {resultSubmittingSeriesId === series.id ? 'Submitting...' : `Submit Winner: ${formatTeamLabel(winnerTeam)}`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section
                  className="border rounded-2xl p-4"
                  style={{
                    background: 'linear-gradient(145deg, var(--color-bg-secondary) 0%, rgba(16,185,129,0.1) 100%)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Post-Scrim Reviews</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                        {reviewCandidates.length} available
                      </span>
                      <button
                        type="button"
                        onClick={() => setHidePostScrimReviews((prev) => !prev)}
                        className="text-xs px-2 py-1 rounded-full border font-semibold"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                      >
                        {hidePostScrimReviews ? 'Show' : 'Hide'}
                      </button>
                    </div>
                  </div>

                  {hidePostScrimReviews ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Post-scrim reviews are hidden for this session. Click Show to reopen.
                    </p>
                  ) : reviewCandidatesLoading ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading review candidates...</p>
                  ) : reviewCandidates.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No review candidates. Confirm winners first.</p>
                  ) : (
                    <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                      {reviewCandidates.map((candidate) => {
                        const key = reviewPairKey(candidate);
                        const draft = reviewDrafts[key] || {
                          politeness: 5,
                          punctuality: 5,
                          gameplay: 5,
                          message: '',
                        };

                        return (
                          <div
                            key={`${candidate.seriesId}-${key}`}
                            className="rounded-xl border p-3"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}
                          >
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {formatTeamLabel(candidate.reviewerTeam)} reviewing {formatTeamLabel(candidate.targetTeam)}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                              {candidate.matchCode} • Winner confirmed {formatLocalDateTime(candidate.winnerConfirmedAt)}
                            </p>

                            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                              {(['politeness', 'punctuality', 'gameplay'] as const).map((field) => (
                                <label key={field} className="flex flex-col gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                                  {field.charAt(0).toUpperCase() + field.slice(1)}
                                  <select
                                    value={draft[field]}
                                    onChange={(event) => setReviewDrafts((prev) => ({
                                      ...prev,
                                      [key]: {
                                        ...draft,
                                        [field]: Number(event.target.value),
                                      },
                                    }))}
                                    className="px-2 py-1.5 rounded border text-sm"
                                    style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                                  >
                                    {[1, 2, 3, 4, 5].map((value) => (
                                      <option key={value} value={value}>{value} Star{value > 1 ? 's' : ''}</option>
                                    ))}
                                  </select>
                                </label>
                              ))}
                            </div>

                            <textarea
                              value={draft.message}
                              onChange={(event) => setReviewDrafts((prev) => ({
                                ...prev,
                                [key]: {
                                  ...draft,
                                  message: event.target.value,
                                },
                              }))}
                              rows={2}
                              placeholder="Optional public comment about your scrim experience"
                              className="w-full mt-2 px-3 py-2 rounded border text-sm"
                              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            />

                            <button
                              type="button"
                              onClick={() => void handleSubmitReview(candidate)}
                              disabled={reviewSubmittingKey === key}
                              className="mt-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: 'white' }}
                            >
                              {reviewSubmittingKey === key ? 'Submitting...' : 'Publish Review'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <div className="space-y-4">
                {feedLoading ? (
                  <div className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Loading scrim feed...</div>
                ) : feedPosts.length === 0 ? (
                  <div className="border rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                    <p style={{ color: 'var(--color-text-secondary)' }}>No scrim posts match current filters.</p>
                  </div>
                ) : (
                  feedPosts.map((post) => {
                    const isProposalOpen = activeProposalPostId === post.id;
                    const rankColor = rankAccent(post.averageRank);
                    const postIsFearless = isFearlessFormat(post.scrimFormat);
                    const formatColor = postIsFearless ? '#F97316' : '#2563EB';
                    return (
                      <article
                        key={post.id}
                        className="border rounded-2xl p-5"
                        style={{
                          background: 'linear-gradient(160deg, var(--color-bg-secondary) 0%, rgba(15, 23, 42, 0.16) 100%)',
                          borderColor: 'var(--color-border)',
                          boxShadow: 'var(--shadow)',
                        }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                          <div>
                            <h3 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                              {post.teamName} {post.teamTag ? `[${post.teamTag}]` : ''}
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              {post.region} • {formatLabel(post.scrimFormat)} • posted {formatLocalDateTime(post.createdAt)}
                            </p>
                          </div>
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-semibold"
                            style={{ backgroundColor: `${statusColor(post.status)}22`, color: statusColor(post.status), border: `1px solid ${statusColor(post.status)}55` }}
                          >
                            {post.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          <div
                            className="rounded-xl p-3 border"
                            style={{
                              borderColor: 'rgba(59,130,246,0.45)',
                              background: 'linear-gradient(145deg, rgba(59,130,246,0.18), rgba(30,64,175,0.08))',
                            }}
                          >
                            <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#93C5FD' }}>
                              Start Time (Your Local)
                            </p>
                            <p className="text-lg font-extrabold mt-1" style={{ color: '#DBEAFE' }}>
                              {formatLocalDateTime(post.startTimeUtc)}
                            </p>
                            <p className="text-xs mt-1" style={{ color: '#BFDBFE' }}>
                              {post.timezoneLabel ? `Source TZ: ${post.timezoneLabel}` : 'Automatically localized for you'}
                            </p>
                          </div>

                          <div
                            className="rounded-xl p-3 border"
                            style={{
                              borderColor: `${rankColor}88`,
                              background: `linear-gradient(145deg, ${rankColor}2E, rgba(15,23,42,0.1))`,
                            }}
                          >
                            <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                              Average Rank Target
                            </p>
                            <p className="text-lg font-extrabold mt-1" style={{ color: rankColor }}>
                              {formatAverageRank(post.averageRank, post.averageDivision, post.averageLp)}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                              Format: {formatLabel(post.scrimFormat)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mb-4">
                          <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                            Pending {post.proposalStats.pendingCount} • Delayed {post.proposalStats.delayedCount}
                          </div>
                          <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                            Team avg response {post.proposalStats.averageResponseMinutes ? `${post.proposalStats.averageResponseMinutes} min` : 'No data'}
                          </div>
                          <div
                            className="rounded-lg border px-3 py-2"
                            style={{
                              borderColor: `${formatColor}88`,
                              backgroundColor: `${formatColor}20`,
                              color: formatColor,
                            }}
                          >
                            <span className="font-semibold">{postIsFearless ? 'Fearless' : 'Regular'} format</span>
                            <span style={{ color: 'var(--color-text-secondary)' }}> • {formatLabel(post.scrimFormat)}</span>
                          </div>
                        </div>

                        {post.details && (
                          <div className="rounded-lg border px-3 py-2.5 mb-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{post.details}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                          <Link
                            href={`/teams/${post.teamId}`}
                            className="px-3 py-2 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2 transition-all hover:opacity-85"
                            style={{ borderColor: 'rgba(148,163,184,0.45)', color: '#E2E8F0', background: 'linear-gradient(145deg, rgba(51,65,85,0.72), rgba(15,23,42,0.8))' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            Team Page
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveProposalPostId(isProposalOpen ? null : post.id);
                              setProposalForm((prev) => ({ ...prev, proposerTeamId: proposalEligibleTeams[0]?.id || prev.proposerTeamId || '' }));
                            }}
                            className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)', color: 'white', boxShadow: '0 10px 24px rgba(37,99,235,0.28)' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M7 17L17 7" />
                              <path d="M7 7h10v10" />
                            </svg>
                            Let&apos;s Scrim
                          </button>

                          {post.opggMultisearchUrl && (
                            <a
                              href={normalizeUrl(post.opggMultisearchUrl) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2 transition-all hover:opacity-85"
                              style={{ borderColor: 'rgba(16,185,129,0.5)', color: '#A7F3D0', background: 'linear-gradient(145deg, rgba(6,95,70,0.75), rgba(4,120,87,0.55))' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <path d="M15 3h6v6" />
                                <path d="M10 14L21 3" />
                              </svg>
                              OP.GG Scout
                            </a>
                          )}

                          {post.canDelete && (
                            <button
                              type="button"
                              onClick={() => void handleDeletePost(post)}
                              disabled={deletingPostId === post.id}
                              className="px-3 py-2 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2 disabled:opacity-50"
                              style={{ borderColor: 'rgba(239,68,68,0.5)', color: '#FCA5A5', background: 'linear-gradient(145deg, rgba(127,29,29,0.75), rgba(153,27,27,0.62))' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                              {deletingPostId === post.id ? 'Deleting...' : 'Delete Post'}
                            </button>
                          )}
                        </div>

                        {post.myProposal && (
                          <div className="mb-4 text-sm px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                            Your team proposal status: <strong style={{ color: statusColor(post.myProposal.status) }}>{post.myProposal.status}</strong>
                            {post.myProposal.status === 'DELAYED' && ' (marked as low-priority fallback)'}
                          </div>
                        )}

                        {isProposalOpen && (
                          <div className="mt-3 border rounded-xl p-3 space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              Send proposal
                            </p>

                            <select
                              value={proposalForm.proposerTeamId}
                              onChange={(event) => setProposalForm((prev) => ({ ...prev, proposerTeamId: event.target.value }))}
                              className="w-full px-3 py-2 rounded border text-sm"
                              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            >
                              <option value="">Choose your team</option>
                              {proposalEligibleTeams.map((team) => (
                                <option key={team.id} value={team.id}>{team.name}{team.tag ? ` [${team.tag}]` : ''}</option>
                              ))}
                            </select>

                            <textarea
                              value={proposalForm.message}
                              onChange={(event) => setProposalForm((prev) => ({ ...prev, message: event.target.value }))}
                              rows={3}
                              placeholder="Message for the target team"
                              className="w-full px-3 py-2 rounded border text-sm"
                              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            />

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleSubmitProposal(post)}
                                disabled={proposalSubmitting}
                                className="px-3 py-1.5 rounded-lg font-semibold text-sm"
                                style={{ backgroundColor: '#16A34A', color: 'white' }}
                              >
                                {proposalSubmitting ? 'Sending...' : 'Send Proposal'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveProposalPostId(null)}
                                className="px-3 py-1.5 rounded-lg font-semibold text-sm border"
                                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {focusedMatchCodeSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(2, 6, 23, 0.7)' }}>
          <div
            className="w-full max-w-xl rounded-2xl border p-5"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Scrim Match Code</h4>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatTeamLabel(focusedMatchCodeSeries.hostTeam)} vs {formatTeamLabel(focusedMatchCodeSeries.guestTeam)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFocusedMatchCodeSeriesId(null)}
                className="px-2 py-1 rounded border text-xs font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Close
              </button>
            </div>

            <div
              className="mt-4 rounded-xl border p-4 text-center"
              style={{
                borderColor: 'rgba(59,130,246,0.45)',
                background: 'linear-gradient(140deg, rgba(37,99,235,0.22), rgba(15,23,42,0.24))',
              }}
            >
              <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#BFDBFE' }}>Match Code</p>
              <p
                className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-wider"
                style={{ color: '#DBEAFE', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              >
                {focusedMatchCodeSeries.matchCode}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-1 rounded border" style={{ borderColor: 'rgba(191,219,254,0.4)', color: '#BFDBFE' }}>
                  Version v{focusedMatchCodeSeries.matchCodeVersion}
                </span>
                {focusedMatchCodeSeries.matchCodeRegeneratedAt && (
                  <span className="text-[11px]" style={{ color: '#BFDBFE' }}>
                    Last regen {formatLocalDateTime(focusedMatchCodeSeries.matchCodeRegeneratedAt)}
                  </span>
                )}
              </div>
            </div>

            {focusedSeriesAutoResultMeta && (
              <div
                className="mt-3 rounded-xl border p-3"
                style={{
                  borderColor: `${focusedSeriesAutoResultMeta.color}66`,
                  backgroundColor: `${focusedSeriesAutoResultMeta.color}22`,
                }}
              >
                <p className="text-xs font-semibold" style={{ color: focusedSeriesAutoResultMeta.color }}>
                  {focusedSeriesAutoResultMeta.label}
                </p>
                {focusedMatchCodeSeries.autoResultReadyAt && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    First Riot auto-check target: {formatLocalDateTime(focusedMatchCodeSeries.autoResultReadyAt)}
                    {focusedMatchCodeSeries.boGames ? ` (${focusedMatchCodeSeries.boGames}h after start)` : ''}
                  </p>
                )}
                {focusedMatchCodeSeries.autoResultFailureReason && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {focusedMatchCodeSeries.autoResultFailureReason}
                  </p>
                )}
                {(focusedMatchCodeSeries.autoResultAttempts || 0) > 0 && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Auto-check attempts: {focusedMatchCodeSeries.autoResultAttempts}
                    {focusedMatchCodeSeries.autoResultMatchId ? ` • Match ${focusedMatchCodeSeries.autoResultMatchId}` : ''}
                  </p>
                )}
                {focusedMatchCodeSeries.resultSource && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Last result source: {focusedMatchCodeSeries.resultSource === 'AUTO_RIOT' ? 'Riot auto-confirmation' : 'Manual team agreement'}
                  </p>
                )}
              </div>
            )}

            {focusedMatchCodeSeries.manualConflictCount > 0 && (
              <div
                className="mt-3 rounded-xl border p-3"
                style={{ borderColor: 'rgba(239,68,68,0.45)', backgroundColor: 'rgba(239,68,68,0.12)' }}
              >
                <p className="text-xs font-semibold" style={{ color: '#FCA5A5' }}>
                  Manual conflict count: {focusedMatchCodeSeries.manualConflictCount}
                </p>
                <p className="text-[11px] mt-1" style={{ color: '#FECACA' }}>
                  If disagreement repeats, the app escalates both teams to support with screenshot guidance.
                </p>
                {focusedMatchCodeSeries.escalatedAt && (
                  <p className="text-[11px] mt-1" style={{ color: '#FECACA' }}>
                    Escalated at {formatLocalDateTime(focusedMatchCodeSeries.escalatedAt)}.
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 space-y-2">
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                Option A: host team creates the game lobby with this code.
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                Option B: if scrim already happened, close this popup and submit winner plus loser agreement.
              </p>
              {focusedMatchCodeSeries.lobbyCodeUsedAt && (
                <p className="text-xs" style={{ color: '#86EFAC' }}>
                  Host confirmed app code usage at {formatLocalDateTime(focusedMatchCodeSeries.lobbyCodeUsedAt)}.
                </p>
              )}
            </div>

            <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Host Controls
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Only {formatTeamLabel(focusedMatchCodeSeries.hostTeam)} can regenerate code or mark lobby creation.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!focusedSeriesHostManaged || regeneratingSeriesId === focusedMatchCodeSeries.id}
                  onClick={() => void handleRegenerateMatchCode(focusedMatchCodeSeries)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-semibold border disabled:opacity-50"
                  style={{ borderColor: 'rgba(245,158,11,0.6)', color: '#FCD34D' }}
                >
                  {regeneratingSeriesId === focusedMatchCodeSeries.id ? 'Regenerating...' : 'Regenerate Match Code'}
                </button>
                <button
                  type="button"
                  disabled={!focusedSeriesHostManaged || markingLobbySeriesId === focusedMatchCodeSeries.id}
                  onClick={() => void handleMarkLobbyCreated(focusedMatchCodeSeries)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-semibold border disabled:opacity-50"
                  style={{ borderColor: 'rgba(34,197,94,0.6)', color: '#86EFAC' }}
                >
                  {markingLobbySeriesId === focusedMatchCodeSeries.id ? 'Saving...' : 'Mark Lobby Created'}
                </button>
              </div>
              {!focusedSeriesHostManaged && (
                <p className="text-[11px] mt-2" style={{ color: '#FDE68A' }}>
                  You are not on the host team, so code control is read-only here.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => void copyMatchCode(focusedMatchCodeSeries.matchCode)}
                className="px-3 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white' }}
              >
                Copy Match Code
              </button>
              <button
                type="button"
                onClick={() => setFocusedMatchCodeSeriesId(null)}
                className="px-3 py-2 rounded-lg text-sm font-semibold border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Back to Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
