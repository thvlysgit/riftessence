import React from 'react';
import Image from 'next/image';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getChampionIconUrl } from '../utils/championData';

type DifficultyLevel = 
  | 'FREE_WIN' 
  | 'VERY_FAVORABLE' 
  | 'FAVORABLE' 
  | 'SKILL_MATCHUP' 
  | 'HARD' 
  | 'VERY_HARD' 
  | 'FREE_LOSE';

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
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
      return <Image src="/assets/BotLane.png" alt="Bot" width={16} height={16} className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(16%) saturate(1018%) hue-rotate(8deg) brightness(91%) contrast(85%)' }} />;
    case 'SUPPORT':
    case 'SUP':
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M52.21 12.03c10.33-.1 20.66.06 30.99-.08 1.71 2.62 3.2 5.37 4.79 8.07C81.32 28 74.68 36.01 68 43.98 61.32 36 54.66 28 48.01 19.99c1.4-2.65 2.82-5.29 4.2-7.96ZM0 36.3c14.64-.68 29.33-.11 43.99-.3C48 40 52 44 56 48.01c-2.67 9.32-5.32 18.66-8.01 27.98-6.66-2.65-13.32-5.32-19.98-7.99 3.97-5.35 8.02-10.63 11.96-15.99-5.01-.08-10.15.4-15-1.14C15.58 48.12 7.75 42.05 0 36.34v-.04ZM92.02 36c14.66.05 29.32-.09 43.98.07v.03c-7.3 5.9-15.1 11.53-24.1 14.5-5.11 1.85-10.59 1.34-15.91 1.41 4.01 5.32 8 10.65 11.99 15.98-6.64 2.7-13.31 5.34-19.97 8-2.69-9.32-5.34-18.65-8.01-27.98C84.01 44 88 39.99 92.02 36ZM64.01 52.11c1.36 1.26 2.7 2.55 3.99 3.89 1.32-1.33 2.65-2.65 3.99-3.97 4.04 19.97 7.97 39.96 12.02 59.92-5.31 4.05-10.66 8.07-16.04 12.03-5.32-4.01-10.67-7.97-15.98-12.01 4.04-19.94 7.96-39.92 12.02-59.86Z"/></svg>;
    default:
      return null;
  }
};

export interface Matchup {
  id: string;
  myChampion: string;
  enemyChampion: string;
  role: string;
  difficulty: string;
  title?: string;
  description?: string;
  laningNotes: string;
  teamfightNotes: string;
  itemBuild: string;
  powerSpikes: string;
  isPublic: boolean;
  authorId: string;
  authorUsername?: string;
  likeCount?: number;
  dislikeCount?: number;
  downloadCount?: number;
  createdAt?: string;
  updatedAt?: string;
  isSaved?: boolean;  // True if this is a saved matchup from marketplace
  isOwned?: boolean;  // True if this matchup belongs to current user
}

interface MatchupCardProps {
  matchup: Matchup;
  onEdit?: () => void;
  onDelete?: () => void;
  onRemove?: () => void; // For removing saved matchups from library
  onClick?: () => void;
  showAuthor?: boolean;
  editable?: boolean;
}

export const MatchupCard: React.FC<MatchupCardProps> = ({
  matchup,
  onEdit,
  onDelete,
  onRemove,
  onClick,
  showAuthor = false,
  editable = false,
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const difficultyColor = DIFFICULTY_COLORS[matchup.difficulty as DifficultyLevel] || DIFFICULTY_COLORS.SKILL_MATCHUP;
  
  const isOwnMatchup = user?.id === matchup.authorId;
  const authorDisplay = isOwnMatchup ? t('common.you') : (matchup.authorUsername || 'Unknown');
  
  const getDifficultyLabel = (difficulty: string): string => {
    const key = `matchups.difficulty.${difficulty.toLowerCase()}` as any;
    try {
      return t(key);
    } catch {
      return difficulty;
    }
  };
  
  return (
    <div 
      className="rounded-lg p-4 transition-all hover:shadow-lg"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {/* Header with champions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* My Champion */}
          <div className="flex flex-col items-center">
            <Image
              src={getChampionIconUrl(matchup.myChampion)}
              alt={matchup.myChampion}
              width={48}
              height={48}
              className="rounded"
            />
            <span className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {matchup.myChampion}
            </span>
          </div>
          
          {/* VS */}
          <div 
            className="text-xl font-bold px-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            VS
          </div>
          
          {/* Enemy Champion */}
          <div className="flex flex-col items-center">
            <Image
              src={getChampionIconUrl(matchup.enemyChampion)}
              alt={matchup.enemyChampion}
              width={48}
              height={48}
              className="rounded"
            />
            <span className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {matchup.enemyChampion}
            </span>
          </div>
        </div>
        
        {/* Role & Difficulty badges */}
        <div className="flex flex-col gap-2 items-end">
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: 'var(--color-accent-primary-bg)',
              color: 'var(--color-accent-1)',
              border: '1px solid var(--color-accent-primary-border)',
            }}
          >
            {getRoleIcon(matchup.role)}
            <span>{matchup.role.toUpperCase()}</span>
          </div>
          
          <div 
            className="px-2 py-1 rounded text-xs font-semibold"
            style={{
              backgroundColor: `${difficultyColor}20`,
              color: difficultyColor,
              border: `1px solid ${difficultyColor}40`,
            }}
          >
            {getDifficultyLabel(matchup.difficulty)}
          </div>
        </div>
      </div>
      
      {/* Preview - show title and author */}
      <div className="mb-3">
        <div 
          className="text-sm font-medium mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {matchup.title || `${matchup.myChampion} vs ${matchup.enemyChampion}`}
        </div>
        <p 
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('matchups.author')}: {authorDisplay}
        </p>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          {/* Public/Private badge */}
          <span 
            className="text-xs px-2 py-1 rounded"
            style={{
              backgroundColor: matchup.isPublic ? 'var(--color-accent-success-bg)' : 'var(--color-bg-tertiary)',
              color: matchup.isPublic ? 'var(--color-success)' : 'var(--color-text-muted)',
            }}
          >
            {matchup.isPublic ? t('matchups.public') : t('matchups.private')}
          </span>
          
          {/* Stats for public matchups */}
          {matchup.isPublic && (
            <>
              {matchup.likeCount !== undefined && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  👍 {matchup.likeCount}
                </span>
              )}
              {matchup.downloadCount !== undefined && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  📥 {matchup.downloadCount}
                </span>
              )}
            </>
          )}
          
          {/* Author */}
          {showAuthor && matchup.authorUsername && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              by {matchup.authorUsername}
            </span>
          )}
        </div>
        
        {/* Action buttons */}
        {editable && (
          <div className="flex gap-2">
            {/* Show edit/delete only for owned matchups */}
            {matchup.isOwned && (
              <>
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="px-3 py-1 rounded text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--color-accent-primary-bg)',
                      color: 'var(--color-accent-1)',
                      border: '1px solid var(--color-accent-primary-border)',
                    }}
                  >
                    {t('matchups.edit')}
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="px-3 py-1 rounded text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--color-accent-danger-bg)',
                      color: 'var(--color-error)',
                      border: '1px solid var(--color-accent-danger-border)',
                    }}
                  >
                    {t('matchups.delete')}
                  </button>
                )}
              </>
            )}
            {/* Show remove button for saved (non-owned) matchups */}
            {matchup.isSaved && !matchup.isOwned && onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="px-3 py-1 rounded text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--color-accent-warning-bg)',
                  color: 'var(--color-warning)',
                  border: '1px solid var(--color-accent-warning-border)',
                }}
              >
                {t('matchups.removeFromLibrary')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
