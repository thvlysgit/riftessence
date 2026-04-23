import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FaBullhorn,
  FaArrowDown,
  FaArrowUp,
  FaBolt,
  FaCheckCircle,
  FaClock,
  FaDice,
  FaGem,
  FaMagic,
  FaPalette,
  FaWallet,
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from '@components/GlobalUI';
import { getAuthHeader } from '../utils/auth';
import PrismaticEssenceIcon from '../src/components/PrismaticEssenceIcon';
import { useLanguage } from '../contexts/LanguageContext';

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

type QuestCompletionLink = {
  label: string;
  href: string;
  external?: boolean;
};

const SUPPORT_DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_SUPPORT_DISCORD_INVITE_URL || 'https://discord.gg/uypaWqmxx6';

const QUEST_COMPLETION_LINKS: Record<string, QuestCompletionLink[]> = {
  DAILY_SOCIAL_SPARK: [
    { label: 'Create Duo Post', href: '/create' },
    { label: 'Open Feed', href: '/feed' },
  ],
  COMPLETE_PROFILE: [
    { label: 'Complete Profile', href: '/profile' },
    { label: 'Open Settings', href: '/settings' },
  ],
  CREATE_FIRST_DUO_POST: [
    { label: 'Create Duo Post', href: '/create' },
  ],
  CREATE_FIRST_LFT_POST: [
    { label: 'Open LFT', href: '/lft' },
  ],
  JOIN_FIRST_COMMUNITY: [
    { label: 'Browse Communities', href: '/communities' },
  ],
  LINK_DISCORD_ACCOUNT: [
    { label: 'Connect Discord', href: '/profile' },
  ],
  ENABLE_DISCORD_DMS: [
    { label: 'Discord DM Settings', href: '/settings' },
  ],
  JOIN_SUPPORT_SERVER: [
    { label: 'Join Support Discord', href: SUPPORT_DISCORD_INVITE_URL, external: true },
    { label: 'Open Profile', href: '/profile' },
  ],
  RECEIVE_FIRST_FEEDBACK: [
    { label: 'Open Profile', href: '/profile' },
    { label: 'Open Feed', href: '/feed' },
  ],
  SEND_FIRST_CHAT_MESSAGE: [
    { label: 'Open Feed', href: '/feed' },
  ],
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
  const { currentLanguage } = useLanguage();
  const { showToast } = useGlobalUI();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<WalletSummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [quests, setQuests] = useState<WalletQuest[]>([]);
  const [questLoadingMap, setQuestLoadingMap] = useState<Record<string, boolean>>({});
  const [transactionFilter, setTransactionFilter] = useState<TransactionCurrencyFilter>('ALL');

  const text = currentLanguage === 'fr'
    ? {
        loginTitle: 'Bourse prismatique',
        loginDesc: 'Connectez-vous pour réclamer des quêtes, ouvrir des caches et débloquer des cosmétiques prismatiques exclusifs.',
        loginButton: 'Se connecter pour ouvrir la bourse',
        title: 'Bourse',
        subtitle: 'Gagnez des PE grâce aux quêtes, puis dépensez-les en cosmétiques, publicités et jeux solo désavantageux.',
        currentBalance: 'Solde actuel',
        lastUpdate: 'Dernière mise à jour',
        totalEarned: 'Total gagné',
        totalSpent: 'Total dépensé',
        level: 'Niveau prismatique',
        quests: 'Quêtes',
        quickActions: 'Actions rapides',
        transactions: 'Historique des transactions',
        loadingTransactions: 'Chargement des transactions...',
        noTransactions: 'Aucune transaction pour le moment.',
      }
    : {
        loginTitle: 'Prismatic Purse',
        loginDesc: 'Log in to claim quests, open caches, and forge exclusive prismatic cosmetics.',
        loginButton: 'Log in to open purse',
        title: 'Purse',
        subtitle: 'Earn PE from quests, then spend it on cosmetics, adspace campaigns, and house-favored solo gambling.',
        currentBalance: 'Current Balance',
        lastUpdate: 'Last update',
        totalEarned: 'Total Earned',
        totalSpent: 'Total Spent',
        level: 'Prismatic Level',
        quests: 'Quests',
        quickActions: 'Quick Actions',
        transactions: 'Transaction Timeline',
        loadingTransactions: 'Loading transactions...',
        noTransactions: 'No transactions yet.',
      };

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
        const [nextSummary, nextQuests, nextTransactions] = await Promise.all([
          loadSummary(),
          loadQuests(),
          loadTransactions(transactionFilter),
        ]);

        if (!active) return;

        setSummary(nextSummary);
        setQuests(nextQuests);
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
  }, [user, loadSummary, loadQuests, loadTransactions, transactionFilter, showToast]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const [nextSummary, nextQuests] = await Promise.all([
          loadSummary(),
          loadQuests(),
        ]);
        setSummary(nextSummary);
        setQuests(nextQuests);
      } catch {
        // Silent poll failure
      }
    }, 45_000);

    return () => clearInterval(interval);
  }, [user, loadSummary, loadQuests]);

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

      const nextTransactions = await loadTransactions(transactionFilter);
      setTransactions(nextTransactions);
    } catch (error: any) {
      showToast(error?.message || 'Failed to claim quest reward.', 'error');
    } finally {
      setQuestLoadingMap((prev) => ({ ...prev, [quest.key]: false }));
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
            {text.loginTitle}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {text.loginDesc}
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
            {text.loginButton}
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
                {text.title}
              </h1>
              <p className="text-sm max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
                {text.subtitle}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-wide" style={{ color: '#93c5fd' }}>
                {text.currentBalance}
              </p>
              <p className="text-3xl font-black inline-flex items-center gap-2" style={{ color: '#f8fafc' }}>
                <PrismaticEssenceIcon className="text-3xl" />
                {(summary?.wallet.prismaticEssence || 0).toLocaleString()} PE
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {text.lastUpdate}: {summary ? new Date(summary.wallet.updatedAt).toLocaleString() : '-'}
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
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{text.totalEarned}</span>
              <FaArrowUp style={{ color: '#7dd3fc' }} />
            </div>
            <p className="text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              {(summary?.wallet.totalPrismaticEarned || 0).toLocaleString()}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>Lifetime Prismatic Essence gained.</p>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(244,114,182,0.42)', background: 'rgba(244,114,182,0.12)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{text.totalSpent}</span>
              <FaArrowDown style={{ color: '#f9a8d4' }} />
            </div>
            <p className="text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              {(summary?.wallet.totalPrismaticSpent || 0).toLocaleString()}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>Spent on cosmetics, caches, and community actions.</p>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(167,139,250,0.42)', background: 'rgba(167,139,250,0.12)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{text.level}</span>
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
              {text.quests}
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

                  {!quest.available && !quest.completed && (QUEST_COMPLETION_LINKS[quest.key]?.length || 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {QUEST_COMPLETION_LINKS[quest.key].map((link) => (
                        link.external ? (
                          <a
                            key={`${quest.key}-${link.label}`}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-semibold"
                            style={{
                              background: 'rgba(56, 189, 248, 0.14)',
                              color: '#7dd3fc',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                            }}
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            key={`${quest.key}-${link.label}`}
                            href={link.href}
                            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-semibold"
                            style={{
                              background: 'rgba(56, 189, 248, 0.14)',
                              color: '#7dd3fc',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                            }}
                          >
                            {link.label}
                          </Link>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(14,20,34,0.9)' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#c4b5fd' }}>
              <FaMagic />
              {text.quickActions}
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Jump directly to the places where Prismatic Essence is spent or risked.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/cosmetics"
                className="rounded-xl border p-4 transition-transform hover:-translate-y-0.5"
                style={{
                  borderColor: 'rgba(56, 189, 248, 0.38)',
                  background: 'linear-gradient(145deg, rgba(56, 189, 248, 0.18), rgba(29, 78, 216, 0.08))',
                }}
              >
                <p className="text-sm font-bold inline-flex items-center gap-2" style={{ color: '#93c5fd' }}>
                  <FaPalette /> Cosmetics
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Unlock username styles, visual effects, and PE cosmetics.
                </p>
              </Link>

              <Link
                href="/adspace"
                className="rounded-xl border p-4 transition-transform hover:-translate-y-0.5"
                style={{
                  borderColor: 'rgba(249, 168, 212, 0.38)',
                  background: 'linear-gradient(145deg, rgba(249, 168, 212, 0.18), rgba(219, 39, 119, 0.09))',
                }}
              >
                <p className="text-sm font-bold inline-flex items-center gap-2" style={{ color: '#f9a8d4' }}>
                  <FaBullhorn /> Adspace
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Convert PE into promotion opportunities for your content.
                </p>
              </Link>

              <Link
                href="/purse/gamble"
                className="rounded-xl border p-4 sm:col-span-2 transition-transform hover:-translate-y-0.5"
                style={{
                  borderColor: 'rgba(192, 132, 252, 0.44)',
                  background: 'linear-gradient(145deg, rgba(167, 139, 250, 0.22), rgba(30, 27, 75, 0.16), rgba(56, 189, 248, 0.12))',
                }}
              >
                <p className="text-sm font-bold inline-flex items-center gap-2" style={{ color: '#ddd6fe' }}>
                  <FaDice /> Gamble
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Single-player PE games only. Every mode is intentionally house-favored over time.
                </p>
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(15,20,30,0.88)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold" style={{ color: '#93c5fd' }}>{text.transactions}</h2>
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
                {text.loadingTransactions}
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                {text.noTransactions}
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
