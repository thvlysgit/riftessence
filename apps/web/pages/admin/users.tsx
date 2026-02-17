// Admin Users Management Page
// View and manage all platform users

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalUI } from '../../components/GlobalUI';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Badge = {
  key: string;
  name: string;
};

type RiotAccount = {
  summonerName: string;
  region: string;
  verified: boolean;
};

type User = {
  id: string;
  username: string;
  email?: string;
  verified: boolean;
  createdAt: string;
  reportCount: number;
  badges: Badge[];
  riotAccounts: RiotAccount[];
};

type PaginationInfo = {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showToast, confirm } = useGlobalUI();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/');
      return;
    }

    async function checkAdminStatus() {
      try {
        if (!user?.id) {
          setIsAdmin(false);
          router.push('/404');
          return;
        }

        const res = await fetch(`${API_URL}/api/user/check-admin?userId=${encodeURIComponent(user.id)}`, {
          headers: getAuthHeader(),
        });
        const data = await res.json();

        if (!data.isAdmin) {
          setIsAdmin(false);
          router.push('/404');
        } else {
          setIsAdmin(true);
          loadUsers(0, '');
        }
      } catch (err) {
        console.error('Failed to check admin status:', err);
        setIsAdmin(false);
        router.push('/404');
      } finally {
        setPageLoading(false);
      }
    }

    checkAdminStatus();
  }, [user, loading, router]);

  async function loadUsers(page: number, search: string) {
    try {
      if (!user?.id) return;
      setPageLoading(true);
      const offset = page * pageSize;
      const res = await fetch(
        `${API_URL}/api/admin/users?userId=${encodeURIComponent(user.id)}&offset=${offset}&limit=${pageSize}&search=${encodeURIComponent(search)}`
      );

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
        setCurrentPage(page);
      } else {
        showToast('Failed to load users', 'error');
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      showToast('Failed to load users', 'error');
    } finally {
      setPageLoading(false);
    }
  }

  async function handleResetReports(targetUserId: string) {
    const confirmed = await confirm({
      title: 'Reset Report Count',
      message: 'This will reset this user\'s report count to 0. Continue?'
    });

    if (!confirmed) return;

    try {
      setProcessingUserId(targetUserId);
      if (!user?.id) return;

      const res = await fetch(`${API_URL}/api/admin/users/${targetUserId}/reports/reset`, {
        method: 'PATCH',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        showToast('Report count reset successfully', 'success');
        loadUsers(currentPage, searchQuery);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to reset report count', 'error');
      }
    } catch (err) {
      console.error('Failed to reset report count:', err);
      showToast('Failed to reset report count', 'error');
    } finally {
      setProcessingUserId(null);
    }
  }

  async function handleDeleteUser(targetUserId: string, username: string) {
    const confirmed = await confirm({
      title: 'Delete User',
      message: `This will permanently delete user "${username}" and all their data. This cannot be undone. Continue?`
    });

    if (!confirmed) return;

    try {
      setProcessingUserId(targetUserId);
      if (!user?.id) return;

      const res = await fetch(`${API_URL}/api/admin/users/${targetUserId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        showToast('User deleted successfully', 'success');
        loadUsers(currentPage, searchQuery);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete user', 'error');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast('Failed to delete user', 'error');
    } finally {
      setProcessingUserId(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (user?.id) {
      loadUsers(0, searchQuery);
      setCurrentPage(0);
    }
  }

  if (pageLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))` }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent-1)' }}></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Head>
        <title>User Management | Admin Dashboard</title>
      </Head>

      <div className="min-h-screen" style={{ background: `linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))` }}>
        {/* Header */}
        <div className="border-b shadow-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>User Management</h1>
                <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Total users: {pagination?.total || 0}
                </p>
              </div>
              <Link
                href="/admin"
                className="px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <button
              type="submit"
              className="px-6 py-2 rounded-lg transition-colors font-medium"
              style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
            >
              Search
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {users.length === 0 ? (
            <div className="border rounded-lg p-8 text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-secondary)' }}>No users found</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                      <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        Riot Account
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        Badges
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        Reports
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b transition-colors"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/profile?id=${u.id}`}
                            className="font-medium"
                            style={{ color: 'var(--color-accent-1)' }}
                          >
                            {u.username}
                          </Link>
                          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {u.email || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {u.riotAccounts.length > 0 ? (
                            <div className="space-y-1">
                              {u.riotAccounts.map((r, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <span>{r.summonerName}</span>
                                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                                    {r.region}
                                  </span>
                                  {r.verified && (
                                    <span className="text-xs" style={{ color: 'var(--color-success)' }}>✓</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>No verified account</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {u.badges.length > 0 ? (
                              u.badges.map((b, i) => (
                                <span
                                  key={i}
                                  className="inline-block px-2 py-1 rounded text-xs"
                                  style={{ backgroundColor: 'rgba(var(--color-accent-2-rgb, 96, 165, 250), 0.3)', color: 'var(--color-accent-2)' }}
                                >
                                  {b.name}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>No badges</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className="inline-block px-3 py-1 rounded text-sm font-medium"
                            style={{
                              backgroundColor: u.reportCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)',
                              color: u.reportCount > 0 ? 'var(--color-error)' : 'var(--color-success)'
                            }}
                          >
                            {u.reportCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.reportCount > 0 && (
                              <button
                                onClick={() => handleResetReports(u.id)}
                                disabled={processingUserId === u.id}
                                className="px-3 py-1 text-xs rounded transition-colors"
                                style={{ backgroundColor: 'var(--color-warning)', color: 'var(--color-text-primary)' }}
                              >
                                {processingUserId === u.id ? '...' : 'Reset'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={processingUserId === u.id}
                              className="px-3 py-1 text-xs rounded transition-colors"
                              style={{ backgroundColor: 'var(--color-error)', color: 'var(--color-text-primary)' }}
                            >
                              {processingUserId === u.id ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Showing {currentPage * pageSize + 1}–
                    {Math.min((currentPage + 1) * pageSize, pagination.total)} of{' '}
                    {pagination.total}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (currentPage > 0) {
                          loadUsers(currentPage - 1, searchQuery);
                        }
                      }}
                      disabled={currentPage === 0}
                      className="px-4 py-2 rounded transition-colors text-sm disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => {
                        if (pagination.hasMore) {
                          loadUsers(currentPage + 1, searchQuery);
                        }
                      }}
                      disabled={!pagination.hasMore}
                      className="px-4 py-2 rounded transition-colors text-sm disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
