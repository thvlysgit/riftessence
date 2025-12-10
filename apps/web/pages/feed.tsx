import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useGlobalUI } from '../components/GlobalUI';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Post = {
  id: string;
  createdAt: string;
  message: string;
  role: string;
  region: string;
  languages: string[];
  vcPreference: string;
  authorId: string;
  username: string;
  isAnonymous: boolean;
  isAdmin?: boolean;
  reportCount: number;
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
  const { showToast, confirm } = useGlobalUI();
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState(25);
  const [filters, setFilters] = useState({ 
    regions: [] as string[], 
    roles: [] as string[], 
    vcPreference: '',
    duoType: '',
    minRank: '',
    maxRank: '',
    minWinrate: '',
    maxWinrate: '',
    smurfFilter: '',
    minDivision: '',
    maxDivision: '',
    minLp: ''
  });

  useEffect(() => {
    let uid: string | null = null;
    try { uid = localStorage.getItem('lfd_userId'); } catch {}
    setCurrentUserId(uid);

    // Fetch user's region and set as default
    async function fetchUserRegion() {
      if (!uid) return;
      try {
        const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(uid)}`);
        if (res.ok) {
          const user = await res.json();
          const mainAccount = user.riotAccounts?.find((acc: any) => acc.isMain);
          if (mainAccount?.region) {
            setUserRegion(mainAccount.region);
            setFilters(prev => ({ ...prev, regions: [mainAccount.region] }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch user region:', err);
      }
    }
    fetchUserRegion();

    async function loadPosts() {
      try {
        const params = new URLSearchParams();
        if (filters.regions.length > 0) {
          filters.regions.forEach(r => params.append('region', r));
        }
        if (filters.roles.length > 0) {
          filters.roles.forEach(r => params.append('role', r));
        }
        if (filters.vcPreference) params.append('vcPreference', filters.vcPreference);
        if (filters.duoType) params.append('duoType', filters.duoType);
        if (uid) params.append('userId', uid); // Pass viewer ID for admin check
        const query = params.toString();
        const res = await fetch(`${API_URL}/api/posts${query ? `?${query}` : ''}`);
        if (!res.ok) throw new Error('Failed to fetch posts');
        const data = await res.json();
        setAllPosts(data.posts || []);
        setPosts(data.posts || []);
      } catch (err) {
        console.error('Error loading posts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, [filters.regions, filters.roles, filters.vcPreference, filters.duoType]);

  // Client-side filtering for rank, division, LP, winrate and smurf status
  useEffect(() => {
    if (!allPosts.length) return;
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

    let filtered = [...allPosts];

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

    setPosts(filtered);
    setVisibleCount(25); // Reset pagination when filters change
  }, [allPosts, filters.minRank, filters.maxRank, filters.minWinrate, filters.maxWinrate, filters.smurfFilter, filters.minDivision, filters.maxDivision, filters.minLp]);

  useEffect(() => {
    setDisplayedPosts(posts.slice(0, visibleCount));
  }, [posts, visibleCount]);

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
        headers: { 'Content-Type': 'application/json' },
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
      showToast('Failed to send contact request', 'error');
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

  const getWinrateColor = (winrate: number) => {
    if (winrate <= 40) return '#ef4444'; // red
    if (winrate <= 45) return '#fb923c'; // orange
    if (winrate <= 50) return '#fbbf24'; // yellow
    if (winrate <= 55) return '#3b82f6'; // blue
    if (winrate <= 65) return '#22c55e'; // green
    if (winrate <= 80) return '#C8AA6E'; // gold
    return '#a855f7'; // purple
  };

  if (loading) {
    return (
      <LoadingSpinner text="Loading posts..." />
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                onClick={() => setFilters({ regions: userRegion ? [userRegion] : [], roles: [], vcPreference: '', duoType: '', minRank: '', maxRank: '', minWinrate: '', maxWinrate: '', smurfFilter: '', minDivision: '', maxDivision: '', minLp: '' })}
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
          <div className="space-y-4">
            {displayedPosts.map(post => (
              <div key={post.id} className="border rounded-xl p-6" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{post.username}</h3>
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
                      <span className="px-2 py-0.5 rounded font-bold text-sm border" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent-1)', borderColor: 'var(--color-border)' }}>
                        {post.role}
                      </span>
                    </div>
                  </div>
                  {!post.isAnonymous ? (
                    <Link href={`/profile?username=${encodeURIComponent(post.username)}`} className="px-3 py-1 rounded text-sm font-medium transition-colors border" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent-1)', borderColor: 'var(--color-border)' }}>
                      View Profile
                    </Link>
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
                      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {post.postingRiotAccount.gameName}#{post.postingRiotAccount.tagLine}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold" style={{ color: getRankColor(post.postingRiotAccount.rank) }}>
                          {['MASTER','GRANDMASTER','CHALLENGER'].includes(post.postingRiotAccount.rank.split(' ')[0]) && post.postingRiotAccount.lp !== undefined && post.postingRiotAccount.lp !== null
                            ? (() => { const lp = post.postingRiotAccount.lp!; const buckets = [0,200,400,600,800,1000,1200]; const bucket = buckets.filter(b => lp >= b).pop(); return `${post.postingRiotAccount.rank} ${bucket}+ LP`; })()
                            : (post.postingRiotAccount.division ? `${post.postingRiotAccount.rank} ${post.postingRiotAccount.division}` : post.postingRiotAccount.rank)}
                        </span>
                        {post.postingRiotAccount.winrate !== null && (
                          <span className="text-sm font-semibold" style={{ color: getWinrateColor(post.postingRiotAccount.winrate) }}>
                            {post.postingRiotAccount.winrate.toFixed(1)}% WR
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Best Rank or Main Account Banner */}
                  {post.bestRank ? (
                    <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-tertiary)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Best Rank</p>
                      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {post.bestRank.gameName}#{post.bestRank.tagLine}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold" style={{ color: getRankColor(post.bestRank.rank) }}>
                          {['MASTER','GRANDMASTER','CHALLENGER'].includes(post.bestRank.rank.split(' ')[0]) && post.bestRank.lp !== undefined && post.bestRank.lp !== null
                            ? (() => { const lp = post.bestRank.lp!; const buckets = [0,200,400,600,800,1000,1200]; const bucket = buckets.filter(b => lp >= b).pop(); return `${post.bestRank.rank} ${bucket}+ LP`; })()
                            : (post.bestRank.division ? `${post.bestRank.rank} ${post.bestRank.division}` : post.bestRank.rank)}
                        </span>
                        {post.bestRank.winrate !== null && (
                          <span className="text-sm font-semibold" style={{ color: getWinrateColor(post.bestRank.winrate) }}>
                            {post.bestRank.winrate.toFixed(1)}% WR
                          </span>
                        )}
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

                {/* Discord */}
                {post.discordUsername && (
                  <div className="mb-4">
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Discord: <span className="font-semibold" style={{ color: 'var(--accent-discord)' }}>{post.discordUsername}</span>
                    </p>
                  </div>
                )}

                {/* Message */}
                {post.message && (
                  <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--color-bg-tertiary)' }}>
                    <p style={{ color: 'var(--color-text-primary)' }}>{post.message}</p>
                  </div>
                )}

                {/* Details */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 rounded text-xs font-medium border" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent-1)', borderColor: 'var(--color-border)' }}>
                    VC: {post.vcPreference}
                  </span>
                  {post.languages.map(lang => (
                    <span key={lang} className="px-2 py-1 rounded text-xs font-medium" style={{ background: 'var(--accent-info-bg)', color: 'var(--accent-info)' }}>
                      {lang}
                    </span>
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
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Reports:</span>
                        <span className="text-xl">💀</span>
                        <span className="text-sm font-semibold" style={{ color: '#EF4444' }}>{post.reportCount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin delete */}
                {currentUserId && post.isAdmin && (
                  <AdminDelete postId={post.id} currentUserId={currentUserId} />
                )}
              </div>
            ))}
            
            {/* Load More button */}
            {posts.length > visibleCount && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setVisibleCount(prev => prev + 25)}
                  className="px-6 py-3 rounded-lg font-medium transition-all"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  Load More ({posts.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
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
