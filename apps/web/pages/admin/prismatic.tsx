import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalUI } from '../../../api/components/GlobalUI';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const QUICK_AMOUNTS = [250, 500, 1000, 2500, 5000, 10000] as const;

type GrantResult = {
  action?: 'GRANT' | 'REMOVE';
  amount: number;
  reason: string | null;
  target: {
    id: string;
    username: string;
  };
  admin: {
    id: string;
    username: string;
  };
  newBalance: number;
  createdAt: string;
};

export default function AdminPrismaticGrantPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showToast } = useGlobalUI();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [actionMode, setActionMode] = useState<'grant' | 'remove'>('grant');
  const [targetMode, setTargetMode] = useState<'self' | 'user'>('self');
  const [targetUsername, setTargetUsername] = useState('');
  const [amount, setAmount] = useState(500);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastGrant, setLastGrant] = useState<GrantResult | null>(null);

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
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
        router.push('/404');
      }
    }

    checkAdminStatus();
  }, [user, loading, router]);

  const normalizedAmount = useMemo(() => {
    const parsed = Math.round(Number(amount) || 0);
    return Math.max(1, Math.min(1_000_000, parsed));
  }, [amount]);

  const canSubmit = normalizedAmount > 0 && (targetMode === 'self' || targetUsername.trim().length > 1);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      showToast('Select a target and amount first.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const headers = getAuthHeader();
      if (!headers) {
        showToast('You need to be signed in as admin.', 'error');
        return;
      }

      const payload = actionMode === 'grant'
        ? (targetMode === 'self'
          ? {
              grantToSelf: true,
              amount: normalizedAmount,
              reason: reason.trim() || undefined,
            }
          : {
              grantToSelf: false,
              targetUsername: targetUsername.trim(),
              amount: normalizedAmount,
              reason: reason.trim() || undefined,
            })
        : (targetMode === 'self'
          ? {
              removeFromSelf: true,
              amount: normalizedAmount,
              reason: reason.trim() || undefined,
            }
          : {
              removeFromSelf: false,
              targetUsername: targetUsername.trim(),
              amount: normalizedAmount,
              reason: reason.trim() || undefined,
            });

      const endpoint = actionMode === 'grant'
        ? '/api/wallet/admin/grant-pe'
        : '/api/wallet/admin/remove-pe';

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to grant PE.');
      }

      const result = data?.grant || data?.adjustment || null;
      setLastGrant(result);

      if (actionMode === 'grant') {
        showToast(
          `Granted ${normalizedAmount.toLocaleString()} PE to ${result?.target?.username || 'user'}.`,
          'success'
        );
      } else {
        showToast(
          `Removed ${normalizedAmount.toLocaleString()} PE from ${result?.target?.username || 'user'}.`,
          'success'
        );
      }

      if (targetMode === 'self') {
        setReason('');
      }
    } catch (error: any) {
      showToast(error?.message || 'Failed to grant PE.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
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
        <title>Prismatic Controls | Admin Dashboard</title>
        <meta name="description" content="Grant or remove Prismatic Essence from users via the admin panel" />
      </Head>

      <div className="min-h-screen" style={{ background: 'linear-gradient(140deg, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>✨ Prismatic Essence Controls</h1>
              <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Grant or remove PE for yourself or any user by username.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                ← Admin Dashboard
              </Link>
            </div>
          </div>

          <div
            className="rounded-2xl border p-5 sm:p-6"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-lg)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Action
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActionMode('grant')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: actionMode === 'grant' ? 'var(--accent-primary-bg)' : 'var(--color-bg-tertiary)',
                      color: actionMode === 'grant' ? 'var(--accent-primary)' : 'var(--color-text-secondary)',
                      border: `1px solid ${actionMode === 'grant' ? 'var(--accent-primary-border)' : 'var(--color-border)'}`,
                    }}
                  >
                    Grant PE
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionMode('remove')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: actionMode === 'remove' ? 'rgba(239,68,68,0.14)' : 'var(--color-bg-tertiary)',
                      color: actionMode === 'remove' ? '#fca5a5' : 'var(--color-text-secondary)',
                      border: `1px solid ${actionMode === 'remove' ? 'rgba(239,68,68,0.34)' : 'var(--color-border)'}`,
                    }}
                  >
                    Remove PE
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Target
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetMode('self')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: targetMode === 'self' ? 'var(--accent-primary-bg)' : 'var(--color-bg-tertiary)',
                      color: targetMode === 'self' ? 'var(--accent-primary)' : 'var(--color-text-secondary)',
                      border: `1px solid ${targetMode === 'self' ? 'var(--accent-primary-border)' : 'var(--color-border)'}`,
                    }}
                  >
                    {actionMode === 'grant' ? 'Apply To Myself' : 'Remove From Myself'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('user')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: targetMode === 'user' ? 'var(--accent-primary-bg)' : 'var(--color-bg-tertiary)',
                      color: targetMode === 'user' ? 'var(--accent-primary)' : 'var(--color-text-secondary)',
                      border: `1px solid ${targetMode === 'user' ? 'var(--accent-primary-border)' : 'var(--color-border)'}`,
                    }}
                  >
                    {actionMode === 'grant' ? 'Apply To User' : 'Remove From User'}
                  </button>
                </div>
              </div>

              {targetMode === 'user' && (
                <label className="block">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Target Username</span>
                  <input
                    type="text"
                    value={targetUsername}
                    onChange={(event) => setTargetUsername(event.target.value)}
                    placeholder="Enter in-app username"
                    className="w-full mt-2 px-3 py-2 rounded-lg"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                  />
                </label>
              )}

              <div>
                <label className="block">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Amount (PE)</span>
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    value={amount}
                    onChange={(event) => setAmount(Number(event.target.value) || 1)}
                    className="w-full mt-2 px-3 py-2 rounded-lg"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                  />
                </label>

                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setAmount(entry)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary-border)' }}
                    >
                      {entry.toLocaleString()} PE
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Reason (optional)</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value.slice(0, 180))}
                  rows={3}
                  maxLength={180}
                  className="w-full mt-2 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                  placeholder="Example: reimbursement, tournament prize, manual support adjustment"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{reason.length}/180</p>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {actionMode === 'grant' ? 'Granting ' : 'Removing '}
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{normalizedAmount.toLocaleString()} PE</span>
                  {targetMode === 'self'
                    ? actionMode === 'grant' ? ' to your own account.' : ' from your own account.'
                    : `${actionMode === 'grant' ? ' to ' : ' from '}${targetUsername.trim() || 'the selected user'}.`}
                </p>
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold"
                  style={{
                    background: !canSubmit || submitting ? 'var(--color-bg-tertiary)' : 'var(--btn-gradient)',
                    color: !canSubmit || submitting ? 'var(--color-text-muted)' : 'var(--btn-gradient-text)',
                    border: '1px solid var(--accent-primary-border)',
                  }}
                >
                  {submitting
                    ? actionMode === 'grant' ? 'Granting...' : 'Removing...'
                    : actionMode === 'grant' ? 'Grant Prismatic Essence' : 'Remove Prismatic Essence'}
                </button>
              </div>
            </form>
          </div>

          {lastGrant && (
            <div
              className="mt-6 rounded-2xl border p-5"
              style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--accent-primary-border)', boxShadow: 'var(--shadow)' }}
            >
              <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--accent-primary)' }}>
                Last Action Executed
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Target</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{lastGrant.target.username}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Amount</p>
                  <p className="text-sm font-semibold" style={{ color: (lastGrant.action || 'GRANT') === 'REMOVE' ? '#fca5a5' : 'var(--accent-primary)' }}>
                    {(lastGrant.action || 'GRANT') === 'REMOVE' ? '-' : '+'}{lastGrant.amount.toLocaleString()} PE
                  </p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>New Balance</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{lastGrant.newBalance.toLocaleString()} PE</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Timestamp</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {new Date(lastGrant.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {lastGrant.reason && (
                <p className="text-sm mt-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Reason: {lastGrant.reason}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
