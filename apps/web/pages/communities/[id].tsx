import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getUserIdFromToken, getAuthHeader } from '../../utils/auth';
import { useGlobalUI } from '@components/GlobalUI';
import { DiscordIcon } from '../../src/components/DiscordBrand';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const allRegions = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
const allLanguages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish', 'Russian', 'Korean', 'Japanese'];

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  language: string;
  regions: string[];
  inviteLink: string | null;
  discordServerId: string | null;
  isPartner: boolean;
  memberCount: number;
  postCount: number;
  lftPostCount: number;
  viewerMembershipRole?: 'MEMBER' | 'MODERATOR' | 'ADMIN' | null;
  viewerCanManageMembers?: boolean;
  createdAt: string;
  members: Array<{
    userId: string;
    username: string;
    role: string;
    joinedAt: string;
    badges: Array<{ key: string; name: string }>;
  }>;
};

export default function CommunityDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { showToast, confirm } = useGlobalUI();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    language: 'English',
    regions: [] as string[],
    inviteLink: '',
    isPartner: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('lfd_token');
    const uid = token ? getUserIdFromToken(token) : null;
    setUserId(uid);
  }, []);

  useEffect(() => {
    if (community?.name) {
      document.title = `${community.name} | RiftEssence`;
    }
  }, [community?.name]);

  useEffect(() => {
    if (id) {
      fetchCommunity();
    }
  }, [id]);

  useEffect(() => {
    if (community && userId) {
      const listedMembership = community.members.find(m => m.userId === userId);
      const resolvedRole = community.viewerMembershipRole || listedMembership?.role || null;
      setIsMember(Boolean(resolvedRole || listedMembership));
      setIsAdmin(resolvedRole === 'ADMIN');
    }
  }, [community, userId]);

  useEffect(() => {
    if (!userId) {
      setIsAppAdmin(false);
      return;
    }

    let cancelled = false;

    const checkAppAdmin = async () => {
      try {
        const res = await fetch(`${API_URL}/api/user/check-admin?userId=${encodeURIComponent(userId)}`, {
          headers: getAuthHeader(),
        });

        if (!res.ok) {
          if (!cancelled) setIsAppAdmin(false);
          return;
        }

        const data = await res.json();
        if (!cancelled) setIsAppAdmin(Boolean(data.isAdmin));
      } catch {
        if (!cancelled) setIsAppAdmin(false);
      }
    };

    checkAppAdmin();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Populate edit form when community loads
  useEffect(() => {
    if (community) {
      setEditData({
        name: community.name,
        description: community.description || '',
        language: community.language,
        regions: [...community.regions],
        inviteLink: community.inviteLink || '',
        isPartner: community.isPartner,
      });
    }
  }, [community]);

  const fetchCommunity = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/communities/${id}`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setCommunity(data);
      } else {
        console.error('Failed to fetch community');
      }
    } catch (error) {
      console.error('Error fetching community:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!userId) {
      showToast('Please log in to join this community', 'error');
      return;
    }

    try {
      setJoining(true);
      const res = await fetch(`${API_URL}/api/communities/${id}/join`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        await fetchCommunity();
        showToast('Successfully joined community!', 'success');
      } else {
        const data = await res.json();
        console.error('Join failed:', { status: res.status, data });
        showToast(data.error || 'Failed to join community', 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!userId) return;

    const confirmed = await confirm({
      title: 'Leave Community',
      message: 'Are you sure you want to leave this community?',
      confirmText: 'Leave',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/communities/${id}/leave`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        await fetchCommunity();
        showToast('Successfully left community', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to leave community', 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleSaveEdits = async () => {
    if (!community) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/communities/${community.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Community updated!', 'success');
        await fetchCommunity();
        setShowAdminPanel(false);
      } else {
        showToast(data.error || 'Failed to update community', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!community) return;
    const confirmed = await confirm({
      title: 'Delete Community',
      message: `Are you sure you want to permanently delete "${community.name}"? This cannot be undone. All memberships will be removed.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    try {
      setDeleting(true);
      const res = await fetch(`${API_URL}/api/communities/${community.id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        showToast('Community deleted.', 'success');
        router.push('/communities');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete community', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveMember = async (member: Community['members'][number]) => {
    if (!community || !userId) return;

    const confirmed = await confirm({
      title: 'Remove Member',
      message: `Remove ${member.username} from ${community.name}?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      setRemovingMemberId(member.userId);
      const res = await fetch(`${API_URL}/api/communities/${community.id}/members/${member.userId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        showToast(`${member.username} removed from community`, 'success');
        await fetchCommunity();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to remove member', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const toggleEditRegion = (region: string) => {
    setEditData(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-5xl mx-auto text-center" style={{ color: 'var(--color-text-muted)' }}>
          Loading community...
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-5xl mx-auto text-center" style={{ color: 'var(--color-text-muted)' }}>
          Community not found
        </div>
      </div>
    );
  }

  const canManageMembers = Boolean(isAppAdmin || isAdmin || community.viewerCanManageMembers);

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link href="/communities" className="text-sm mb-4 inline-block hover:opacity-80" style={{ color: 'var(--color-accent-1)' }}>
          ← Back to Communities
        </Link>

        {/* Community Header */}
        <div
          className="border p-8 mb-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {community.name}
                </h1>
                {community.isPartner && (
                  <span
                    className="px-3 py-1 text-xs font-bold"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    PARTNER
                  </span>
                )}
              </div>
              {community.description && (
                <p className="text-base mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {community.description}
                </p>
              )}
            </div>

            {userId && (
              <div className="flex items-center gap-2">
                {(isAdmin || isAppAdmin) && (
                  <button
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    className="px-4 py-2 border font-semibold transition-colors text-sm"
                    style={{
                      backgroundColor: showAdminPanel ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                      borderColor: showAdminPanel ? 'var(--color-accent-1)' : 'var(--color-border)',
                      color: showAdminPanel ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    {showAdminPanel ? 'Close Admin Panel' : 'Admin Settings'}
                  </button>
                )}
                {isMember ? (
                  <button
                    onClick={handleLeave}
                    className="px-4 py-2 border font-semibold transition-colors"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    Leave Community
                  </button>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="px-6 py-2 font-bold disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    {joining ? 'Joining...' : 'Join Community'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Admin Panel */}
          {(isAdmin || isAppAdmin) && showAdminPanel && (
            <div
              className="mb-6 p-6 border rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-accent-1)',
                borderWidth: '2px',
              }}
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
                Admin Panel
              </h3>

              <div className="space-y-4">
                {/* Edit Name */}
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Community Name
                  </label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-2 border text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  />
                </div>

                {/* Edit Description */}
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Description
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  />
                </div>

                {/* Edit Language */}
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Language
                  </label>
                  <select
                    value={editData.language}
                    onChange={(e) => setEditData({ ...editData, language: e.target.value })}
                    className="w-full px-3 py-2 border text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    {allLanguages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                {/* Edit Regions */}
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Regions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allRegions.map(region => (
                      <button
                        key={region}
                        type="button"
                        onClick={() => toggleEditRegion(region)}
                        className="px-2 py-1 text-xs font-medium border transition-colors"
                        style={{
                          backgroundColor: editData.regions.includes(region) ? 'var(--color-accent-1)' : 'var(--color-bg-secondary)',
                          borderColor: editData.regions.includes(region) ? 'var(--color-accent-1)' : 'var(--color-border)',
                          color: editData.regions.includes(region) ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                          borderRadius: 'var(--border-radius)',
                        }}
                      >
                        {region}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edit Invite Link */}
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Discord Invite Link
                  </label>
                  <input
                    type="url"
                    value={editData.inviteLink}
                    onChange={(e) => setEditData({ ...editData, inviteLink: e.target.value })}
                    placeholder="https://discord.gg/..."
                    className="w-full px-3 py-2 border text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  />
                </div>

                {isAppAdmin && (
                  <div
                    className="p-3 border"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    <label className="flex items-center gap-3 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={editData.isPartner}
                        onChange={(e) => setEditData({ ...editData, isPartner: e.target.checked })}
                      />
                      Mark this community as a partner community
                    </label>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                      App-admin only: partner communities receive the partner badge in discovery and detail views.
                    </p>
                  </div>
                )}

                {/* Save / Delete buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleSaveEdits}
                    disabled={saving}
                    className="px-6 py-2 font-bold text-sm disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>

                  <button
                    onClick={handleDeleteCommunity}
                    disabled={deleting}
                    className="px-4 py-2 font-semibold text-sm border disabled:opacity-50"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: '#C84040',
                      color: '#C84040',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Delete Community'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>Language:</span>
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{community.language}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>Regions:</span>
              <div className="flex gap-1">
                {community.regions.map(region => (
                  <span
                    key={region}
                    className="px-2 py-1 text-xs font-medium border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      borderRadius: 'calc(var(--border-radius) * 0.5)',
                    }}
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <span>{community.memberCount} members</span>
            <span>{community.postCount} posts</span>
            <span>{community.lftPostCount} LFT posts</span>
          </div>

          {/* Discord Link */}
          {community.inviteLink && (
            <div className="mt-4 flex gap-3">
              <a
                href={community.inviteLink}
                target="_blank"
                rel="noopener noreferrer"
                className="discord-cta inline-flex items-center gap-2 px-4 py-2 font-semibold"
              >
                <DiscordIcon className="w-5 h-5" />
                Join Discord Server
              </a>
              <button
                onClick={() => {
                  if (community.inviteLink) {
                    navigator.clipboard.writeText(community.inviteLink);
                    alert('Invite link copied to clipboard!');
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 font-semibold transition-colors"
                style={{
                  backgroundColor: 'var(--color-accent-1)',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
                title="Copy invite link"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </button>
            </div>
          )}
        </div>

        {/* Members Section */}
        <div
          className="border p-6 mb-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
            Members ({community.memberCount})
          </h2>
          {canManageMembers && (
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Community admins can remove members. Only RiftEssence admins can remove another community admin.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {community.members.slice(0, 12).map(member => (
              <div
                key={member.userId}
                className="p-3 border hover:shadow-md transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Link
                    href={`/profile/${member.username}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))',
                        color: 'var(--color-bg-primary)',
                      }}
                    >
                      {member.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {member.username}
                        </p>
                        {member.role === 'ADMIN' && (
                          <span className="text-xs px-1 py-0.5" style={{ color: 'var(--color-accent-1)' }}>
                            Admin
                          </span>
                        )}
                      </div>
                      {member.badges.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {member.badges.slice(0, 2).map(badge => (
                            <span
                              key={badge.key}
                              className="text-xs px-1 py-0.5"
                              style={{
                                backgroundColor: 'var(--color-accent-1)',
                                color: 'var(--color-bg-primary)',
                                borderRadius: 'calc(var(--border-radius) * 0.5)',
                              }}
                            >
                              {badge.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>

                  {canManageMembers && member.userId !== userId && (
                    <button
                      onClick={() => handleRemoveMember(member)}
                      disabled={
                        removingMemberId === member.userId
                        || (!isAppAdmin && member.role === 'ADMIN')
                      }
                      className="px-2 py-1 text-xs border font-semibold disabled:opacity-50"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: '#C84040',
                        color: '#C84040',
                        borderRadius: 'calc(var(--border-radius) * 0.6)',
                      }}
                      title={!isAppAdmin && member.role === 'ADMIN' ? 'Only app admins can remove another community admin' : 'Remove member'}
                    >
                      {removingMemberId === member.userId ? '...' : 'Remove'}
                    </button>
                  )}
                </div>

                <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          {community.memberCount > 12 && (
            <p className="text-sm mt-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
              And {community.memberCount - 12} more members...
            </p>
          )}
        </div>

        {/* Community Posts */}
        <div
          className="border p-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
            Recent Posts
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Visit the <Link href="/feed" className="underline hover:opacity-80" style={{ color: 'var(--color-accent-1)' }}>Feed</Link> or <Link href="/lft" className="underline hover:opacity-80" style={{ color: 'var(--color-accent-1)' }}>LFT</Link> pages to see posts from this community.
          </p>
        </div>
      </div>
    </div>
  );
}
