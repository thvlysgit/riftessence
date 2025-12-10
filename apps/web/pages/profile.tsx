// Complete Profile Page for League of Legends LFD + Social Rating Platform
// Built with Next.js, TypeScript, and Tailwind CSS
// Styled to match the Riot "Summoner Hub" dark theme

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { useRouter } from 'next/router';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FeedbackModal } from '../components/FeedbackModal';
import { ReportModal } from '../components/ReportModal';
import { useGlobalUI } from '../components/GlobalUI';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type RiotAccount = {
  id: string;
  gameName: string;
  tagLine: string;
  region: string;
  isMain: boolean;
  verified: boolean;
  hidden: boolean;
  rank?: string;
  division?: string | null;
  winrate?: number | null;
  profileIconId?: number;
};

type Community = {
  id: string;
  name: string;
  role: string;
};

type Feedback = {
  id: string;
  stars: number;
  moons: number;
  comment: string;
  date: string;
  raterUsername: string;
};

type UserProfile = {
  id: string;
  username: string;
  bio: string | null;
  anonymous: boolean;
  playstyles: string[];
  primaryRole: string | null;
  preferredRole: string | null; // Auto-detected from match history
  region: string | null;
  vcPreference: string | null;
  languages: string[];
  skillStars: number;
  personalityMoons: number;
  reportCount: number;
  badges: string[];
  championPoolMode: 'TIERLIST';
  championList: string[];
  championTierlist: any;
  gamesPerDay: number;
  gamesPerWeek: number;
  profileIconId?: number;
  riotAccounts: RiotAccount[];
  discordLinked: boolean;
  discordUsername: string | null;
  communities: Community[];
  feedback: Feedback[];
};

const AVAILABLE_PLAYSTYLES = ['Controlled Chaos', 'FUNDAMENTALS', 'CoinFlips', 'Scaling', 'Snowball'];
const AVAILABLE_SERVERS = ['EUW', 'EUNE', 'NA', 'KR', 'OCE', 'BR', 'LAN', 'LAS', 'RU'];
const AVAILABLE_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish', 'Russian', 'Turkish', 'Korean', 'Japanese', 'Chinese'];

// Badge configuration with icons and styles
type BadgeConfig = {
  icon: string;
  description?: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverBg: string;
};

const BADGE_CONFIG: Record<string, BadgeConfig> = {
  'Developer': {
    icon: '⚡',
    description: 'Bypass cooldowns',
    bgColor: 'rgba(167, 139, 250, 0.20)',
    borderColor: '#A78BFA',
    textColor: '#A78BFA',
    hoverBg: 'rgba(167, 139, 250, 0.30)',
  },
  'Admin': {
    icon: '🛡️',
    description: 'Platform administrator',
    bgColor: 'rgba(239, 68, 68, 0.20)',
    borderColor: '#EF4444',
    textColor: '#F87171',
    hoverBg: 'rgba(239, 68, 68, 0.30)',
  },
  'Support': {
    icon: '💬',
    description: 'Support team member',
    bgColor: 'rgba(34, 211, 238, 0.20)',
    borderColor: '#22D3EE',
    textColor: '#67E8F9',
    hoverBg: 'rgba(34, 211, 238, 0.30)',
  },
  'Early Supporter': {
    icon: '🌟',
    description: 'Joined during beta',
    bgColor: 'rgba(96, 165, 250, 0.20)',
    borderColor: '#60A5FA',
    textColor: '#93C5FD',
    hoverBg: 'rgba(96, 165, 250, 0.30)',
  },
  'VIP': {
    icon: '👑',
    description: 'VIP member',
    bgColor: 'rgba(245, 158, 11, 0.20)',
    borderColor: '#F59E0B',
    textColor: '#FCD34D',
    hoverBg: 'rgba(245, 158, 11, 0.30)',
  },
  'Partner': {
    icon: '🤝',
    description: 'Official partner',
    bgColor: 'rgba(34, 197, 94, 0.20)',
    borderColor: '#22C55E',
    textColor: '#86EFAC',
    hoverBg: 'rgba(34, 197, 94, 0.30)',
  },
  'MVP': {
    icon: '🏆',
    description: 'Most valuable player',
    bgColor: 'rgba(200, 170, 110, 0.20)',
    borderColor: '#C8AA6E',
    textColor: '#C8AA6E',
    hoverBg: 'rgba(200, 170, 110, 0.30)',
  },
  'GOAT': {
    icon: '🐐',
    description: 'Greatest of all time',
    bgColor: 'rgba(251, 146, 60, 0.20)',
    borderColor: '#FB923C',
    textColor: '#FDBA74',
    hoverBg: 'rgba(251, 146, 60, 0.30)',
  },
};

// Popular League champions for quick selection
const POPULAR_CHAMPIONS = [
  'Ahri', 'Akali', 'Ashe', 'Caitlyn', 'Darius', 'Ekko', 'Ezreal', 'Garen', 'Jax', 'Jinx',
  'Kai\'Sa', 'Katarina', 'Lee Sin', 'Lux', 'Malphite', 'Master Yi', 'Morgana', 'Nasus',
  'Orianna', 'Riven', 'Thresh', 'Vayne', 'Yasuo', 'Yone', 'Zed', 'Zyra'
];

import { useTheme } from '../contexts/ThemeContext';

const useRankColor = () => {
  const { theme } = useTheme();
  const isLightTheme = (() => {
    const hex = theme.colors.bgPrimary.replace('#','');
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return lum > 0.7;
  })();
  const map: Record<string, string> = {
    IRON: '#4A4A4A',
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#00CED1',
    EMERALD: '#50C878',
    DIAMOND: isLightTheme ? '#4FA3FF' : '#B9F2FF',
    MASTER: '#9933FF',
    GRANDMASTER: '#FF0000',
    CHALLENGER: '#F4C430',
    UNRANKED: '#6B7280',
  };
  return (rank: string) => map[rank || 'UNRANKED'] || map.UNRANKED;
};

const RANK_ORDER = [
  'UNRANKED',
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
];

export default function ProfilePage() {
  const router = useRouter();
  const routeUsername = typeof router.query?.username === 'string' ? router.query.username : null;
  const isViewingOther = !!routeUsername;
  const rankColor = useRankColor();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditingPlaystyles, setIsEditingPlaystyles] = useState(false);
  const [selectedPlaystyles, setSelectedPlaystyles] = useState<string[]>([]);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [editedUsername, setEditedUsername] = useState<string>('');
  const [editedLanguages, setEditedLanguages] = useState<string[]>([]);
  const [pendingMainAccountId, setPendingMainAccountId] = useState<string | null>(null);
  const [championPoolMode, setChampionPoolMode] = useState<'TIERLIST'>('TIERLIST');
  const [championList, setChampionList] = useState<string[]>([]);
  const [championInput, setChampionInput] = useState('');
  const [champions, setChampions] = useState<string[]>([]);
  const [championTierlist, setChampionTierlist] = useState<{ S: string[]; A: string[]; B: string[]; C: string[] }>({ S: [], A: [], B: [], C: [] });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserBadges, setCurrentUserBadges] = useState<string[]>([]);
  const [toast, setToast] = useState<{ open: boolean; message: string; type?: 'success'|'error'|'info' }>({ open: false, message: '', type: 'info' });
  const [confirmState, setConfirmState] = useState<{ open: boolean; feedbackId: string | null }>({ open: false, feedbackId: null });
  const { showToast, confirm } = useGlobalUI();
  const isAdmin = useMemo(() => currentUserBadges.some(b => b.toLowerCase() === 'admin'), [currentUserBadges]);

  // Load current user ID and badges from localStorage/API
  useEffect(() => {
    const userId = localStorage.getItem('lfd_userId');
    setCurrentUserId(userId);
    
    // Fetch current user's badges to check admin status
    if (userId) {
      fetch(`${API_URL}/api/user/profile?userId=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.badges) {
            setCurrentUserBadges(data.badges);
          }
        })
        .catch(() => {});
    }
  }, []);

  const normalize = (s: string) => s.trim().toLowerCase();
  const findChampionByName = (input: string) => champions.find((c) => normalize(c) === normalize(input)) || null;
  const isValidChampion = (name: string) => !!findChampionByName(name);
  const isInAnyTier = (name: string) => ['S','A','B','C'].some((t) => (championTierlist as any)[t].includes(name));
  const addToTier = (tier: 'S'|'A'|'B'|'C', name: string) => {
    setChampionTierlist((prev) => {
      const next = { S: [...prev.S], A: [...prev.A], B: [...prev.B], C: [...prev.C] };
      (['S','A','B','C'] as const).forEach((t) => {
        next[t] = next[t].filter((c) => c !== name);
      });
      if (!next[tier].includes(name)) next[tier].push(name);
      return next;
    });
  };
  const removeFromTier = (tier: 'S'|'A'|'B'|'C', name: string) => {
    setChampionTierlist((prev) => ({ ...prev, [tier]: prev[tier].filter((c) => c !== name) }));
  };
  const getBestAccount = (accounts: RiotAccount[]) => {
    if (!accounts || accounts.length === 0) return null;
    return accounts.reduce((best, a) => {
      const br = RANK_ORDER.indexOf(best.rank || 'UNRANKED');
      const ar = RANK_ORDER.indexOf(a.rank || 'UNRANKED');
      if (ar > br) return a;
      if (ar < br) return best;
      // Same rank, compare divisions (I > II > III > IV)
      const divOrder = ['IV', 'III', 'II', 'I'];
      const bd = best.division ? divOrder.indexOf(best.division) : -1;
      const ad = a.division ? divOrder.indexOf(a.division) : -1;
      return ad > bd ? a : best;
    }, accounts[0]);
  };

  // Fetch user profile from API (supports viewing other profiles via ?username=)
  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        let userId: string | null = null;
        try { userId = localStorage.getItem('lfd_userId'); } catch {}
        
        // Step 1: Fetch initial profile to get userId
        let profileUrl: string;
        if (isViewingOther && routeUsername) {
          // When viewing others, don't include hidden accounts
          profileUrl = `${API_URL}/api/user/profile?username=${encodeURIComponent(routeUsername)}`;
        } else {
          // When viewing own profile, include hidden accounts
          profileUrl = userId 
            ? `${API_URL}/api/user/profile?userId=${encodeURIComponent(userId)}&includeHidden=true` 
            : `${API_URL}/api/user/profile?includeHidden=true`;
        }
        
        const initialResponse = await fetch(profileUrl);
        if (!initialResponse.ok) throw new Error('Failed to fetch profile');
        const initialData = await initialResponse.json();
        
        // Step 2: Refresh Riot stats using the fetched userId
        if (initialData.id) {
          await fetch(`${API_URL}/api/user/refresh-riot-stats?userId=${encodeURIComponent(initialData.id)}`, { method: 'POST' }).catch(() => {});
        }
        
        // Step 3: Fetch profile again to get updated stats
        const finalResponse = await fetch(profileUrl);
        if (!finalResponse.ok) throw new Error('Failed to fetch profile');
        const data = await finalResponse.json();
        
        setUser(data);
        setSelectedPlaystyles(data.playstyles || []);
        setAnonymousMode(data.anonymous || false);
        setEditedUsername(data.username || '');
        setEditedLanguages(data.languages || []);
        setChampionPoolMode(data.championPoolMode || 'LIST');
        setChampionList(data.championList || []);
        setChampionTierlist(
          data.championTierlist && typeof data.championTierlist === 'object'
            ? {
                S: Array.isArray(data.championTierlist.S) ? data.championTierlist.S : [],
                A: Array.isArray(data.championTierlist.A) ? data.championTierlist.A : [],
                B: Array.isArray(data.championTierlist.B) ? data.championTierlist.B : [],
                C: Array.isArray(data.championTierlist.C) ? data.championTierlist.C : [],
              }
            : { S: [], A: [], B: [], C: [] }
        );
        const mainAccount = data.riotAccounts.find((acc: RiotAccount) => acc.isMain);
        setPendingMainAccountId(mainAccount?.id || data.riotAccounts[0]?.id || null);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [routeUsername, isViewingOther]);

  // Handle Discord OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('discord') === 'linked') {
      showToast('Discord account linked successfully!', 'success');
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
      // Trigger profile refresh
      window.location.reload();
    }
  }, []);

  // Fetch full champions list from Data Dragon
  useEffect(() => {
    async function fetchChampions() {
      try {
        const res = await fetch('https://ddragon.leagueoflegends.com/cdn/14.23.1/data/en_US/champion.json');
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        const names = Object.values<any>(json.data || {}).map((c: any) => c.name as string).sort();
        setChampions(names);
      } catch {
        // Fallback to popular list if network fails
        setChampions(POPULAR_CHAMPIONS);
      }
    }
    fetchChampions();
  }, []);

  // Save playstyles to API
  const handleSavePlaystyles = async () => {
    if (selectedPlaystyles.length > 2) {
      showToast('You can only select up to 2 playstyles', 'error');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/user/playstyles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playstyles: selectedPlaystyles }),
      });
      if (!response.ok) throw new Error('Failed to update playstyles');
      if (user) {
        setUser({ ...user, playstyles: selectedPlaystyles });
      }
      setIsEditingPlaystyles(false);
    } catch (err) {
      console.error('Error updating playstyles:', err);
      showToast('Failed to save playstyles', 'error');
    }
  };

  // Save all profile changes (playstyles + main account + champion pool)
  const handleSaveAllChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      let userId: string | null = null;
      try { userId = localStorage.getItem('lfd_userId'); } catch {}

      // Save username if changed (only when viewing own profile)
      try {
        if (!isViewingOther && editedUsername && editedUsername !== user?.username) {
          const usernameRes = await fetch(`${API_URL}/api/user/username${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: editedUsername }),
          });
          if (!usernameRes.ok) {
            const err = await usernameRes.json().catch(() => ({ error: 'Failed to update username' }));
            throw new Error(err.error || 'Failed to update username');
          }
          const data = await usernameRes.json();
          if (data.bypassedCooldown) {
            showToast(`Username updated! ✨ ${data.bypassedCooldown}`, 'success');
          }
        }
      } catch (err: any) {
        console.error('Username save error:', err);
        showToast(`Failed to save username: ${err.message}`, 'error');
        setIsSaving(false);
        return;
      }

      // Save languages if changed (only when viewing own profile)
      try {
        const sortedEditedLangs = [...editedLanguages].sort();
        const sortedUserLangs = [...(user?.languages || [])].sort();
        if (!isViewingOther && JSON.stringify(sortedEditedLangs) !== JSON.stringify(sortedUserLangs)) {
          const langRes = await fetch(`${API_URL}/api/user/languages${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ languages: editedLanguages }),
          });
          if (!langRes.ok) {
            const err = await langRes.json().catch(() => ({ error: 'Failed to update languages' }));
            throw new Error(err.error || 'Failed to update languages');
          }
        }
      } catch (err: any) {
        console.error('Languages save error:', err);
        showToast(`Failed to save languages: ${err.message}`, 'error');
        setIsSaving(false);
        return;
      }

      // Save playstyles (only when viewing own profile)
      try {
        if (selectedPlaystyles.length > 2) {
          showToast('You can only select up to 2 playstyles', 'error');
          setIsSaving(false);
          return;
        }
        if (!isViewingOther) {
          await fetch(`${API_URL}/api/user/playstyles`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playstyles: selectedPlaystyles }),
          });
        }
      } catch (err: any) {
        console.error('Playstyles save error:', err);
        showToast(`Failed to save playstyles: ${err.message}`,'error');
        setIsSaving(false);
        return;
      }

      // Validate and save champion pool
      const allTierChamps = [...championTierlist.S, ...championTierlist.A, ...championTierlist.B, ...championTierlist.C];
      const invalid = allTierChamps.filter((c) => !isValidChampion(c));
      if (invalid.length) {
        showToast(`Invalid champion(s): ${invalid.join(', ')}`, 'error');
        return;
      }
      // Ensure uniqueness across tiers by deduping when saving (UI enforces, but double-check)
      const seen = new Set<string>();
      const uniqueTierlist = { S: [] as string[], A: [] as string[], B: [] as string[], C: [] as string[] };
      (['S', 'A', 'B', 'C'] as const).forEach((t) => {
        for (const champ of championTierlist[t]) {
          if (!seen.has(champ)) {
            seen.add(champ);
            uniqueTierlist[t].push(champ);
          }
        }
      });
      setChampionTierlist(uniqueTierlist);

      // Pass userId in query to ensure correct user is updated
      let uid: string | null = null;
      try { uid = localStorage.getItem('lfd_userId'); } catch {}
      const cpRes = !isViewingOther ? await fetch(`${API_URL}/api/user/champion-pool${uid ? `?userId=${encodeURIComponent(uid)}` : ''}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: championPoolMode,
          championList: [],
          championTierlist: championTierlist,
        }),
      }) : null;
      if (cpRes && cpRes.ok) {
        const cpData = await cpRes.json().catch(() => null);
        if (cpData && user) {
          setUser({
            ...user,
            championPoolMode: cpData.championPoolMode ?? championPoolMode,
            championList: cpData.championList ?? [],
            championTierlist: cpData.championTierlist ?? championTierlist,
          });
        }
      }

      // Save main account if changed (only when viewing own profile)
      if (!isViewingOther && pendingMainAccountId && pendingMainAccountId !== user?.riotAccounts.find(acc => acc.isMain)?.id) {
        const response = await fetch(`${API_URL}/api/user/riot-accounts/${pendingMainAccountId}/set-main`, {
          method: 'PATCH',
        });
        if (!response.ok) throw new Error('Failed to set main account');
      }

      // Refresh Riot stats, then profile data
      // Attempt to refresh Riot stats if we have a userId
      if (!isViewingOther && userId) {
        await fetch(`${API_URL}/api/user/refresh-riot-stats?userId=${encodeURIComponent(userId)}`, { method: 'POST' }).catch(() => {});
      }
      const url = isViewingOther
        ? `${API_URL}/api/user/profile?username=${encodeURIComponent(routeUsername as string)}`
        : (userId ? `${API_URL}/api/user/profile?userId=${encodeURIComponent(userId)}` : `${API_URL}/api/user/profile`);
      const profileResponse = await fetch(url);
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        setUser(data);
        setSelectedPlaystyles(data.playstyles || []);
        setEditedUsername(data.username || '');
        setEditedLanguages(data.languages || []);
        setChampionPoolMode(data.championPoolMode || 'LIST');
        setChampionList(data.championList || []);
        setChampionTierlist(
          data.championTierlist && typeof data.championTierlist === 'object'
            ? {
                S: Array.isArray(data.championTierlist.S) ? data.championTierlist.S : [],
                A: Array.isArray(data.championTierlist.A) ? data.championTierlist.A : [],
                B: Array.isArray(data.championTierlist.B) ? data.championTierlist.B : [],
                C: Array.isArray(data.championTierlist.C) ? data.championTierlist.C : [],
              }
            : { S: [], A: [], B: [], C: [] }
        );
        const mainAccount = data.riotAccounts.find((acc: RiotAccount) => acc.isMain);
        setPendingMainAccountId(mainAccount?.id || data.riotAccounts[0]?.id || null);
      }

      setIsEditMode(false);
      setIsSaving(false);
    } catch (err: any) {
      console.error('Error saving changes:', err);
      showToast(`Failed to save changes: ${err.message || 'Unknown error'}`, 'error');
      setIsSaving(false);
    }
  };

  // Toggle anonymous mode via API
  const handleToggleAnonymous = async () => {
    const newMode = !anonymousMode;
    try {
      const response = await fetch(`${API_URL}/api/user/anonymous`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymous: newMode }),
      });
      if (!response.ok) throw new Error('Failed to update anonymous mode');
      setAnonymousMode(newMode);
      if (user) {
        setUser({ ...user, anonymous: newMode });
      }
    } catch (err) {
      console.error('Error updating anonymous mode:', err);
      showToast('Failed to update anonymous mode', 'error');
    }
  };

  // Switch main Riot account (now just sets pending state in edit mode)
  const handleSwitchMain = (accountId: string) => {
    setPendingMainAccountId(accountId);
  };

  // Toggle hidden status of Riot account
  const handleToggleHidden = async (accountId: string, currentHidden: boolean) => {
    try {
      const response = await fetch(`${API_URL}/api/user/riot-accounts/${accountId}/toggle-hidden`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !currentHidden }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update account visibility');
      }
      
      // Update local state
      setUser(prev => prev ? {
        ...prev,
        riotAccounts: prev.riotAccounts.map(acc => 
          acc.id === accountId ? { ...acc, hidden: !currentHidden } : acc
        )
      } : prev);
    } catch (err: any) {
      console.error('Error toggling account visibility:', err);
      showToast(err.message || 'Failed to update account visibility', 'error');
    }
  };

  // Remove Riot account via API
  const handleRemoveAccount = async (accountId: string) => {
    const ok = await confirm({ title: 'Remove Account', message: 'Are you sure you want to remove this Riot account? This action cannot be undone.', confirmText: 'Remove' });
    if (!ok) return;
    try {
      const response = await fetch(`${API_URL}/api/user/riot-accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove account');
      }
      
      // Refresh profile after deletion
      let userId: string | null = null;
      try { userId = localStorage.getItem('lfd_userId'); } catch {}
      const url = userId ? `${API_URL}/api/user/profile?userId=${encodeURIComponent(userId)}` : `${API_URL}/api/user/profile`;
      const profileResponse = await fetch(url);
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        setUser(data);
        const mainAccount = data.riotAccounts.find((acc: RiotAccount) => acc.isMain);
        setPendingMainAccountId(mainAccount?.id || data.riotAccounts[0]?.id || null);
      }
    } catch (err: any) {
      console.error('Error removing account:', err);
      showToast(err.message || 'Failed to remove account', 'error');
    }
  };

  // Feedback submission handler
  const handleSubmitFeedback = async (data: { stars: number; moons: number; comment: string }) => {
    if (!user || !currentUserId) return;
    
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raterId: currentUserId,
          receiverId: user.id,
          stars: data.stars,
          moons: data.moons,
          comment: data.comment,
        }),
      });
      
      if (res.ok) {
        showToast('Feedback submitted successfully!', 'success');
        setShowFeedbackModal(false);
        // Reload user data to show new feedback
        window.location.reload();
      } else {
        const errorData = await res.json();
        showToast(`Error: ${errorData.error || 'Failed to submit feedback'}`, 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleSubmitReport = async (reason: string) => {
    if (!user || !currentUserId) return;
    
    try {
      const res = await fetch(`${API_URL}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: currentUserId,
          reportedUserId: user.id,
          reason,
        }),
      });
      
      if (res.ok) {
        showToast('Report submitted successfully!', 'success');
        setShowReportModal(false);
      } else {
        const errorData = await res.json();
        showToast(`Error: ${errorData.error || 'Failed to submit report'}`, 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!user || !currentUserId) return;
    
    
    try {
      const res = await fetch(`${API_URL}/api/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });
      
      if (res.ok) {
        // Optimistically remove from UI
        setUser(prev => prev ? {
          ...prev,
          feedback: prev.feedback.filter(fb => fb.id !== feedbackId)
        } : prev);
        showToast('Feedback deleted successfully!', 'success');
      } else {
        const errorData = await res.json();
        showToast(`Error: ${errorData.error || 'Failed to delete feedback'}`, 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <LoadingSpinner text="Loading profile..." />
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-main)' }}>
        <div className="flex items-center justify-center h-full">
          <div style={{ color: 'var(--text-error)', fontSize: '1.25rem' }}>{error || 'Failed to load profile'}</div>
        </div>
      </div>
    );
  }

  // Get main Riot account for display
  const mainAccount = user.riotAccounts.find(acc => acc.isMain) || user.riotAccounts[0];
  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg-main)' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Edit Mode Toggle */}
        <div className="flex justify-end gap-3">
          {!isViewingOther && isEditMode && (
            <button
              onClick={handleSaveAllChanges}
              disabled={isSaving}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                background: isSaving ? 'var(--btn-disabled-bg)' : 'var(--btn-gradient)',
                color: isSaving ? 'var(--btn-disabled-text)' : 'var(--btn-gradient-text)',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isSaving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          )}
          {!isViewingOther && (
          <button
            onClick={() => {
              if (isEditMode) {
                setSelectedPlaystyles(user.playstyles || []);
                setEditedUsername(user.username || '');
                setEditedLanguages(user.languages || []);
                const mainAccount = user.riotAccounts.find(acc => acc.isMain);
                setPendingMainAccountId(mainAccount?.id || user.riotAccounts[0]?.id || null);
              }
              setIsEditMode(!isEditMode);
            }}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: 600,
              background: isEditMode ? 'var(--btn-cancel-bg)' : 'var(--btn-gradient)',
              color: isEditMode ? 'var(--btn-cancel-text)' : 'var(--btn-gradient-text)',
              transition: 'all 0.2s',
            }}
          >
            {isEditMode ? '✕ Cancel' : '✏️ Edit Profile'}
          </button>
          )}
        </div>

        {/* Profile Header */}
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* User Info with Icon */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {/* Summoner Icon - next to username */}
                <div className="relative flex-shrink-0">
                  <img
                    src={user.profileIconId 
                      ? `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${user.profileIconId}.png`
                      : `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/29.png`
                    }
                    alt="Summoner Icon"
                    className="w-16 h-16 rounded-lg border-2 shadow-lg"
                    style={{ borderColor: 'var(--accent-primary)' }}
                  />
                  {user.anonymous && (
                    <div className="absolute -top-1 -right-1 rounded-full font-bold px-1.5 py-0.5 text-[10px]"
                      style={{ background: 'var(--accent-danger)', color: 'var(--text-main)' }}>
                      🕶️
                    </div>
                  )}
                </div>
                
                {/* Username */}
                {isEditMode ? (
                  <input
                    type="text"
                    value={editedUsername}
                    onChange={(e) => setEditedUsername(e.target.value)}
                    className="text-3xl font-bold px-3 py-1 rounded border-2 focus:outline-none"
                    style={{
                      color: 'var(--accent-primary)',
                      background: 'var(--bg-input)',
                      borderColor: 'var(--accent-primary)',
                    }}
                    placeholder="Username"
                  />
                ) : (
                  <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>{user.username}</h1>
                )}
              </div>
              
              {mainAccount && (
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {mainAccount.gameName}#{mainAccount.tagLine} • {mainAccount.region}
                </p>
              )}
              {user.riotAccounts && user.riotAccounts.length > 0 && (
                (() => {
                  const best = getBestAccount(user.riotAccounts);
                  if (!best) return null;
                  const rankKey = best.rank || 'UNRANKED';
                  const displayRank = best.division ? `${rankKey} ${best.division}` : rankKey;
                  const color = rankColor(rankKey);
                  return (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Best Rank:</span>
                      <span
                        className="text-xs px-2 py-1 rounded font-bold"
                        style={{
                          backgroundColor: `${color}20`,
                          color,
                          border: `1px solid ${color}`,
                        }}
                      >
                        {displayRank}
                      </span>
                      {best.winrate !== null && best.winrate !== undefined ? (
                        <span
                          className="text-xs px-2 py-1 rounded font-bold"
                          style={{
                            backgroundColor: `${
                              best.winrate <= 40 ? '#ef4444' :
                              best.winrate < 45 ? '#f97316' :
                              best.winrate < 50 ? '#eab308' :
                              best.winrate < 55 ? '#3b82f6' :
                              best.winrate < 65 ? '#22c55e' :
                              best.winrate < 80 ? '#C8AA6E' :
                              '#a855f7'
                            }20`,
                            color: best.winrate <= 40 ? '#ef4444' :
                              best.winrate < 45 ? '#f97316' :
                              best.winrate < 50 ? '#eab308' :
                              best.winrate < 55 ? '#3b82f6' :
                              best.winrate < 65 ? '#22c55e' :
                              best.winrate < 80 ? '#C8AA6E' :
                              '#a855f7',
                            border: `1px solid ${
                              best.winrate <= 40 ? '#ef4444' :
                              best.winrate < 45 ? '#f97316' :
                              best.winrate < 50 ? '#eab308' :
                              best.winrate < 55 ? '#3b82f6' :
                              best.winrate < 65 ? '#22c55e' :
                              best.winrate < 80 ? '#C8AA6E' :
                              '#a855f7'
                            }`
                          }}
                        >
                          {best.winrate.toFixed(1)}% WR
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>N/A WR</span>
                      )}
                    </div>
                  );
                })()
              )}
              {user.bio && (
                <p className="text-sm mt-2" style={{ color: 'var(--text-main)' }}>{user.bio}</p>
              )}

              {/* Badges - refined hover visuals with animated tooltip */}
              {user.badges && user.badges.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {user.badges.map((badgeName) => {
                    const config = BADGE_CONFIG[badgeName] || {
                      icon: '🏆',
                      bgColor: 'var(--badge-bg)',
                      borderColor: 'var(--badge-border)',
                      textColor: 'var(--badge-text)',
                      hoverBg: 'var(--badge-hover-bg)',
                    };
                    return (
                      <div
                        key={badgeName}
                        className="group relative inline-flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl border-2 cursor-help select-none transform transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.05]"
                        style={{
                          background: config.bgColor,
                          borderColor: config.borderColor,
                          boxShadow: `0 2px 10px 0 ${config.borderColor}33`
                        }}
                        title={badgeName}
                      >
                        {/* Hover overlay to deepen color */}
                        <div
                          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          style={{ background: config.hoverBg }}
                        />

                        {/* Icon */}
                        <span className="text-lg md:text-xl relative" style={{ color: config.textColor }}>
                          {config.icon}
                        </span>

                        {/* Tooltip */}
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-y-0 -translate-y-1 transition-all duration-200 whitespace-nowrap z-20 shadow-xl backdrop-blur-sm"
                          style={{ background: 'var(--bg-tooltip)', border: '1px solid var(--accent-primary)' }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: config.textColor }}>{config.icon}</span>
                            <p className="text-xs font-semibold" style={{ color: config.textColor }}>{badgeName}</p>
                          </div>
                          {config.description && (
                            <p className="text-[10px] mt-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>{config.description}</p>
                          )}
                          {/* Tooltip arrow */}
                          <div
                            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
                            style={{ background: 'var(--bg-tooltip)', borderLeft: '1px solid var(--accent-primary)', borderBottom: '1px solid var(--accent-primary)' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Game Activity Stats - Only show if user has linked Riot accounts */}
              {user.riotAccounts && user.riotAccounts.length > 0 && (
                <div className="mt-4 rounded-lg p-3" style={{ background: 'var(--gradient-card)', border: '1px solid var(--accent-primary-border)' }}>
                  <div className="flex items-center gap-1 mb-2">
                    <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>Recent Activity</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg p-2.5 border" style={{ background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
                      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Last 24 Hours</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{user.gamesPerDay || 0}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>games</span>
                      </div>
                    </div>
                    <div className="rounded-lg p-2.5 border" style={{ background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
                      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Last 7 Days</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{user.gamesPerWeek || 0}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>games</span>
                      </div>
                    </div>
                  </div>
                  {user.preferredRole && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Most Played Role:</span>
                        <span className="text-sm font-bold px-2 py-1 rounded" style={{ 
                          background: 'var(--accent-primary-bg)', 
                          color: 'var(--accent-primary)',
                          border: '1px solid var(--accent-primary)'
                        }}>
                          {user.preferredRole}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>Across all linked accounts</p>
                </div>
              )}

              {/* Ratings */}
              <div className="mt-4 flex flex-wrap gap-6">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Skill ({user.feedback.length} ratings)</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className="w-5 h-5"
                          style={{ color: star <= user.skillStars ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>{user.skillStars}/5</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Personality ({user.feedback.length} ratings)</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((moon) => (
                        <svg
                          key={moon}
                          className="w-5 h-5"
                          style={{ color: moon <= user.personalityMoons ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                          fill={moon <= user.personalityMoons ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="1.5"
                          viewBox="0 0 24 24"
                        >
                          <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>{user.personalityMoons}/5</span>
                  </div>
                </div>
                {user.reportCount > 0 && (
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Reports</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💀</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent-danger)' }}>{user.reportCount}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Playstyles Section */}
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold flex items-center mb-4" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Playstyles
          </h2>

          {isEditMode ? (
            <div>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Select up to 2 playstyles:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AVAILABLE_PLAYSTYLES.map((style) => {
                  const isSelected = selectedPlaystyles.includes(style);
                  return (
                    <button
                      key={style}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPlaystyles(selectedPlaystyles.filter((s) => s !== style));
                        } else if (selectedPlaystyles.length < 2) {
                          setSelectedPlaystyles([...selectedPlaystyles, style]);
                        }
                      }}
                      className="p-3 rounded-lg border-2 font-medium text-sm transition-all"
                      style={{
                        background: isSelected ? 'var(--accent-primary-bg)' : 'var(--bg-input)',
                        borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-card)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.playstyles.length > 0 ? (
                user.playstyles.map((style) => (
                  <span
                    key={style}
                    className="px-4 py-2 border rounded-lg font-medium text-sm"
                    style={{ background: 'var(--accent-primary-bg)', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                  >
                    {style}
                  </span>
                ))
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No playstyles selected</p>
              )}
            </div>
          )}
        </div>

        {/* Languages Section */}
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold flex items-center mb-4" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            Languages
          </h2>

          {isEditMode ? (
            <div>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Select languages you speak:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const isSelected = editedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      onClick={() => {
                        if (isSelected) {
                          setEditedLanguages(editedLanguages.filter((l) => l !== lang));
                        } else {
                          setEditedLanguages([...editedLanguages, lang]);
                        }
                      }}
                      className="p-3 rounded-lg border-2 font-medium text-sm transition-all"
                      style={{
                        background: isSelected ? 'var(--accent-primary-bg)' : 'var(--bg-input)',
                        borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-card)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.languages && user.languages.length > 0 ? (
                user.languages.map((lang) => (
                  <span
                    key={lang}
                    className="px-4 py-2 rounded-lg font-medium text-sm"
                    style={{
                      background: 'var(--accent-primary-bg)',
                      border: '1px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {lang}
                  </span>
                ))
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No languages selected</p>
              )}
            </div>
          )}
        </div>

        {/* Champions Section */}
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Champion Pool
          </h2>
          
          {isEditMode ? (
            <div className="space-y-4">
              <div>
                <div className="mb-3">
                  <input
                    type="text"
                    value={championInput}
                    onChange={(e) => setChampionInput(e.target.value)}
                    placeholder="Search champion to add to a tier..."
                    className="w-full px-4 py-2 rounded-lg border-2 transition-colors"
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
                  />
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2 max-h-44 overflow-auto pr-1">
                      {champions
                        .filter((c) => normalize(c).includes(normalize(championInput)))
                        .slice(0, 60)
                        .map((c) => (
                          <button
                            key={c}
                            onClick={() => setChampionInput(c)}
                            className="px-2 py-1 text-xs rounded transition-colors text-left"
                            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                          >
                            {c}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['S','A','B','C'] as const).map((tier) => {
                      const tierColors = {
                        S: { bg: '#ef4444', border: '#ef4444', text: '#ef4444' },
                        A: { bg: '#C8AA6E', border: '#C8AA6E', text: '#C8AA6E' },
                        B: { bg: '#3b82f6', border: '#3b82f6', text: '#3b82f6' },
                        C: { bg: '#22c55e', border: '#22c55e', text: '#22c55e' },
                      };
                      const colors = tierColors[tier];
                      return (
                        <div key={tier} className="p-3 rounded-lg border" style={{ background: 'var(--bg-input)', borderColor: `${colors.border}50` }}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold" style={{ color: colors.text }}>Tier {tier}</h3>
                            <button
                              onClick={() => {
                                const match = findChampionByName(championInput);
                                if (match && !isInAnyTier(match)) addToTier(tier, match);
                              }}
                              disabled={!isValidChampion(championInput) || (findChampionByName(championInput) ? isInAnyTier(findChampionByName(championInput) as string) : false)}
                              className="px-2 py-1 text-xs rounded disabled:opacity-50"
                              style={{ color: 'var(--btn-gradient-text)', backgroundColor: colors.bg }}
                            >
                              Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {championTierlist[tier].map((c) => (
                              <div key={c} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: `${colors.bg}20`, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.border, color: colors.text }}>
                                <span className="font-medium">{c}</span>
                                <button onClick={() => removeFromTier(tier, c)} style={{ color: 'var(--accent-danger)' }}>✕</button>
                              </div>
                            ))}
                            {championTierlist[tier].length === 0 && (
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No champions</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
            </div>
          ) : (
            <div>
              <div className="space-y-3">
                {(['S','A','B','C'] as const).map((tier) => {
                    const tierColors = {
                      S: { bg: '#ef4444', border: '#ef4444', text: '#ef4444' },
                      A: { bg: '#C8AA6E', border: '#C8AA6E', text: '#C8AA6E' },
                      B: { bg: '#3b82f6', border: '#3b82f6', text: '#3b82f6' },
                      C: { bg: '#22c55e', border: '#22c55e', text: '#22c55e' },
                    };
                    const colors = tierColors[tier];
                    return (
                      <div key={tier}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: `${colors.bg}20`, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.border, color: colors.text }}>{tier}</span>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tier</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {user.championTierlist && Array.isArray(user.championTierlist[tier]) && user.championTierlist[tier].length > 0 ? (
                            user.championTierlist[tier].map((c: string, i: number) => (
                              <div key={`${tier}-${i}`} className="px-3 py-2 rounded-lg font-medium" style={{ backgroundColor: `${colors.bg}20`, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.border, color: colors.text }}>
                                {c}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No champions</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          )}
        </div>

        {/* Linked Riot Accounts */}
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Linked Riot Accounts
          </h2>
          <div className="space-y-3 mb-4">
            {user.riotAccounts.map((account) => (
              <div
                key={account.id}
                className="p-4 rounded-lg border-2 flex items-center justify-between"
                style={{
                  background: (isEditMode ? pendingMainAccountId === account.id : account.isMain) ? 'var(--accent-primary-bg)' : 'var(--bg-input)',
                  borderColor: (isEditMode ? pendingMainAccountId === account.id : account.isMain) ? 'var(--accent-primary)' : 'var(--border-card)'
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: account.verified ? 'var(--accent-success)' : 'var(--text-muted)' }}></div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Show username only if not hidden or if viewing own profile */}
                      {(!account.hidden || !isViewingOther) ? (
                        <p className="font-semibold" style={{ color: 'var(--text-main)' }}>
                          {account.gameName}#{account.tagLine}
                          {(isEditMode ? pendingMainAccountId === account.id : account.isMain) && (
                            <span className="ml-2 text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'var(--accent-primary)', color: 'var(--btn-gradient-text)' }}>
                              MAIN
                            </span>
                          )}
                          {account.hidden && !isViewingOther && (
                            <span className="ml-2 text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'var(--accent-info-bg)', color: 'var(--accent-info)', border: '1px solid var(--accent-info-border)' }}>
                              🔒 Hidden
                            </span>
                          )}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-semibold italic" style={{ color: 'var(--text-muted)' }}>
                            Hidden Account
                          </p>
                          {account.isMain && (
                            <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'var(--accent-primary)', color: 'var(--btn-gradient-text)' }}>
                              MAIN
                            </span>
                          )}
                        </div>
                      )}
                      {(() => {
                        const color = rankColor(account.rank || 'UNRANKED');
                        return (
                          <span 
                            className="text-xs px-2 py-1 rounded font-bold"
                            style={{ 
                              backgroundColor: `${color}20`,
                              color,
                              border: `1px solid ${color}`
                            }}
                          >
                            {account.division ? `${account.rank || 'UNRANKED'} ${account.division}` : (account.rank || 'UNRANKED')}
                          </span>
                        );
                      })()}
                      {account.winrate !== null && account.winrate !== undefined ? (
                        <span 
                          className="text-xs px-2 py-1 rounded font-bold"
                          style={{
                            backgroundColor: `${
                              account.winrate <= 40 ? '#ef4444' :
                              account.winrate < 45 ? '#f97316' :
                              account.winrate < 50 ? '#eab308' :
                              account.winrate < 55 ? '#3b82f6' :
                              account.winrate < 65 ? '#22c55e' :
                              account.winrate < 80 ? '#C8AA6E' :
                              '#a855f7'
                            }20`,
                            color: account.winrate <= 40 ? '#ef4444' :
                              account.winrate < 45 ? '#f97316' :
                              account.winrate < 50 ? '#eab308' :
                              account.winrate < 55 ? '#3b82f6' :
                              account.winrate < 65 ? '#22c55e' :
                              account.winrate < 80 ? '#C8AA6E' :
                              '#a855f7',
                            border: `1px solid ${
                              account.winrate <= 40 ? '#ef4444' :
                              account.winrate < 45 ? '#f97316' :
                              account.winrate < 50 ? '#eab308' :
                              account.winrate < 55 ? '#3b82f6' :
                              account.winrate < 65 ? '#22c55e' :
                              account.winrate < 80 ? '#C8AA6E' :
                              '#a855f7'
                            }`
                          }}
                        >
                          {account.winrate.toFixed(1)}% WR
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>N/A WR</span>
                      )}
                    </div>
                    {(!account.hidden || !isViewingOther) && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{account.region}</p>
                    )}
                  </div>
                </div>
                {isEditMode && (
                  <div className="flex items-center space-x-2">
                    {pendingMainAccountId !== account.id && (
                      <>
                        <button
                          onClick={() => handleToggleHidden(account.id, account.hidden)}
                          className="px-3 py-1 rounded text-xs font-medium transition-colors"
                          style={{
                            background: account.hidden ? 'var(--accent-info-bg)' : 'var(--btn-disabled-bg)',
                            color: account.hidden ? 'var(--accent-info)' : 'var(--text-secondary)'
                          }}
                        >
                          {account.hidden ? 'Show' : 'Hide'}
                        </button>
                        <button
                          onClick={() => handleSwitchMain(account.id)}
                          className="px-3 py-1 rounded text-xs font-medium transition-colors"
                          style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)' }}
                        >
                          Set as Main
                        </button>
                        <button
                          onClick={() => handleRemoveAccount(account.id)}
                          className="px-3 py-1 rounded text-xs font-medium transition-colors"
                          style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Link
            href="/verify-test"
            className="inline-flex items-center px-4 py-2 font-bold rounded-lg transition-all text-sm"
            style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Riot Account
          </Link>
        </div>

        {/* Discord Account */}
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" style={{ color: 'var(--accent-discord)' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Discord Account
          </h2>
          {user.discordLinked ? (
            <div className="p-4 rounded-lg flex items-center justify-between" style={{ background: 'var(--accent-discord-bg)', border: '1px solid var(--accent-discord-border)' }}>
              <p className="font-semibold" style={{ color: 'var(--text-main)' }}>{user.discordUsername}</p>
              {!isViewingOther && (
                <button 
                  onClick={async () => {
                    const unlinkOk = await confirm({ title: 'Unlink Discord', message: 'Are you sure you want to unlink your Discord account?', confirmText: 'Unlink' });
                    if (!unlinkOk) return;
                    try {
                      let userId: string | null = null;
                      try { userId = localStorage.getItem('lfd_userId'); } catch {}
                      if (!userId) {
                        showToast('User ID not found. Please log in again.', 'error');
                        return;
                      }
                      const response = await fetch(`${API_URL}/api/auth/discord/unlink?userId=${encodeURIComponent(userId)}`, {
                        method: 'DELETE',
                      });
                      if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        throw new Error(data.error || 'Failed to unlink Discord');
                      }
                      // Refresh profile
                      const profileUrl = userId ? `${API_URL}/api/user/profile?userId=${encodeURIComponent(userId)}&includeHidden=true` : `${API_URL}/api/user/profile?includeHidden=true`;
                      const profileResponse = await fetch(profileUrl);
                      if (profileResponse.ok) {
                        const data = await profileResponse.json();
                        setUser(data);
                      }
                    } catch (err: any) {
                      console.error('Error unlinking Discord:', err);
                      showToast(err.message || 'Failed to unlink Discord account', 'error');
                    }
                  }}
                  className="px-3 py-1 rounded text-xs font-medium transition-colors"
                  style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}
                >
                  Unlink
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg text-center" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>No Discord account linked</p>
              {!isViewingOther && (
                <button
                  onClick={async () => {
                    try {
                      let userId: string | null = null;
                      try { userId = localStorage.getItem('lfd_userId'); } catch {}
                      if (!userId) {
                        showToast('User ID not found. Please log in again.', 'error');
                        return;
                      }
                      const response = await fetch(`${API_URL}/api/auth/discord/login?userId=${encodeURIComponent(userId)}`);
                      if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        throw new Error(data.error || 'Failed to get Discord auth URL');
                      }
                      const data = await response.json();
                      window.location.href = data.url;
                    } catch (err: any) {
                      console.error('Error initiating Discord link:', err);
                      showToast(err.message || 'Failed to start Discord linking', 'error');
                    }
                  }}
                  className="px-4 py-2 font-semibold rounded-lg text-sm transition-colors"
                  style={{ background: 'var(--accent-discord)', color: 'var(--btn-gradient-text)' }}
                >
                  Link Discord
                </button>
              )}
            </div>
          )}
        </div>

        {/* Servers & Anonymous Mode */}
        <div className={`grid grid-cols-1 ${!isViewingOther ? 'md:grid-cols-2' : ''} gap-6`}>
          {/* Servers */}
          <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Region
            </h2>
            {user.region ? (
              <span className="px-3 py-1 rounded-full font-medium text-sm" style={{ background: 'var(--accent-primary-bg)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
                {user.region}
              </span>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No region set</p>
            )}
          </div>

          {/* Anonymous Mode - Only show when viewing own profile */}
          {!isViewingOther && (
            <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
              <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                Anonymous Mode
              </h2>
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {anonymousMode ? 'Profile is hidden from public searches' : 'Profile is visible to everyone'}
                </p>
                <button
                  onClick={handleToggleAnonymous}
                  className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors"
                  style={{ background: anonymousMode ? 'var(--accent-primary)' : 'var(--btn-disabled-bg)' }}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full transition-transform border ${
                      anonymousMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                    style={{ background: anonymousMode ? 'var(--color-bg-primary)' : 'var(--btn-disabled-bg)', borderColor: anonymousMode ? 'var(--accent-primary)' : 'var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Communities */}
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Communities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {user.communities.map((community) => (
              <Link
                key={community.id}
                href={`/communities/${community.id}`}
                className="group p-3 rounded-lg flex items-center space-x-3 transition-all"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--accent-primary-border)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-lg font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96,165,250,0.18), rgba(167,139,250,0.18))',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--accent-primary-border)'
                  }}
                >
                  {community.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold" style={{ color: 'var(--text-main)' }}>{community.name}</p>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: 'rgba(96,165,250,0.18)',
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--accent-primary-border)'
                      }}
                    >
                      {community.role.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Click to view community page
                  </p>
                </div>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Feedback Section */}
        {isViewingOther && (
          <div className="flex gap-3 mb-4">
            <button
              className="px-4 py-2 rounded bg-[var(--accent-primary)] text-[var(--btn-gradient-text)] font-bold shadow"
              onClick={() => setShowFeedbackModal(true)}
            >
              Give Feedback
            </button>
            <button
              className="px-4 py-2 rounded bg-[var(--accent-danger)] text-[var(--btn-gradient-text)] font-bold shadow"
              onClick={() => setShowReportModal(true)}
            >
              Report
            </button>
          </div>
        )}
        {showFeedbackModal && (
          <FeedbackModal
            username={user.username}
            open={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            onSubmit={handleSubmitFeedback}
          />
        )}
        {showReportModal && (
          <ReportModal
            username={user.username}
            open={showReportModal}
            onClose={() => setShowReportModal(false)}
            onSubmit={handleSubmitReport}
          />
        )}
        {/* Feedback Section */}
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Feedback ({user.feedback.length})
          </h2>
          <div className="space-y-3">
            {user.feedback.length > 0 ? (
              user.feedback.map((fb) => (
                <div key={fb.id} className="p-4 rounded-lg relative" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Skill:</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className="w-4 h-4"
                                style={{ color: star <= fb.stars ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Personality:</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((moon) => (
                              <svg
                                key={moon}
                                className="w-4 h-4"
                                style={{ color: moon <= fb.moons ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium">
                        by{' '}
                        <Link
                          href={`/profile/${fb.raterUsername}`}
                          className="hover:underline"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {fb.raterUsername}
                        </Link>
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{fb.date}</span>
                    </div>
                  </div>
                  {fb.comment && <p className="text-sm mt-2" style={{ color: 'var(--text-main)' }}>{fb.comment}</p>}
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmState({ open: true, feedbackId: fb.id })}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-[var(--accent-danger-bg)] transition-colors"
                      title="Delete feedback"
                    >
                      <svg className="w-4 h-4" fill="var(--accent-danger)" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>No feedback yet</p>
            )}
          </div>
        </div>
      </div>
      {/* Confirm delete feedback */}
      <ConfirmModal
        open={confirmState.open}
        title="Delete Feedback"
        message="Are you sure you want to delete this feedback? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setConfirmState({ open: false, feedbackId: null })}
        onConfirm={() => {
          if (confirmState.feedbackId) {
            const id = confirmState.feedbackId;
            setConfirmState({ open: false, feedbackId: null });
            handleDeleteFeedback(id);
          }
        }}
      />

      {/* Toast notifications */}
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}

// Keep default export of ProfilePage

// ============================================================================
// INTEGRATION NOTES FOR FUTURE DEVELOPMENT
// ============================================================================

/*
1. DATA FETCHING:
   - Replace MOCK_USER with real API call
   - Example with SWR:
     import useSWR from 'swr';
     const { data: user, mutate } = useSWR('/api/user/profile');
   - Or React Query:
     const { data: user } = useQuery(['profile'], fetchUserProfile);

2. UPDATE OPERATIONS:
   - Wire all state changes to API mutations
   - Example for playstyles:
     const updatePlaystyles = async (playstyles) => {
       await fetch('/api/user/playstyles', {
         method: 'PATCH',
         body: JSON.stringify({ playstyles })
       });
       mutate(); // Refresh data
     };

3. RIOT ACCOUNT MANAGEMENT:
   - handleSwitchMain → PATCH /api/user/riot-accounts/:id/set-main
   - handleRemoveAccount → DELETE /api/user/riot-accounts/:id
   - Add account → Redirect to /verify-test with return URL

4. ANONYMOUS MODE:
   - Toggle → PATCH /api/user/settings with { anonymousMode: boolean }
   - Should update user privacy settings in database

5. CHAMPIONS EDITOR:
   - Add modal or inline editor for champion list
   - Support tierlist mode toggle
   - Validate max 5 champions in list mode

6. DISCORD INTEGRATION:
   - OAuth flow for Discord linking
   - Store Discord ID and username
   - Unlink should revoke permissions

7. FEEDBACK SYSTEM:
   - Paginate feedback if count is high
   - Add filter by rating
   - Add report/flag functionality

8. LOADING STATES:
   - Show skeletons while fetching user data
   - Disable buttons during mutations
   - Show error states for failed operations
*/
