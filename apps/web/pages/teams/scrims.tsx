import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SEOHead from '@components/SEOHead';
import NoAccess from '@components/NoAccess';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import { useGlobalUI } from '@components/GlobalUI';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SCRIM_FORMATS = ['BO1', 'BO3', 'BO5', 'BLOCK'];
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

export default function TeamsScrimsPage() {
  const { user } = useAuth();
  const { showToast } = useGlobalUI();

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [prefill, setPrefill] = useState<TeamPrefillResponse | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);

  const [postForm, setPostForm] = useState<PostForm>({
    averageRank: '',
    averageDivision: '',
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
  }, [user?.id, filterRegion, filterStatus, filterFormat]);

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

      const scheduleResponse = await fetch(`${API_URL}/api/teams/${selectedTeamId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Scrim Finder Slot',
          type: 'SCRIM',
          description: postForm.details.trim() || 'Auto-created from Scrim Finder post.',
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
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--color-accent-1)' }}>
                Teams Scrim Finder
              </h1>
              <p className="mt-1 text-sm sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                Start time is saved once in UTC and displayed in each viewer&apos;s local timezone automatically.
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Proposal decisions now live in Notifications, with matching Discord decision prompts.
              </p>
            </div>
            <Link
              href="/teams/dashboard"
              className="px-4 py-2 rounded font-semibold border transition-all hover:opacity-85"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              Back to Teams Dashboard
            </Link>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section
              className="xl:col-span-1 border p-5 rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Publish Scrim Availability</h2>

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
                        averageDivision: ['MASTER', 'GRANDMASTER', 'CHALLENGER', 'UNRANKED'].includes(event.target.value)
                          ? ''
                          : prev.averageDivision,
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
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Division
                    </label>
                    <select
                      value={postForm.averageDivision}
                      disabled={!postForm.averageRank || ['MASTER', 'GRANDMASTER', 'CHALLENGER', 'UNRANKED'].includes(postForm.averageRank)}
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
                      {SCRIM_FORMATS.map((format) => (
                        <option key={format} value={format}>{format}</option>
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
                className="border p-4 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold mr-auto" style={{ color: 'var(--color-text-primary)' }}>Scrim Feed</h2>

                  <select
                    value={filterRegion}
                    onChange={(event) => setFilterRegion(event.target.value)}
                    className="px-3 py-2 rounded border text-sm"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="ALL">All regions</option>
                    {Array.from(new Set(manageableTeams.map((team) => team.region))).map((region) => (
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
                    {SCRIM_FORMATS.map((format) => (
                      <option key={format} value={format}>{format}</option>
                    ))}
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
                    return (
                      <article
                        key={post.id}
                        className="border rounded-xl p-4"
                        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {post.teamName} {post.teamTag ? `[${post.teamTag}]` : ''}
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              {post.region} • {post.scrimFormat} • starts {formatLocalDateTime(post.startTimeUtc)}
                            </p>
                          </div>
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-semibold"
                            style={{ backgroundColor: `${statusColor(post.status)}22`, color: statusColor(post.status), border: `1px solid ${statusColor(post.status)}55` }}
                          >
                            {post.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                          <div>Average rank: {post.averageRank || 'Unknown'} {post.averageDivision || ''}</div>
                          <div>Pending: {post.proposalStats.pendingCount} | Delayed: {post.proposalStats.delayedCount}</div>
                          <div>Avg response: {post.proposalStats.averageResponseMinutes ? `${post.proposalStats.averageResponseMinutes} min` : 'No data'}</div>
                        </div>

                        {post.details && (
                          <p className="text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>{post.details}</p>
                        )}

                        <div className="flex flex-wrap gap-2 mb-3">
                          <Link
                            href={`/teams/${post.teamId}`}
                            className="px-3 py-1.5 rounded text-sm font-semibold border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                          >
                            View Team
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveProposalPostId(isProposalOpen ? null : post.id);
                              setProposalForm((prev) => ({ ...prev, proposerTeamId: proposalEligibleTeams[0]?.id || prev.proposerTeamId || '' }));
                            }}
                            className="px-3 py-1.5 rounded text-sm font-semibold"
                            style={{ backgroundColor: '#2563EB', color: 'white' }}
                          >
                            Let&apos;s Scrim!
                          </button>

                          {post.opggMultisearchUrl && (
                            <a
                              href={normalizeUrl(post.opggMultisearchUrl) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded text-sm font-semibold border"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            >
                              OP.GG multisearch
                            </a>
                          )}
                        </div>

                        {post.myProposal && (
                          <div className="mb-3 text-sm px-3 py-2 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                            Your team proposal status: <strong style={{ color: statusColor(post.myProposal.status) }}>{post.myProposal.status}</strong>
                            {post.myProposal.status === 'DELAYED' && ' (marked as low-priority fallback)'}
                          </div>
                        )}

                        {isProposalOpen && (
                          <div className="mt-3 border rounded-lg p-3 space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
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
                                className="px-3 py-1.5 rounded font-semibold text-sm"
                                style={{ backgroundColor: '#16A34A', color: 'white' }}
                              >
                                {proposalSubmitting ? 'Sending...' : 'Send Proposal'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveProposalPostId(null)}
                                className="px-3 py-1.5 rounded font-semibold text-sm border"
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
