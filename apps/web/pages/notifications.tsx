import React, { useEffect, useState } from 'react';
import { useGlobalUI } from '@components/GlobalUI';
import Link from 'next/link';
import { getAuthToken, getUserIdFromToken } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Notification = {
  id: string;
  type:
    | 'CONTACT_REQUEST'
    | 'FEEDBACK_RECEIVED'
    | 'REPORT_RECEIVED'
    | 'REPORT_ACCEPTED'
    | 'REPORT_REJECTED'
    | 'PASSWORD_SETUP_REMINDER'
    | 'SCRIM_PROPOSAL_RECEIVED'
    | 'SCRIM_PROPOSAL_ACCEPTED'
    | 'SCRIM_PROPOSAL_REJECTED'
    | 'SCRIM_PROPOSAL_DELAYED'
    | 'SCRIM_PROPOSAL_AUTO_REJECTED'
    | 'SCRIM_SERIES_ACCEPTED'
    | 'SCRIM_MATCH_CODE_REGENERATED'
    | 'SCRIM_RESULT_AUTO_CONFIRMED'
    | 'SCRIM_RESULT_MANUAL_CONFIRMED'
    | 'SCRIM_RESULT_MANUAL_REQUIRED'
    | 'SCRIM_RESULT_CONFLICT_ESCALATION'
    | 'ADMIN_TEST';
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

type IncomingScrimProposal = {
  id: string;
  status: 'PENDING' | 'DELAYED';
  message: string | null;
  createdAt: string;
  proposerTeamOpggMultisearchUrl: string | null;
  proposerTeam: {
    id: string;
    name: string;
    tag: string | null;
    region: string;
  };
  post: {
    id: string;
    teamId: string;
    teamName: string;
    teamTag: string | null;
    startTimeUtc: string;
    scrimFormat: string;
    opggMultisearchUrl: string | null;
  };
};

function normalizeExternalUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `https://${url}`;
}

const NOTIFICATION_CONFIG: Record<Notification['type'], { icon: string; color: string; title: string }> = {
  CONTACT_REQUEST: { icon: '💬', color: 'var(--accent-primary)', title: 'Contact Request' },
  FEEDBACK_RECEIVED: { icon: '⭐', color: 'var(--accent-success)', title: 'New Feedback' },
  REPORT_RECEIVED: { icon: '⚠️', color: 'var(--accent-danger)', title: 'Report Received' },
  REPORT_ACCEPTED: { icon: '✅', color: 'var(--accent-danger)', title: 'Report Accepted' },
  REPORT_REJECTED: { icon: '❌', color: 'var(--accent-success)', title: 'Report Rejected' },
  PASSWORD_SETUP_REMINDER: { icon: '🔐', color: 'var(--accent-info)', title: 'Set Password Reminder' },
  SCRIM_PROPOSAL_RECEIVED: { icon: '⚔️', color: 'var(--accent-info)', title: 'Scrim Proposal Received' },
  SCRIM_PROPOSAL_ACCEPTED: { icon: '✅', color: 'var(--accent-success)', title: 'Scrim Proposal Accepted' },
  SCRIM_PROPOSAL_REJECTED: { icon: '❌', color: 'var(--accent-danger)', title: 'Scrim Proposal Rejected' },
  SCRIM_PROPOSAL_DELAYED: { icon: '🕒', color: 'var(--accent-warning)', title: 'Scrim Proposal Delayed' },
  SCRIM_PROPOSAL_AUTO_REJECTED: { icon: '⌛', color: 'var(--accent-danger)', title: 'Scrim Proposal Timed Out' },
  SCRIM_SERIES_ACCEPTED: { icon: '🤝', color: 'var(--accent-info)', title: 'Scrim Series Accepted' },
  SCRIM_MATCH_CODE_REGENERATED: { icon: '🔁', color: 'var(--accent-warning)', title: 'Match Code Regenerated' },
  SCRIM_RESULT_AUTO_CONFIRMED: { icon: '🎯', color: 'var(--accent-success)', title: 'Auto Result Confirmed' },
  SCRIM_RESULT_MANUAL_CONFIRMED: { icon: '✅', color: 'var(--accent-success)', title: 'Manual Result Confirmed' },
  SCRIM_RESULT_MANUAL_REQUIRED: { icon: '📝', color: 'var(--accent-warning)', title: 'Manual Winner Required' },
  SCRIM_RESULT_CONFLICT_ESCALATION: { icon: '🚨', color: 'var(--accent-danger)', title: 'Result Conflict Escalated' },
  ADMIN_TEST: { icon: '🔔', color: 'var(--accent-info)', title: 'Admin Test' },
};

function getNotificationConfig(notification: Notification) {
  if (notification.type === 'ADMIN_TEST') {
    const message = String(notification.message || '');
    if (message.startsWith('[Ad Request Approved]')) {
      return { icon: '✅', color: 'var(--accent-success)', title: 'Ad Request Approved' };
    }
    if (message.startsWith('[Ad Request Rejected]')) {
      return { icon: '❌', color: 'var(--accent-danger)', title: 'Ad Request Rejected' };
    }
    if (message.startsWith('[Ad Request]')) {
      return { icon: '📢', color: 'var(--accent-warning)', title: 'New Ad Request' };
    }
  }

  return NOTIFICATION_CONFIG[notification.type];
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [incomingProposals, setIncomingProposals] = useState<IncomingScrimProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { showToast } = useGlobalUI();

  const loadNotifications = async () => {
    try {
      const token = getAuthToken();
      const uid = token ? getUserIdFromToken(token) : null;
      setUserId(uid);
      if (!uid || !token) {
        setIncomingProposals([]);
        setLoading(false);
        return;
      }

      const authHeaders = { Authorization: `Bearer ${token}` };
      const [notificationRes, proposalRes] = await Promise.all([
        fetch(`${API_URL}/api/notifications?userId=${encodeURIComponent(uid)}`, { headers: authHeaders }),
        fetch(`${API_URL}/api/scrims/proposals/incoming`, { headers: authHeaders }),
      ]);

      if (!notificationRes.ok) {
        throw new Error('Failed to fetch notifications');
      }

      if (!proposalRes.ok) {
        const proposalError = await proposalRes.json().catch(() => ({}));
        throw new Error(proposalError.error || 'Failed to fetch incoming scrim proposals');
      }

      const notificationPayload = await notificationRes.json();
      const proposalPayload = await proposalRes.json();
      setNotifications(notificationPayload.notifications || []);
      setIncomingProposals(proposalPayload.proposals || []);
    } catch (err: any) {
      console.error('Failed to load notifications', err);
      showToast(err?.message || 'Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      void loadNotifications();
    }, 30000);
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

  const decideProposal = async (proposalId: string, action: 'ACCEPT' | 'REJECT' | 'DELAY') => {
    const token = getAuthToken();
    if (!token) return;

    setDecisionLoadingId(proposalId);

    try {
      const response = await fetch(`${API_URL}/api/scrims/proposals/${proposalId}/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update proposal');
      }

      showToast(`Proposal ${action.toLowerCase()}ed`, 'success');
      await loadNotifications();
    } catch (error: any) {
      console.error('Failed to decide scrim proposal', error);
      showToast(error?.message || 'Failed to update proposal', 'error');
    } finally {
      setDecisionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen py-8 px-4" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>Please log in to view notifications.</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
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

        {incomingProposals.length > 0 && (
          <section className="rounded-xl p-4" style={{ background: 'var(--color-bg-secondary)', border: '2px solid var(--color-border)' }}>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              Incoming Scrim Proposals
            </h2>
            <div className="space-y-3">
              {incomingProposals.map((proposal) => {
                const isLoading = decisionLoadingId === proposal.id;
                return (
                  <div
                    key={proposal.id}
                    className="rounded-lg p-3 border"
                    style={{ background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {proposal.proposerTeam.name} {proposal.proposerTeam.tag ? `[${proposal.proposerTeam.tag}]` : ''} wants to scrim {proposal.post.teamName}
                      </p>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: proposal.status === 'DELAYED' ? 'rgba(124,58,237,0.2)' : 'rgba(245,158,11,0.2)',
                          color: proposal.status === 'DELAYED' ? '#8B5CF6' : '#F59E0B',
                        }}
                      >
                        {proposal.status}
                      </span>
                    </div>

                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {new Date(proposal.post.startTimeUtc).toLocaleString()} • {proposal.post.scrimFormat}
                    </p>

                    {proposal.message && (
                      <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        {proposal.message}
                      </p>
                    )}

                    {proposal.proposerTeamOpggMultisearchUrl && (
                      <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Proposer OP.GG available for quick scouting.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => decideProposal(proposal.id, 'ACCEPT')}
                        className="px-3 py-1.5 rounded text-xs font-semibold"
                        style={{ background: '#16A34A', color: 'white' }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => decideProposal(proposal.id, 'DELAY')}
                        className="px-3 py-1.5 rounded text-xs font-semibold"
                        style={{ background: '#7C3AED', color: 'white' }}
                      >
                        Delay
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => decideProposal(proposal.id, 'REJECT')}
                        className="px-3 py-1.5 rounded text-xs font-semibold"
                        style={{ background: '#DC2626', color: 'white' }}
                      >
                        Reject
                      </button>
                      <Link
                        href="/teams/scrims"
                        className="px-3 py-1.5 rounded text-xs font-semibold border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--accent-primary)' }}
                      >
                        Open Scrim Finder
                      </Link>
                      {proposal.proposerTeamOpggMultisearchUrl && (
                        <a
                          href={normalizeExternalUrl(proposal.proposerTeamOpggMultisearchUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded text-xs font-semibold border"
                          style={{ borderColor: '#0EA5E9', color: '#0EA5E9' }}
                        >
                          Proposer OP.GG
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {notifications.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ background: 'var(--color-bg-secondary)', border: '2px solid var(--color-border)' }}>
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>No notifications</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const config = getNotificationConfig(n);
              return (
                <div
                  key={n.id}
                  className="rounded-xl p-4 border-2 transition-all hover:scale-[1.01]"
                  style={{
                    background: n.read ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary)',
                    borderColor: n.read ? 'var(--color-border)' : config.color,
                    boxShadow: n.read ? 'none' : 'var(--shadow)',
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
                          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: config.color, color: 'var(--color-bg-primary)' }}>
                            NEW
                          </span>
                        )}
                      </div>
                      {n.message && <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>{n.message}</p>}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
