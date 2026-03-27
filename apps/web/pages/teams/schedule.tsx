import React, { useState } from 'react';
import Link from 'next/link';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import NoAccess from '../../components/NoAccess';

const TeamSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

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

  if (!user) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto">
          <NoAccess action="view-schedule" showButtons={true} />
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
                className="px-4 py-2 font-semibold rounded transition-all"
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
                className="px-3 py-2 rounded border text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                <option value="">Select a team...</option>
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
                    return (
                      <div
                        key={index}
                        className="p-2 border-r last:border-r-0 min-h-[400px]"
                        style={{
                          borderColor: 'var(--color-border)',
                          backgroundColor: isToday ? 'rgba(200, 170, 109, 0.03)' : 'transparent',
                        }}
                      >
                        {/* Events would go here */}
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

          {/* No Team Message */}
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
              className="inline-block px-6 py-3 font-semibold rounded transition-all"
              style={{
                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                color: 'var(--color-bg-primary)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              Go to Teams Dashboard
            </Link>
          </div>

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
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: '#22C55E' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Scrim
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: '#3B82F6' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Practice
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: '#F59E0B' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  VOD Review
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: '#EF4444' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Tournament
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: '#8B5CF6' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Team Meeting
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamSchedulePage;
