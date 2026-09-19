import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiMessageCircle,
  FiShield,
  FiStar,
  FiUsers,
} from 'react-icons/fi';
import SEOHead from '@components/SEOHead';
import NoAccess from '@components/NoAccess';
import { useGlobalUI } from '@components/GlobalUI';
import { useAuth } from '../contexts/AuthContext';
import { scrimApiRequest } from '../utils/scrimApi';
const REGIONS = [
  'NA',
  'EUW',
  'EUNE',
  'KR',
  'JP',
  'OCE',
  'LAN',
  'LAS',
  'BR',
  'RU',
];
const RANKS = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
  'UNRANKED',
];
const FORMATS = [
  'BO1',
  'BO3',
  'BO5',
  'FEARLESS_BO1',
  'FEARLESS_BO3',
  'FEARLESS_BO5',
  'BLOCK',
];

type DiscordState = {
  linked: boolean;
  username: string | null;
  dmEnabled: boolean;
  channelEnabled: boolean;
};
type Identity = {
  id: string;
  teamId: string;
  name: string;
  tag: string | null;
  region: string;
  averageRank: string | null;
  averageDivision: string | null;
  averageLp: number | null;
  kind: 'profile' | 'team';
  discord: DiscordState;
  activePost: Post | null;
  reputation: { rating: number | null; count: number };
  completedScrims: number;
  recommendedRegion?: string | null;
};
type Post = {
  id: string;
  teamId: string;
  teamName: string;
  teamTag: string | null;
  region: string;
  averageRank: string | null;
  averageDivision: string | null;
  averageLp: number | null;
  startTimeUtc: string;
  scrimFormat: string;
  details: string | null;
  source: string;
  externalContactUrl: string | null;
  reputation: { rating: number | null; count: number };
  proposalStats: {
    pendingCount: number;
    averageResponseMinutes: number | null;
  };
  myProposal: { status: string } | null;
};
type Proposal = {
  id: string;
  message: string | null;
  proposerTeam: { name: string; tag: string | null; region: string };
  post: { teamId: string; startTimeUtc: string; scrimFormat: string };
};
type Series = {
  id: string;
  matchCode: string;
  scheduledAt: string;
  hostTeam: { name: string; tag: string | null };
  guestTeam: { name: string; tag: string | null };
  proposal: { post: { scrimFormat: string } } | null;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
const teamLabel = (team: { name: string; tag: string | null }) =>
  `${team.name}${team.tag ? ` [${team.tag}]` : ''}`;
const rankLabel = (entry: {
  averageRank: string | null;
  averageDivision?: string | null;
  averageLp?: number | null;
}) =>
  entry.averageRank
    ? `${entry.averageRank}${
        entry.averageDivision ? ` ${entry.averageDivision}` : ''
      }${entry.averageLp ? ` · ${entry.averageLp} LP` : ''}`
    : 'Rank not set';
const formatLabel = (value: string) =>
  value.replace('FEARLESS_', 'Fearless ').replaceAll('_', ' ');
const nextHourInput = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className="block text-sm font-semibold"
      style={{ color: 'var(--color-text-primary)' }}
    >
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  required,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-primary)',
      }}
    />
  );
}

function Select({
  value,
  onChange,
  values,
}: {
  value: string;
  onChange: (value: string) => void;
  values: string[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-primary)',
      }}
    >
      {values.map((item) => (
        <option key={item} value={item}>
          {formatLabel(item)}
        </option>
      ))}
    </select>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-5 shadow-2xl"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-secondary)',
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            className="text-xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ScrimsPage() {
  const { user, loading } = useAuth();
  const { showToast } = useGlobalUI();
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [rooms, setRooms] = useState<Series[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [region, setRegion] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [challengePost, setChallengePost] = useState<Post | null>(null);
  const [profile, setProfile] = useState({
    name: '',
    tag: '',
    region: 'EUW',
    rank: 'EMERALD',
    division: 'I',
    averageLp: '',
    contactPreference: 'EITHER',
  });
  const [availability, setAvailability] = useState({
    startLocalTime: nextHourInput(),
    scrimFormat: 'FEARLESS_BO3',
    details: '',
  });
  const [message, setMessage] = useState('');
  const regionInitialized = useRef(false);

  const selected =
    identities.find((identity) => identity.id === selectedId) ||
    identities[0] ||
    null;
  const request = useCallback(scrimApiRequest, []);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoadingData(true);
    try {
      const query = new URLSearchParams();
      if (region) query.set('region', region);
      if (formatFilter) query.set('format', formatFilter);
      const [identityData, postData, proposalData, roomData] =
        await Promise.all([
          request('/scrims/identities'),
          request(`/scrims/posts?${query}`),
          request('/scrims/proposals/incoming'),
          request('/scrims/series/pending-results'),
        ]);
      const next: Identity[] = [
        ...(identityData.profiles || []).map((item: any) => ({
          ...item,
          kind: 'profile',
        })),
        ...(identityData.teams || []).map((item: any) => ({
          ...item,
          teamId: item.id,
          kind: 'team',
        })),
      ];
      setIdentities(next);
      setSelectedId((current) =>
        next.some((identity) => identity.id === current)
          ? current
          : next[0]?.id || '',
      );
      if (!regionInitialized.current) {
        const preferredRegion =
          next[0]?.recommendedRegion ||
          identityData.preferredRegion ||
          next[0]?.region ||
          '';
        setRegion(preferredRegion);
        setProfile((current) => ({
          ...current,
          region: preferredRegion || current.region,
        }));
        regionInitialized.current = true;
      }
      setPosts(postData.posts || []);
      setProposals(proposalData.proposals || []);
      setRooms(roomData.series || []);
    } catch (error: any) {
      showToast(error.message || 'Could not load Scrims', 'error');
    } finally {
      if (!silent) setLoadingData(false);
    }
  }, [formatFilter, region, request, showToast, user]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!user) return;
    const refresh = () => void load(true);
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [load, user]);

  const visiblePosts = useMemo(
    () => posts.filter((post) => post.teamId !== selected?.teamId),
    [posts, selected?.teamId],
  );
  const createProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const masterPlus = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(
        profile.rank,
      );
      const result = await request('/scrims/profiles', {
        method: 'POST',
        body: JSON.stringify({
          name: profile.name,
          tag: profile.tag,
          region: profile.region,
          defaultAverageRank: profile.rank,
          defaultDivision:
            masterPlus || profile.rank === 'UNRANKED' ? null : profile.division,
          defaultAverageLp:
            masterPlus && profile.averageLp ? Number(profile.averageLp) : null,
          contactPreference: profile.contactPreference,
        }),
      });
      setProfileOpen(false);
      await load();
      setSelectedId(result.profile.id);
      showToast('Scrim team created', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await request('/scrims/posts', {
        method: 'POST',
        body: JSON.stringify({
          teamId: selected.teamId,
          averageRank: selected.averageRank || 'UNRANKED',
          averageDivision: selected.averageDivision,
          averageLp: selected.averageLp,
          startTimeUtc: new Date(availability.startLocalTime).toISOString(),
          timezoneLabel: Intl.DateTimeFormat().resolvedOptions().timeZone,
          scrimFormat: availability.scrimFormat,
          details: availability.details,
        }),
      });
      setAvailabilityOpen(false);
      await load();
      showToast('Availability is live', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const stopAvailability = async () => {
    if (!selected?.activePost) return;
    setBusy(true);
    try {
      await request(`/scrims/posts/${selected.activePost.id}`, {
        method: 'DELETE',
      });
      await load();
      showToast('Availability stopped', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const challenge = async () => {
    if (!selected || !challengePost) return;
    if (challengePost.externalContactUrl) {
      window.open(
        challengePost.externalContactUrl,
        '_blank',
        'noopener,noreferrer',
      );
      setChallengePost(null);
      return;
    }
    setBusy(true);
    try {
      await request(`/scrims/posts/${challengePost.id}/proposals`, {
        method: 'POST',
        body: JSON.stringify({ proposerTeamId: selected.teamId, message }),
      });
      setChallengePost(null);
      setMessage('');
      await load();
      showToast('Challenge sent', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const decide = async (proposalId: string, action: string) => {
    setBusy(true);
    try {
      const result = await request(`/scrims/proposals/${proposalId}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      await load();
      showToast(
        action === 'ACCEPT'
          ? 'Scrim Room created'
          : action === 'DELAY'
          ? 'Proposal kept as backup'
          : 'Proposal passed',
        'success',
      );
      if (result.seriesId)
        window.dispatchEvent(new Event('riftessence:scrim-room-changed'));
      if (result.seriesId)
        window.location.assign(`/scrims/room/${result.seriesId}`);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;
  if (!user) return <NoAccess />;

  return (
    <>
      <SEOHead
        title="Find a Scrim | RiftEssence"
        description="Find, confirm, and manage reliable League of Legends scrims."
        path="/scrims"
      />
      <main
        className="min-h-screen px-4 py-7 md:px-8"
        style={{ background: 'var(--color-bg-primary)' }}
      >
        <div className="mx-auto max-w-[1480px]">
          <header className="mb-6">
            <h1
              className="text-3xl font-extrabold tracking-tight md:text-4xl"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Find a scrim
            </h1>
            <p
              className="mt-2 text-sm md:text-base"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Publish a slot, compare reliable opponents, and keep every
              confirmed match in one secure room.
            </p>
          </header>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-6">
              <section
                className="border-y py-4"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border text-lg font-black"
                      style={{
                        borderColor: 'rgba(251,191,36,.5)',
                        color: '#FCD34D',
                        background: 'var(--color-bg-secondary)',
                      }}
                    >
                      {selected?.tag?.slice(0, 2) || 'RE'}
                    </div>
                    <div className="min-w-0">
                      {selected ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2
                              className="truncate text-lg font-bold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {teamLabel(selected)}
                            </h2>
                            <span
                              className="text-xs"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {selected.kind === 'profile'
                                ? 'Scrim team'
                                : 'Full team'}
                            </span>
                          </div>
                          <p
                            className="mt-1 text-sm"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {selected.region} · {rankLabel(selected)} ·{' '}
                            {selected.completedScrims} completed scrims
                          </p>
                        </>
                      ) : (
                        <>
                          <h2
                            className="text-lg font-bold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            Create your scrim team
                          </h2>
                          <p
                            className="text-sm"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            One manager, no broader Team setup required.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {identities.length > 1 ? (
                      <select
                        aria-label="Scrim team"
                        value={selectedId}
                        onChange={(event) => {
                          const nextId = event.target.value;
                          const nextIdentity = identities.find(
                            (identity) => identity.id === nextId,
                          );
                          setSelectedId(nextId);
                          setRegion(
                            nextIdentity?.recommendedRegion ||
                              nextIdentity?.region ||
                              '',
                          );
                        }}
                        className="rounded-lg border px-3 py-2 text-sm"
                        style={{
                          borderColor: 'var(--color-border)',
                          background: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {identities.map((identity) => (
                          <option key={identity.id} value={identity.id}>
                            {teamLabel(identity)}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {selected?.activePost ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void stopAvailability()}
                        className="rounded-lg border px-4 py-2 text-sm font-bold"
                        style={{
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        Stop availability
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        selected
                          ? setAvailabilityOpen(true)
                          : setProfileOpen(true)
                      }
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500"
                    >
                      {selected
                        ? selected.activePost
                          ? 'Update availability'
                          : 'Set availability'
                        : 'Create Scrim Team'}
                    </button>
                  </div>
                </div>
                {selected?.activePost ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
                    <FiCheckCircle /> Active for{' '}
                    {formatLabel(selected.activePost.scrimFormat)} ·{' '}
                    {formatDate(selected.activePost.startTimeUtc)}
                  </p>
                ) : null}
              </section>
              <section>
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2
                      className="text-2xl font-bold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Available now
                    </h2>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {loadingData
                        ? 'Refreshing opponents…'
                        : `${visiblePosts.length} ${
                            visiblePosts.length === 1 ? 'team' : 'teams'
                          } found`}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:flex">
                    <select
                      aria-label="Region filter"
                      value={region}
                      onChange={(event) => setRegion(event.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm"
                      style={{
                        borderColor: 'var(--color-border)',
                        background: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="">All regions</option>
                      {REGIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Format filter"
                      value={formatFilter}
                      onChange={(event) => setFormatFilter(event.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm"
                      style={{
                        borderColor: 'var(--color-border)',
                        background: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <option value="">All formats</option>
                      {FORMATS.map((value) => (
                        <option key={value} value={value}>
                          {formatLabel(value)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div
                  className="overflow-hidden rounded-xl border"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-secondary)',
                  }}
                >
                  <div
                    className="hidden grid-cols-[1.35fr_.85fr_.8fr_.9fr_auto] gap-4 border-b px-5 py-3 text-xs font-bold uppercase tracking-wider md:grid"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <span>Team</span>
                    <span>Format</span>
                    <span>Start</span>
                    <span>Reliability</span>
                    <span />
                  </div>
                  {!loadingData && visiblePosts.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                      <FiUsers
                        className="mx-auto mb-3 text-2xl"
                        style={{ color: 'var(--color-text-secondary)' }}
                      />
                      <p
                        className="font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        No teams match these filters
                      </p>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Keep your availability live—new teams appear here
                        automatically.
                      </p>
                    </div>
                  ) : (
                    visiblePosts.map((post) => (
                      <article
                        key={post.id}
                        className="grid gap-3 border-b px-5 py-4 last:border-b-0 md:grid-cols-[1.35fr_.85fr_.8fr_.9fr_auto] md:items-center"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div>
                          <p
                            className="font-bold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {teamLabel({
                              name: post.teamName,
                              tag: post.teamTag,
                            })}
                          </p>
                          <p
                            className="mt-1 line-clamp-1 text-xs"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {post.region} · {rankLabel(post)}
                            {post.details ? ` · ${post.details}` : ''}
                          </p>
                        </div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {formatLabel(post.scrimFormat)}
                        </p>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {formatDate(post.startTimeUtc)}
                        </p>
                        <div>
                          <p
                            className="flex items-center gap-1.5 text-sm font-semibold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            <FiStar className="text-amber-300" />{' '}
                            {post.reputation?.rating
                              ? `${post.reputation.rating.toFixed(1)}/5`
                              : 'New team'}
                          </p>
                          <p
                            className="mt-1 text-xs"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {post.proposalStats.pendingCount}{' '}
                            {post.proposalStats.pendingCount === 1
                              ? 'proposal'
                              : 'proposals'}
                            {' · '}
                            {post.proposalStats.averageResponseMinutes
                              ? `replies in ~${post.proposalStats.averageResponseMinutes}m`
                              : `${post.reputation?.count || 0} reviews`}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!selected || Boolean(post.myProposal)}
                          onClick={() => setChallengePost(post)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {post.myProposal
                            ? 'Sent'
                            : post.externalContactUrl
                            ? 'Contact'
                            : 'Challenge'}
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
            <aside className="space-y-5">
              <section
                className="rounded-xl border p-4"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-secondary)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="text-xl font-bold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    My scrims
                  </h2>
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {proposals.length} incoming
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {proposals.length === 0 ? (
                    <p
                      className="rounded-lg border border-dashed p-4 text-sm"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      No incoming proposals. We’ll notify the manager in-app and
                      through the configured Discord delivery.
                    </p>
                  ) : (
                    proposals.slice(0, 3).map((proposal) => (
                      <article
                        key={proposal.id}
                        className="rounded-lg border p-3"
                        style={{
                          borderColor: 'var(--color-border)',
                          background: 'var(--color-bg-tertiary)',
                        }}
                      >
                        <p
                          className="font-bold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {teamLabel(proposal.proposerTeam)}
                        </p>
                        <p
                          className="mt-1 flex items-center gap-1.5 text-xs"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <FiClock /> {formatLabel(proposal.post.scrimFormat)} ·{' '}
                          {formatDate(proposal.post.startTimeUtc)}
                        </p>
                        {proposal.message ? (
                          <p
                            className="mt-3 text-sm"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {proposal.message}
                          </p>
                        ) : null}
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <button
                            disabled={busy}
                            onClick={() => void decide(proposal.id, 'ACCEPT')}
                            className="rounded-md bg-emerald-600 px-2 py-2 text-xs font-bold text-white"
                          >
                            Accept
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => void decide(proposal.id, 'DELAY')}
                            className="rounded-md border px-2 py-2 text-xs font-bold"
                            style={{
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            Backup
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => void decide(proposal.id, 'REJECT')}
                            className="rounded-md border border-rose-700/70 px-2 py-2 text-xs font-bold text-rose-300"
                          >
                            Pass
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <div
                  className="mt-5 border-t pt-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <h3
                    className="text-sm font-bold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Confirmed rooms
                  </h3>
                  <div className="mt-3 space-y-2">
                    {rooms.length === 0 ? (
                      <p
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Accepted scrims will create a room here.
                      </p>
                    ) : (
                      rooms.slice(0, 4).map((room) => (
                        <Link
                          key={room.id}
                          href={`/scrims/room/${room.id}`}
                          className="block rounded-lg border p-3 transition hover:border-blue-500/60"
                          style={{
                            borderColor: 'var(--color-border)',
                            background: 'var(--color-bg-tertiary)',
                          }}
                        >
                          <p
                            className="text-sm font-bold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {room.hostTeam.name} vs {room.guestTeam.name}
                          </p>
                          <p
                            className="mt-1 text-xs"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {room.proposal?.post.scrimFormat
                              ? formatLabel(room.proposal.post.scrimFormat)
                              : 'Scrim'}{' '}
                            · {formatDate(room.scheduledAt)}
                          </p>
                          <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-300">
                            Open Scrim Room <FiExternalLink />
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </section>
              <section
                className="rounded-xl border p-4"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-secondary)',
                }}
              >
                <div className="flex items-center gap-2">
                  <FiMessageCircle className="text-[#5865F2]" />
                  <h2
                    className="font-bold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Discord delivery
                  </h2>
                </div>
                {selected ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        Manager DMs
                      </span>
                      <span
                        className={
                          selected.discord?.linked &&
                          selected.discord?.dmEnabled
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                        }
                      >
                        {selected.discord?.linked && selected.discord?.dmEnabled
                          ? 'Active'
                          : selected.discord?.linked
                          ? 'Disabled'
                          : 'Not linked'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        Team channel
                      </span>
                      <span
                        className={
                          selected.discord?.channelEnabled
                            ? 'text-emerald-300'
                            : ''
                        }
                        style={
                          selected.discord?.channelEnabled
                            ? undefined
                            : { color: 'var(--color-text-secondary)' }
                        }
                      >
                        {selected.discord?.channelEnabled
                          ? 'Connected'
                          : 'Optional'}
                      </span>
                    </div>
                    <p
                      className="rounded-lg border p-3 text-xs leading-relaxed"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        background: 'var(--color-bg-tertiary)',
                      }}
                    >
                      In Discord, run{' '}
                      <strong style={{ color: 'var(--color-text-primary)' }}>
                        /scrim status
                      </strong>{' '}
                      for your dashboard or{' '}
                      <strong style={{ color: 'var(--color-text-primary)' }}>
                        /scrim channel
                      </strong>{' '}
                      in the private team channel that should receive activity.
                    </p>
                  </div>
                ) : (
                  <p
                    className="mt-3 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Create a scrim team to configure delivery.
                  </p>
                )}
              </section>
              <section
                className="rounded-xl border p-4"
                style={{
                  borderColor: 'rgba(251,191,36,.28)',
                  background: 'rgba(120,83,10,.08)',
                }}
              >
                <div className="flex gap-3">
                  <FiShield className="mt-0.5 shrink-0 text-amber-300" />
                  <div>
                    <h2
                      className="font-bold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Secure by default
                    </h2>
                    <p
                      className="mt-1 text-sm leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Confirmed scrims get a private room, shared lobby code,
                      mutual result confirmation, and reciprocal team reviews.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>

      {profileOpen ? (
        <Modal
          title="Create a Scrim Team"
          onClose={() => setProfileOpen(false)}
        >
          <form onSubmit={createProfile} className="space-y-4">
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              This is a complete scrim identity with you as its manager. You do
              not need to configure the broader Team system.
            </p>
            <Field label="Team name">
              <Input
                required
                value={profile.name}
                onChange={(value) =>
                  setProfile((current) => ({ ...current, name: value }))
                }
                placeholder="Les Mystificateurs"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Short tag">
                <Input
                  value={profile.tag}
                  onChange={(value) =>
                    setProfile((current) => ({ ...current, tag: value }))
                  }
                  placeholder="MST"
                />
              </Field>
              <Field label="Region">
                <Select
                  value={profile.region}
                  onChange={(value) =>
                    setProfile((current) => ({ ...current, region: value }))
                  }
                  values={REGIONS}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Typical rank">
                <Select
                  value={profile.rank}
                  onChange={(value) =>
                    setProfile((current) => ({ ...current, rank: value }))
                  }
                  values={RANKS}
                />
              </Field>
              {['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(
                profile.rank,
              ) ? (
                <Field label="LP (optional)">
                  <Input
                    value={profile.averageLp}
                    onChange={(value) =>
                      setProfile((current) => ({
                        ...current,
                        averageLp: value,
                      }))
                    }
                    placeholder="250"
                  />
                </Field>
              ) : profile.rank !== 'UNRANKED' ? (
                <Field label="Division">
                  <Select
                    value={profile.division}
                    onChange={(value) =>
                      setProfile((current) => ({ ...current, division: value }))
                    }
                    values={['IV', 'III', 'II', 'I']}
                  />
                </Field>
              ) : (
                <div />
              )}
            </div>
            <Field label="Contact preference">
              <Select
                value={profile.contactPreference}
                onChange={(value) =>
                  setProfile((current) => ({
                    ...current,
                    contactPreference: value,
                  }))
                }
                values={['EITHER', 'DISCORD', 'APP']}
              />
            </Field>
            <button
              disabled={busy}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create Scrim Team'}
            </button>
          </form>
        </Modal>
      ) : null}
      {availabilityOpen && selected ? (
        <Modal
          title="Set availability"
          onClose={() => setAvailabilityOpen(false)}
        >
          <form onSubmit={publish} className="space-y-4">
            <div
              className="rounded-lg border p-3"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-tertiary)',
              }}
            >
              <p
                className="font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {teamLabel(selected)}
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {selected.discord?.dmEnabled
                  ? 'In-app + Discord DM delivery active'
                  : selected.discord?.channelEnabled
                  ? 'In-app + team channel delivery active'
                  : 'In-app delivery active · Discord is optional'}
              </p>
            </div>
            <Field label="Start time">
              <input
                required
                type="datetime-local"
                value={availability.startLocalTime}
                onChange={(event) =>
                  setAvailability((current) => ({
                    ...current,
                    startLocalTime: event.target.value,
                  }))
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </Field>
            <Field label="Format">
              <Select
                value={availability.scrimFormat}
                onChange={(value) =>
                  setAvailability((current) => ({
                    ...current,
                    scrimFormat: value,
                  }))
                }
                values={FORMATS}
              />
            </Field>
            <Field label="Note for opponents">
              <textarea
                value={availability.details}
                onChange={(event) =>
                  setAvailability((current) => ({
                    ...current,
                    details: event.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="What should opponents know?"
              />
            </Field>
            <button
              disabled={busy}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? 'Publishing…' : 'Publish availability'}
            </button>
          </form>
        </Modal>
      ) : null}
      {challengePost ? (
        <Modal
          title={`${
            challengePost.externalContactUrl ? 'Contact' : 'Challenge'
          } ${challengePost.teamName}`}
          onClose={() => setChallengePost(null)}
        >
          <div
            className="rounded-lg border p-3 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p
              className="font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {formatLabel(challengePost.scrimFormat)} ·{' '}
              {formatDate(challengePost.startTimeUtc)}
            </p>
            <p className="mt-1">
              You’ll act as{' '}
              {selected ? teamLabel(selected) : 'your selected team'}.
            </p>
          </div>
          {challengePost.externalContactUrl ? (
            <>
              <p
                className="mt-4 text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                This listing is synchronized from another scrim finder. Continue
                to its verified contact page to complete the proposal.
              </p>
              <button
                type="button"
                onClick={() => void challenge()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white"
              >
                Open external contact <FiExternalLink />
              </button>
            </>
          ) : (
            <>
              <div className="mt-4">
                <Field label="Message (optional)">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)',
                    }}
                    placeholder="Share any useful scheduling detail."
                  />
                </Field>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void challenge()}
                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Sending…' : 'Send challenge'}
              </button>
            </>
          )}
        </Modal>
      ) : null}
    </>
  );
}

export default ScrimsPage;
