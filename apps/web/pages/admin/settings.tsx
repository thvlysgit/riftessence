// Admin Settings Page
// Configure platform-wide settings

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/');
      return;
    }

    async function checkAdmin() {
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
        }
      } catch (err) {
        console.error('Failed to check admin status:', err);
        setIsAdmin(false);
        router.push('/404');
      } finally {
        setPageLoading(false);
      }
    }

    checkAdmin();
  }, [user, loading, router]);

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
        <title>System Settings | Admin Dashboard</title>
      </Head>

      <div className="min-h-screen" style={{ background: `linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))` }}>
        {/* Header */}
        <div className="border-b shadow-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>System Settings</h1>
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

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settings Sections */}
            <SettingCard
              icon="🌐"
              title="General Settings"
              description="Platform name, description, and general configuration"
              status="Coming Soon"
            />
            <SettingCard
              icon="🔒"
              title="Security Settings"
              description="Password policies, 2FA, and security options"
              status="Coming Soon"
            />
            <SettingCard
              icon="📧"
              title="Email Configuration"
              description="Email templates and notification settings"
              status="Coming Soon"
            />
            <SettingCard
              icon="🚫"
              title="Moderation Rules"
              description="Automated moderation thresholds and actions"
              status="Coming Soon"
            />
            <SettingCard
              icon="📊"
              title="Feature Flags"
              description="Enable/disable features and beta programs"
              status="Coming Soon"
            />
            <SettingCard
              icon="📝"
              title="API Keys"
              description="Manage third-party API integrations"
              status="Coming Soon"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function SettingCard({
  icon,
  title,
  description,
  status,
}: {
  icon: string;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="border rounded-lg p-6 transition-all" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{icon}</span>
        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
          {status}
        </span>
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
    </div>
  );
}
