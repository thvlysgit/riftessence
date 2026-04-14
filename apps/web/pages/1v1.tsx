import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from '../../api/components/GlobalUI';
import { getAuthHeader } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type LadderTier = {
  tier: string;
  lp: number;
};

type RankedOneVOneChallenge = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'LOBBY_READY' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  challengerId: string;
  opponentId: string;
  challengerUsername: string | null;
  opponentUsername: string | null;
  winnerId?: string | null;
  winnerUsername?: string | null;
  loserId?: string | null;
  loserUsername?: string | null;
  creatorUserId?: string | null;
  creatorUsername?: string | null;
  joinerUserId?: string | null;
  joinerUsername?: string | null;
  lobbyName?: string | null;
  lobbyPassword?: string | null;
  region: string;
  myRole: 'CHALLENGER' | 'OPPONENT';
  myAccepted?: boolean;
  opponentAccepted?: boolean;
  acceptDeadlineAt?: string | null;
  styleSelectionDeadlineAt?: string | null;
  challengerStyleChoice?: DuelStyle | null;
  opponentStyleChoice?: DuelStyle | null;
  resolvedStyle?: DuelStyle | null;
  forfeitReason?: string | null;
  challengerRatingDelta?: number | null;
  opponentRatingDelta?: number | null;
  customGameSetup?: {
    creatorUserId?: string | null;
    creatorUsername?: string | null;
    joinerUserId?: string | null;
    joinerUsername?: string | null;
    lobbyName?: string | null;
    lobbyPassword?: string | null;
    style?: DuelStyle | null;
    styleDetails?: {
      title: string;
      summary: string;
      map: string;
      laneFocus: string;
      winCondition: string;
      sideRule: string;
    } | null;
  };
};

type RankedProfileSnapshot = {
  profile: {
    userId: string;
    username: string;
    region: string | null;
    rating: number;
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
    winrate: number;
    ladderTier: LadderTier;
    rankPosition: number;
    hasLinkedRiotAccount: boolean;
    verifiedRegions: string[];
    discordDmNotifications: boolean;
  };
  queue: {
    id: string;
    region: string;
    createdAt: string;
    waitingSeconds?: number;
  } | null;
  activeChallenge: RankedOneVOneChallenge | null;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  region: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  winrate: number;
  ladderTier: LadderTier;
};

type DuelStyle = 'ARAM_STANDARD' | 'ARAM_FIRST_BLOOD' | 'MID_STANDARD' | 'TOP_STANDARD';

const STYLE_OPTIONS: Array<{
  key: DuelStyle;
  title: string;
  summary: string;
}> = [
  {
    key: 'ARAM_STANDARD',
    title: 'ARAM Standard',
    summary: 'First to 100 CS, first blood, or first tower.',
  },
  {
    key: 'ARAM_FIRST_BLOOD',
    title: 'ARAM First Blood',
    summary: 'First kill ends the duel immediately.',
  },
  {
    key: 'MID_STANDARD',
    title: 'SR Mid Standard',
    summary: 'Mid lane duel. 100 CS / first blood / first tower.',
  },
  {
    key: 'TOP_STANDARD',
    title: 'SR Top Standard',
    summary: 'Top lane duel. 100 CS / first blood / first tower.',
  },
];

function getRemainingSeconds(deadline?: string | null): number | null {
  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 1000));
}

function formatCountdown(totalSeconds: number | null): string {
  if (totalSeconds === null) return '--:--';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getStyleLabel(style?: DuelStyle | null): string {
  if (!style) return 'Not selected';
  const option = STYLE_OPTIONS.find((entry) => entry.key === style);
  return option ? option.title : style;
}

export default function RankedOneVOnePage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast, confirm } = useGlobalUI();

  const [snapshot, setSnapshot] = useState<RankedProfileSnapshot | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<RankedOneVOneChallenge[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const [region, setRegion] = useState('NA');
  const regionTouchedRef = useRef(false);
  const lastNotifiedChallengeId = useRef<string | null>(null);

  const [reportReason, setReportReason] = useState('');
  const [reportEvidenceText, setReportEvidenceText] = useState('');
  const [manualMatchId, setManualMatchId] = useState('');

  const callApi = useCallback(async (path: string, init: RequestInit = {}) => {
    const authHeader = getAuthHeader();
    if (!('Authorization' in authHeader)) {
      throw new Error('Please log in first.');
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(authHeader as { Authorization: string }),
      ...(init.headers || {}),
    };

    const response = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers,
    });

    const payload = await response.json().catch(() => ({} as Record<string, any>));

    if (!response.ok) {
      throw new Error(String(payload?.error || `Request failed (${response.status})`));
    }

    return payload;
  }, []);

  const fetchData = useCallback(async (silent: boolean = false) => {
    const authHeader = getAuthHeader();
    if (!('Authorization' in authHeader)) {
      setSnapshot(null);
      setPageLoading(false);
      return;
    }

    if (!silent) {
      setPageLoading(true);
    }

    try {
      const headers = authHeader as { Authorization: string };
      const [meRes, boardRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/ranked-1v1/me`, { headers }),
        fetch(`${API_URL}/api/ranked-1v1/leaderboard?limit=12`, { headers }),
        fetch(`${API_URL}/api/ranked-1v1/challenges?limit=8`, { headers }),
      ]);

      const mePayload = await meRes.json().catch(() => null);
      if (!meRes.ok || !mePayload) {
        throw new Error((mePayload && mePayload.error) || 'Failed to load ranked 1v1 profile');
      }

      const boardPayload = boardRes.ok
        ? await boardRes.json().catch(() => ({ entries: [] }))
        : { entries: [] };

      const historyPayload = historyRes.ok
        ? await historyRes.json().catch(() => ({ challenges: [] }))
        : { challenges: [] };

      setSnapshot(mePayload as RankedProfileSnapshot);
      setLeaderboard(Array.isArray(boardPayload.entries) ? boardPayload.entries : []);
      setHistory(Array.isArray(historyPayload.challenges) ? historyPayload.challenges : []);

      if (!regionTouchedRef.current) {
        const firstRegion = mePayload?.profile?.verifiedRegions?.[0]
          || mePayload?.profile?.region
          || 'NA';
        setRegion(firstRegion);
      }
    } catch (error: any) {
      if (!silent) {
        showToast(error?.message || 'Failed to load 1v1 data', 'error');
      }
    } finally {
      setPageLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!user) {
      setPageLoading(false);
      setSnapshot(null);
      setLeaderboard([]);
      setHistory([]);
      return;
    }

    fetchData(false);
  }, [user, fetchData]);

  const pollIntervalMs = snapshot?.activeChallenge || snapshot?.queue ? 4000 : 12000;

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [user, fetchData, pollIntervalMs]);

  useEffect(() => {
    const activeChallenge = snapshot?.activeChallenge;
    if (!activeChallenge || activeChallenge.status !== 'PENDING') {
      return;
    }

    if (lastNotifiedChallengeId.current === activeChallenge.id) {
      return;
    }

    lastNotifiedChallengeId.current = activeChallenge.id;

    showToast('1v1 match found. Accept within 3 minutes.', 'info');

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const opponentName = activeChallenge.myRole === 'CHALLENGER'
        ? (activeChallenge.opponentUsername || 'your opponent')
        : (activeChallenge.challengerUsername || 'your opponent');

      const title = 'Ranked 1v1 match found';
      const body = `You matched vs ${opponentName}. Accept now in RiftEssence.`;

      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(title, { body });
          }
        }).catch(() => {
          // No-op: browser blocked notifications.
        });
      }
    }
  }, [snapshot?.activeChallenge, showToast]);

  const runAction = useCallback(async (key: string, action: () => Promise<void>) => {
    setActionBusy(key);
    try {
      await action();
      await fetchData(true);
    } finally {
      setActionBusy(null);
    }
  }, [fetchData]);

  const activeChallenge = snapshot?.activeChallenge || null;
  const hasLinkedRiotAccount = Boolean(
    snapshot?.profile?.hasLinkedRiotAccount
    || (user?.riotAccountsCount && user.riotAccountsCount > 0),
  );

  const opponentUsername = useMemo(() => {
    if (!activeChallenge) return null;
    return activeChallenge.myRole === 'CHALLENGER'
      ? activeChallenge.opponentUsername
      : activeChallenge.challengerUsername;
  }, [activeChallenge]);

  const acceptCountdown = getRemainingSeconds(activeChallenge?.acceptDeadlineAt);
  const styleCountdown = getRemainingSeconds(activeChallenge?.styleSelectionDeadlineAt);

  const myStyleChoice = activeChallenge
    ? activeChallenge.myRole === 'CHALLENGER'
      ? activeChallenge.challengerStyleChoice
      : activeChallenge.opponentStyleChoice
    : null;

  const opponentStyleChoice = activeChallenge
    ? activeChallenge.myRole === 'CHALLENGER'
      ? activeChallenge.opponentStyleChoice
      : activeChallenge.challengerStyleChoice
    : null;

  const requestBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Browser notifications are not supported on this device.', 'error');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('Browser notifications enabled.', 'success');
    } else {
      showToast('Browser notifications were not enabled.', 'info');
    }
  };

  const copyText = async (value: string, label: string) => {
    if (!value) {
      showToast(`No ${label.toLowerCase()} available to copy`, 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied`, 'success');
    } catch {
      showToast(`Could not copy ${label.toLowerCase()}`, 'error');
    }
  };

  const handleJoinQueue = async () => {
    if (!hasLinkedRiotAccount) {
      showToast('Link and verify a Riot account first.', 'error');
      return;
    }

    await runAction('join-queue', async () => {
      const payload = await callApi('/ranked-1v1/queue/join', {
        method: 'POST',
        body: JSON.stringify({ region }),
      });

      if (payload?.matched) {
        showToast('Match found. Accept in the duel panel now.', 'success');
        return;
      }

      showToast(`Queued for ranked 1v1 in ${region}.`, 'success');
    });
  };

  const handleLeaveQueue = async () => {
    await runAction('leave-queue', async () => {
      await callApi('/ranked-1v1/queue/leave', { method: 'POST' });
      showToast('You left the queue.', 'info');
    });
  };

  const handleAcceptMatch = async () => {
    if (!activeChallenge) return;

    await runAction('accept-match', async () => {
      await callApi(`/ranked-1v1/challenges/${activeChallenge.id}/accept`, { method: 'POST' });
      showToast('Accepted. Waiting for opponent confirmation.', 'success');
    });
  };

  const handlePickStyle = async (style: DuelStyle) => {
    if (!activeChallenge) return;

    await runAction(`style-${style}`, async () => {
      await callApi(`/ranked-1v1/challenges/${activeChallenge.id}/style-choice`, {
        method: 'POST',
        body: JSON.stringify({ style }),
      });
      showToast(`Style set to ${getStyleLabel(style)}.`, 'success');
    });
  };

  const handleGiveUp = async () => {
    if (!activeChallenge) return;

    const confirmed = await confirm({
      title: 'Surrender Ranked 1v1',
      message: 'You will take a ranked loss and your opponent will be awarded the win. Continue?',
      confirmText: 'Give Up',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    await runAction('give-up', async () => {
      await callApi(`/ranked-1v1/challenges/${activeChallenge.id}/give-up`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Surrendered from ranked 1v1 page' }),
      });
      showToast('You surrendered the match.', 'info');
    });
  };

  const handleReportIssue = async () => {
    if (!activeChallenge) return;

    if (reportReason.trim().length < 10) {
      showToast('Please describe the issue with at least 10 characters.', 'error');
      return;
    }

    const evidenceUrls = reportEvidenceText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    await runAction('report-issue', async () => {
      await callApi(`/ranked-1v1/challenges/${activeChallenge.id}/report-issue`, {
        method: 'POST',
        body: JSON.stringify({ reason: reportReason.trim(), evidenceUrls }),
      });
      setReportReason('');
      setReportEvidenceText('');
      showToast('Issue report submitted. Thank you for the evidence.', 'success');
    });
  };

  const handleFinishMatch = async () => {
    if (!activeChallenge) return;

    await runAction('finish-match', async () => {
      const payload = await callApi(`/ranked-1v1/challenges/${activeChallenge.id}/finished`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      if (payload?.synced) {
        showToast('Result synced from Riot and ladder updated.', 'success');
        return;
      }

      if (payload?.waitingForOpponentFinish) {
        showToast('Finish registered. Waiting for opponent to confirm.', 'info');
        return;
      }

      if (payload?.awaitingRiotSync) {
        showToast('Finish registered. Riot match not found yet, try sync again shortly.', 'info');
        return;
      }

      showToast('Finish registered.', 'success');
    });
  };

  const handleManualSync = async () => {
    if (!activeChallenge) return;

    await runAction('manual-sync', async () => {
      await callApi(`/ranked-1v1/challenges/${activeChallenge.id}/sync-result`, {
        method: 'POST',
        body: JSON.stringify({ matchId: manualMatchId.trim() || undefined }),
      });

      setManualMatchId('');
      showToast('Result sync triggered.', 'success');
    });
  };

  const canQueue = hasLinkedRiotAccount && !activeChallenge;

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="text-center space-y-3">
          <div
            className="w-14 h-14 mx-auto rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--color-accent-1)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading ranked 1v1 arena...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen px-4 py-16" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="max-w-3xl mx-auto text-center rounded-2xl border p-10" style={{
          background: 'linear-gradient(145deg, rgba(15,18,24,0.95), rgba(18,26,36,0.88))',
          borderColor: 'rgba(200,170,110,0.42)',
        }}>
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--color-accent-1)', fontFamily: 'Orbitron, sans-serif' }}>Ranked 1v1 Arena</h1>
          <p className="mb-8 text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to queue, accept duels, vote style, and sync results directly from Riot match data.
          </p>
          <Link href="/login" className="inline-flex px-6 py-3 rounded-lg font-semibold" style={{
            background: 'linear-gradient(120deg, #c8aa6e 0%, #d8bd8a 45%, #f4dfa4 100%)',
            color: '#10131a',
          }}>
            Login To Enter 1v1
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="arena-page min-h-screen px-4 py-8 md:py-10">
      <div className="arena-light" />
      <div className="max-w-7xl mx-auto relative z-10 space-y-6">
        <section className="arena-hero reveal-card">
          <div className="space-y-4">
            <p className="tracking-[0.24em] text-xs uppercase" style={{ color: '#85a4c8' }}>Competitive queue</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#f6e0aa' }}>
              Ranked 1v1 Arena
            </h1>
            <p className="max-w-3xl text-sm sm:text-base" style={{ color: '#c5d2e6' }}>
              Queue solo. Accept in 3 minutes. Vote duel style in 1 minute. Get lobby handoff, report no-shows with evidence,
              and finish with Riot-verified result sync.
            </p>
          </div>
          <div className="hero-meta">
            <span className="meta-pill">Queue + Accept</span>
            <span className="meta-pill">Style Voting</span>
            <span className="meta-pill">Riot Sync</span>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-4 space-y-6">
            <article className="arena-card reveal-card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#95a9c5' }}>Your Ladder</p>
                  <h2 className="text-2xl font-bold" style={{ color: '#f5f7ff', fontFamily: 'Orbitron, sans-serif' }}>
                    {snapshot?.profile?.ladderTier?.tier || 'SILVER'} {snapshot?.profile?.ladderTier?.lp ?? 0} LP
                  </h2>
                </div>
                <span className="placement-badge">#{snapshot?.profile?.rankPosition || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="stat-block">
                  <p className="text-xs text-slate-300">Wins</p>
                  <p className="text-xl font-semibold text-emerald-300">{snapshot?.profile?.wins ?? 0}</p>
                </div>
                <div className="stat-block">
                  <p className="text-xs text-slate-300">Losses</p>
                  <p className="text-xl font-semibold text-rose-300">{snapshot?.profile?.losses ?? 0}</p>
                </div>
                <div className="stat-block">
                  <p className="text-xs text-slate-300">Winrate</p>
                  <p className="text-xl font-semibold text-sky-300">{(snapshot?.profile?.winrate ?? 0).toFixed(1)}%</p>
                </div>
              </div>
              <p className="mt-4 text-xs" style={{ color: '#95a9c5' }}>
                Rating: {snapshot?.profile?.rating ?? 1000} • Games: {snapshot?.profile?.gamesPlayed ?? 0}
              </p>
            </article>

            <article className="arena-card reveal-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Queue</h3>
                {snapshot?.queue && <span className="queue-dot">Queued</span>}
              </div>

              {!hasLinkedRiotAccount ? (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: '#d6dff1' }}>
                    You need at least one linked and verified Riot account before entering ranked 1v1.
                  </p>
                  <Link href="/profile" className="inline-flex px-4 py-2 rounded-md font-semibold" style={{
                    backgroundColor: 'rgba(200,170,110,0.18)',
                    color: '#f3da9d',
                    border: '1px solid rgba(200,170,110,0.42)',
                  }}>
                    Link Riot Account
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.14em] mb-2" style={{ color: '#9bb0ce' }}>
                      Queue Region
                    </label>
                    <select
                      value={region}
                      onChange={(event) => {
                        regionTouchedRef.current = true;
                        setRegion(event.target.value);
                      }}
                      disabled={!canQueue || actionBusy !== null}
                      className="w-full rounded-lg px-3 py-2"
                      style={{
                        backgroundColor: 'rgba(17,25,37,0.9)',
                        border: '1px solid rgba(123,154,197,0.45)',
                        color: '#f5f7ff',
                      }}
                    >
                      {(snapshot?.profile?.verifiedRegions || ['NA']).map((entry) => (
                        <option key={entry} value={entry}>{entry}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleJoinQueue}
                      disabled={!canQueue || actionBusy !== null}
                      className="px-4 py-2 rounded-md font-semibold disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(125deg, #2fbe7a, #4ed0b0)',
                        color: '#052117',
                      }}
                    >
                      {actionBusy === 'join-queue' ? 'Queueing...' : 'Join Queue'}
                    </button>
                    <button
                      onClick={handleLeaveQueue}
                      disabled={!snapshot?.queue || actionBusy !== null}
                      className="px-4 py-2 rounded-md font-semibold disabled:opacity-50"
                      style={{
                        backgroundColor: 'rgba(244,114,182,0.15)',
                        color: '#fecdd3',
                        border: '1px solid rgba(251,113,133,0.5)',
                      }}
                    >
                      {actionBusy === 'leave-queue' ? 'Leaving...' : 'Leave Queue'}
                    </button>
                  </div>

                  {snapshot?.queue ? (
                    <p className="text-xs" style={{ color: '#b8cae8' }}>
                      In queue for {snapshot.queue.region} • waiting {snapshot.queue.waitingSeconds ?? 0}s
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: '#8fa7cb' }}>Not currently queued.</p>
                  )}

                  <div className="notice-box">
                    <p className="text-xs mb-1" style={{ color: '#d4e2f8' }}>Match-found notifications</p>
                    <p className="text-xs" style={{ color: '#93a9ca' }}>
                      Browser: {typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'}
                      {' · '}
                      Discord DM: {snapshot?.profile?.discordDmNotifications ? 'enabled' : 'disabled'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={requestBrowserNotifications}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold"
                        style={{
                          backgroundColor: 'rgba(56,189,248,0.16)',
                          color: '#bfdbfe',
                          border: '1px solid rgba(56,189,248,0.45)',
                        }}
                      >
                        Enable Browser Notifications
                      </button>
                      <Link href="/settings" className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{
                        backgroundColor: 'rgba(148,163,184,0.15)',
                        color: '#dbeafe',
                        border: '1px solid rgba(148,163,184,0.35)',
                      }}>
                        Discord DM Settings
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </article>
          </section>

          <section className="xl:col-span-8">
            <article className="arena-card reveal-card min-h-[320px]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#95a9c5' }}>Live Duel</p>
                  <h3 className="text-2xl font-bold" style={{ color: '#f5f7ff', fontFamily: 'Orbitron, sans-serif' }}>
                    {activeChallenge
                      ? `vs ${opponentUsername || 'Opponent'}`
                      : 'No active match'}
                  </h3>
                </div>
                {activeChallenge && (
                  <span className="status-pill">{activeChallenge.status.replace('_', ' ')}</span>
                )}
              </div>

              {!activeChallenge ? (
                <div className="empty-state">
                  <p style={{ color: '#d4e2f8' }}>Queue up to be matched with another ranked 1v1 player.</p>
                  <p className="text-xs mt-2" style={{ color: '#91a8ca' }}>
                    Flow: queue → accept in 3 min → vote style in 1 min → lobby handoff → finish + Riot sync.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="timeline-grid">
                    <div className="timeline-step active">1. Match Found</div>
                    <div className={`timeline-step ${['PENDING', 'ACCEPTED', 'LOBBY_READY'].includes(activeChallenge.status) ? 'active' : ''}`}>2. Accept</div>
                    <div className={`timeline-step ${['ACCEPTED', 'LOBBY_READY'].includes(activeChallenge.status) ? 'active' : ''}`}>3. Style Vote</div>
                    <div className={`timeline-step ${activeChallenge.status === 'LOBBY_READY' ? 'active' : ''}`}>4. Lobby</div>
                    <div className={`timeline-step ${activeChallenge.status === 'LOBBY_READY' ? 'active' : ''}`}>5. Finish + Sync</div>
                  </div>

                  {activeChallenge.status === 'PENDING' && (
                    <div className="phase-card">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p className="font-semibold text-lg text-amber-200">Accept Window</p>
                        <span className="timer-pill">{formatCountdown(acceptCountdown)}</span>
                      </div>
                      <p className="text-sm mb-3" style={{ color: '#dbe7fb' }}>
                        Both players must accept within 3 minutes. Any player who does not accept takes a ranked loss.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        <div className="accept-chip">
                          You: {activeChallenge.myAccepted ? 'Accepted' : 'Pending'}
                        </div>
                        <div className="accept-chip">
                          Opponent: {activeChallenge.opponentAccepted ? 'Accepted' : 'Pending'}
                        </div>
                      </div>
                      <button
                        onClick={handleAcceptMatch}
                        disabled={Boolean(activeChallenge.myAccepted) || actionBusy !== null}
                        className="px-4 py-2 rounded-md font-semibold disabled:opacity-50"
                        style={{
                          background: 'linear-gradient(120deg, #f6d365, #fda085)',
                          color: '#1b1d2d',
                        }}
                      >
                        {actionBusy === 'accept-match' ? 'Accepting...' : activeChallenge.myAccepted ? 'Accepted' : 'Accept Match'}
                      </button>
                    </div>
                  )}

                  {activeChallenge.status === 'ACCEPTED' && (
                    <div className="phase-card">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p className="font-semibold text-lg text-sky-200">Style Voting</p>
                        <span className="timer-pill">{formatCountdown(styleCountdown)}</span>
                      </div>
                      <p className="text-sm mb-3" style={{ color: '#dbe7fb' }}>
                        Choose your preferred duel style. You can adapt live while the 1-minute timer is running.
                        If choices differ, one of the two picks is selected randomly.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {STYLE_OPTIONS.map((option) => {
                          const selected = myStyleChoice === option.key;
                          const loadingKey = `style-${option.key}`;

                          return (
                            <button
                              key={option.key}
                              onClick={() => handlePickStyle(option.key)}
                              disabled={actionBusy !== null}
                              className="text-left rounded-lg p-3 border transition disabled:opacity-50"
                              style={{
                                backgroundColor: selected ? 'rgba(56,189,248,0.2)' : 'rgba(15,23,40,0.75)',
                                borderColor: selected ? 'rgba(56,189,248,0.75)' : 'rgba(100,130,170,0.4)',
                              }}
                            >
                              <p className="font-semibold" style={{ color: '#f4f8ff' }}>{option.title}</p>
                              <p className="text-xs mt-1" style={{ color: '#a9bfdf' }}>{option.summary}</p>
                              {actionBusy === loadingKey && <p className="text-xs mt-2 text-cyan-200">Saving choice...</p>}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="accept-chip">Your choice: {getStyleLabel(myStyleChoice)}</div>
                        <div className="accept-chip">Opponent choice: {getStyleLabel(opponentStyleChoice)}</div>
                      </div>
                    </div>
                  )}

                  {activeChallenge.status === 'LOBBY_READY' && (
                    <div className="phase-card space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-lg text-emerald-200">Lobby Handoff</p>
                        <span className="status-pill">{getStyleLabel(activeChallenge.resolvedStyle)}</span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="lobby-block">
                          <p className="text-xs uppercase tracking-[0.16em] mb-1" style={{ color: '#98b2d4' }}>Role Assignment</p>
                          <p className="text-sm" style={{ color: '#e3edff' }}>
                            {activeChallenge.customGameSetup?.creatorUserId === user.id
                              ? 'You create the custom game lobby in client.'
                              : `${activeChallenge.customGameSetup?.creatorUsername || 'Opponent'} creates the custom game lobby.`}
                          </p>
                          <p className="text-sm mt-1" style={{ color: '#c8d6ee' }}>
                            {activeChallenge.customGameSetup?.joinerUserId === user.id
                              ? 'You join using code + password below.'
                              : `${activeChallenge.customGameSetup?.joinerUsername || 'Opponent'} joins using your code.`}
                          </p>
                        </div>

                        <div className="lobby-block">
                          <p className="text-xs uppercase tracking-[0.16em] mb-2" style={{ color: '#98b2d4' }}>Game Credentials</p>
                          <div className="space-y-2">
                            <div className="credential-line">
                              <span>Code:</span>
                              <strong>{activeChallenge.lobbyName || 'Not generated'}</strong>
                              <button onClick={() => copyText(activeChallenge.lobbyName || '', 'Lobby code')}>Copy</button>
                            </div>
                            <div className="credential-line">
                              <span>Password:</span>
                              <strong>{activeChallenge.lobbyPassword || 'Not generated'}</strong>
                              <button onClick={() => copyText(activeChallenge.lobbyPassword || '', 'Lobby password')}>Copy</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {activeChallenge.customGameSetup?.styleDetails && (
                        <div className="notice-box">
                          <p className="font-semibold text-sm" style={{ color: '#e9f1ff' }}>{activeChallenge.customGameSetup.styleDetails.title}</p>
                          <p className="text-xs mt-1" style={{ color: '#a8c0e5' }}>{activeChallenge.customGameSetup.styleDetails.summary}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleFinishMatch}
                          disabled={actionBusy !== null}
                          className="px-4 py-2 rounded-md font-semibold disabled:opacity-50"
                          style={{ background: 'linear-gradient(120deg, #67e8f9, #a7f3d0)', color: '#03232f' }}
                        >
                          {actionBusy === 'finish-match' ? 'Submitting...' : 'Match Finished'}
                        </button>
                        <button
                          onClick={handleManualSync}
                          disabled={actionBusy !== null}
                          className="px-4 py-2 rounded-md font-semibold disabled:opacity-50"
                          style={{ backgroundColor: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.5)', color: '#c6e8ff' }}
                        >
                          {actionBusy === 'manual-sync' ? 'Syncing...' : 'Sync Result Now'}
                        </button>
                        <input
                          type="text"
                          value={manualMatchId}
                          onChange={(event) => setManualMatchId(event.target.value)}
                          placeholder="Optional Riot matchId"
                          className="px-3 py-2 rounded-md text-sm"
                          style={{
                            backgroundColor: 'rgba(15,23,40,0.72)',
                            border: '1px solid rgba(100,130,170,0.45)',
                            color: '#eef4ff',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="phase-card">
                      <p className="font-semibold mb-2 text-rose-200">Give Up</p>
                      <p className="text-xs mb-3" style={{ color: '#bdcde5' }}>
                        You can surrender at any phase. This records a loss and awards the opponent the win.
                      </p>
                      <button
                        onClick={handleGiveUp}
                        disabled={actionBusy !== null}
                        className="px-4 py-2 rounded-md font-semibold disabled:opacity-50"
                        style={{
                          backgroundColor: 'rgba(251,113,133,0.15)',
                          border: '1px solid rgba(251,113,133,0.45)',
                          color: '#fecdd3',
                        }}
                      >
                        {actionBusy === 'give-up' ? 'Processing...' : 'Give Up Match'}
                      </button>
                    </div>

                    <div className="phase-card">
                      <p className="font-semibold mb-2 text-amber-200">Report Opponent</p>
                      <p className="text-xs mb-3" style={{ color: '#bdcde5' }}>
                        Submit details if your opponent dodges, breaks rules, or refuses to continue. Add screenshot URLs as evidence.
                      </p>
                      <textarea
                        value={reportReason}
                        onChange={(event) => setReportReason(event.target.value)}
                        rows={3}
                        placeholder="Describe what happened..."
                        className="w-full rounded-md px-3 py-2 text-sm mb-2"
                        style={{
                          backgroundColor: 'rgba(15,23,40,0.72)',
                          border: '1px solid rgba(100,130,170,0.45)',
                          color: '#eef4ff',
                        }}
                      />
                      <textarea
                        value={reportEvidenceText}
                        onChange={(event) => setReportEvidenceText(event.target.value)}
                        rows={2}
                        placeholder="Evidence URLs (one per line)"
                        className="w-full rounded-md px-3 py-2 text-sm mb-2"
                        style={{
                          backgroundColor: 'rgba(15,23,40,0.72)',
                          border: '1px solid rgba(100,130,170,0.45)',
                          color: '#eef4ff',
                        }}
                      />
                      <button
                        onClick={handleReportIssue}
                        disabled={actionBusy !== null}
                        className="px-4 py-2 rounded-md font-semibold disabled:opacity-50"
                        style={{
                          backgroundColor: 'rgba(251,191,36,0.15)',
                          border: '1px solid rgba(251,191,36,0.45)',
                          color: '#fde68a',
                        }}
                      >
                        {actionBusy === 'report-issue' ? 'Sending...' : 'Submit Report'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-7 arena-card reveal-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Top Ranked 1v1 Players</h3>
              <Link href="/leaderboards" className="text-sm" style={{ color: '#8fd2ff' }}>Global leaderboards</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr style={{ color: '#93acd0' }}>
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Player</th>
                    <th className="text-left py-2">Tier</th>
                    <th className="text-left py-2">Rating</th>
                    <th className="text-left py-2">Record</th>
                    <th className="text-left py-2">WR</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.userId} className="border-t" style={{ borderColor: 'rgba(118,144,179,0.28)' }}>
                      <td className="py-2 pr-2" style={{ color: '#f5db9f' }}>{entry.rank}</td>
                      <td className="py-2 pr-2" style={{ color: '#e6eeff' }}>{entry.username}</td>
                      <td className="py-2 pr-2" style={{ color: '#d1ddf4' }}>{entry.ladderTier.tier} {entry.ladderTier.lp} LP</td>
                      <td className="py-2 pr-2" style={{ color: '#d1ddf4' }}>{entry.rating}</td>
                      <td className="py-2 pr-2" style={{ color: '#d1ddf4' }}>{entry.wins}-{entry.losses}-{entry.draws}</td>
                      <td className="py-2 pr-2" style={{ color: '#9be7c4' }}>{entry.winrate.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-5 text-center" style={{ color: '#8da5c8' }}>
                        No ranked 1v1 games recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="xl:col-span-5 arena-card reveal-card">
            <h3 className="text-xl font-semibold text-white mb-4">Recent Duels</h3>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {history.map((challenge) => {
                const ratingDelta = challenge.myRole === 'CHALLENGER'
                  ? (challenge.challengerRatingDelta ?? 0)
                  : (challenge.opponentRatingDelta ?? 0);

                return (
                  <div key={challenge.id} className="history-item">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold" style={{ color: '#eff4ff' }}>
                        {challenge.challengerUsername || 'Player'} vs {challenge.opponentUsername || 'Player'}
                      </p>
                      <span className="text-xs" style={{ color: '#9bb3d6' }}>{challenge.status}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#9bb3d6' }}>
                      Result: {challenge.winnerUsername ? `${challenge.winnerUsername} won` : 'No winner'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: ratingDelta >= 0 ? '#86efac' : '#fda4af' }}>
                      LP impact (you): {ratingDelta >= 0 ? '+' : ''}{ratingDelta}
                    </p>
                  </div>
                );
              })}
              {history.length === 0 && (
                <p className="text-sm" style={{ color: '#8da5c8' }}>No duel history yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .arena-page {
          position: relative;
          background:
            radial-gradient(circle at 14% 0%, rgba(52, 96, 153, 0.42), transparent 42%),
            radial-gradient(circle at 86% 18%, rgba(37, 99, 235, 0.24), transparent 36%),
            linear-gradient(155deg, #070b12 0%, #0c1420 35%, #0f1a29 70%, #0a111d 100%);
          overflow: hidden;
        }

        .arena-light {
          position: absolute;
          inset: -20% -12% auto -12%;
          height: 55%;
          background: conic-gradient(from 120deg at 50% 50%, rgba(120, 198, 255, 0.15), rgba(245, 222, 157, 0.13), transparent 70%);
          filter: blur(36px);
          animation: drift 14s ease-in-out infinite;
          pointer-events: none;
        }

        .arena-hero {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-radius: 1.1rem;
          border: 1px solid rgba(129, 164, 207, 0.38);
          background: linear-gradient(145deg, rgba(7, 13, 23, 0.92), rgba(13, 28, 48, 0.82));
          padding: 1.25rem;
        }

        @media (min-width: 768px) {
          .arena-hero {
            padding: 1.75rem;
          }
        }

        .hero-meta {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .meta-pill {
          border-radius: 999px;
          padding: 0.35rem 0.7rem;
          font-size: 0.72rem;
          letter-spacing: 0.04em;
          background-color: rgba(100, 176, 255, 0.16);
          color: #d2ebff;
          border: 1px solid rgba(100, 176, 255, 0.3);
        }

        .arena-card {
          border-radius: 1rem;
          border: 1px solid rgba(126, 155, 193, 0.36);
          background: linear-gradient(145deg, rgba(8, 14, 25, 0.9), rgba(11, 20, 35, 0.84));
          padding: 1rem;
          box-shadow: 0 18px 40px rgba(2, 7, 15, 0.45);
        }

        @media (min-width: 768px) {
          .arena-card {
            padding: 1.2rem;
          }
        }

        .reveal-card {
          animation: revealUp 420ms ease both;
        }

        .placement-badge {
          border-radius: 999px;
          padding: 0.28rem 0.7rem;
          font-size: 0.78rem;
          font-weight: 700;
          background: rgba(245, 222, 157, 0.2);
          color: #f6dd9f;
          border: 1px solid rgba(245, 222, 157, 0.44);
        }

        .stat-block {
          border: 1px solid rgba(133, 164, 204, 0.32);
          border-radius: 0.75rem;
          padding: 0.55rem;
          background: rgba(12, 21, 34, 0.68);
        }

        .queue-dot {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.25rem 0.55rem;
          border-radius: 999px;
          color: #b1ffce;
          background-color: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.5);
        }

        .notice-box {
          border-radius: 0.8rem;
          border: 1px solid rgba(130, 164, 209, 0.38);
          background-color: rgba(15, 25, 40, 0.72);
          padding: 0.7rem;
        }

        .status-pill {
          border-radius: 999px;
          border: 1px solid rgba(94, 234, 212, 0.45);
          color: #99f6e4;
          background-color: rgba(45, 212, 191, 0.15);
          font-size: 0.74rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 0.35rem 0.7rem;
          font-weight: 700;
        }

        .empty-state {
          border-radius: 0.85rem;
          border: 1px dashed rgba(128, 158, 197, 0.38);
          background: rgba(16, 28, 44, 0.55);
          padding: 1.1rem;
        }

        .timeline-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 0.4rem;
        }

        @media (min-width: 640px) {
          .timeline-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }

        .timeline-step {
          padding: 0.45rem 0.55rem;
          border-radius: 0.65rem;
          font-size: 0.7rem;
          text-align: center;
          border: 1px solid rgba(104, 133, 168, 0.34);
          color: #8ea6c9;
          background: rgba(16, 24, 36, 0.7);
        }

        .timeline-step.active {
          color: #d7ecff;
          border-color: rgba(103, 232, 249, 0.55);
          background: rgba(6, 37, 54, 0.75);
        }

        .phase-card {
          border-radius: 0.85rem;
          border: 1px solid rgba(130, 164, 209, 0.35);
          background: rgba(12, 24, 39, 0.7);
          padding: 0.9rem;
        }

        .timer-pill {
          border-radius: 999px;
          padding: 0.3rem 0.65rem;
          font-size: 0.78rem;
          color: #fef3c7;
          border: 1px solid rgba(251, 191, 36, 0.45);
          background-color: rgba(251, 191, 36, 0.15);
        }

        .accept-chip {
          border-radius: 0.65rem;
          border: 1px solid rgba(123, 158, 205, 0.38);
          padding: 0.55rem;
          font-size: 0.82rem;
          color: #d8e6ff;
          background-color: rgba(16, 29, 46, 0.76);
        }

        .lobby-block {
          border: 1px solid rgba(126, 162, 206, 0.34);
          border-radius: 0.7rem;
          background-color: rgba(14, 26, 41, 0.75);
          padding: 0.75rem;
        }

        .credential-line {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 0.5rem;
          align-items: center;
          border: 1px solid rgba(126, 162, 206, 0.35);
          border-radius: 0.6rem;
          padding: 0.45rem 0.55rem;
          background-color: rgba(9, 18, 31, 0.72);
          color: #dce8ff;
          font-size: 0.78rem;
        }

        .credential-line strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #f8fbff;
        }

        .credential-line button {
          border-radius: 0.45rem;
          border: 1px solid rgba(126, 162, 206, 0.4);
          padding: 0.18rem 0.45rem;
          color: #bcd9ff;
          font-size: 0.72rem;
          background-color: rgba(19, 38, 58, 0.6);
        }

        .history-item {
          border-radius: 0.72rem;
          border: 1px solid rgba(127, 158, 196, 0.3);
          background-color: rgba(14, 24, 38, 0.72);
          padding: 0.65rem;
        }

        @keyframes revealUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes drift {
          0% {
            transform: translate3d(-2%, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(3%, 4%, 0) scale(1.06);
          }
          100% {
            transform: translate3d(-2%, 0, 0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
