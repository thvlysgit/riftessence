import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';
import { LoadingSpinner } from '@components/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalUI } from '@components/GlobalUI';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
type Incident = {
  id: string;
  kind: string;
  severity: 'WARNING' | 'ERROR' | 'FATAL';
  status: IncidentStatus;
  message: string;
  stack?: string | null;
  route?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  userId?: string | null;
  instanceKey?: string | null;
  release?: string | null;
  metadata?: Record<string, unknown> | null;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolutionNote?: string | null;
};

type ProcessRun = {
  id: string;
  instanceKey: string;
  release?: string | null;
  status: string;
  startedAt: string;
  heartbeatAt: string;
  stoppedAt?: string | null;
  stopReason?: string | null;
  rssMb?: number | null;
  heapUsedMb?: number | null;
  heapTotalMb?: number | null;
};

type WorkerState = {
  name: string;
  status: string;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
  runs: number;
  failures: number;
};

type DiagnosticsPayload = {
  runtime: {
    status: string;
    instanceKey: string;
    release: string | null;
    startedAt: string;
    uptimeSeconds: number;
    nodeVersion: string;
    persistenceAvailable: boolean;
    memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number; externalMb: number };
    workers: WorkerState[];
  };
  database: { status: string; latencyMs?: number };
  summary: { openCount: number; fatalCount: number };
  matchedUser?: { id: string; username: string } | null;
  incidents: Incident[];
  processRuns: ProcessRun[];
};

function formatDate(value?: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}m`].filter(Boolean).join(' ');
}

function badgeColor(value: string): string {
  if (value === 'FATAL' || value === 'CRASHED' || value === 'failed') return 'var(--color-error)';
  if (value === 'WARNING' || value === 'ACKNOWLEDGED') return 'var(--color-warning)';
  if (value === 'OPEN' || value === 'ERROR') return 'var(--color-accent-1)';
  return 'var(--color-success)';
}

export default function AdminDiagnosticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useGlobalUI();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('OPEN');
  const [userFilter, setUserFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ status: 'OPEN', user: '', route: '' });
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [updatingIncident, setUpdatingIncident] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async (quiet = false) => {
    if (!user) return;
    if (!quiet) setRefreshing(true);
    const params = new URLSearchParams({ limit: '100' });
    if (appliedFilters.status) params.set('status', appliedFilters.status);
    if (appliedFilters.user) params.set('user', appliedFilters.user);
    if (appliedFilters.route) params.set('route', appliedFilters.route);
    try {
      const response = await fetch(`${API_URL}/api/admin/diagnostics?${params.toString()}`, {
        headers: getAuthHeader(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not load API diagnostics.');
      setData(payload);
    } catch (error: any) {
      showToast(error.message || 'Could not load API diagnostics.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedFilters, showToast, user]);

  useEffect(() => {
    if (!router.isReady || typeof router.query.user !== 'string') return;
    const requestedUser = router.query.user.trim();
    setUserFilter(requestedUser);
    setAppliedFilters((current) => ({ ...current, user: requestedUser }));
  }, [router.isReady, router.query.user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch(`${API_URL}/api/user/check-admin`, { headers: getAuthHeader() });
        const payload = await response.json();
        if (cancelled) return;
        if (!response.ok || !payload.isAdmin) {
          setIsAdmin(false);
          router.replace('/404');
          return;
        }
        setIsAdmin(true);
      } catch {
        if (!cancelled) router.replace('/404');
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadDiagnostics(true);
    const timer = window.setInterval(() => void loadDiagnostics(true), 15_000);
    return () => window.clearInterval(timer);
  }, [isAdmin, loadDiagnostics]);

  const updateIncident = async (incident: Incident, nextStatus: IncidentStatus) => {
    setUpdatingIncident(incident.id);
    let note: string | null = null;
    if (nextStatus === 'RESOLVED') {
      note = window.prompt('Optional resolution note:', incident.resolutionNote || '')?.trim() || null;
    }
    try {
      const response = await fetch(`${API_URL}/api/admin/diagnostics/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, note }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not update incident.');
      showToast(`Incident marked ${nextStatus.toLowerCase()}.`, 'success');
      await loadDiagnostics(true);
    } catch (error: any) {
      showToast(error.message || 'Could not update incident.', 'error');
    } finally {
      setUpdatingIncident(null);
    }
  };

  if (authLoading || isAdmin === null || loading) return <LoadingSpinner />;
  if (!isAdmin) return null;

  return (
    <>
      <Head>
        <title>API Diagnostics | RiftEssence Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="min-h-screen px-4 py-8" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href="/admin" className="text-sm" style={{ color: 'var(--color-accent-1)' }}>← Admin dashboard</Link>
              <h1 className="mt-2 text-3xl font-bold">API diagnostics</h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Retained server failures, unclean restarts, resource usage, and background-worker health.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadDiagnostics()}
              disabled={refreshing}
              className="rounded-lg px-4 py-2 font-semibold disabled:opacity-60"
              style={{ background: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
            >
              {refreshing ? 'Refreshing…' : 'Refresh now'}
            </button>
          </header>

          {data ? (
            <>
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="API status summary">
                <Metric label="API" value={data.runtime.status} detail={`Up ${formatUptime(data.runtime.uptimeSeconds)}`} tone="good" />
                <Metric label="Database" value={data.database.status} detail={`${data.database.latencyMs ?? '—'} ms`} tone={data.database.status === 'ok' ? 'good' : 'bad'} />
                <Metric label="Open incidents" value={String(data.summary.openCount)} detail={`${data.summary.fatalCount} fatal`} tone={data.summary.fatalCount ? 'bad' : data.summary.openCount ? 'warn' : 'good'} />
                <Metric label="Memory RSS" value={`${data.runtime.memory.rssMb} MB`} detail={`Heap ${data.runtime.memory.heapUsedMb}/${data.runtime.memory.heapTotalMb} MB`} tone="neutral" />
                <Metric label="Persistence" value={data.runtime.persistenceAvailable ? 'active' : 'unavailable'} detail={data.runtime.instanceKey} tone={data.runtime.persistenceAvailable ? 'good' : 'bad'} />
              </section>

              <section className="rounded-xl border p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <form
                  className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const nextFilters = { status, user: userFilter.trim(), route: routeFilter.trim() };
                    if (JSON.stringify(nextFilters) === JSON.stringify(appliedFilters)) void loadDiagnostics();
                    else setAppliedFilters(nextFilters);
                  }}
                >
                  <label className="text-sm">
                    <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Username or user ID</span>
                    <input value={userFilter} onChange={(event) => setUserFilter(event.target.value)} placeholder="thvlys" className="w-full rounded-lg border px-3 py-2" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }} />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Route contains</span>
                    <input value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)} placeholder="/api/user/profile" className="w-full rounded-lg border px-3 py-2" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }} />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Status</span>
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border px-3 py-2" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
                      <option value="">All</option>
                      <option value="OPEN">Open</option>
                      <option value="ACKNOWLEDGED">Acknowledged</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </label>
                  <button type="submit" className="self-end rounded-lg border px-4 py-2 font-semibold" style={{ borderColor: 'var(--color-accent-1)', color: 'var(--color-accent-1)' }}>Apply</button>
                </form>
                {appliedFilters.user && (
                  <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {data.matchedUser ? `Matched ${data.matchedUser.username} (${data.matchedUser.id})` : 'No user matched this filter.'}
                  </p>
                )}
              </section>

              <section>
                <h2 className="mb-3 text-xl font-semibold">Incidents</h2>
                <div className="space-y-3">
                  {data.incidents.length === 0 ? (
                    <EmptyState text="No incidents match these filters." />
                  ) : data.incidents.map((incident) => {
                    const expanded = expandedIncident === incident.id;
                    return (
                      <article key={incident.id} className="rounded-xl border p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpandedIncident(expanded ? null : incident.id)} aria-expanded={expanded}>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge text={incident.severity} />
                              <StatusBadge text={incident.status} />
                              <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>{incident.kind}</span>
                              <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--color-bg-tertiary)' }}>×{incident.occurrences}</span>
                            </div>
                            <p className="mt-2 break-words font-medium">{incident.message}</p>
                            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {incident.method || '—'} {incident.route || 'process'} · HTTP {incident.statusCode || '—'} · last {formatDate(incident.lastSeenAt)}
                            </p>
                          </button>
                          <div className="flex flex-wrap gap-2">
                            {incident.status !== 'ACKNOWLEDGED' && <ActionButton disabled={updatingIncident === incident.id} onClick={() => void updateIncident(incident, 'ACKNOWLEDGED')}>Acknowledge</ActionButton>}
                            {incident.status !== 'RESOLVED' && <ActionButton disabled={updatingIncident === incident.id} onClick={() => void updateIncident(incident, 'RESOLVED')}>Resolve</ActionButton>}
                            {incident.status !== 'OPEN' && <ActionButton disabled={updatingIncident === incident.id} onClick={() => void updateIncident(incident, 'OPEN')}>Reopen</ActionButton>}
                          </div>
                        </div>
                        {expanded && (
                          <div className="mt-4 space-y-3 border-t pt-4 text-xs" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="grid gap-2 md:grid-cols-2">
                              <Detail label="User ID" value={incident.userId} />
                              <Detail label="Request ID" value={incident.requestId} />
                              <Detail label="Instance" value={incident.instanceKey} />
                              <Detail label="Release" value={incident.release} />
                              <Detail label="First seen" value={formatDate(incident.firstSeenAt)} />
                              <Detail label="Last seen" value={formatDate(incident.lastSeenAt)} />
                            </div>
                            {incident.stack && <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg p-3" style={{ background: 'var(--color-bg-primary)' }}>{incident.stack}</pre>}
                            {incident.metadata && <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg p-3" style={{ background: 'var(--color-bg-primary)' }}>{JSON.stringify(incident.metadata, null, 2)}</pre>}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h2 className="mb-3 text-xl font-semibold">Background workers</h2>
                  <div className="space-y-3">
                    {data.runtime.workers.length === 0 ? <EmptyState text="No worker run has been observed since this API process started." /> : data.runtime.workers.map((worker) => (
                      <div key={worker.name} className="rounded-xl border p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center justify-between gap-3"><strong>{worker.name}</strong><StatusBadge text={worker.status} /></div>
                        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>Runs {worker.runs} · failures {worker.failures} · last duration {worker.lastDurationMs ?? '—'} ms</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Last success {formatDate(worker.lastSucceededAt)} · last failure {formatDate(worker.lastFailedAt)}</p>
                        {worker.lastError && <p className="mt-2 text-xs" style={{ color: 'var(--color-error)' }}>{worker.lastError}</p>}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="mb-3 text-xl font-semibold">Recent process runs</h2>
                  <div className="space-y-3">
                    {data.processRuns.map((run) => (
                      <div key={run.id} className="rounded-xl border p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center justify-between gap-3"><span className="truncate font-mono text-xs">{run.instanceKey}</span><StatusBadge text={run.status} /></div>
                        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>Started {formatDate(run.startedAt)} · heartbeat {formatDate(run.heartbeatAt)}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>RSS {run.rssMb ?? '—'} MB · heap {run.heapUsedMb ?? '—'}/{run.heapTotalMb ?? '—'} MB</p>
                        {run.stopReason && <p className="mt-2 text-xs" style={{ color: run.status === 'CRASHED' ? 'var(--color-error)' : 'var(--color-text-muted)' }}>{run.stopReason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : <EmptyState text="Diagnostics could not be loaded." />}
        </div>
      </main>
    </>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }) {
  const color = tone === 'good' ? 'var(--color-success)' : tone === 'warn' ? 'var(--color-warning)' : tone === 'bad' ? 'var(--color-error)' : 'var(--color-accent-1)';
  return <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}><p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</p><p className="mt-1 text-xl font-bold" style={{ color }}>{value}</p><p className="mt-1 truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>{detail}</p></div>;
}

function StatusBadge({ text }: { text: string }) {
  return <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: badgeColor(text), color: '#fff' }}>{text}</span>;
}

function ActionButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ borderColor: 'var(--color-border)' }}>{children}</button>;
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return <p><span style={{ color: 'var(--color-text-muted)' }}>{label}: </span><span className="break-all font-mono">{value || '—'}</span></p>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border p-8 text-center text-sm" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{text}</div>;
}
