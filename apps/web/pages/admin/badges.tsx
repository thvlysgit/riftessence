import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LivingBadge from '../../src/components/LivingBadge';
import { getAuthHeader, getAuthToken, getUserIdFromToken } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Badge = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  _count?: { users: number };
};

type User = {
  id: string;
  username: string;
  badges: Array<{ key: string; name: string }>;
};

type SearchResult = User & {
  verified?: boolean;
  profileIconId?: number | null;
};

const isProtectedBadge = (badge: Pick<Badge, 'key'>) => badge.key.trim().toLowerCase() === 'admin';

export default function BadgeManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'library' | 'assignments'>('library');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingBadgeId, setLoadingBadgeId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedBadgeKey, setSelectedBadgeKey] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const token = getAuthToken();
        const userId = token ? getUserIdFromToken(token) : null;
        if (!userId) {
          setIsAdmin(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/user/check-admin?userId=${encodeURIComponent(userId)}`, {
          headers: getAuthHeader(),
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok || !data.isAdmin) {
          setIsAdmin(false);
          await router.replace('/404');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
        await router.replace('/404');
      }
    }

    void checkAdmin();
  }, [router]);

  const loadBadges = async () => {
    try {
      const response = await fetch(`${API_URL}/api/badges`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load badges');
      setBadges(data.badges || []);
    } catch (error) {
      console.error('Failed to load badges:', error);
      setMessage({ type: 'error', text: 'Could not load the badge library.' });
    }
  };

  useEffect(() => {
    if (isAdmin) void loadBadges();
  }, [isAdmin]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/user/search?q=${encodeURIComponent(searchQuery.trim())}&limit=10`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Search failed');
        setSearchResults(data.users || []);
        setShowSearchResults(true);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') console.error('User search failed:', error);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const loadUser = async (userId: string, username: string) => {
    try {
      const response = await fetch(`${API_URL}/api/user/profile?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load user');
      setCurrentUser({ id: data.id, username: data.username, badges: data.badges || [] });
      setSearchQuery(username);
      setShowSearchResults(false);
      setSelectedBadgeKey('');
    } catch (error) {
      console.error('Failed to load user:', error);
      setMessage({ type: 'error', text: 'Could not load that user.' });
    }
  };

  const deleteBadge = async (badge: Badge) => {
    if (isProtectedBadge(badge)) return;
    if (!window.confirm(`Delete “${badge.name}” from the badge library and remove it from every user?`)) return;

    setLoadingBadgeId(badge.id);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/api/badges/${encodeURIComponent(badge.id)}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete badge');

      setBadges((current) => current.filter((item) => item.id !== badge.id));
      setCurrentUser((user) => user ? {
        ...user,
        badges: user.badges.filter((item) => item.key !== badge.key),
      } : null);
      setMessage({ type: 'success', text: `Deleted “${badge.name}”.` });
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message || 'Failed to delete badge.' });
    } finally {
      setLoadingBadgeId(null);
    }
  };

  const changeAssignment = async (operation: 'assign' | 'remove', badgeKey: string) => {
    if (!currentUser || !badgeKey) return;
    setAssignmentLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/api/user/${operation}-badge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        credentials: 'include',
        body: JSON.stringify({ userId: currentUser.id, badgeKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to ${operation} badge`);
      await Promise.all([loadUser(currentUser.id, currentUser.username), loadBadges()]);
      setMessage({ type: 'success', text: data.message || `Badge ${operation === 'assign' ? 'assigned' : 'removed'}.` });
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setAssignmentLoading(false);
    }
  };

  if (isAdmin === null) {
    return (
      <main className="min-h-screen grid place-items-center" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)' }}>
        Loading badge controls…
      </main>
    );
  }

  if (!isAdmin) return null;

  const assignedKeys = new Set(currentUser?.badges.map((badge) => badge.key) || []);
  const availableBadges = badges.filter((badge) => !assignedKeys.has(badge.key));

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--color-accent-2)' }}>Administration</p>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Badges</h1>
          <p className="max-w-2xl text-sm leading-6" style={{ color: 'var(--color-text-muted)' }}>
            Badge artwork is now standardized in code. This page is for removing unwanted records and managing who has each badge.
          </p>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg border p-1" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          {([
            ['library', 'Badge library'],
            ['assignments', 'User assignments'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className="flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                color: activeTab === key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                background: activeTab === key ? 'var(--color-bg-tertiary)' : 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {message ? (
          <div
            className="mb-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
              borderColor: message.type === 'success' ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.35)',
              background: message.type === 'success' ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
            }}
          >
            {message.text}
          </div>
        ) : null}

        {activeTab === 'library' ? (
          <section className="overflow-hidden rounded-xl border" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Current records</h2>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{badges.length} badge{badges.length === 1 ? '' : 's'}</p>
              </div>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>20px standard artwork</span>
            </div>

            {badges.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No badge records found.</p>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {badges.map((badge) => {
                  const protectedBadge = isProtectedBadge(badge);
                  return (
                    <li key={badge.id} className="flex items-center gap-4 px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
                      <LivingBadge
                        badgeKey={badge.key}
                        icon={badge.icon}
                        label={badge.name}
                        description={badge.description || undefined}
                        showTooltip={false}
                        interactive={false}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{badge.name}</span>
                          {protectedBadge ? (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-tertiary)' }}>
                              Core access
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {badge.key} · {badge._count?.users || 0} user{badge._count?.users === 1 ? '' : 's'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteBadge(badge)}
                        disabled={protectedBadge || loadingBadgeId === badge.id}
                        className="rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ color: '#ED4245', borderColor: 'rgba(237,66,69,.4)', background: 'rgba(237,66,69,.08)' }}
                        title={protectedBadge ? 'The admin badge controls access to this page and cannot be deleted.' : undefined}
                      >
                        {loadingBadgeId === badge.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div className="relative rounded-xl border p-5" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Find a user</h2>
              <p className="mb-4 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Search by username, then curate their badges.</p>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                placeholder="Type at least 2 characters"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ color: 'var(--color-text-primary)', background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
              />
              {showSearchResults ? (
                <div className="absolute left-5 right-5 top-[7.9rem] z-20 overflow-hidden rounded-lg border shadow-2xl" style={{ background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
                  {searchResults.length ? searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => void loadUser(result.id, result.username)}
                      className="flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left last:border-0"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      <span className="truncate text-sm font-medium">{result.username}</span>
                      <span className="flex shrink-0 gap-1">
                        {result.badges.slice(0, 4).map((badge) => (
                          <LivingBadge key={badge.key} badgeKey={badge.key} icon={badge.key} showTooltip={false} interactive={false} />
                        ))}
                      </span>
                    </button>
                  )) : (
                    <p className="px-3 py-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No users found.</p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border p-5" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              {!currentUser ? (
                <div className="grid min-h-[12rem] place-items-center text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Select a user to manage their badges.
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Managing</p>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{currentUser.username}</h2>
                  </div>

                  <div className="mb-5">
                    <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Assigned badges</p>
                    {currentUser.badges.length ? (
                      <div className="flex flex-wrap gap-2">
                        {currentUser.badges.map((badge) => (
                          <div key={badge.key} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                            <LivingBadge badgeKey={badge.key} icon={badge.key} label={badge.name} showTooltip={false} interactive={false} />
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{badge.name}</span>
                            <button
                              type="button"
                              disabled={assignmentLoading || badge.key.toLowerCase() === 'admin'}
                              onClick={() => void changeAssignment('remove', badge.key)}
                              className="ml-1 text-sm leading-none disabled:cursor-not-allowed disabled:opacity-30"
                              style={{ color: '#ED4245' }}
                              aria-label={`Remove ${badge.name}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No badges assigned.</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={selectedBadgeKey}
                      onChange={(event) => setSelectedBadgeKey(event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ color: 'var(--color-text-primary)', background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
                    >
                      <option value="">Select a badge</option>
                      {availableBadges.map((badge) => <option key={badge.id} value={badge.key}>{badge.name}</option>)}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedBadgeKey || assignmentLoading}
                      onClick={() => void changeAssignment('assign', selectedBadgeKey)}
                      className="rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ color: 'var(--color-bg-primary)', background: 'var(--color-accent-1)' }}
                    >
                      Assign
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
