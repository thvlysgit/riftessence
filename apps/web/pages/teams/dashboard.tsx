import React, { useState } from 'react';
import Link from 'next/link';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import NoAccess from '../../components/NoAccess';

const TeamsDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-teams' | 'invitations'>('my-teams');

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
              className="px-4 py-2 font-semibold rounded transition-all"
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
              My Teams
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
              Invitations
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
            {activeTab === 'my-teams' ? (
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
                  className="px-6 py-3 font-semibold rounded transition-all"
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
            )}
          </section>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="border p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--color-accent-primary-bg)' }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: 'var(--color-accent-1)' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <h4
                className="font-semibold mb-1"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Manage Roster
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Add players, assign roles, and organize your team structure.
              </p>
            </div>

            <div
              className="border p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--color-accent-primary-bg)' }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: 'var(--color-accent-1)' }}
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
              <h4
                className="font-semibold mb-1"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Schedule Scrims
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Coordinate practice sessions and matches with your team.
              </p>
            </div>

            <div
              className="border p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--color-accent-primary-bg)' }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: 'var(--color-accent-1)' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
              <h4
                className="font-semibold mb-1"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Team Communication
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Keep your team informed with announcements and updates.
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
    </>
  );
};

export default TeamsDashboardPage;
