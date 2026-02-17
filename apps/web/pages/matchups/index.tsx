import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useGlobalUI } from '../../components/GlobalUI';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { MatchupCard, Matchup } from '../../components/MatchupCard';
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

const MatchupsPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useGlobalUI();
  
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  
  const limit = 12;
  const [offset, setOffset] = useState(0);
  
  // Fetch matchups
  const fetchMatchups = async (reset: boolean = false) => {
    if (!user) {
      router.push('/login');
      return;
    }
    
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
      
      if (searchTerm) {
        params.append('myChampion', searchTerm);
      }
      if (roleFilter !== 'ALL') {
        params.append('role', roleFilter);
      }
      if (difficultyFilter !== 'ALL') {
        params.append('difficulty', difficultyFilter);
      }
      
      const response = await fetch(`${API_URL}/api/matchups?${params.toString()}`, {
        headers: getAuthHeader() as Record<string, string>,
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
  }, [user]);
  
  // Refetch when filters change
  useEffect(() => {
    if (!isLoading) {
      fetchMatchups(true);
    }
  }, [searchTerm, roleFilter, difficultyFilter]);
  
  // Handle delete
  const handleDelete = async (matchupId: string) => {
    const confirmed = await confirm({
      title: t('matchups.delete'),
      message: t('matchups.confirmDelete'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    });
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`${API_URL}/api/matchups/${matchupId}`, {
        method: 'DELETE',
        headers: getAuthHeader() as Record<string, string>,
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete matchup');
      }
      
      // Remove from local state
      setMatchups(prev => prev.filter(m => m.id !== matchupId));
      showToast(t('matchups.deleted'), 'success');
    } catch (error) {
      console.error('Error deleting matchup:', error);
      showToast(t('common.error'), 'error');
    }
  };
  
  // Handle remove (for saved matchups)
  const handleRemove = async (matchupId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/matchups/${matchupId}/saved`, {
        method: 'DELETE',
        headers: getAuthHeader() as Record<string, string>,
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove matchup from library');
      }
      
      // Remove from local state
      setMatchups(prev => prev.filter(m => m.id !== matchupId));
      showToast(t('matchups.removedFromLibrary'), 'success');
    } catch (error) {
      console.error('Error removing matchup:', error);
      showToast(t('common.error'), 'error');
    }
  };
  
  // Handle edit
  const handleEdit = (matchupId: string) => {
    router.push(`/matchups/create?id=${matchupId}`);
  };
  
  if (!user) {
    return null;
  }
  
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
              {t('matchups.myLibrary')}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {t('matchups.title')}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link href="/matchups/marketplace">
              <button 
                className="px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '2px solid var(--color-primary)',
                  color: 'var(--color-primary)',
                }}
              >
                {t('matchups.browsePublic')}
              </button>
            </Link>
            
            <Link href="/matchups/create">
              <button 
                className="px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                style={{
                  background: 'var(--btn-gradient)',
                  color: 'var(--btn-gradient-text)',
                }}
              >
                + {t('matchups.createNew')}
              </button>
            </Link>
          </div>
        </div>
        
        {/* Filters */}
        <div 
          className="rounded-lg p-6 mb-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('common.search')}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('matchups.searchPlaceholder')}
                className="w-full p-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            
            {/* Role filter */}
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
                className="w-full p-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Difficulty filter */}
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
                className="w-full p-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {DIFFICULTIES.map(difficulty => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty === 'ALL' ? 'ALL' : t(`matchups.difficulty.${difficulty.toLowerCase()}` as any)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Matchups grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : matchups.length === 0 ? (
          <div 
            className="text-center py-16 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p 
              className="text-xl mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('matchups.noMatchups')}
            </p>
            <Link href="/matchups/create">
              <button 
                className="px-6 py-3 rounded-lg font-semibold transition-all"
                style={{
                  background: 'var(--btn-gradient)',
                  color: 'var(--btn-gradient-text)',
                }}
              >
                {t('matchups.createNew')}
              </button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {matchups.map(matchup => (
                <MatchupCard
                  key={matchup.id}
                  matchup={matchup}
                  editable
                  onClick={() => router.push(`/matchups/${matchup.id}`)}
                  onEdit={() => handleEdit(matchup.id)}
                  onDelete={() => handleDelete(matchup.id)}
                  onRemove={() => handleRemove(matchup.id)}
                />
              ))}
            </div>
            
            {/* Load More button */}
            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={() => fetchMatchups(false)}
                  disabled={isLoadingMore}
                  className="px-8 py-3 rounded-lg font-semibold transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {isLoadingMore ? <LoadingSpinner compact /> : t('common.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MatchupsPage;
