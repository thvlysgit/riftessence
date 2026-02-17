import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useGlobalUI } from '../../components/GlobalUI';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { getChampionIconUrl } from '../../utils/championData';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

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
const getRoleIcon = (role: string | undefined, size: string = 'w-6 h-6') => {
  if (!role) return null;
  const r = role.toUpperCase();
  switch(r) {
    case 'TOP':
      return <svg className={size} viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c32.06 0 64.12-.01 96.18.01-6.72 6.67-13.45 13.33-20.19 19.99H36v56c-6.66 6.73-13.33 13.46-19.99 20.18-.02-32.06 0-64.12-.01-96.18Z"/><path d="M104 44.02c5.32-5.33 10.65-10.64 15.99-15.94.02 30.64.01 61.28.01 91.92-30.64 0-61.28.01-91.93-.01 5.33-5.34 10.66-10.66 16-15.99 19.97-.01 39.95.01 59.93 0V44.02Z" opacity="0.75"/><path d="M56 56h28v28H56V56Z" opacity="0.75"/></svg>;
    case 'JUNGLE':
      return <svg className={size} viewBox="0 0 136 136" fill="currentColor"><path d="M72.13 57.86C78.7 41.1 90.04 26.94 99.94 12.1 93 29.47 84.31 46.87 84.04 65.97c-.73 4.81-2.83 9.31-4 14.03-2.08-7.57-4.91-14.9-7.91-22.14ZM36.21 12.35c13.06 20.19 26.67 40.61 33.61 63.87 4.77 15.49 5.42 32.94-1.8 47.8-5.58-6.1-11.08-12.29-16.71-18.34-4.97-4.72-10.26-9.1-15.32-13.71-1.55-11.73-2.97-23.87-8.72-34.42-2.75-5.24-6.71-9.72-11.19-13.55 9.67 4.75 19.18 10.41 26.23 18.72 4.37 4.98 7.46 10.94 9.69 17.15 1.15-10.29.58-20.79-2.05-30.81-3.31-12.68-8.99-24.55-13.74-36.71ZM105.84 53.83c4.13-4 8.96-7.19 14.04-9.84-4.4 3.88-8.4 8.32-11.14 13.55-5.75 10.56-7.18 22.71-8.74 34.45-5.32 5.35-10.68 10.65-15.98 16.01.15-4.37-.25-8.84 1.02-13.1 3.39-15.08 9.48-30.18 20.8-41.07Z"/></svg>;
    case 'MID':
    case 'MIDDLE':
      return <svg className={size} viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c22.67 0 45.33 0 67.99.01C78.62 21.34 73.28 26.69 67.88 32c-11.96 0-23.92-.01-35.88 0-.01 12 .01 24-.01 36-5.32 5.3-10.64 10.6-15.98 15.89C15.99 61.26 16 38.63 16 16zm87.95 51.9c5.32-5.37 10.69-10.68 16.04-16.02.02 22.71.01 45.41 0 68.12-22.65 0-45.31.01-67.97-.01 5.33-5.33 10.65-10.67 15.99-15.99 12-.01 23.99.01 35.99 0 .04-12.04-.05-24.07-.05-36.1z" opacity="0.75"/><path d="M100.02 16H120v19.99C92 64 64 92 35.99 120H16v-19.99C44 72 72 43.99 100.02 16z"/></svg>;
    case 'ADC':
    case 'BOT':
    case 'BOTTOM':
      return <svg className={size} viewBox="0 0 136 136" fill="currentColor"><path d="M16 16h19.99C64 44 92 72 120 100.02V120h-19.99C72 92 44 64 16 35.99V16z"/><path d="M32.03 120H16v-15.99c28-28.01 56.01-56 84.02-83.99V36c-22.67 0-45.33.01-67.99-.01 5.33 5.35 10.67 10.69 15.99 16.01 12 .01 24-.01 36 .01.01 11.96-.01 23.92 0 35.88-5.3 5.32-10.6 10.64-15.89 15.98-12.04.02-24.07-.05-36.1-.05V120z" opacity="0.75"/><path d="M56 56h28v28H56V56z" opacity="0.75"/></svg>;
    case 'SUPPORT':
    case 'SUP':
      return <svg className={size} viewBox="0 0 136 136" fill="currentColor"><path d="M52.21 12.03c10.33-.1 20.66.06 30.99-.08 1.71 2.62 3.2 5.37 4.79 8.07C81.32 28 74.68 36.01 68 43.98 61.32 36 54.66 28 48.01 19.99c1.4-2.65 2.82-5.29 4.2-7.96ZM0 36.3c14.64-.68 29.33-.11 43.99-.3C48 40 52 44 56 48.01c-2.67 9.32-5.32 18.66-8.01 27.98-6.66-2.65-13.32-5.32-19.98-7.99 3.97-5.35 8.02-10.63 11.96-15.99-5.01-.08-10.15.4-15-1.14C15.58 48.12 7.75 42.05 0 36.34v-.04ZM92.02 36c14.66.05 29.32-.09 43.98.07v.03c-7.3 5.9-15.1 11.53-24.1 14.5-5.11 1.85-10.59 1.34-15.91 1.41 4.01 5.32 8 10.65 11.99 15.98-6.64 2.7-13.31 5.34-19.97 8-2.69-9.32-5.34-18.65-8.01-27.98C84.01 44 88 39.99 92.02 36ZM64.01 52.11c1.36 1.26 2.7 2.55 3.99 3.89 1.32-1.33 2.65-2.65 3.99-3.97 4.04 19.97 7.97 39.96 12.02 59.92-5.31 4.05-10.66 8.07-16.04 12.03-5.32-4.01-10.67-7.97-15.98-12.01 4.04-19.94 7.96-39.92 12.02-59.86Z"/></svg>;
    default:
      return null;
  }
};

interface MatchupDetail {
  id: string;
  myChampion: string;
  enemyChampion: string;
  role: string;
  difficulty: string;
  laningNotes: string;
  teamfightNotes: string;
  itemNotes: string;
  spikeNotes: string;
  isPublic: boolean;
  title?: string;
  description?: string;
  authorId: string;
  authorUsername?: string;
  likeCount: number;
  dislikeCount: number;
  downloadCount: number;
  userVote?: 'like' | 'dislike' | null;
  createdAt: string;
  updatedAt: string;
}

const MatchupDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useGlobalUI();
  
  const [matchup, setMatchup] = useState<MatchupDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'laning' | 'teamfight' | 'items' | 'spikes'>('laning');
  
  useEffect(() => {
    if (id) {
      fetchMatchup();
    }
  }, [id]);
  
  const fetchMatchup = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user) {
        Object.assign(headers, getAuthHeader());
      }
      
      const response = await fetch(`${API_URL}/api/matchups/${id}`, {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          showToast('Matchup not found', 'error');
          router.push('/matchups');
          return;
        }
        if (response.status === 403) {
          showToast('You do not have access to this matchup', 'error');
          router.push('/matchups');
          return;
        }
        throw new Error('Failed to fetch matchup');
      }
      
      const data = await response.json();
      setMatchup(data.matchup);
    } catch (error) {
      console.error('Error fetching matchup:', error);
      showToast(t('common.error'), 'error');
      router.push('/matchups');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVote = async (isLike: boolean) => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!matchup) return;
    
    try {
      const response = await fetch(`${API_URL}/api/matchups/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        } as Record<string, string>,
        body: JSON.stringify({ isLike }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to vote' }));
        throw new Error(errorData.error || 'Failed to vote');
      }
      
      const data = await response.json();
      
      setMatchup(prev => prev ? {
        ...prev,
        likeCount: data.likeCount,
        dislikeCount: data.dislikeCount,
        userVote: data.userVote,
      } : null);
    } catch (error) {
      console.error('Error voting:', error);
      showToast(t('common.error'), 'error');
    }
  };
  
  const handleDownload = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/matchups/${id}/download`, {
        method: 'POST',
        headers: getAuthHeader() as Record<string, string>,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download');
      }
      
      showToast(t('matchups.downloaded'), 'success');
      
      if (matchup) {
        setMatchup({
          ...matchup,
          downloadCount: matchup.downloadCount + 1,
        });
      }
    } catch (error: any) {
      console.error('Error downloading matchup:', error);
      showToast(error.message || t('common.error'), 'error');
    }
  };
  
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: t('matchups.delete'),
      message: t('matchups.confirmDelete'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    });
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`${API_URL}/api/matchups/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader() as Record<string, string>,
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete matchup');
      }
      
      showToast(t('matchups.deleted'), 'success');
      router.push('/matchups');
    } catch (error) {
      console.error('Error deleting matchup:', error);
      showToast(t('common.error'), 'error');
    }
  };
  
  const handleTogglePublic = async () => {
    if (!matchup) return;
    
    try {
      const response = await fetch(`${API_URL}/api/matchups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        } as Record<string, string>,
        body: JSON.stringify({
          ...matchup,
          isPublic: !matchup.isPublic,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update matchup');
      }
      
      const data = await response.json();
      setMatchup(data);
      showToast(t('matchups.toggledPublic'), 'success');
    } catch (error) {
      console.error('Error toggling public:', error);
      showToast(t('common.error'), 'error');
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
  
  const getNetLikes = (): string => {
    if (!matchup) return '0';
    const net = matchup.likeCount - matchup.dislikeCount;
    return net > 0 ? `+${net}` : `${net}`;
  };
  
  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <LoadingSpinner />
      </div>
    );
  }
  
  if (!matchup) {
    return null;
  }
  
  const isOwnMatchup = user && matchup.authorId === user.id;
  const difficultyColor = DIFFICULTY_COLORS[matchup.difficulty] || DIFFICULTY_COLORS.SKILL_MATCHUP;
  const netLikes = getNetLikes();
  
  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link 
          href={isOwnMatchup ? '/matchups' : '/matchups/marketplace'}
          className="inline-flex items-center gap-2 mb-6 transition-opacity hover:opacity-75"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ← {t('common.back')}
        </Link>
        
        {/* Header Section */}
        <div 
          className="rounded-lg p-6 mb-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Champions vs */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex flex-col items-center">
              <Image
                src={getChampionIconUrl(matchup.myChampion)}
                alt={matchup.myChampion}
                width={80}
                height={80}
                className="rounded"
              />
              <span 
                className="text-lg font-bold mt-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {matchup.myChampion}
              </span>
            </div>
            
            <div 
              className="text-3xl font-bold"
              style={{ color: 'var(--color-text-muted)' }}
            >
              VS
            </div>
            
            <div className="flex flex-col items-center">
              <Image
                src={getChampionIconUrl(matchup.enemyChampion)}
                alt={matchup.enemyChampion}
                width={80}
                height={80}
                className="rounded"
              />
              <span 
                className="text-lg font-bold mt-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {matchup.enemyChampion}
              </span>
            </div>
          </div>
          
          {/* Badges and Stats */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-accent-primary-bg)',
                color: 'var(--color-accent-1)',
                border: '1px solid var(--color-accent-primary-border)',
              }}
            >
              {getRoleIcon(matchup.role)}
              <span className="font-semibold">{matchup.role?.toUpperCase()}</span>
            </div>
            
            <div 
              className="px-4 py-2 rounded-lg font-semibold"
              style={{
                backgroundColor: `${difficultyColor}20`,
                color: difficultyColor,
                border: `2px solid ${difficultyColor}40`,
              }}
            >
              {getDifficultyLabel(matchup.difficulty)}
            </div>
          </div>
          
          {/* Title & Description (if public) */}
          {matchup.isPublic && matchup.title && (
            <>
              <h1 
                className="text-2xl font-bold text-center mb-3"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {matchup.title}
              </h1>
              {matchup.description && (
                <p 
                  className="text-center mb-4"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {matchup.description}
                </p>
              )}
            </>
          )}
          
          {/* Author (if public) */}
          {matchup.isPublic && matchup.authorUsername && (
            <div 
              className="text-center mb-4"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('matchups.author')}: <Link href={`/profile/${matchup.authorUsername}`} className="underline hover:opacity-75">{matchup.authorUsername}</Link>
            </div>
          )}
          
          {/* Stats */}
          {matchup.isPublic && (
            <div className="flex items-center justify-center gap-6 mb-6 text-sm">
              <span style={{ color: '#22c55e' }}>
                👍 {matchup.likeCount}
              </span>
              <span style={{ color: '#f87171' }}>
                👎 {matchup.dislikeCount}
              </span>
              <span style={{ color: netLikes.startsWith('+') ? '#22c55e' : '#f87171' }}>
                Net: {netLikes}
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                📥 {matchup.downloadCount}
              </span>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {isOwnMatchup ? (
              <>
                <button
                  onClick={() => router.push(`/matchups/create?id=${matchup.id}`)}
                  className="px-6 py-3 rounded-lg font-semibold transition-all"
                  style={{
                    backgroundColor: 'var(--color-accent-primary-bg)',
                    color: 'var(--color-accent-1)',
                    border: '1px solid var(--color-accent-primary-border)',
                  }}
                >
                  {t('matchups.edit')}
                </button>
                
                <button
                  onClick={handleTogglePublic}
                  className="px-6 py-3 rounded-lg font-semibold transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {matchup.isPublic ? 'Make Private' : 'Make Public'}
                </button>
                
                <button
                  onClick={handleDelete}
                  className="px-6 py-3 rounded-lg font-semibold transition-all"
                  style={{
                    backgroundColor: 'var(--color-accent-danger-bg)',
                    color: 'var(--color-error)',
                    border: '1px solid var(--color-accent-danger-border)',
                  }}
                >
                  {t('matchups.delete')}
                </button>
              </>
            ) : matchup.isPublic ? (
              <>
                <button
                  onClick={() => handleVote(true)}
                  disabled={!user}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    matchup.userVote === 'like' ? 'opacity-100' : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: matchup.userVote === 'like' 
                      ? 'var(--color-accent-success-bg)' 
                      : 'var(--color-bg-tertiary)',
                    color: matchup.userVote === 'like' 
                      ? '#22c55e' 
                      : 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    cursor: !user ? 'not-allowed' : 'pointer',
                  }}
                  title={!user ? 'Login to vote' : t('matchups.like')}
                >
                  👍 {t('matchups.like')}
                </button>
                
                <button
                  onClick={() => handleVote(false)}
                  disabled={!user}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    matchup.userVote === 'dislike' ? 'opacity-100' : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: matchup.userVote === 'dislike' 
                      ? 'var(--color-accent-danger-bg)' 
                      : 'var(--color-bg-tertiary)',
                    color: matchup.userVote === 'dislike' 
                      ? '#f87171' 
                      : 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    cursor: !user ? 'not-allowed' : 'pointer',
                  }}
                  title={!user ? 'Login to vote' : t('matchups.dislike')}
                >
                  👎 {t('matchups.dislike')}
                </button>
              </>
            ) : (
              <div 
                className="text-center py-4"
                style={{ color: 'var(--color-text-muted)' }}
              >
                This is a private matchup
              </div>
            )}
          </div>
        </div>
        
        {/* Notes Tabs */}
        <div 
          className="rounded-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Tab Headers */}
          <div 
            className="flex border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => setActiveTab('laning')}
              className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                activeTab === 'laning' ? 'border-b-2' : ''
              }`}
              style={{
                color: activeTab === 'laning' 
                  ? 'var(--color-accent-1)' 
                  : 'var(--color-text-secondary)',
                borderColor: activeTab === 'laning' 
                  ? 'var(--color-accent-1)' 
                  : 'transparent',
              }}
            >
              {t('matchups.laningPhase')}
            </button>
            
            <button
              onClick={() => setActiveTab('teamfight')}
              className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                activeTab === 'teamfight' ? 'border-b-2' : ''
              }`}
              style={{
                color: activeTab === 'teamfight' 
                  ? 'var(--color-accent-1)' 
                  : 'var(--color-text-secondary)',
                borderColor: activeTab === 'teamfight' 
                  ? 'var(--color-accent-1)' 
                  : 'transparent',
              }}
            >
              {t('matchups.teamFights')}
            </button>
            
            <button
              onClick={() => setActiveTab('items')}
              className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                activeTab === 'items' ? 'border-b-2' : ''
              }`}
              style={{
                color: activeTab === 'items' 
                  ? 'var(--color-accent-1)' 
                  : 'var(--color-text-secondary)',
                borderColor: activeTab === 'items' 
                  ? 'var(--color-accent-1)' 
                  : 'transparent',
              }}
            >
              {t('matchups.items')}
            </button>
            
            <button
              onClick={() => setActiveTab('spikes')}
              className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                activeTab === 'spikes' ? 'border-b-2' : ''
              }`}
              style={{
                color: activeTab === 'spikes' 
                  ? 'var(--color-accent-1)' 
                  : 'var(--color-text-secondary)',
                borderColor: activeTab === 'spikes' 
                  ? 'var(--color-accent-1)' 
                  : 'transparent',
              }}
            >
              {t('matchups.powerSpikes')}
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'laning' && (
              <div style={{ color: 'var(--color-text-primary)' }}>
                {matchup.laningNotes ? (
                  <p className="whitespace-pre-wrap">{matchup.laningNotes}</p>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    No notes provided for laning phase.
                  </p>
                )}
              </div>
            )}
            
            {activeTab === 'teamfight' && (
              <div style={{ color: 'var(--color-text-primary)' }}>
                {matchup.teamfightNotes ? (
                  <p className="whitespace-pre-wrap">{matchup.teamfightNotes}</p>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    No notes provided for team fights.
                  </p>
                )}
              </div>
            )}
            
            {activeTab === 'items' && (
              <div style={{ color: 'var(--color-text-primary)' }}>
                {matchup.itemNotes ? (
                  <p className="whitespace-pre-wrap">{matchup.itemNotes}</p>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    No notes provided for items and builds.
                  </p>
                )}
              </div>
            )}
            
            {activeTab === 'spikes' && (
              <div style={{ color: 'var(--color-text-primary)' }}>
                {matchup.spikeNotes ? (
                  <p className="whitespace-pre-wrap">{matchup.spikeNotes}</p>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    No notes provided for power spikes.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchupDetailPage;
