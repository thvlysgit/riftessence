// Enhanced Badge Management Admin Page
// Create, edit, delete badges with full styling control
// Assign/remove badges from users
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
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverBg: string;
  _count?: { users: number };
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

const COMMON_EMOJIS = ['🏆', '🛡️', '⚡', '👑', '🌟', '💎', '🔥', '⭐', '✨', '🎯', '🎖️', '🥇', '🥈', '🥉', '🏅', '💪', '🚀', '💫'];

export default function BadgeManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'badges' | 'users'>('badges');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Badge Editor State
  const [showBadgeEditor, setShowBadgeEditor] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [badgeForm, setBadgeForm] = useState({
    key: '',
    name: '',
    description: '',
    icon: '🏆',
    bgColor: 'rgba(96, 165, 250, 0.20)',
    borderColor: '#60A5FA',
    textColor: '#93C5FD',
    hoverBg: 'rgba(96, 165, 250, 0.30)',
  });

  // User Assignment State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedBadgeKey, setSelectedBadgeKey] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check admin status
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

  // Load badges
  useEffect(() => {
    if (isAdmin === true) {
      loadBadges();
    }
  }, [isAdmin]);

  const loadBadges = async () => {
    try {
      const res = await fetch(`${API_URL}/api/badges`);
      const data = await res.json();
      setBadges(data.badges || []);
    } catch (err) {
      console.error('Failed to load badges:', err);
    }
  };

  // Search users (debounced)
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/user/search?q=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users || []);
          setShowSearchResults(true);
        }
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);

    setSearchTimeout(timeout);
  };

  const loadUserFromResult = async (userId: string, username: string) => {
    try {
      const res = await fetch(`${API_URL}/api/user/profile?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setCurrentUser({
        id: data.id,
        username: data.username,
        badges: data.badges || [],
      });
      setSearchQuery(username);
      setShowSearchResults(false);
    } catch (err) {
      console.error('Failed to load user:', err);
    }
  };

  // Badge CRUD Operations
  const openBadgeEditor = (badge?: Badge) => {
    if (badge) {
      setEditingBadge(badge);
      setBadgeForm({
        key: badge.key,
        name: badge.name,
        description: badge.description || '',
        icon: badge.icon,
        bgColor: badge.bgColor,
        borderColor: badge.borderColor,
        textColor: badge.textColor,
        hoverBg: badge.hoverBg,
      });
    } else {
      setEditingBadge(null);
      setBadgeForm({
        key: '',
        name: '',
        description: '',
       icon: '🏆',
        bgColor: 'rgba(96, 165, 250, 0.20)',
        borderColor: '#60A5FA',
        textColor: '#93C5FD',
        hoverBg: 'rgba(96, 165, 250, 0.30)',
      });
    }
    setShowBadgeEditor(true);
  };

  const closeBadgeEditor = () => {
    setShowBadgeEditor(false);
    setEditingBadge(null);
    setBadgeForm({
      key: '',
      name: '',
      description: '',
      icon: '🏆',
      bgColor: 'rgba(96, 165, 250, 0.20)',
      borderColor: '#60A5FA',
      textColor: '#93C5FD',
      hoverBg: 'rgba(96, 165, 250, 0.30)',
    });
  };

  const saveBadge = async () => {
    if (!badgeForm.name || !badgeForm.key) {
      setMessage('❌ Name and key are required');
      return;
    }

    setLoading(true);
    try {
      const url = editingBadge 
        ? `${API_URL}/api/badges/${editingBadge.id}`
        : `${API_URL}/api/badges`;
      
      const method = editingBadge ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(badgeForm),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        await loadBadges();
        closeBadgeEditor();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Error saving badge');
    } finally {
      setLoading(false);
    }
  };

  const deleteBadge = async (badgeId: string) => {
    if (!confirm('Are you sure you want to delete this badge? This will remove it from all users.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/badges/${badgeId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        await loadBadges();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Error deleting badge');
    } finally {
      setLoading(false);
    }
  };

  // User Badge Assignment
  const assignBadge = async () => {
    if (!currentUser || !selectedBadgeKey) return;
    
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
        await loadUserFromResult(currentUser.id, currentUser.username);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Error assigning badge');
    } finally {
      setLoading(false);
    }
  };

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

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--color-accent-1)' }}>Loading...</div>
      </div>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--color-accent-1)' }}>Badge Management</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'badges' ? 'border-b-2' : ''
            }`}
            style={{
              color: activeTab === 'badges' ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
              borderColor: activeTab === 'badges' ? 'var(--color-accent-1)' : 'transparent',
            }}
          >
            Badge Editor
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'users' ? 'border-b-2' : ''
            }`}
            style={{
              color: activeTab === 'users' ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
              borderColor: activeTab === 'users' ? 'var(--color-accent-1)' : 'transparent',
            }}
          >
            Assign to Users
          </button>
        </div>

        {/* Badge Editor Tab */}
        {activeTab === 'badges' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-accent-1)' }}>All Badges ({badges.length})</h2>
              <button
                onClick={() => openBadgeEditor()}
                className="px-6 py-2 rounded-lg font-semibold transition-colors"
                style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
              >
                + Create Badge
              </button>
            </div>

            {/* Badge Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="border rounded-xl p-5"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
                >
                  {/* Badge Preview */}
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl"
                      style={{
                        background: badge.bgColor,
                        borderColor: badge.borderColor,
                        color: badge.textColor,
                      }}
                    >
                      {badge.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {badge.name}
                      </h3>
                      <p className="text-xs opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                        {badge.key}
                      </p>
                      {badge._count && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-accent-2)' }}>
                          {badge._count.users} user{badge._count.users !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {badge.description && (
                    <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                      {badge.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openBadgeEditor(badge)}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-accent-1)' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteBadge(badge.id)}
                      disabled={loading}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Assignment Tab */}
        {activeTab === 'users' && (
          <div>
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
            <div className="border rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Assign Badge</h2>
              <div className="flex gap-3">
                <select
                  value={selectedBadgeKey}
                  onChange={(e) => setSelectedBadgeKey(e.target.value)}
                  disabled={!currentUser}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">Select a badge...</option>
                  {badges.map((badge) => (
                    <option key={badge.key} value={badge.key}>
                      {badge.icon} {badge.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={assignBadge}
                  disabled={loading || !currentUser || !selectedBadgeKey}
                  className="px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ backgroundColor: 'var(--color-success)', color: 'var(--color-text-primary)' }}
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}

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

      {/* Badge Editor Modal */}
      {showBadgeEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={closeBadgeEditor}>
          <div 
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl border-2 p-6"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-accent-1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-accent-1)' }}>
                {editingBadge ? 'Edit Badge' : 'Create New Badge'}
              </h2>
              <button
                onClick={closeBadgeEditor}
                className="text-2xl leading-none"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              {/* Key */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Key (unique identifier) *
                </label>
                <input
                  type="text"
                  value={badgeForm.key}
                  onChange={(e) => setBadgeForm({ ...badgeForm, key: e.target.value })}
                  disabled={!!editingBadge}
                  placeholder="admin, vip, supporter"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
                {editingBadge && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Key cannot be changed after creation</p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Name (display name) *
                </label>
                <input
                  type="text"
                  value={badgeForm.name}
                  onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                  placeholder="Admin, VIP, Supporter"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Description (optional)
                </label>
                <textarea
                  value={badgeForm.description}
                  onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                  placeholder="Tooltip description shown on hover..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none resize-none"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Icon
                </label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setBadgeForm({ ...badgeForm, icon: emoji })}
                      className={`w-12 h-12 text-2xl rounded-lg border-2 transition-colors ${
                        badgeForm.icon === emoji ? 'border-opacity-100' : 'border-opacity-30'
                      }`}
                      style={{
                        backgroundColor: badgeForm.icon === emoji ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-accent-1)',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={badgeForm.icon}
                  onChange={(e) => setBadgeForm({ ...badgeForm, icon: e.target.value })}
                  placeholder="Or paste any emoji"
                  maxLength={2}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none text-center text-2xl"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Background Color
                  </label>
                  <input
                    type="text"
                    value={badgeForm.bgColor}
                    onChange={(e) => setBadgeForm({ ...badgeForm, bgColor: e.target.value })}
                    placeholder="rgba(96, 165, 250, 0.20)"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none font-mono text-sm"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Border Color
                  </label>
                  <input
                    type="text"
                    value={badgeForm.borderColor}
                    onChange={(e) => setBadgeForm({ ...badgeForm, borderColor: e.target.value })}
                    placeholder="#60A5FA"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none font-mono text-sm"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Text/Icon Color
                  </label>
                  <input
                    type="text"
                    value={badgeForm.textColor}
                    onChange={(e) => setBadgeForm({ ...badgeForm, textColor: e.target.value })}
                    placeholder="#93C5FD"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none font-mono text-sm"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Hover Background
                  </label>
                  <input
                    type="text"
                    value={badgeForm.hoverBg}
                    onChange={(e) => setBadgeForm({ ...badgeForm, hoverBg: e.target.value })}
                    placeholder="rgba(96, 165, 250, 0.30)"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none font-mono text-sm"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Preview
                </label>
                <div className="p-6 rounded-lg flex justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                  <div
                    className="inline-flex items-center justify-center w-12 h-12 rounded-xl border-2 text-2xl"
                    style={{
                      background: badgeForm.bgColor,
                      borderColor: badgeForm.borderColor,
                      color: badgeForm.textColor,
                      boxShadow: `0 2px 10px 0 ${badgeForm.borderColor}33`
                    }}
                  >
                    {badgeForm.icon}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={saveBadge}
                disabled={loading || !badgeForm.name || !badgeForm.key}
                className="flex-1 px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: 'var(--color-success)', color: 'var(--color-text-primary)' }}
              >
                {loading ? 'Saving...' : editingBadge ? 'Update Badge' : 'Create Badge'}
              </button>
              <button
                onClick={closeBadgeEditor}
                disabled={loading}
                className="px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
