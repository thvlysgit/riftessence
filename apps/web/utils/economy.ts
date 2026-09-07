import { getAuthHeader } from './auth';

export const ECONOMY_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
export async function economyApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ECONOMY_API}/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...getAuthHeader(),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
  return data as T;
}
export function walletChanged() {
  window.dispatchEvent(new Event('riftessence:wallet-updated'));
}
export const pe = (n: number) => n.toLocaleString();
export type WalletSummary = {
  wallet: {
    prismaticEssence: number;
    totalPrismaticEarned: number;
    totalPrismaticSpent: number;
    updatedAt: string;
  };
  progression: { level: number; experience: number; currentProgress: number; progressPct: number };
};
export type Quest = {
  key: string;
  title: string;
  description: string;
  rewardPrismaticEssence: number;
  repeatWindow: 'DAILY' | 'ONE_TIME';
  available: boolean;
  completed: boolean;
  eligible: boolean;
  reason: string | null;
  nextClaimAt: string | null;
};
export type LedgerEntry = {
  id: string;
  type: string;
  currency: string;
  note: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};
export type Cosmetic = {
  key: string;
  title: string;
  description: string;
  category: string;
  costPrismaticEssence: number;
  owned: boolean;
  active: boolean;
  available: boolean;
  blockedReason: string | null;
  unlockKey?: string;
  badgePreview?: { key: string; name: string; icon: string } | null;
};
export type Shop = {
  items: Cosmetic[];
  wallet: WalletSummary['wallet'];
  loadout: Record<string, string | null>;
};
export type Guess = {
  champion: { id: string; name: string };
  correct: boolean;
  clues: { label: string; value: string; match: string; direction?: string | null }[];
};
export type GameRound = {
  id: string;
  day: string;
  gameKey: 'archive' | 'soundcheck';
  practice: boolean;
  finished: boolean;
  won: boolean;
  rewardOffer: number;
  rewardPaid: number;
  maxGuesses: number;
  attempts: Guess[];
  audioSlots: number[];
  answer: {
    id: string;
    name: string;
    title: string;
    abilities: { key: string; name: string }[];
  } | null;
};
export type GamesOverview = {
  day: string;
  resetAt: string;
  dailyCap: number;
  earnedToday: number;
  rewardsEnabled: boolean;
  games: { key: string; title: string; reward: number; round: GameRound | null }[];
};
export type EconomySettings = {
  starterGrant: number;
  dailyCheckin: number;
  dailySocial: number;
  championReward: number;
  soundReward: number;
  dailyGameCap: number;
  gameRewardsEnabled: boolean;
  version: number;
};
export type EconomyOverview = {
  totals: {
    circulation: number;
    wallets: number;
    median: number;
    activeWallets: number;
    earned: number;
    spent: number;
  };
  daily: { day: string; earned: number; spent: number }[];
  categories: { source: string; earned: number; spent: number; count: number }[];
  distribution: { bucket: string; count: number }[];
  recent: (LedgerEntry & { user: { username: string } })[];
  games: {
    gameKey: string;
    won: boolean;
    finished: boolean;
    _count: { _all: number };
    _sum: { rewardPaid: number | null };
  }[];
  reconciliationWarnings: number;
  settings: EconomySettings;
  days: number;
  start: string;
  generatedAt: string;
};
