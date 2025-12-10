import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGlobalUI } from '../../components/GlobalUI';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Report = {
  id: string;
  reason: string;
  createdAt: string;
  reporter: {
    id: string;
    username: string;
  };
  reported: {
    id: string;
    username: string;
    reportCount: number;
  };
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { showToast, confirm } = useGlobalUI();

  useEffect(() => {
    let uid: string | null = null;
    try {
      uid = localStorage.getItem('lfd_userId');
    } catch {}
    setUserId(uid);

    if (!uid) {
      setLoading(false);
      return;
    }

    // Check admin status
    async function checkAdmin() {
      try {
        const res = await fetch(`${API_URL}/api/user/profile?userId=${encodeURIComponent(uid!)}`);
        if (res.ok) {
          const data = await res.json();
          console.log('Profile data:', data);
          console.log('Badges:', data.badges);
          const adminCheck = data.badges?.some((b: string) => b.toLowerCase() === 'admin');
          console.log('Is admin:', adminCheck);
          setIsAdmin(adminCheck);
          
          if (adminCheck) {
            loadReports(uid!);
          } else {
            setLoading(false);
          }
        } else {
          console.error('Profile fetch failed:', res.status);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to check admin status', err);
        setLoading(false);
      }
    }

    checkAdmin();
  }, []);

  async function loadReports(uid: string) {
    if (!uid) return;
    
    try {
      console.log('Fetching reports for userId:', uid);
      const res = await fetch(`${API_URL}/api/admin/reports?userId=${encodeURIComponent(uid)}`);
      console.log('Reports response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Reports error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch reports');
      }
      
      const data = await res.json();
      console.log('Reports data:', data);
      setReports(data.reports || []);
    } catch (err: any) {
      console.error('Failed to load reports', err);
      showToast(err.message || 'Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(reportId: string, action: 'ACCEPT' | 'REJECT' | 'DISMISS') {
    if (!userId) return;

    const actionNames = {
      ACCEPT: 'accept',
      REJECT: 'reject',
      DISMISS: 'dismiss',
    };

    const confirmMessages = {
      ACCEPT: 'This will increment the reported user\'s report counter. Continue?',
      REJECT: 'This will increment the reporter\'s report counter (false report). Continue?',
      DISMISS: 'This will close the report without any action. Continue?',
    };

    const ok = await confirm({
      title: `${actionNames[action].charAt(0).toUpperCase() + actionNames[action].slice(1)} Report`,
      message: confirmMessages[action],
      confirmText: actionNames[action].charAt(0).toUpperCase() + actionNames[action].slice(1),
    });

    if (!ok) return;

    setProcessing(reportId);

    try {
      const res = await fetch(`${API_URL}/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to process report');
      }

      showToast(`Report ${actionNames[action]}ed successfully`, 'success');
      
      // Remove from local state
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err: any) {
      console.error('Failed to process report', err);
      showToast(err.message || 'Failed to process report', 'error');
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading reports..." />;
  }

  if (!userId) {
    return (
      <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg-main)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Please log in to view this page.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg-main)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--accent-primary)' }}>Access Denied</h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>You must be an admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--bg-main)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--accent-primary)' }}>
            🚨 Report Management
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Review and moderate user reports
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)' }}>
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>No pending reports</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>All reports have been reviewed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl p-6 border-2"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)', boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Report Content */}
                  <div className="flex-1 space-y-4">
                    {/* Reporter */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Reporter:</span>
                        <Link
                          href={`/profile/${report.reporter.username}`}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{report.reporter.username}</span>
                        </Link>
                      </div>
                    </div>

                    {/* Reported User */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Reported:</span>
                        <Link
                          href={`/profile/${report.reported.username}`}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{report.reported.username}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}>
                            💀 {report.reported.reportCount} reports
                          </span>
                        </Link>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="rounded-lg p-4" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>Reason:</p>
                      <p style={{ color: 'var(--text-main)' }}>{report.reason}</p>
                    </div>

                    {/* Date */}
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Submitted {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    <button
                      onClick={() => handleAction(report.id, 'ACCEPT')}
                      disabled={processing === report.id}
                      className="px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'var(--accent-success-bg)', color: 'var(--accent-success)', border: '1px solid var(--accent-success)' }}
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => handleAction(report.id, 'REJECT')}
                      disabled={processing === report.id}
                      className="px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)' }}
                    >
                      ✕ Reject
                    </button>
                    <button
                      onClick={() => handleAction(report.id, 'DISMISS')}
                      disabled={processing === report.id}
                      className="px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}
                    >
                      − Dismiss
                    </button>
                    <button
                      disabled
                      className="px-4 py-2 rounded-lg font-semibold text-sm transition-all opacity-50 cursor-not-allowed"
                      style={{ background: 'var(--accent-info-bg)', color: 'var(--accent-info)', border: '1px solid var(--accent-info-border)' }}
                      title="Coming soon"
                    >
                      💬 Contact
                    </button>
                  </div>
                </div>

                {processing === report.id && (
                  <div className="mt-4 flex items-center justify-center gap-2 py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Processing...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
