// Ads Management Admin Page
// Create, edit, and monitor advertising campaigns
// Protected - requires admin badge

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getAuthToken, getUserIdFromToken, getAuthHeader } from '../../utils/auth';
import { useGlobalUI } from '../../components/GlobalUI';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Ad = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  targetUrl: string;
  targetRegions: string[];
  targetMinRank: string | null;
  targetMaxRank: string | null;
  targetFeeds: string[];
  startDate: string;
  endDate: string;
  priority: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  impressionCount: number;
  clickCount: number;
  ctr: string;
};

type AdSettings = {
  duoFeedAdFrequency: number;
  lftFeedAdFrequency: number;
};

export default function AdsManagementPage() {
  const router = useRouter();
  const { showToast, confirm } = useGlobalUI();
  const [ads, setAds] = useState<Ad[]>([]);
  const [settings, setSettings] = useState<AdSettings>({ duoFeedAdFrequency: 5, lftFeedAdFrequency: 5 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    targetUrl: '',
    targetRegions: [] as string[],
    targetMinRank: '',
    targetMaxRank: '',
    targetFeeds: [] as string[],
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    priority: 0,
    isActive: true,
  });

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      try {
        const token = getAuthToken();
        const userId = token ? getUserIdFromToken(token) : null;
        if (!userId) {
          setIsAdmin(false);
          router.push('/404');
          return;
        }

        const res = await fetch(`${API_URL}/api/user/check-admin?userId=${encodeURIComponent(userId)}`, {
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
    checkAdmin();
  }, [router]);

  // Load ads and settings
  useEffect(() => {
    if (isAdmin === true) {
      loadAds();
      loadSettings();
    }
  }, [isAdmin]);

  async function loadAds() {
    try {
      const res = await fetch(`${API_URL}/api/ads/admin`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setAds(data.ads || []);
      }
    } catch (err) {
      console.error('Failed to load ads:', err);
      showToast('Failed to load ads', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch(`${API_URL}/api/ads/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  async function handleCreateAd() {
    if (!formData.title || !formData.imageUrl || !formData.targetUrl) {
      showToast('Title, image URL, and target URL are required', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/ads/admin`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast('Ad created successfully', 'success');
        setShowCreateModal(false);
        resetForm();
        loadAds();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to create ad', 'error');
      }
    } catch (err) {
      console.error('Failed to create ad:', err);
      showToast('Failed to create ad', 'error');
    }
  }

  async function handleUpdateAd() {
    if (!editingAd) return;

    try {
      const res = await fetch(`${API_URL}/api/ads/admin/${editingAd.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast('Ad updated successfully', 'success');
        setEditingAd(null);
        resetForm();
        loadAds();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to update ad', 'error');
      }
    } catch (err) {
      console.error('Failed to update ad:', err);
      showToast('Failed to update ad', 'error');
    }
  }

  async function handleDeleteAd(adId: string) {
    const ok = await confirm({
      title: 'Delete Ad',
      message: 'Are you sure you want to delete this ad? This action cannot be undone.',
      confirmText: 'Delete',
    });

    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/api/ads/admin/${adId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        showToast('Ad deleted successfully', 'success');
        loadAds();
      } else {
        showToast('Failed to delete ad', 'error');
      }
    } catch (err) {
      console.error('Failed to delete ad:', err);
      showToast('Failed to delete ad', 'error');
    }
  }

  async function handleToggleActive(ad: Ad) {
    try {
      const res = await fetch(`${API_URL}/api/ads/admin/${ad.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ad.isActive }),
      });

      if (res.ok) {
        showToast(`Ad ${!ad.isActive ? 'activated' : 'deactivated'}`, 'success');
        loadAds();
      } else {
        showToast('Failed to update ad status', 'error');
      }
    } catch (err) {
      console.error('Failed to toggle ad status:', err);
      showToast('Failed to update ad status', 'error');
    }
  }

  async function handleUpdateSettings() {
    try {
      const res = await fetch(`${API_URL}/api/ads/settings`, {
        method: 'PUT',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        showToast('Settings updated successfully', 'success');
      } else {
        showToast('Failed to update settings', 'error');
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      showToast('Failed to update settings', 'error');
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      targetUrl: '',
      targetRegions: [],
      targetMinRank: '',
      targetMaxRank: '',
      targetFeeds: [],
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      priority: 0,
      isActive: true,
    });
  }

  function openEditModal(ad: Ad) {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description || '',
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      targetRegions: ad.targetRegions,
      targetMinRank: ad.targetMinRank || '',
      targetMaxRank: ad.targetMaxRank || '',
      targetFeeds: ad.targetFeeds,
      startDate: new Date(ad.startDate).toISOString().slice(0, 16),
      endDate: new Date(ad.endDate).toISOString().slice(0, 16),
      priority: ad.priority,
      isActive: ad.isActive,
    });
  }

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent-1)' }}></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const regions = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
  const feeds = ['duo', 'lft'];

  return (
    <>
      <Head>
        <title>Ads Management | Admin Dashboard</title>
      </Head>

      <div className="min-h-screen py-8 px-4" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                📢 Ads Management
              </h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Create and manage advertising campaigns
              </p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg transition-colors"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
            >
              ← Back to Admin
            </Link>
          </div>

          {/* Settings Section */}
          <div className="mb-8 p-6 border rounded-xl" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              Display Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Duo Feed Frequency (show every N posts)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.duoFeedAdFrequency}
                  onChange={(e) => setSettings({ ...settings, duoFeedAdFrequency: parseInt(e.target.value) || 5 })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  LFT Feed Frequency (show every N posts)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.lftFeedAdFrequency}
                  onChange={(e) => setSettings({ ...settings, lftFeedAdFrequency: parseInt(e.target.value) || 5 })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                />
              </div>
            </div>
            <button
              onClick={handleUpdateSettings}
              className="mt-4 px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ background: 'var(--color-accent-1)', color: '#fff' }}
            >
              Save Settings
            </button>
          </div>

          {/* Create Ad Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-lg font-medium transition-colors"
              style={{ background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))', color: '#fff' }}
            >
              + Create New Ad
            </button>
          </div>

          {/* Ads List */}
          <div className="space-y-4">
            {ads.length === 0 ? (
              <div className="text-center py-12 border rounded-xl" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>No ads created yet</p>
              </div>
            ) : (
              ads.map((ad) => (
                <div
                  key={ad.id}
                  className="p-6 border rounded-xl"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    borderColor: ad.isActive ? 'var(--color-accent-1)' : 'var(--color-border)',
                    opacity: ad.isActive ? 1 : 0.6,
                  }}
                >
                  <div className="flex gap-6">
                    {/* Ad Preview */}
                    <div className="w-48 h-32 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--color-bg-tertiary)' }}>
                      <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                    </div>

                    {/* Ad Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {ad.title}
                          </h3>
                          {ad.description && (
                            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                              {ad.description}
                            </p>
                          )}
                        </div>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: ad.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: ad.isActive ? '#22C55E' : '#EF4444',
                          }}
                        >
                          {ad.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                            Impressions
                          </p>
                          <p className="text-lg font-bold" style={{ color: 'var(--color-accent-1)' }}>
                            {ad.impressionCount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                            Clicks
                          </p>
                          <p className="text-lg font-bold" style={{ color: 'var(--color-accent-1)' }}>
                            {ad.clickCount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                            CTR
                          </p>
                          <p className="text-lg font-bold" style={{ color: 'var(--color-accent-1)' }}>
                            {ad.ctr}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                            Priority
                          </p>
                          <p className="text-lg font-bold" style={{ color: 'var(--color-accent-1)' }}>
                            {ad.priority}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {ad.targetFeeds.length > 0 && (
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                            Feeds: {ad.targetFeeds.join(', ')}
                          </span>
                        )}
                        {ad.targetRegions.length > 0 && (
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                            Regions: {ad.targetRegions.join(', ')}
                          </span>
                        )}
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                          {new Date(ad.startDate).toLocaleDateString()} - {new Date(ad.endDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleToggleActive(ad)}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                        >
                          {ad.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEditModal(ad)}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{ background: 'var(--color-accent-1)', color: '#fff' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}
                        >
                          Delete
                        </button>
                        <a
                          href={ad.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                        >
                          Visit →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAd) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => { setShowCreateModal(false); setEditingAd(null); resetForm(); }}>
          <div
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 rounded-xl"
            style={{ background: 'var(--color-bg-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
              {editingAd ? 'Edit Ad' : 'Create New Ad'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                  placeholder="Ad title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                  placeholder="Ad description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Image URL *
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                  placeholder="https://example.com/image.jpg"
                />
                {formData.imageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden" style={{ maxHeight: '200px' }}>
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-auto object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Target URL *
                </label>
                <input
                  type="url"
                  value={formData.targetUrl}
                  onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    End Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Target Feeds (empty = all)
                </label>
                <div className="flex gap-4">
                  {feeds.map((feed) => (
                    <label key={feed} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.targetFeeds.includes(feed)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, targetFeeds: [...formData.targetFeeds, feed] });
                          } else {
                            setFormData({ ...formData, targetFeeds: formData.targetFeeds.filter((f) => f !== feed) });
                          }
                        }}
                      />
                      <span style={{ color: 'var(--color-text-primary)' }}>{feed}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Target Regions (empty = all)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {regions.map((region) => (
                    <label key={region} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.targetRegions.includes(region)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, targetRegions: [...formData.targetRegions, region] });
                          } else {
                            setFormData({ ...formData, targetRegions: formData.targetRegions.filter((r) => r !== region) });
                          }
                        }}
                      />
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{region}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Priority (higher = shown first)
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Active
                  </label>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span style={{ color: 'var(--color-text-primary)' }}>Ad is active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={editingAd ? handleUpdateAd : handleCreateAd}
                  className="flex-1 px-6 py-3 rounded-lg font-medium transition-colors"
                  style={{ background: 'var(--color-accent-1)', color: '#fff' }}
                >
                  {editingAd ? 'Update Ad' : 'Create Ad'}
                </button>
                <button
                  onClick={() => { setShowCreateModal(false); setEditingAd(null); resetForm(); }}
                  className="px-6 py-3 rounded-lg font-medium transition-colors"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
