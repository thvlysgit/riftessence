import React from 'react';
import Link from 'next/link';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface NoAccessProps {
  title?: string;
  message?: string;
  showButtons?: boolean;
  action?: 'view' | 'create-post' | 'find-players' | 'find-team';
  onClose?: () => void;
  closeIcon?: 'close' | 'home';
}

export default function NoAccess({ 
  title,
  message,
  showButtons = true,
  action = 'view',
  onClose,
  closeIcon = 'close'
}: NoAccessProps) {
  const { currentTheme } = useTheme();
  const { t } = useLanguage();
  
  // Get translated title and message based on action type
  const getActionConfig = () => {
    switch (action) {
      case 'view':
        return {
          title: t('noAccess.profileRequired'),
          message: t('noAccess.profileRequiredDesc'),
        };
      case 'create-post':
        return {
          title: t('noAccess.createPostRequired'),
          message: t('noAccess.createPostRequiredDesc'),
        };
      case 'find-players':
        return {
          title: t('noAccess.findPlayersRequired'),
          message: t('noAccess.findPlayersRequiredDesc'),
        };
      case 'find-team':
        return {
          title: t('noAccess.findTeamRequired'),
          message: t('noAccess.findTeamRequiredDesc'),
        };
      default:
        return {
          title: t('noAccess.profileRequired'),
          message: t('noAccess.profileRequiredDesc'),
        };
    }
  };
  
  const config = getActionConfig();
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  return (
    <div 
      className="relative max-w-md w-full text-center p-8 rounded-xl border shadow-2xl"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Close/Home Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-110 active:scale-95"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-muted)',
          }}
          aria-label={closeIcon === 'home' ? t('noAccess.goHome') : t('noAccess.close')}
        >
          {closeIcon === 'home' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      )}
        {/* Lock Icon */}
        <div 
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <svg 
            className="w-10 h-10" 
            fill="none" 
            stroke="var(--color-accent-1)" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
            />
          </svg>
        </div>

        {/* Title */}
        <h1 
          className="text-2xl font-bold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {displayTitle}
        </h1>

        {/* Message */}
        <p 
          className="mb-8 text-base"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {displayMessage}
        </p>

        {/* Action Buttons */}
        {showButtons && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="px-6 py-3 rounded-lg font-semibold transition-all text-center hover:opacity-90 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: 'var(--color-accent-1)',
                color: 'var(--color-bg-primary)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              {t('noAccess.signIn')}
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-lg font-semibold transition-all border text-center hover:bg-opacity-10 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-accent-1)',
                color: 'var(--color-accent-1)',
              }}
            >
              {t('noAccess.createAccount')}
            </Link>
          </div>
        )}
      </div>
  );
}
