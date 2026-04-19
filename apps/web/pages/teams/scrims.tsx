import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SEOHead from '@components/SEOHead';
import NoAccess from '@components/NoAccess';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import { useGlobalUI } from '@components/GlobalUI';

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
const SCRIM_FORMATS = SCRIM_FORMAT_OPTIONS.map((option) => option.value);
const SCRIM_STATUSES = ['AVAILABLE', 'CANDIDATES', 'SETTLED'];
const MANAGEABLE_TEAM_ROLES = new Set(['OWNER', 'MANAGER', 'COACH']);
const RANKS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER', 'UNRANKED'];
const DIVISIONS = ['IV', 'III', 'II', 'I'];
const DRAFT_KEY = 'riftessence_scrim_finder_draft_v1';

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

export default function TeamsScrimsPage() {
  const { user } = useAuth();
  const { showToast, confirm } = useGlobalUI();

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
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

  const [feedLoading, setFeedLoading] = useState(true);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);

  const [activeProposalPostId, setActiveProposalPostId] = useState<string | null>(null);
  const [proposalForm, setProposalForm] = useState<ProposalForm>({
    proposerTeamId: '',
    message: '',
  });

  const [filterRegion, setFilterRegion] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('AVAILABLE');
  const [filterFormat, setFilterFormat] = useState('ALL');
  const [filterFearless, setFilterFearless] = useState<'ALL' | 'REGULAR' | 'FEARLESS'>('ALL');
  const [regionPrefilled, setRegionPrefilled] = useState(false);

  const manageableTeams = useMemo(() => {
    return teams.filter((team) => team.isOwner || MANAGEABLE_TEAM_ROLES.has(team.myRole));
  }, [teams]);

  const selectedTeam = useMemo(() => manageableTeams.find((team) => team.id === selectedTeamId) || null, [manageableTeams, selectedTeamId]);

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

      if (!selectedTeamId && manageable.length > 0) {
        setSelectedTeamId(manageable[0].id);
      }
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
  }, [user?.id, filterRegion, filterStatus, filterFormat, filterFearless]);

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

                        <div className="flex flex-wrap gap-2 mb-4">
                          <Link
                            href={`/teams/${post.teamId}`}
                            className="px-3 py-1.5 rounded-lg text-sm font-semibold border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)' }}
                          >
                            View Team
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveProposalPostId(isProposalOpen ? null : post.id);
                              setProposalForm((prev) => ({ ...prev, proposerTeamId: proposalEligibleTeams[0]?.id || prev.proposerTeamId || '' }));
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white' }}
                          >
                            Let&apos;s Scrim!
                          </button>

                          {post.opggMultisearchUrl && (
                            <a
                              href={normalizeUrl(post.opggMultisearchUrl) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg text-sm font-semibold border"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)' }}
                            >
                              OP.GG multisearch
                            </a>
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
    </>
  );
}
