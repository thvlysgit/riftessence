import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useGlobalUI } from '../../components/GlobalUI';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { getChampionIconUrl } from '../../utils/championData';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const ROLES = ['ALL', 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const DIFFICULTIES = [
  'ALL',
  'FREE_WIN',
  'VERY_FAVORABLE',
  'FAVORABLE',
  'SKILL_MATCHUP',
  'HARD',
  'VERY_HARD',
  'FREE_LOSE',
];

const DIFFICULTY_COLORS: Record<string, string> = {
  FREE_WIN: '#22c55e',
  VERY_FAVORABLE: '#84cc16',
  FAVORABLE: '#eab308',
  SKILL_MATCHUP: '#f59e0b',
  HARD: '#fb923c',
  VERY_HARD: '#f87171',
  FREE_LOSE: '#ef4444',
};

// Role icon helper
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
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16h19.99C64 44 92 72 120 100.02V120h-19.99C72 92 44 64 16 35.99V16z"/><path d="M32.03 120H16v-15.99c28-28.01 56.01-56 84.02-83.99V36c-22.67 0-45.33.01-67.99-.01 5.33 5.35 10.67 10.69 15.99 16.01 12 .01 24-.01 36 .01.01 11.96-.01 23.92 0 35.88-5.3 5.32-10.6 10.64-15.89 15.98-12.04.02-24.07-.05-36.1-.05V120z" opacity="0.75"/><path d="M56 56h28v28H56V56z" opacity="0.75"/></svg>;
    case 'SUPPORT':
    case 'SUP':
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M52.21 12.03c10.33-.1 20.66.06 30.99-.08 1.71 2.62 3.2 5.37 4.79 8.07C81.32 28 74.68 36.01 68 43.98 61.32 36 54.66 28 48.01 19.99c1.4-2.65 2.82-5.29 4.2-7.96ZM0 36.3c14.64-.68 29.33-.11 43.99-.3C48 40 52 44 56 48.01c-2.67 9.32-5.32 18.66-8.01 27.98-6.66-2.65-13.32-5.32-19.98-7.99 3.97-5.35 8.02-10.63 11.96-15.99-5.01-.08-10.15.4-15-1.14C15.58 48.12 7.75 42.05 0 36.34v-.04ZM92.02 36c14.66.05 29.32-.09 43.98.07v.03c-7.3 5.9-15.1 11.53-24.1 14.5-5.11 1.85-10.59 1.34-15.91 1.41 4.01 5.32 8 10.65 11.99 15.98-6.64 2.7-13.31 5.34-19.97 8-2.69-9.32-5.34-18.65-8.01-27.98C84.01 44 88 39.99 92.02 36ZM64.01 52.11c1.36 1.26 2.7 2.55 3.99 3.89 1.32-1.33 2.65-2.65 3.99-3.97 4.04 19.97 7.97 39.96 12.02 59.92-5.31 4.05-10.66 8.07-16.04 12.03-5.32-4.01-10.67-7.97-15.98-12.01 4.04-19.94 7.96-39.92 12.02-59.86Z"/></svg>;
    default:
      return null;
  }
};

interface PublicMatchup {
  id: string;
  myChampion: string;
  enemyChampion: string;
  role: string;
  difficulty: string;
  title: string;
  description: string;
  authorId: string;
  authorUsername: string;
  likeCount: number;
  dislikeCount: number;
  downloadCount: number;
  userVote?: 'like' | 'dislike' | null;
  isDownloaded: boolean;
  createdAt: string;
}

const MarketplacePage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useGlobalUI();
  
  const [matchups, setMatchups] = useState<PublicMatchup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  
  const limit = 12;
  const [offset, setOffset] = useState(0);
  
  // Fetch public matchups
  const fetchMatchups = async (reset: boolean = false) => {
    try {
      const currentOffset = reset ? 0 : offset;
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', currentOffset.toString());
      params.append('sortBy', sortBy);
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (roleFilter !== 'ALL') {
        params.append('role', roleFilter);
      }
      if (difficultyFilter !== 'ALL') {
        params.append('difficulty', difficultyFilter);
      }
      
      const headers: Record<string, string> = {};
      if (user) {
        Object.assign(headers, getAuthHeader());
      }
      
      const response = await fetch(`${API_URL}/api/matchups/public?${params.toString()}`, {
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch matchups');
      }
      
      const data = await response.json();
      
      if (reset) {
        setMatchups(data.matchups || []);
        setOffset(limit);
      } else {
        setMatchups(prev => [...prev, ...(data.matchups || [])]);
        setOffset(prev => prev + limit);
      }
      
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error fetching matchups:', error);
      showToast(t('common.error'), 'error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchMatchups(true);
  }, []);
  
  // Refetch when filters change
  useEffect(() => {
    if (!isLoading) {
      fetchMatchups(true);
    }
  }, [searchTerm, roleFilter, difficultyFilter, sortBy]);
  
  const handleVote = async (matchupId: string, isLike: boolean) => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/matchups/${matchupId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        } as Record<string, string>,
        body: JSON.stringify({ isLike }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to vote');
      }
      
      const data = await response.json();
      
      // Update local state
      setMatchups(prev =>
        prev.map(m =>
          m.id === matchupId
            ? {
                ...m,
                likeCount: data.likeCount,
                dislikeCount: data.dislikeCount,
                userVote: data.userVote,
              }
            : m
        )
      );
    } catch (error) {
      console.error('Error voting:', error);
      showToast(t('common.error'), 'error');
    }
  };
  
  const handleDownload = async (matchupId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/matchups/${matchupId}/download`, {
        method: 'POST',
        headers: getAuthHeader() as Record<string, string>,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add to library');
      }
      
      const data = await response.json();
      showToast(t('matchups.addedToLibrary'), 'success');
      
      // Update download count and isDownloaded status with actual values from backend
      setMatchups(prev =>
        prev.map(m =>
          m.id === matchupId
            ? { ...m, downloadCount: data.downloadCount, isDownloaded: true }
            : m
        )
      );
    } catch (error: any) {
      console.error('Error adding to library:', error);
      showToast(error.message || t('common.error'), 'error');
    }
  };
  
  const handleRemove = async (matchupId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    try {
      // Remove the saved matchup from user's library (unbookmark)
      const response = await fetch(`${API_URL}/api/matchups/${matchupId}/saved`, {
        method: 'DELETE',
        headers: getAuthHeader() as Record<string, string>,
      });
      
      if (!response.ok) throw new Error('Failed to remove from library');
      
      showToast(t('matchups.removedFromLibrary'), 'success');
      
      // Update isDownloaded status
      setMatchups(prev =>
        prev.map(m =>
          m.id === matchupId
            ? { ...m, isDownloaded: false }
            : m
        )
      );
    } catch (error: any) {
      console.error('Error removing from library:', error);
      showToast(error.message || t('common.error'), 'error');
    }
  };
  
  const getDifficultyLabel = (difficulty: string): string => {
    const key = `matchups.difficulty.${difficulty.toLowerCase()}` as any;
    try {
      return t(key);
    } catch {
      return difficulty;
    }
  };
  
  const getNetLikes = (matchup: PublicMatchup): string => {
    const net = matchup.likeCount - matchup.dislikeCount;
    return net > 0 ? `+${net}` : `${net}`;
  };
  
  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('matchups.marketplace')}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Browse community-shared matchup guides
            </p>
          </div>
          
          <Link href="/matchups">
            <button 
              className="px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {t('matchups.myLibrary')}
            </button>
          </Link>
        </div>
        
        {/* Filters */}
        <div 
          className="rounded-lg p-6 mb-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('matchups.search')}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('matchups.searchPlaceholder')}
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            
            {/* Role Filter */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('matchups.role')}
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Difficulty Filter */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('matchups.difficulty')}
              </label>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {DIFFICULTIES.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff === 'ALL' ? diff : getDifficultyLabel(diff)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Sort By */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('matchups.sortBy')}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 rounded-lg cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="newest">{t('matchups.newest')}</option>
                <option value="likes">{t('matchups.mostLiked')}</option>
                <option value="downloads">{t('matchups.mostDownloaded')}</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Matchups Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : matchups.length === 0 ? (
          <div 
            className="text-center py-12 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p 
              className="text-lg"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('matchups.noPublicMatchups')}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchups.map((matchup) => {
                const difficultyColor = DIFFICULTY_COLORS[matchup.difficulty] || DIFFICULTY_COLORS.SKILL_MATCHUP;
                const netLikes = getNetLikes(matchup);
                const isOwnMatchup = user && matchup.authorId === user.id;
                
                return (
                  <div 
                    key={matchup.id}
                    className="rounded-lg p-4 transition-all hover:shadow-lg cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                    onClick={() => router.push(`/matchups/${matchup.id}`)}
                  >
                    {/* Champions */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Image
                          src={getChampionIconUrl(matchup.myChampion)}
                          alt={matchup.myChampion}
                          width={40}
                          height={40}
                          className="rounded"
                        />
                        <span 
                          className="text-sm font-bold"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          VS
                        </span>
                        <Image
                          src={getChampionIconUrl(matchup.enemyChampion)}
                          alt={matchup.enemyChampion}
                          width={40}
                          height={40}
                          className="rounded"
                        />
                      </div>
                      
                      {/* Badges */}
                      <div className="flex flex-col gap-1 items-end">
                        <div 
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--color-accent-primary-bg)',
                            color: 'var(--color-accent-1)',
                          }}
                        >
                          {getRoleIcon(matchup.role)}
                          <span>{matchup.role}</span>
                        </div>
                        
                        <div 
                          className="px-2 py-1 rounded text-xs font-semibold"
                          style={{
                            backgroundColor: `${difficultyColor}20`,
                            color: difficultyColor,
                          }}
                        >
                          {getDifficultyLabel(matchup.difficulty)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Title & Description */}
                    <h3 
                      className="font-semibold text-lg mb-2"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {matchup.title}
                    </h3>
                    <p 
                      className="text-sm mb-3 line-clamp-2"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {matchup.description || 'No description provided'}
                    </p>
                    
                    {/* Author */}
                    <div 
                      className="text-xs mb-4"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {t('matchups.author')}: <Link href={`/profile/${matchup.authorUsername}`} onClick={(e) => e.stopPropagation()} className="underline hover:opacity-75">{matchup.authorUsername}</Link>
                    </div>
                    
                    {/* Stats & Actions */}
                    <div 
                      className="flex items-center justify-between pt-3 border-t"
                      style={{ borderColor: 'var(--color-border)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3 text-sm">
                        <span style={{ color: netLikes.startsWith('+') ? '#22c55e' : '#f87171' }}>
                          {netLikes}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          📥 {matchup.downloadCount}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Like Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOwnMatchup) {
                              handleVote(matchup.id, true);
                            }
                          }}
                          disabled={isOwnMatchup || !user}
                          className={`p-2 rounded transition-all ${
                            matchup.userVote === 'like' ? 'opacity-100' : 'opacity-50 hover:opacity-75'
                          }`}
                          style={{
                            backgroundColor: matchup.userVote === 'like' 
                              ? 'var(--color-accent-success-bg)' 
                              : 'var(--color-bg-tertiary)',
                            color: matchup.userVote === 'like' 
                              ? '#22c55e' 
                              : 'var(--color-text-secondary)',
                            cursor: isOwnMatchup || !user ? 'not-allowed' : 'pointer',
                          }}
                          title={isOwnMatchup ? 'Cannot vote on own matchup' : t('matchups.like')}
                        >
                          👍
                        </button>
                        
                        {/* Dislike Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOwnMatchup) {
                              handleVote(matchup.id, false);
                            }
                          }}
                          disabled={isOwnMatchup || !user}
                          className={`p-2 rounded transition-all ${
                            matchup.userVote === 'dislike' ? 'opacity-100' : 'opacity-50 hover:opacity-75'
                          }`}
                          style={{
                            backgroundColor: matchup.userVote === 'dislike' 
                              ? 'var(--color-accent-danger-bg)' 
                              : 'var(--color-bg-tertiary)',
                            color: matchup.userVote === 'dislike' 
                              ? '#f87171' 
                              : 'var(--color-text-secondary)',
                            cursor: isOwnMatchup || !user ? 'not-allowed' : 'pointer',
                          }}
                          title={isOwnMatchup ? 'Cannot vote on own matchup' : t('matchups.dislike')}
                        >
                          👎
                        </button>
                        
                        {/* Add/Remove from Library Button */}
                        {matchup.isDownloaded ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isOwnMatchup) {
                                handleRemove(matchup.id);
                              }
                            }}
                            disabled={isOwnMatchup || !user}
                            className="px-3 py-2 rounded text-sm font-medium transition-all"
                            style={{
                              backgroundColor: 'var(--color-accent-danger-bg)',
                              color: '#f87171',
                              border: '1px solid var(--color-accent-danger-border)',
                              cursor: isOwnMatchup || !user ? 'not-allowed' : 'pointer',
                              opacity: isOwnMatchup ? 0.5 : 1,
                            }}
                            title={isOwnMatchup ? 'Your own matchup' : t('matchups.removeFromLibrary')}
                          >
                            {t('matchups.removeFromLibrary')}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isOwnMatchup) {
                                handleDownload(matchup.id);
                              }
                            }}
                            disabled={isOwnMatchup || !user}
                            className="px-3 py-2 rounded text-sm font-medium transition-all"
                            style={{
                              backgroundColor: 'var(--color-accent-primary-bg)',
                              color: 'var(--color-accent-1)',
                              border: '1px solid var(--color-accent-primary-border)',
                              cursor: isOwnMatchup || !user ? 'not-allowed' : 'pointer',
                              opacity: isOwnMatchup ? 0.5 : 1,
                            }}
                            title={isOwnMatchup ? 'Your own matchup' : t('matchups.addToLibrary')}
                          >
                            {t('matchups.addToLibrary')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchMatchups(false)}
                  disabled={isLoadingMore}
                  className="px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {isLoadingMore ? t('common.loading') : t('common.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;
