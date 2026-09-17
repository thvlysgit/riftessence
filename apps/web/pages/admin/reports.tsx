import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGlobalUI } from '@components/GlobalUI';
import { LoadingSpinner } from '@components/LoadingSpinner';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Report = {
  id: string;
  reason: string;
  evidenceUrls: string[];
  contactDiscord?: string | null;
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

type BugReport = {
  id: string;
  description: string;
  pageUrl?: string | null;
  contactDiscord?: string | null;
  evidenceUrls: string[];
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  forwardedAt?: string | null;
  reporter?: { id: string; username: string } | null;
};

function EvidenceList({ urls }: { urls?: string[] }) {
  if (!urls?.length) return null;
  return (
    <div className="mt-3 text-sm">
      <strong style={{ color: 'var(--text-secondary)' }}>Evidence:</strong>
      <ul className="list-disc pl-5">
        {urls.map((url) => <li key={url} className="break-all"><a href={url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent-primary)' }}>{url}</a></li>)}
      </ul>
    </div>
  );
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [bugFilter, setBugFilter] = useState<'OPEN' | 'RESOLVED'>('OPEN');
  const [channelId, setChannelId] = useState('');
  const [savingChannel, setSavingChannel] = useState(false);
  const [bugProcessing, setBugProcessing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { showToast, confirm } = useGlobalUI();

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch(`${API_URL}/api/user/profile`, { headers: getAuthHeader(), credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUserId(data.id);
          const adminCheck = data.badges?.some((b: any) =>
            (typeof b === 'string' ? b : (b.key || b.name || '')).toLowerCase() === 'admin'
          );
          setIsAdmin(adminCheck);
          
          if (adminCheck) {
            loadReports();
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    }

    checkAdmin();
  }, []);

  async function loadReports(status: 'OPEN' | 'RESOLVED' = bugFilter) {
    try {
      const [userResponse, bugResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/reports`, { headers: getAuthHeader(), credentials: 'include' }),
        fetch(`${API_URL}/api/admin/bug-reports?status=${status}`, { headers: getAuthHeader(), credentials: 'include' }),
      ]);
      if (!userResponse.ok || !bugResponse.ok) throw new Error('Failed to fetch reports');
      const [users, bugs] = await Promise.all([userResponse.json(), bugResponse.json()]);
      setReports(users.reports || []);
      setBugReports(bugs.reports || []);
      setChannelId(bugs.channelId || '');
    } catch (err: any) {
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
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
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

  async function saveChannel(event: React.FormEvent) {
    event.preventDefault();
    setSavingChannel(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/bug-report-settings`, {
        method: 'PUT',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channelId: channelId.trim() }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not save channel');
      showToast('Bug report channel updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save channel', 'error');
    } finally {
      setSavingChannel(false);
    }
  }

  async function handleBugAction(id: string, action: 'RESOLVE' | 'REOPEN') {
    setBugProcessing(id);
    try {
      const response = await fetch(`${API_URL}/api/admin/bug-reports/${id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update bug report');
      setBugReports((current) => current.filter((report) => report.id !== id));
      showToast(action === 'RESOLVE' ? 'Bug report resolved' : 'Bug report reopened', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update bug report', 'error');
    } finally {
      setBugProcessing(null);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
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
            Review user reports and bug reports
          </p>
        </div>

        <section className="mb-12" aria-labelledby="bug-reports-heading">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <h2 id="bug-reports-heading" className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Bug reports ({bugReports.length})</h2>
              <div className="flex gap-1" aria-label="Bug report status">
                {(['OPEN', 'RESOLVED'] as const).map((status) => (
                  <button key={status} type="button" onClick={() => { setBugFilter(status); void loadReports(status); }} aria-pressed={bugFilter === status} className="rounded px-3 py-1 text-sm" style={{ background: bugFilter === status ? 'var(--accent-primary-bg)' : 'var(--bg-input)', color: bugFilter === status ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{status === 'OPEN' ? 'Open' : 'Resolved'}</button>
                ))}
              </div>
              <button type="button" onClick={() => void loadReports()} className="text-sm underline" style={{ color: 'var(--accent-primary)' }}>Refresh</button>
            </div>
            <form onSubmit={saveChannel} className="flex flex-wrap items-end gap-2">
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Bot forwarding channel ID
                <input className="block mt-1 rounded p-2" style={{ background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-card)' }} value={channelId} onChange={(event) => setChannelId(event.target.value)} inputMode="numeric" pattern="[0-9]{17,20}" required />
              </label>
              <button type="submit" disabled={savingChannel} className="rounded px-4 py-2" style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}>Save channel</button>
            </form>
          </div>
          {bugReports.length === 0 ? (
            <p className="rounded-xl p-6" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>No {bugFilter.toLowerCase()} bug reports.</p>
          ) : <div className="space-y-4">{bugReports.map((report) => (
            <article key={report.id} className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-main)' }}>{report.reporter?.username || 'Guest'} · {new Date(report.createdAt).toLocaleString()}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Discord contact: {report.contactDiscord || 'Not provided'} · Bot: {report.forwardedAt ? 'Forwarded' : 'Waiting for bot delivery'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={bugProcessing === report.id} onClick={() => handleBugAction(report.id, report.status === 'OPEN' ? 'RESOLVE' : 'REOPEN')} className="rounded px-3 py-2" style={{ border: '1px solid var(--accent-success)', color: 'var(--accent-success)' }}>{report.status === 'OPEN' ? 'Resolve' : 'Reopen'}</button>
                </div>
              </div>
              <p className="my-3 whitespace-pre-wrap" style={{ color: 'var(--text-main)' }}>{report.description}</p>
              {report.pageUrl && <p className="text-sm break-all" style={{ color: 'var(--text-secondary)' }}>Page: {report.pageUrl}</p>}
              <EvidenceList urls={report.evidenceUrls} />
            </article>
          ))}</div>}
        </section>

        <h2 className="text-2xl font-bold mb-5" style={{ color: 'var(--text-main)' }}>User reports ({reports.length})</h2>

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
                          href={`/profile/${encodeURIComponent(report.reporter.username)}`}
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
                          href={`/profile/${encodeURIComponent(report.reported.username)}`}
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
                      {report.contactDiscord && <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Discord contact: {report.contactDiscord}</p>}
                      <EvidenceList urls={report.evidenceUrls} />
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
