import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaArrowLeft,
  FaBolt,
  FaDice,
  FaGem,
  FaSkull,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalUI } from '@components/GlobalUI';
import { getAuthHeader } from '../../utils/auth';
import PrismaticEssenceIcon from '../../src/components/PrismaticEssenceIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type WalletSummaryResponse = {
  wallet: {
    prismaticEssence: number;
    totalPrismaticEarned: number;
    totalPrismaticSpent: number;
    updatedAt: string;
  };
  progression: {
    level: number;
    currentProgress: number;
    nextLevelAt: number;
    progressPct: number;
  };
};

type GambleGame = {
  key: string;
  title: string;
  description: string;
  minWager: number;
  maxWager: number;
  singlePlayerOnly: boolean;
  choices: string[] | null;
  available: boolean;
  blockedReason: string | null;
};

type GambleResult = {
  gameKey: string;
  title: string;
  choice: string | null;
  wager: number;
  payout: number;
  netPrismaticEssence: number;
  won: boolean;
  outcomeLabel: string;
  outcomeDetail: string;
  multiplier: number;
  rollValue: number | null;
  singlePlayerOnly: boolean;
  newBalance: number;
};

export default function PurseGamblePage() {
  const { user } = useAuth();
  const { showToast } = useGlobalUI();

  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [summary, setSummary] = useState<WalletSummaryResponse | null>(null);
  const [games, setGames] = useState<GambleGame[]>([]);
  const [selectedGameKey, setSelectedGameKey] = useState<string>('');
  const [wagerInput, setWagerInput] = useState('100');
  const [choice, setChoice] = useState('');
  const [lastResult, setLastResult] = useState<GambleResult | null>(null);

  const authHeaders = useCallback(() => {
    const headers = getAuthHeader();
    if (!headers || !('Authorization' in headers)) return null;
    return headers as Record<string, string>;
  }, []);

  const loadSummary = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return null;

    const res = await fetch(`${API_URL}/api/wallet/summary`, { headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load purse summary.');
    }

    return data as WalletSummaryResponse;
  }, [authHeaders]);

  const loadGames = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return [] as GambleGame[];

    const res = await fetch(`${API_URL}/api/wallet/gamble/games`, { headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load gamble games.');
    }

    return (data?.games || []) as GambleGame[];
  }, [authHeaders]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [nextSummary, nextGames] = await Promise.all([
          loadSummary(),
          loadGames(),
        ]);

        if (!active) return;

        setSummary(nextSummary);
        setGames(nextGames);
        setSelectedGameKey((prev) => {
          if (prev && nextGames.some((game) => game.key === prev)) {
            return prev;
          }
          return nextGames[0]?.key || '';
        });
      } catch (error: any) {
        if (active) {
          showToast(error?.message || 'Failed to load gamble page.', 'error');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [user, loadSummary, loadGames, showToast]);

  const selectedGame = useMemo(
    () => games.find((game) => game.key === selectedGameKey) || null,
    [games, selectedGameKey]
  );

  useEffect(() => {
    if (!selectedGame) return;
    setWagerInput(String(selectedGame.minWager));
    setChoice(selectedGame.choices?.[0] || '');
  }, [selectedGame?.key]);

  const playSelectedGame = async () => {
    if (!selectedGame || !user || playing) return;

    const wager = Math.round(Number(wagerInput));
    if (!Number.isFinite(wager)) {
      showToast('Enter a valid wager amount.', 'error');
      return;
    }

    if (wager < selectedGame.minWager || wager > selectedGame.maxWager) {
      showToast(
        `Wager must be between ${selectedGame.minWager.toLocaleString()} and ${selectedGame.maxWager.toLocaleString()} PE.`,
        'error'
      );
      return;
    }

    if (Array.isArray(selectedGame.choices) && selectedGame.choices.length > 0 && !choice) {
      showToast('Pick an option before playing.', 'error');
      return;
    }

    setPlaying(true);

    try {
      const headers = authHeaders();
      if (!headers) {
        throw new Error('Please sign in first.');
      }

      const res = await fetch(`${API_URL}/api/wallet/gamble/${selectedGame.key}/play`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wager,
          choice: selectedGame.choices ? choice : undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to play this gamble game.');
      }

      setLastResult((data?.result || null) as GambleResult | null);
      setSummary((data?.summary || null) as WalletSummaryResponse | null);
      setGames((data?.games || []) as GambleGame[]);

      if (data?.result?.won) {
        showToast(`You won ${Number(data.result.payout || 0).toLocaleString()} PE!`, 'success');
      } else {
        showToast('No payout this round.', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'Failed to play this gamble game.', 'error');
    } finally {
      setPlaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-10" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-center py-24">
          <div
            className="h-14 w-14 rounded-full animate-spin border-4 border-t-transparent"
            style={{ borderColor: '#a78bfa', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen px-4 py-10" style={{ background: 'var(--color-bg-primary)' }}>
        <div
          className="max-w-2xl mx-auto rounded-2xl border p-8 text-center"
          style={{
            borderColor: 'var(--color-border)',
            background: 'linear-gradient(145deg, rgba(56,189,248,0.14), rgba(167,139,250,0.12))',
          }}
        >
          <h1 className="text-3xl font-bold mb-3 flex items-center justify-center gap-2" style={{ color: '#ddd6fe' }}>
            <FaDice />
            Prismatic Gamble
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to access single-player gamble modes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6)',
              color: '#0b1220',
            }}
          >
            <FaBolt />
            Log in to continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        background: `
          radial-gradient(900px 460px at -8% -8%, rgba(167,139,250,0.24), transparent 58%),
          radial-gradient(840px 420px at 108% 0%, rgba(56,189,248,0.18), transparent 62%),
          radial-gradient(760px 440px at 50% 100%, rgba(244,114,182,0.12), transparent 68%),
          var(--color-bg-primary)
        `,
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <header
          className="rounded-2xl border p-6"
          style={{
            borderColor: 'rgba(167,139,250,0.34)',
            background: 'linear-gradient(145deg, rgba(12,17,29,0.94), rgba(32,20,53,0.84))',
            boxShadow: '0 18px 44px rgba(17, 24, 39, 0.42)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <Link
                href="/purse"
                className="inline-flex items-center gap-2 text-xs font-semibold mb-3"
                style={{ color: '#93c5fd' }}
              >
                <FaArrowLeft /> Back to Purse
              </Link>
              <h1 className="text-3xl font-black inline-flex items-center gap-3" style={{ color: '#f8fafc' }}>
                <FaDice style={{ color: '#ddd6fe' }} />
                Prismatic Gamble
              </h1>
              <p className="text-sm mt-2 max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
                Solo PE games only. Pick a mode, place your wager, and see instant results.
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-wide" style={{ color: '#c4b5fd' }}>
                Current Balance
              </p>
              <p className="text-3xl font-black inline-flex items-center gap-2" style={{ color: '#f8fafc' }}>
                <PrismaticEssenceIcon className="text-3xl" />
                {(summary?.wallet.prismaticEssence || 0).toLocaleString()} PE
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border px-3 py-2 text-xs inline-flex items-center gap-2" style={{
            borderColor: 'rgba(56,189,248,0.38)',
            background: 'rgba(56, 189, 248, 0.12)',
            color: '#bae6fd',
          }}>
            <FaDice />
            Single-player only. No player-to-player betting or wagering.
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(16,20,30,0.9)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#c4b5fd' }}>Available Games</h2>
            <div className="space-y-3">
              {games.map((game) => {
                const selected = selectedGameKey === game.key;
                return (
                  <button
                    key={game.key}
                    type="button"
                    onClick={() => setSelectedGameKey(game.key)}
                    className="w-full text-left rounded-xl border p-4"
                    style={{
                      borderColor: selected ? 'rgba(167,139,250,0.62)' : 'var(--color-border)',
                      background: selected
                        ? 'linear-gradient(145deg, rgba(167,139,250,0.2), rgba(56,189,248,0.08))'
                        : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <p className="font-semibold text-sm" style={{ color: selected ? '#e9d5ff' : 'var(--color-text-primary)' }}>{game.title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{game.description}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                      <span>Min: {game.minWager.toLocaleString()} PE</span>
                      <span>Max: {game.maxWager.toLocaleString()} PE</span>
                      <span>{game.choices?.length ? `Choices: ${game.choices.join(' / ')}` : 'No pick required'}</span>
                      <span>{game.available ? 'Ready to play' : game.blockedReason || 'Unavailable'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(14,20,34,0.9)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#93c5fd' }}>Play Round</h2>

            {!selectedGame ? (
              <div className="rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                No game selected.
              </div>
            ) : (
              <>
                <div className="rounded-lg border p-4 mb-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{selectedGame.title}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{selectedGame.description}</p>
                </div>

                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Wager (PE)
                </label>
                <input
                  type="number"
                  min={selectedGame.minWager}
                  max={selectedGame.maxWager}
                  value={wagerInput}
                  onChange={(event) => setWagerInput(event.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm mb-3"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                  }}
                />

                {Array.isArray(selectedGame.choices) && selectedGame.choices.length > 0 && (
                  <>
                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Pick your side</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedGame.choices.map((entry) => (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => setChoice(entry)}
                          className="px-3 py-1.5 rounded-md border text-xs font-semibold"
                          style={{
                            borderColor: choice === entry ? 'rgba(56,189,248,0.55)' : 'var(--color-border)',
                            backgroundColor: choice === entry ? 'rgba(56,189,248,0.18)' : 'var(--color-bg-tertiary)',
                            color: choice === entry ? '#7dd3fc' : 'var(--color-text-secondary)',
                          }}
                        >
                          {entry}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={playSelectedGame}
                  disabled={playing}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6)',
                    color: '#0b1220',
                    opacity: playing ? 0.7 : 1,
                  }}
                >
                  {playing ? 'Playing...' : 'Play Round'}
                </button>

                <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  This is strictly single-player gambling. No PvP or player-to-player transfer is involved.
                </p>
              </>
            )}
          </div>
        </section>

        {lastResult && (
          <section className="rounded-2xl border p-6" style={{
            borderColor: lastResult.won ? 'rgba(34,197,94,0.42)' : 'rgba(239,68,68,0.42)',
            backgroundColor: lastResult.won ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          }}>
            <h2 className="text-lg font-bold mb-3 inline-flex items-center gap-2" style={{ color: lastResult.won ? '#86efac' : '#fda4af' }}>
              {lastResult.won ? <FaGem /> : <FaSkull />}
              Last Result
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
              <p>Game: <strong>{lastResult.title}</strong></p>
              <p>Outcome: <strong>{lastResult.outcomeLabel}</strong> ({lastResult.outcomeDetail})</p>
              <p>Wager: <strong>{lastResult.wager.toLocaleString()} PE</strong></p>
              <p>Payout: <strong>{lastResult.payout.toLocaleString()} PE</strong></p>
              <p>Net: <strong style={{ color: lastResult.netPrismaticEssence >= 0 ? '#86efac' : '#fda4af' }}>
                {lastResult.netPrismaticEssence >= 0 ? '+' : ''}{lastResult.netPrismaticEssence.toLocaleString()} PE
              </strong></p>
              <p>Balance After: <strong>{lastResult.newBalance.toLocaleString()} PE</strong></p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
