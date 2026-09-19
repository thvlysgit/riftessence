import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiArrowLeft,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiHash,
  FiMessageCircle,
  FiRefreshCw,
  FiShield,
  FiStar,
  FiUsers,
} from 'react-icons/fi';
import SEOHead from '@components/SEOHead';
import NoAccess from '@components/NoAccess';
import { useGlobalUI } from '@components/GlobalUI';
import { useAuth } from '../../../contexts/AuthContext';
import { getAuthToken } from '../../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Member = { role: string; user: { id: string; username: string } };
type Team = {
  id: string;
  name: string;
  tag: string | null;
  region: string;
  iconUrl: string | null;
  members: Member[];
  discordChannelEnabled: boolean;
};
type Activity = { type: string; at: string; label: string };
type Room = {
  id: string;
  hostTeamId: string;
  guestTeamId: string;
  hostTeam: Team;
  guestTeam: Team;
  viewerTeamId: string;
  opponentTeamId: string;
  scheduledAt: string;
  matchCode: string;
  matchCodeVersion: number;
  lobbyCodeUsedAt: string | null;
  winnerTeamId: string | null;
  winnerConfirmedAt: string | null;
  firstReporterTeamId: string | null;
  firstReportedWinnerTeamId: string | null;
  firstReportedAt: string | null;
  canAct: boolean;
  canControlLobby: boolean;
  canReportResult: boolean;
  canReview: boolean;
  post: {
    scrimFormat: string;
    details: string | null;
    timezoneLabel: string | null;
  };
  proposal: {
    message: string | null;
    createdAt: string;
    decisionAt: string | null;
  } | null;
  review: { averageRating: number; message: string | null } | null;
  activity: Activity[];
};

const teamLabel = (team: Team) =>
  `${team.name}${team.tag ? ` [${team.tag}]` : ''}`;
const formatLabel = (value: string) =>
  value.replace('FEARLESS_', 'Fearless ').replaceAll('_', ' ');
const dateLabel = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function TeamMark({ team, side }: { team: Team; side: 'host' | 'guest' }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border text-sm font-black"
        style={{
          borderColor:
            side === 'host' ? 'rgba(59,130,246,.55)' : 'rgba(251,191,36,.55)',
          color: side === 'host' ? '#93C5FD' : '#FCD34D',
          background: 'var(--color-bg-tertiary)',
        }}
      >
        {team.iconUrl ? (
          <img
            src={team.iconUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          (team.tag || team.name).slice(0, 3).toUpperCase()
        )}
      </div>
      <div className="min-w-0">
        <p
          className="truncate text-lg font-extrabold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {teamLabel(team)}
        </p>
        <p
          className="mt-0.5 text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {side === 'host' ? 'Host · creates lobby' : 'Challenger'} ·{' '}
          {team.region}
        </p>
      </div>
    </div>
  );
}

function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-secondary)',
      }}
    >
      {children}
    </section>
  );
}

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className="text-sm font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {label}
      </span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            aria-label={`${score} out of 5`}
            aria-pressed={score <= value}
            className="rounded p-0.5 text-lg transition hover:scale-110"
            style={{
              color: score <= value ? '#FBBF24' : 'var(--color-text-secondary)',
            }}
          >
            <FiStar fill={score <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ScrimRoomPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showToast } = useGlobalUI();
  const [room, setRoom] = useState<Room | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState({
    politeness: 5,
    punctuality: 5,
    gameplay: 5,
    message: '',
  });

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Something went wrong');
    return payload;
  }, []);

  const loadRoom = useCallback(async () => {
    if (!user || !router.isReady || typeof router.query.id !== 'string') return;
    setLoadingRoom(true);
    try {
      const payload = await request(`/scrims/series/${router.query.id}/room`);
      setRoom(payload.room);
    } catch (error: any) {
      showToast(error.message || 'Could not load this Scrim Room', 'error');
    } finally {
      setLoadingRoom(false);
    }
  }, [request, router.isReady, router.query.id, showToast, user]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  const myTeam = useMemo(
    () =>
      room
        ? room.viewerTeamId === room.hostTeamId
          ? room.hostTeam
          : room.guestTeam
        : null,
    [room],
  );
  const opponent = useMemo(
    () =>
      room
        ? room.opponentTeamId === room.hostTeamId
          ? room.hostTeam
          : room.guestTeam
        : null,
    [room],
  );

  const act = async (
    path: string,
    body?: Record<string, unknown>,
    success?: string,
  ) => {
    setBusy(true);
    try {
      await request(path, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      await loadRoom();
      if (success) showToast(success, 'success');
    } catch (error: any) {
      showToast(error.message || 'Action failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.matchCode);
      showToast('Lobby code copied', 'success');
    } catch {
      showToast('Could not copy the lobby code', 'error');
    }
  };

  const reportWinner = async (winnerTeamId: string) => {
    if (!room) return;
    await act(
      `/scrims/series/${room.id}/result`,
      { reportingTeamId: room.viewerTeamId, winnerTeamId },
      'Result submitted',
    );
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!room) return;
    setBusy(true);
    try {
      await request('/scrims/reviews', {
        method: 'POST',
        body: JSON.stringify({
          seriesId: room.id,
          reviewerTeamId: room.viewerTeamId,
          targetTeamId: room.opponentTeamId,
          ...review,
        }),
      });
      await loadRoom();
      showToast('Review shared — thank you', 'success');
    } catch (error: any) {
      showToast(error.message || 'Could not submit review', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;
  if (!user) return <NoAccess />;

  return (
    <>
      <SEOHead
        title="Scrim Room | RiftEssence"
        description="Coordinate your confirmed scrim securely."
        path={
          typeof router.query.id === 'string'
            ? `/scrims/room/${router.query.id}`
            : '/scrims'
        }
      />
      <main
        className="min-h-screen px-4 py-7 md:px-8"
        style={{ background: 'var(--color-bg-primary)' }}
      >
        <div className="mx-auto max-w-[1360px]">
          <Link
            href="/scrims"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <FiArrowLeft /> Back to Scrim Finder
          </Link>

          {loadingRoom ? (
            <div className="grid min-h-[55vh] place-items-center">
              <FiRefreshCw className="animate-spin text-2xl text-blue-400" />
            </div>
          ) : !room ? (
            <Panel className="p-10 text-center">
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Scrim Room unavailable
              </h1>
              <p
                className="mt-2 text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                The room may have been removed, or your account does not belong
                to either team.
              </p>
            </Panel>
          ) : (
            <>
              <header className="mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h1
                    className="text-3xl font-extrabold tracking-tight md:text-4xl"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Scrim Room
                  </h1>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                    Confirmed
                  </span>
                </div>
                <p
                  className="mt-2 text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  One place for the lobby, result agreement, observers, and
                  post-match trust.
                </p>
              </header>

              {!room.canAct ? (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                  <FiUsers className="mt-0.5 shrink-0" />
                  <p>
                    <strong>Observer view.</strong> Your manager or captain
                    controls the lobby and result. You can follow every update
                    here without changing anything.
                  </p>
                </div>
              ) : null}

              <Panel className="mb-6 overflow-hidden">
                <div className="grid items-center gap-5 p-5 md:grid-cols-[1fr_auto_1fr] md:p-7">
                  <TeamMark team={room.hostTeam} side="host" />
                  <div className="text-center">
                    <p
                      className="text-xs font-bold uppercase tracking-[.22em]"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      versus
                    </p>
                    <p
                      className="mt-1 text-sm font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {formatLabel(room.post.scrimFormat)}
                    </p>
                  </div>
                  <div className="md:justify-self-end">
                    <TeamMark team={room.guestTeam} side="guest" />
                  </div>
                </div>
                <div
                  className="grid gap-3 border-t px-5 py-4 sm:grid-cols-3"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-tertiary)',
                  }}
                >
                  <p
                    className="flex items-center gap-2 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <FiClock className="text-blue-400" />{' '}
                    <span>{dateLabel(room.scheduledAt)}</span>
                  </p>
                  <p
                    className="flex items-center gap-2 text-sm sm:justify-center"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <FiShield className="text-emerald-400" /> Result agreement
                    protected
                  </p>
                  <p
                    className="flex items-center gap-2 text-sm sm:justify-end"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <FiMessageCircle className="text-indigo-400" /> Discord
                    synced
                  </p>
                </div>
              </Panel>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-6">
                  <Panel className="p-5 md:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p
                          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <FiHash /> Lobby code · v{room.matchCodeVersion}
                        </p>
                        <p className="mt-3 break-all font-mono text-2xl font-black tracking-wider text-blue-300 md:text-3xl">
                          {room.matchCode}
                        </p>
                        <p
                          className="mt-2 text-sm"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          The host creates the custom lobby and both teams use
                          this code as the shared reference.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyCode()}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
                      >
                        <FiCopy /> Copy code
                      </button>
                    </div>
                    {room.canControlLobby ? (
                      <div
                        className="mt-5 flex flex-wrap gap-2 border-t pt-4"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        {!room.lobbyCodeUsedAt ? (
                          <button
                            disabled={busy}
                            type="button"
                            onClick={() =>
                              void act(
                                `/scrims/series/${room.id}/lobby-code-used`,
                                undefined,
                                'Lobby marked ready',
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                          >
                            <FiCheck /> Lobby is ready
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                            <FiCheckCircle /> Lobby ready
                          </span>
                        )}
                        <button
                          disabled={busy || Boolean(room.winnerConfirmedAt)}
                          type="button"
                          onClick={() =>
                            void act(
                              `/scrims/series/${room.id}/match-code/regenerate`,
                              undefined,
                              'New lobby code created',
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-40"
                          style={{
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          <FiRefreshCw /> Regenerate
                        </button>
                      </div>
                    ) : null}
                  </Panel>

                  <Panel className="p-5 md:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2
                          className="text-xl font-bold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          Result agreement
                        </h2>
                        <p
                          className="mt-1 text-sm"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          A result is final only after both teams report the
                          same winner.
                        </p>
                      </div>
                      {room.winnerConfirmedAt ? (
                        <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                          Final
                        </span>
                      ) : null}
                    </div>
                    {room.winnerConfirmedAt ? (
                      <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4">
                        <p className="flex items-center gap-2 font-bold text-emerald-200">
                          <FiCheckCircle /> Winner confirmed:{' '}
                          {room.winnerTeamId === room.hostTeamId
                            ? teamLabel(room.hostTeam)
                            : teamLabel(room.guestTeam)}
                        </p>
                      </div>
                    ) : room.canReportResult ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {[room.hostTeam, room.guestTeam].map((team) => {
                          const selected =
                            room.firstReportedWinnerTeamId === team.id;
                          return (
                            <button
                              key={team.id}
                              disabled={busy}
                              type="button"
                              onClick={() => void reportWinner(team.id)}
                              className="rounded-xl border p-4 text-left transition hover:border-blue-400 disabled:opacity-50"
                              style={{
                                borderColor: selected
                                  ? 'rgba(59,130,246,.7)'
                                  : 'var(--color-border)',
                                background: selected
                                  ? 'rgba(59,130,246,.1)'
                                  : 'var(--color-bg-tertiary)',
                              }}
                            >
                              <span
                                className="text-xs font-bold uppercase tracking-wider"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                {selected ? 'Reported winner' : 'Report winner'}
                              </span>
                              <span
                                className="mt-1 block font-bold"
                                style={{ color: 'var(--color-text-primary)' }}
                              >
                                {teamLabel(team)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p
                        className="mt-5 rounded-lg border border-dashed p-4 text-sm"
                        style={{
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {room.firstReportedAt
                          ? 'A manager has submitted a result. Waiting for the other team to confirm.'
                          : 'Team managers can report the result after the scrim.'}
                      </p>
                    )}
                  </Panel>

                  {room.canReview ? (
                    <Panel className="p-5 md:p-6">
                      <h2
                        className="text-xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        Rate {opponent ? teamLabel(opponent) : 'your opponent'}
                      </h2>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Your review strengthens reliable matchmaking. Ratings
                        are tied to completed, mutually confirmed scrims.
                      </p>
                      <form onSubmit={submitReview} className="mt-5 space-y-4">
                        <RatingInput
                          label="Politeness"
                          value={review.politeness}
                          onChange={(value) =>
                            setReview((current) => ({
                              ...current,
                              politeness: value,
                            }))
                          }
                        />
                        <RatingInput
                          label="Punctuality"
                          value={review.punctuality}
                          onChange={(value) =>
                            setReview((current) => ({
                              ...current,
                              punctuality: value,
                            }))
                          }
                        />
                        <RatingInput
                          label="Gameplay & fair play"
                          value={review.gameplay}
                          onChange={(value) =>
                            setReview((current) => ({
                              ...current,
                              gameplay: value,
                            }))
                          }
                        />
                        <textarea
                          value={review.message}
                          onChange={(event) =>
                            setReview((current) => ({
                              ...current,
                              message: event.target.value,
                            }))
                          }
                          maxLength={1000}
                          rows={3}
                          placeholder="Optional private context for the reputation record"
                          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                          style={{
                            borderColor: 'var(--color-border)',
                            background: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                        <button
                          disabled={busy}
                          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                        >
                          Submit review
                        </button>
                      </form>
                    </Panel>
                  ) : room.review ? (
                    <Panel className="p-5">
                      <p className="flex items-center gap-2 font-bold text-amber-200">
                        <FiStar /> Your review:{' '}
                        {room.review.averageRating.toFixed(1)}/5
                      </p>
                    </Panel>
                  ) : null}
                </div>

                <aside className="space-y-5">
                  <Panel className="p-5">
                    <h2
                      className="text-lg font-bold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Room activity
                    </h2>
                    <div className="mt-5 space-y-0">
                      {room.activity.map((entry, index) => (
                        <div
                          key={`${entry.type}-${entry.at}`}
                          className="relative flex gap-3 pb-5 last:pb-0"
                        >
                          {index < room.activity.length - 1 ? (
                            <span
                              className="absolute left-[7px] top-5 h-[calc(100%-12px)] w-px"
                              style={{ background: 'var(--color-border)' }}
                            />
                          ) : null}
                          <span
                            className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-blue-400"
                            style={{ background: 'var(--color-bg-secondary)' }}
                          />
                          <div>
                            <p
                              className="text-sm font-semibold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {entry.label}
                            </p>
                            <p
                              className="mt-0.5 text-xs"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {dateLabel(entry.at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel className="p-5">
                    <div className="flex items-center gap-2">
                      <FiMessageCircle className="text-indigo-400" />
                      <h2
                        className="text-lg font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        Discord delivery
                      </h2>
                    </div>
                    <p
                      className="mt-3 text-sm leading-6"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Managers receive actionable DMs. Teams with a private
                      channel connected also share lifecycle updates with
                      coaches and structure staff.
                    </p>
                    <div className="mt-4 space-y-2">
                      {[room.hostTeam, room.guestTeam].map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                          style={{
                            borderColor: 'var(--color-border)',
                            background: 'var(--color-bg-tertiary)',
                          }}
                        >
                          <span
                            className="truncate text-sm font-semibold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {teamLabel(team)}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              team.discordChannelEnabled
                                ? 'text-emerald-300'
                                : ''
                            }`}
                            style={
                              team.discordChannelEnabled
                                ? undefined
                                : { color: 'var(--color-text-secondary)' }
                            }
                          >
                            {team.discordChannelEnabled
                              ? 'Channel on'
                              : 'DM only'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel className="p-5">
                    <h2
                      className="text-lg font-bold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      People with visibility
                    </h2>
                    <p
                      className="mt-2 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Managers can act. Other members can follow the room in
                      read-only mode.
                    </p>
                    <div className="mt-4 space-y-3">
                      {[room.hostTeam, room.guestTeam].map((team) => (
                        <div key={team.id}>
                          <p
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {teamLabel(team)}
                          </p>
                          <p
                            className="mt-1 text-sm"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {team.members.length
                              ? team.members
                                  .slice(0, 4)
                                  .map((member) => member.user.username)
                                  .join(', ')
                              : 'Team owner'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  {room.post.details || room.proposal?.message ? (
                    <Panel className="p-5">
                      <h2
                        className="text-lg font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        Notes
                      </h2>
                      {room.post.details ? (
                        <p
                          className="mt-3 text-sm leading-6"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {room.post.details}
                        </p>
                      ) : null}
                      {room.proposal?.message ? (
                        <p
                          className="mt-3 border-t pt-3 text-sm leading-6"
                          style={{
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {room.proposal.message}
                        </p>
                      ) : null}
                    </Panel>
                  ) : null}
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
