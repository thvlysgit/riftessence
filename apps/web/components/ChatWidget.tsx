import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { getAuthHeader } from '../utils/auth';
import { getProfileIconUrl } from '../utils/championData';
import AccessRequirementModal from './AccessRequirementModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useGlobalUI } from './GlobalUI';
import { ReportModal } from './ReportModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const MESSAGE_PAGE_SIZE = 50;

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  status?: 'sending' | 'failed';
  sender: {
    id: string;
    username: string;
    profileIconId?: number;
  };
}

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    username: string;
    verified: boolean;
    profileIconId?: number;
    rank: string;
    region: string | null;
  };
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCount: number;
}

// Helper Components
const UserAvatar = ({ profileIconId, username, size = 'md' }: { profileIconId?: number; username: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { 
    sm: 'w-8 h-8 text-xs', 
    md: 'w-10 h-10 text-sm', 
    lg: 'w-12 h-12 text-base' 
  };
  
  if (profileIconId) {
    return (
      <img
        src={getProfileIconUrl(profileIconId)}
        alt={username}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0 border-2`}
        style={{ borderColor: 'var(--color-border)' }}
      />
    );
  }
  
  return (
    <div 
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{
        background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))',
        color: 'var(--color-bg-primary)',
      }}
    >
      {username[0]?.toUpperCase() || '?'}
    </div>
  );
};

const getRankIcon = (rank: string) => {
  const rankLower = rank.toLowerCase();
  const iconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${rankLower}.png`;
  return <img src={iconUrl} alt={rank} className="inline-block w-3 h-3" />;
};

const getRankColor = (rank: string) => {
  const colors: Record<string, string> = {
    IRON: '#4A4A4A',
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#00CED1',
    EMERALD: '#50C878',
    DIAMOND: '#B9F2FF',
    MASTER: '#9933FF',
    GRANDMASTER: '#FF0000',
    CHALLENGER: '#F4C430',
    UNRANKED: '#6B7280',
  };
  return colors[rank] || colors.UNRANKED;
};

const RankBadge = ({ rank }: { rank: string }) => {
  const cleanRank = rank.split(' ')[0];
  const color = getRankColor(cleanRank);
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold border"
      style={{ 
        background: `${color}15`, 
        color: color, 
        borderColor: color 
      }}
    >
      {getRankIcon(cleanRank)}
      <span className="hidden sm:inline">{cleanRank}</span>
    </span>
  );
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

function useAdaptivePolling(
  enabled: boolean,
  poll: () => Promise<boolean>,
  options: { initialMs: number; baseMs: number; hiddenMs: number; maxMs: number }
) {
  const pollRef = useRef(poll);
  const failuresRef = useRef(0);

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delayMs: number) => {
      timeoutId = setTimeout(run, delayMs);
    };

    const run = async () => {
      if (cancelled) return;

      const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      if (isHidden) {
        schedule(options.hiddenMs);
        return;
      }

      const ok = await pollRef.current().catch(() => false);
      if (cancelled) return;
      failuresRef.current = ok ? 0 : Math.min(failuresRef.current + 1, 4);
      const nextDelay = Math.min(options.baseMs * 2 ** failuresRef.current, options.maxMs);
      schedule(nextDelay);
    };

    schedule(options.initialMs);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [enabled, options.baseMs, options.hiddenMs, options.initialMs, options.maxMs]);
}

export default function ChatWidget() {
  const { user } = useAuth();
  const { conversationToOpen, clearConversationToOpen } = useChat();
  const { t } = useLanguage();
  const { showToast, confirm } = useGlobalUI();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextMessageCursor, setNextMessageCursor] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [dmBannerDismissed, setDmBannerDismissed] = useState(false);
  const [discordDmEnabled, setDiscordDmEnabled] = useState(false);
  const [togglingDm, setTogglingDm] = useState(false);
  const [showGuestRestriction, setShowGuestRestriction] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const skipNextAutoScrollRef = useRef(false);

  const formatRelativeTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('chat.now');
    if (diffMins < 60) return t('chat.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('chat.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('chat.daysAgo', { count: diffDays });
    return date.toLocaleDateString();
  }, [t]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const currentUserProfileIconId = user?.profileIconId || undefined;

  // Scroll to bottom of messages - more robust for different browsers
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    // Try multiple methods for cross-browser compatibility
    const scrollWithDelay = () => {
      // Method 1: Direct scrollTop on container (most reliable)
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      
      // Method 2: scrollIntoView as fallback
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
      }
    };

    // Use requestAnimationFrame for Opera GX and other browsers
    requestAnimationFrame(() => {
      scrollWithDelay();
      // Double-check after a small delay
      setTimeout(scrollWithDelay, 50);
    });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      return;
    }

    // Multiple attempts with increasing delays for reliability
    const timeout1 = setTimeout(() => scrollToBottom(), 50);
    const timeout2 = setTimeout(() => scrollToBottom('auto'), 150);
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [messages]);

  // Force instant scroll when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      // Multiple scroll attempts for conversation switching
      const timeout1 = setTimeout(() => scrollToBottom('auto'), 100);
      const timeout2 = setTimeout(() => scrollToBottom('auto'), 250);
      const timeout3 = setTimeout(() => scrollToBottom('auto'), 400);
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
      };
    }
  }, [selectedConversation]);

  useAdaptivePolling(Boolean(user), async () => {
    const headers = getAuthHeader();
    if (!headers || !('Authorization' in headers)) return false;

    const res = await fetch(`${API_URL}/api/chat/unread-count`, { headers });
    if (res.ok) {
      const data = await res.json();
      setUnreadCount(data.unreadCount);
      return true;
    }

    return res.status === 401;
  }, { initialMs: 500, baseMs: 15000, hiddenMs: 60000, maxMs: 60000 });

  // Load DM banner dismiss state and Discord DM notification preference
  useEffect(() => {
    if (!user) return;
    const dismissed = localStorage.getItem('riftessence_dm_banner_dismissed');
    if (dismissed === 'true') setDmBannerDismissed(true);

    // Fetch current DM notification state from profile
    const fetchDmState = async () => {
      try {
        const headers = getAuthHeader();
        if (!headers || !('Authorization' in headers)) return;
        const res = await fetch(`${API_URL}/api/user/profile`, { headers });
        if (res.ok) {
          const data = await res.json();
          setDiscordDmEnabled(data.discordDmNotifications || false);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchDmState();
  }, [user]);

  // Fetch conversations when widget opens
  useEffect(() => {
    if (isOpen && user) {
      fetchConversations();
    }
  }, [isOpen, user]);

  useAdaptivePolling(Boolean(isOpen && user), async () => {
    const headers = getAuthHeader();
    if (!headers || !('Authorization' in headers)) return false;

    const res = await fetch(`${API_URL}/api/chat/conversations`, { headers });
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
      return true;
    }

    return false;
  }, { initialMs: 8000, baseMs: 8000, hiddenMs: 60000, maxMs: 45000 });

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      setMessages([]);
      setHasMoreMessages(false);
      setNextMessageCursor(null);
      setActionsOpen(false);
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useAdaptivePolling(Boolean(selectedConversation && user), async () => {
    if (!selectedConversation) return false;

    await fetchMessages(selectedConversation.id, 'replace', { silent: true });
    return true;
  }, { initialMs: 4000, baseMs: 4000, hiddenMs: 60000, maxMs: 30000 });

  // Wrap openConversationWithUser in useCallback to prevent stale closures
  const openConversationWithUser = useCallback(async (userId: string) => {
    try {
      const headers = getAuthHeader();
      // Don't attempt if no auth token available
      if (!headers || !('Authorization' in headers)) {
        return;
      }
      
      // Create or get conversation with this user
      const res = await fetch(`${API_URL}/api/chat/conversations/with/${userId}`, {
        method: 'POST',
        headers,
      });
      
      if (res.ok) {
        const data = await res.json();
        // Open chat
        setIsOpen(true);
        // Fetch conversations to get the full conversation object with otherUser data
        const convRes = await fetch(`${API_URL}/api/chat/conversations`, {
          headers: getAuthHeader(),
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          setConversations(convData.conversations);
          // Find and select the conversation
          const conv = convData.conversations.find(
            (c: Conversation) => c.otherUser.id === userId
          );
          if (conv) {
            setSelectedConversation(conv);
          }
        }
      }
    } catch (err) {
      showToast(t('chat.openFailed'), 'error');
    }
  }, [showToast, t]);

  // Handle external requests to open conversations
  useEffect(() => {
    if (conversationToOpen && user) {
      // Small delay to ensure auth token is fully set
      const timeout = setTimeout(() => {
        openConversationWithUser(conversationToOpen.userId);
        clearConversationToOpen();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [conversationToOpen, user, openConversationWithUser, clearConversationToOpen]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/conversations`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const markConversationRead = async (conversationId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        setConversations((current) => current.map((conv) => (
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )));
        setUnreadCount((count) => Math.max(count - (selectedConversation?.unreadCount || 0), 0));
      }
    } catch (err) {
      // Read receipts are best-effort; the next poll will recover.
    }
  };

  const fetchMessages = async (
    conversationId: string,
    mode: 'replace' | 'older' = 'replace',
    options: { silent?: boolean } = {}
  ) => {
    const isOlder = mode === 'older';
    const cursor = isOlder ? nextMessageCursor : null;
    if (isOlder && (!cursor || loadingOlder)) return;

    if (isOlder) {
      setLoadingOlder(true);
    } else if (!options.silent) {
      setLoading(true);
    }

    const previousScrollHeight = messagesContainerRef.current?.scrollHeight || 0;
    try {
      const params = new URLSearchParams({ limit: String(MESSAGE_PAGE_SIZE) });
      if (cursor) params.set('before', cursor);

      const res = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages?${params.toString()}`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setHasMoreMessages(Boolean(data.pagination?.hasMore));
        setNextMessageCursor(data.pagination?.nextCursor || null);

        if (isOlder) {
          skipNextAutoScrollRef.current = true;
          setMessages((current) => {
            const seen = new Set(current.map((msg) => msg.id));
            const olderMessages = (data.messages || []).filter((msg: Message) => !seen.has(msg.id));
            return [...olderMessages, ...current];
          });
          requestAnimationFrame(() => {
            const container = messagesContainerRef.current;
            if (!container) return;
            container.scrollTop = container.scrollHeight - previousScrollHeight + container.scrollTop;
          });
        } else {
          setMessages((current) => {
            const serverMessages: Message[] = data.messages || [];
            const serverIds = new Set(serverMessages.map((msg) => msg.id));
            const pendingMessages = current.filter((msg) => msg.status && !serverIds.has(msg.id));
            return [...serverMessages, ...pendingMessages];
          });
          await markConversationRead(conversationId);
        }

        // Update conversations to reflect read status
        await fetchConversations();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      if (isOlder) {
        setLoadingOlder(false);
      } else if (!options.silent) {
        setLoading(false);
      }
    }
  };

  const sendMessageContent = async (content: string, retryMessageId?: string) => {
    if (!content.trim() || !selectedConversation || !user) return;

    const trimmedContent = content.trim();
    const tempId = retryMessageId || `temp-${Date.now()}`;
    setSendingMessage(true);
    if (retryMessageId) {
      setMessages((current) => current.map((msg) => (
        msg.id === retryMessageId ? { ...msg, status: 'sending' } : msg
      )));
    } else {
      const optimisticMessage: Message = {
        id: tempId,
        content: trimmedContent,
        senderId: user.id,
        createdAt: new Date().toISOString(),
        status: 'sending',
        sender: {
          id: user.id,
          username: user.username,
          profileIconId: currentUserProfileIconId,
        },
      };
      setMessages((current) => [...current, optimisticMessage]);
      setMessageInput('');
    }

    try {
      const res = await fetch(`${API_URL}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          recipientId: selectedConversation.otherUser.id,
          content: trimmedContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((current) => {
          let replaced = false;
          const next = current.map((msg) => {
            if (msg.id !== tempId) return msg;
            replaced = true;
            return data.message;
          });
          return replaced ? next : [...next, data.message];
        });
        await fetchConversations(); // Refresh conversation list
      } else {
        const data = await res.json().catch(() => ({}));
        setMessages((current) => current.map((msg) => (
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        )));
        showToast(data.error || t('chat.sendFailed'), 'error');
      }
    } catch (err) {
      setMessages((current) => current.map((msg) => (
        msg.id === tempId ? { ...msg, status: 'failed' } : msg
      )));
      showToast(t('chat.sendFailed'), 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageContent(messageInput);
  };

  const handleEnableDiscordDm = async () => {
    setTogglingDm(true);
    try {
      const res = await fetch(`${API_URL}/api/user/discord-dm-notifications`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ enabled: true }),
      });
      if (res.ok) {
        setDiscordDmEnabled(true);
        setDmBannerDismissed(true);
        localStorage.setItem('riftessence_dm_banner_dismissed', 'true');
      }
    } catch (err) {
      console.error('Error enabling Discord DM notifications:', err);
    } finally {
      setTogglingDm(false);
    }
  };

  const handleDismissBanner = () => {
    setDmBannerDismissed(true);
    localStorage.setItem('riftessence_dm_banner_dismissed', 'true');
  };

  const handleRetryMessage = (message: Message) => {
    if (message.status !== 'failed') return;
    sendMessageContent(message.content, message.id);
  };

  const handleSubmitReport = async (reason: string) => {
    if (!selectedConversation) return;

    try {
      const res = await fetch(`${API_URL}/api/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        credentials: 'include',
        body: JSON.stringify({
          reportedUserId: selectedConversation.otherUser.id,
          reason,
        }),
      });

      if (res.ok) {
        showToast(t('chat.reportSubmitted'), 'success');
        setShowReportModal(false);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || t('chat.reportFailed'), 'error');
      }
    } catch (err) {
      showToast(t('chat.reportFailed'), 'error');
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConversation) return;

    const confirmed = await confirm({
      title: t('chat.blockUser'),
      message: t('chat.blockConfirm', { username: selectedConversation.otherUser.username }),
      confirmText: t('chat.block'),
      cancelText: t('common.cancel'),
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/user/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: selectedConversation.otherUser.id }),
      });

      if (res.ok || res.status === 400) {
        showToast(t('chat.blockedUser', { username: selectedConversation.otherUser.username }), 'success');
        setConversations((current) => current.filter((conv) => conv.id !== selectedConversation.id));
        setMessages([]);
        setSelectedConversation(null);
        setActionsOpen(false);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || t('chat.blockFailed'), 'error');
      }
    } catch (err) {
      showToast(t('chat.blockFailed'), 'error');
    }
  };

  // Show banner if: user has Discord linked, hasn't enabled DM notifications, and hasn't dismissed
  const showDmBanner = user?.discordLinked && !discordDmEnabled && !dmBannerDismissed;

  return (
    <>
      {/* Floating chat button (bottom right corner, League of Legends style) */}
      <button
        onClick={() => {
          if (!user) {
            setShowGuestRestriction(true);
            return;
          }
          setIsOpen(!isOpen);
        }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 ${unreadCount > 0 ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: 'var(--color-accent-1)',
          color: 'var(--color-bg-primary)',
          boxShadow: unreadCount > 0 
            ? '0 0 20px var(--color-accent-1), 0 4px 6px rgba(0, 0, 0, 0.3)' 
            : '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}
        title={t('chat.messages')}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-error)',
              color: 'white',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat window */}
      {isOpen && user && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 h-[100dvh] w-full rounded-none shadow-2xl flex flex-col overflow-hidden sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[500px] sm:w-96 sm:rounded-lg"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            border: '2px solid',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderBottom: '2px solid var(--color-border)',
            }}
          >
            {selectedConversation ? (
              <div className="flex items-center gap-3 flex-1">
                <UserAvatar 
                  profileIconId={selectedConversation.otherUser.profileIconId} 
                  username={selectedConversation.otherUser.username}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className="font-bold text-base truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {selectedConversation.otherUser.username}
                    </h3>
                    {selectedConversation.otherUser.verified && (
                      <span style={{ color: 'var(--color-accent-1)' }} title={t('common.verified')}>
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RankBadge rank={selectedConversation.otherUser.rank} />
                    {selectedConversation.otherUser.region && (
                      <span 
                        className="text-xs px-1.5 py-0.5 rounded border"
                        style={{ 
                          color: 'var(--color-text-secondary)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        {selectedConversation.otherUser.region}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <h3
                className="font-bold text-lg"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('chat.messages')}
              </h3>
            )}
            <div className="flex items-center gap-1">
              {selectedConversation && (
                <div className="relative">
                  <button
                    onClick={() => setActionsOpen((open) => !open)}
                    className="w-8 h-8 rounded-md flex items-center justify-center transition-all"
                    style={{
                      color: 'var(--color-text-primary)',
                      backgroundColor: actionsOpen ? 'var(--color-bg-secondary)' : 'transparent',
                    }}
                    title={t('chat.conversationActions')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                    </svg>
                  </button>
                  {actionsOpen && (
                    <div
                      className="absolute right-0 top-10 z-10 w-44 overflow-hidden rounded-md border shadow-xl"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowReportModal(true);
                          setActionsOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {t('chat.reportUser')}
                      </button>
                      <button
                        type="button"
                        onClick={handleBlockUser}
                        className="w-full px-3 py-2 text-left text-sm transition-colors"
                        style={{ color: 'var(--color-error)' }}
                      >
                        {t('chat.blockUser')}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {selectedConversation && (
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    setActionsOpen(false);
                  }}
                  className="w-8 h-8 rounded-md flex items-center justify-center transition-all"
                  style={{ 
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.backgroundColor = 'transparent'; 
                  }}
                  title={t('chat.backToConversations')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-md flex items-center justify-center transition-all"
                style={{ 
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.backgroundColor = 'transparent'; 
                }}
                title={t('common.close')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          {!selectedConversation ? (
            /* Conversations list */
            <div className="flex-1 overflow-y-auto">
              {/* Discord DM Notification Banner */}
              {showDmBanner && (
                <div 
                  className="mx-3 mt-3 mb-2 p-3 rounded-lg relative"
                  style={{
                    background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.15), rgba(87, 242, 135, 0.10))',
                    border: '1px solid rgba(88, 101, 242, 0.3)',
                  }}
                >
                  <button
                    onClick={handleDismissBanner}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--color-text-muted)' }}
                    title={t('common.dismiss')}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex items-start gap-2.5 pr-4">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z"/>
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                        {t('chat.discordDmTitle')}
                      </p>
                      <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        {t('chat.discordDmDescription')}
                      </p>
                      <button
                        onClick={handleEnableDiscordDm}
                        disabled={togglingDm}
                        className="text-xs font-bold px-3 py-1.5 rounded-md transition-all hover:scale-105 disabled:opacity-50"
                        style={{
                          background: 'linear-gradient(to right, #5865F2, #57F287)',
                          color: '#fff',
                        }}
                      >
                        {togglingDm ? t('chat.enabling') : t('chat.enableDiscordDms')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {conversations.length === 0 ? (
                <div
                  className="flex items-center justify-center h-full text-center px-4"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <div>
                    <svg
                      className="w-12 h-12 mx-auto mb-2 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <p className="text-sm">{t('chat.noConversations')}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {t('chat.startFromProfile')}
                    </p>
                  </div>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className="w-full px-4 py-3 flex items-start gap-3 transition-all duration-200 border-b hover:scale-[1.02]"
                    style={{
                      backgroundColor: conv.unreadCount > 0 
                        ? 'rgba(200, 170, 110, 0.1)' 
                        : 'transparent',
                      borderColor: 'var(--color-border)',
                      boxShadow: conv.unreadCount > 0 
                        ? '0 0 10px rgba(200, 170, 110, 0.2)' 
                        : 'none',
                    }}
                  >
                    <UserAvatar 
                      profileIconId={conv.otherUser.profileIconId} 
                      username={conv.otherUser.username}
                      size="md"
                    />
                    
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-semibold text-sm truncate"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {conv.otherUser.username}
                        </span>
                        {conv.otherUser.verified && (
                          <span 
                            style={{ color: 'var(--color-accent-1)' }} 
                            title={t('common.verified')}
                            className="flex-shrink-0"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1.5">
                        <RankBadge rank={conv.otherUser.rank} />
                        {conv.otherUser.region && (
                          <span 
                            className="text-xs px-1.5 py-0.5 rounded border"
                            style={{ 
                              color: 'var(--color-text-secondary)',
                              borderColor: 'var(--color-border)'
                            }}
                          >
                            {conv.otherUser.region}
                          </span>
                        )}
                      </div>
                      
                      <p
                        className="text-xs truncate"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {conv.lastMessagePreview || t('chat.noMessagesYet')}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span
                          className="px-2 py-0.5 text-xs rounded-full font-bold"
                          style={{
                            backgroundColor: 'var(--color-accent-1)',
                            color: 'var(--color-bg-primary)',
                            boxShadow: '0 0 8px var(--color-accent-1)',
                          }}
                        >
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Messages view */
            <>
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent-1)' }}></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div
                    className="flex items-center justify-center h-full text-center"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <p className="text-sm">{t('chat.startConversation')}</p>
                  </div>
                ) : (
                  <>
                    {hasMoreMessages && (
                      <div className="flex justify-center pb-1">
                        <button
                          type="button"
                          onClick={() => selectedConversation && fetchMessages(selectedConversation.id, 'older')}
                          disabled={loadingOlder}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold border disabled:opacity-60"
                          style={{
                            color: 'var(--color-text-secondary)',
                            borderColor: 'var(--color-border)',
                            backgroundColor: 'var(--color-bg-tertiary)',
                          }}
                        >
                          {loadingOlder ? t('chat.loadingOlder') : t('chat.loadOlder')}
                        </button>
                      </div>
                    )}
                    {messages.map((msg) => {
                      const isOwnMessage = msg.senderId === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} items-start`}
                        >
                          {!isOwnMessage && (
                            <div className="flex-shrink-0">
                              <UserAvatar
                                profileIconId={msg.sender.profileIconId}
                                username={msg.sender.username}
                                size="sm"
                              />
                            </div>
                          )}

                          <div
                            className={`flex flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}
                            style={{ maxWidth: isOwnMessage ? '85%' : 'calc(85% - 40px)' }}
                          >
                            {!isOwnMessage && (
                              <span
                                className="text-xs font-medium px-1"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                {msg.sender.username}
                              </span>
                            )}

                            <div
                              className="rounded-lg px-3 py-2 w-full"
                              style={{
                                backgroundColor: msg.status === 'failed'
                                  ? 'rgba(239, 68, 68, 0.14)'
                                  : isOwnMessage
                                    ? 'var(--color-accent-1)'
                                    : 'var(--color-bg-tertiary)',
                                border: msg.status === 'failed' ? '1px solid var(--color-error)' : '1px solid transparent',
                                color: isOwnMessage && msg.status !== 'failed'
                                  ? 'var(--color-bg-primary)'
                                  : 'var(--color-text-primary)',
                                boxShadow: isOwnMessage
                                  ? '0 2px 4px rgba(0, 0, 0, 0.2)'
                                  : '0 1px 2px rgba(0, 0, 0, 0.1)',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                              }}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <div className="mt-1 flex items-center justify-between gap-2 text-xs opacity-75">
                                <span>
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {msg.status === 'sending' && <span>{t('chat.sending')}</span>}
                                {msg.status === 'failed' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRetryMessage(msg)}
                                    className="font-semibold underline"
                                  >
                                    {t('chat.retry')}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {isOwnMessage && (
                            <div className="flex-shrink-0 w-8" />
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <form
                onSubmit={sendMessage}
                className="p-4 border-t"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessageContent(messageInput);
                      }
                    }}
                    placeholder={t('chat.typeMessage')}
                    className="max-h-28 min-h-[40px] flex-1 resize-none rounded px-3 py-2 text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid',
                    }}
                    maxLength={2000}
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || sendingMessage}
                    className="h-10 px-4 py-2 rounded font-semibold text-sm transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-accent-1)',
                      color: 'var(--color-bg-primary)',
                    }}
                  >
                    {sendingMessage ? t('chat.sending') : t('chat.send')}
                  </button>
                </div>
                <div className="mt-1 flex justify-between text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  <span>{t('chat.shiftEnterHint')}</span>
                  <span>{messageInput.length}/2000</span>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {showGuestRestriction && (
        <AccessRequirementModal
          type="account-required"
          reason={t('chat.accountRequired')}
          onClose={() => setShowGuestRestriction(false)}
        />
      )}

      {selectedConversation && (
        <ReportModal
          username={selectedConversation.otherUser.username}
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleSubmitReport}
        />
      )}
    </>
  );
}
