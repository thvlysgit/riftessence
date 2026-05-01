import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalUI } from '@components/GlobalUI';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function DeveloperApiAdmin() {
  const { user, loading } = useAuth();
  const { showToast } = useGlobalUI();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/');
      return;
    }

    async function checkAdminAndLoad() {
      try {
        if (!user?.id) {
          setIsAdmin(false);
          router.push('/404');
          return;
        }

        const res = await fetch(`${API_URL}/api/user/check-admin?userId=${encodeURIComponent(user.id)}`, {
          headers: getAuthHeader(),
        });
        const body = await res.json();
        if (!body?.isAdmin) {
          setIsAdmin(false);
          router.push('/404');
          return;
        }

        setIsAdmin(true);
        fetchData();
      } catch (err) {
        console.error(err);
        setIsAdmin(false);
        router.push('/404');
      }
    }

    checkAdminAndLoad();
  }, [user, loading, router]);

  async function fetchData() {
    setLoadingData(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/developer-api/dashboard`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      showToast('Failed to load developer API dashboard', 'error');
    } finally {
      setLoadingData(false);
    }
  }

  async function grantPriority(requestId: string) {
    try {
      const res = await fetch(`${API_URL}/api/admin/developer-api/requests/${encodeURIComponent(requestId)}/priority`, {
        method: 'PATCH',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed');
      showToast('Priority granted', 'success');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to grant priority', 'error');
    }
  }

  if (loading || isAdmin === null || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent-1)' }}></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const summary = data?.summary || {};

  return (
    <>
      <Head>
        <title>Developer API Admin</title>
      </Head>

      <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))' }}>
        <div className="border-b" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Developer API Admin</h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>Review applications, monitor usage, and grant priority access.</p>
            </div>
            <Link href="/admin" className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
              Back to Admin
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryCard label="Applications" value={Number(summary.applications || 0)} />
            <SummaryCard label="Requests" value={Number(summary.requests || 0)} />
            <SummaryCard label="Keys" value={Number(summary.keys || 0)} />
            <SummaryCard label="Priority Keys" value={Number(summary.priorityKeys || 0)} />
            <SummaryCard label="Usage Rows" value={Number(summary.usage || 0)} />
          </section>

          <section className="border rounded-xl p-5" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Applications</h2>
            {data?.applications?.length ? (
              <div className="space-y-3">
                {data.applications.map((app: any) => (
                  <div key={app.id} className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{app.name}</div>
                        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{app.description || 'No description provided.'}</div>
                      </div>
                      <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        Requests: {app.requestCount} | Keys: {app.keyCount} | Usage: {app.usageCount}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState text="No applications found." />}
          </section>

          <section className="border rounded-xl p-5" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Requests</h2>
            {data?.requests?.length ? (
              <div className="space-y-3">
                {data.requests.map((r: any) => (
                  <div key={r.id} className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.applicationName || 'Unknown app'}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Submitted {new Date(r.createdAt).toLocaleString()}</div>
                        <pre className="mt-2 text-xs p-2 rounded overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
{JSON.stringify(r.formResponses || {}, null, 2)}
                        </pre>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Key Prefix: {r.keyPrefix || 'N/A'}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Priority: {r.priorityAccess ? 'Yes' : 'No'}</div>
                        {!r.priorityAccess && (
                          <button onClick={() => grantPriority(r.id)} className="px-3 py-1 rounded text-sm" style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}>
                            Grant Priority
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState text="No requests found." />}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border rounded-xl p-5" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Keys</h2>
              {data?.keys?.length ? (
                <div className="space-y-2">
                  {data.keys.map((k: any) => (
                    <div key={k.id} className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{k.label || k.keyPrefix}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Active: {k.isActive ? 'Yes' : 'No'} | Priority: {k.isPriority ? 'Yes' : 'No'} | Last used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState text="No keys found." />}
            </div>

            <div className="border rounded-xl p-5" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Recent Usage</h2>
              {data?.usage?.length ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {data.usage.map((u: any) => (
                    <div key={u.id} className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{u.method} {u.endpoint}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        App: {u.applicationName || 'Unknown'} | Key: {u.keyPrefix || 'N/A'} | Status: {u.statusCode} | Latency: {u.latencyMs || 0}ms
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState text="No usage records found." />}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{text}</div>;
}
