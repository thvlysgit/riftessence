import React from 'react';
import AccessRequirementModal from './AccessRequirementModal';

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
  action = 'view',
  onClose
}: NoAccessProps) {
  const defaultReasonByAction: Record<NonNullable<NoAccessProps['action']>, string> = {
    view: 'You need to have an account to access this page.',
    'create-post': 'You need to have an account to send a post.',
    'find-players': 'You need to have an account to use this action.',
    'find-team': 'You need to have an account to send a post.',
  };

  return (
    <AccessRequirementModal
      type="account-required"
      reason={message || title || defaultReasonByAction[action]}
      onClose={onClose}
    />
  );
}
