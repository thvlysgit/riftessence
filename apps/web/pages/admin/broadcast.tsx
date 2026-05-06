// Admin Discord DM Broadcast
// Protected - requires admin badge
// Queues a Discord embed DM for eligible linked users

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useGlobalUI } from '@components/GlobalUI';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type BroadcastStats = {
  totalUsers: number;
  dmQueued: number;
  skippedNoDiscordOrDisabled: number;
};

type EmbedDraft = {
  title: string;
  description: string;
  color: string;
  url: string;
  footer: string;
  imageUrl: string;
};

const DEFAULT_EMBED: EmbedDraft = {
  title: '',
  description: '',
  color: '#5865F2',
  url: '',
  footer: 'RiftEssence',
  imageUrl: '',
};

function isOptionalUrlValid(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function AdminBroadcast() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useGlobalUI();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [draft, setDraft] = useState<EmbedDraft>(DEFAULT_EMBED);
  const [isSending, setIsSending] = useState(false);
  const [lastBroadcastStats, setLastBroadcastStats] = useState<BroadcastStats | null>(null);

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
        } else {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Failed to check admin status:', err);
        setIsAdmin(false);
        router.push('/404');
      }
    }

    checkAdminStatus();
  }, [user, loading, router]);

  const descriptionLength = draft.description.length;
  const isTitleValid = draft.title.trim().length >= 3 && draft.title.trim().length <= 256;
  const isDescriptionValid = descriptionLength >= 10 && descriptionLength <= 4000;
  const areLinksValid = isOptionalUrlValid(draft.url) && isOptionalUrlValid(draft.imageUrl);
  const isValid = isTitleValid && isDescriptionValid && areLinksValid;

  const previewColor = useMemo(() => {
    return /^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : '#5865F2';
  }, [draft.color]);

  const updateDraft = (key: keyof EmbedDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSendBroadcast = async () => {
    if (!isTitleValid) {
      showToast('Title must be between 3 and 256 characters.', 'error');
      return;
    }

    if (!isDescriptionValid) {
      showToast(descriptionLength < 10 ? t('admin.broadcastTooShort') : t('admin.broadcastTooLong'), 'error');
      return;
    }

    if (!areLinksValid) {
      showToast('Use valid http or https URLs for links and images.', 'error');
      return;
    }

    const confirmed = await confirm({
      title: t('admin.broadcastTitle'),
      message: t('admin.broadcastConfirm'),
      confirmText: t('admin.broadcastSendButton'),
      cancelText: t('common.cancel'),
    });

    if (!confirmed) return;

    setIsSending(true);

    try {
      const res = await fetch(`${API_URL}/api/admin/broadcast-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim(),
          color: previewColor,
          url: draft.url.trim(),
          footer: draft.footer.trim(),
          imageUrl: draft.imageUrl.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to queue Discord broadcast');
      }

      const data = await res.json();
      setLastBroadcastStats(data.stats);

      const statsMessage = t('admin.broadcastStats')
        .replace('{users}', String(data.stats.totalUsers))
        .replace('{queued}', String(data.stats.dmQueued))
        .replace('{skipped}', String(data.stats.skippedNoDiscordOrDisabled));

      showToast(`${t('admin.broadcastSuccess')} ${statsMessage}`, 'success');
      setDraft(DEFAULT_EMBED);
    } catch (err: any) {
      console.error('Failed to queue Discord broadcast:', err);
      showToast(err.message || 'Failed to queue Discord broadcast', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))` }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent-1)' }} />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{t('admin.broadcastTitle')} | LFD Admin</title>
        <meta name="description" content="Broadcast Discord DM embeds to eligible users" />
      </Head>

      <div className="min-h-screen" style={{ background: `linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))` }}>
        <div className="border-b shadow-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {t('admin.broadcastTitle')}
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  {t('admin.broadcastDescription')}
                </p>
              </div>
              <Link
                href="/admin"
                className="px-4 py-2 rounded-lg transition-colors text-center"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6">
            <section className="p-6 rounded-lg border shadow-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <div className="grid grid-cols-1 gap-5">
                <label className="block">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Embed Title</span>
                  <input
                    value={draft.title}
                    onChange={(e) => updateDraft('title', e.target.value)}
                    placeholder="RiftEssence announcement"
                    className="mt-2 w-full p-3 rounded-lg border outline-none"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: isTitleValid || !draft.title ? 'var(--color-border)' : 'var(--color-error)', color: 'var(--color-text-primary)' }}
                    disabled={isSending}
                  />
                </label>

                <label className="block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Description</span>
                    <span className="text-xs" style={{ color: !isDescriptionValid && descriptionLength > 0 ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                      {descriptionLength} / 4000 {t('admin.broadcastCharCount')}
                    </span>
                  </div>
                  <textarea
                    value={draft.description}
                    onChange={(e) => updateDraft('description', e.target.value)}
                    placeholder={t('admin.broadcastPlaceholder')}
                    className="mt-2 w-full p-4 rounded-lg border outline-none resize-none"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: isDescriptionValid || descriptionLength === 0 ? 'var(--color-border)' : 'var(--color-error)', color: 'var(--color-text-primary)', minHeight: '220px' }}
                    disabled={isSending}
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)] gap-4">
                  <label className="block">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Accent Color</span>
                    <input
                      type="color"
                      value={previewColor}
                      onChange={(e) => updateDraft('color', e.target.value)}
                      className="mt-2 h-12 w-full rounded-lg border p-1"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
                      disabled={isSending}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Title Link</span>
                    <input
                      value={draft.url}
                      onChange={(e) => updateDraft('url', e.target.value)}
                      placeholder="https://riftessence.gg/..."
                      className="mt-2 w-full p-3 rounded-lg border outline-none"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: isOptionalUrlValid(draft.url) ? 'var(--color-border)' : 'var(--color-error)', color: 'var(--color-text-primary)' }}
                      disabled={isSending}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Image URL</span>
                  <input
                    value={draft.imageUrl}
                    onChange={(e) => updateDraft('imageUrl', e.target.value)}
                    placeholder="https://..."
                    className="mt-2 w-full p-3 rounded-lg border outline-none"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: isOptionalUrlValid(draft.imageUrl) ? 'var(--color-border)' : 'var(--color-error)', color: 'var(--color-text-primary)' }}
                    disabled={isSending}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Footer</span>
                  <input
                    value={draft.footer}
                    onChange={(e) => updateDraft('footer', e.target.value)}
                    placeholder="RiftEssence"
                    className="mt-2 w-full p-3 rounded-lg border outline-none"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: draft.footer.length <= 2048 ? 'var(--color-border)' : 'var(--color-error)', color: 'var(--color-text-primary)' }}
                    disabled={isSending}
                  />
                </label>

                <button
                  onClick={handleSendBroadcast}
                  disabled={!isValid || isSending}
                  className="w-full py-3 rounded-lg font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
                >
                  {isSending ? 'Queueing...' : t('admin.broadcastSendButton')}
                </button>
              </div>
            </section>

            <aside className="p-6 rounded-lg border shadow-lg self-start" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {t('admin.broadcastPreview')}
              </h2>
              <div className="rounded-lg p-4" style={{ backgroundColor: '#313338', color: '#dbdee1' }}>
                <div className="mb-3 text-sm font-semibold" style={{ color: '#f2f3f5' }}>RiftEssence</div>
                <div className="rounded p-4" style={{ backgroundColor: '#2b2d31', borderLeft: `4px solid ${previewColor}` }}>
                  <div className="font-semibold break-words" style={{ color: '#f2f3f5' }}>
                    {draft.url.trim() ? (
                      <a href={draft.url.trim()} target="_blank" rel="noreferrer" style={{ color: '#00a8fc' }}>
                        {draft.title.trim() || 'Embed title'}
                      </a>
                    ) : (
                      draft.title.trim() || 'Embed title'
                    )}
                  </div>
                  <div className="mt-2 text-sm whitespace-pre-wrap break-words" style={{ color: '#dbdee1' }}>
                    {draft.description.trim() || 'Embed description will appear here.'}
                  </div>
                  {draft.imageUrl.trim() && isOptionalUrlValid(draft.imageUrl) && (
                    <img
                      src={draft.imageUrl.trim()}
                      alt=""
                      className="mt-4 w-full rounded"
                      style={{ maxHeight: 240, objectFit: 'cover' }}
                    />
                  )}
                  {draft.footer.trim() && (
                    <div className="mt-4 text-xs" style={{ color: '#b5bac1' }}>
                      {draft.footer.trim()}
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Eligible recipients are linked Discord users who have not disabled Discord DM notifications. Discord may still block delivery based on privacy settings.
              </p>
            </aside>
          </div>

          {lastBroadcastStats && (
            <section className="mt-8 p-6 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Last Broadcast Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Audience</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-1)' }}>{lastBroadcastStats.totalUsers}</div>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>DMs Queued</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{lastBroadcastStats.dmQueued}</div>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Skipped</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>{lastBroadcastStats.skippedNoDiscordOrDisabled}</div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
