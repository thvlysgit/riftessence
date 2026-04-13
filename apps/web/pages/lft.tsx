import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SEOHead from '../../api/components/SEOHead';
import { LoadingSpinner } from '../../api/components/LoadingSpinner';
import { CreatePlayerLftModal } from '../components/CreatePlayerLftModal';
import { useGlobalUI } from '../../api/components/GlobalUI';
import { useChat } from '../contexts/ChatContext';
import { getAuthHeader, getAuthToken, getUserIdFromToken } from '../utils/auth';
import { getChampionIconUrl } from '../utils/championData';
import { DiscordIcon } from '../src/components/DiscordBrand';
import NoAccess from '../../api/components/NoAccess';
import { AdSpot, useAds, getAdForPosition } from '../../api/components/AdSpot';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const REGIONS = ['ALL', 'NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
const ROLE_FILTERS = ['ALL', 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
const RANK_ORDER = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const LANGUAGE_FILTERS = ['ALL', 'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish', 'Russian', 'Turkish', 'Korean', 'Japanese', 'Chinese'];
const AVAILABILITY_FILTERS = ['ALL', 'ONCE_A_WEEK', 'TWICE_A_WEEK', 'THRICE_A_WEEK', 'FOUR_TIMES_A_WEEK', 'FIVE_TIMES_A_WEEK', 'SIX_TIMES_A_WEEK', 'EVERYDAY'];
const STAFF_NEED_FILTERS = ['ALL', 'MANAGER', 'COACH', 'OTHER'] as const;
const CANDIDATE_TYPE_FILTERS = ['ALL', 'PLAYER', 'MANAGER', 'COACH', 'OTHER'] as const;
const ROLE_FILTER_LABELS: Record<string, string> = {
  ALL: '🎯 All In-Game Roles',
  TOP: '🛡️ Top',
  JUNGLE: '🌿 Jungle',
  MID: '⚔️ Mid',
  ADC: '🏹 ADC',
  SUPPORT: '❤️ Support',
};
const CANDIDATE_FILTER_LABELS: Record<string, string> = {
  ALL: '🧭 All Candidate Types',
  PLAYER: '🧑 Player',
  MANAGER: '📋 Manager',
  COACH: '🎓 Coach',
  OTHER: '🧩 Other',
};
const STAFF_FILTER_LABELS: Record<string, string> = {
  ALL: '🛠️ All Staff Needs',
  MANAGER: '📋 Manager',
  COACH: '🎓 Coach',
  OTHER: '🧩 Other',
};
const LISTING_FILTER_META: Record<'ALL' | 'TEAMS' | 'PLAYERS' | 'STAFF', { icon: string; label: string }> = {
  ALL: { icon: '🧭', label: 'All' },
  TEAMS: { icon: '🏰', label: 'Teams' },
  PLAYERS: { icon: '🧑', label: 'Talent' },
  STAFF: { icon: '🛠️', label: 'Staff' },
};
const STAFF_NEED_DESCRIPTIONS: Record<string, string> = {
  MANAGER: 'Coordinates roster and operations',
  COACH: 'Leads review, drafts, and progression',
  OTHER: 'Analyst, content, or support specialist',
};
const CANDIDATE_TYPE_LABELS: Record<string, string> = {
  PLAYER: 'Player',
  MANAGER: 'Manager',
  COACH: 'Coach',
  OTHER: 'Other',
};
const CANDIDATE_TYPE_COLORS: Record<string, string> = {
  PLAYER: '#3B82F6',
  MANAGER: '#14B8A6',
  COACH: '#F97316',
  OTHER: '#A855F7',
};

// Role icon helper (League of Legends client style)
const getRoleIcon = (role: string) => {
  const r = role.toUpperCase();
  switch(r) {
    case 'TOP':
      return <svg className="w-3.5 h-3.5" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c32.06 0 64.12-.01 96.18.01-6.72 6.67-13.45 13.33-20.19 19.99H36v56c-6.66 6.73-13.33 13.46-19.99 20.18-.02-32.06 0-64.12-.01-96.18Z"/><path d="M104 44.02c5.32-5.33 10.65-10.64 15.99-15.94.02 30.64.01 61.28.01 91.92-30.64 0-61.28.01-91.93-.01 5.33-5.34 10.66-10.66 16-15.99 19.97-.01 39.95.01 59.93 0V44.02Z" opacity="0.75"/><path d="M56 56h28v28H56V56Z" opacity="0.75"/></svg>;
    case 'JUNGLE':
      return <svg className="w-3.5 h-3.5" viewBox="0 0 136 136" fill="currentColor"><path d="M72.13 57.86C78.7 41.1 90.04 26.94 99.94 12.1 93 29.47 84.31 46.87 84.04 65.97c-.73 4.81-2.83 9.31-4 14.03-2.08-7.57-4.91-14.9-7.91-22.14ZM36.21 12.35c13.06 20.19 26.67 40.61 33.61 63.87 4.77 15.49 5.42 32.94-1.8 47.8-5.58-6.1-11.08-12.29-16.71-18.34-4.97-4.72-10.26-9.1-15.32-13.71-1.55-11.73-2.97-23.87-8.72-34.42-2.75-5.24-6.71-9.72-11.19-13.55 9.67 4.75 19.18 10.41 26.23 18.72 4.37 4.98 7.46 10.94 9.69 17.15 1.15-10.29.58-20.79-2.05-30.81-3.31-12.68-8.99-24.55-13.74-36.71ZM105.84 53.83c4.13-4 8.96-7.19 14.04-9.84-4.4 3.88-8.4 8.32-11.14 13.55-5.75 10.56-7.18 22.71-8.74 34.45-5.32 5.35-10.68 10.65-15.98 16.01.15-4.37-.25-8.84 1.02-13.1 3.39-15.08 9.48-30.18 20.8-41.07Z"/></svg>;
    case 'MID':
    case 'MIDDLE':
      return <svg className="w-3.5 h-3.5" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c22.67 0 45.33 0 67.99.01C78.62 21.34 73.28 26.69 67.88 32c-11.96 0-23.92-.01-35.88 0-.01 12 .01 24-.01 36-5.32 5.3-10.64 10.6-15.98 15.89C15.99 61.26 16 38.63 16 16zm87.95 51.9c5.32-5.37 10.69-10.68 16.04-16.02.02 22.71.01 45.41 0 68.12-22.65 0-45.31.01-67.97-.01 5.33-5.33 10.65-10.67 15.99-15.99 12-.01 23.99.01 35.99 0 .04-12.04-.05-24.07-.05-36.1z" opacity="0.75"/><path d="M100.02 16H120v19.99C92 64 64 92 35.99 120H16v-19.99C44 72 72 43.99 100.02 16z"/></svg>;
    case 'ADC':
    case 'BOT':
    case 'BOTTOM':
      return <Image src="/assets/BotLane.png" alt="Bot" width={14} height={14} className="w-3.5 h-3.5" style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(16%) saturate(1018%) hue-rotate(8deg) brightness(91%) contrast(85%)' }} />;
    case 'SUPPORT':
    case 'SUP':
      return <svg className="w-3.5 h-3.5" viewBox="0 0 136 136" fill="currentColor"><path d="M52.21 12.03c10.33-.1 20.66.06 30.99-.08 1.71 2.62 3.2 5.37 4.79 8.07C81.32 28 74.68 36.01 68 43.98 61.32 36 54.66 28 48.01 19.99c1.4-2.65 2.82-5.29 4.2-7.96ZM0 36.3c14.64-.68 29.33-.11 43.99-.3C48 40 52 44 56 48.01c-2.67 9.32-5.32 18.66-8.01 27.98-6.66-2.65-13.32-5.32-19.98-7.99 3.97-5.35 8.02-10.63 11.96-15.99-5.01-.08-10.15.4-15-1.14C15.58 48.12 7.75 42.05 0 36.34v-.04ZM92.02 36c14.66.05 29.32-.09 43.98.07v.03c-7.3 5.9-15.1 11.53-24.1 14.5-5.11 1.85-10.59 1.34-15.91 1.41 4.01 5.32 8 10.65 11.99 15.98-6.64 2.7-13.31 5.34-19.97 8-2.69-9.32-5.34-18.65-8.01-27.98C84.01 44 88 39.99 92.02 36ZM64.01 52.11c1.36 1.26 2.7 2.55 3.99 3.89 1.32-1.33 2.65-2.65 3.99-3.97 4.04 19.97 7.97 39.96 12.02 59.92-5.31 4.05-10.66 8.07-16.04 12.03-5.32-4.01-10.67-7.97-15.98-12.01 4.04-19.94 7.96-39.92 12.02-59.86Z"/></svg>;
    default:
      return null;
  }
};

const getStaffIcon = (role: string) => {
  const normalized = role.toUpperCase();
  if (normalized === 'MANAGER') {
    return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 14l2 2 4-4"/></svg>;
  }
  if (normalized === 'COACH') {
    return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
  }
  return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>;
};

const getCandidateTypeIcon = (candidateType: string) => {
  const normalized = candidateType.toUpperCase();
  if (normalized === 'PLAYER') {
    return <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;
  }
  return getStaffIcon(normalized);
};

const getLanguageBadge = (language: string) => {
  const langStyles: Record<string, { background: string; color: string; border: string; textShadow?: string }> = {
    'English': { 
      background: 'linear-gradient(135deg, #012169 0%, #012169 45%, #C8102E 45%, #C8102E 55%, #012169 55%, #012169 100%)', 
      color: '#FFFFFF', 
      border: '#C8102E',
      textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 0 4px rgba(200,16,46,0.5)'
    },
    'Spanish': { 
      background: 'linear-gradient(to bottom, #C8102E 0%, #C8102E 33%, #FFC400 33%, #FFC400 66%, #C8102E 66%, #C8102E 100%)', 
      color: '#000000', 
      border: '#C8102E',
      textShadow: '0 0 3px #FFFFFF, 0 0 3px #FFFFFF'
    },
    'French': { 
      background: 'linear-gradient(to right, #002395 0%, #002395 33%, #FFFFFF 33%, #FFFFFF 66%, #ED2939 66%, #ED2939 100%)', 
      color: '#000000', 
      border: '#002395',
      textShadow: '0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 1px 2px rgba(0,0,0,0.3)'
    },
    'German': { 
      background: 'linear-gradient(to bottom, #000000 0%, #000000 33%, #DD0000 33%, #DD0000 66%, #FFCE00 66%, #FFCE00 100%)', 
      color: '#FFFFFF', 
      border: '#000000',
      textShadow: '0 0 3px #000000, 0 1px 2px rgba(0,0,0,0.5)'
    },
    'Italian': { 
      background: 'linear-gradient(to right, #009246 0%, #009246 33%, #FFFFFF 33%, #FFFFFF 66%, #CE2B37 66%, #CE2B37 100%)', 
      color: '#000000', 
      border: '#009246',
      textShadow: '0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 1px 2px rgba(0,0,0,0.3)'
    },
    'Portuguese': { 
      background: 'linear-gradient(to right, #006600 0%, #006600 40%, #FF0000 40%, #FF0000 100%)', 
      color: '#FFFFFF', 
      border: '#006600',
      textShadow: '0 1px 3px rgba(0,0,0,0.6)'
    },
    'Polish': { 
      background: 'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 50%, #DC143C 50%, #DC143C 100%)', 
      color: '#000000', 
      border: '#DC143C',
      textShadow: '0 0 3px #FFFFFF, 0 1px 2px rgba(220,20,60,0.5)'
    },
    'Russian': { 
      background: 'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 33%, #0039A6 33%, #0039A6 66%, #D52B1E 66%, #D52B1E 100%)', 
      color: '#000000', 
      border: '#0039A6',
      textShadow: '0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 1px 2px rgba(0,0,0,0.3)'
    },
    'Turkish': { 
      background: '#E30A17', 
      color: '#FFFFFF', 
      border: '#E30A17',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
    },
    'Korean': { 
      background: '#FFFFFF', 
      color: '#003478', 
      border: '#CD121A',
      textShadow: '0 1px 1px rgba(0,0,0,0.1)'
    },
    'Japanese': { 
      background: '#FFFFFF', 
      color: '#BC002D', 
      border: '#BC002D',
      textShadow: '0 1px 1px rgba(0,0,0,0.1)'
    },
    'Chinese': { 
      background: '#DE2910', 
      color: '#FFDE00', 
      border: '#DE2910',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
    },
  };

  const style = langStyles[language] || { background: '#3b82f6', color: '#FFFFFF', border: '#3b82f6', textShadow: '0 1px 2px rgba(0,0,0,0.3)' };
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border" 
      style={{ 
        background: style.background, 
        color: style.color, 
        borderColor: style.border,
        textShadow: style.textShadow
      }}>
      {language}
    </span>
  );
};

const getRankColor = (rank: string) => {
  const colors: Record<string,string> = {
    IRON: '#4A4A4A',
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#00CED1',
    EMERALD: '#50C878',
    DIAMOND: '#B9F2FF',
    MASTER: '#9D4EDD',
    GRANDMASTER: '#FF6B6B',
    CHALLENGER: '#F4E04D',
    UNRANKED: '#6B7280',
  };
  return colors[rank] || colors.UNRANKED;
};

const getRankIcon = (rank: string) => {
  const rankLower = rank.toLowerCase();
  const iconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${rankLower}.png`;
  return <img src={iconUrl} alt={rank} className="inline-block w-5 h-5" />;
};

const getRankBadge = (rank: string, division?: string) => {
  const color = getRankColor(rank);
  const displayText = division ? `${rank} ${division}` : rank;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold border" style={{ background: `${color}15`, color: color, borderColor: color }}>
      {getRankIcon(rank)}
      {displayText}
    </span>
  );
};

type LftPost = {
  id: string;
  type: 'TEAM' | 'PLAYER';
  createdAt: string;
  teamId?: string | null;
  candidateType?: 'PLAYER' | 'MANAGER' | 'COACH' | 'OTHER' | string;
  representedName?: string | null;
  // Common
  region: string;
  authorId: string;
  isAdmin?: boolean;
  preferredRole?: string | null;
  secondaryRole?: string | null;
  activeUsernameDecoration?: string | null;
  activeHoverEffect?: string | null;
  activeNameplateFont?: string | null;
  
  // TEAM fields
  teamName?: string;
  rolesNeeded?: string[];
  staffNeeded?: string[];
  averageRank?: string;
  averageDivision?: string | null;
  scrims?: boolean;
  minAvailability?: string;
  coachingAvailability?: string;
  details?: string;
  discordUsername?: string;
  
  // PLAYER fields
  username?: string;
  mainRole?: string;
  rank?: string;
  division?: string | null;
  championPool?: string[];
  championTierlist?: { S?: string[]; A?: string[]; B?: string[]; C?: string[] } | null;
  experience?: string;
  languages?: string[];
  skills?: string[];
  age?: number;
  availability?: string;
};

const USERNAME_DECORATION_STYLES: Record<string, React.CSSProperties> = {
  username_gilded_edge: {
    textShadow: '0 0 10px rgba(251, 191, 36, 0.34)',
    WebkitTextStroke: '0.6px rgba(245, 158, 11, 0.65)',
  },
  username_prismatic_slash: {
    backgroundImage: 'linear-gradient(92deg, #67e8f9, #93c5fd 35%, #a78bfa 68%, #f9a8d4)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 12px rgba(103, 232, 249, 0.28)',
  },
  username_solar_flare: {
    backgroundImage: 'linear-gradient(88deg, #fef08a, #fbbf24 30%, #fb923c 64%, #ef4444)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 12px rgba(251, 146, 60, 0.3)',
  },
  username_void_glass: {
    backgroundImage: 'linear-gradient(90deg, #ddd6fe, #a78bfa 40%, #60a5fa 75%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 10px rgba(147, 51, 234, 0.32)',
  },
};

const USERNAME_FONT_FAMILIES: Record<string, string> = {
  font_orbitron: 'Orbitron, "Segoe UI", sans-serif',
  font_cinzel: 'Cinzel, Georgia, serif',
  font_exo2: '"Exo 2", "Segoe UI", sans-serif',
};

const USERNAME_HOVER_EFFECT_CLASSES: Record<string, string> = {
  hover_aurora_ring: 'username-hover-aurora-ring',
  hover_ember_trail: 'username-hover-ember-trail',
  hover_eclipse_gleam: 'username-hover-eclipse-gleam',
};

export default function LFTPage() {
  const [allPosts, setAllPosts] = useState<LftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingFilter, setListingFilter] = useState<'ALL' | 'TEAMS' | 'PLAYERS' | 'STAFF'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [candidateTypeFilter, setCandidateTypeFilter] = useState<(typeof CANDIDATE_TYPE_FILTERS)[number]>('ALL');
  const [languageFilter, setLanguageFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [minimumRankFilter, setMinimumRankFilter] = useState('ALL');
  const [staffNeedFilter, setStaffNeedFilter] = useState<(typeof STAFF_NEED_FILTERS)[number]>('ALL');
  const [scrimsOnly, setScrimsOnly] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);
  const [noAccessAction, setNoAccessAction] = useState<'find-players' | 'find-team'>('find-team');
  const { showToast, confirm } = useGlobalUI();
  const { openConversation } = useChat();
  
  // Ads
  const { ads, frequency: adFrequency } = useAds('lft');
  const [dismissedAdIds, setDismissedAdIds] = useState<string[]>([]);

  const handleDismissAd = (adId: string) => {
    setDismissedAdIds(prev => [...prev, adId]);
  };

  const getCurrentUserId = () => {
    const token = getAuthToken();
    return token ? getUserIdFromToken(token) : null;
  };

  const formatAvailability = (avail: string | undefined) => {
    if (!avail) return '';
    return avail.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  const getRankIndex = (rank: string | null | undefined) => {
    if (!rank) return -1;
    return RANK_ORDER.indexOf(String(rank).toUpperCase());
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchLft() {
      try {
        setLoading(true);
        const currentUserId = getCurrentUserId();
        const url = `${API_URL}/api/lft/posts${currentUserId ? `?userId=${encodeURIComponent(currentUserId)}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setAllPosts(Array.isArray(data) ? data : []);
          }
        } else {
          console.error('Failed to fetch LFT posts');
          if (!cancelled) setAllPosts([]);
        }
      } catch (err) {
        console.error('Error fetching LFT posts:', err);
        if (!cancelled) setAllPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLft();
    return () => { cancelled = true; };
  }, []);

  const filteredPosts = React.useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const minimumRankIndex = minimumRankFilter === 'ALL' ? -1 : getRankIndex(minimumRankFilter);
    const effectiveCandidateTypeFilter = listingFilter === 'PLAYERS' ? 'PLAYER' : candidateTypeFilter;

    return allPosts.filter((post) => {
      const normalizedCandidateType = String(post.candidateType || 'PLAYER').toUpperCase();
      const playerIsStaffListing = post.type === 'PLAYER' && normalizedCandidateType !== 'PLAYER';
      const teamHasStaffNeeds = post.type === 'TEAM' && Array.isArray(post.staffNeeded) && post.staffNeeded.length > 0;

      if (listingFilter === 'TEAMS' && post.type !== 'TEAM') return false;
      if (listingFilter === 'PLAYERS' && (post.type !== 'PLAYER' || normalizedCandidateType !== 'PLAYER')) return false;
      if (listingFilter === 'STAFF' && !teamHasStaffNeeds && !playerIsStaffListing) {
        return false;
      }

      if (regionFilter !== 'ALL' && post.region !== regionFilter) return false;

      if (effectiveCandidateTypeFilter !== 'ALL') {
        if (post.type !== 'PLAYER' || normalizedCandidateType !== effectiveCandidateTypeFilter) return false;
      }

      if (roleFilter !== 'ALL') {
        if (post.type === 'TEAM') {
          if (!post.rolesNeeded?.includes(roleFilter)) return false;
        } else {
          if (normalizedCandidateType !== 'PLAYER') return false;
          if ((post.mainRole || '').toUpperCase() !== roleFilter) return false;
        }
      }

      if (staffNeedFilter !== 'ALL') {
        if (post.type === 'TEAM') {
          const staff = Array.isArray(post.staffNeeded) ? post.staffNeeded.map((entry) => entry.toUpperCase()) : [];
          if (!staff.includes(staffNeedFilter)) return false;
        } else if (normalizedCandidateType !== staffNeedFilter) {
          return false;
        }
      }

      if (languageFilter !== 'ALL') {
        const langs = Array.isArray(post.languages) ? post.languages : [];
        if (!langs.includes(languageFilter)) return false;
      }

      if (availabilityFilter !== 'ALL') {
        const availability = post.type === 'TEAM' ? post.minAvailability : post.availability;
        if (availability !== availabilityFilter) return false;
      }

      if (scrimsOnly) {
        if (post.type !== 'TEAM' || !post.scrims) return false;
      }

      if (minimumRankIndex > -1) {
        const candidateRank = post.type === 'TEAM' ? post.averageRank : post.rank;
        const candidateRankIndex = getRankIndex(candidateRank || null);
        if (candidateRankIndex === -1 || candidateRankIndex < minimumRankIndex) return false;
      }

      if (normalizedSearch) {
        const searchableParts = [
          post.teamName,
          post.username,
          post.representedName,
          post.details,
          post.mainRole,
          post.candidateType,
          post.region,
          ...(post.rolesNeeded || []),
          ...(post.staffNeeded || []),
          ...(post.languages || []),
          ...(post.skills || []),
          ...(post.championPool || []),
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        if (!searchableParts.some((part) => part.includes(normalizedSearch))) {
          return false;
        }
      }

      return true;
    });
  }, [
    allPosts,
    listingFilter,
    searchText,
    regionFilter,
    roleFilter,
    candidateTypeFilter,
    languageFilter,
    availabilityFilter,
    minimumRankFilter,
    staffNeedFilter,
    scrimsOnly,
  ]);

  useEffect(() => {
    setVisibleCount(25);
  }, [
    listingFilter,
    searchText,
    regionFilter,
    roleFilter,
    candidateTypeFilter,
    languageFilter,
    availabilityFilter,
    minimumRankFilter,
    staffNeedFilter,
    scrimsOnly,
  ]);

  const displayedPosts = React.useMemo(() => filteredPosts.slice(0, visibleCount), [filteredPosts, visibleCount]);
  const posts = filteredPosts;
  const listingCounts = React.useMemo(() => {
    const teams = allPosts.filter((post) => post.type === 'TEAM').length;
    const players = allPosts.filter((post) => {
      const normalizedCandidateType = String(post.candidateType || 'PLAYER').toUpperCase();
      return post.type === 'PLAYER' && normalizedCandidateType === 'PLAYER';
    }).length;
    const staff = allPosts.filter((post) => {
      const normalizedCandidateType = String(post.candidateType || 'PLAYER').toUpperCase();
      const playerIsStaffListing = post.type === 'PLAYER' && normalizedCandidateType !== 'PLAYER';
      const teamHasStaffNeeds = post.type === 'TEAM' && Array.isArray(post.staffNeeded) && post.staffNeeded.length > 0;
      return playerIsStaffListing || teamHasStaffNeeds;
    }).length;
    return {
      ALL: allPosts.length,
      TEAMS: teams,
      PLAYERS: players,
      STAFF: staff,
    };
  }, [allPosts]);

  const maybeShowDiscordRecruitingNudge = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers || !('Authorization' in headers)) return;

      const profileRes = await fetch(`${API_URL}/api/user/profile`, { headers });
      if (!profileRes.ok) return;

      const profile = await profileRes.json();
      const needsDiscordLink = !profile.discordLinked;
      const needsDmSetup = !profile.discordDmNotifications;

      if (!needsDiscordLink && !needsDmSetup) {
        return;
      }

      const setupNow = await confirm({
        title: 'We Have a Feature That Helps',
        message: needsDiscordLink
          ? 'RiftEssence can help you stay on top of recruiting through Discord reminders. Link your Discord account first, then enable DM notifications.'
          : 'RiftEssence can help you stay on top of recruiting through Discord reminders. Enable Discord DM notifications so the bot can send timely updates.',
        confirmText: needsDiscordLink ? 'Open Profile Setup' : 'Open DM Setup',
        cancelText: 'Later',
      });

      if (setupNow && typeof window !== 'undefined') {
        window.location.href = needsDiscordLink ? '/profile' : '/settings';
      }
    } catch (nudgeError) {
      console.error('Failed to check Discord DM setup state:', nudgeError);
    }
  };

  const handlePlayerSubmit = async (data: any) => {
    try {
      const token = getAuthToken();
      const userId = token ? getUserIdFromToken(token) : null;
      if (!userId) {
        setShowPlayerModal(false);
        showToast('Please log in to create a post', 'error');
        return;
      }

      const res = await fetch(`${API_URL}/api/lft/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, type: 'PLAYER', userId }),
      });

      if (res.ok) {
        showToast('Listing published successfully!', 'success');
        setShowPlayerModal(false);
        // Refresh posts
        const currentUserId = getCurrentUserId();
        const refreshUrl = `${API_URL}/api/lft/posts${currentUserId ? `?userId=${encodeURIComponent(currentUserId)}` : ''}`;
        const refreshRes = await fetch(refreshUrl);
        if (refreshRes.ok) {
          const posts = await refreshRes.json();
          setAllPosts(posts);
        }

        await maybeShowDiscordRecruitingNudge();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to create post', 'error');
      }
    } catch (err) {
      console.error('Error creating player post:', err);
      showToast('Failed to create post', 'error');
    }
  };

  const resetFilters = () => {
    setListingFilter('ALL');
    setSearchText('');
    setRegionFilter('ALL');
    setRoleFilter('ALL');
    setCandidateTypeFilter('ALL');
    setLanguageFilter('ALL');
    setAvailabilityFilter('ALL');
    setMinimumRankFilter('ALL');
    setStaffNeedFilter('ALL');
    setScrimsOnly(false);
  };

  return (
    <>
      <SEOHead
        title="Looking for Team"
        description="Recruit players for your League of Legends team or join an active team. Community ratings, Riot API verified profiles, role and rank filters."
        path="/lft"
        keywords="LoL LFT, League of Legends team, find LoL team, recruit LoL players, LoL team finder, League team recruitment"
      />
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-4">
          <div
            className="border rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(120deg, var(--color-bg-secondary) 0%, rgba(59, 130, 246, 0.09) 55%, rgba(34, 197, 94, 0.07) 100%)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.20) 0%, transparent 72%)' }} />
            <div className="absolute -left-8 bottom-0 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.16) 0%, transparent 72%)' }} />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  RiftEssence Marketplace
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold mt-1" style={{ color: 'var(--color-accent-1)' }}>
                  LFT Feed
                </h1>
                <p className="mt-2 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  One board for teams recruiting and talent discovering opportunities. Players, coaches, managers, and specialists can all list directly.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={async () => {
                    const token = getAuthToken();
                    const userId = token ? getUserIdFromToken(token) : null;

                    if (!userId) {
                      setNoAccessAction('find-team');
                      setShowNoAccessModal(true);
                      return;
                    }

                    try {
                      const response = await fetch(`${API_URL}/api/user/profile?userId=${userId}`);
                      if (!response.ok) throw new Error('Failed to fetch profile');
                      const data = await response.json();

                      if (!data.region) {
                        showToast('Please set your region in your profile before creating an LFT post', 'error');
                        return;
                      }

                      setShowPlayerModal(true);
                    } catch (error) {
                      console.error('Profile validation error:', error);
                      showToast('Failed to validate profile. Please try again.', 'error');
                    }
                  }}
                  className="px-5 py-2.5 font-semibold rounded-lg"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  Create My Listing
                </button>
                <Link
                  href="/teams/dashboard"
                  className="px-5 py-2.5 font-semibold rounded-lg border text-center"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-accent-1)',
                  }}
                >
                  Team Recruiting Dashboard
                </Link>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { key: 'ALL', label: 'Total Listings' },
                { key: 'TEAMS', label: 'Teams Recruiting' },
                { key: 'PLAYERS', label: 'Talent Listings' },
                { key: 'STAFF', label: 'Staff Opportunities' },
              ] as const).map((item) => (
                <div
                  key={item.key}
                  className="rounded-lg px-3 py-2 border"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                  }}
                >
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{listingCounts[item.key]}</p>
                </div>
              ))}
            </div>

            <div className="relative mt-4 text-xs sm:text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Team listings can only be published by existing teams through Teams Dashboard. Candidate listings are published directly from your own profile.
            </div>

            <div className="relative mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
              {(['MANAGER', 'COACH', 'OTHER'] as const).map((key) => (
                <div
                  key={key}
                  className="rounded-lg border px-3 py-2"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                  }}
                >
                  <p className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: CANDIDATE_TYPE_COLORS[key] || 'var(--color-accent-1)' }}>{getStaffIcon(key)} {key}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {STAFF_NEED_DESCRIPTIONS[key]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="border rounded-2xl p-4"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {(['ALL', 'TEAMS', 'PLAYERS', 'STAFF'] as const).map((mode) => {
                const active = listingFilter === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setListingFilter(mode)}
                    className="px-3 py-1.5 rounded-full font-medium text-sm transition-all"
                    style={{
                      backgroundColor: active ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                      color: active ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                      border: `1px solid ${active ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                    }}
                  >
                    {LISTING_FILTER_META[mode].icon} {LISTING_FILTER_META[mode].label} ({listingCounts[mode]})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search names, staff roles, regions, skills, languages..."
                className="w-full px-4 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                className="px-4 py-2.5 rounded-lg border font-medium text-sm"
                style={{
                  backgroundColor: showAdvancedFilters ? 'rgba(59, 130, 246, 0.14)' : 'var(--color-bg-tertiary)',
                  borderColor: showAdvancedFilters ? 'var(--color-accent-1)' : 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  minWidth: 150,
                }}
              >
                {showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters'}
              </button>
              <button
                onClick={resetFilters}
                className="px-4 py-2.5 rounded-lg border font-medium text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-accent-1)',
                }}
              >
                Reset
              </button>
            </div>

            {showAdvancedFilters && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {REGIONS.map((region) => (
                    <option key={region} value={region}>{region === 'ALL' ? '🌍 All Regions' : `🌍 ${region}`}</option>
                  ))}
                </select>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {ROLE_FILTERS.map((role) => (
                    <option key={role} value={role}>{ROLE_FILTER_LABELS[role] || role}</option>
                  ))}
                </select>

                <select
                  value={candidateTypeFilter}
                  onChange={(e) => setCandidateTypeFilter(e.target.value as (typeof CANDIDATE_TYPE_FILTERS)[number])}
                  className="px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {CANDIDATE_TYPE_FILTERS.map((type) => (
                    <option key={type} value={type}>{CANDIDATE_FILTER_LABELS[type] || type}</option>
                  ))}
                </select>

                <select
                  value={staffNeedFilter}
                  onChange={(e) => setStaffNeedFilter(e.target.value as (typeof STAFF_NEED_FILTERS)[number])}
                  className="px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {STAFF_NEED_FILTERS.map((role) => (
                    <option key={role} value={role}>{STAFF_FILTER_LABELS[role] || role}</option>
                  ))}
                </select>

                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {LANGUAGE_FILTERS.map((language) => (
                    <option key={language} value={language}>{language === 'ALL' ? '🗣️ All Languages' : `🗣️ ${language}`}</option>
                  ))}
                </select>

                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {AVAILABILITY_FILTERS.map((availability) => (
                    <option key={availability} value={availability}>
                      {availability === 'ALL' ? '📅 All Availability' : `📅 ${formatAvailability(availability)}`}
                    </option>
                  ))}
                </select>

                <select
                  value={minimumRankFilter}
                  onChange={(e) => setMinimumRankFilter(e.target.value)}
                  className="px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="ALL">Any Rank</option>
                  {RANK_ORDER.map((rank) => (
                    <option key={rank} value={rank}>🏅 Minimum Rank: {rank}</option>
                  ))}
                </select>

                <label
                  className="flex items-center gap-2 px-3 py-2 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <input type="checkbox" checked={scrimsOnly} onChange={(e) => setScrimsOnly(e.target.checked)} />
                  ⚔️ Scrims-only teams
                </label>
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <section className="space-y-4">
            {posts.length === 0 ? (
              <div
                className="border rounded-2xl p-8 text-center"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}
              >
                <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  No listings match your filters
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Try resetting filters or broaden search terms.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 rounded-lg border text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-accent-1)',
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedPosts.map((p, index) => {
                  const currentUserId = getCurrentUserId();
                  const ad = getAdForPosition(ads, index, adFrequency, undefined, undefined, dismissedAdIds);
                  const isTeam = p.type === 'TEAM';
                  const normalizedCandidateType = String(p.candidateType || 'PLAYER').toUpperCase();
                  const accentColor = isTeam
                    ? '#22C55E'
                    : CANDIDATE_TYPE_COLORS[normalizedCandidateType] || CANDIDATE_TYPE_COLORS.PLAYER;
                  const customOtherHeading = normalizedCandidateType === 'OTHER' && typeof p.representedName === 'string' && p.representedName.trim().length > 0
                    ? p.representedName.trim()
                    : null;
                  const heading = isTeam
                    ? (p.teamName || 'Unnamed Team')
                    : (customOtherHeading || p.username || 'Unknown Listing');
                  const shouldStyleUsernameHeading = !isTeam && !customOtherHeading;
                  const usernameDecorationStyle = shouldStyleUsernameHeading && p.activeUsernameDecoration
                    ? USERNAME_DECORATION_STYLES[p.activeUsernameDecoration] || undefined
                    : undefined;
                  const usernameFontFamily = shouldStyleUsernameHeading && p.activeNameplateFont
                    ? USERNAME_FONT_FAMILIES[p.activeNameplateFont] || undefined
                    : undefined;
                  const usernameHoverClass = shouldStyleUsernameHeading && p.activeHoverEffect
                    ? USERNAME_HOVER_EFFECT_CLASSES[p.activeHoverEffect] || ''
                    : '';
                  const subHeading = isTeam
                    ? 'Team Recruiting'
                    : `${CANDIDATE_TYPE_LABELS[normalizedCandidateType] || normalizedCandidateType} Listing`;

                  return (
                    <React.Fragment key={p.id}>
                      {ad && (
                        <AdSpot ad={ad} feed="lft" userId={currentUserId} onDismiss={handleDismissAd} />
                      )}

                      <article
                        className="border rounded-2xl p-5 relative overflow-hidden"
                        style={{
                          borderColor: 'var(--color-border)',
                          backgroundColor: 'var(--color-bg-secondary)',
                          boxShadow: 'var(--shadow)',
                        }}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1.5"
                          style={{ backgroundColor: accentColor }}
                        />
                        <div
                          className="absolute -top-12 -right-12 w-52 h-52 rounded-full pointer-events-none"
                          style={{ background: `radial-gradient(circle, ${accentColor}22 0%, transparent 72%)` }}
                        />

                        <div className="relative space-y-4">
                          <header className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
                              >
                                {isTeam ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                  </svg>
                                ) : (
                                  getCandidateTypeIcon(normalizedCandidateType)
                                )}
                              </div>

                              <div>
                                <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: accentColor }}>
                                  {subHeading}
                                </p>
                                <h3
                                  className={`text-xl font-bold leading-tight username-hover-base ${usernameHoverClass}`.trim()}
                                  style={{
                                    color: 'var(--color-text-primary)',
                                    fontFamily: usernameFontFamily || undefined,
                                    ...(usernameDecorationStyle || {}),
                                  }}
                                >
                                  {heading}
                                </h3>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                              <span
                                className="px-2 py-1 rounded text-xs border"
                                style={{
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-secondary)',
                                  backgroundColor: 'var(--color-bg-tertiary)',
                                }}
                              >
                                🕒 {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span
                                className="px-2 py-1 rounded text-xs border"
                                style={{
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-secondary)',
                                  backgroundColor: 'var(--color-bg-tertiary)',
                                }}
                              >
                                🌍 {p.region}
                              </span>
                              {p.discordUsername && (
                                <span
                                  className="discord-chip px-2 py-1 rounded text-xs border inline-flex items-center gap-1"
                                >
                                  <DiscordIcon className="w-3.5 h-3.5" />
                                  {p.discordUsername}
                                </span>
                              )}
                            </div>
                          </header>

                          {isTeam ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>🎯 Roles Needed</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {Array.isArray(p.rolesNeeded) && p.rolesNeeded.length > 0 ? (
                                      p.rolesNeeded.map((role) => (
                                        <span
                                          key={role}
                                          className="text-xs px-2 py-1 rounded font-semibold border inline-flex items-center gap-1"
                                          style={{ background: 'rgba(200, 170, 109, 0.15)', color: '#C8AA6D', borderColor: '#C8AA6D' }}
                                        >
                                          {getRoleIcon(role)}
                                          {role}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No in-game role filters set</span>
                                    )}
                                  </div>
                                </div>

                                <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>🛠️ Staff Needed</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {Array.isArray(p.staffNeeded) && p.staffNeeded.length > 0 ? (
                                      p.staffNeeded.map((staffRole) => (
                                        <span
                                          key={staffRole}
                                          className="text-xs px-2 py-1 rounded font-semibold border inline-flex items-center gap-1"
                                          title={STAFF_NEED_DESCRIPTIONS[staffRole] || ''}
                                          style={{
                                            background: 'rgba(59, 130, 246, 0.12)',
                                            color: '#3B82F6',
                                            borderColor: 'rgba(59, 130, 246, 0.35)',
                                          }}
                                        >
                                          {getStaffIcon(staffRole)}
                                          {staffRole}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No staff positions listed</span>
                                    )}
                                  </div>
                                </div>

                                <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                                  <p className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>📊 Team Snapshot</p>
                                  <div className="flex flex-wrap gap-2">
                                    {p.averageRank ? getRankBadge(p.averageRank, p.averageDivision || undefined) : (
                                      <span className="px-2 py-1 rounded text-xs border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                                        🏅 Rank: Unspecified
                                      </span>
                                    )}
                                    {typeof p.scrims === 'boolean' && (
                                      <span
                                        className="px-2 py-1 rounded text-xs border font-semibold"
                                        style={{
                                          borderColor: p.scrims ? '#22C55E' : '#EF4444',
                                          color: p.scrims ? '#22C55E' : '#EF4444',
                                          backgroundColor: p.scrims ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                        }}
                                      >
                                        ⚔️ Scrims: {p.scrims ? 'Yes' : 'No'}
                                      </span>
                                    )}
                                    {p.minAvailability && (
                                      <span className="px-2 py-1 rounded text-xs border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                        📅 {formatAvailability(p.minAvailability)}
                                      </span>
                                    )}
                                    {p.coachingAvailability && (
                                      <span className="px-2 py-1 rounded text-xs border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                        🎓 {formatAvailability(p.coachingAvailability)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {p.details && (
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                  {p.details}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-2 pt-1">
                                {p.teamId && (
                                  <Link
                                    href={`/teams/${p.teamId}`}
                                    className="inline-flex px-3 py-1.5 rounded-lg border text-sm font-medium items-center gap-1"
                                    style={{
                                      background: 'var(--color-bg-tertiary)',
                                      borderColor: 'var(--color-border)',
                                      color: 'var(--color-accent-1)',
                                    }}
                                  >
                                    🏰 Open Team Page
                                  </Link>
                                )}
                                {p.authorId !== currentUserId && (
                                  <button
                                    onClick={() => openConversation(p.authorId)}
                                    className="inline-flex px-3 py-1.5 rounded-lg text-sm font-medium border items-center gap-1"
                                    style={{
                                      background: 'var(--color-bg-tertiary)',
                                      color: 'var(--color-accent-1)',
                                      borderColor: 'var(--color-border)',
                                    }}
                                  >
                                    💬 Message
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="rounded-lg border p-3 md:col-span-2 space-y-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                                  <div className="flex flex-wrap gap-2">
                                    <span
                                      className="px-3 py-1.5 rounded text-sm border font-semibold inline-flex items-center gap-1.5"
                                      style={{
                                        borderColor: accentColor,
                                        color: accentColor,
                                        backgroundColor: `${accentColor}22`,
                                      }}
                                    >
                                      {getCandidateTypeIcon(normalizedCandidateType)}
                                      {CANDIDATE_TYPE_LABELS[normalizedCandidateType] || normalizedCandidateType}
                                    </span>

                                    {normalizedCandidateType === 'PLAYER' && p.mainRole && (
                                      <span className="text-sm px-3 py-1.5 rounded font-semibold border inline-flex items-center gap-1.5" style={{ background: 'rgba(200, 170, 109, 0.15)', color: '#C8AA6D', borderColor: '#C8AA6D' }}>
                                        {getRoleIcon(p.mainRole)}
                                        {p.mainRole}
                                      </span>
                                    )}

                                    {p.rank && getRankBadge(p.rank, p.division || undefined)}
                                  </div>

                                  {p.details ? (
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                      {p.details}
                                    </p>
                                  ) : (
                                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                      No extra details provided.
                                    </p>
                                  )}
                                </div>

                                <div className="rounded-lg border p-3 space-y-2.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                                  <p className="text-sm uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>📌 Snapshot</p>
                                  {p.experience && (
                                    <span className="block px-3 py-1.5 rounded text-sm border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                      🧩 {formatAvailability(p.experience)}
                                    </span>
                                  )}
                                  {p.availability && (
                                    <span className="block px-3 py-1.5 rounded text-sm border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                      📅 {formatAvailability(p.availability)}
                                    </span>
                                  )}
                                  {p.age && normalizedCandidateType === 'PLAYER' && (
                                    <span className="block px-3 py-1.5 rounded text-sm border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                      🎂 Age {p.age}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {Array.isArray(p.languages) && p.languages.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {p.languages.map((language) => (
                                    <span key={language}>{getLanguageBadge(language)}</span>
                                  ))}
                                </div>
                              )}

                              {Array.isArray(p.skills) && p.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {p.skills.map((skill) => (
                                    <span
                                      key={skill}
                                      className="text-xs px-2 py-1 rounded font-semibold border"
                                      style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent-1)', borderColor: 'var(--color-border)' }}
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {normalizedCandidateType === 'PLAYER' && p.championTierlist && (
                                <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                                  <p className="text-xs uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>🗡️ Champion Pool</p>
                                  {(['S', 'A', 'B', 'C'] as const).map((tier) => {
                                    const tierColors = {
                                      S: { bg: '#ef4444', border: '#ef4444', text: '#ef4444' },
                                      A: { bg: '#C8AA6E', border: '#C8AA6E', text: '#C8AA6E' },
                                      B: { bg: '#3b82f6', border: '#3b82f6', text: '#3b82f6' },
                                      C: { bg: '#22c55e', border: '#22c55e', text: '#22c55e' },
                                    };
                                    const colors = tierColors[tier];
                                    const champions = Array.isArray(p.championTierlist?.[tier]) ? p.championTierlist?.[tier] || [] : [];

                                    return (
                                      <div key={tier}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span
                                            className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                                            style={{
                                              backgroundColor: `${colors.bg}20`,
                                              borderWidth: '1px',
                                              borderStyle: 'solid',
                                              borderColor: colors.border,
                                              color: colors.text,
                                            }}
                                          >
                                            {tier}
                                          </span>
                                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Tier</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {champions.length > 0 ? (
                                            champions.map((champion, idx) => (
                                              <div
                                                key={`${tier}-${champion}-${idx}`}
                                                className="px-3 py-2 rounded-lg font-medium flex items-center gap-2"
                                                style={{
                                                  backgroundColor: `${colors.bg}20`,
                                                  borderWidth: '1px',
                                                  borderStyle: 'solid',
                                                  borderColor: colors.border,
                                                  color: colors.text,
                                                }}
                                              >
                                                <img
                                                  src={getChampionIconUrl(champion)}
                                                  alt={champion}
                                                  className="w-8 h-8"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                  }}
                                                />
                                                {champion}
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No champions</p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {p.username && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  <Link
                                    href={`/profile?username=${encodeURIComponent(p.username)}`}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium border inline-flex items-center gap-1"
                                    style={{
                                      background: 'var(--color-bg-tertiary)',
                                      color: 'var(--color-accent-1)',
                                      borderColor: 'var(--color-border)',
                                    }}
                                  >
                                    👤 View Profile
                                  </Link>
                                  {p.authorId !== currentUserId && (
                                    <button
                                      onClick={() => openConversation(p.authorId)}
                                      className="px-3 py-1.5 rounded-lg text-sm font-medium border inline-flex items-center gap-1"
                                      style={{
                                        background: 'var(--color-bg-tertiary)',
                                        color: 'var(--color-accent-1)',
                                        borderColor: 'var(--color-border)',
                                      }}
                                    >
                                      💬 Message
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {p.isAdmin && (
                            <div className="pt-2 text-right">
                              <button
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: 'Delete Post',
                                    message: 'Are you sure you want to delete this post? This action cannot be undone.',
                                    confirmText: 'Delete',
                                  });
                                  if (!ok) return;

                                  try {
                                    const res = await fetch(`${API_URL}/api/lft/posts/${p.id}`, {
                                      method: 'DELETE',
                                      headers: getAuthHeader(),
                                    });
                                    if (!res.ok) throw new Error('Failed to delete post');
                                    showToast('Post deleted', 'success');
                                    location.reload();
                                  } catch (err) {
                                    console.error('Failed to delete', err);
                                    showToast('Delete failed', 'error');
                                  }
                                }}
                                className="px-3 py-1 rounded text-xs font-medium"
                                style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    </React.Fragment>
                  );
                })}

                {posts.length > visibleCount && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 25)}
                      className="px-6 py-3 font-semibold rounded-lg"
                      style={{
                        background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                        color: 'var(--color-bg-primary)',
                      }}
                    >
                      Load More ({posts.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Modals */}
        <CreatePlayerLftModal
          open={showPlayerModal}
          onClose={() => setShowPlayerModal(false)}
          onSubmit={handlePlayerSubmit}
        />
        
        {/* NoAccess Modal */}
        {showNoAccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
            <NoAccess 
              action={noAccessAction}
              showButtons={true}
              onClose={() => setShowNoAccessModal(false)}
            />
          </div>
        )}
      </div>
    </div>
    </>
  );
}
