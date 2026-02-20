// Badge Management Admin Page
// Simple UI to assign/remove badges from users
// Protected - requires admin badge

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken, getUserIdFromToken, getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Badge = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

type User = {
  id: string;
  username: string;
  badges: { key: string; name: string }[];
};

type SearchResult = {
  id: string;
  username: string;
  verified: boolean;
  badges: { key: string; name: string }[];
  profileIconId: number | null;
};

export default function BadgeManagementPage() {
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedBadgeKey, setSelectedBadgeKey] = useState('');
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [editingBadgeKey, setEditingBadgeKey] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check admin status on mount
  useEffect(() => {
    async function checkAdmin() {
      try {
        const token = getAuthToken();
        const userId = token ? getUserIdFromToken(token) : null;
        if (!userId) {
          setIsAdmin(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/user/check-admin?userId=${encodeURIComponent(userId)}`, {
          headers: getAuthHeader(),
        });
        const data = await res.json();
        
        if (!data.isAdmin) {
          setIsAdmin(false);
          // Redirect to 404 after a brief moment
          setTimeout(() => router.push('/404'), 100);
        } else {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Failed to check admin status:', err);
        setIsAdmin(false);
        router.push('/404');
      }
    }
    checkAdmin();
  }, [router]);

  // Load available badges
  useEffect(() => {
    if (isAdmin === true) {
      loadBadges();
    }
  }, [isAdmin]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside the search container
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };
    
    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchResults]);

  async function loadBadges() {
    try {
      const res = await fetch(`${API_URL}/api/user/badges`);
      const data = await res.json();
      setBadges(data.badges || []);
    } catch (err) {
      console.error('Failed to load badges:', err);
    }
  }

  // Search users as they type
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/user/search?q=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for search
    const timeout = setTimeout(() => {
      searchUsers(value);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  // Load user from search result
  const loadUserFromResult = async (userId: string, username: string) => {
    setLoading(true);
    setMessage('');
    setShowSearchResults(false);
    setSearchQuery(username);
    
    try {
      const res = await fetch(`${API_URL}/api/user/profile?userId=${encodeURIComponent(userId)}`);
      
      if (!res.ok) {
        setMessage('❌ User not found');
        setCurrentUser(null);
        return;
      }
      
      const data = await res.json();
      setCurrentUser({
        id: data.id,
        username: data.username,
        badges: data.badges ? data.badges.map((b: any) => ({ key: b.key, name: b.name })) : [],
      });
      setMessage('✅ User loaded');
    } catch (err) {
      setMessage('❌ Error loading user');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Assign badge to user
  const assignBadge = async () => {
    if (!currentUser || !selectedBadgeKey) {
      setMessage('❌ Select a badge and load a user first');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/user/assign-badge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ userId: currentUser.id, badgeKey: selectedBadgeKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        await loadUserFromResult(currentUser.id, currentUser.username); // Reload user to see updated badges
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Error assigning badge');
    } finally {
      setLoading(false);
    }
  };

  // Remove badge from user
  const removeBadge = async (badgeKey: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/user/remove-badge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ userId: currentUser.id, badgeKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        await loadUserFromResult(currentUser.id, currentUser.username);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Error removing badge');
    } finally {
      setLoading(false);
    }
  };

  // Update badge description
  const updateBadgeDescription = async (badgeKey: string, description: string) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const userId = token ? getUserIdFromToken(token) : null;
      const res = await fetch(`${API_URL}/api/user/badge/${encodeURIComponent(badgeKey)}?userId=${encodeURIComponent(userId || '')}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Badge description updated');
        await loadBadges();
        setEditingBadgeKey(null);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Error updating badge description');
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything while checking admin status
  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--color-accent-1)' }}>Loading...</div>
      </div>
    );
  }

  // If not admin, show nothing (will redirect to 404)
  if (isAdmin === false) {
    return null;
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--color-accent-1)' }}>Badge Management</h1>

        {/* User Search */}
        <div className="border rounded-xl p-6 mb-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Find User</h2>
          <div className="relative search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && searchResults.length > 0 && setShowSearchResults(true)}
              placeholder="Start typing username... (min 2 characters)"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div 
                className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-80 overflow-y-auto"
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
              >
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => loadUserFromResult(result.id, result.username)}
                    className="w-full px-4 py-3 text-left hover:opacity-80 transition-opacity border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {result.username}
                          {result.verified && <span className="ml-2 text-xs" style={{ color: 'var(--color-accent-2)' }}>✓ Verified</span>}
                        </p>
                        {result.badges.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {result.badges.map((badge) => (
                              <span 
                                key={badge.key}
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)', opacity: 0.8 }}
                              >
                                {badge.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {currentUser && (
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Username: {currentUser.username}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>ID: {currentUser.id}</p>
              <div className="mt-3">
                <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>Current Badges:</p>
                <div className="flex flex-wrap gap-2">
                  {currentUser.badges.length === 0 ? (
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No badges</span>
                  ) : (
                    currentUser.badges.map((badge) => (
                      <div
                        key={badge.key}
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-lg"
                        style={{ backgroundColor: 'rgba(var(--color-accent-1-rgb, 200, 170, 110), 0.2)', borderColor: 'var(--color-accent-1)' }}
                      >
                        <span className="text-sm font-medium" style={{ color: 'var(--color-accent-1)' }}>{badge.name}</span>
                        <button
                          onClick={() => removeBadge(badge.key)}
                          className="text-xs"
                          style={{ color: 'var(--color-error)' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assign Badge */}
        <div className="border rounded-xl p-6 mb-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Assign Badge</h2>
          <div className="flex gap-3">
            <select
              value={selectedBadgeKey}
              onChange={(e) => setSelectedBadgeKey(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <option value="">Select a badge...</option>
              {badges.map((badge) => (
                <option key={badge.key} value={badge.key}>
                  {badge.name} {badge.description && `- ${badge.description}`}
                </option>
              ))}
            </select>
            <button
              onClick={assignBadge}
              disabled={loading || !currentUser}
              className="px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: 'var(--color-success)', color: 'var(--color-text-primary)' }}
            >
              Assign
            </button>
          </div>
        </div>

        {/* Available Badges List */}
        <div className="border rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Available Badges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.key}
                className="p-4 rounded-lg border transition-colors"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--color-accent-1)' }}>{badge.name}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Key: {badge.key}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingBadgeKey(badge.key);
                      setEditingDescription(badge.description || '');
                    }}
                    className="text-sm"
                    style={{ color: 'var(--color-accent-2)' }}
                  >
                    Edit
                  </button>
                </div>
                
                {editingBadgeKey === badge.key ? (
                  <div className="mt-3">
                    <textarea
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      placeholder="Badge description..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none text-sm resize-none"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-accent-1)', color: 'var(--color-text-primary)' }}
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        key="save"
                        onClick={() => updateBadgeDescription(badge.key, editingDescription)}
                        disabled={loading}
                        className="px-3 py-1 text-sm rounded disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-success)', color: 'var(--color-text-primary)' }}
                      >
                        Save
                      </button>
                      <button
                        key="cancel"
                        onClick={() => setEditingBadgeKey(null)}
                        className="px-3 py-1 text-sm rounded"
                        style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  badge.description && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{badge.description}</p>
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg border`} style={{
            backgroundColor: message.startsWith('✅') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            borderColor: message.startsWith('✅') ? 'var(--color-success)' : 'var(--color-error)',
            color: message.startsWith('✅') ? 'var(--color-success)' : 'var(--color-error)'
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
