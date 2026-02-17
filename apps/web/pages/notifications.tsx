import React, { useEffect, useState } from 'react';
import { useGlobalUI } from '../components/GlobalUI';
import Link from 'next/link';
import { getAuthToken, getUserIdFromToken } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Notification = {
  id: string;
  type: 'CONTACT_REQUEST' | 'FEEDBACK_RECEIVED' | 'REPORT_RECEIVED' | 'REPORT_ACCEPTED' | 'REPORT_REJECTED' | 'ADMIN_TEST';
  fromUserId?: string;
  postId?: string;
  feedbackId?: string;
  reportId?: string;
  message?: string;
  read: boolean;
  createdAt: string;
  senderUsername?: string;
  senderProfileLink?: string;
};

const NOTIFICATION_CONFIG: Record<Notification['type'], { icon: string; color: string; title: string }> = {
  CONTACT_REQUEST: { icon: '💬', color: 'var(--accent-primary)', title: 'Contact Request' },
  FEEDBACK_RECEIVED: { icon: '⭐', color: 'var(--accent-success)', title: 'New Feedback' },
  REPORT_RECEIVED: { icon: '⚠️', color: 'var(--accent-danger)', title: 'Report Received' },
  REPORT_ACCEPTED: { icon: '✅', color: 'var(--accent-danger)', title: 'Report Accepted' },
  REPORT_REJECTED: { icon: '❌', color: 'var(--accent-success)', title: 'Report Rejected' },
  ADMIN_TEST: { icon: '🔔', color: 'var(--accent-info)', title: 'Admin Test' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { showToast } = useGlobalUI();

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const token = getAuthToken();
        const uid = token ? getUserIdFromToken(token) : null;
        setUserId(uid);
        if (!uid) { 
          setLoading(false); 
          return; 
        }

        const res = await fetch(`${API_URL}/api/notifications?userId=${encodeURIComponent(uid)}`);
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error('Failed to load notifications', err);
        showToast('Failed to load notifications', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [showToast]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to update');
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
      showToast('Failed to mark notification as read','error');
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    for (const id of unreadIds) {
      await markAsRead(id);
    }
    showToast('All notifications marked as read', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg-main)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg-main)' }}>
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Please log in to view notifications.</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg-main)' }}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
              style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)' }}>
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>No notifications</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const config = NOTIFICATION_CONFIG[n.type];
              return (
                <div
                  key={n.id}
                  className="rounded-xl p-4 border-2 transition-all hover:scale-[1.01]"
                  style={{
                    background: n.read ? 'var(--bg-card)' : 'var(--bg-elevated)',
                    borderColor: n.read ? 'var(--border-card)' : config.color,
                    boxShadow: n.read ? 'none' : 'var(--shadow-md)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: config.color }}>
                          {config.title}
                        </span>
                        {n.senderUsername && n.senderProfileLink && (
                          <Link
                            href={n.senderProfileLink}
                            className="text-sm font-medium hover:underline transition-all"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            @{n.senderUsername}
                          </Link>
                        )}
                        {!n.read && (
                          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: config.color, color: 'var(--bg-card)' }}>
                            NEW
                          </span>
                        )}
                      </div>
                      {n.message && <p className="text-sm mb-2" style={{ color: 'var(--text-main)' }}>{n.message}</p>}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                        {!n.read && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="px-3 py-1 rounded-md text-xs font-medium transition-all hover:opacity-80"
                            style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)' }}
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
