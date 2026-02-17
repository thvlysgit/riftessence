import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SEOHead from '../components/SEOHead';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CreateTeamLftModal } from '../components/CreateTeamLftModal';
import { CreatePlayerLftModal } from '../components/CreatePlayerLftModal';
import { useGlobalUI } from '../components/GlobalUI';
import { useChat } from '../contexts/ChatContext';
import { getAuthHeader, getAuthToken, getUserIdFromToken } from '../utils/auth';
import NoAccess from '../components/NoAccess';
import { AdSpot, useAds, getAdForPosition } from '../components/AdSpot';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

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
  return <img src={iconUrl} alt={rank} className="inline-block w-4 h-4" />;
};

const getRankBadge = (rank: string, division?: string) => {
  const color = getRankColor(rank);
  const displayText = division ? `${rank} ${division}` : rank;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border" style={{ background: `${color}15`, color: color, borderColor: color }}>
      {getRankIcon(rank)}
      {displayText}
    </span>
  );
};

type LftPost = {
  id: string;
  type: 'TEAM' | 'PLAYER';
  createdAt: string;
  // Common
  region: string;
  authorId: string;
  isAdmin?: boolean;
  preferredRole?: string | null;
  secondaryRole?: string | null;
  
  // TEAM fields
  teamName?: string;
  rolesNeeded?: string[];
  averageRank?: string;
  averageDivision?: string | null;
  scrims?: boolean;
  minAvailability?: string; // e.g., "Twice a Week"
  coachingAvailability?: 'Dedicated Coach' | 'Frequent' | 'Occasional' | 'None';
  details?: string;
  discordUsername?: string;
  
  // PLAYER fields
  username?: string;
  mainRole?: string;
  rank?: string;
  division?: string | null;
  experience?: 'First Team' | 'A Little Experience' | 'Experimented';
  languages?: string[];
  skills?: string[]; // Shotcaller, Weakside, Ocean Champion Pool, Vision, Duels, Consistency
  age?: number;
  availability?: string; // Once a Week, Twice a Week, etc.
};

export default function LFTPage() {
  const [allPosts, setAllPosts] = useState<LftPost[]>([]);
  const [posts, setPosts] = useState<LftPost[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<LftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'TEAMS' | 'PLAYERS'>('ALL');
  const [visibleCount, setVisibleCount] = useState(25);
  const [showTeamModal, setShowTeamModal] = useState(false);
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

  useEffect(() => {
    const next = allPosts.filter(p => 
      filter === 'ALL' ? true : filter === 'TEAMS' ? p.type === 'TEAM' : p.type === 'PLAYER'
    );
    setPosts(next);
    setVisibleCount(25); // Reset to 25 when filter changes
  }, [filter, allPosts]);

  useEffect(() => {
    setDisplayedPosts(posts.slice(0, visibleCount));
  }, [posts, visibleCount]);

  const handleTeamSubmit = async (data: any) => {
    try {
      const token = getAuthToken();
      const userId = token ? getUserIdFromToken(token) : null;
      if (!userId) {
        setShowTeamModal(false);
        showToast('Please log in to create a post', 'error');
        return;
      }

      const res = await fetch(`${API_URL}/api/lft/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...data, type: 'TEAM', userId }),
      });

      if (res.ok) {
        showToast('Team post created successfully!', 'success');
        setShowTeamModal(false);
        // Refresh posts
        const currentUserId = getCurrentUserId();
        const refreshUrl = `${API_URL}/api/lft/posts${currentUserId ? `?userId=${encodeURIComponent(currentUserId)}` : ''}`;
        const refreshRes = await fetch(refreshUrl);
        if (refreshRes.ok) {
          const posts = await refreshRes.json();
          setAllPosts(posts);
        }
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to create post', 'error');
      }
    } catch (err) {
      console.error('Error creating team post:', err);
      showToast('Failed to create post', 'error');
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
        showToast('Player post created successfully!', 'success');
        setShowPlayerModal(false);
        // Refresh posts
        const currentUserId = getCurrentUserId();
        const refreshUrl = `${API_URL}/api/lft/posts${currentUserId ? `?userId=${encodeURIComponent(currentUserId)}` : ''}`;
        const refreshRes = await fetch(refreshUrl);
        if (refreshRes.ok) {
          const posts = await refreshRes.json();
          setAllPosts(posts);
        }
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to create post', 'error');
      }
    } catch (err) {
      console.error('Error creating player post:', err);
      showToast('Failed to create post', 'error');
    }
  };

  return (
    <>
      <SEOHead
        title="Looking for Team - Trouvez votre équipe LoL"
        description="Recrutez des joueurs pour votre équipe ou rejoignez une équipe active. Système de rating, profils vérifiés Riot API, filtres par rôle et rank. LFT communautaire pour League of Legends."
        path="/lft"
      />
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--color-accent-1)' }}>Looking For Team (LFT)</h1>
            <div className="flex gap-2">
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
                    
                    const hasRole = data.preferredRole || data.primaryRole;
                    const mainAccount = data.riotAccounts?.find((acc: any) => acc.isMain);
                    const hasRank = mainAccount?.rank && mainAccount.rank !== 'UNRANKED';
                    
                    if (!data.region) {
                      showToast('Please set your region in your profile before creating an LFT post', 'error');
                      return;
                    }
                    if (!hasRole) {
                      showToast('Please set your preferred role in your profile before creating an LFT post', 'error');
                      return;
                    }
                    if (!hasRank) {
                      showToast('Please add your main account with rank information before creating an LFT post', 'error');
                      return;
                    }
                    
                    setShowPlayerModal(true);
                  } catch (error) {
                    console.error('Profile validation error:', error);
                    showToast('Failed to validate profile. Please try again.', 'error');
                  }
                }}
                className="px-4 py-2 font-semibold rounded"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)'
                }}
              >
                Look for a Team
              </button>
              <button
                onClick={() => {
                  const token = getAuthToken();
                  const userId = token ? getUserIdFromToken(token) : null;
                  
                  if (!userId) {
                    setNoAccessAction('find-players');
                    setShowNoAccessModal(true);
                    return;
                  }
                  
                  setShowTeamModal(true);
                }}
                className="px-4 py-2 font-semibold rounded"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)'
                }}
              >
                Look for Players
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Show:</span>
            <div className="flex gap-2">
              {(['ALL', 'TEAMS', 'PLAYERS'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-4 py-2 rounded font-medium transition-all"
                  style={{
                    backgroundColor: filter === f ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: filter === f ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                    border: `1px solid ${filter === f ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--border-radius)'
                  }}
                >
                  {f === 'ALL' ? 'All Posts' : f === 'TEAMS' ? 'Teams' : 'Players'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <section
            className="border p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)'
            }}
          >
            {posts.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No posts yet.</p>
            ) : (
              <div className="space-y-4">
                {displayedPosts.map((p, index) => {
                  const currentUserId = getCurrentUserId();
                  const ad = getAdForPosition(ads, index, adFrequency, undefined, undefined, dismissedAdIds);
                  return (
                    <React.Fragment key={p.id}>
                      {/* Show ad before this post if applicable */}
                      {ad && (
                        <AdSpot ad={ad} feed="lft" userId={currentUserId} onDismiss={handleDismissAd} />
                      )}
                  <div 
                    className="p-6 border rounded-xl relative overflow-hidden" 
                    style={{ 
                      borderColor: 'var(--color-border)', 
                      backgroundColor: 'var(--color-bg-secondary)', 
                      boxShadow: 'var(--shadow)',
                      borderLeftWidth: '4px',
                      borderLeftColor: p.type === 'TEAM' ? '#22C55E' : '#3B82F6'
                    }}
                  >
                    {/* Subtle background gradient overlay */}
                    <div 
                      className="absolute top-0 right-0 w-48 h-48 opacity-5 pointer-events-none"
                      style={{
                        background: p.type === 'TEAM' 
                          ? 'radial-gradient(circle, #22C55E 0%, transparent 70%)'
                          : 'radial-gradient(circle, #3B82F6 0%, transparent 70%)'
                      }}
                    />
                    
                    <div className="flex items-center justify-between mb-4 relative">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Type icon integrated into design */}
                        <div className="flex items-center gap-2">
                          {p.type === 'TEAM' ? (
                            <svg className="w-5 h-5" style={{ color: '#22C55E' }} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" style={{ color: '#3B82F6' }} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          )}
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: p.type === 'TEAM' ? '#22C55E' : '#3B82F6' }}>
                              {p.type === 'TEAM' ? 'Team Looking for Players' : 'Player Looking for Team'}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{p.type === 'TEAM' ? p.teamName : p.username}</h3>
                              {p.discordUsername && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold border inline-flex items-center gap-1 self-end mb-0.5" style={{ background: 'rgba(88, 101, 242, 0.15)', color: '#5865F2', borderColor: '#5865F2' }} title={`Discord: ${p.discordUsername}`}>
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                                  </svg>
                                  {p.discordUsername}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {new Date(p.createdAt).toLocaleDateString()} at {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{p.region}</span>
                        </div>
                        {p.type === 'PLAYER' && p.username && (
                          <div className="flex gap-2">
                            <Link href={`/profile?username=${encodeURIComponent(p.username)}`} className="px-3 py-1 rounded text-sm font-medium transition-colors border" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent-1)', borderColor: 'var(--color-border)' }}>
                              View Profile
                            </Link>
                            {p.authorId !== currentUserId && (
                              <button
                                onClick={() => openConversation(p.authorId)}
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
                        )}
                      </div>
                    </div>

                    {p.type === 'TEAM' && (
                      <div className="space-y-4">
                        {/* Main Info Grid */}
                        <div className="rounded-lg p-4" style={{ background: 'var(--color-bg-tertiary)' }}>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Roles Needed</p>
                              <div className="flex gap-1.5 flex-wrap">
                                {p.rolesNeeded?.map(r => (
                                  <span key={r} className="text-xs px-2 py-1 rounded font-semibold border inline-flex items-center gap-1" style={{ background: 'rgba(200, 170, 109, 0.15)', color: '#C8AA6D', borderColor: '#C8AA6D' }}>
                                    {getRoleIcon(r)}
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Average Rank</p>
                              {p.averageRank && getRankBadge(p.averageRank, p.averageDivision || undefined)}
                            </div>
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Server</p>
                              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{p.region}</span>
                            </div>
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Scrims</p>
                              <span className="text-xs px-2 py-1 rounded font-semibold border" style={{ background: p.scrims ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: p.scrims ? '#22C55E' : '#EF4444', borderColor: p.scrims ? '#22C55E' : '#EF4444' }}>{p.scrims ? 'Yes' : 'No'}</span>
                            </div>
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Min. Availability</p>
                              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatAvailability(p.minAvailability)}</span>
                            </div>
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Coaching</p>
                              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatAvailability(p.coachingAvailability)}</span>
                            </div>
                          </div>
                        </div>
                        {/* Details Section */}
                        {p.details && (
                          <div className="rounded-lg p-4" style={{ background: 'var(--color-bg-tertiary)' }}>
                            <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Details</p>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{p.details}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {p.type === 'PLAYER' && (
                      <div className="space-y-4">
                        {/* Main Info Grid */}
                        <div className="rounded-lg p-4" style={{ background: 'var(--color-bg-tertiary)' }}>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Main Role</p>
                              <span className="text-xs px-2 py-1 rounded font-semibold border inline-flex items-center gap-1" style={{ background: 'rgba(200, 170, 109, 0.15)', color: '#C8AA6D', borderColor: '#C8AA6D' }}>
                                {getRoleIcon(p.mainRole || '')}
                                {p.mainRole}
                              </span>
                            </div>
                            {p.secondaryRole && (
                              <div>
                                <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Second Most Played</p>
                                <span className="text-xs px-2 py-1 rounded font-semibold border inline-flex items-center gap-1" style={{ background: 'rgba(200, 170, 109, 0.1)', color: '#C8AA6D', borderColor: '#C8AA6D', opacity: 0.8 }}>
                                  {getRoleIcon(p.secondaryRole)}
                                  {p.secondaryRole}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Rank</p>
                              {p.rank && getRankBadge(p.rank, p.division || undefined)}
                            </div>
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Server</p>
                              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{p.region}</span>
                            </div>
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Experience</p>
                              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatAvailability(p.experience)}</span>
                            </div>
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Age</p>
                              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{p.age || 'N/A'}</span>
                            </div>
                            <div>
                              <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Availability</p>
                              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatAvailability(p.availability)}</span>
                            </div>
                          </div>
                        </div>
                        {/* Languages & Skills Section */}
                        {((p.languages && p.languages.length > 0) || (p.skills && p.skills.length > 0)) && (
                          <div className="rounded-lg p-4" style={{ background: 'var(--color-bg-tertiary)' }}>
                            <div className="space-y-3">
                              {p.languages && p.languages.length > 0 && (
                                <div>
                                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Languages</p>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {p.languages.map(l => (
                                      <span key={l}>{getLanguageBadge(l)}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {p.skills && p.skills.length > 0 && (
                                <div>
                                  <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Skills</p>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {p.skills.map(s => (
                                      <span key={s} className="text-xs px-2 py-1 rounded font-semibold border" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-accent-1)', borderColor: 'var(--color-border)' }}>{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Admin delete */}
                    {p.isAdmin && (
                      <div className="mt-4 text-right">
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
                          className="px-3 py-1 rounded text-xs font-medium transition-colors"
                          style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                    </React.Fragment>
                  );
                })}
                
                {posts.length > visibleCount && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 25)}
                      className="px-6 py-3 font-semibold rounded"
                      style={{
                        background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                        color: 'var(--color-bg-primary)',
                        borderRadius: 'var(--border-radius)'
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
        <CreateTeamLftModal
          open={showTeamModal}
          onClose={() => setShowTeamModal(false)}
          onSubmit={handleTeamSubmit}
        />
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
