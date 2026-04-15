import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SEOHead from '@components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import NoAccess from '@components/NoAccess';

interface TeamMember {
  userId: string;
  username: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  tag: string | null;
  canEditSchedule?: boolean;
  members?: TeamMember[];
}

interface EventAttendance {
  userId: string;
  username: string;
  status: 'ABSENT' | 'PRESENT' | 'UNSURE';
}

interface AssignedCoach {
  userId: string;
  username: string;
}

interface TeamEvent {
  id: string;
  title: string;
  type: 'SCRIM' | 'PRACTICE' | 'VOD_REVIEW' | 'TOURNAMENT' | 'TEAM_MEETING';
  description: string | null;
  scheduledAt: string;
  duration: number | null;
  enemyMultigg: string | null;
  concernedMemberIds: string[];
  attendances: EventAttendance[];
  assignedCoaches: AssignedCoach[];
}

const EVENT_COLORS: Record<string, string> = {
  SCRIM: '#22C55E',
  PRACTICE: '#3B82F6',
  VOD_REVIEW: '#F59E0B',
  TOURNAMENT: '#EF4444',
  TEAM_MEETING: '#8B5CF6',
};

const EVENT_GRADIENTS: Record<string, string> = {
  SCRIM: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
  PRACTICE: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
  VOD_REVIEW: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  TOURNAMENT: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  TEAM_MEETING: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  // Clean sword icon for Scrim (competitive battle)
  SCRIM: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 3l6 6-10 10-6-6L15 3z" /><path d="M5 13l6 6" /><path d="M3 21l2-2" /><path d="M21 3l-6 6" /></svg>,
  // Upward trend graph icon for Practice (improvement/growth)  
  PRACTICE: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  // Video camera for VOD Review
  VOD_REVIEW: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" /><rect x="3" y="6" width="12" height="12" rx="2" /></svg>,
  // Trophy/Cup icon for Tournament
  TOURNAMENT: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 22V14a2 2 0 00-2-2H6V4h12v8h-2a2 2 0 00-2 2v8" /></svg>,
  // People group for Team Meeting
  TEAM_MEETING: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
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

// Time slots for timeline view (full day: 00:00 -> 23:00)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_ROW_HEIGHT_PX = 64;

const toLocalDateTimeInputValue = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const localDateTimeInputToUtcIso = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const TeamSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    return monday;
  });
  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null);
  // Create/Edit event modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TeamEvent | null>(null); // Track which event is being edited
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'PRACTICE' as TeamEvent['type'],
    description: '',
    scheduledAt: '',
    duration: '',
    enemyMultigg: '',
    assignedCoachIds: [] as string[],
    concernedMemberIds: [] as string[]
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Post-creation availability prompt
  const [showAvailabilityPrompt, setShowAvailabilityPrompt] = useState(false);
  const [newlyCreatedEvent, setNewlyCreatedEvent] = useState<TeamEvent | null>(null);

  // Get coaches from team members for VOD Review assignment
  const getTeamCoaches = (): { userId: string; username: string }[] => {
    if (!selectedTeam) return [];
    return selectedTeam.members?.filter((m: any) => m.role === 'COACH').map((m: any) => ({
      userId: m.userId,
      username: m.username
    })) || [];
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Get week dates based on currentWeekStart
  const getWeekDates = () => {
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => {
      const newWeek = new Date(prev);
      newWeek.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return newWeek;
    });
  };

  // Go to today's week
  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    setCurrentWeekStart(monday);
  };

  // Get the week range string
  const getWeekRangeString = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const year = end.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
  };

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

    const rangeStart = new Date();
    const rangeEnd = new Date();

    if (viewMode === 'week') {
      rangeStart.setTime(currentWeekStart.getTime());
      rangeStart.setHours(0, 0, 0, 0);

      rangeEnd.setTime(currentWeekStart.getTime());
      rangeEnd.setDate(rangeEnd.getDate() + 6);
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      const monthDays = getMonthCalendarDays();
      const firstVisibleDay = monthDays[0];
      const lastVisibleDay = monthDays[monthDays.length - 1];

      rangeStart.setTime(firstVisibleDay.getTime());
      rangeStart.setHours(0, 0, 0, 0);

      rangeEnd.setTime(lastVisibleDay.getTime());
      rangeEnd.setHours(23, 59, 59, 999);
    }

    const query = new URLSearchParams({
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
    });

    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/events?${query.toString()}`, {
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
        // Update local events state
        setEvents(prevEvents => {
          const newEvents = prevEvents.map(event => {
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
          });
          
          // Also update selectedEvent if it's the same event
          if (selectedEvent?.id === eventId) {
            const updatedEvent = newEvents.find(e => e.id === eventId);
            if (updatedEvent) {
              setSelectedEvent(updatedEvent);
            }
          }
          
          return newEvents;
        });
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
    if (!selectedTeamId) return;
    const team = teams.find(t => t.id === selectedTeamId);
    setSelectedTeam(team || null);
  }, [selectedTeamId, teams]);

  useEffect(() => {
    if (!selectedTeamId) return;
    fetchEvents();
  }, [selectedTeamId, viewMode, currentWeekStart, currentMonth]);

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

    const normalizedScheduledAt = localDateTimeInputToUtcIso(eventForm.scheduledAt);
    if (!normalizedScheduledAt) {
      setError('Invalid date/time. Please pick a valid local date and time.');
      setCreating(false);
      return;
    }

    try {
      const isEditing = editingEvent !== null;
      const url = isEditing 
        ? `${apiUrl}/api/teams/${selectedTeamId}/events/${editingEvent.id}`
        : `${apiUrl}/api/teams/${selectedTeamId}/events`;
      
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: eventForm.title.trim(),
          type: eventForm.type,
          description: eventForm.description.trim() || null,
          scheduledAt: normalizedScheduledAt,
          duration: eventForm.duration ? parseInt(eventForm.duration) : null,
          enemyMultigg: (eventForm.type === 'SCRIM' || eventForm.type === 'TOURNAMENT') ? (eventForm.enemyMultigg.trim() || null) : null,
          assignedCoachIds: eventForm.type === 'VOD_REVIEW' ? eventForm.assignedCoachIds : [],
          concernedMemberIds: eventForm.concernedMemberIds
        })
      });

      const data = await res.json();

      if (res.ok) {
        setShowCreateModal(false);
        const wasEditing = editingEvent !== null;
        setEditingEvent(null);
        setEventForm({ title: '', type: 'PRACTICE', description: '', scheduledAt: '', duration: '', enemyMultigg: '', assignedCoachIds: [], concernedMemberIds: [] });
        await fetchEvents();
        
        // Show availability prompt for newly created events (not edits)
        if (!wasEditing && selectedTeam?.members && selectedTeam.members.length > 1) {
          setNewlyCreatedEvent(data.event || data);
          setShowAvailabilityPrompt(true);
        }
      } else {
        setError(data.error || `Failed to ${isEditing ? 'update' : 'create'} event`);
      }
    } catch (err) {
      setError(`Failed to ${editingEvent ? 'update' : 'create'} event`);
    } finally {
      setCreating(false);
    }
  };

  const handleEditEvent = (event: TeamEvent) => {
    // Populate form with event data
    const localDateTime = toLocalDateTimeInputValue(event.scheduledAt);
    
    setEventForm({
      title: event.title,
      type: event.type,
      description: event.description || '',
      scheduledAt: localDateTime,
      duration: event.duration?.toString() || '',
      enemyMultigg: event.enemyMultigg || '',
      assignedCoachIds: event.assignedCoaches?.map(c => c.userId) || [],
      concernedMemberIds: event.concernedMemberIds || []
    });
    setEditingEvent(event);
    setShowCreateModal(true);
    setSelectedEvent(null); // Close details panel
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingEvent(null);
    setEventForm({ title: '', type: 'PRACTICE', description: '', scheduledAt: '', duration: '', enemyMultigg: '', assignedCoachIds: [], concernedMemberIds: [] });
    setError(null);
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

  // Calculate upcoming events (next 7 days)
  const getUpcomingEvents = () => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return events
      .filter(e => {
        const eventDate = new Date(e.scheduledAt);
        return eventDate >= now && eventDate <= weekFromNow;
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);
  };

  // Calculate event stats
  const getEventStats = () => {
    const now = new Date();
    const thisMonth = events.filter(e => {
      const d = new Date(e.scheduledAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      total: thisMonth.length,
      scrims: thisMonth.filter(e => e.type === 'SCRIM').length,
      practice: thisMonth.filter(e => e.type === 'PRACTICE').length,
      tournaments: thisMonth.filter(e => e.type === 'TOURNAMENT').length,
    };
  };

  const upcomingEvents = getUpcomingEvents();
  const eventStats = getEventStats();

  return (
    <>
      <SEOHead
        title="Team Schedule"
        description="View and manage your team's schedule. Plan scrims, practice sessions, and matches with your League of Legends team."
        path="/teams/schedule"
        keywords="LoL team schedule, League of Legends scrims, team practice, LoL esports calendar"
      />
      
      {/* Premium Background */}
      <div
        className="min-h-screen relative overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {/* Ambient glow effects */}
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'var(--color-accent-1)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'var(--color-accent-2)' }}
        />
        
        <div className="relative z-10 flex flex-col h-screen">
          {/* Premium Header */}
          <header 
            className="shrink-0 px-6 py-4 border-b backdrop-blur-sm"
            style={{ 
              backgroundColor: 'rgba(var(--color-bg-secondary-rgb, 20, 20, 25), 0.8)',
              borderColor: 'var(--color-border)' 
            }}
          >
            <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                {/* Logo & Title */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--color-accent-1) 0%, var(--color-accent-2) 100%)',
                      boxShadow: '0 4px 15px rgba(200, 170, 109, 0.3)'
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-bg-primary)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      Team Schedule
                    </h1>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {selectedTeam ? `${selectedTeam.name}${selectedTeam.tag ? ` [${selectedTeam.tag}]` : ''}` : 'Select a team'}
                    </p>
                  </div>
                </div>

                {/* Team Selector - Premium Style */}
                {teams.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="appearance-none pl-4 pr-10 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all hover:border-opacity-60"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        minWidth: '180px'
                      }}
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} {team.tag ? `[${team.tag}]` : ''}
                        </option>
                      ))}
                    </select>
                    <svg 
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: 'var(--color-text-muted)' }}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Center - View Controls & Navigation */}
              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div 
                  className="flex rounded-xl p-1"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  <button
                    onClick={() => setViewMode('week')}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: viewMode === 'week' ? 'var(--color-accent-1)' : 'transparent',
                      color: viewMode === 'week' ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: viewMode === 'month' ? 'var(--color-accent-1)' : 'transparent',
                      color: viewMode === 'month' ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    Month
                  </button>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewMode === 'week' ? navigateWeek('prev') : navigateMonth('prev')}
                    className="p-2 rounded-lg transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)' 
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={goToCurrentWeek}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-accent-1)',
                      minWidth: '140px'
                    }}
                  >
                    {viewMode === 'week' ? getWeekRangeString() : currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </button>
                  
                  <button
                    onClick={() => viewMode === 'week' ? navigateWeek('next') : navigateMonth('next')}
                    className="p-2 rounded-lg transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)' 
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-3">
                {/* Warning badge */}
                {selectedTeam?.canEditSchedule && events.some(e => (e.type === 'SCRIM' || e.type === 'TOURNAMENT') && !e.enemyMultigg) && (
                  <div 
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                    style={{ 
                      backgroundColor: 'rgba(245, 158, 11, 0.15)', 
                      color: '#F59E0B', 
                      border: '1px solid rgba(245, 158, 11, 0.3)' 
                    }}
                    title="Some scrims/tournaments are missing enemy team multi.gg links"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden lg:inline">Missing enemy info</span>
                  </div>
                )}
                
                <button
                  onClick={() => setShowCreateModal(true)}
                  disabled={!selectedTeamId}
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent-1) 0%, var(--color-accent-2) 100%)',
                    color: 'var(--color-bg-primary)',
                    boxShadow: '0 4px 15px rgba(200, 170, 109, 0.3)'
                  }}
                >
                  <svg className="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">New Event</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          {teams.length > 0 && selectedTeamId ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Calendar Section - Main Area */}
              <main className="flex-1 overflow-auto p-6">
                {viewMode === 'week' ? (
                  /* ==================== PREMIUM WEEK VIEW ==================== */
                  <div 
                    className="h-full rounded-2xl border overflow-hidden flex flex-col"
                    style={{ 
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div
                      className="flex-1 overflow-y-auto"
                      style={{ scrollbarGutter: 'stable' }}
                    >
                      {/* Week Header */}
                      <div
                        className="sticky top-0 z-20"
                        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                      >
                        <div 
                          className="grid border-b"
                          style={{ 
                            borderColor: 'var(--color-border)',
                            gridTemplateColumns: '80px repeat(7, minmax(0, 1fr))'  /* Explicit column sizing for Opera compatibility */
                          }}
                        >
                          {/* Time column header */}
                          <div 
                            className="p-3 border-r flex items-end justify-center flex-shrink-0"
                            style={{ borderColor: 'var(--color-border)', minWidth: '80px' }}
                          >
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                              TIME
                            </span>
                          </div>
                          
                          {/* Day headers */}
                          {weekDates.map((date, index) => {
                            const isTodayDate = new Date().toDateString() === date.toDateString();
                            const hasEvents = getEventsForDate(date).length > 0;
                            
                            return (
                              <div
                                key={index}
                                className="p-3 text-center border-r last:border-r-0 relative overflow-hidden"
                                style={{
                                  borderColor: 'var(--color-border)',
                                  backgroundColor: isTodayDate ? 'rgba(200, 170, 109, 0.08)' : 'transparent',
                                  minWidth: 0,  /* Allow flex items to shrink properly in Opera */
                                }}
                              >
                                <p
                                  className="text-xs font-bold uppercase tracking-wider mb-1 truncate"
                                  style={{ color: isTodayDate ? 'var(--color-accent-1)' : 'var(--color-text-muted)' }}
                                >
                                  {fullDayNames[index]}
                                </p>
                                <div className="relative inline-flex items-center justify-center">
                                  <span
                                    className={`text-2xl font-bold ${isTodayDate ? 'w-10 h-10 flex items-center justify-center rounded-full' : ''}`}
                                    style={{ 
                                      color: isTodayDate ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                                      backgroundColor: isTodayDate ? 'var(--color-accent-1)' : 'transparent',
                                    }}
                                  >
                                    {date.getDate()}
                                  </span>
                                  {hasEvents && !isTodayDate && (
                                    <span 
                                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: 'var(--color-accent-1)' }}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Week Body - Timeline View */}
                      <div 
                        className="grid" 
                        style={{ 
                          gridTemplateColumns: '80px repeat(7, minmax(0, 1fr))'  /* Match header columns for Opera compatibility */
                        }}
                      >
                      {/* Time Labels Column */}
                      <div className="border-r relative flex-shrink-0" style={{ borderColor: 'var(--color-border)', minWidth: '80px' }}>
                        {TIME_SLOTS.map((hour) => (
                          <div 
                            key={hour}
                            className="h-16 border-b flex items-start justify-end pr-3 pt-1"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                              {hour.toString().padStart(2, '0')}:00
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Day Columns */}
                      {weekDates.map((date, dayIndex) => {
                        const isTodayDate = new Date().toDateString() === date.toDateString();
                        const dayEvents = getEventsForDate(date);
                        
                        return (
                          <div
                            key={dayIndex}
                            className="border-r last:border-r-0 relative overflow-hidden"
                            style={{
                              borderColor: 'var(--color-border)',
                              backgroundColor: isTodayDate ? 'rgba(200, 170, 109, 0.03)' : 'transparent',
                              minWidth: 0,  /* Allow flex items to shrink properly in Opera */
                            }}
                          >
                            {/* Hour grid lines */}
                            {TIME_SLOTS.map((hour) => (
                              <div 
                                key={hour}
                                className="h-16 border-b"
                                style={{ borderColor: 'var(--color-border)' }}
                              />
                            ))}
                            
                            {/* Current time indicator */}
                            {isTodayDate && (() => {
                              const now = new Date();
                              const hours = now.getHours();
                              const minutes = now.getMinutes();
                              if (hours >= TIME_SLOTS[0] && hours <= TIME_SLOTS[TIME_SLOTS.length - 1]) {
                                const top = ((hours - TIME_SLOTS[0]) * HOUR_ROW_HEIGHT_PX) + (minutes / 60 * HOUR_ROW_HEIGHT_PX);
                                return (
                                  <div 
                                    className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                                    style={{ top: `${top}px` }}
                                  >
                                    <div 
                                      className="w-2 h-2 rounded-full -ml-1"
                                      style={{ backgroundColor: '#EF4444' }}
                                    />
                                    <div 
                                      className="flex-1 h-0.5"
                                      style={{ backgroundColor: '#EF4444' }}
                                    />
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Events positioned absolutely */}
                            {dayEvents.map((event) => {
                              const eventDate = new Date(event.scheduledAt);
                              const hours = eventDate.getHours();
                              const minutes = eventDate.getMinutes();
                              
                              if (hours < TIME_SLOTS[0] || hours > TIME_SLOTS[TIME_SLOTS.length - 1]) return null;
                              
                              const top = ((hours - TIME_SLOTS[0]) * HOUR_ROW_HEIGHT_PX) + (minutes / 60 * HOUR_ROW_HEIGHT_PX);
                              const duration = event.duration || 60;
                              const height = Math.max((duration / 60) * HOUR_ROW_HEIGHT_PX, 40);
                              const myAttendance = getMyAttendance(event);
                              
                              return (
                                <div
                                  key={event.id}
                                  className="absolute left-1 right-1 rounded-lg cursor-pointer transition-all hover:scale-[1.02] hover:z-30 group"
                                  style={{
                                    top: `${top}px`,
                                    minHeight: `${height}px`,
                                    background: EVENT_GRADIENTS[event.type],
                                    boxShadow: `0 4px 15px ${EVENT_COLORS[event.type]}40`,
                                  }}
                                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                                >
                                  <div className="p-2 h-full flex flex-col">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-white/90">
                                        {formatEventTime(event.scheduledAt)}
                                      </span>
                                      {myAttendance && (
                                        <span
                                          className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold"
                                          style={{ 
                                            backgroundColor: ATTENDANCE_COLORS[myAttendance],
                                            color: '#fff'
                                          }}
                                        >
                                          {ATTENDANCE_ICONS[myAttendance]}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm font-semibold text-white truncate mt-0.5">
                                      {event.title}
                                    </p>
                                    {height > 50 && (
                                      <div className="flex items-center gap-1 mt-auto text-white/70 text-xs">
                                        {EVENT_ICONS[event.type]}
                                        <span>{EVENT_LABELS[event.type]}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Edit & Delete buttons on hover */}
                                  {selectedTeam?.canEditSchedule && (
                                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                                        className="w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.8)' }}
                                        title="Edit event"
                                      >
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                        className="w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }}
                                        title="Delete event"
                                      >
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  </div>
                ) : (
                  /* ==================== PREMIUM MONTH VIEW ==================== */
                  <div 
                    className="h-full rounded-2xl border overflow-hidden flex flex-col"
                    style={{ 
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* Month Header - Day Names */}
                    <div 
                      className="grid grid-cols-7 border-b"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {dayNames.map((day, i) => (
                        <div 
                          key={day}
                          className="py-3 text-center"
                          style={{ 
                            backgroundColor: i >= 5 ? 'rgba(var(--color-text-muted-rgb), 0.05)' : 'transparent' 
                          }}
                        >
                          <span 
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {day}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Month Grid */}
                    <div className="flex-1 grid grid-cols-7 grid-rows-6">
                      {getMonthCalendarDays().map((date, idx) => {
                        const dayEvents = getEventsForDate(date);
                        const isInCurrentMonth = isCurrentMonth(date);
                        const isTodayDate = isToday(date);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        
                        return (
                          <div
                            key={idx}
                            className="border-b border-r last:border-r-0 p-2 flex flex-col transition-all hover:bg-opacity-50 cursor-pointer relative group"
                            style={{
                              borderColor: 'var(--color-border)',
                              backgroundColor: isTodayDate 
                                ? 'rgba(200, 170, 109, 0.1)' 
                                : isWeekend && isInCurrentMonth
                                  ? 'rgba(var(--color-text-muted-rgb), 0.03)'
                                  : 'transparent',
                              opacity: isInCurrentMonth ? 1 : 0.4,
                            }}
                            onClick={() => {
                              if (dayEvents.length === 1) {
                                setSelectedEvent(dayEvents[0]);
                              }
                            }}
                          >
                            {/* Date Number */}
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-sm font-semibold ${isTodayDate ? 'w-7 h-7 flex items-center justify-center rounded-full' : ''}`}
                                style={{ 
                                  color: isTodayDate ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                                  backgroundColor: isTodayDate ? 'var(--color-accent-1)' : 'transparent',
                                }}
                              >
                                {date.getDate()}
                              </span>
                              {dayEvents.length > 3 && (
                                <span 
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                  style={{ 
                                    backgroundColor: 'var(--color-accent-1)',
                                    color: 'var(--color-bg-primary)'
                                  }}
                                >
                                  +{dayEvents.length - 3}
                                </span>
                              )}
                            </div>
                            
                            {/* Events */}
                            <div className="flex-1 space-y-1 overflow-hidden">
                              {dayEvents.slice(0, 3).map(event => (
                                <div
                                  key={event.id}
                                  className="group/event text-[11px] px-2 py-1 rounded-md truncate cursor-pointer transition-all hover:scale-[1.02]"
                                  style={{
                                    background: EVENT_GRADIENTS[event.type],
                                    color: '#fff',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(selectedEvent?.id === event.id ? null : event);
                                  }}
                                >
                                  <span className="font-medium">{formatEventTime(event.scheduledAt)}</span>
                                  <span className="mx-1">·</span>
                                  <span>{event.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </main>

              {/* Right Sidebar - Event Details & Stats */}
              <aside 
                className="w-80 shrink-0 border-l overflow-y-auto p-4 space-y-4 hidden lg:block"
                style={{ 
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'rgba(var(--color-bg-secondary-rgb, 20, 20, 25), 0.5)'
                }}
              >
                {/* Event Details Panel */}
                {selectedEvent ? (
                  <div 
                    className="rounded-xl border overflow-hidden"
                    style={{ 
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    {/* Event Header */}
                    <div 
                      className="p-4 border-b"
                      style={{ 
                        background: EVENT_GRADIENTS[selectedEvent.type],
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {EVENT_ICONS[selectedEvent.type]}
                          <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                            {EVENT_LABELS[selectedEvent.type]}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedEvent(null)}
                          className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white/20"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-2">{selectedEvent.title}</h3>
                    </div>
                    
                    {/* Event Body */}
                    <div className="p-4 space-y-4">
                      {/* Date & Time */}
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                        >
                          <svg className="w-5 h-5" style={{ color: 'var(--color-accent-1)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {new Date(selectedEvent.scheduledAt).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {formatEventTime(selectedEvent.scheduledAt)}
                            {selectedEvent.duration && ` · ${selectedEvent.duration} minutes`}
                          </p>
                        </div>
                      </div>
                      
                      {/* Description */}
                      {selectedEvent.description && (
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {selectedEvent.description}
                        </p>
                      )}
                      
                      {/* Enemy Team Link */}
                      {(selectedEvent.type === 'SCRIM' || selectedEvent.type === 'TOURNAMENT') && (
                        <div>
                          {selectedEvent.enemyMultigg ? (
                            <a
                              href={selectedEvent.enemyMultigg.startsWith('http') ? selectedEvent.enemyMultigg : `https://${selectedEvent.enemyMultigg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] break-all"
                              style={{ 
                                backgroundColor: 'rgba(139, 92, 246, 0.15)', 
                                color: '#A78BFA',
                                border: '1px solid rgba(139, 92, 246, 0.3)'
                              }}
                            >
                              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              <span className="truncate">{selectedEvent.enemyMultigg.replace(/^https?:\/\//, '')}</span>
                            </a>
                          ) : (
                            <div 
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                              style={{ 
                                backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                                color: '#F59E0B',
                                border: '1px solid rgba(245, 158, 11, 0.2)'
                              }}
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              No enemy link set
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Attendance Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            Attendance
                          </h4>
                          {(() => {
                            const myStatus = getMyAttendance(selectedEvent);
                            const needsAttention = !myStatus;
                            return (
                              <button
                                onClick={() => handleToggleAttendance(selectedEvent.id)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:scale-105 ${needsAttention ? 'animate-pulse' : ''}`}
                                style={{
                                  backgroundColor: needsAttention ? 'var(--color-accent-1)' : myStatus ? ATTENDANCE_COLORS[myStatus] : 'var(--color-accent-1)',
                                  color: '#fff',
                                  boxShadow: needsAttention ? '0 0 12px rgba(200, 170, 109, 0.5)' : 'none'
                                }}
                              >
                                {needsAttention ? '⚡ Set Status' : 'Change Status'}
                              </button>
                            );
                          })()}
                        </div>
                        
                        {/* Attendance Counts */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {(['PRESENT', 'UNSURE', 'ABSENT'] as const).map(status => {
                            const count = selectedEvent.attendances.filter(a => a.status === status).length;
                            return (
                              <div 
                                key={status}
                                className="text-center py-2 rounded-lg"
                                style={{ backgroundColor: `${ATTENDANCE_COLORS[status]}15` }}
                              >
                                <p className="text-lg font-bold" style={{ color: ATTENDANCE_COLORS[status] }}>
                                  {count}
                                </p>
                                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                                  {status === 'PRESENT' ? 'Yes' : status === 'UNSURE' ? 'Maybe' : 'No'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Attendance List */}
                        {selectedEvent.attendances.length > 0 ? (
                          <div className="space-y-1">
                            {selectedEvent.attendances.map(att => (
                              <div 
                                key={att.userId}
                                className="flex items-center justify-between px-2 py-1.5 rounded-lg text-sm"
                                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                              >
                                <span style={{ color: 'var(--color-text-primary)' }}>{att.username}</span>
                                <span
                                  className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold"
                                  style={{ 
                                    backgroundColor: ATTENDANCE_COLORS[att.status],
                                    color: '#fff'
                                  }}
                                >
                                  {ATTENDANCE_ICONS[att.status]}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm italic text-center py-3" style={{ color: 'var(--color-text-muted)' }}>
                            No responses yet
                          </p>
                        )}
                      </div>
                      
                      {/* Edit & Delete Buttons */}
                      {selectedTeam?.canEditSchedule && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditEvent(selectedEvent)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                            style={{ 
                              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                              color: '#3B82F6',
                              border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => { handleDeleteEvent(selectedEvent.id); setSelectedEvent(null); }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                            style={{ 
                              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                              color: '#EF4444',
                              border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* No Event Selected - Show Stats & Upcoming */
                  <>
                    {/* Monthly Stats */}
                    <div 
                      className="rounded-xl border p-4"
                      style={{ 
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                        This Month
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div 
                          className="p-3 rounded-lg text-center"
                          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                        >
                          <p className="text-2xl font-bold" style={{ color: 'var(--color-accent-1)' }}>
                            {eventStats.total}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Events</p>
                        </div>
                        <div 
                          className="p-3 rounded-lg text-center"
                          style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                        >
                          <p className="text-2xl font-bold" style={{ color: '#22C55E' }}>
                            {eventStats.scrims}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Scrims</p>
                        </div>
                        <div 
                          className="p-3 rounded-lg text-center"
                          style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                        >
                          <p className="text-2xl font-bold" style={{ color: '#3B82F6' }}>
                            {eventStats.practice}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Practice</p>
                        </div>
                        <div 
                          className="p-3 rounded-lg text-center"
                          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                        >
                          <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>
                            {eventStats.tournaments}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tournaments</p>
                        </div>
                      </div>
                    </div>

                    {/* Upcoming Events */}
                    <div 
                      className="rounded-xl border p-4"
                      style={{ 
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                        Upcoming Events
                      </h3>
                      {upcomingEvents.length > 0 ? (
                        <div className="space-y-2">
                          {upcomingEvents.map(event => {
                            const myAtt = getMyAttendance(event);
                            return (
                              <div
                                key={event.id}
                                className="p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                                style={{ 
                                  backgroundColor: 'var(--color-bg-tertiary)',
                                  borderLeft: `3px solid ${EVENT_COLORS[event.type]}`
                                }}
                                onClick={() => setSelectedEvent(event)}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium" style={{ color: EVENT_COLORS[event.type] }}>
                                    {EVENT_LABELS[event.type]}
                                  </span>
                                  {myAtt && (
                                    <span
                                      className="w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold"
                                      style={{ 
                                        backgroundColor: ATTENDANCE_COLORS[myAtt],
                                        color: '#fff'
                                      }}
                                    >
                                      {ATTENDANCE_ICONS[myAtt]}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                                  {event.title}
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                  {new Date(event.scheduledAt).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })} · {formatEventTime(event.scheduledAt)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-center py-4 italic" style={{ color: 'var(--color-text-muted)' }}>
                          No upcoming events
                        </p>
                      )}
                    </div>

                    {/* Event Type Legend */}
                    <div 
                      className="rounded-xl border p-4"
                      style={{ 
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                        Event Types
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(EVENT_LABELS).map(([type, label]) => (
                          <div key={type} className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ background: EVENT_GRADIENTS[type] }}
                            />
                            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </aside>
            </div>
          ) : (
            /* No Team Selected - Empty State */
            <div className="flex-1 flex items-center justify-center p-8">
              <div 
                className="max-w-md text-center p-8 rounded-2xl border"
                style={{ 
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div 
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--color-accent-1) 0%, var(--color-accent-2) 100%)',
                    opacity: 0.2
                  }}
                >
                  <svg className="w-10 h-10" style={{ color: 'var(--color-accent-1)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  No Teams Found
                </h3>
                <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                  Create or join a team to start scheduling practice sessions, scrims, and matches.
                </p>
                <Link
                  href="/teams/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent-1) 0%, var(--color-accent-2) 100%)',
                    color: 'var(--color-bg-primary)',
                    boxShadow: '0 4px 15px rgba(200, 170, 109, 0.3)'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Go to Teams Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Event Modal - Premium Style */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" 
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-md border rounded-2xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="p-5 border-b flex items-center justify-between"
              style={{ 
                borderColor: 'var(--color-border)',
                background: editingEvent 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(200, 170, 109, 0.1) 0%, rgba(200, 170, 109, 0.05) 100%)'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: editingEvent 
                      ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                      : 'linear-gradient(135deg, var(--color-accent-1) 0%, var(--color-accent-2) 100%)'
                  }}
                >
                  <svg className="w-5 h-5" style={{ color: editingEvent ? '#fff' : 'var(--color-bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {editingEvent ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    )}
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {editingEvent ? 'Edit Event' : 'New Event'}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {editingEvent ? 'Update event details' : 'Schedule a team activity'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mx-5 mt-4 p-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-opacity-50"
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

              {/* Event Type Visual Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Event Type *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(EVENT_LABELS).map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEventForm({ ...eventForm, type: type as TeamEvent['type'] })}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                      style={{
                        backgroundColor: eventForm.type === type ? `${EVENT_COLORS[type]}20` : 'var(--color-bg-tertiary)',
                        border: `2px solid ${eventForm.type === type ? EVENT_COLORS[type] : 'var(--color-border)'}`,
                      }}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ 
                          background: eventForm.type === type ? EVENT_GRADIENTS[type] : 'transparent',
                          color: eventForm.type === type ? '#fff' : EVENT_COLORS[type]
                        }}
                      >
                        {EVENT_ICONS[type]}
                      </div>
                      <span 
                        className="text-[10px] font-medium"
                        style={{ color: eventForm.type === type ? EVENT_COLORS[type] : 'var(--color-text-muted)' }}
                      >
                        {label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={eventForm.scheduledAt}
                    onChange={(e) => setEventForm({ ...eventForm, scheduledAt: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border transition-all focus:outline-none"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    required
                  />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Interpreted in your local timezone, then saved in UTC to avoid timezone shifts.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    value={eventForm.duration}
                    onChange={(e) => setEventForm({ ...eventForm, duration: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border transition-all focus:outline-none"
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
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Description <span className="font-normal">(optional)</span>
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border resize-none transition-all focus:outline-none"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Additional details..."
                  rows={2}
                  maxLength={500}
                />
              </div>

              {/* Enemy Team Link for Scrim/Tournament */}
              {(eventForm.type === 'SCRIM' || eventForm.type === 'TOURNAMENT') && (
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                >
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A78BFA' }}>
                    Enemy Team Link <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={eventForm.enemyMultigg}
                    onChange={(e) => setEventForm({ ...eventForm, enemyMultigg: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border transition-all focus:outline-none"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'rgba(139, 92, 246, 0.3)',
                      color: 'var(--color-text-primary)',
                    }}
                    placeholder="https://example.com/team or multi.gg link"
                  />
                  <p className="text-[10px] mt-1.5" style={{ color: 'rgba(167, 139, 250, 0.7)' }}>
                    Any link to scout or identify the enemy team
                  </p>
                </div>
              )}

              {/* Coach Assignment for VOD Review */}
              {eventForm.type === 'VOD_REVIEW' && (
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                >
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#F59E0B' }}>
                    Assign Coaches <span className="font-normal">(optional)</span>
                  </label>
                  {getTeamCoaches().length > 0 ? (
                    <div className="space-y-2">
                      {getTeamCoaches().map((coach) => (
                        <label 
                          key={coach.userId} 
                          className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                          style={{ 
                            backgroundColor: eventForm.assignedCoachIds.includes(coach.userId) 
                              ? 'rgba(245, 158, 11, 0.2)' 
                              : 'var(--color-bg-tertiary)',
                            border: `1px solid ${eventForm.assignedCoachIds.includes(coach.userId) ? 'rgba(245, 158, 11, 0.4)' : 'var(--color-border)'}`
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={eventForm.assignedCoachIds.includes(coach.userId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEventForm({ ...eventForm, assignedCoachIds: [...eventForm.assignedCoachIds, coach.userId] });
                              } else {
                                setEventForm({ ...eventForm, assignedCoachIds: eventForm.assignedCoachIds.filter(id => id !== coach.userId) });
                              }
                            }}
                            className="w-4 h-4 rounded accent-amber-500"
                          />
                          <span className="flex-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{coach.username}</span>
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(157, 78, 221, 0.2)', color: '#9D4EDD' }}
                          >
                            Coach
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm py-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
                      No coaches in this team yet
                    </p>
                  )}
                </div>
              )}

              {/* Audience targeting */}
              <div
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
              >
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#3B82F6' }}>
                  Concerned Members
                </label>
                <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  Only concerned members see this event in schedule and receive event notifications. Default is everyone in the team.
                </p>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setEventForm({ ...eventForm, concernedMemberIds: [] })}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: eventForm.concernedMemberIds.length === 0 ? 'rgba(59, 130, 246, 0.2)' : 'var(--color-bg-tertiary)',
                      color: eventForm.concernedMemberIds.length === 0 ? '#3B82F6' : 'var(--color-text-secondary)',
                      border: `1px solid ${eventForm.concernedMemberIds.length === 0 ? 'rgba(59, 130, 246, 0.35)' : 'var(--color-border)'}`,
                    }}
                  >
                    Everyone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (eventForm.concernedMemberIds.length > 0) return;
                      const teamMemberIds = selectedTeam?.members?.map((member) => member.userId) || [];
                      setEventForm({ ...eventForm, concernedMemberIds: teamMemberIds });
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: eventForm.concernedMemberIds.length > 0 ? 'rgba(59, 130, 246, 0.2)' : 'var(--color-bg-tertiary)',
                      color: eventForm.concernedMemberIds.length > 0 ? '#3B82F6' : 'var(--color-text-secondary)',
                      border: `1px solid ${eventForm.concernedMemberIds.length > 0 ? 'rgba(59, 130, 246, 0.35)' : 'var(--color-border)'}`,
                    }}
                  >
                    Specific Members
                  </button>
                </div>

                {eventForm.concernedMemberIds.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {(selectedTeam?.members || []).map((member) => {
                      const checked = eventForm.concernedMemberIds.includes(member.userId);
                      return (
                        <label
                          key={member.userId}
                          className="flex items-center gap-3 p-2 rounded-lg cursor-pointer"
                          style={{
                            backgroundColor: checked ? 'rgba(59, 130, 246, 0.16)' : 'var(--color-bg-tertiary)',
                            border: `1px solid ${checked ? 'rgba(59, 130, 246, 0.3)' : 'var(--color-border)'}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEventForm({
                                  ...eventForm,
                                  concernedMemberIds: [...eventForm.concernedMemberIds, member.userId],
                                });
                              } else {
                                const nextIds = eventForm.concernedMemberIds.filter((id) => id !== member.userId);
                                setEventForm({ ...eventForm, concernedMemberIds: nextIds });
                              }
                            }}
                            className="w-4 h-4 accent-blue-500"
                          />
                          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {member.username}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' }}>
                            {member.role}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 font-medium rounded-xl border transition-all hover:scale-[1.02]"
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                  style={{
                    background: editingEvent 
                      ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                      : 'linear-gradient(135deg, var(--color-accent-1) 0%, var(--color-accent-2) 100%)',
                    color: editingEvent ? '#fff' : 'var(--color-bg-primary)',
                    boxShadow: editingEvent 
                      ? '0 4px 15px rgba(59, 130, 246, 0.3)'
                      : '0 4px 15px rgba(200, 170, 109, 0.3)'
                  }}
                >
                  {creating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {editingEvent ? 'Saving...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {editingEvent ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        )}
                      </svg>
                      {editingEvent ? 'Save Changes' : 'Create Event'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Availability Prompt Modal - Shown after creating a new event */}
      {showAvailabilityPrompt && newlyCreatedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" 
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => { setShowAvailabilityPrompt(false); setNewlyCreatedEvent(null); }}
        >
          <div
            className="w-full max-w-md border rounded-2xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="p-5 border-b"
              style={{ 
                borderColor: 'var(--color-border)',
                background: `linear-gradient(135deg, ${EVENT_COLORS[newlyCreatedEvent.type]}20 0%, ${EVENT_COLORS[newlyCreatedEvent.type]}10 100%)`
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: EVENT_GRADIENTS[newlyCreatedEvent.type] }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    Event Created!
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {newlyCreatedEvent.title}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Event Details Summary */}
              <div 
                className="p-3 rounded-xl space-y-2"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4" style={{ color: 'var(--color-accent-1)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    {new Date(newlyCreatedEvent.scheduledAt).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span 
                    className="w-4 h-4 flex items-center justify-center"
                    style={{ color: EVENT_COLORS[newlyCreatedEvent.type] }}
                  >
                    {EVENT_ICONS[newlyCreatedEvent.type]}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {EVENT_LABELS[newlyCreatedEvent.type]}
                  </span>
                </div>
              </div>

              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Set your availability so your team knows if you can attend.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { 
                    setShowAvailabilityPrompt(false); 
                    setNewlyCreatedEvent(null);
                    // Find and select the newly created event to show in sidebar
                    const newEvent = events.find(e => e.id === newlyCreatedEvent.id);
                    if (newEvent) setSelectedEvent(newEvent);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent-1) 0%, var(--color-accent-2) 100%)',
                    color: 'var(--color-bg-primary)',
                    boxShadow: '0 4px 15px rgba(200, 170, 109, 0.3)'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Set My Availability
                </button>
              </div>

              {/* Skip link */}
              <button
                onClick={() => { setShowAvailabilityPrompt(false); setNewlyCreatedEvent(null); }}
                className="w-full px-4 py-2 text-sm font-medium rounded-lg transition-all hover:bg-white/5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                I&apos;ll do this later
              </button>

              {/* Team notification hint */}
              {selectedTeam?.members && selectedTeam.members.length > 1 && (
                <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                  Your teammates will also be able to set their availability for this event.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamSchedulePage;
