import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import NoAccess from '../../components/NoAccess';

interface Team {
  id: string;
  name: string;
  tag: string | null;
}

interface TeamEvent {
  id: string;
  title: string;
  type: 'SCRIM' | 'PRACTICE' | 'VOD_REVIEW' | 'TOURNAMENT' | 'TEAM_MEETING';
  description: string | null;
  scheduledAt: string;
  duration: number | null;
}

const EVENT_COLORS: Record<string, string> = {
  SCRIM: '#22C55E',
  PRACTICE: '#3B82F6',
  VOD_REVIEW: '#F59E0B',
  TOURNAMENT: '#EF4444',
  TEAM_MEETING: '#8B5CF6',
};

const EVENT_LABELS: Record<string, string> = {
  SCRIM: 'Scrim',
  PRACTICE: 'Practice',
  VOD_REVIEW: 'VOD Review',
  TOURNAMENT: 'Tournament',
  TEAM_MEETING: 'Team Meeting',
};

const TeamSchedulePage: React.FC = () => {
  const { user, token } = useAuth();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create event modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'PRACTICE' as TeamEvent['type'],
    description: '',
    scheduledAt: '',
    duration: ''
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Get current week dates
  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getCurrentWeekDates();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const fetchTeams = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        if (data.length > 0 && !selectedTeamId) {
          setSelectedTeamId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const fetchEvents = async () => {
    if (!token || !selectedTeamId) return;
    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchTeams();
      setLoading(false);
    };
    if (token) loadData();
  }, [token]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchEvents();
    }
  }, [selectedTeamId, token]);

  const getEventsForDate = (date: Date): TeamEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.scheduledAt);
      return eventDate.toDateString() === date.toDateString();
    }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  };

  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedTeamId || !eventForm.title.trim() || !eventForm.scheduledAt) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: eventForm.title.trim(),
          type: eventForm.type,
          description: eventForm.description.trim() || null,
          scheduledAt: eventForm.scheduledAt,
          duration: eventForm.duration ? parseInt(eventForm.duration) : null
        })
      });

      const data = await res.json();

      if (res.ok) {
        setShowCreateModal(false);
        setEventForm({ title: '', type: 'PRACTICE', description: '', scheduledAt: '', duration: '' });
        await fetchEvents();
      } else {
        setError(data.error || 'Failed to create event');
      }
    } catch (err) {
      setError('Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!token || !selectedTeamId) return;
    if (!confirm('Delete this event?')) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchEvents();
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
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
        title="Team Schedule"
        description="View and manage your team's schedule. Plan scrims, practice sessions, and matches with your League of Legends team."
        path="/teams/schedule"
        keywords="LoL team schedule, League of Legends scrims, team practice, LoL esports calendar"
      />
      <div
        className="min-h-screen py-10 px-4"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold"
                style={{ color: 'var(--color-accent-1)' }}
              >
                Team Schedule
              </h1>
              <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Plan and manage your team activities
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={!selectedTeamId}
                className="px-4 py-2 font-semibold rounded transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                + Add Event
              </button>
            </div>
          </header>

          {/* Team Selector & View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Team:
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="px-3 py-2 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                {teams.length === 0 ? (
                  <option value="">No teams available</option>
                ) : (
                  teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} {team.tag ? `[${team.tag}]` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('week')}
                className="px-4 py-2 rounded font-medium transition-all text-sm"
                style={{
                  backgroundColor: viewMode === 'week' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                  color: viewMode === 'week' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                  border: `1px solid ${viewMode === 'week' ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--border-radius)',
                }}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className="px-4 py-2 rounded font-medium transition-all text-sm"
                style={{
                  backgroundColor: viewMode === 'month' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                  color: viewMode === 'month' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                  border: `1px solid ${viewMode === 'month' ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--border-radius)',
                }}
              >
                Month
              </button>
            </div>
          </div>

          {/* Calendar View */}
          {teams.length > 0 && selectedTeamId ? (
            <section
              className="border overflow-hidden"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              {viewMode === 'week' ? (
                <>
                  {/* Week Header */}
                  <div
                    className="grid grid-cols-7 border-b"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {weekDates.map((date, index) => {
                      const isToday = new Date().toDateString() === date.toDateString();
                      return (
                        <div
                          key={index}
                          className="p-3 text-center border-r last:border-r-0"
                          style={{
                            borderColor: 'var(--color-border)',
                            backgroundColor: isToday ? 'var(--color-accent-primary-bg)' : 'transparent',
                          }}
                        >
                          <p
                            className="text-xs font-semibold uppercase"
                            style={{ color: isToday ? 'var(--color-accent-1)' : 'var(--color-text-muted)' }}
                          >
                            {dayNames[index]}
                          </p>
                          <p
                            className="text-lg font-bold"
                            style={{ color: isToday ? 'var(--color-accent-1)' : 'var(--color-text-primary)' }}
                          >
                            {date.getDate()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Week Body */}
                  <div className="grid grid-cols-7 min-h-[400px]">
                    {weekDates.map((date, index) => {
                      const isToday = new Date().toDateString() === date.toDateString();
                      const dayEvents = getEventsForDate(date);
                      return (
                        <div
                          key={index}
                          className="p-2 border-r last:border-r-0 min-h-[400px]"
                          style={{
                            borderColor: 'var(--color-border)',
                            backgroundColor: isToday ? 'rgba(200, 170, 109, 0.03)' : 'transparent',
                          }}
                        >
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className="mb-2 p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-all group relative"
                              style={{
                                backgroundColor: `${EVENT_COLORS[event.type]}20`,
                                borderLeft: `3px solid ${EVENT_COLORS[event.type]}`,
                              }}
                              title={`${event.title}\n${formatEventTime(event.scheduledAt)}${event.duration ? ` (${event.duration}min)` : ''}`}
                            >
                              <p className="font-semibold truncate" style={{ color: EVENT_COLORS[event.type] }}>
                                {formatEventTime(event.scheduledAt)}
                              </p>
                              <p className="truncate" style={{ color: 'var(--color-text-primary)' }}>
                                {event.title}
                              </p>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-xs px-1 rounded"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    Month view coming soon...
                  </p>
                </div>
              )}
            </section>
          ) : (
            /* No Team Message */
            <div
              className="border p-8 text-center"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                No Teams to Schedule
              </h3>
              <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Create or join a team to start scheduling practice sessions and matches.
              </p>
              <Link
                href="/teams/dashboard"
                className="inline-block px-6 py-3 font-semibold rounded transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                Go to Teams Dashboard
              </Link>
            </div>
          )}

          {/* Event Types Legend */}
          <div
            className="border p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h4
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Event Types
            </h4>
            <div className="flex flex-wrap gap-4">
              {Object.entries(EVENT_LABELS).map(([type, label]) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: EVENT_COLORS[type] }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
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
              Add Event
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="e.g., Scrim vs Team X"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Event Type *
                </label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as TeamEvent['type'] })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {Object.entries(EVENT_LABELS).map(([type, label]) => (
                    <option key={type} value={type}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={eventForm.scheduledAt}
                  onChange={(e) => setEventForm({ ...eventForm, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={eventForm.duration}
                  onChange={(e) => setEventForm({ ...eventForm, duration: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="e.g., 120"
                  min="15"
                  max="480"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Description (optional)
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded border resize-none"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Additional details..."
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
                  disabled={creating || !eventForm.title.trim() || !eventForm.scheduledAt}
                  className="flex-1 px-4 py-2 font-semibold rounded transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  {creating ? 'Creating...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamSchedulePage;
