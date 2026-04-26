import React from 'react';
import Link from 'next/link';

type AccessRequirementType = 'riot-required' | 'account-required' | 'admin-only';

interface AccessRequirementModalProps {
  type: AccessRequirementType;
  countdown?: number;
}

export default function AccessRequirementModal({ type, countdown }: AccessRequirementModalProps) {
  if (type === 'riot-required') {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(5, 7, 14, 0.72)' }}>
        <div className="w-full max-w-md rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-accent-1)' }}>Riot Account Required</h2>
          <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            This section needs at least one connected Riot account. Link your Riot account first, then come back.
          </p>
          <div className="mt-5 flex gap-2">
            <Link
              href="/authenticate"
              className="px-4 py-2 rounded-lg font-semibold"
              style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
            >
              Link Riot Account
            </Link>
            <Link
              href="/profile"
              className="px-4 py-2 rounded-lg border font-semibold"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Go To Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'admin-only') {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(5, 7, 14, 0.72)' }}>
        <div className="w-full max-w-md rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-error)' }}>Admin Access Only</h2>
          <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            This area is restricted to administrators. Redirecting you in {countdown ?? 3} second{(countdown ?? 3) === 1 ? '' : 's'}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(5, 7, 14, 0.72)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-accent-1)' }}>Account Required</h2>
        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          You need a RiftEssence account to use this section. Sign in or create an account to continue.
        </p>
        <div className="mt-5 flex gap-2">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg font-semibold"
            style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg border font-semibold"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
