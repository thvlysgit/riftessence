import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

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
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem('lfd_userId');
    setUserId(uid);
  }, []);

  useEffect(() => {
    if (id) {
      fetchCommunity();
    }
  }, [id]);

  useEffect(() => {
    if (community && userId) {
      setIsMember(community.members.some(m => m.userId === userId));
    }
  }, [community, userId]);

  const fetchCommunity = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/communities/${id}`);
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
      alert('Please log in to join this community');
      return;
    }

    try {
      setJoining(true);
      const res = await fetch(`${API_URL}/api/communities/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        await fetchCommunity();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to join community');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!userId) return;

    if (!confirm('Are you sure you want to leave this community?')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/communities/${id}/leave?userId=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchCommunity();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to leave community');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
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
              <div>
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
            <div className="mt-4">
              <a
                href={community.inviteLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 font-semibold transition-colors"
                style={{
                  backgroundColor: '#5865F2',
                  color: '#fff',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join Discord Server
              </a>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {community.members.slice(0, 12).map(member => (
              <Link
                key={member.userId}
                href={`/profile/${member.username}`}
                className="flex items-center gap-3 p-3 border hover:shadow-md transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--border-radius)',
                }}
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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
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
