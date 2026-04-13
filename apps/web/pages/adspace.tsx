import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaBullhorn, FaCheckCircle, FaExternalLinkAlt, FaImage, FaLink, FaPen, FaWallet } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from '../../api/components/GlobalUI';
import { getAuthHeader } from '../utils/auth';
import PrismaticEssenceIcon from '../src/components/PrismaticEssenceIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type AdspaceStatus = {
  adCredits: number;
  wallet: {
    prismaticEssence: number;
  };
};

const EMPTY_STATUS: AdspaceStatus = {
  adCredits: 0,
  wallet: {
    prismaticEssence: 0,
  },
};

export default function AdspacePage() {
  const { user } = useAuth();
  const { showToast } = useGlobalUI();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AdspaceStatus>(EMPTY_STATUS);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [feed, setFeed] = useState<'all' | 'duo' | 'lft'>('all');
  const [days, setDays] = useState(3);

  const authHeaders = useCallback(() => {
    const headers = getAuthHeader();
    if (!headers || !('Authorization' in headers)) return null;
    return headers as Record<string, string>;
  }, []);

  const loadStatus = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return EMPTY_STATUS;

    const res = await fetch(`${API_URL}/api/wallet/cosmetics`, { headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load adspace status.');
    }

    return {
      adCredits: Number(data?.adCredits || 0),
      wallet: {
        prismaticEssence: Number(data?.wallet?.prismaticEssence || 0),
      },
    } as AdspaceStatus;
  }, [authHeaders]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await loadStatus();
        if (!active) return;
        setStatus(data);
      } catch (error: any) {
        if (!active) return;
        showToast(error?.message || 'Failed to load adspace data.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [user, loadStatus, showToast]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) return;
    if (status.adCredits < 1) {
      showToast('You need an ad credit first.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const headers = authHeaders();
      if (!headers) {
        throw new Error('Please sign in first.');
      }

      const payload = {
        title,
        description,
        imageUrl,
        targetUrl,
        feed: feed === 'all' ? undefined : feed,
        days,
      };

      const res = await fetch(`${API_URL}/api/ads/request-slot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to submit ad request.');
      }

      showToast('Ad request submitted. It will go live after review.', 'success');
      setTitle('');
      setDescription('');
      setImageUrl('');
      setTargetUrl('');
      setFeed('all');
      setDays(3);

      const nextStatus = await loadStatus();
      setStatus(nextStatus);
    } catch (error: any) {
      showToast(error?.message || 'Failed to submit ad request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-10" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-center py-24">
          <div
            className="h-14 w-14 rounded-full animate-spin border-4 border-t-transparent"
            style={{ borderColor: '#67e8f9', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen px-4 py-10" style={{ background: 'var(--color-bg-primary)' }}>
        <div
          className="max-w-2xl mx-auto rounded-2xl border p-8 text-center"
          style={{
            border: '2px solid var(--border-card)',
            background: 'var(--bg-card)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--accent-primary)' }}>Adspace</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to use ad credits and submit an ad slot request.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold"
            style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}
          >
            <PrismaticEssenceIcon className="text-lg" />
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        background: `
          radial-gradient(920px 460px at 8% -12%, rgba(200,170,110,0.16), transparent 60%),
          radial-gradient(720px 380px at 100% 0%, rgba(34,197,94,0.1), transparent 62%),
          var(--color-bg-primary)
        `,
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <header
          className="rounded-2xl border p-6"
          style={{
            border: '2px solid var(--border-card)',
            background: 'var(--bg-card)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-secondary)' }}>
                Community Promotion
              </p>
              <h1 className="text-3xl font-black mb-2 flex items-center gap-3" style={{ color: 'var(--accent-primary)' }}>
                <FaBullhorn />
                Adspace Request
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Spend ad credits to submit ad slots. Requests are reviewed before going live.
              </p>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Link
                  href="/cosmetics"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary-border)' }}
                >
                  <FaWallet /> Buy Ad Credits
                </Link>
                <Link
                  href="/purse"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(59,130,246,0.16)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.32)' }}
                >
                  <PrismaticEssenceIcon /> Purse
                </Link>
              </div>
            </div>

            <div className="text-right space-y-1 rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Ad Credits</p>
              <p className="text-3xl font-black" style={{ color: '#86efac' }}>{status.adCredits}</p>
              <p className="text-sm inline-flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <PrismaticEssenceIcon /> {status.wallet.prismaticEssence.toLocaleString()} PE
              </p>
            </div>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border p-6 space-y-4"
          style={{ border: '2px solid var(--border-card)', background: 'var(--bg-card)', boxShadow: 'var(--shadow)' }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                <FaPen className="inline mr-2" />Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                required
                className="w-full rounded-lg px-3 py-2"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--color-text-primary)' }}
                placeholder="Example: Scrim partner finder"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                <FaImage className="inline mr-2" />Image URL
              </span>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--color-text-primary)' }}
                placeholder="https://..."
              />
            </label>
          </div>

          <label className="text-sm block">
            <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>
              <FaLink className="inline mr-2" />Target URL
            </span>
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--color-text-primary)' }}
              placeholder="https://..."
            />
          </label>

          <label className="text-sm block">
            <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={220}
              className="w-full rounded-lg px-3 py-2"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--color-text-primary)' }}
              placeholder="One short line about the ad."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm block">
              <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Feed Target</span>
              <select
                value={feed}
                onChange={(e) => setFeed(e.target.value as 'all' | 'duo' | 'lft')}
                className="w-full rounded-lg px-3 py-2"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--color-text-primary)' }}
              >
                <option value="all">All feeds</option>
                <option value="duo">Duo only</option>
                <option value="lft">LFT only</option>
              </select>
            </label>

            <label className="text-sm block">
              <span className="mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Duration (days)</span>
              <input
                type="number"
                min={1}
                max={14}
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 1)}
                className="w-full rounded-lg px-3 py-2"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--color-text-primary)' }}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              1 ad credit is consumed per request.
            </p>
            <button
              type="submit"
              disabled={submitting || status.adCredits < 1}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: status.adCredits > 0
                  ? 'var(--btn-gradient)'
                  : 'var(--color-bg-tertiary)',
                color: status.adCredits > 0 ? 'var(--btn-gradient-text)' : 'var(--color-text-muted)',
                border: `1px solid ${status.adCredits > 0 ? 'var(--accent-primary-border)' : 'var(--color-border)'}`,
              }}
            >
              {submitting ? 'Submitting...' : (
                <>
                  <FaExternalLinkAlt /> Submit Request
                </>
              )}
            </button>
          </div>
        </form>

        <div className="rounded-xl border p-4" style={{ border: '1px solid var(--border-card)', background: 'var(--bg-input)' }}>
          <p className="text-sm inline-flex items-center gap-2" style={{ color: '#86efac' }}>
            <FaCheckCircle /> Staff review is required before an ad appears publicly.
          </p>
        </div>
      </div>
    </div>
  );
}
