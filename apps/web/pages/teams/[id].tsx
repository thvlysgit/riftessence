import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import NoAccess from '../../components/NoAccess';

interface TeamMember {
  id: string;
  userId: string;
  username: string;
  role: string;
  joinedAt: string;
  rank: string | null;
  division: string | null;
  lp: number | null;
  gameName: string | null;
  tagLine: string | null;
  riotRegion: string | null;
}

interface PendingSpot {
  id: string;
  riotId: string | null;
  username: string | null;
  role: string;
  addedAt: string;
}

interface TeamEvent {
  id: string;
  title: string;
  type: string;
  description: string | null;
  scheduledAt: string;
  duration: number | null;
  attendances: { userId: string; status: string }[];
}

interface TeamDetails {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  region: string;
  ownerId: string;
  ownerUsername: string;
  isOwner: boolean;
  isMember: boolean;
  canJoin: boolean;
  pendingSpotId: string | null;
  pendingSpotRole: string | null;
  myRole: string | null;
  canManageRoster: boolean;
  canEditSchedule: boolean;
  members: TeamMember[];
  pendingRoster: PendingSpot[];
  upcomingEvents: TeamEvent[];
  createdAt: string;
}

const PLAYER_ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS'];
const STAFF_ROLES = ['MANAGER', 'COACH'];
const ALL_ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS', 'MANAGER', 'COACH'];

// Rank colors for visual consistency
const getRankColor = (rank: string | null): string => {
  const colors: Record<string, string> = {
    IRON: '#6B5650',
    BRONZE: '#A0522D',
    SILVER: '#A8B8C4',
    GOLD: '#FFD700',
    PLATINUM: '#40E0D0',
    EMERALD: '#00C853',
    DIAMOND: '#B9F2FF',
    MASTER: '#AB47BC',
    GRANDMASTER: '#F44336',
    CHALLENGER: '#00BCD4',
    UNRANKED: '#6B7280',
  };
  return colors[rank || 'UNRANKED'] || colors.UNRANKED;
};

// Get rank icon from community dragon
const getRankIcon = (rank: string): string => {
  const rankLower = rank.toLowerCase();
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${rankLower}.png`;
};

// Format rank display with LP for Master+
const formatRankDisplay = (rank: string | null, division: string | null, lp: number | null): string => {
  if (!rank || rank === 'UNRANKED') return 'Unranked';
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank)) {
    return `${rank} ${lp || 0} LP`;
  }
  return division ? `${rank} ${division}` : rank;
};

// Role display with icons and colors
const getRoleIcon = (role: string): string => {
  const icons: Record<string, string> = {
    TOP: '🛡️',
    JGL: '🌲',
    MID: '⚔️',
    ADC: '🎯',
    SUP: '💫',
    SUBS: '🔄',
    MANAGER: '📋',
    COACH: '🎓',
    OWNER: '👑',
  };
  return icons[role] || '👤';
};

const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    TOP: '#FF6B6B',
    JGL: '#4ECDC4',
    MID: '#FFE66D',
    ADC: '#95E1D3',
    SUP: '#DDA0DD',
    SUBS: '#6B7280',
    MANAGER: '#C8AA6D',
    COACH: '#9D4EDD',
    OWNER: '#FFD700',
  };
  return colors[role] || '#6B7280';
};

const TeamDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  // Add to roster modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ riotId: '', username: '', role: 'TOP' });
  const [addType, setAddType] = useState<'player' | 'staff'>('player');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchTeam = async () => {
    const token = getAuthToken();
    if (!token || !id) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setTeam(data);
        setError(null);
      } else if (res.status === 404) {
        setError('Team not found');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load team');
      }
    } catch (err) {
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTeam();
    }
  }, [id]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/teams/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinTeam = async () => {
    const token = getAuthToken();
    if (!token || !id) return;

    setJoining(true);
    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchTeam();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to join team');
      }
    } catch (err) {
      alert('Failed to join team');
    } finally {
      setJoining(false);
    }
  };

  const handleAddToRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token || !id) return;

    setAdding(true);
    setAddError(null);

    const body: any = { role: addForm.role };
    if (addType === 'player') {
      body.riotId = addForm.riotId.trim();
    } else {
      body.username = addForm.username.trim();
    }

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/roster`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        setShowAddModal(false);
        setAddForm({ riotId: '', username: '', role: 'TOP' });
        await fetchTeam();
      } else {
        setAddError(data.error || 'Failed to add to roster');
      }
    } catch (err) {
      setAddError('Failed to add to roster');
    } finally {
      setAdding(false);
    }
  };

  const handleRemovePendingSpot = async (spotId: string) => {
    const token = getAuthToken();
    if (!token || !id) return;
    if (!confirm('Remove this pending roster spot?')) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/roster/${spotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchTeam();
      }
    } catch (err) {
      console.error('Failed to remove roster spot:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const token = getAuthToken();
    if (!token || !id) return;
    if (!confirm('Remove this member from the team?')) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchTeam();
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    const token = getAuthToken();
    if (!token || !id) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        await fetchTeam();
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto">
          <NoAccess action="view" showButtons={true} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--color-accent-1)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Loading team...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {error || 'Team not found'}
          </h1>
          <Link
            href="/teams/dashboard"
            className="inline-block px-4 py-2 rounded font-medium"
            style={{
              backgroundColor: 'var(--color-accent-1)',
              color: 'var(--color-bg-primary)',
            }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${team.name} - Team Details`}
        description={`View and manage ${team.name} team roster and schedule.`}
        path={`/teams/${team.id}`}
      />
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <header 
            className="border p-6 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Link
                href="/teams/dashboard"
                className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to Dashboard
              </Link>
            </div>
            
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                {/* Team Name & Tag */}
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--color-accent-1)' }}>
                    {team.name}
                  </h1>
                  {team.tag && (
                    <span 
                      className="text-lg px-3 py-1 rounded-lg font-bold"
                      style={{ 
                        backgroundColor: 'var(--color-accent-primary-bg)', 
                        color: 'var(--color-accent-1)',
                        border: '1px solid var(--color-accent-1)',
                        opacity: 0.9
                      }}
                    >
                      [{team.tag}]
                    </span>
                  )}
                </div>
                
                {/* Team Info Pills */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                  >
                    🌍 {team.region}
                  </span>
                  <span 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                  >
                    👥 {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                  </span>
                  <Link
                    href={`/profile/${team.ownerUsername}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)', color: '#FFD700', border: '1px solid rgba(255, 215, 0, 0.2)' }}
                  >
                    👑 {team.ownerUsername}
                  </Link>
                  <span 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
                  >
                    📅 Created {new Date(team.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {/* Description */}
                {team.description && (
                  <p 
                    className="text-sm leading-relaxed max-w-2xl"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {team.description}
                  </p>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                {/* Copy Link Button */}
                {team.canManageRoster && (
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 font-medium rounded-lg transition-all hover:opacity-80 border flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {copied ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        Share Link
                      </>
                    )}
                  </button>
                )}
                {/* Join Team Button (for users with pending spot) */}
                {team.canJoin && (
                  <button
                    onClick={handleJoinTeam}
                    disabled={joining}
                    className="px-5 py-2.5 font-semibold rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                    }}
                  >
                    {joining ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Joining...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="8.5" cy="7" r="4"/>
                          <line x1="20" y1="8" x2="20" y2="14"/>
                          <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                        Join as {team.pendingSpotRole}
                      </>
                    )}
                  </button>
                )}
                {/* Add to Roster Button (for owner/manager) */}
                {team.canManageRoster && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-5 py-2.5 font-semibold rounded-lg transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <line x1="20" y1="8" x2="20" y2="14"/>
                      <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                    Add to Roster
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Roster */}
          <section
            className="border p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <span>👥</span> Roster
                <span className="text-sm font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                  {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                </span>
              </h2>
            </div>
            {team.members.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-lg mb-2" style={{ color: 'var(--color-text-muted)' }}>No members yet</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Add team members using the "Add to Roster" button</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {team.members.map((member) => {
                  const rankColor = getRankColor(member.rank);
                  const roleColor = getRoleColor(member.role);
                  const hasRiotAccount = member.gameName && member.tagLine;
                  
                  return (
                    <div
                      key={member.id}
                      className="relative overflow-hidden rounded-lg border transition-all hover:border-opacity-60"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        borderLeft: `4px solid ${roleColor}`,
                      }}
                    >
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {/* Left side - Member info */}
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            {/* Role Icon */}
                            <div 
                              className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                              style={{ backgroundColor: `${roleColor}20`, border: `1px solid ${roleColor}40` }}
                            >
                              {getRoleIcon(member.role)}
                            </div>
                            
                            {/* Member Details */}
                            <div className="flex-1 min-w-0">
                              {/* Username - clickable */}
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Link
                                  href={`/profile/${member.username}`}
                                  className="text-lg font-bold hover:underline transition-all"
                                  style={{ color: 'var(--color-accent-1)' }}
                                  title={`View ${member.username}'s profile`}
                                >
                                  {member.username}
                                </Link>
                                {member.role === 'OWNER' && (
                                  <span 
                                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                    style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)', color: '#FFD700', border: '1px solid rgba(255, 215, 0, 0.3)' }}
                                  >
                                    👑 Owner
                                  </span>
                                )}
                              </div>
                              
                              {/* Riot Account */}
                              <div className="flex items-center gap-2 mb-2">
                                {hasRiotAccount ? (
                                  <div className="flex items-center gap-1.5">
                                    <img 
                                      width="14" 
                                      height="14" 
                                      src="https://img.icons8.com/color/48/riot-games.png" 
                                      alt="Riot Games" 
                                      className="opacity-80"
                                    />
                                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                      {member.gameName}#{member.tagLine}
                                    </span>
                                    {member.riotRegion && (
                                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
                                        {member.riotRegion}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
                                    No Riot account linked
                                  </span>
                                )}
                              </div>
                              
                              {/* Rank Badge */}
                              <div className="flex items-center gap-3">
                                {member.rank && member.rank !== 'UNRANKED' ? (
                                  <div 
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border"
                                    style={{ 
                                      backgroundColor: `${rankColor}15`, 
                                      color: rankColor, 
                                      borderColor: `${rankColor}40` 
                                    }}
                                  >
                                    <img 
                                      src={getRankIcon(member.rank)} 
                                      alt={member.rank} 
                                      className="w-4 h-4"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <span>{formatRankDisplay(member.rank, member.division, member.lp)}</span>
                                  </div>
                                ) : (
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}
                                  >
                                    Unranked
                                  </span>
                                )}
                                
                                {/* Joined date */}
                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right side - Role & Actions */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {team.canManageRoster && member.role !== 'OWNER' ? (
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                                className="px-3 py-1.5 text-sm rounded-lg border font-medium cursor-pointer transition-all hover:border-opacity-80"
                                style={{
                                  backgroundColor: 'var(--color-bg-secondary)',
                                  borderColor: roleColor,
                                  color: roleColor,
                                }}
                              >
                                {ALL_ROLES.map((r) => (
                                  <option key={r} value={r}>{getRoleIcon(r)} {r}</option>
                                ))}
                              </select>
                            ) : (
                              <span 
                                className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                                style={{ backgroundColor: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}
                              >
                                {getRoleIcon(member.role)} {member.role}
                              </span>
                            )}
                            {team.canManageRoster && member.role !== 'OWNER' && (
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                className="p-2 rounded-lg transition-all hover:opacity-80"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                                title="Remove member"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
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
          </section>

          {/* Pending Roster (Owner/Manager only) */}
          {team.canManageRoster && team.pendingRoster.length > 0 && (
            <section
              className="border p-6"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <span>⏳</span> Pending Invites
                  <span className="text-sm font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', color: '#FFC107' }}>
                    {team.pendingRoster.length} pending
                  </span>
                </h2>
              </div>
              <div 
                className="p-3 rounded-lg mb-4 flex items-start gap-2"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
              >
                <span className="text-lg">ℹ️</span>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  These players and staff have been invited but haven't joined yet. They need to visit this team page and click the "Join" button to confirm their spot.
                </p>
              </div>
              <div className="grid gap-3">
                {team.pendingRoster.map((spot) => {
                  const roleColor = getRoleColor(spot.role);
                  const isPlayer = !!spot.riotId;
                  
                  return (
                    <div
                      key={spot.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        borderLeft: `4px solid ${roleColor}`,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${roleColor}20`, border: `1px solid ${roleColor}40` }}
                        >
                          {getRoleIcon(spot.role)}
                        </div>
                        
                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isPlayer ? (
                              <div className="flex items-center gap-1.5">
                                <img 
                                  width="14" 
                                  height="14" 
                                  src="https://img.icons8.com/color/48/riot-games.png" 
                                  alt="Riot Games"
                                />
                                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                  {spot.riotId}
                                </span>
                              </div>
                            ) : (
                              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                @{spot.username}
                              </span>
                            )}
                            <span 
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: isPlayer ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)', color: isPlayer ? '#3B82F6' : '#A855F7' }}
                            >
                              {isPlayer ? 'Player' : 'Staff'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <span>Added {new Date(spot.addedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span 
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                          style={{ backgroundColor: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}
                        >
                          {getRoleIcon(spot.role)} {spot.role}
                        </span>
                        <button
                          onClick={() => handleRemovePendingSpot(spot.id)}
                          className="p-2 rounded-lg transition-all hover:opacity-80"
                          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                          title="Cancel invitation"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Upcoming Events (Members only) */}
          {team.isMember && (
            <section
              className="border p-6"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <span>📅</span> Upcoming Events
                  {team.upcomingEvents.length > 0 && (
                    <span className="text-sm font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
                      {team.upcomingEvents.length} scheduled
                    </span>
                  )}
                </h2>
                <Link
                  href="/teams/schedule"
                  className="text-sm font-medium hover:opacity-80 flex items-center gap-1 transition-opacity"
                  style={{ color: 'var(--color-accent-1)' }}
                >
                  View Full Schedule
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
              {team.upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-lg mb-1" style={{ color: 'var(--color-text-muted)' }}>No upcoming events</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {team.canEditSchedule ? 'Create an event from the schedule page' : 'Events will appear here when scheduled'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {team.upcomingEvents.slice(0, 5).map((event) => {
                    const eventDate = new Date(event.scheduledAt);
                    const isToday = eventDate.toDateString() === new Date().toDateString();
                    const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                    
                    const getEventTypeColor = (type: string) => {
                      const colors: Record<string, string> = {
                        SCRIM: '#3B82F6',
                        PRACTICE: '#22C55E',
                        MATCH: '#EF4444',
                        MEETING: '#A855F7',
                        VOD_REVIEW: '#F59E0B',
                        OTHER: '#6B7280',
                      };
                      return colors[type] || colors.OTHER;
                    };
                    
                    const typeColor = getEventTypeColor(event.type);
                    
                    return (
                      <div
                        key={event.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border transition-all hover:border-opacity-60"
                        style={{ 
                          backgroundColor: 'var(--color-bg-tertiary)', 
                          borderColor: 'var(--color-border)',
                          borderLeft: `4px solid ${typeColor}`,
                        }}
                      >
                        {/* Date/Time */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div 
                            className="w-14 h-14 rounded-lg flex flex-col items-center justify-center"
                            style={{ backgroundColor: isToday ? 'rgba(34, 197, 94, 0.15)' : isTomorrow ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-bg-secondary)' }}
                          >
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                              {eventDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
                            </span>
                            <span className="text-xl font-bold" style={{ color: isToday ? '#22C55E' : isTomorrow ? '#3B82F6' : 'var(--color-text-primary)' }}>
                              {eventDate.getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : eventDate.toLocaleDateString(undefined, { weekday: 'long' })}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {event.duration && ` • ${event.duration} min`}
                            </p>
                          </div>
                        </div>
                        
                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              {event.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Type Badge */}
                        <span 
                          className="self-start sm:self-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}40` }}
                        >
                          {event.type.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Add to Roster Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); setAddError(null); } }}
        >
          <div
            className="w-full max-w-md border rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Modal Header */}
            <div 
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--color-border)', background: 'linear-gradient(135deg, var(--color-bg-tertiary) 0%, var(--color-bg-secondary) 100%)' }}
            >
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-accent-1)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Add to Roster
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setAddError(null); }}
                className="p-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-muted)' }}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Type Toggle */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => { setAddType('player'); setAddForm({ ...addForm, role: 'TOP' }); }}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: addType === 'player' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: addType === 'player' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                    border: `2px solid ${addType === 'player' ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                  }}
                >
                  <img 
                    width="16" 
                    height="16" 
                    src="https://img.icons8.com/color/48/riot-games.png" 
                    alt="Riot"
                    style={{ opacity: addType === 'player' ? 1 : 0.5 }}
                  />
                  Player
                </button>
                <button
                  onClick={() => { setAddType('staff'); setAddForm({ ...addForm, role: 'MANAGER' }); }}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: addType === 'staff' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: addType === 'staff' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                    border: `2px solid ${addType === 'staff' ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                  }}
                >
                  👔 Staff
                </button>
              </div>

              {addType === 'staff' && (
                <div 
                  className="mb-5 p-3 rounded-lg text-sm flex items-start gap-2"
                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                >
                  <span className="text-base">ℹ️</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Managers and Coaches must already have a RiftEssence profile before being added.
                  </span>
                </div>
              )}

              {addError && (
                <div 
                  className="mb-5 p-3 rounded-lg text-sm flex items-start gap-2"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                >
                  <span className="text-base">⚠️</span>
                  <span style={{ color: '#EF4444' }}>{addError}</span>
                </div>
              )}

              <form onSubmit={handleAddToRoster} className="space-y-5">
                {addType === 'player' ? (
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      Riot ID
                    </label>
                    <div className="relative">
                      <img 
                        width="16" 
                        height="16" 
                        src="https://img.icons8.com/color/48/riot-games.png" 
                        alt="Riot"
                        className="absolute left-3 top-1/2 transform -translate-y-1/2"
                      />
                      <input
                        type="text"
                        value={addForm.riotId}
                        onChange={(e) => setAddForm({ ...addForm, riotId: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                        placeholder="GameName#TAG"
                        required
                      />
                    </div>
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Enter the player's Riot ID (e.g., Faker#KR1)
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>@</span>
                      <input
                        type="text"
                        value={addForm.username}
                        onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                        className="w-full pl-9 pr-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                        placeholder="username"
                        required
                      />
                    </div>
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Enter their RiftEssence username
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(addType === 'player' ? PLAYER_ROLES : STAFF_ROLES).map((r) => {
                      const isSelected = addForm.role === r;
                      const roleColor = getRoleColor(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAddForm({ ...addForm, role: r })}
                          className="px-3 py-2.5 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-1.5"
                          style={{
                            backgroundColor: isSelected ? `${roleColor}20` : 'var(--color-bg-tertiary)',
                            color: isSelected ? roleColor : 'var(--color-text-secondary)',
                            border: `2px solid ${isSelected ? roleColor : 'var(--color-border)'}`,
                          }}
                        >
                          {getRoleIcon(r)} {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setAddError(null); }}
                    className="flex-1 px-4 py-3 font-medium rounded-lg border transition-all hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding || (addType === 'player' ? !addForm.riotId.trim() : !addForm.username.trim())}
                    className="flex-1 px-4 py-3 font-semibold rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                    }}
                  >
                    {adding ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Add to Roster
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamDetailPage;
