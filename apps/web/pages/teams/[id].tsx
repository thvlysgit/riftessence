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
  isOwner: boolean;
  joinedAt: string;
  rank: string | null;
  division: string | null;
  riotId: string | null;
}

interface PendingInvitation {
  id: string;
  userId: string;
  username: string;
  role: string;
  invitedAt: string;
}

interface TeamEvent {
  id: string;
  title: string;
  type: string;
  description: string | null;
  scheduledAt: string;
  duration: number | null;
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
  myRole: string | null;
  members: TeamMember[];
  pendingInvitations: PendingInvitation[];
  upcomingEvents: TeamEvent[];
  createdAt: string;
}

const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL'];

const TeamDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ username: '', role: 'FILL', message: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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
      } else if (res.status === 404) {
        setError('Team not found');
      } else if (res.status === 403) {
        setError('You are not a member of this team');
      } else {
        setError('Failed to load team');
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token || !id || !inviteForm.username.trim()) return;

    setInviting(true);
    setInviteError(null);

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: inviteForm.username.trim(),
          role: inviteForm.role,
          message: inviteForm.message.trim() || null
        })
      });

      const data = await res.json();

      if (res.ok) {
        setShowInviteModal(false);
        setInviteForm({ username: '', role: 'FILL', message: '' });
        await fetchTeam();
      } else {
        setInviteError(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      setInviteError('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const token = getAuthToken();
    if (!token || !id) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchTeam();
      }
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
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
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/teams/dashboard"
                  className="text-sm hover:opacity-80"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ← Back to Dashboard
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--color-accent-1)' }}>
                  {team.name}
                </h1>
                {team.tag && (
                  <span className="text-lg px-3 py-1 rounded" style={{ backgroundColor: 'var(--color-accent-primary-bg)', color: 'var(--color-accent-1)' }}>
                    [{team.tag}]
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{team.region}</span>
                <span>•</span>
                <span>{team.members.length} member{team.members.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>Owner: {team.ownerUsername}</span>
              </div>
              {team.description && (
                <p className="mt-3" style={{ color: 'var(--color-text-secondary)' }}>
                  {team.description}
                </p>
              )}
            </div>
            {team.isOwner && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 font-semibold rounded transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                }}
              >
                + Invite Player
              </button>
            )}
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
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Roster
            </h2>
            <div className="space-y-3">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/profile/${member.username}`}
                      className="font-semibold hover:opacity-80"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {member.username}
                    </Link>
                    {member.isOwner && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(200, 170, 109, 0.2)', color: 'var(--color-accent-1)' }}>
                        Owner
                      </span>
                    )}
                    {member.rank && (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {member.rank}{member.division ? ` ${member.division}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {team.isOwner && !member.isOwner ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                        className="px-2 py-1 text-sm rounded border"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-accent-1)',
                        }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-accent-primary-bg)', color: 'var(--color-accent-1)' }}>
                        {member.role}
                      </span>
                    )}
                    {team.isOwner && !member.isOwner && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-xs px-2 py-1 rounded hover:opacity-80"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pending Invitations (Owner only) */}
          {team.isOwner && team.pendingInvitations.length > 0 && (
            <section
              className="border p-6"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Pending Invitations
              </h2>
              <div className="space-y-3">
                {team.pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div>
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {inv.username}
                      </span>
                      <span className="text-sm ml-2" style={{ color: 'var(--color-text-muted)' }}>
                        as {inv.role}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancelInvitation(inv.id)}
                      className="text-sm px-3 py-1 rounded hover:opacity-80"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Events */}
          <section
            className="border p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Upcoming Events
              </h2>
              <Link
                href="/teams/schedule"
                className="text-sm font-medium hover:opacity-80"
                style={{ color: 'var(--color-accent-1)' }}
              >
                View Schedule →
              </Link>
            </div>
            {team.upcomingEvents.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No upcoming events scheduled.</p>
            ) : (
              <div className="space-y-2">
                {team.upcomingEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-2 rounded"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(event.scheduledAt).toLocaleDateString()} at {new Date(event.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {event.title}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-accent-primary-bg)', color: 'var(--color-accent-1)' }}>
                      {event.type.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-md border rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              Invite Player
            </h2>

            {inviteError && (
              <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Username *
                </label>
                <input
                  type="text"
                  value={inviteForm.username}
                  onChange={(e) => setInviteForm({ ...inviteForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Role *
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Message (optional)
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full px-3 py-2 rounded border resize-none"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Add a message..."
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
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
                  disabled={inviting || !inviteForm.username.trim()}
                  className="flex-1 px-4 py-2 font-semibold rounded transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamDetailPage;
