import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalUI } from '@components/GlobalUI';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function DeveloperApiAdmin() {
  const { user, loading } = useAuth();
  const { showToast } = useGlobalUI();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/');
      return;
    }
    fetchData();
  }, [user, loading]);

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

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent-1)' }}></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Head>
        <title>Developer API Admin</title>
      </Head>

      <h1 className="text-2xl font-bold mb-4">Developer API — Admin</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Applications</h2>
        <div className="border rounded p-4 bg-white">
          {data?.applications?.length ? (
            <ul>
              {data.applications.map((app: any) => (
                <li key={app.id} className="py-2 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{app.name}</div>
                      <div className="text-sm text-gray-600">{app.description}</div>
                    </div>
                    <div className="text-sm text-gray-700">Requests: {app.requestCount} • Keys: {app.keyCount}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-600">No applications found.</div>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Pending Requests</h2>
        <div className="border rounded p-4 bg-white">
          {data?.requests?.length ? (
            <ul>
              {data.requests.map((r: any) => (
                <li key={r.id} className="py-3 border-b flex justify-between items-start">
                  <div>
                    <div className="font-medium">{r.applicationName || '—'}</div>
                    <div className="text-sm text-gray-600">{JSON.stringify(r.formResponses).slice(0, 180)}</div>
                    <div className="text-xs text-gray-500">Submitted: {new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    {!r.priorityAccess && (
                      <button onClick={() => grantPriority(r.id)} className="px-3 py-1 rounded bg-blue-600 text-white">Grant Priority</button>
                    )}
                    <div className="text-xs text-gray-500">Key: {r.keyPrefix || '—'}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-600">No requests found.</div>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Keys</h2>
        <div className="border rounded p-4 bg-white">
          {data?.keys?.length ? (
            <ul>
              {data.keys.map((k: any) => (
                <li key={k.id} className="py-2 border-b flex justify-between items-center">
                  <div>
                    <div className="font-medium">{k.label || k.keyPrefix}</div>
                    <div className="text-sm text-gray-600">Active: {k.isActive ? 'Yes' : 'No'} • Priority: {k.isPriority ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="text-sm text-gray-700">Last Used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-600">No keys found.</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Recent Usage</h2>
        <div className="border rounded p-4 bg-white">
          {data?.usage?.length ? (
            <ul>
              {data.usage.map((u: any) => (
                <li key={u.id} className="py-2 border-b flex justify-between items-center">
                  <div>
                    <div className="text-sm">{u.method} {u.endpoint}</div>
                    <div className="text-xs text-gray-500">App: {u.applicationName || '—'} • Key: {u.keyPrefix || '—'}</div>
                  </div>
                  <div className="text-sm text-gray-700">{u.statusCode} • {u.latencyMs || 0}ms</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-600">No usage records found.</div>
          )}
        </div>
      </section>
    </div>
  );
}
