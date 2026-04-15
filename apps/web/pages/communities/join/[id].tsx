import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getAuthToken, getUserIdFromToken, getAuthHeader } from '../../../utils/auth';
import { useGlobalUI } from '@components/GlobalUI';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function AutoJoinCommunityPage() {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useGlobalUI();
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'login' | 'error'>('loading');
  const [communityName, setCommunityName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) return;

    const token = getAuthToken();
    const userId = token ? getUserIdFromToken(token) : null;

    if (!userId) {
      setStatus('login');
      return;
    }

    autoJoin();
  }, [id]);

  const autoJoin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/communities/${id}/auto-join`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      const data = await res.json();

      if (res.ok) {
        setCommunityName(data.community?.name || '');
        if (data.alreadyMember) {
          setStatus('already');
          showToast('You are already a member!', 'info');
        } else {
          setStatus('success');
          showToast(`Joined ${data.community?.name || 'community'}!`, 'success');
        }
        // Redirect to community page after a brief delay
        setTimeout(() => {
          router.push(`/communities/${id}`);
        }, 2000);
      } else {
        setErrorMsg(data.error || 'Failed to join community');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div
        className="max-w-md w-full border p-8 text-center"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)',
        }}
      >
        {status === 'loading' && (
          <>
            <div className="text-4xl mb-4">⏳</div>
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Joining community...
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Please wait</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-accent-1)' }}>
              Welcome to {communityName || 'the community'}!
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              You've been added as a member. Redirecting...
            </p>
            <Link
              href={`/communities/${id}`}
              className="inline-block px-6 py-2 font-bold"
              style={{
                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                color: 'var(--color-bg-primary)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              Go to Community
            </Link>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="text-4xl mb-4">👋</div>
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Already a member!
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              You're already part of {communityName || 'this community'}. Redirecting...
            </p>
            <Link
              href={`/communities/${id}`}
              className="inline-block px-6 py-2 font-bold"
              style={{
                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                color: 'var(--color-bg-primary)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              Go to Community
            </Link>
          </>
        )}

        {status === 'login' && (
          <>
            <div className="text-4xl mb-4">🔒</div>
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Login Required
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              You need to be logged in to join a community.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/login?redirect=/communities/join/${id}`}
                className="inline-block px-6 py-2 font-bold"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                Log In
              </Link>
              <Link
                href={`/communities/${id}`}
                className="text-sm hover:opacity-80"
                style={{ color: 'var(--color-accent-1)' }}
              >
                View community page instead
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Couldn't Join
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {errorMsg}
            </p>
            <Link
              href="/communities"
              className="inline-block px-6 py-2 font-bold"
              style={{
                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                color: 'var(--color-bg-primary)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              Browse Communities
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
