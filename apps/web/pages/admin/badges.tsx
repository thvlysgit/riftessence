// Badge Management Admin Page
// Simple UI to assign/remove badges from users
// Protected - requires admin badge

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

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
  badges: string[];
};

export default function BadgeManagementPage() {
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadgeKey, setSelectedBadgeKey] = useState('');
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [editingBadgeKey, setEditingBadgeKey] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');

  // Check admin status on mount
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const userId = localStorage.getItem('lfd_userId');
        if (!userId) {
          setIsAdmin(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/user/check-admin?userId=${encodeURIComponent(userId)}`);
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
    checkAdminStatus();
  }, [router]);

  // Load available badges
  useEffect(() => {
    if (isAdmin === true) {
      loadBadges();
    }
  }, [isAdmin]);

  async function loadBadges() {
    try {
      const res = await fetch(`${API_URL}/api/user/badges`);
      const data = await res.json();
      setBadges(data.badges || []);
    } catch (err) {
      console.error('Failed to load badges:', err);
    }
  }

  // Load user profile by ID or username
  const loadUser = async () => {
    if (!searchQuery.trim()) {
      setMessage('Please enter a user ID or username');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      // Try as username first, then as ID
      let res = await fetch(`${API_URL}/api/user/profile?username=${encodeURIComponent(searchQuery)}`);
      
      // If not found by username and looks like an ID, try by ID
      if (!res.ok && searchQuery.length > 20) {
        res = await fetch(`${API_URL}/api/user/profile?userId=${encodeURIComponent(searchQuery)}`);
      }

      if (!res.ok) {
        setMessage('❌ User not found');
        setCurrentUser(null);
        return;
      }
      
      const data = await res.json();
      setCurrentUser({
        id: data.id,
        username: data.username,
        badges: data.badges || [],
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, badgeKey: selectedBadgeKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        await loadUser(); // Reload user to see updated badges
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, badgeKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        await loadUser();
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
      const userId = localStorage.getItem('lfd_userId');
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
      <div className="min-h-screen bg-[#0B0D12] flex items-center justify-center">
        <div className="text-[#C8AA6E] text-xl">Loading...</div>
      </div>
    );
  }

  // If not admin, show nothing (will redirect to 404)
  if (isAdmin === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0B0D12] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#C8AA6E] mb-6">Badge Management</h1>

        {/* User Search */}
        <div className="bg-[#1A1A1D] border border-[#2B2B2F] rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-[#C8AA6E] mb-4">Find User</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Username or User ID"
              className="flex-1 px-4 py-2 bg-[#2B2B2F] border border-[#2B2B2F] text-gray-200 rounded-lg focus:border-[#C8AA6E] focus:outline-none"
            />
            <button
              onClick={loadUser}
              disabled={loading}
              className="px-6 py-2 bg-[#C8AA6E] text-[#1A1A1D] rounded-lg font-semibold hover:bg-[#D4B678] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Load User'}
            </button>
          </div>
          
          {currentUser && (
            <div className="mt-4 p-4 bg-[#2B2B2F] rounded-lg">
              <p className="text-gray-200 font-semibold">Username: {currentUser.username}</p>
              <p className="text-gray-400 text-sm mt-1">ID: {currentUser.id}</p>
              <div className="mt-3">
                <p className="text-gray-400 text-sm mb-2">Current Badges:</p>
                <div className="flex flex-wrap gap-2">
                  {currentUser.badges.length === 0 ? (
                    <span className="text-gray-500 text-sm">No badges</span>
                  ) : (
                    currentUser.badges.map((badgeName) => (
                      <div
                        key={badgeName}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#C8AA6E]/20 border border-[#C8AA6E] rounded-lg"
                      >
                        <span className="text-[#C8AA6E] text-sm font-medium">{badgeName}</span>
                        <button
                          onClick={() => {
                            const badge = badges.find(b => b.name === badgeName);
                            if (badge) removeBadge(badge.key);
                          }}
                          className="text-red-400 hover:text-red-300 text-xs"
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
        <div className="bg-[#1A1A1D] border border-[#2B2B2F] rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-[#C8AA6E] mb-4">Assign Badge</h2>
          <div className="flex gap-3">
            <select
              value={selectedBadgeKey}
              onChange={(e) => setSelectedBadgeKey(e.target.value)}
              className="flex-1 px-4 py-2 bg-[#2B2B2F] border border-[#2B2B2F] text-gray-200 rounded-lg focus:border-[#C8AA6E] focus:outline-none"
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
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Assign
            </button>
          </div>
        </div>

        {/* Available Badges List */}
        <div className="bg-[#1A1A1D] border border-[#2B2B2F] rounded-xl p-6">
          <h2 className="text-xl font-bold text-[#C8AA6E] mb-4">Available Badges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.key}
                className="p-4 bg-[#2B2B2F] rounded-lg border border-[#2B2B2F] hover:border-[#C8AA6E]/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[#C8AA6E] font-semibold">{badge.name}</p>
                    <p className="text-gray-400 text-sm mt-1">Key: {badge.key}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingBadgeKey(badge.key);
                      setEditingDescription(badge.description || '');
                    }}
                    className="text-blue-400 hover:text-blue-300 text-sm"
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
                      className="w-full px-3 py-2 bg-[#1A1A1D] border border-[#C8AA6E] text-gray-200 rounded-lg focus:outline-none text-sm resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => updateBadgeDescription(badge.key, editingDescription)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingBadgeKey(null)}
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  badge.description && (
                    <p className="text-gray-500 text-xs mt-1">{badge.description}</p>
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
            message.startsWith('✅') 
              ? 'bg-green-500/20 border border-green-500 text-green-300'
              : 'bg-red-500/20 border border-red-500 text-red-300'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
