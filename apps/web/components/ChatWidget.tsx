import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { getAuthHeader } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
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
        src={`https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${profileIconId}.png`}
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

export default function ChatWidget() {
  const { user } = useAuth();
  const { conversationToOpen, clearConversationToOpen } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  // Fetch unread count periodically
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const headers = getAuthHeader();
        // Don't fetch if no auth token available
        if (!headers || !('Authorization' in headers)) {
          return;
        }
        
        const res = await fetch(`${API_URL}/api/chat/unread-count`, {
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount);
        } else if (res.status === 401) {
          // Silently ignore auth errors
          return;
        }
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    // Small delay before first fetch to ensure token is set
    const initialTimeout = setTimeout(fetchUnreadCount, 500);
    const interval = setInterval(fetchUnreadCount, 10000); // Poll every 10 seconds
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user]);

  // Fetch conversations when widget opens
  useEffect(() => {
    if (isOpen && user) {
      fetchConversations();
    }
  }, [isOpen, user]);

  // Poll for conversation updates when widget is open
  useEffect(() => {
    if (!isOpen || !user) return;

    const pollConversations = async () => {
      try {
        const headers = getAuthHeader();
        if (!headers || !('Authorization' in headers)) return;

        const res = await fetch(`${API_URL}/api/chat/conversations`, {
          headers,
        });
        
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations);
        }
      } catch (err) {
        console.error('Error polling conversations:', err);
      }
    };

    // Poll every 5 seconds for conversation list updates
    const interval = setInterval(pollConversations, 5000);
    return () => clearInterval(interval);
  }, [isOpen, user]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Poll for new messages in active conversation
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const pollMessages = async () => {
      try {
        const headers = getAuthHeader();
        if (!headers || !('Authorization' in headers)) return;

        const res = await fetch(`${API_URL}/api/chat/conversations/${selectedConversation.id}/messages`, {
          headers,
        });
        
        if (res.ok) {
          const data = await res.json();
          const newMessages = data.messages;
          
          // Only update if there are new messages (check length or last message ID)
          if (newMessages.length !== messages.length || 
              (newMessages.length > 0 && messages.length > 0 && 
               newMessages[newMessages.length - 1]?.id !== messages[messages.length - 1]?.id)) {
            setMessages(newMessages);
            // Update conversations to reflect read status
            await fetchConversations();
          }
        }
      } catch (err) {
        console.error('Error polling messages:', err);
      }
    };

    // Poll every 2 seconds for real-time feel
    const interval = setInterval(pollMessages, 2000);
    return () => clearInterval(interval);
  }, [selectedConversation, user, messages]);

  // Wrap openConversationWithUser in useCallback to prevent stale closures
  const openConversationWithUser = useCallback(async (userId: string) => {
    console.log('[ChatWidget] openConversationWithUser called for userId:', userId);
    try {
      const headers = getAuthHeader();
      // Don't attempt if no auth token available
      if (!headers || !('Authorization' in headers)) {
        console.warn('[ChatWidget] Cannot open conversation: not authenticated');
        return;
      }
      
      console.log('[ChatWidget] Creating/fetching conversation with user...');
      // Create or get conversation with this user
      const res = await fetch(`${API_URL}/api/chat/conversations/with/${userId}`, {
        method: 'POST',
        headers,
      });
      
      console.log('[ChatWidget] Conversation API response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[ChatWidget] Conversation created/fetched:', data);
        // Open chat
        setIsOpen(true);
        // Fetch conversations to get the full conversation object with otherUser data
        const convRes = await fetch(`${API_URL}/api/chat/conversations`, {
          headers: getAuthHeader(),
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          console.log('[ChatWidget] Fetched all conversations:', convData.conversations.length);
          setConversations(convData.conversations);
          // Find and select the conversation
          const conv = convData.conversations.find(
            (c: Conversation) => c.otherUser.id === userId
          );
          if (conv) {
            console.log('[ChatWidget] Selected conversation:', conv);
            setSelectedConversation(conv);
          } else {
            console.warn('[ChatWidget] Could not find conversation for userId:', userId);
          }
        } else {
          console.error('[ChatWidget] Failed to fetch conversations, status:', convRes.status);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('[ChatWidget] Failed to create/fetch conversation:', res.status, errorData);
      }
    } catch (err) {
      console.error('[ChatWidget] Error opening conversation:', err);
    }
  }, []); // Empty deps: uses only stable setState functions and imported utilities

  // Handle external requests to open conversations
  useEffect(() => {
    if (conversationToOpen && user) {
      console.log('[ChatWidget] conversationToOpen detected:', conversationToOpen);
      // Small delay to ensure auth token is fully set
      const timeout = setTimeout(() => {
        console.log('[ChatWidget] Opening conversation with userId:', conversationToOpen.userId);
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

  const fetchMessages = async (conversationId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        // Update conversations to reflect read status
        await fetchConversations();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    const content = messageInput.trim();
    setMessageInput('');

    try {
      const res = await fetch(`${API_URL}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          recipientId: selectedConversation.otherUser.id,
          content,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        await fetchConversations(); // Refresh conversation list
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating chat button (bottom right corner, League of Legends style) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 ${unreadCount > 0 ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: 'var(--color-accent-1)',
          color: 'var(--color-bg-primary)',
          boxShadow: unreadCount > 0 
            ? '0 0 20px var(--color-accent-1), 0 4px 6px rgba(0, 0, 0, 0.3)' 
            : '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}
        title="Messages"
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
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-96 h-[500px] rounded-lg shadow-2xl flex flex-col overflow-hidden"
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
                      <span style={{ color: 'var(--color-accent-1)' }} title="Verified">
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
                Messages
              </h3>
            )}
            <div className="flex items-center gap-1">
              {selectedConversation && (
                <button
                  onClick={() => setSelectedConversation(null)}
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
                  title="Back to conversations"
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
                title="Close"
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
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1 opacity-75">
                      Click the message button on someone's profile to start chatting
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
                            title="Verified"
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
                        {conv.lastMessagePreview || 'No messages yet'}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {getRelativeTime(conv.lastMessageAt)}
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
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
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
                              backgroundColor: isOwnMessage
                                ? 'var(--color-accent-1)'
                                : 'var(--color-bg-tertiary)',
                              color: isOwnMessage
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
                            <p
                              className="text-xs mt-1 opacity-75"
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        
                        {isOwnMessage && (
                          <div className="flex-shrink-0 w-8" />
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <form
                onSubmit={sendMessage}
                className="p-4 border-t"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid',
                    }}
                    maxLength={2000}
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="px-4 py-2 rounded font-semibold text-sm transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-accent-1)',
                      color: 'var(--color-bg-primary)',
                    }}
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
