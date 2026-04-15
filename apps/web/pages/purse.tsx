import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FaArrowDown,
  FaArrowUp,
  FaBullhorn,
  FaBolt,
  FaCheckCircle,
  FaClock,
  FaGem,
  FaMagic,
  FaPalette,
  FaWallet,
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from '@components/GlobalUI';
import { getAuthHeader } from '../utils/auth';
import PrismaticEssenceIcon from '../src/components/PrismaticEssenceIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type TransactionCurrencyFilter = 'ALL' | 'PRISMATIC_ESSENCE';

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

type WalletTransaction = {
  id: string;
  currency: 'RIFT_COINS' | 'PRISMATIC_ESSENCE';
  type: string;
  amount: number;
  balanceAfter: number;
  note?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
};

type WalletQuest = {
  key: string;
  title: string;
  description: string;
  rewardPrismaticEssence: number;
  repeatWindow: 'DAILY' | 'ONE_TIME';
  available: boolean;
  eligible: boolean;
  completed: boolean;
  reason: string | null;
  nextClaimAt: string | null;
};

type WalletAction = {
  key: string;
  title: string;
  description: string;
  category: 'Loot' | 'Cosmetic' | 'Community';
  costPrismaticEssence: number;
  repeatable: boolean;
  owned: boolean;
  available: boolean;
  blockedReason: string | null;
  badgePreview: {
    key: string;
    name: string;
    icon: string;
  } | null;
};

function formatSignedAmount(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toLocaleString()} PE`;
}

function transactionLabel(type: string) {
  const labelMap: Record<string, string> = {
    WELCOME_BONUS: 'Genesis Grant',
    QUEST_REWARD: 'Quest Reward',
    SHOP_PURCHASE: 'Action Purchase',
    ADMIN_ADJUSTMENT: 'Action Reward',
    CONVERT_BUY_PRISMATIC: 'Legacy Conversion',
    CONVERT_SELL_PRISMATIC: 'Legacy Conversion',
  };

  return labelMap[type] || type;
}

export default function PursePage() {
  const { user } = useAuth();
  const { showToast } = useGlobalUI();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<WalletSummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [quests, setQuests] = useState<WalletQuest[]>([]);
  const [actions, setActions] = useState<WalletAction[]>([]);
  const [questLoadingMap, setQuestLoadingMap] = useState<Record<string, boolean>>({});
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});
  const [transactionFilter, setTransactionFilter] = useState<TransactionCurrencyFilter>('ALL');

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

  const loadQuests = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return [] as WalletQuest[];

    const res = await fetch(`${API_URL}/api/wallet/quests`, { headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load quests.');
    }

    return (data?.quests || []) as WalletQuest[];
  }, [authHeaders]);

  const loadActions = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return [] as WalletAction[];

    const res = await fetch(`${API_URL}/api/wallet/actions`, { headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load actions.');
    }

    return (data?.actions || []) as WalletAction[];
  }, [authHeaders]);

  const loadTransactions = useCallback(async (filter: TransactionCurrencyFilter) => {
    const headers = authHeaders();
    if (!headers) return [] as WalletTransaction[];

    const params = new URLSearchParams({
      limit: '40',
      offset: '0',
      currency: filter,
    });

    const res = await fetch(`${API_URL}/api/wallet/transactions?${params.toString()}`, { headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load transactions.');
    }

    return (data?.transactions || []) as WalletTransaction[];
  }, [authHeaders]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setTransactionsLoading(true);

      try {
        const [nextSummary, nextQuests, nextActions, nextTransactions] = await Promise.all([
          loadSummary(),
          loadQuests(),
          loadActions(),
          loadTransactions(transactionFilter),
        ]);

        if (!active) return;

        setSummary(nextSummary);
        setQuests(nextQuests);
        setActions(nextActions);
        setTransactions(nextTransactions);
      } catch (error: any) {
        if (!active) return;
        showToast(error?.message || 'Failed to load purse data.', 'error');
      } finally {
        if (active) {
          setLoading(false);
          setTransactionsLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [user, loadSummary, loadQuests, loadActions, loadTransactions, transactionFilter, showToast]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const [nextSummary, nextQuests, nextActions] = await Promise.all([
          loadSummary(),
          loadQuests(),
          loadActions(),
        ]);
        setSummary(nextSummary);
        setQuests(nextQuests);
        setActions(nextActions);
      } catch {
        // Silent poll failure
      }
    }, 45_000);

    return () => clearInterval(interval);
  }, [user, loadSummary, loadQuests, loadActions]);

  const handleClaimQuest = async (quest: WalletQuest) => {
    if (!quest.available || !user) return;

    setQuestLoadingMap((prev) => ({ ...prev, [quest.key]: true }));

    try {
      const headers = authHeaders();
      if (!headers) {
        throw new Error('Please sign in first.');
      }

      const res = await fetch(`${API_URL}/api/wallet/quests/${quest.key}/claim`, {
        method: 'POST',
        headers,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to claim quest reward.');
      }

      setSummary(data.summary as WalletSummaryResponse);
      setQuests((data.quests || []) as WalletQuest[]);
      showToast(`+${quest.rewardPrismaticEssence.toLocaleString()} Prismatic Essence claimed!`, 'success');

      const [nextTransactions, nextActions] = await Promise.all([
        loadTransactions(transactionFilter),
        loadActions(),
      ]);
      setTransactions(nextTransactions);
      setActions(nextActions);
    } catch (error: any) {
      showToast(error?.message || 'Failed to claim quest reward.', 'error');
    } finally {
      setQuestLoadingMap((prev) => ({ ...prev, [quest.key]: false }));
    }
  };

  const handlePurchaseAction = async (action: WalletAction) => {
    if (!action.available || !user) return;

    setActionLoadingMap((prev) => ({ ...prev, [action.key]: true }));

    try {
      const headers = authHeaders();
      if (!headers) {
        throw new Error('Please sign in first.');
      }

      const res = await fetch(`${API_URL}/api/wallet/actions/${action.key}/purchase`, {
        method: 'POST',
        headers,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to execute action.');
      }

      setSummary(data.summary as WalletSummaryResponse);
      setActions((data.actions || []) as WalletAction[]);

      const result = data?.result;
      if (result?.rewardPrismaticEssence > 0) {
        showToast(
          `${result.cacheTier || 'Lucky'} cache! +${Number(result.rewardPrismaticEssence).toLocaleString()} PE (${Number(result.netPrismaticEssence).toLocaleString()} net).`,
          'success'
        );
      } else if (result?.badgeGranted) {
        showToast('Cosmetic unlocked on your profile badges.', 'success');
      } else {
        showToast('Action completed.', 'success');
      }

      const nextTransactions = await loadTransactions(transactionFilter);
      setTransactions(nextTransactions);
    } catch (error: any) {
      showToast(error?.message || 'Failed to execute action.', 'error');
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [action.key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-10" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-center py-24">
          <div
            className="h-14 w-14 rounded-full animate-spin border-4 border-t-transparent"
            style={{ borderColor: '#67e8f9', borderTopColor: 'transparent' }}
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
            background: 'linear-gradient(155deg, rgba(34,211,238,0.12), rgba(168,85,247,0.08), rgba(244,114,182,0.1))',
          }}
        >
          <h1 className="text-3xl font-bold mb-3 flex items-center justify-center gap-2" style={{ color: '#93c5fd' }}>
            <PrismaticEssenceIcon className="text-3xl" />
            Prismatic Purse
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Log in to claim quests, open caches, and forge exclusive prismatic cosmetics.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6)',
              color: '#0b1220',
            }}
          >
            <FaWallet />
            Log in to open purse
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
          radial-gradient(1100px 520px at -10% -10%, rgba(34,211,238,0.2), transparent 58%),
          radial-gradient(900px 500px at 110% 0%, rgba(244,114,182,0.16), transparent 62%),
          radial-gradient(700px 420px at 50% 100%, rgba(167,139,250,0.14), transparent 68%),
          var(--color-bg-primary)
        `,
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <header
          className="rounded-2xl border p-6"
          style={{
            borderColor: 'rgba(125, 211, 252, 0.32)',
            background: 'linear-gradient(145deg, rgba(12,17,29,0.95), rgba(26,18,39,0.86))',
            boxShadow: '0 20px 48px rgba(17, 24, 39, 0.42)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] mb-2" style={{ color: '#93c5fd' }}>
                Prismatic Essence
              </p>
              <h1 className="text-3xl sm:text-4xl font-black mb-2 flex items-center gap-3" style={{ color: '#e2e8f0' }}>
                <PrismaticEssenceIcon className="text-4xl" />
                Purse
              </h1>
              <p className="text-sm max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
                Earn PE from quests, then spend it on cosmetics, adspace credits, and quick actions.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/cosmetics"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: 'rgba(125,211,252,0.18)',
                    color: '#93c5fd',
                    border: '1px solid rgba(125,211,252,0.35)',
                  }}
                >
                  <FaPalette /> Cosmetics Shop
                </Link>
                <Link
                  href="/adspace"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: 'rgba(249, 168, 212, 0.18)',
                    color: '#f9a8d4',
                    border: '1px solid rgba(249, 168, 212, 0.35)',
                  }}
                >
                  <FaBullhorn /> Adspace
                </Link>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-wide" style={{ color: '#93c5fd' }}>
                Current Balance
              </p>
              <p className="text-3xl font-black inline-flex items-center gap-2" style={{ color: '#f8fafc' }}>
                <PrismaticEssenceIcon className="text-3xl" />
                {(summary?.wallet.prismaticEssence || 0).toLocaleString()} PE
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Last update: {summary ? new Date(summary.wallet.updatedAt).toLocaleString() : '-'}
              </p>
            </div>
          </div>

          <div className="mt-5 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148, 163, 184, 0.22)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${summary?.progression.progressPct || 0}%`,
                background: 'linear-gradient(90deg, #22d3ee, #60a5fa, #a78bfa, #f472b6)',
                transition: 'width 280ms ease',
              }}
            />
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Level {summary?.progression.level || 1} • {summary?.progression.currentProgress.toLocaleString() || 0} / 1,000 PE toward next level
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(56,189,248,0.42)', background: 'rgba(56,189,248,0.12)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Total Earned</span>
              <FaArrowUp style={{ color: '#7dd3fc' }} />
            </div>
            <p className="text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              {(summary?.wallet.totalPrismaticEarned || 0).toLocaleString()}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>Lifetime Prismatic Essence gained.</p>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(244,114,182,0.42)', background: 'rgba(244,114,182,0.12)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Total Spent</span>
              <FaArrowDown style={{ color: '#f9a8d4' }} />
            </div>
            <p className="text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              {(summary?.wallet.totalPrismaticSpent || 0).toLocaleString()}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>Spent on cosmetics, caches, and community actions.</p>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(167,139,250,0.42)', background: 'rgba(167,139,250,0.12)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Prismatic Level</span>
              <FaGem style={{ color: '#c4b5fd' }} />
            </div>
            <p className="text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              L{summary?.progression.level || 1}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              {summary?.progression.progressPct || 0}% progress to the next milestone.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(16,20,30,0.9)' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#93c5fd' }}>
              <FaBolt />
              Quests
            </h2>
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {quests.map((quest) => (
                <div key={quest.key} className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{quest.title}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{quest.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold inline-flex items-center gap-1" style={{ color: '#67e8f9' }}>
                        <PrismaticEssenceIcon />
                        +{quest.rewardPrismaticEssence.toLocaleString()}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {quest.repeatWindow === 'DAILY' ? 'Daily' : 'One-time'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {quest.available && (
                        <span className="inline-flex items-center gap-1" style={{ color: '#86efac' }}>
                          <FaBolt /> Ready to claim
                        </span>
                      )}
                      {!quest.available && quest.completed && (
                        <span className="inline-flex items-center gap-1" style={{ color: '#93c5fd' }}>
                          <FaCheckCircle /> Claimed
                        </span>
                      )}
                      {!quest.available && !quest.completed && (
                        <span className="inline-flex items-center gap-1" style={{ color: '#fda4af' }}>
                          <FaClock /> {quest.reason || 'Locked'}
                        </span>
                      )}
                      {!quest.available && quest.nextClaimAt && (
                        <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          Next claim: {new Date(quest.nextClaimAt).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleClaimQuest(quest)}
                      disabled={!quest.available || Boolean(questLoadingMap[quest.key])}
                      className="px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: quest.available ? 'rgba(34,197,94,0.22)' : 'var(--color-bg-tertiary)',
                        color: quest.available ? '#86efac' : 'var(--color-text-muted)',
                        border: `1px solid ${quest.available ? 'rgba(34,197,94,0.5)' : 'var(--color-border)'}`,
                      }}
                    >
                      {questLoadingMap[quest.key] ? 'Claiming...' : 'Claim'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(14,20,34,0.9)' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#c4b5fd' }}>
              <FaMagic />
              Quick Actions
            </h2>
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {actions.map((action) => {
                const categoryIcon = action.category === 'Loot'
                  ? <FaGem />
                  : action.category === 'Cosmetic'
                    ? <FaPalette />
                    : <FaBolt />;

                return (
                  <div key={action.key} className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-sm inline-flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                          {categoryIcon}
                          {action.title}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{action.description}</p>
                        <p className="text-[11px] mt-1" style={{ color: '#93c5fd' }}>
                          {action.category} {action.repeatable ? '• Repeatable' : '• One-time'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold inline-flex items-center gap-1" style={{ color: '#67e8f9' }}>
                          <PrismaticEssenceIcon />
                          {action.costPrismaticEssence.toLocaleString()}
                        </p>
                        {action.owned && (
                          <p className="text-[11px]" style={{ color: '#86efac' }}>Owned</p>
                        )}
                      </div>
                    </div>

                    {action.blockedReason && (
                      <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{action.blockedReason}</p>
                    )}

                    <button
                      onClick={() => handlePurchaseAction(action)}
                      disabled={!action.available || Boolean(actionLoadingMap[action.key])}
                      className="w-full px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{
                        background: action.available
                          ? 'linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6)'
                          : 'var(--color-bg-tertiary)',
                        color: action.available ? '#0b1220' : 'var(--color-text-muted)',
                        border: `1px solid ${action.available ? 'rgba(125,211,252,0.6)' : 'var(--color-border)'}`,
                      }}
                    >
                      {actionLoadingMap[action.key] ? 'Processing...' : 'Use Action'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(15,20,30,0.88)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold" style={{ color: '#93c5fd' }}>Transaction Timeline</h2>
            <div className="flex gap-2">
              {(['ALL', 'PRISMATIC_ESSENCE'] as TransactionCurrencyFilter[]).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setTransactionFilter(filterKey)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: transactionFilter === filterKey ? 'rgba(125,211,252,0.2)' : 'var(--color-bg-tertiary)',
                    color: transactionFilter === filterKey ? '#7dd3fc' : 'var(--color-text-secondary)',
                    border: `1px solid ${transactionFilter === filterKey ? 'rgba(125,211,252,0.45)' : 'var(--color-border)'}`,
                  }}
                >
                  {filterKey === 'ALL' ? 'All' : 'Prismatic'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {transactionsLoading ? (
              <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                No transactions yet.
              </div>
            ) : transactions.map((tx) => {
              const positive = tx.amount >= 0;
              return (
                <div key={tx.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{
                          backgroundColor: positive ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.16)',
                          color: positive ? '#86efac' : '#fda4af',
                        }}>
                          {positive ? <FaArrowUp size={11} /> : <FaArrowDown size={11} />}
                        </span>
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {transactionLabel(tx.type)}
                        </p>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {tx.note || 'No memo'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: positive ? '#86efac' : '#fda4af' }}>
                        {formatSignedAmount(tx.amount)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Balance: {tx.balanceAfter.toLocaleString()} {tx.currency === 'PRISMATIC_ESSENCE' ? 'PE' : 'legacy RC'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
