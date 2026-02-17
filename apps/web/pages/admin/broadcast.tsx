// Admin Broadcast System Message
// Protected - requires admin badge
// Sends a system message to all users

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useGlobalUI } from '../../components/GlobalUI';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type BroadcastStats = {
  totalUsers: number;
  conversationsCreated: number;
  messagesSent: number;
};

export default function AdminBroadcast() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useGlobalUI();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastBroadcastStats, setLastBroadcastStats] = useState<BroadcastStats | null>(null);

  // Check admin status on mount
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/');
      return;
    }

    async function checkAdminStatus() {
      try {
        if (!user?.id) {
          setIsAdmin(false);
          router.push('/404');
          return;
        }

        const res = await fetch(`${API_URL}/api/user/check-admin?userId=${encodeURIComponent(user.id)}`, {
          headers: getAuthHeader(),
        });
        const data = await res.json();

        if (!data.isAdmin) {
          setIsAdmin(false);
          router.push('/404');
        } else {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Failed to check admin status:', err);
        setIsAdmin(false);
        router.push('/404');
      }
    }

    checkAdminStatus();
  }, [user, loading, router]);

  const handleSendBroadcast = async () => {
    // Validate message length
    if (messageContent.length < 10) {
      showToast(t('admin.broadcastTooShort'), 'error');
      return;
    }

    if (messageContent.length > 2000) {
      showToast(t('admin.broadcastTooLong'), 'error');
      return;
    }

    // Confirm with user
    const confirmed = await confirm({
      title: t('admin.broadcastTitle'),
      message: t('admin.broadcastConfirm'),
      confirmText: t('admin.broadcastSendButton'),
      cancelText: t('common.cancel'),
    });

    if (!confirmed) return;

    setIsSending(true);

    try {
      const res = await fetch(`${API_URL}/api/admin/broadcast-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ content: messageContent }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to broadcast message');
      }

      const data = await res.json();
      
      // Store stats
      setLastBroadcastStats(data.stats);

      // Show success message with stats
      const statsMessage = t('admin.broadcastStats')
        .replace('{users}', String(data.stats.totalUsers))
        .replace('{convos}', String(data.stats.conversationsCreated))
        .replace('{msgs}', String(data.stats.messagesSent));

      showToast(`${t('admin.broadcastSuccess')} ${statsMessage}`, 'success');

      // Clear the message
      setMessageContent('');
    } catch (err: any) {
      console.error('Failed to broadcast message:', err);
      showToast(err.message || 'Failed to broadcast message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))` }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent-1)' }}></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect to 404
  }

  const charCount = messageContent.length;
  const isValid = charCount >= 10 && charCount <= 2000;

  return (
    <>
      <Head>
        <title>{t('admin.broadcastTitle')} | LFD Admin</title>
        <meta name="description" content="Broadcast system message to all users" />
      </Head>

      <div className="min-h-screen" style={{ background: `linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))` }}>
        {/* Header */}
        <div className="border-b shadow-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  📡 {t('admin.broadcastTitle')}
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  {t('admin.broadcastDescription')}
                </p>
              </div>
              <Link
                href="/admin"
                className="px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Broadcast Form */}
          <div className="mb-8 p-6 rounded-lg border shadow-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Message Content
                </label>
                <span 
                  className="text-sm"
                  style={{ 
                    color: charCount < 10 ? 'var(--color-error)' : charCount > 2000 ? 'var(--color-error)' : 'var(--color-text-secondary)' 
                  }}
                >
                  {charCount} / 2000 {t('admin.broadcastCharCount')}
                </span>
              </div>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder={t('admin.broadcastPlaceholder')}
                className="w-full p-4 rounded-lg border outline-none resize-none"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  minHeight: '200px',
                }}
                disabled={isSending}
              />
              {charCount < 10 && charCount > 0 && (
                <p className="text-sm mt-2" style={{ color: 'var(--color-error)' }}>
                  {t('admin.broadcastTooShort')}
                </p>
              )}
              {charCount > 2000 && (
                <p className="text-sm mt-2" style={{ color: 'var(--color-error)' }}>
                  {t('admin.broadcastTooLong')}
                </p>
              )}
            </div>

            {/* Message Preview */}
            {messageContent && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  {t('admin.broadcastPreview')}
                </h3>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--color-accent-1)' }}>
                      ⚙️
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-1" style={{ color: 'var(--color-accent-1)' }}>
                        System
                      </div>
                      <div className="whitespace-pre-wrap break-words" style={{ color: 'var(--color-text-primary)' }}>
                        {messageContent}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendBroadcast}
              disabled={!isValid || isSending}
              className="w-full py-3 rounded-lg font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--color-accent-1)',
                color: 'var(--color-bg-primary)',
              }}
            >
              {isSending ? '📤 Sending...' : `📡 ${t('admin.broadcastSendButton')}`}
            </button>
          </div>

          {/* Last Broadcast Stats */}
          {lastBroadcastStats && (
            <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                ✅ Last Broadcast Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Total Users Messaged
                  </div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-1)' }}>
                    {lastBroadcastStats.totalUsers}
                  </div>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Conversations Created
                  </div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-1)' }}>
                    {lastBroadcastStats.conversationsCreated}
                  </div>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Messages Sent
                  </div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-1)' }}>
                    {lastBroadcastStats.messagesSent}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              ℹ️ How it works
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <li>• Messages are sent from a "System" user with a special icon</li>
              <li>• Each user will receive the message in their chat inbox</li>
              <li>• The system creates a new conversation if one doesn't exist</li>
              <li>• You (the admin) won't receive a copy of the message</li>
              <li>• Message length must be between 10 and 2000 characters</li>
              <li>• Use this feature sparingly for important announcements only</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
