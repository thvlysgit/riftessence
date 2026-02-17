// Admin Dashboard
// Central hub for all administrative functions
// Protected - requires admin badge

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalUI } from '../../components/GlobalUI';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type AdminStats = {
  totalUsers: number;
  totalReports: number;
  pendingReports: number;
  totalBadges: number;
  recentActivity?: string;
};

type MenuItem = {
  label: string;
  href: string;
  icon: string;
  description: string;
  badge?: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showToast } = useGlobalUI();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Check admin status on mount
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
          loadStats(user.id);
        }
      } catch (err) {
        console.error('Failed to check admin status:', err);
        setIsAdmin(false);
        router.push('/404');
      }
    }

    checkAdminStatus();
  }, [user, loading, router]);

  async function loadStats(userId: string) {
    try {
      // This endpoint would need to be created on the backend
      // For now, we'll fetch data from existing endpoints
      const [reportsRes, badgesRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/reports?userId=${encodeURIComponent(userId)}`),
        fetch(`${API_URL}/api/user/badges`),
      ]);

      let reports = [];
      let badges = [];

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        reports = reportsData.reports || [];
      }

      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        badges = badgesData.badges || [];
      }

      const pendingReports = reports.filter((r: any) => r.status === 'PENDING').length;

      setStats({
        totalUsers: 0, // Would need backend endpoint
        totalReports: reports.length,
        pendingReports,
        totalBadges: badges.length,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
      showToast('Failed to load admin statistics', 'error');
    } finally {
      setStatsLoading(false);
    }
  }

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))` }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent-1)' }}></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect to 404
  }

  const menuItems: MenuItem[] = [
    {
      label: 'Badge Management',
      href: '/admin/badges',
      icon: '🎖️',
      description: 'Assign and manage user badges',
    },
    {
      label: 'Reports & Moderation',
      href: '/admin/reports',
      icon: '📋',
      description: 'Review user reports and take moderation actions',
      badge: stats?.pendingReports ? String(stats.pendingReports) : undefined,
    },
    {
      label: 'User Management',
      href: '/admin/users',
      icon: '👥',
      description: 'View and manage platform users',
    },
    {
      label: 'Ads Management',
      href: '/admin/ads',
      icon: '📢',
      description: 'Create and monitor advertising campaigns',
    },
    {
      label: 'System Settings',
      href: '/admin/settings',
      icon: '⚙️',
      description: 'Configure platform settings and features',
    },
    {
      label: 'Broadcast Message',
      href: '/admin/broadcast',
      icon: '📡',
      description: 'Send a system message to all users',
    },
  ];

  return (
    <>
      <Head>
        <title>Admin Dashboard | LFD</title>
        <meta name="description" content="LFD Admin Dashboard" />
      </Head>

      <div className="min-h-screen" style={{ background: `linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))` }}>
        {/* Header */}
        <div className="border-b shadow-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  🛡️ Admin Dashboard
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  Manage platform content, users, and moderation
                </p>
              </div>
              <Link
                href="/"
                className="px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && !statsLoading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <StatCard
                label="Total Reports"
                value={stats.totalReports}
                icon="📊"
                color="from-blue-500 to-blue-600"
              />
              <StatCard
                label="Pending Reports"
                value={stats.pendingReports}
                icon="⚠️"
                color="from-red-500 to-red-600"
              />
              <StatCard
                label="Total Badges"
                value={stats.totalBadges}
                icon="🎖️"
                color="from-yellow-500 to-yellow-600"
              />
              <StatCard
                label="Admins Online"
                value={1}
                icon="👤"
                color="from-green-500 to-green-600"
              />
            </div>
          </div>
        )}

        {/* Menu Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>Management Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative"
              >
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur" style={{ background: `linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))` }}></div>
                <div className="relative border rounded-lg p-6 transition-all" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{item.icon}</span>
                    {item.badge && (
                      <span className="inline-block text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center" style={{ backgroundColor: 'var(--color-error)', color: 'var(--color-text-primary)' }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    {item.label}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.description}
                  </p>
                  <div className="flex items-center text-sm font-medium transition-colors" style={{ color: 'var(--color-accent-1)' }}>
                    View →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>Quick Actions</h2>
          <div className="border rounded-lg p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuickActionButton
                label="View All Users"
                description="Browse complete user directory"
                onClick={() => router.push('/admin/users')}
              />
              <QuickActionButton
                label="Review Pending Reports"
                description="Handle user reports and appeals"
                onClick={() => router.push('/admin/reports')}
              />
              <QuickActionButton
                label="Assign Badges"
                description="Grant or revoke user badges"
                onClick={() => router.push('/admin/badges')}
              />
              <QuickActionButton
                label="System Logs"
                description="View system activity and errors"
                onClick={() => showToast('System logs coming soon', 'info')}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t mt-12" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', opacity: 0.8 }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <p>
              Admin Dashboard • Last updated:{' '}
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {new Date().toLocaleTimeString()}
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  const gradientMap: Record<string, string> = {
    'from-blue-500 to-blue-600': 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))',
    'from-red-500 to-red-600': 'linear-gradient(to bottom right, var(--color-error), #b91c1c)',
    'from-yellow-500 to-yellow-600': 'linear-gradient(to bottom right, var(--color-warning), #ca8a04)',
    'from-green-500 to-green-600': 'linear-gradient(to bottom right, var(--color-success), #16a34a)',
  };
  return (
    <div className="rounded-lg p-6" style={{ background: gradientMap[color] || 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ opacity: 0.8 }}>{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <span className="text-4xl opacity-50">{icon}</span>
      </div>
    </div>
  );
}

function QuickActionButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-lg border transition-all group"
      style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
    >
      <h4 className="font-semibold transition-colors" style={{ color: 'var(--color-text-primary)' }}>
        {label}
      </h4>
      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
    </button>
  );
}
