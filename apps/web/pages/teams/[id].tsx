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
  riotId: string | null;
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
            <div className="flex flex-wrap gap-2">
              {/* Copy Link Button */}
              {team.canManageRoster && (
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 font-medium rounded transition-all hover:opacity-80 border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {copied ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
              )}
              {/* Join Team Button (for users with pending spot) */}
              {team.canJoin && (
                <button
                  onClick={handleJoinTeam}
                  disabled={joining}
                  className="px-4 py-2 font-semibold rounded transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  {joining ? 'Joining...' : `Join as ${team.pendingSpotRole}`}
                </button>
              )}
              {/* Add to Roster Button (for owner/manager) */}
              {team.canManageRoster && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 font-semibold rounded transition-all hover:opacity-90"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  + Add to Roster
                </button>
              )}
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
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Roster
            </h2>
            {team.members.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No members yet.</p>
            ) : (
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
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link
                        href={`/profile/${member.username}`}
                        className="font-semibold hover:opacity-80"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {member.username}
                      </Link>
                      {member.role === 'OWNER' && (
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(200, 170, 109, 0.2)', color: 'var(--color-accent-1)' }}>
                          Owner
                        </span>
                      )}
                      {member.riotId && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {member.riotId}
                        </span>
                      )}
                      {member.rank && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {member.rank}{member.division ? ` ${member.division}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {team.canManageRoster && member.role !== 'OWNER' ? (
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
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-accent-primary-bg)', color: 'var(--color-accent-1)' }}>
                          {member.role}
                        </span>
                      )}
                      {team.canManageRoster && member.role !== 'OWNER' && (
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
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Pending Roster
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                These players/staff need to visit this page and click "Join" to confirm.
              </p>
              <div className="space-y-3">
                {team.pendingRoster.map((spot) => (
                  <div
                    key={spot.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {spot.riotId || spot.username}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-accent-primary-bg)', color: 'var(--color-accent-1)' }}>
                        {spot.role}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {spot.riotId ? '(Riot ID)' : '(Username)'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemovePendingSpot(spot.id)}
                      className="text-sm px-3 py-1 rounded hover:opacity-80"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
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
          )}
        </div>
      </div>

      {/* Add to Roster Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-md border rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              Add to Roster
            </h2>

            {/* Type Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setAddType('player'); setAddForm({ ...addForm, role: 'TOP' }); }}
                className="flex-1 px-3 py-2 rounded font-medium transition-all"
                style={{
                  backgroundColor: addType === 'player' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                  color: addType === 'player' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                  border: `1px solid ${addType === 'player' ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                }}
              >
                Player (Riot ID)
              </button>
              <button
                onClick={() => { setAddType('staff'); setAddForm({ ...addForm, role: 'MANAGER' }); }}
                className="flex-1 px-3 py-2 rounded font-medium transition-all"
                style={{
                  backgroundColor: addType === 'staff' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                  color: addType === 'staff' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                  border: `1px solid ${addType === 'staff' ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                }}
              >
                Staff (Username)
              </button>
            </div>

            {addType === 'staff' && (
              <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                ℹ️ Managers and Coaches must already have a riftessence profile before being added.
              </div>
            )}

            {addError && (
              <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddToRoster} className="space-y-4">
              {addType === 'player' ? (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    Riot ID *
                  </label>
                  <input
                    type="text"
                    value={addForm.riotId}
                    onChange={(e) => setAddForm({ ...addForm, riotId: e.target.value })}
                    className="w-full px-3 py-2 rounded border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    placeholder="GameName#TAG"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    placeholder="Enter riftessence username"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Role *
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {(addType === 'player' ? PLAYER_ROLES : STAFF_ROLES).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError(null); }}
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
                  disabled={adding || (addType === 'player' ? !addForm.riotId.trim() : !addForm.username.trim())}
                  className="flex-1 px-4 py-2 font-semibold rounded transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  {adding ? 'Adding...' : 'Add'}
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
