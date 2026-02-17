import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SEOHead from '../components/SEOHead';
import { useTheme } from '../contexts/ThemeContext';
import { useChat } from '../contexts/ChatContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useGlobalUI } from '../components/GlobalUI';
import { getAuthToken, getUserIdFromToken, getAuthHeader } from '../utils/auth';
import { sanitizeText } from '../utils/sanitize';
import { getFriendlyErrorMessage, extractErrorMessage } from '../utils/errorMessages';
import { AdSpot, useAds, getAdForPosition } from '../components/AdSpot';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

// Role icon helper (League of Legends client style)
const getRoleIcon = (role: string) => {
  const r = role.toUpperCase();
  switch(r) {
    case 'TOP':
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c32.06 0 64.12-.01 96.18.01-6.72 6.67-13.45 13.33-20.19 19.99H36v56c-6.66 6.73-13.33 13.46-19.99 20.18-.02-32.06 0-64.12-.01-96.18Z"/><path d="M104 44.02c5.32-5.33 10.65-10.64 15.99-15.94.02 30.64.01 61.28.01 91.92-30.64 0-61.28.01-91.93-.01 5.33-5.34 10.66-10.66 16-15.99 19.97-.01 39.95.01 59.93 0V44.02Z" opacity="0.75"/><path d="M56 56h28v28H56V56Z" opacity="0.75"/></svg>;
    case 'JUNGLE':
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M72.13 57.86C78.7 41.1 90.04 26.94 99.94 12.1 93 29.47 84.31 46.87 84.04 65.97c-.73 4.81-2.83 9.31-4 14.03-2.08-7.57-4.91-14.9-7.91-22.14ZM36.21 12.35c13.06 20.19 26.67 40.61 33.61 63.87 4.77 15.49 5.42 32.94-1.8 47.8-5.58-6.1-11.08-12.29-16.71-18.34-4.97-4.72-10.26-9.1-15.32-13.71-1.55-11.73-2.97-23.87-8.72-34.42-2.75-5.24-6.71-9.72-11.19-13.55 9.67 4.75 19.18 10.41 26.23 18.72 4.37 4.98 7.46 10.94 9.69 17.15 1.15-10.29.58-20.79-2.05-30.81-3.31-12.68-8.99-24.55-13.74-36.71ZM105.84 53.83c4.13-4 8.96-7.19 14.04-9.84-4.4 3.88-8.4 8.32-11.14 13.55-5.75 10.56-7.18 22.71-8.74 34.45-5.32 5.35-10.68 10.65-15.98 16.01.15-4.37-.25-8.84 1.02-13.1 3.39-15.08 9.48-30.18 20.8-41.07Z"/></svg>;
    case 'MID':
    case 'MIDDLE':
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c22.67 0 45.33 0 67.99.01C78.62 21.34 73.28 26.69 67.88 32c-11.96 0-23.92-.01-35.88 0-.01 12 .01 24-.01 36-5.32 5.3-10.64 10.6-15.98 15.89C15.99 61.26 16 38.63 16 16zm87.95 51.9c5.32-5.37 10.69-10.68 16.04-16.02.02 22.71.01 45.41 0 68.12-22.65 0-45.31.01-67.97-.01 5.33-5.33 10.65-10.67 15.99-15.99 12-.01 23.99.01 35.99 0 .04-12.04-.05-24.07-.05-36.1z" opacity="0.75"/><path d="M100.02 16H120v19.99C92 64 64 92 35.99 120H16v-19.99C44 72 72 43.99 100.02 16z"/></svg>;
    case 'ADC':
    case 'BOT':
    case 'BOTTOM':
      return <Image src="/assets/BotLane.png" alt="Bot" width={16} height={16} className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(16%) saturate(1018%) hue-rotate(8deg) brightness(91%) contrast(85%)' }} />;
    case 'SUPPORT':
    case 'SUP':
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M52.21 12.03c10.33-.1 20.66.06 30.99-.08 1.71 2.62 3.2 5.37 4.79 8.07C81.32 28 74.68 36.01 68 43.98 61.32 36 54.66 28 48.01 19.99c1.4-2.65 2.82-5.29 4.2-7.96ZM0 36.3c14.64-.68 29.33-.11 43.99-.3C48 40 52 44 56 48.01c-2.67 9.32-5.32 18.66-8.01 27.98-6.66-2.65-13.32-5.32-19.98-7.99 3.97-5.35 8.02-10.63 11.96-15.99-5.01-.08-10.15.4-15-1.14C15.58 48.12 7.75 42.05 0 36.34v-.04ZM92.02 36c14.66.05 29.32-.09 43.98.07v.03c-7.3 5.9-15.1 11.53-24.1 14.5-5.11 1.85-10.59 1.34-15.91 1.41 4.01 5.32 8 10.65 11.99 15.98-6.64 2.7-13.31 5.34-19.97 8-2.69-9.32-5.34-18.65-8.01-27.98C84.01 44 88 39.99 92.02 36ZM64.01 52.11c1.36 1.26 2.7 2.55 3.99 3.89 1.32-1.33 2.65-2.65 3.99-3.97 4.04 19.97 7.97 39.96 12.02 59.92-5.31 4.05-10.66 8.07-16.04 12.03-5.32-4.01-10.67-7.97-15.98-12.01 4.04-19.94 7.96-39.92 12.02-59.86Z"/></svg>;
    default:
      return null;
  }
};

const defaultFilters = {
  regions: [] as string[],
  roles: [] as string[],
  languages: [] as string[],
  vcPreference: '',
  duoType: '',
  minRank: '',
  maxRank: '',
  minWinrate: '',
  maxWinrate: '',
  smurfFilter: '',
  minDivision: '',
  maxDivision: '',
  minLp: '',
};

// Fetch posts with server-side pagination
async function fetchPaginatedPosts({
  filters,
  limit,
  offset,
  viewerId,
}: {
  filters: typeof defaultFilters;
  limit: number;
  offset: number;
  viewerId: string | null;
}) {
  const params = new URLSearchParams();
  if (filters.regions.length > 0) {
    filters.regions.forEach((r) => params.append('region', r));
  }
  if (filters.roles.length > 0) {
    filters.roles.forEach((r) => params.append('role', r));
  }
  if (filters.languages.length > 0) {
    filters.languages.forEach((l) => params.append('language', l));
  }
  if (filters.vcPreference) params.append('vcPreference', filters.vcPreference);
  if (filters.duoType) params.append('duoType', filters.duoType);
  params.append('limit', `${limit}`);
  params.append('offset', `${offset}`);
  if (viewerId) params.append('userId', viewerId);

  const query = params.toString();
  const res = await fetch(`${API_URL}/api/posts${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

type Post = {
  id: string;
  createdAt: string;
  message: string;
  role: string;
  secondRole: string | null;
  region: string;
  languages: string[];
  vcPreference: string;
  authorId: string;
  username: string;
  isAnonymous: boolean;
  isAdmin?: boolean;
  reportCount: number;
  preferredRole: string | null;
  secondaryRole: string | null;
  discordUsername: string | null;
  postingRiotAccount: {
    gameName: string;
    tagLine: string;
    region: string;
    rank: string;
    division?: string | null;
    lp?: number | null;
    winrate: number | null;
  } | null;
  bestRank: {
    gameName: string;
    tagLine: string;
    rank: string;
    division?: string | null;
    lp?: number | null;
    winrate: number | null;
  } | null;
  ratings: {
    skill: number;
    personality: number;
    skillCount: number;
    personalityCount: number;
  };
  isMainAccount: boolean;
  community?: {
    id: string;
    name: string;
    isPartner: boolean;
    inviteLink: string | null;
  } | null;
  source?: string;
};

export default function Feed() {
  const { theme } = useTheme();
  const { showToast } = useGlobalUI();
  const { openConversation } = useChat();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<string>('');
  const [limit] = useState<number>(10);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const postsContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Ads
  const { ads, frequency: adFrequency } = useAds('duo');
  const [dismissedAdIds, setDismissedAdIds] = useState<string[]>([]);

  const handleDismissAd = (adId: string) => {
    setDismissedAdIds(prev => [...prev, adId]);
  };

  // Fetch user preferences once on mount to set initial filters
  useEffect(() => {
    const token = getAuthToken();
    const uid = token ? getUserIdFromToken(token) : null;
    setCurrentUserId(uid);

    async function fetchUserPreferences() {
      if (!uid) return;
      try {
        const res = await fetch(`${API_URL}/api/user/profile`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const user = await res.json();
          const mainAccount = user.riotAccounts?.find((acc: any) => acc.isMain);
          const userLanguages = user.languages || [];
          
          // Set filters with user's region and languages as defaults
          setFilters(prev => ({
            ...prev,
            regions: mainAccount?.region ? [mainAccount.region] : prev.regions,
            languages: userLanguages.length > 0 ? userLanguages : prev.languages,
          }));
          
          if (mainAccount?.region) {
            setUserRegion(mainAccount.region);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user preferences:', err);
      }
    }
    fetchUserPreferences();
  }, []); // Only run once on mount

  // Load posts when filters change
  useEffect(() => {
    const token = getAuthToken();
    const uid = token ? getUserIdFromToken(token) : null;

    const loadPosts = async (reset = true) => {
      if (reset) {
        // Only show loading spinner on initial page load, use refreshing state for filter changes
        if (isInitialLoad) {
          setLoading(true);
          setIsInitialLoad(false);
        } else {
          setIsRefreshing(true);
        }
        setHasMore(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await fetchPaginatedPosts({
          filters,
          limit,
          offset: reset ? 0 : offset,
          viewerId: uid || null,
        });

        const newPosts: Post[] = data.posts || [];
        const hasMoreFlag = data.pagination?.hasMore ?? false;

        setHasMore(hasMoreFlag);

        if (reset) {
          // Don't clear posts immediately when refreshing - update them once loaded
          setAllPosts(newPosts);
          setOffset(newPosts.length);
        } else {
          setAllPosts(prev => [...prev, ...newPosts]);
          setOffset(prev => prev + newPosts.length);
        }
      } catch (err) {
        console.error('Error loading posts:', err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        setLoadingMore(false);
      }
    };

    loadPosts(true);
  }, [filters.regions, filters.roles, filters.languages, filters.vcPreference, filters.duoType, limit]);

  // Client-side filtering for rank, division, LP, winrate and smurf status
  // PERFORMANCE FIX: Memoize expensive filtering logic
  const filteredPosts = React.useMemo(() => {
    if (!allPosts.length) return [];
    
    // Early return if no filters applied
    const hasFilters = filters.minRank || filters.maxRank || filters.minDivision || 
                       filters.maxDivision || filters.minLp || filters.minWinrate || 
                       filters.maxWinrate || filters.smurfFilter;
    if (!hasFilters) return allPosts;
    
    const rankOrder = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER_PLUS'];
    const mapRankToCategory = (rank: string) => {
      const base = rank.split(' ')[0];
      if (['MASTER','GRANDMASTER','CHALLENGER'].includes(base)) return 'MASTER_PLUS';
      return base;
    };
    const getRankValue = (rank: string) => {
      const cat = mapRankToCategory(rank);
      return rankOrder.indexOf(cat);
    };

    let filtered = allPosts;

    // Filter by rank + divisions + LP buckets
    if (filters.minRank || filters.maxRank) {
      filtered = filtered.filter(post => {
        const postRank = post.postingRiotAccount?.rank || 'UNRANKED';
        const rankValue = getRankValue(postRank);
        if (rankValue === -1) return false;
        const minValue = filters.minRank ? getRankValue(filters.minRank) : -1;
        const maxValue = filters.maxRank ? getRankValue(filters.maxRank) : 999;
        if (!(rankValue >= minValue && rankValue <= maxValue)) return false;

        // Division constraints (only on ranks below Master+)
        if (filters.minDivision || filters.maxDivision) {
          const cat = mapRankToCategory(postRank);
            if (['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND'].includes(cat)) {
              const divisionOrder = ['IV','III','II','I'];
              const postDiv = post.postingRiotAccount?.division || null;
              if (!postDiv) return false;
              const divValue = divisionOrder.indexOf(postDiv);
              const minDivVal = filters.minDivision ? divisionOrder.indexOf(filters.minDivision) : 0;
              const maxDivVal = filters.maxDivision ? divisionOrder.indexOf(filters.maxDivision) : divisionOrder.length - 1;
              if (!(divValue >= minDivVal && divValue <= maxDivVal)) return false;
            }
        }

        // LP threshold (Master+ category)
        if (filters.minLp) {
          const cat = mapRankToCategory(postRank);
          if (cat === 'MASTER_PLUS') {
            const lp = post.postingRiotAccount?.lp || 0;
            if (lp < parseInt(filters.minLp, 10)) return false;
          }
        }
        return true;
      });
    }

    // Filter by winrate
    if (filters.minWinrate || filters.maxWinrate) {
      filtered = filtered.filter(post => {
        const winrate = post.postingRiotAccount?.winrate;
        if (winrate === null || winrate === undefined) return false;
        
        const min = filters.minWinrate ? parseFloat(filters.minWinrate) : 0;
        const max = filters.maxWinrate ? parseFloat(filters.maxWinrate) : 100;
        
        return winrate >= min && winrate <= max;
      });
    }

    // Filter by smurf status
    if (filters.smurfFilter === 'only-smurfs') {
      filtered = filtered.filter(post => {
        // Smurf: posting account is not their best rank account
        if (!post.postingRiotAccount || !post.bestRank) return false;
        return post.postingRiotAccount.gameName !== post.bestRank.gameName || 
               post.postingRiotAccount.tagLine !== post.bestRank.tagLine;
      });
    } else if (filters.smurfFilter === 'no-smurfs') {
      filtered = filtered.filter(post => {
        // Not smurf: posting account is their best rank account or only has one account
        if (!post.postingRiotAccount) return false;
        if (!post.bestRank) return true; // Only one account
        return post.postingRiotAccount.gameName === post.bestRank.gameName && 
               post.postingRiotAccount.tagLine === post.bestRank.tagLine;
      });
    }

    return filtered;
  }, [allPosts, filters.minRank, filters.maxRank, filters.minWinrate, filters.maxWinrate, filters.smurfFilter, filters.minDivision, filters.maxDivision, filters.minLp]);
  
  // Use filteredPosts directly as posts - no separate state update needed
  const posts = filteredPosts;

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPaginatedPosts({
        filters,
        limit,
        offset,
        viewerId: currentUserId,
      });
      const newPosts: Post[] = data.posts || [];
      setHasMore(data.pagination?.hasMore ?? false);
      setAllPosts(prev => [...prev, ...newPosts]);
      setOffset(prev => prev + newPosts.length);
    } catch (err) {
      console.error('Error loading more posts:', err);
      showToast('Failed to load more posts', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleContact = async (post: Post) => {
    if (!currentUserId) {
      showToast('Please log in to contact users', 'info');
      return;
    }

    if (currentUserId === post.authorId) {
      showToast('You cannot send a contact request to yourself', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/notifications/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          fromUserId: currentUserId,
          toUserId: post.authorId,
          postId: post.id,
        }),
      });

      if (!res.ok) throw new Error('Failed to send contact request');
      showToast('Contact request sent! They will be notified.', 'success');
    } catch (err) {
      console.error('Error sending contact:', err);
      const errorMsg = extractErrorMessage(err);
      showToast(getFriendlyErrorMessage(errorMsg, 'api'), 'error');
    }
  };

  const getRankColor = (rank: string) => {
    const isLightTheme = (() => {
      const hex = theme.colors.bgPrimary.replace('#','');
      const r = parseInt(hex.substring(0,2), 16);
      const g = parseInt(hex.substring(2,4), 16);
      const b = parseInt(hex.substring(4,6), 16);
      const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
      return lum > 0.7;
    })();
    const colors: Record<string,string> = {
      IRON: '#4A4A4A',
      BRONZE: '#CD7F32',
      SILVER: '#C0C0C0',
      GOLD: '#FFD700',
      PLATINUM: '#00CED1',
      EMERALD: '#50C878',
      DIAMOND: isLightTheme ? '#4FA3FF' : '#B9F2FF',
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
    return <img src={iconUrl} alt={rank} className="inline-block w-4 h-4" />;
  };

  const getRankBadge = (rank: string, division?: string, lp?: number) => {
    const color = getRankColor(rank);
    const displayText = division ? `${rank} ${division}${lp !== undefined && lp > 0 ? ` ${lp}LP` : ''}` : rank;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border" style={{ background: `${color}15`, color: color, borderColor: color }}>
        {getRankIcon(rank)}
        {displayText}
      </span>
    );
  };

  const getWinrateColor = (winrate: number) => {
    if (winrate <= 40) return '#ef4444'; // red
    if (winrate <= 45) return '#fb923c'; // orange
    if (winrate <= 50) return '#9ca3af'; // grey
    if (winrate <= 55) return '#3b82f6'; // blue
    if (winrate <= 65) return '#22c55e'; // green
    if (winrate <= 80) return '#D4AF37'; // metallic gold
    return '#a855f7'; // purple
  };

  const getWinrateBadge = (winrate: number) => {
    const color = getWinrateColor(winrate);
    
    if (winrate <= 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border-2" 
          style={{ 
            background: `linear-gradient(135deg, ${color}30, ${color}20)`, 
            color: color, 
            borderColor: color,
            boxShadow: `0 0 10px ${color}35, inset 0 1px 0 ${color}15`,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}>
          ◆ {winrate.toFixed(1)}% WR
        </span>
      );
    } else if (winrate <= 45) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border-2" 
          style={{ 
            background: `linear-gradient(135deg, ${color}30, ${color}20)`, 
            color: color, 
            borderColor: color,
            boxShadow: `0 0 8px ${color}30, inset 0 1px 0 ${color}15`
          }}>
          ◆ {winrate.toFixed(1)}% WR
        </span>
      );
    } else if (winrate <= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border-2" 
          style={{ 
            background: `linear-gradient(135deg, ${color}25, ${color}15)`, 
            color: color, 
            borderColor: color,
            boxShadow: `0 0 6px ${color}20`
          }}>
          ◆ {winrate.toFixed(1)}% WR
        </span>
      );
    } else if (winrate <= 55) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border-2" 
          style={{ 
            background: `linear-gradient(135deg, ${color}25, ${color}15)`, 
            color: color, 
            borderColor: color,
            boxShadow: `0 0 6px ${color}20`
          }}>
          ◆ {winrate.toFixed(1)}% WR
        </span>
      );
    } else if (winrate <= 65) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border-2" 
          style={{ 
            background: `linear-gradient(135deg, ${color}35, ${color}25)`, 
            color: color, 
            borderColor: color,
            boxShadow: `0 2px 8px ${color}35, inset 0 1px 0 ${color}20`
          }}>
          ◇ {winrate.toFixed(1)}% WR
        </span>
      );
    } else if (winrate <= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border-2" 
          style={{ 
            background: `linear-gradient(135deg, ${color}40, ${color}25, ${color}30)`, 
            color: color, 
            borderColor: color,
            boxShadow: `0 3px 12px ${color}45, inset 0 1px 0 ${color}35`,
            animation: 'glow 2s ease-in-out infinite'
          }}>
          ◇ {winrate.toFixed(1)}% WR
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border-2" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3), rgba(245, 158, 11, 0.3), rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))', 
            backgroundSize: '400% 400%',
            color: '#a855f7', 
            borderColor: '#a855f7',
            borderWidth: '2px',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(168, 85, 247, 0.2), 0 0 20px rgba(168, 85, 247, 0.25)',
            animation: 'rainbow 4s ease infinite, glow 2s ease-in-out infinite'
          }}>
          ◈ {winrate.toFixed(1)}% WR
        </span>
      );
    }
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

  if (loading) {
    return (
      <LoadingSpinner text="Loading posts..." />
    );
  }

  return (
    <>
      <style>{`
        @keyframes rainbow {
          0% { background-position: 0% 50%; }
          25% { background-position: 50% 50%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 50% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes glow {
          0%, 100% { 
            box-shadow: 0 3px 10px currentColor, inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 0 15px currentColor;
          }
          50% { 
            box-shadow: 0 3px 15px currentColor, inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 0 30px currentColor;
          }
        }
      `}</style>
      <SEOHead
        title="Looking for Duo - Trouvez votre partenaire LoL"
        description="Trouvez votre duo parfait pour League of Legends. Filtres avancés par rôle, rank, région, langues. Système de rating communautaire et profils vérifiés Riot API."
        path="/feed"
      />
      <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Refreshing indicator - positioned absolutely to not affect layout */}
        {isRefreshing && (
          <div 
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-opacity"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)', 
              borderColor: 'var(--color-accent-1)',
              border: '1px solid'
            }}
          >
            <div className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-accent-1)' }}></div>
            <span style={{ color: 'var(--color-text-primary)' }}>Updating...</span>
          </div>
        )}
        
        <div className="flex justify-between items-center">{/* Rest of the content */}
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-main)' }}>Looking For Duo</h1>
          <Link 
            href="/create" 
            className="px-4 py-2 font-semibold transition-colors"
            style={{
              background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
              color: 'var(--color-bg-primary)',
              borderRadius: 'var(--border-radius)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Create Post
          </Link>
        </div>

        {/* Active Filters Display */}
        <div 
          className="overflow-hidden transition-all duration-300"
          style={{ 
            maxHeight: (filters.regions.length > 0 || filters.roles.length > 0 || filters.languages.length > 0 || filters.vcPreference || filters.duoType) ? '500px' : '0',
            opacity: (filters.regions.length > 0 || filters.roles.length > 0 || filters.languages.length > 0 || filters.vcPreference || filters.duoType) ? 1 : 0,
            marginBottom: (filters.regions.length > 0 || filters.roles.length > 0 || filters.languages.length > 0 || filters.vcPreference || filters.duoType) ? '1.5rem' : '0'
          }}
        >
          <div className="flex flex-wrap gap-2 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Active filters:</span>
            {filters.regions.map(region => (
              <button
                key={`region-${region}`}
                onClick={() => setFilters(prev => ({ ...prev, regions: prev.regions.filter(r => r !== region) }))}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
              >
                {region}
                <span>✕</span>
              </button>
            ))}
            {filters.roles.map(role => (
              <button
                key={`role-${role}`}
                onClick={() => setFilters(prev => ({ ...prev, roles: prev.roles.filter(r => r !== role) }))}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--color-accent-2)', color: 'var(--color-bg-primary)' }}
              >
                {role}
                <span>✕</span>
              </button>
            ))}
            {filters.languages.map(language => (
              <button
                key={`language-${language}`}
                onClick={() => setFilters(prev => ({ ...prev, languages: prev.languages.filter(l => l !== language) }))}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
              >
                {language}
                <span>✕</span>
              </button>
            ))}
              {filters.vcPreference && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, vcPreference: '' }))}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
                >
                  VC: {filters.vcPreference}
                  <span>✕</span>
                </button>
              )}
              {filters.duoType && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, duoType: '' }))}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-accent-2)', color: 'var(--color-bg-primary)' }}
                >
                  {filters.duoType === 'main' ? 'Main Account' : 'Smurf'} Only
                  <span>✕</span>
                </button>
              )}
            </div>
          </div>

        {/* Filters */}
        <div 
          className="border p-6"
          style={{
            background: 'linear-gradient(to bottom right, var(--color-bg-secondary), var(--color-bg-tertiary))',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-accent-1)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </h2>
          
          {/* Primary Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Regions</label>
              <div 
                className="border p-3 max-h-48 overflow-y-auto space-y-1"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--border-radius)',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--color-accent-1) var(--color-bg-secondary)',
                }}
              >
                {['NA','EUW','EUNE','KR','JP','OCE','LAN','LAS','BR','RU'].map(r => (
                  <label 
                    key={r} 
                    className="flex items-center gap-3 py-1.5 px-2 cursor-pointer transition-colors group"
                    style={{ borderRadius: 'var(--border-radius)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.regions.includes(r)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, regions: [...prev.regions, r] }));
                        } else {
                          setFilters(prev => ({ ...prev, regions: prev.regions.filter(reg => reg !== r) }));
                        }
                      }}
                      className="w-4 h-4 rounded border-2 cursor-pointer"
                      style={{
                        borderColor: 'var(--color-border)',
                        accentColor: 'var(--color-accent-1)',
                        backgroundColor: 'var(--color-bg-tertiary)',
                      }}
                    />
                    <span className="text-sm font-medium transition-colors" style={{ color: 'var(--color-text-secondary)' }}>{r}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Roles</label>
              <div 
                className="border p-3 space-y-1"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                {['TOP','JUNGLE','MID','ADC','SUPPORT','FILL'].map(r => (
                  <label 
                    key={r} 
                    className="flex items-center gap-3 py-1.5 px-2 cursor-pointer transition-colors group"
                    style={{ borderRadius: 'var(--border-radius)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.roles.includes(r)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, roles: [...prev.roles, r] }));
                        } else {
                          setFilters(prev => ({ ...prev, roles: prev.roles.filter(role => role !== r) }));
                        }
                      }}
                      className="w-4 h-4 rounded border-2 cursor-pointer"
                      style={{
                        borderColor: 'var(--color-border)',
                        accentColor: 'var(--color-accent-1)',
                        backgroundColor: 'var(--color-bg-tertiary)',
                      }}
                    />
                    <span className="text-sm font-medium transition-colors" style={{ color: 'var(--color-text-secondary)' }}>{r}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Languages</label>
              <div 
                className="border p-3 max-h-48 overflow-y-auto space-y-1"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--border-radius)',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--color-accent-1) var(--color-bg-secondary)',
                }}
              >
                {['English','French','Spanish','German','Portuguese','Italian','Polish','Turkish','Russian','Korean','Japanese','Chinese'].map(lang => (
                  <label 
                    key={lang} 
                    className="flex items-center gap-3 py-1.5 px-2 cursor-pointer transition-colors group"
                    style={{ borderRadius: 'var(--border-radius)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.languages.includes(lang)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, languages: [...prev.languages, lang] }));
                        } else {
                          setFilters(prev => ({ ...prev, languages: prev.languages.filter(l => l !== lang) }));
                        }
                      }}
                      className="w-4 h-4 rounded border-2 cursor-pointer"
                      style={{
                        borderColor: 'var(--color-border)',
                        accentColor: 'var(--color-accent-1)',
                        backgroundColor: 'var(--color-bg-tertiary)',
                      }}
                    />
                    <span className="text-sm font-medium transition-colors" style={{ color: 'var(--color-text-secondary)' }}>{lang}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Voice Chat</label>
              <div className="relative">
                <select 
                  className="w-full p-2.5 border text-sm transition-all appearance-none cursor-pointer" 
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    borderRadius: 'var(--border-radius)',
                    paddingRight: '2.5rem'
                  }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                value={filters.vcPreference} 
                onChange={e => setFilters(prev => ({ ...prev, vcPreference: e.target.value }))}
                >
                <option value="">All Preferences</option>
                {['ALWAYS','SOMETIMES','NEVER'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Looking For</label>
              <div className="relative">
                <select 
                  className="w-full p-2.5 border text-sm transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    borderRadius: 'var(--border-radius)',
                    paddingRight: '2.5rem'
                  }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                value={filters.duoType} 
                onChange={e => setFilters(prev => ({ ...prev, duoType: e.target.value }))}
                >
                <option value="">All</option>
                <option value="SHORT_TERM">Short Term</option>
                <option value="LONG_TERM">Long Term</option>
                <option value="BOTH">Both</option>
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rank Range */}
              <div className="space-y-2">
                <label className="block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Rank Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="relative">
                      <select 
                      className="w-full p-2.5 rounded-lg border text-sm transition-all appearance-none cursor-pointer" 
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                        paddingRight: '2.5rem'
                      }}
                      value={filters.minRank} onChange={e => setFilters(prev => ({ ...prev, minRank: e.target.value }))}>
                      <option value="">Min Rank</option>
                      {['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER_PLUS'].map(r => <option key={r} value={r}>{r === 'MASTER_PLUS' ? 'MASTER+' : r}</option>)}
                      </select>
                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <select 
                      className="w-full p-2.5 rounded-lg border text-sm transition-all appearance-none cursor-pointer" 
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                        paddingRight: '2.5rem'
                      }}
                      value={filters.maxRank} onChange={e => setFilters(prev => ({ ...prev, maxRank: e.target.value }))}>
                      <option value="">Max Rank</option>
                      {['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER_PLUS'].map(r => {
                        const rankOrder = ['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER_PLUS'];
                        const minRankIndex = filters.minRank ? rankOrder.indexOf(filters.minRank) : -1;
                        const currentIndex = rankOrder.indexOf(r);
                        const isDisabled = minRankIndex !== -1 && currentIndex < minRankIndex;
                        return <option key={r} value={r} disabled={isDisabled}>{r === 'MASTER_PLUS' ? 'MASTER+' : r}</option>;
                      })}
                      </select>
                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Division filters (show below rank selects) */}
                {((filters.minRank && filters.minRank !== 'MASTER_PLUS') || (filters.maxRank && filters.maxRank !== 'MASTER_PLUS')) && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="relative">
                      <select 
                      className="w-full p-2.5 rounded-lg border text-sm transition-all appearance-none cursor-pointer" 
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                        paddingRight: '2.5rem'
                      }}
                      value={filters.minDivision} onChange={e => setFilters(prev => ({ ...prev, minDivision: e.target.value }))}>
                      <option value="">Min Div</option>
                      {['IV','III','II','I'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                      </svg>
                    </div>
                    <div className="relative">
                      <select 
                        className="w-full p-2.5 rounded-lg border text-sm transition-all appearance-none cursor-pointer" 
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                          paddingRight: '2.5rem'
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                        value={filters.maxDivision} onChange={e => setFilters(prev => ({ ...prev, maxDivision: e.target.value }))}>
                        <option value="">Max Div</option>
                        {['IV','III','II','I'].map(d => {
                          const divOrder = ['IV','III','II','I'];
                          const minDivIndex = filters.minDivision ? divOrder.indexOf(filters.minDivision) : -1;
                          const currentIndex = divOrder.indexOf(d);
                          const isDisabled = minDivIndex !== -1 && currentIndex < minDivIndex;
                          return <option key={d} value={d} disabled={isDisabled}>{d}</option>;
                        })}
                      </select>
                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                      </svg>
                    </div>
                  </div>
                )}
                
                {/* LP threshold (show below rank selects) */}
                {((filters.minRank === 'MASTER_PLUS') || (filters.maxRank === 'MASTER_PLUS')) && (
                  <div className="mt-2 relative">
                    <select 
                      className="w-full p-2.5 rounded-lg border text-sm transition-all appearance-none cursor-pointer" 
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                        paddingRight: '2.5rem'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      value={filters.minLp} onChange={e => setFilters(prev => ({ ...prev, minLp: e.target.value }))}>
                      <option value="">LP ≥</option>
                      {['0','200','400','600','800','1000','1200'].map(lp => <option key={lp} value={lp}>{lp}+ LP</option>)}
                    </select>
                    <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Winrate Range */}
              <div className="space-y-2">
                <label className="block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Winrate Range (%)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <select 
                      className="w-full p-2.5 rounded-lg border text-sm transition-all appearance-none cursor-pointer" 
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                        paddingRight: '2.5rem'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      value={filters.minWinrate} onChange={e => setFilters(prev => ({ ...prev, minWinrate: e.target.value }))}>
                      <option value="">Min WR</option>
                      {['40','45','50','55','60','65','70'].map(w => <option key={w} value={w}>{w}%</option>)}
                    </select>
                    <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                    </svg>
                  </div>
                  <div className="relative">
                    <select 
                      className="w-full p-2.5 rounded-lg border text-sm transition-all appearance-none cursor-pointer" 
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                        paddingRight: '2.5rem'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                      value={filters.maxWinrate} onChange={e => setFilters(prev => ({ ...prev, maxWinrate: e.target.value }))}>
                      <option value="">Max WR</option>
                      {['50','55','60','65','70','75','80','100'].map(w => {
                        const minWr = filters.minWinrate ? parseFloat(filters.minWinrate) : 0;
                        const currentWr = parseFloat(w);
                        const isDisabled = minWr > 0 && currentWr < minWr;
                        return <option key={w} value={w} disabled={isDisabled}>{w}%</option>;
                      })}
                    </select>
                    <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Smurf Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Smurf Status</label>
                <div className="relative">
                  <select 
                    className="w-full p-2.5 rounded-lg border text-sm transition-all appearance-none cursor-pointer" 
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      paddingRight: '2.5rem'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    value={filters.smurfFilter} onChange={e => setFilters(prev => ({ ...prev, smurfFilter: e.target.value }))}>
                    <option value="">All Players</option>
                    <option value="only-smurfs">Only Smurfs</option>
                    <option value="no-smurfs">No Smurfs</option>
                  </select>
                  <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(filters.regions.length > 0 || filters.roles.length > 0 || filters.vcPreference || filters.duoType || filters.minRank || filters.maxRank || filters.minWinrate || filters.maxWinrate || filters.smurfFilter || filters.minDivision || filters.maxDivision || filters.minLp) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setFilters({ ...defaultFilters, regions: userRegion ? [userRegion] : [] })}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="border rounded-xl p-8 text-center" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>No posts yet. Be the first to create one!</p>
          </div>
        ) : (
          <div 
            ref={postsContainerRef}
            className="space-y-4 transition-opacity duration-200" 
            style={{ 
              opacity: isRefreshing ? 0.6 : 1,
              willChange: 'opacity' // Hint to browser for better performance
            }}
          >
            {posts.map((post, index) => {
              const ad = getAdForPosition(ads, index, adFrequency, userRegion, undefined, dismissedAdIds);
              return (
                <React.Fragment key={post.id}>
                  {/* Show ad before this post if applicable */}
                  {ad && (
                    <AdSpot ad={ad} feed="duo" userId={currentUserId} onDismiss={handleDismissAd} />
                  )}
                  <div className="border rounded-xl p-6" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{post.username}</h3>
                      {post.discordUsername && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold border inline-flex items-center gap-1" style={{ background: 'rgba(88, 101, 242, 0.15)', color: '#5865F2', borderColor: '#5865F2' }} title={`Discord: ${post.discordUsername}`}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          {post.discordUsername}
                        </span>
                      )}
                      {post.community && (
                        <Link 
                          href={`/communities/${post.community.id}`}
                          className="px-2 py-0.5 rounded text-xs font-semibold border inline-flex items-center gap-1 transition-colors hover:opacity-80"
                          style={{ 
                            background: post.community.isPartner ? 'rgba(34, 197, 94, 0.15)' : 'rgba(96, 165, 250, 0.15)', 
                            color: post.community.isPartner ? '#22C55E' : '#60A5FA',
                            borderColor: post.community.isPartner ? '#22C55E' : '#60A5FA'
                          }}
                        >
                          {post.community.isPartner && '🤝'}
                          {post.community.name}
                        </Link>
                      )}
                      {post.source === 'discord' && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold border" style={{ background: 'rgba(88, 101, 242, 0.15)', color: '#5865F2', borderColor: '#5865F2' }}>
                          Discord
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{post.region}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded font-semibold text-xs border inline-flex items-center gap-1" style={{ background: 'rgba(200, 170, 109, 0.15)', color: '#C8AA6D', borderColor: '#C8AA6D' }}>
                          {getRoleIcon(post.role)}
                          {post.role}
                        </span>
                        {post.secondRole && (
                          <>
                            <span style={{ color: 'var(--color-text-muted)' }}>&</span>
                            <span className="px-2 py-0.5 rounded font-semibold text-xs border inline-flex items-center gap-1" style={{ background: 'rgba(200, 170, 109, 0.1)', color: '#C8AA6D', borderColor: '#C8AA6D', opacity: 0.8 }}>
                              {getRoleIcon(post.secondRole)}
                              {post.secondRole}
                            </span>
                          </>
                        )}
                      </div>
                      {!post.isAnonymous && (post.preferredRole || post.secondaryRole) && (
                        <>
                          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            Most Played: {post.preferredRole || 'N/A'}{post.secondaryRole ? `, ${post.secondaryRole}` : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {!post.isAnonymous ? (
                    <div className="flex gap-2">
                      <Link href={`/profile?username=${encodeURIComponent(post.username)}`} className="px-3 py-1 rounded text-sm font-medium transition-colors border" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent-1)', borderColor: 'var(--color-border)' }}>
                        View Profile
                      </Link>
                      {post.authorId !== currentUserId && (
                        <button
                          onClick={() => openConversation(post.authorId)}
                          className="px-3 py-1 rounded text-sm font-medium transition-colors border flex items-center gap-1"
                          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent-1)', borderColor: 'var(--color-border)' }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Message
                        </button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => handleContact(post)} className="px-3 py-1 rounded text-sm font-medium transition-colors border" style={{ background: 'var(--accent-discord-bg)', color: 'var(--accent-discord)', borderColor: 'var(--color-border)' }}>
                      Contact
                    </button>
                  )}
                </div>

                {/* Account Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Posting Account */}
                  {post.postingRiotAccount && (
                    <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-tertiary)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Posting With</p>
                      <p className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                        <img width="16" height="16" src="https://img.icons8.com/color/48/riot-games.png" alt="riot-games" />
                        {post.postingRiotAccount.gameName}#{post.postingRiotAccount.tagLine}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {['MASTER','GRANDMASTER','CHALLENGER'].includes(post.postingRiotAccount.rank.split(' ')[0]) && post.postingRiotAccount.lp !== undefined && post.postingRiotAccount.lp !== null
                          ? (() => { const lp = post.postingRiotAccount.lp!; const buckets = [0,200,400,600,800,1000,1200]; const bucket = buckets.filter(b => lp >= b).pop(); return getRankBadge(post.postingRiotAccount.rank, undefined, bucket); })()
                          : getRankBadge(post.postingRiotAccount.rank, post.postingRiotAccount.division || undefined, undefined)}
                        {post.postingRiotAccount.winrate !== null && getWinrateBadge(post.postingRiotAccount.winrate)}
                      </div>
                    </div>
                  )}

                  {/* Best Rank or Main Account Banner */}
                  {post.bestRank ? (
                    <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-tertiary)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Best Rank</p>
                      <p className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                        <img width="16" height="16" src="https://img.icons8.com/color/48/riot-games.png" alt="riot-games" />
                        {post.bestRank.gameName}#{post.bestRank.tagLine}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {['MASTER','GRANDMASTER','CHALLENGER'].includes(post.bestRank.rank.split(' ')[0]) && post.bestRank.lp !== undefined && post.bestRank.lp !== null
                          ? (() => { const lp = post.bestRank.lp!; const buckets = [0,200,400,600,800,1000,1200]; const bucket = buckets.filter(b => lp >= b).pop(); return getRankBadge(post.bestRank.rank, undefined, bucket); })()
                          : getRankBadge(post.bestRank.rank, post.bestRank.division || undefined, undefined)}
                        {post.bestRank.winrate !== null && getWinrateBadge(post.bestRank.winrate)}
                      </div>
                    </div>
                  ) : post.isMainAccount ? (
                    <div className="rounded-lg p-3 flex items-center justify-center" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto mb-1" style={{ color: 'var(--color-accent-1)' }} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <p className="font-bold text-xs" style={{ color: 'var(--color-accent-1)' }}>MAIN ACCOUNT</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Message */}
                {post.message && (
                  <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--color-bg-tertiary)' }}>
                    <p style={{ color: 'var(--color-text-primary)' }}>{sanitizeText(post.message)}</p>
                  </div>
                )}

                {/* Details */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 rounded text-xs font-medium border" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent-1)', borderColor: 'var(--color-border)' }}>
                    VC: {post.vcPreference}
                  </span>
                  {post.languages.map(lang => (
                    <span key={lang}>{getLanguageBadge(lang)}</span>
                  ))}
                </div>

                {/* Ratings - Always visible */}
                <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Skill:</span>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className="w-5 h-5"
                            style={{ color: star <= Math.round(post.ratings.skill) ? 'var(--color-accent-1)' : 'var(--color-text-muted)' }}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-accent-1)' }}>{post.ratings.skill.toFixed(1)}/5</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({post.ratings.skillCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Personality:</span>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((moon) => (
                          <svg
                            key={moon}
                            className="w-5 h-5"
                            style={{ color: moon <= Math.round(post.ratings.personality) ? 'var(--color-accent-1)' : 'var(--color-text-muted)' }}
                            fill={moon <= Math.round(post.ratings.personality) ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                          >
                            <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-accent-1)' }}>{post.ratings.personality.toFixed(1)}/5</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({post.ratings.personalityCount})</span>
                    </div>
                    {post.reportCount > 0 && (
                      <div className="flex items-center gap-2">
                        {post.reportCount > 3 ? (
                          <>
                            <span className="text-sm font-medium px-2 py-1 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}>⚠️ Flagged</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Reports:</span>
                            <span className="text-xl">💀</span>
                            <span className="text-sm font-semibold" style={{ color: '#EF4444' }}>{post.reportCount}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin delete */}
                {currentUserId && post.isAdmin && (
                  <AdminDelete postId={post.id} currentUserId={currentUserId} />
                )}
              </div>
                </React.Fragment>
              );
            })}
            
            {/* Load More button */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => loadMore()}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function AdminDelete({ postId, currentUserId }: { postId: string; currentUserId: string }) {
  const { showToast, confirm } = useGlobalUI();
  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete Post', message: 'Are you sure you want to delete this post? This action cannot be undone.', confirmText: 'Delete' });
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}?userId=${encodeURIComponent(currentUserId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete post');
      showToast('Post deleted', 'success');
      location.reload();
    } catch (err) {
      console.error('Failed to delete', err);
      showToast('Delete failed', 'error');
    }
  };
  return (
    <div className="mt-4 text-right">
      <button onClick={handleDelete} className="px-3 py-1 rounded text-xs font-medium transition-colors" style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}>Delete</button>
    </div>
  );
}
