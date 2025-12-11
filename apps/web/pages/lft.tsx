import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CreateTeamLftModal } from '../components/CreateTeamLftModal';
import { CreatePlayerLftModal } from '../components/CreatePlayerLftModal';
import { useGlobalUI } from '../components/GlobalUI';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type LftPost = {
  id: string;
  type: 'TEAM' | 'PLAYER';
  createdAt: string;
  // Common
  region: string;
  
  // TEAM fields
  teamName?: string;
  rolesNeeded?: string[];
  averageRank?: string;
  averageDivision?: string | null;
  scrims?: boolean;
  minAvailability?: string; // e.g., "Twice a Week"
  coachingAvailability?: 'Dedicated Coach' | 'Frequent' | 'Occasional' | 'None';
  details?: string;
  discordUsername?: string;
  
  // PLAYER fields
  username?: string;
  mainRole?: string;
  rank?: string;
  division?: string | null;
  experience?: 'First Team' | 'A Little Experience' | 'Experimented';
  languages?: string[];
  skills?: string[]; // Shotcaller, Weakside, Ocean Champion Pool, Vision, Duels, Consistency
  age?: number;
  availability?: string; // Once a Week, Twice a Week, etc.
};

export default function LFTPage() {
  const [allPosts, setAllPosts] = useState<LftPost[]>([]);
  const [posts, setPosts] = useState<LftPost[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<LftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'TEAMS' | 'PLAYERS'>('ALL');
  const [visibleCount, setVisibleCount] = useState(25);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const { showToast } = useGlobalUI();

  const formatAvailability = (avail: string | undefined) => {
    if (!avail) return '';
    return avail.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchLft() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/lft/posts`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setAllPosts(Array.isArray(data) ? data : []);
          }
        } else {
          console.error('Failed to fetch LFT posts');
          if (!cancelled) setAllPosts([]);
        }
      } catch (err) {
        console.error('Error fetching LFT posts:', err);
        if (!cancelled) setAllPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLft();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const next = allPosts.filter(p => 
      filter === 'ALL' ? true : filter === 'TEAMS' ? p.type === 'TEAM' : p.type === 'PLAYER'
    );
    setPosts(next);
    setVisibleCount(25); // Reset to 25 when filter changes
  }, [filter, allPosts]);

  useEffect(() => {
    setDisplayedPosts(posts.slice(0, visibleCount));
  }, [posts, visibleCount]);

  const handleTeamSubmit = async (data: any) => {
    try {
      let userId: string | null = null;
      try { userId = localStorage.getItem('lfd_userId'); } catch {}
      if (!userId) {
        showToast('Please log in to create a post', 'error');
        return;
      }

      const res = await fetch(`${API_URL}/api/lft/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: 'TEAM', userId }),
      });

      if (res.ok) {
        showToast('Team post created successfully!', 'success');
        setShowTeamModal(false);
        // Refresh posts
        const refreshRes = await fetch(`${API_URL}/api/lft/posts`);
        if (refreshRes.ok) {
          const posts = await refreshRes.json();
          setAllPosts(posts);
        }
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to create post', 'error');
      }
    } catch (err) {
      console.error('Error creating team post:', err);
      showToast('Failed to create post', 'error');
    }
  };

  const handlePlayerSubmit = async (data: any) => {
    try {
      let userId: string | null = null;
      try { userId = localStorage.getItem('lfd_userId'); } catch {}
      if (!userId) {
        showToast('Please log in to create a post', 'error');
        return;
      }

      const res = await fetch(`${API_URL}/api/lft/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: 'PLAYER', userId }),
      });

      if (res.ok) {
        showToast('Player post created successfully!', 'success');
        setShowPlayerModal(false);
        // Refresh posts
        const refreshRes = await fetch(`${API_URL}/api/lft/posts`);
        if (refreshRes.ok) {
          const posts = await refreshRes.json();
          setAllPosts(posts);
        }
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to create post', 'error');
      }
    } catch (err) {
      console.error('Error creating player post:', err);
      showToast('Failed to create post', 'error');
    }
  };

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--color-accent-1)' }}>Looking For Team (LFT)</h1>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  let userId: string | null = null;
                  try { userId = localStorage.getItem('lfd_userId'); } catch {}
                  
                  if (!userId) {
                    showToast('Please log in to create a post', 'error');
                    return;
                  }
                  
                  try {
                    const response = await fetch(`${API_URL}/api/user/profile?userId=${userId}`);
                    if (!response.ok) throw new Error('Failed to fetch profile');
                    const data = await response.json();
                    
                    const hasRole = data.preferredRole || data.primaryRole;
                    const mainAccount = data.riotAccounts?.find((acc: any) => acc.isMain);
                    const hasRank = mainAccount?.rank && mainAccount.rank !== 'UNRANKED';
                    
                    if (!data.region) {
                      showToast('Please set your region in your profile before creating an LFT post', 'error');
                      return;
                    }
                    if (!hasRole) {
                      showToast('Please set your preferred role in your profile before creating an LFT post', 'error');
                      return;
                    }
                    if (!hasRank) {
                      showToast('Please add your main account with rank information before creating an LFT post', 'error');
                      return;
                    }
                    
                    setShowPlayerModal(true);
                  } catch (error) {
                    console.error('Profile validation error:', error);
                    showToast('Failed to validate profile. Please try again.', 'error');
                  }
                }}
                className="px-4 py-2 font-semibold rounded"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)'
                }}
              >
                Look for a Team
              </button>
              <button
                onClick={() => setShowTeamModal(true)}
                className="px-4 py-2 font-semibold rounded"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)'
                }}
              >
                Look for Players
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Show:</span>
            <div className="flex gap-2">
              {(['ALL', 'TEAMS', 'PLAYERS'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-4 py-2 rounded font-medium transition-all"
                  style={{
                    backgroundColor: filter === f ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: filter === f ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                    border: `1px solid ${filter === f ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--border-radius)'
                  }}
                >
                  {f === 'ALL' ? 'All Posts' : f === 'TEAMS' ? 'Teams' : 'Players'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {loading ? (
          <LoadingSpinner text="Loading LFT feed..." />
        ) : (
          <section
            className="border p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)'
            }}
          >
            {posts.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No posts yet.</p>
            ) : (
              <div className="space-y-4">
                {displayedPosts.map(p => (
                  <div key={p.id} className="p-5 border" style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: p.type === 'TEAM' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)', color: p.type === 'TEAM' ? '#22c55e' : '#3b82f6', border: `1px solid ${p.type === 'TEAM' ? '#22c55e' : '#3b82f6'}` }}>{p.type}</span>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{p.type === 'TEAM' ? p.teamName : p.username}</h3>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>

                    {p.type === 'TEAM' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Roles Needed</p>
                            <div className="flex gap-1 flex-wrap">
                              {p.rolesNeeded?.map(r => (
                                <span key={r} className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}>{r}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Average Rank</p>
                            <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{p.averageDivision ? `${p.averageRank} ${p.averageDivision}` : p.averageRank}</span>
                          </div>
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Server</p>
                            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{p.region}</span>
                          </div>
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Scrims</p>
                            <span className="text-sm font-medium" style={{ color: p.scrims ? '#22c55e' : '#ef4444' }}>{p.scrims ? 'Yes' : 'No'}</span>
                          </div>
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Minimum Availability</p>
                            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatAvailability(p.minAvailability)}</span>
                          </div>
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Coaching</p>
                            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatAvailability(p.coachingAvailability)}</span>
                          </div>
                        </div>
                        {p.details && (
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Details</p>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{p.details}</p>
                          </div>
                        )}
                        {p.discordUsername && (
                          <div>
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Discord: <span className="font-semibold" style={{ color: 'var(--accent-discord)' }}>{p.discordUsername}</span></p>
                          </div>
                        )}
                      </div>
                    )}

                    {p.type === 'PLAYER' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Main Role</p>
                            <span className="text-sm px-2 py-1 rounded font-medium inline-block" style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}>{p.mainRole}</span>
                          </div>
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Rank</p>
                            <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{p.division ? `${p.rank} ${p.division}` : p.rank}</span>
                          </div>
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Server</p>
                            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{p.region}</span>
                          </div>
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Experience</p>
                            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatAvailability(p.experience)}</span>
                          </div>
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Age</p>
                            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{p.age || 'N/A'}</span>
                          </div>
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Availability</p>
                            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatAvailability(p.availability)}</span>
                          </div>
                        </div>
                        {p.languages && p.languages.length > 0 && (
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Languages Spoken</p>
                            <div className="flex gap-1 flex-wrap">
                              {p.languages.map(l => (
                                <span key={l} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(200,170,110,0.20)', color: '#C8AA6E', border: '1px solid #C8AA6E' }}>{l}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {p.skills && p.skills.length > 0 && (
                          <div>
                            <p className="text-xs uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Skills</p>
                            <div className="flex gap-1 flex-wrap">
                              {p.skills.map(s => (
                                <span key={s} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid #3b82f6' }}>{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {p.discordUsername && (
                          <div>
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Discord: <span className="font-semibold" style={{ color: 'var(--accent-discord)' }}>{p.discordUsername}</span></p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {posts.length > visibleCount && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 25)}
                      className="px-6 py-3 font-semibold rounded"
                      style={{
                        background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                        color: 'var(--color-bg-primary)',
                        borderRadius: 'var(--border-radius)'
                      }}
                    >
                      Load More ({posts.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Modals */}
        <CreateTeamLftModal
          open={showTeamModal}
          onClose={() => setShowTeamModal(false)}
          onSubmit={handleTeamSubmit}
        />
        <CreatePlayerLftModal
          open={showPlayerModal}
          onClose={() => setShowPlayerModal(false)}
          onSubmit={handlePlayerSubmit}
        />
      </div>
    </div>
  );
}
