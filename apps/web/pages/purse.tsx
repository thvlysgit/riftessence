import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaArrowDown,
  FaArrowUp,
  FaBolt,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaExchangeAlt,
  FaGem,
  FaWallet,
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from '../../api/components/GlobalUI';
import { getAuthHeader } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type TradeDirection = 'BUY_PE' | 'SELL_PE';
type TransactionCurrencyFilter = 'ALL' | 'RIFT_COINS' | 'PRISMATIC_ESSENCE';

type WalletSummaryResponse = {
  wallet: {
    riftCoins: number;
    prismaticEssence: number;
    totalRiftCoinsEarned: number;
    totalRiftCoinsSpent: number;
    updatedAt: string;
  };
  market: {
    totalSupplyCap: number;
    circulatingSupply: number;
    availableSupply: number;
    utilizationPct: number;
    spotBuyPriceRc: number;
    spotSellPriceRc: number;
    lastTradePriceRc: number | null;
    marketCapRc: number;
    sellSpreadBps: number;
    basePriceRc: number;
    slopeRc: number;
  };
  portfolio: {
    prismaticValueInRc: number;
    totalEstimatedValueRc: number;
  };
  economyGuidance: {
    recommendedPrismaticSupplyCap: number;
    recommendedStarterRiftCoins: number;
    recommendedDailyRiftCoinsRange: { min: number; max: number };
    note: string;
  };
};

type WalletTransaction = {
  id: string;
  currency: 'RIFT_COINS' | 'PRISMATIC_ESSENCE';
  type: string;
  amount: number;
  balanceAfter: number;
  unitPriceRc?: number | null;
  note?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
};

type WalletQuote = {
  direction: TradeDirection;
  amount: number;
  canExecute: boolean;
  reason?: string | null;
  riftCoinsCost?: number;
  riftCoinsProceeds?: number;
  averageUnitPriceRc?: number;
  postTradeWallet?: {
    riftCoins: number;
    prismaticEssence: number;
  };
  postTradeMarket?: {
    circulatingSupply: number;
    spotBuyPriceRc: number;
    spotSellPriceRc: number;
  };
};

type WalletQuoteResponse = {
  direction: TradeDirection;
  amount: number;
  quote: WalletQuote;
};

type WalletQuest = {
  key: string;
  title: string;
  description: string;
  rewardRiftCoins: number;
  repeatWindow: 'DAILY' | 'ONE_TIME';
  available: boolean;
  eligible: boolean;
  completed: boolean;
  reason: string | null;
  nextClaimAt: string | null;
};

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function formatSignedAmount(value: number, currency: 'RIFT_COINS' | 'PRISMATIC_ESSENCE') {
  const sign = value >= 0 ? '+' : '';
  const suffix = currency === 'RIFT_COINS' ? 'RC' : 'PE';
  return `${sign}${value.toLocaleString()} ${suffix}`;
}

function transactionLabel(type: string) {
  const labelMap: Record<string, string> = {
    WELCOME_BONUS: 'Welcome Bonus',
    QUEST_REWARD: 'Quest Reward',
    SHOP_PURCHASE: 'Shop Purchase',
    CONVERT_BUY_PRISMATIC: 'Buy Prismatic',
    CONVERT_SELL_PRISMATIC: 'Sell Prismatic',
    ADMIN_ADJUSTMENT: 'Admin Adjustment',
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

  const [direction, setDirection] = useState<TradeDirection>('BUY_PE');
  const [amount, setAmount] = useState(25);
  const [quote, setQuote] = useState<WalletQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [questLoadingMap, setQuestLoadingMap] = useState<Record<string, boolean>>({});
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
      throw new Error(data?.error || 'Failed to load wallet summary.');
    }

    return data as WalletSummaryResponse;
  }, [authHeaders]);

  const loadQuests = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return [] as WalletQuest[];

    const res = await fetch(`${API_URL}/api/wallet/quests`, { headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load wallet quests.');
    }

    return (data?.quests || []) as WalletQuest[];
  }, [authHeaders]);

  const loadTransactions = useCallback(async (filter: TransactionCurrencyFilter) => {
    const headers = authHeaders();
    if (!headers) return [] as WalletTransaction[];

    const params = new URLSearchParams({
      limit: '35',
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
        const [nextSummary, nextQuests] = await Promise.all([loadSummary(), loadQuests()]);
        setSummary(nextSummary);
        setQuests(nextQuests);
      } catch {
        // Silent polling failure
      }
    }, 45_000);

    return () => clearInterval(interval);
  }, [user, loadSummary, loadQuests]);

  useEffect(() => {
    let active = true;

    const fetchQuote = async () => {
      if (!user || !summary || !Number.isInteger(amount) || amount < 1) {
        setQuote(null);
        return;
      }

      setQuoteLoading(true);

      try {
        const headers = authHeaders();
        if (!headers) return;

        const params = new URLSearchParams({
          direction,
          amount: String(amount),
        });

        const res = await fetch(`${API_URL}/api/wallet/quote?${params.toString()}`, { headers });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to fetch quote.');
        }

        if (!active) return;
        setQuote((data as WalletQuoteResponse).quote);
      } catch (error: any) {
        if (!active) return;
        setQuote({
          direction,
          amount,
          canExecute: false,
          reason: error?.message || 'Failed to fetch quote.',
        });
      } finally {
        if (active) {
          setQuoteLoading(false);
        }
      }
    };

    const timeout = setTimeout(fetchQuote, 240);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [amount, direction, user, summary, authHeaders]);

  const maxTradeAmount = useMemo(() => {
    if (!summary) return 0;

    if (direction === 'BUY_PE') {
      const maxByCoins = Math.floor(summary.wallet.riftCoins / Math.max(1, summary.market.spotBuyPriceRc));
      return Math.max(0, Math.min(maxByCoins, summary.market.availableSupply));
    }

    return Math.max(0, summary.wallet.prismaticEssence);
  }, [summary, direction]);

  const canTrade = Boolean(quote && quote.canExecute && !tradeLoading && amount > 0);

  const handleTrade = async () => {
    if (!canTrade || !user) return;

    setTradeLoading(true);

    try {
      const headers = authHeaders();
      if (!headers) {
        throw new Error('Please sign in first.');
      }

      const res = await fetch(`${API_URL}/api/wallet/convert`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction, amount }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Trade failed.');
      }

      setSummary(data.summary as WalletSummaryResponse);
      showToast(direction === 'BUY_PE' ? 'Prismatic Essence purchased successfully.' : 'Prismatic Essence sold successfully.', 'success');

      const [nextTransactions, nextQuests] = await Promise.all([
        loadTransactions(transactionFilter),
        loadQuests(),
      ]);

      setTransactions(nextTransactions);
      setQuests(nextQuests);
    } catch (error: any) {
      showToast(error?.message || 'Trade failed.', 'error');
    } finally {
      setTradeLoading(false);
    }
  };

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
      showToast(`+${quest.rewardRiftCoins.toLocaleString()} RiftCoins claimed!`, 'success');

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
            style={{ borderColor: 'var(--color-accent-1)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen px-4 py-10" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="max-w-2xl mx-auto rounded-2xl border p-8 text-center" style={{
          borderColor: 'var(--color-border)',
          background: 'linear-gradient(145deg, rgba(200,170,110,0.08), rgba(59,130,246,0.04))',
        }}>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-accent-1)' }}>RiftCoin Purse</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Log in to manage your currencies, track your market value, and claim rewards.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
              color: 'var(--color-bg-primary)',
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
          radial-gradient(1200px 500px at -10% -10%, rgba(200,170,110,0.15), transparent 58%),
          radial-gradient(900px 450px at 110% 0%, rgba(56,189,248,0.11), transparent 62%),
          var(--color-bg-primary)
        `,
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="rounded-2xl border p-6" style={{
          borderColor: 'var(--color-border)',
          background: 'linear-gradient(150deg, rgba(11,13,18,0.92), rgba(22,27,39,0.86))',
        }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                RiftEconomy
              </p>
              <h1 className="text-3xl sm:text-4xl font-black mb-2" style={{ color: 'var(--color-accent-1)' }}>
                Purse
              </h1>
              <p className="text-sm max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
                Manage RiftCoins, trade into Prismatic Essence, and grow your portfolio with a scarcity-based market curve.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                Estimated Net Value
              </p>
              <p className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                {(summary?.portfolio.totalEstimatedValueRc || 0).toLocaleString()} RC
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Last update: {summary ? new Date(summary.wallet.updatedAt).toLocaleString() : '-'}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(200,170,110,0.35)', background: 'rgba(200,170,110,0.09)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>RiftCoins</span>
              <FaCoins style={{ color: 'var(--color-accent-1)' }} />
            </div>
            <p className="text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              {(summary?.wallet.riftCoins || 0).toLocaleString()}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              Earned: {(summary?.wallet.totalRiftCoinsEarned || 0).toLocaleString()} RC
            </p>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.09)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Prismatic Essence</span>
              <FaGem style={{ color: '#60a5fa' }} />
            </div>
            <p className="text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              {(summary?.wallet.prismaticEssence || 0).toLocaleString()}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              Mark-to-market: {(summary?.portfolio.prismaticValueInRc || 0).toLocaleString()} RC
            </p>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.09)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Market Pulse</span>
              <FaExchangeAlt style={{ color: '#34d399' }} />
            </div>
            <p className="text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              {summary ? `${summary.market.utilizationPct}%` : '0%'}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              Supply utilization ({(summary?.market.circulatingSupply || 0).toLocaleString()} / {(summary?.market.totalSupplyCap || 0).toLocaleString()} PE)
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(18,22,30,0.86)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Prismatic Market</h2>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Buy Price</p>
                <p className="text-lg font-bold" style={{ color: '#93c5fd' }}>{summary?.market.spotBuyPriceRc.toLocaleString()} RC</p>
              </div>
              <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Sell Price</p>
                <p className="text-lg font-bold" style={{ color: '#34d399' }}>{summary?.market.spotSellPriceRc.toLocaleString()} RC</p>
              </div>
              <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Market Cap</p>
                <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{(summary?.market.marketCapRc || 0).toLocaleString()} RC</p>
              </div>
              <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Available PE</p>
                <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{(summary?.market.availableSupply || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{
              borderColor: 'rgba(200,170,110,0.45)',
              background: 'linear-gradient(145deg, rgba(200,170,110,0.12), rgba(26,32,48,0.35))',
            }}>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Economy Guidance
              </p>
              <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Recommended launch supply: {summary?.economyGuidance.recommendedPrismaticSupplyCap.toLocaleString()} PE. Recommended starter wallet: {summary?.economyGuidance.recommendedStarterRiftCoins.toLocaleString()} RC.
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {summary?.economyGuidance.note}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(15,20,30,0.9)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Convert Currencies</h2>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDirection('BUY_PE')}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: direction === 'BUY_PE' ? 'rgba(59,130,246,0.2)' : 'var(--color-bg-tertiary)',
                  color: direction === 'BUY_PE' ? '#93c5fd' : 'var(--color-text-secondary)',
                  border: `1px solid ${direction === 'BUY_PE' ? 'rgba(59,130,246,0.45)' : 'var(--color-border)'}`,
                }}
              >
                Buy Prismatic (RC → PE)
              </button>
              <button
                onClick={() => setDirection('SELL_PE')}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: direction === 'SELL_PE' ? 'rgba(16,185,129,0.2)' : 'var(--color-bg-tertiary)',
                  color: direction === 'SELL_PE' ? '#86efac' : 'var(--color-text-secondary)',
                  border: `1px solid ${direction === 'SELL_PE' ? 'rgba(16,185,129,0.45)' : 'var(--color-border)'}`,
                }}
              >
                Sell Prismatic (PE → RC)
              </button>
            </div>

            <label className="block text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Amount ({direction === 'BUY_PE' ? 'PE to buy' : 'PE to sell'})
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                min={1}
                max={Math.max(1, maxTradeAmount)}
                value={Number.isFinite(amount) ? amount : ''}
                onChange={(event) => {
                  const parsed = Math.max(1, Number(event.target.value || 0));
                  setAmount(Number.isFinite(parsed) ? Math.floor(parsed) : 1);
                }}
                className="w-full px-4 py-3 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                onClick={() => setAmount(Math.max(1, maxTradeAmount))}
                className="px-4 py-3 rounded-lg text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
                type="button"
              >
                Max
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {[1, 10, 25, 100].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setAmount((prev) => Math.max(1, prev + chip))}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: 'rgba(200,170,110,0.14)',
                    color: 'var(--color-accent-1)',
                    border: '1px solid rgba(200,170,110,0.35)',
                  }}
                  type="button"
                >
                  +{chip}
                </button>
              ))}
            </div>

            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {quoteLoading ? (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Updating quote...</p>
              ) : quote ? (
                <>
                  <div className="flex items-center justify-between text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>{direction === 'BUY_PE' ? 'Estimated Cost' : 'Estimated Proceeds'}</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>
                      {direction === 'BUY_PE'
                        ? `${(quote.riftCoinsCost || 0).toLocaleString()} RC`
                        : `${(quote.riftCoinsProceeds || 0).toLocaleString()} RC`}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Average Trade Price</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>
                      {(quote.averageUnitPriceRc || 0).toLocaleString()} RC / PE
                    </strong>
                  </div>
                  {quote.postTradeWallet && (
                    <div className="text-xs pt-2 border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                      Post-trade: {formatCompact(quote.postTradeWallet.riftCoins)} RC • {formatCompact(quote.postTradeWallet.prismaticEssence)} PE
                    </div>
                  )}
                  {quote.reason && (
                    <div className="text-xs mt-2" style={{ color: '#fca5a5' }}>{quote.reason}</div>
                  )}
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Enter an amount to preview trade details.</p>
              )}
            </div>

            <button
              onClick={handleTrade}
              disabled={!canTrade}
              className="w-full px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              style={{
                background: canTrade
                  ? 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))'
                  : 'var(--color-bg-tertiary)',
                color: canTrade ? 'var(--color-bg-primary)' : 'var(--color-text-muted)',
                opacity: tradeLoading ? 0.8 : 1,
              }}
            >
              {tradeLoading ? 'Processing trade...' : (
                <>
                  <FaExchangeAlt />
                  {direction === 'BUY_PE' ? 'Buy Prismatic Essence' : 'Sell Prismatic Essence'}
                </>
              )}
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.15fr]">
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(16,20,28,0.88)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>RiftCoin Rewards</h2>
            <div className="space-y-3">
              {quests.map((quest) => (
                <div key={quest.key} className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{quest.title}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{quest.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: 'var(--color-accent-1)' }}>+{quest.rewardRiftCoins.toLocaleString()} RC</p>
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
                        backgroundColor: quest.available ? 'rgba(34,197,94,0.2)' : 'var(--color-bg-tertiary)',
                        color: quest.available ? '#86efac' : 'var(--color-text-muted)',
                        border: `1px solid ${quest.available ? 'rgba(34,197,94,0.45)' : 'var(--color-border)'}`,
                      }}
                    >
                      {questLoadingMap[quest.key] ? 'Claiming...' : 'Claim'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(15,20,30,0.88)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-accent-1)' }}>Transaction Timeline</h2>
              <div className="flex gap-2">
                {(['ALL', 'RIFT_COINS', 'PRISMATIC_ESSENCE'] as TransactionCurrencyFilter[]).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setTransactionFilter(filterKey)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: transactionFilter === filterKey ? 'rgba(200,170,110,0.2)' : 'var(--color-bg-tertiary)',
                      color: transactionFilter === filterKey ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
                      border: `1px solid ${transactionFilter === filterKey ? 'rgba(200,170,110,0.45)' : 'var(--color-border)'}`,
                    }}
                  >
                    {filterKey === 'ALL' ? 'All' : filterKey === 'RIFT_COINS' ? 'RiftCoins' : 'Prismatic'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
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
                          {formatSignedAmount(tx.amount, tx.currency)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          Balance: {tx.balanceAfter.toLocaleString()} {tx.currency === 'RIFT_COINS' ? 'RC' : 'PE'}
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
          </div>
        </section>
      </div>
    </div>
  );
}
