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

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--border-radius)',
    boxShadow: 'var(--shadow)',
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'calc(var(--border-radius) * 0.9)',
  };

  const primaryButtonStyle: React.CSSProperties = {
    background: 'var(--btn-gradient)',
    color: 'var(--btn-gradient-text)',
    border: '1px solid transparent',
    borderRadius: 'calc(var(--border-radius) * 0.75)',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'calc(var(--border-radius) * 0.75)',
  };

  const successButtonStyle: React.CSSProperties = {
    backgroundColor: 'var(--accent-success-bg)',
    color: 'var(--accent-success)',
    border: '1px solid var(--accent-success-border)',
    borderRadius: 'calc(var(--border-radius) * 0.75)',
  };

  const dangerButtonStyle: React.CSSProperties = {
    backgroundColor: 'var(--accent-danger-bg)',
    color: 'var(--accent-danger)',
    border: '1px solid var(--accent-danger-border)',
    borderRadius: 'calc(var(--border-radius) * 0.75)',
  };

  const infoButtonStyle: React.CSSProperties = {
    backgroundColor: 'var(--accent-info-bg)',
    color: 'var(--accent-info)',
    border: '1px solid var(--accent-info-border)',
    borderRadius: 'calc(var(--border-radius) * 0.75)',
  };

  const warningButtonStyle: React.CSSProperties = {
    backgroundColor: 'var(--accent-primary-bg)',
    color: 'var(--color-warning)',
    border: '1px solid var(--accent-primary-border)',
    borderRadius: 'calc(var(--border-radius) * 0.75)',
  };

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
        <div className="max-w-3xl mx-auto text-center p-10" style={{
          ...cardStyle,
          background: 'var(--gradient-card)',
        }}>
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--color-accent-1)' }}>Ranked 1v1 Arena</h1>
          <p className="mb-8 text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to queue, accept duels, vote style, and sync results directly from Riot match data.
          </p>
          <Link href="/login" className="inline-flex px-6 py-3 font-semibold" style={primaryButtonStyle}>
            Login To Enter 1v1
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:py-10" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="p-6" style={{ ...cardStyle, background: 'var(--gradient-card)' }}>
          <div className="space-y-4">
            <p className="tracking-[0.24em] text-xs uppercase" style={{ color: 'var(--color-text-muted)' }}>Competitive queue</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold" style={{ color: 'var(--color-accent-1)' }}>
              Ranked 1v1 Arena
            </h1>
            <p className="max-w-3xl text-sm sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Queue solo. Accept in 3 minutes. Vote duel style in 1 minute. Get lobby handoff, report no-shows with evidence,
              and finish with Riot-verified result sync.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="px-3 py-1 text-xs font-semibold" style={infoButtonStyle}>Queue + Accept</span>
            <span className="px-3 py-1 text-xs font-semibold" style={infoButtonStyle}>Style Voting</span>
            <span className="px-3 py-1 text-xs font-semibold" style={infoButtonStyle}>Riot Sync</span>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-4 space-y-6">
            <article className="p-5" style={cardStyle}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>Your Ladder</p>
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {snapshot?.profile?.ladderTier?.tier || 'SILVER'} {snapshot?.profile?.ladderTier?.lp ?? 0} LP
                  </h2>
                </div>
                <span className="px-3 py-1 text-xs font-semibold" style={infoButtonStyle}>#{snapshot?.profile?.rankPosition || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3" style={panelStyle}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Wins</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--color-success)' }}>{snapshot?.profile?.wins ?? 0}</p>
                </div>
                <div className="p-3" style={panelStyle}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Losses</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--color-error)' }}>{snapshot?.profile?.losses ?? 0}</p>
                </div>
                <div className="p-3" style={panelStyle}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Winrate</p>
                  <p className="text-xl font-semibold" style={{ color: 'var(--color-accent-1)' }}>{(snapshot?.profile?.winrate ?? 0).toFixed(1)}%</p>
                </div>
              </div>
              <p className="mt-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Rating: {snapshot?.profile?.rating ?? 1000} • Games: {snapshot?.profile?.gamesPlayed ?? 0}
              </p>
            </article>

            <article className="p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Queue</h3>
                {snapshot?.queue && <span className="px-2 py-1 text-xs font-semibold" style={successButtonStyle}>Queued</span>}
              </div>

              {!hasLinkedRiotAccount ? (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    You need at least one linked and verified Riot account before entering ranked 1v1.
                  </p>
                  <Link href="/profile" className="inline-flex px-4 py-2 font-semibold" style={primaryButtonStyle}>
                    Link Riot Account
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--color-text-muted)' }}>
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
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
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
                      className="px-4 py-2 font-semibold disabled:opacity-50"
                      style={primaryButtonStyle}
                    >
                      {actionBusy === 'join-queue' ? 'Queueing...' : 'Join Queue'}
                    </button>
                    <button
                      onClick={handleLeaveQueue}
                      disabled={!snapshot?.queue || actionBusy !== null}
                      className="px-4 py-2 font-semibold disabled:opacity-50"
                      style={dangerButtonStyle}
                    >
                      {actionBusy === 'leave-queue' ? 'Leaving...' : 'Leave Queue'}
                    </button>
                  </div>

                  {snapshot?.queue ? (
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      In queue for {snapshot.queue.region} • waiting {snapshot.queue.waitingSeconds ?? 0}s
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Not currently queued.</p>
                  )}

                  <div className="p-3" style={panelStyle}>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-primary)' }}>Match-found notifications</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Browser: {typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'}
                      {' · '}
                      Discord DM: {snapshot?.profile?.discordDmNotifications ? 'enabled' : 'disabled'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={requestBrowserNotifications}
                        className="px-3 py-1.5 text-xs font-semibold"
                        style={infoButtonStyle}
                      >
                        Enable Browser Notifications
                      </button>
                      <Link href="/settings" className="px-3 py-1.5 text-xs font-semibold" style={secondaryButtonStyle}>
                        Discord DM Settings
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </article>
          </section>

          <section className="xl:col-span-8">
            <article className="p-5 min-h-[320px]" style={cardStyle}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>Live Duel</p>
                  <h3 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {activeChallenge
                      ? `vs ${opponentUsername || 'Opponent'}`
                      : 'No active match'}
                  </h3>
                </div>
                {activeChallenge && (
                  <span className="px-3 py-1 text-xs font-semibold uppercase" style={infoButtonStyle}>{activeChallenge.status.replace('_', ' ')}</span>
                )}
              </div>

              {!activeChallenge ? (
                <div className="p-4" style={panelStyle}>
                  <p style={{ color: 'var(--color-text-primary)' }}>Queue up to be matched with another ranked 1v1 player.</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                    Flow: queue → accept in 3 min → vote style in 1 min → lobby handoff → finish + Riot sync.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {['Match Found', 'Accept', 'Style Vote', 'Lobby', 'Finish + Sync'].map((label, index) => {
                      const activeStates = [
                        true,
                        ['PENDING', 'ACCEPTED', 'LOBBY_READY'].includes(activeChallenge.status),
                        ['ACCEPTED', 'LOBBY_READY'].includes(activeChallenge.status),
                        activeChallenge.status === 'LOBBY_READY',
                        activeChallenge.status === 'LOBBY_READY',
                      ];

                      return (
                        <div
                          key={label}
                          className="text-center text-xs px-2 py-2 font-semibold"
                          style={activeStates[index] ? infoButtonStyle : secondaryButtonStyle}
                        >
                          {index + 1}. {label}
                        </div>
                      );
                    })}
                  </div>

                  {activeChallenge.status === 'PENDING' && (
                    <div className="p-4" style={panelStyle}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>Accept Window</p>
                        <span className="px-3 py-1 text-xs font-semibold" style={warningButtonStyle}>{formatCountdown(acceptCountdown)}</span>
                      </div>
                      <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        Both players must accept within 3 minutes. Any player who does not accept takes a ranked loss.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        <div className="px-3 py-2 text-sm" style={panelStyle}>
                          You: {activeChallenge.myAccepted ? 'Accepted' : 'Pending'}
                        </div>
                        <div className="px-3 py-2 text-sm" style={panelStyle}>
                          Opponent: {activeChallenge.opponentAccepted ? 'Accepted' : 'Pending'}
                        </div>
                      </div>
                      <button
                        onClick={handleAcceptMatch}
                        disabled={Boolean(activeChallenge.myAccepted) || actionBusy !== null}
                        className="px-4 py-2 font-semibold disabled:opacity-50"
                        style={primaryButtonStyle}
                      >
                        {actionBusy === 'accept-match' ? 'Accepting...' : activeChallenge.myAccepted ? 'Accepted' : 'Accept Match'}
                      </button>
                    </div>
                  )}

                  {activeChallenge.status === 'ACCEPTED' && (
                    <div className="p-4" style={panelStyle}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>Style Voting</p>
                        <span className="px-3 py-1 text-xs font-semibold" style={warningButtonStyle}>{formatCountdown(styleCountdown)}</span>
                      </div>
                      <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
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
                              className="text-left p-3 border transition disabled:opacity-50"
                              style={{
                                ...panelStyle,
                                borderColor: selected ? 'var(--color-accent-1)' : 'var(--color-border)',
                                backgroundColor: selected ? 'var(--accent-info-bg)' : 'var(--color-bg-tertiary)',
                              }}
                            >
                              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{option.title}</p>
                              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{option.summary}</p>
                              {actionBusy === loadingKey && (
                                <p className="text-xs mt-2" style={{ color: 'var(--color-accent-1)' }}>Saving choice...</p>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="px-3 py-2 text-sm" style={panelStyle}>Your choice: {getStyleLabel(myStyleChoice)}</div>
                        <div className="px-3 py-2 text-sm" style={panelStyle}>Opponent choice: {getStyleLabel(opponentStyleChoice)}</div>
                      </div>
                    </div>
                  )}

                  {activeChallenge.status === 'LOBBY_READY' && (
                    <div className="p-4 space-y-4" style={panelStyle}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>Lobby Handoff</p>
                        <span className="px-3 py-1 text-xs font-semibold uppercase" style={successButtonStyle}>{getStyleLabel(activeChallenge.resolvedStyle)}</span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="p-3" style={panelStyle}>
                          <p className="text-xs uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--color-text-muted)' }}>Role Assignment</p>
                          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {activeChallenge.customGameSetup?.creatorUserId === user?.id
                              ? 'You create the custom game lobby in client.'
                              : `${activeChallenge.customGameSetup?.creatorUsername || 'Opponent'} creates the custom game lobby.`}
                          </p>
                          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {activeChallenge.customGameSetup?.joinerUserId === user?.id
                              ? 'You join using code + password below.'
                              : `${activeChallenge.customGameSetup?.joinerUsername || 'Opponent'} joins using your code.`}
                          </p>
                        </div>

                        <div className="p-3 space-y-2" style={panelStyle}>
                          <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Game Credentials</p>
                          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 text-xs" style={panelStyle}>
                            <strong style={{ color: 'var(--color-text-secondary)' }}>Lobby Code</strong>
                            <span style={{ color: 'var(--color-text-primary)' }}>{activeChallenge.lobbyName || 'Not generated'}</span>
                            <button onClick={() => copyText(activeChallenge.lobbyName || '', 'Lobby code')} className="px-2 py-1 text-xs" style={secondaryButtonStyle}>Copy</button>
                          </div>
                          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 text-xs" style={panelStyle}>
                            <strong style={{ color: 'var(--color-text-secondary)' }}>Password</strong>
                            <span style={{ color: 'var(--color-text-primary)' }}>{activeChallenge.lobbyPassword || 'Not generated'}</span>
                            <button onClick={() => copyText(activeChallenge.lobbyPassword || '', 'Lobby password')} className="px-2 py-1 text-xs" style={secondaryButtonStyle}>Copy</button>
                          </div>
                        </div>
                      </div>

                      {activeChallenge.customGameSetup?.styleDetails && (
                        <div className="p-3" style={panelStyle}>
                          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{activeChallenge.customGameSetup.styleDetails.title}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{activeChallenge.customGameSetup.styleDetails.summary}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleFinishMatch}
                          disabled={actionBusy !== null}
                          className="px-4 py-2 font-semibold disabled:opacity-50"
                          style={primaryButtonStyle}
                        >
                          {actionBusy === 'finish-match' ? 'Submitting...' : 'Match Finished'}
                        </button>
                        <button
                          onClick={handleManualSync}
                          disabled={actionBusy !== null}
                          className="px-4 py-2 font-semibold disabled:opacity-50"
                          style={infoButtonStyle}
                        >
                          {actionBusy === 'manual-sync' ? 'Syncing...' : 'Sync Result Now'}
                        </button>
                        <input
                          type="text"
                          value={manualMatchId}
                          onChange={(event) => setManualMatchId(event.target.value)}
                          placeholder="Optional Riot matchId"
                          className="px-3 py-2 text-sm"
                          style={{
                            ...panelStyle,
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="p-4" style={panelStyle}>
                      <p className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Give Up</p>
                      <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        You can surrender at any phase. This records a loss and awards the opponent the win.
                      </p>
                      <button
                        onClick={handleGiveUp}
                        disabled={actionBusy !== null}
                        className="px-4 py-2 font-semibold disabled:opacity-50"
                        style={dangerButtonStyle}
                      >
                        {actionBusy === 'give-up' ? 'Processing...' : 'Give Up Match'}
                      </button>
                    </div>

                    <div className="p-4" style={panelStyle}>
                      <p className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Report Opponent</p>
                      <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        Submit details if your opponent dodges, breaks rules, or refuses to continue. Add screenshot URLs as evidence.
                      </p>
                      <textarea
                        value={reportReason}
                        onChange={(event) => setReportReason(event.target.value)}
                        rows={3}
                        placeholder="Describe what happened..."
                        className="w-full px-3 py-2 text-sm mb-2"
                        style={{
                          ...panelStyle,
                          color: 'var(--color-text-primary)',
                        }}
                      />
                      <textarea
                        value={reportEvidenceText}
                        onChange={(event) => setReportEvidenceText(event.target.value)}
                        rows={2}
                        placeholder="Evidence URLs (one per line)"
                        className="w-full px-3 py-2 text-sm mb-2"
                        style={{
                          ...panelStyle,
                          color: 'var(--color-text-primary)',
                        }}
                      />
                      <button
                        onClick={handleReportIssue}
                        disabled={actionBusy !== null}
                        className="px-4 py-2 font-semibold disabled:opacity-50"
                        style={warningButtonStyle}
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
          <section className="xl:col-span-7 p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Top Ranked 1v1 Players</h3>
              <Link href="/leaderboards" className="text-sm" style={{ color: 'var(--color-accent-1)' }}>Global leaderboards</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr style={{ color: 'var(--color-text-muted)' }}>
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
                    <tr key={entry.userId} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="py-2 pr-2" style={{ color: 'var(--color-accent-1)' }}>{entry.rank}</td>
                      <td className="py-2 pr-2" style={{ color: 'var(--color-text-primary)' }}>{entry.username}</td>
                      <td className="py-2 pr-2" style={{ color: 'var(--color-text-secondary)' }}>{entry.ladderTier.tier} {entry.ladderTier.lp} LP</td>
                      <td className="py-2 pr-2" style={{ color: 'var(--color-text-secondary)' }}>{entry.rating}</td>
                      <td className="py-2 pr-2" style={{ color: 'var(--color-text-secondary)' }}>{entry.wins}-{entry.losses}-{entry.draws}</td>
                      <td className="py-2 pr-2" style={{ color: 'var(--color-success)' }}>{entry.winrate.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-5 text-center" style={{ color: 'var(--color-text-muted)' }}>
                        No ranked 1v1 games recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="xl:col-span-5 p-5" style={cardStyle}>
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Recent Duels</h3>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {history.map((challenge) => {
                const ratingDelta = challenge.myRole === 'CHALLENGER'
                  ? (challenge.challengerRatingDelta ?? 0)
                  : (challenge.opponentRatingDelta ?? 0);

                return (
                  <div key={challenge.id} className="p-3" style={panelStyle}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {challenge.challengerUsername || 'Player'} vs {challenge.opponentUsername || 'Player'}
                      </p>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{challenge.status}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Result: {challenge.winnerUsername ? `${challenge.winnerUsername} won` : 'No winner'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: ratingDelta >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                      LP impact (you): {ratingDelta >= 0 ? '+' : ''}{ratingDelta}
                    </p>
                  </div>
                );
              })}
              {history.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No duel history yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
