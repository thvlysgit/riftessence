import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import NoAccess from '../../components/NoAccess';

interface TeamMember {
  userId: string;
  username: string;
  role: string;
  isOwner: boolean;
  joinedAt: string;
}

interface Team {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  region: string;
  ownerId: string;
  ownerUsername: string;
  isOwner: boolean;
  myRole: string;
  memberCount: number;
  eventCount: number;
  pendingInvites: number;
  members: TeamMember[];
  createdAt: string;
}

interface Invitation {
  id: string;
  teamId: string;
  teamName: string;
  teamTag: string | null;
  teamRegion: string;
  ownerUsername: string;
  memberCount: number;
  role: string;
  message: string | null;
  invitedAt: string;
}

const REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];

const TeamsDashboardPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-teams' | 'invitations'>('my-teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create team modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', tag: '', description: '', region: 'NA' });
  const [creating, setCreating] = useState(false);
  
  // Team selector modal for Manage Roster
  const [showTeamSelectorModal, setShowTeamSelectorModal] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchTeams = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const fetchInvitations = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/teams/invitations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data);
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTeams(), fetchInvitations()]);
      setLoading(false);
    };
    const token = getAuthToken();
    if (token) loadData();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token || !createForm.name.trim()) return;
    
    setCreating(true);
    setError(null);
    
    try {
      const res = await fetch(`${apiUrl}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          tag: createForm.tag.trim() || null,
          description: createForm.description.trim() || null,
          region: createForm.region
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowCreateModal(false);
        setCreateForm({ name: '', tag: '', description: '', region: 'NA' });
        await fetchTeams();
      } else {
        setError(data.error || 'Failed to create team');
      }
    } catch (err) {
      setError('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    const token = getAuthToken();
    if (!token) return;
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/invitations/${invitationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      
      if (res.ok) {
        await Promise.all([fetchTeams(), fetchInvitations()]);
      }
    } catch (err) {
      console.error('Failed to respond to invitation:', err);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    const token = getAuthToken();
    if (!token || !user) return;
    if (!confirm('Are you sure you want to leave this team?')) return;
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/${teamId}/members/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        await fetchTeams();
      }
    } catch (err) {
      console.error('Failed to leave team:', err);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const token = getAuthToken();
    if (!token) return;
    if (!confirm('Are you sure you want to delete this team? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        await fetchTeams();
      }
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  };
  
  // Handle Manage Roster click - if one team, go directly; if multiple, show modal
  const handleManageRosterClick = () => {
    if (teams.length === 0) {
      // No teams, prompt to create
      setShowCreateModal(true);
    } else if (teams.length === 1) {
      // One team - go directly
      router.push(`/teams/${teams[0].id}`);
    } else {
      // Multiple teams - show selector modal
      setShowTeamSelectorModal(true);
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

  return (
    <>
      <SEOHead
        title="Teams Dashboard"
        description="Create and manage your League of Legends teams. Invite players, organize your roster, and prepare for competitive play."
        path="/teams/dashboard"
        keywords="LoL team management, League of Legends team dashboard, team roster, LoL esports team"
      />
      <div
        className="min-h-screen py-10 px-4"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold"
                style={{ color: 'var(--color-accent-1)' }}
              >
                Teams Dashboard
              </h1>
              <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Create and manage your teams
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 font-semibold rounded transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                color: 'var(--color-bg-primary)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              + Create Team
            </button>
          </header>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('my-teams')}
              className="px-4 py-2 rounded font-medium transition-all"
              style={{
                backgroundColor: activeTab === 'my-teams' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                color: activeTab === 'my-teams' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                border: `1px solid ${activeTab === 'my-teams' ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                borderRadius: 'var(--border-radius)',
              }}
            >
              My Teams {teams.length > 0 && `(${teams.length})`}
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className="px-4 py-2 rounded font-medium transition-all"
              style={{
                backgroundColor: activeTab === 'invitations' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                color: activeTab === 'invitations' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                border: `1px solid ${activeTab === 'invitations' ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                borderRadius: 'var(--border-radius)',
              }}
            >
              Invitations {invitations.length > 0 && `(${invitations.length})`}
            </button>
          </div>

          {/* Content */}
          <section
            className="border p-6 sm:p-8"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)',
            }}
          >
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--color-accent-1)', borderTopColor: 'transparent' }} />
                <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
              </div>
            ) : activeTab === 'my-teams' ? (
              teams.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto mb-4"
                    style={{ color: 'var(--color-text-muted)' }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    No Teams Yet
                  </h3>
                  <p
                    className="mb-6"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Create your first team to start organizing scrims and managing your roster.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 font-semibold rounded transition-all hover:opacity-90"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    + Create Your First Team
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="border p-4 rounded-lg flex flex-wrap items-center justify-between gap-4"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {team.name}
                          </h3>
                          {team.tag && (
                            <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-accent-primary-bg)', color: 'var(--color-accent-1)' }}>
                              [{team.tag}]
                            </span>
                          )}
                          {team.isOwner && (
                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(200, 170, 109, 0.2)', color: 'var(--color-accent-1)' }}>
                              Owner
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          <span>{team.region}</span>
                          <span>•</span>
                          <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>Your role: {team.myRole}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/teams/${team.id}`}
                          className="px-3 py-1.5 text-sm font-medium rounded border transition-all hover:opacity-80"
                          style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          View
                        </Link>
                        {team.isOwner ? (
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="px-3 py-1.5 text-sm font-medium rounded border transition-all hover:opacity-80"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              color: '#EF4444',
                            }}
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLeaveTeam(team.id)}
                            className="px-3 py-1.5 text-sm font-medium rounded border transition-all hover:opacity-80"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              color: '#EF4444',
                            }}
                          >
                            Leave
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              invitations.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto mb-4"
                    style={{ color: 'var(--color-text-muted)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    No Pending Invitations
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    When a team invites you to join, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="border p-4 rounded-lg"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                              {inv.teamName}
                            </h3>
                            {inv.teamTag && (
                              <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-accent-primary-bg)', color: 'var(--color-accent-1)' }}>
                                [{inv.teamTag}]
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            <span>{inv.teamRegion}</span>
                            <span>•</span>
                            <span>{inv.memberCount} member{inv.memberCount !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>Owner: {inv.ownerUsername}</span>
                          </div>
                          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Invited as: <span style={{ color: 'var(--color-accent-1)' }}>{inv.role}</span>
                          </p>
                          {inv.message && (
                            <p className="text-sm mt-2 italic" style={{ color: 'var(--color-text-secondary)' }}>
                              "{inv.message}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleInvitationResponse(inv.id, 'accept')}
                            className="px-4 py-2 text-sm font-semibold rounded transition-all hover:opacity-90"
                            style={{
                              background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                              color: 'var(--color-bg-primary)',
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleInvitationResponse(inv.id, 'decline')}
                            className="px-4 py-2 text-sm font-medium rounded border transition-all hover:opacity-80"
                            style={{
                              backgroundColor: 'var(--color-bg-secondary)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Manage Roster - Clickable */}
            <button
              onClick={handleManageRosterClick}
              className="border p-6 rounded-xl text-left transition-all hover:scale-[1.02] hover:shadow-lg group"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(200, 170, 109, 0.2) 0%, rgba(200, 170, 109, 0.1) 100%)',
                  border: '1px solid rgba(200, 170, 109, 0.3)'
                }}
              >
                <svg
                  className="w-7 h-7"
                  style={{ color: 'var(--color-accent-1)' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className="font-bold text-lg mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Manage Roster
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Add players, assign roles, and organize your team structure.
                  </p>
                </div>
                <svg 
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" 
                  style={{ color: 'var(--color-accent-1)' }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              {teams.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {teams.length === 1 ? `Go to ${teams[0].name}` : `${teams.length} teams available`}
                  </span>
                </div>
              )}
            </button>

            {/* Schedule Scrims - Clickable Link */}
            <Link
              href="/teams/schedule"
              className="border p-6 rounded-xl block transition-all hover:scale-[1.02] hover:shadow-lg group"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                <svg
                  className="w-7 h-7"
                  style={{ color: '#3B82F6' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className="font-bold text-lg mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Schedule Scrims
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Coordinate practice sessions and matches with your team.
                  </p>
                </div>
                <svg 
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" 
                  style={{ color: '#3B82F6' }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Discord Forwarding Settings - WIP */}
            <div
              className="border p-6 rounded-xl relative overflow-hidden"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                opacity: 0.7,
              }}
            >
              {/* WIP Badge */}
              <div 
                className="absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-semibold"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', border: '1px solid rgba(168, 85, 247, 0.3)' }}
              >
                Coming Soon
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.2) 0%, rgba(88, 101, 242, 0.1) 100%)',
                  border: '1px solid rgba(88, 101, 242, 0.3)'
                }}
              >
                <svg
                  className="w-7 h-7"
                  style={{ color: '#5865F2' }}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </div>
              <h4
                className="font-bold text-lg mb-1"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Discord Forwarding
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Forward schedule updates and announcements to your Discord server.
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div
            className="border p-4 rounded-lg flex flex-wrap items-center justify-between gap-4"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div>
              <p style={{ color: 'var(--color-text-primary)' }} className="font-medium">
                Looking for players or want to join a team?
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Check out the LFT page to find teammates.
              </p>
            </div>
            <Link
              href="/lft"
              className="px-4 py-2 font-semibold rounded transition-all border"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-accent-1)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              Browse LFT
            </Link>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-md border rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              Create New Team
            </h2>
            
            {error && (
              <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Team Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Enter team name"
                  maxLength={50}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Team Tag (optional)
                </label>
                <input
                  type="text"
                  value={createForm.tag}
                  onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="e.g., TSM"
                  maxLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Region *
                </label>
                <select
                  value={createForm.region}
                  onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Description (optional)
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded border resize-none"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Describe your team..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 font-medium rounded border transition-all hover:opacity-80"
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
                  disabled={creating || !createForm.name.trim()}
                  className="flex-1 px-4 py-2 font-semibold rounded transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Team Selector Modal */}
      {showTeamSelectorModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTeamSelectorModal(false); }}
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
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                Select Team
              </h2>
              <button
                onClick={() => setShowTeamSelectorModal(false)}
                className="p-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-muted)' }}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Choose which team's roster you want to manage:
              </p>
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => {
                      setShowTeamSelectorModal(false);
                      router.push(`/teams/${team.id}`);
                    }}
                    className="w-full p-4 rounded-lg border text-left transition-all hover:scale-[1.01] hover:shadow-md flex items-center justify-between group"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {team.name}
                        </h3>
                        {team.tag && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-accent-primary-bg)', color: 'var(--color-accent-1)' }}>
                            [{team.tag}]
                          </span>
                        )}
                        {team.isOwner && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)', color: '#FFD700' }}>
                            👑 Owner
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <span>{team.region}</span>
                        <span>•</span>
                        <span>{team.memberCount} members</span>
                        <span>•</span>
                        <span>Your role: {team.myRole}</span>
                      </div>
                    </div>
                    <svg 
                      className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" 
                      style={{ color: 'var(--color-accent-1)' }}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamsDashboardPage;
