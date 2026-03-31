import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import NoAccess from '../../components/NoAccess';

interface Team {
  id: string;
  name: string;
  tag: string | null;
  canEditSchedule?: boolean;
}

interface EventAttendance {
  userId: string;
  username: string;
  status: 'ABSENT' | 'PRESENT' | 'UNSURE';
}

interface TeamEvent {
  id: string;
  title: string;
  type: 'SCRIM' | 'PRACTICE' | 'VOD_REVIEW' | 'TOURNAMENT' | 'TEAM_MEETING';
  description: string | null;
  scheduledAt: string;
  duration: number | null;
  attendances: EventAttendance[];
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

const ATTENDANCE_COLORS: Record<string, string> = {
  ABSENT: '#EF4444',
  PRESENT: '#22C55E',
  UNSURE: '#F59E0B',
};

const ATTENDANCE_ICONS: Record<string, string> = {
  ABSENT: '✕',
  PRESENT: '✓',
  UNSURE: '?',
};

const TeamSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
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

  // Get month calendar data
  const getMonthCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const _lastDay = new Date(year, month + 1, 0); // Keep for reference if needed later
    
    // Get the Monday before or on the first day
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(firstDay.getDate() + diff);
    
    // Generate 6 weeks of days (42 days) to fill the calendar grid
    const days: Date[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newMonth;
    });
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.scheduledAt);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

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
        if (data.length > 0 && !selectedTeamId) {
          setSelectedTeamId(data[0].id);
          setSelectedTeam(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const fetchEvents = async () => {
    const token = getAuthToken();
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

  const handleToggleAttendance = async (eventId: string) => {
    const token = getAuthToken();
    if (!token || !selectedTeamId) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/events/${eventId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const updatedAttendance = await res.json();
        // Update local state
        setEvents(prevEvents => prevEvents.map(event => {
          if (event.id !== eventId) return event;
          
          const existingIdx = event.attendances.findIndex(a => a.userId === user?.id);
          if (existingIdx >= 0) {
            const newAttendances = [...event.attendances];
            newAttendances[existingIdx] = {
              ...newAttendances[existingIdx],
              status: updatedAttendance.status
            };
            return { ...event, attendances: newAttendances };
          } else {
            return {
              ...event,
              attendances: [...event.attendances, {
                userId: user?.id || '',
                username: user?.username || '',
                status: updatedAttendance.status
              }]
            };
          }
        }));
      }
    } catch (err) {
      console.error('Failed to toggle attendance:', err);
    }
  };

  const getMyAttendance = (event: TeamEvent): 'ABSENT' | 'PRESENT' | 'UNSURE' | null => {
    if (!user) return null;
    const myAttendance = event.attendances?.find(a => a.userId === user.id);
    return myAttendance?.status || null;
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchTeams();
    };
    const token = getAuthToken();
    if (token) loadData();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchEvents();
      const team = teams.find(t => t.id === selectedTeamId);
      setSelectedTeam(team || null);
    }
  }, [selectedTeamId, teams]);

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
    const token = getAuthToken();
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
    const token = getAuthToken();
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
                          {dayEvents.map((event) => {
                            const myAttendance = getMyAttendance(event);
                            const presentUsers = event.attendances?.filter(a => a.status === 'PRESENT') || [];
                            const absentUsers = event.attendances?.filter(a => a.status === 'ABSENT') || [];
                            const unsureUsers = event.attendances?.filter(a => a.status === 'UNSURE') || [];
                            
                            return (
                              <div
                                key={event.id}
                                className="mb-2 p-2 rounded text-xs cursor-pointer transition-all group relative"
                                style={{
                                  backgroundColor: `${EVENT_COLORS[event.type]}20`,
                                  borderLeft: `3px solid ${EVENT_COLORS[event.type]}`,
                                }}
                                onClick={() => handleToggleAttendance(event.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold truncate" style={{ color: EVENT_COLORS[event.type] }}>
                                    {formatEventTime(event.scheduledAt)}
                                  </p>
                                  {myAttendance && (
                                    <span
                                      className="w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold"
                                      style={{ 
                                        backgroundColor: ATTENDANCE_COLORS[myAttendance],
                                        color: '#fff'
                                      }}
                                    >
                                      {ATTENDANCE_ICONS[myAttendance]}
                                    </span>
                                  )}
                                </div>
                                <p className="truncate" style={{ color: 'var(--color-text-primary)' }}>
                                  {event.title}
                                </p>
                                {/* Attendance summary counts */}
                                {event.attendances && event.attendances.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {(['PRESENT', 'UNSURE', 'ABSENT'] as const).map(status => {
                                      const count = event.attendances.filter(a => a.status === status).length;
                                      if (count === 0) return null;
                                      return (
                                        <span
                                          key={status}
                                          className="text-[9px] px-1 rounded"
                                          style={{ backgroundColor: `${ATTENDANCE_COLORS[status]}30`, color: ATTENDANCE_COLORS[status] }}
                                        >
                                          {count}{ATTENDANCE_ICONS[status]}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {/* Hover Tooltip with attendance details */}
                                <div 
                                  className="absolute left-0 top-full mt-1 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 w-48"
                                  style={{ transform: 'translateY(-5px)' }}
                                >
                                  <div 
                                    className="p-3 rounded-lg shadow-xl border text-xs"
                                    style={{ 
                                      backgroundColor: 'var(--color-bg-secondary)', 
                                      borderColor: 'var(--color-border)',
                                    }}
                                  >
                                    <p className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                                      {event.title}
                                    </p>
                                    <p className="mb-2" style={{ color: 'var(--color-text-muted)' }}>
                                      {formatEventTime(event.scheduledAt)}{event.duration ? ` • ${event.duration}min` : ''}
                                    </p>
                                    <p className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                                      Click to toggle: {myAttendance || 'Not set'}
                                    </p>
                                    
                                    {event.attendances && event.attendances.length > 0 ? (
                                      <div className="space-y-2 border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
                                        {presentUsers.length > 0 && (
                                          <div>
                                            <p className="font-semibold flex items-center gap-1" style={{ color: ATTENDANCE_COLORS.PRESENT }}>
                                              <span className="w-3 h-3 flex items-center justify-center rounded-full text-[8px]" style={{ backgroundColor: ATTENDANCE_COLORS.PRESENT, color: '#fff' }}>✓</span>
                                              Available ({presentUsers.length})
                                            </p>
                                            <p className="pl-4 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                              {presentUsers.map(u => u.username).join(', ')}
                                            </p>
                                          </div>
                                        )}
                                        {unsureUsers.length > 0 && (
                                          <div>
                                            <p className="font-semibold flex items-center gap-1" style={{ color: ATTENDANCE_COLORS.UNSURE }}>
                                              <span className="w-3 h-3 flex items-center justify-center rounded-full text-[8px]" style={{ backgroundColor: ATTENDANCE_COLORS.UNSURE, color: '#fff' }}>?</span>
                                              Unsure ({unsureUsers.length})
                                            </p>
                                            <p className="pl-4 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                              {unsureUsers.map(u => u.username).join(', ')}
                                            </p>
                                          </div>
                                        )}
                                        {absentUsers.length > 0 && (
                                          <div>
                                            <p className="font-semibold flex items-center gap-1" style={{ color: ATTENDANCE_COLORS.ABSENT }}>
                                              <span className="w-3 h-3 flex items-center justify-center rounded-full text-[8px]" style={{ backgroundColor: ATTENDANCE_COLORS.ABSENT, color: '#fff' }}>✕</span>
                                              Absent ({absentUsers.length})
                                            </p>
                                            <p className="pl-4 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                              {absentUsers.map(u => u.username).join(', ')}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] italic" style={{ color: 'var(--color-text-muted)' }}>
                                        No responses yet
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {selectedTeam?.canEditSchedule && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-xs px-1 rounded"
                                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Month View */
                <>
                  {/* Month Navigation */}
                  <div 
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <button
                      onClick={() => navigateMonth('prev')}
                      className="p-2 rounded hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                    </button>
                    <h3 
                      className="text-lg font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                      onClick={() => navigateMonth('next')}
                      className="p-2 rounded hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="p-2">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {dayNames.map(day => (
                        <div 
                          key={day}
                          className="text-center py-2 text-xs font-semibold"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {getMonthCalendarDays().map((date, idx) => {
                        const dayEvents = getEventsForDate(date);
                        const isInCurrentMonth = isCurrentMonth(date);
                        const isTodayDate = isToday(date);
                        
                        return (
                          <div
                            key={idx}
                            className="min-h-[80px] p-1 rounded border transition-all hover:border-opacity-60"
                            style={{
                              backgroundColor: isTodayDate 
                                ? 'rgba(var(--color-accent-1-rgb), 0.1)' 
                                : isInCurrentMonth 
                                  ? 'var(--color-bg-tertiary)' 
                                  : 'var(--color-bg-primary)',
                              borderColor: isTodayDate 
                                ? 'var(--color-accent-1)' 
                                : 'var(--color-border)',
                              opacity: isInCurrentMonth ? 1 : 0.5,
                            }}
                          >
                            <div 
                              className={`text-xs font-medium mb-1 ${isTodayDate ? 'text-center' : ''}`}
                              style={{ 
                                color: isTodayDate 
                                  ? 'var(--color-accent-1)' 
                                  : 'var(--color-text-secondary)'
                              }}
                            >
                              {isTodayDate ? (
                                <span 
                                  className="inline-block w-6 h-6 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
                                >
                                  {date.getDate()}
                                </span>
                              ) : date.getDate()}
                            </div>
                            
                            {/* Events for this day */}
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 3).map(event => (
                                <div
                                  key={event.id}
                                  className="group relative text-[10px] px-1 py-0.5 rounded truncate cursor-pointer"
                                  style={{
                                    backgroundColor: `${EVENT_COLORS[event.type]}20`,
                                    color: EVENT_COLORS[event.type],
                                    borderLeft: `2px solid ${EVENT_COLORS[event.type]}`,
                                  }}
                                  title={`${event.title} - ${new Date(event.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                >
                                  {event.title}
                                  
                                  {/* Hover tooltip */}
                                  <div 
                                    className="absolute left-0 top-full mt-1 z-20 hidden group-hover:block w-48 p-2 rounded shadow-lg border"
                                    style={{
                                      backgroundColor: 'var(--color-bg-secondary)',
                                      borderColor: 'var(--color-border)',
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                      {event.title}
                                    </div>
                                    <div className="text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                                      {new Date(event.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      {event.duration && ` (${event.duration}min)`}
                                    </div>
                                    {event.attendances.length > 0 && (
                                      <div className="text-[10px] space-y-0.5 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                        {['PRESENT', 'UNSURE', 'ABSENT'].map(status => {
                                          const attending = event.attendances.filter(a => a.status === status);
                                          if (attending.length === 0) return null;
                                          return (
                                            <div key={status} className="flex items-center gap-1">
                                              <span style={{ color: ATTENDANCE_COLORS[status] }}>
                                                {ATTENDANCE_ICONS[status]}
                                              </span>
                                              <span style={{ color: 'var(--color-text-secondary)' }}>
                                                {attending.map(a => a.username).join(', ')}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div 
                                  className="text-[9px] text-center py-0.5"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
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
