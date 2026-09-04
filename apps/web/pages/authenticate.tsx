import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeader, markCookieSessionPresent } from '../utils/auth';
import { RiotIconConfirmation } from '../components/RiotIconConfirmation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Attempt = {
  id: string;
  targetIconId: number;
  status: 'AWAITING_CONFIRMATION' | 'ACTIVE' | 'VERIFIED' | 'FAILED';
  startedAt?: string | null;
  failureReason?: string | null;
};

function safeReturnUrl(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/profile';
}

export default function AuthenticatePage(): JSX.Element {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const [summonerName, setSummonerName] = useState('');
  const [region, setRegion] = useState('EUW');
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [changedIcon, setChangedIcon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discordCallbackHandled = useRef(false);
  const userId = user?.id;
  const loadStatus = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/user/riot-verification/status`, { headers: getAuthHeader(), credentials: 'include' });
    if (!response.ok) return;
    const data = await response.json();
    if (data.attempts?.[0]) setAttempt(data.attempts.find((item: Attempt) => ['ACTIVE', 'AWAITING_CONFIRMATION'].includes(item.status)) || data.attempts[0]);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('discord') === 'success' && !discordCallbackHandled.current) {
      discordCallbackHandled.current = true;
      markCookieSessionPresent();
      void refreshUser().then(() => router.replace(safeReturnUrl(params.get('returnUrl'))));
    }
  }, [refreshUser, router]);

  useEffect(() => {
    if (!loading && !user && router.query.discord !== 'success') void router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`);
  }, [loading, router, user]);

  useEffect(() => {
    if (userId) void loadStatus().catch(() => setError('Could not load verification status. Please refresh.'));
  }, [userId, loadStatus]);

  useEffect(() => {
    if (attempt?.status !== 'ACTIVE') return;
    const interval = window.setInterval(() => void loadStatus().catch(() => {}), 30_000);
    return () => window.clearInterval(interval);
  }, [attempt?.status, loadStatus]);

  const prepareAttempt = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await fetch(`${API_URL}/api/user/riot-verification/prepare`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, credentials: 'include', body: JSON.stringify({ summonerName, region }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not prepare verification.');
      setAttempt(data.attempt); setChangedIcon(false);
    } catch (requestError: any) { setError(requestError?.message || 'Could not prepare verification.'); }
    finally { setBusy(false); }
  };

  const confirmAttempt = async () => {
    if (!attempt || !changedIcon) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`${API_URL}/api/user/riot-verification/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, credentials: 'include', body: JSON.stringify({ attemptId: attempt.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start verification.');
      setAttempt(data.attempt); await refreshUser();
    } catch (requestError: any) { setError(requestError?.message || 'Could not start verification.'); }
    finally { setBusy(false); }
  };

  if (loading || !user) return <div className="min-h-screen" style={{ background: 'var(--bg-main)' }} />;
  const finalCheckAt = attempt?.startedAt ? new Date(new Date(attempt.startedAt).getTime() + 30 * 60_000) : null;

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-main)' }}>
      <section className="w-full max-w-xl rounded-xl p-6 sm:p-8" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>Link your Riot account</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>You are signed in to RiftEssence. Riot Sign-On is not available yet, so we verify ownership through a temporary profile-icon change.</p>
        {error && <p className="mt-5 rounded-lg p-3 text-sm" style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}>{error}</p>}

        {!attempt && <form onSubmit={prepareAttempt} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Riot ID<input value={summonerName} onChange={(event) => setSummonerName(event.target.value)} required placeholder="GameName#TAG" className="mt-1 w-full rounded-lg px-4 py-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-main)' }} /></label>
          <label className="block text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Region<select value={region} onChange={(event) => setRegion(event.target.value)} className="mt-1 w-full rounded-lg px-4 py-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-main)' }}>{['EUW', 'NA', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <button type="submit" disabled={busy} className="w-full rounded-lg px-4 py-3 font-bold disabled:opacity-60" style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}>{busy ? 'Finding account…' : 'Choose my verification icon'}</button>
        </form>}

        {attempt?.status === 'AWAITING_CONFIRMATION' && <div className="mt-6 space-y-5">
          <RiotIconConfirmation targetIconId={attempt.targetIconId} checked={changedIcon} onChange={setChangedIcon} />
          <button onClick={confirmAttempt} disabled={!changedIcon || busy} className="w-full rounded-lg px-4 py-3 font-bold disabled:opacity-60" style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}>{busy ? 'Starting checks…' : 'I changed my icon — start verification'}</button>
        </div>}

        {attempt?.status === 'ACTIVE' && <div className="mt-6 rounded-xl p-5" style={{ background: 'var(--accent-primary-bg)', border: '1px solid var(--accent-primary)' }}><h2 className="font-bold" style={{ color: 'var(--accent-primary)' }}>Riot connection pending verification</h2><p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Keep the assigned icon active. We check automatically at 5, 15, and 30 minutes; the final successful check verifies your account.</p>{finalCheckAt && <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Final check: {finalCheckAt.toLocaleString()}</p>}<p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>You can continue using RiftEssence and save ratings while this connection is pending. If Riot is delayed, keep the assigned icon until verification finishes.</p></div>}
        {attempt?.status === 'VERIFIED' && <p className="mt-6 rounded-lg p-4" style={{ background: 'var(--accent-success-bg)', color: 'var(--accent-success)' }}>Your Riot account is verified.</p>}
        {attempt?.status === 'FAILED' && <div className="mt-6 rounded-lg p-4" style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}><p>{attempt.failureReason || 'Verification did not complete.'}</p><button onClick={() => { setAttempt(null); setChangedIcon(false); }} className="mt-3 text-sm font-bold underline">Start a new attempt</button></div>}
        {attempt?.status === 'VERIFIED' && <button onClick={() => { setAttempt(null); setChangedIcon(false); }} className="mt-3 text-sm underline">Link another Riot account</button>}
        <Link href={safeReturnUrl(router.query.returnUrl)} className="mt-6 inline-block text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>Return to RiftEssence</Link>
      </section>
    </main>
  );
}
