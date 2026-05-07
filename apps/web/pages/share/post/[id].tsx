import React, { useEffect, useMemo, useState } from 'react';
import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.riftessence.app';

type RiotAccount = {
  gameName?: string | null;
  tagLine?: string | null;
  rank?: string | null;
  division?: string | null;
  lp?: number | null;
  winrate?: number | null;
};

type SharePost = {
  id: string;
  username: string;
  message?: string | null;
  role?: string | null;
  secondRole?: string | null;
  region?: string | null;
  vcPreference?: string | null;
  languages?: string[];
  postingRiotAccount?: RiotAccount | null;
};

type SharePostPageProps = {
  initialPost: SharePost | null;
  initialError: string | null;
  shareUrl: string;
  ogImageUrl: string;
};

function absoluteUrl(path: string, origin = SITE_URL): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function requestOrigin(req: GetServerSidePropsContext['req']): string {
  const host = req.headers.host;
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || 'http';
  return host ? `${protocol}://${host}` : SITE_URL;
}

function compact(value: unknown): string {
  return String(value ?? '').trim();
}

function buildPostOgImageUrl(post: SharePost | null, fallbackId: string, origin = SITE_URL): string {
  if (!post) return absoluteUrl(`/api/og/post/${encodeURIComponent(fallbackId)}`, origin);

  const account = post.postingRiotAccount;
  const params = new URLSearchParams();
  params.set('user', compact(post.username));
  params.set('role', compact(post.role));
  if (post.secondRole) params.set('role2', compact(post.secondRole));
  params.set('region', compact(post.region));
  if (post.vcPreference) params.set('vc', compact(post.vcPreference));
  if (post.message) params.set('msg', compact(post.message).slice(0, 300));
  if (account?.gameName) params.set('gn', compact(account.gameName));
  if (account?.tagLine) params.set('tag', compact(account.tagLine));
  if (account?.rank) params.set('rank', compact(account.rank));
  if (account?.division) params.set('div', compact(account.division));
  if (account?.lp != null) params.set('lp', String(account.lp));
  if (account?.winrate != null) params.set('wr', String(account.winrate));
  if (post.languages?.length) params.set('langs', post.languages.slice(0, 4).join(','));

  return absoluteUrl(`/api/og/post/${encodeURIComponent(post.id)}?${params.toString()}`, origin);
}

function formatRank(account?: RiotAccount | null): string {
  if (!account?.rank || account.rank === 'UNRANKED') return 'Unranked';
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(account.rank)) {
    return `${account.rank} ${account.lp ?? 0} LP`;
  }
  return account.division ? `${account.rank} ${account.division}` : account.rank;
}

export default function SharePostPage({ initialPost, initialError, shareUrl, ogImageUrl }: SharePostPageProps) {
  const router = useRouter();
  const [post, setPost] = useState<SharePost | null>(initialPost);
  const [error, setError] = useState<string | null>(initialError);
  const [copyState, setCopyState] = useState<'idle' | 'link' | 'image'>('idle');
  const [loading, setLoading] = useState(!initialPost && !initialError);

  useEffect(() => {
    if (initialPost || initialError || !router.query.id || typeof router.query.id !== 'string') return;

    let cancelled = false;
    setLoading(true);
    fetch(`${API_URL}/api/posts/${encodeURIComponent(router.query.id)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Post not found');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data.post) {
          setError('Post not found');
          return;
        }
        setPost(data.post);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Post not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialError, initialPost, router.query.id]);

  useEffect(() => {
    if (copyState === 'idle') return;
    const timeout = window.setTimeout(() => setCopyState('idle'), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const displayName = useMemo(() => {
    const account = post?.postingRiotAccount;
    if (account?.gameName) {
      return account.tagLine ? `${account.gameName}#${account.tagLine}` : account.gameName;
    }
    return post?.username || 'Duo player';
  }, [post]);

  const resolvedImageUrl = useMemo(() => {
    const id = typeof router.query.id === 'string' ? router.query.id : post?.id || '';
    if (post && ogImageUrl) return ogImageUrl;
    const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
    return post ? buildPostOgImageUrl(post, id, origin) : ogImageUrl;
  }, [ogImageUrl, post, router.query.id]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopyState('link');
  }

  async function copyImage() {
    const response = await fetch(resolvedImageUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
    setCopyState('image');
  }

  async function shareNative() {
    if (navigator.share) {
      await navigator.share({
        title: `${displayName} is looking for duo`,
        text: post?.message || 'Looking for a League duo on RiftEssence.',
        url: shareUrl,
      });
      return;
    }
    await copyLink();
  }

  return (
    <>
      <Head>
        <title>{`${post ? `${displayName} is looking for duo` : 'Share Duo Post'} | RiftEssence`}</title>
      </Head>

      <main className="min-h-screen px-4 py-8 sm:py-12" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section
            className="rounded-lg border p-3 sm:p-4"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--color-accent-1)', borderTopColor: 'transparent' }} />
              </div>
            ) : error ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Post not found</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
              </div>
            ) : (
              <img
                src={resolvedImageUrl}
                alt={`${displayName} duo share card`}
                className="block aspect-[1200/630] w-full rounded-md object-cover"
              />
            )}
          </section>

          <aside
            className="rounded-lg border p-5"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent-1)' }}>
              Duo Share
            </p>
            <h1 className="mt-2 text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {displayName}
            </h1>
            {post && (
              <div className="mt-4 space-y-3 text-sm">
                {post.message && (
                  <div className="rounded-md px-3 py-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Message</span>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                      {post.message}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md px-3 py-2" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Role</span>
                  <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{post.role || 'Any'}</div>
                </div>
                <div className="rounded-md px-3 py-2" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Region</span>
                  <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{post.region || 'Any'}</div>
                </div>
                <div className="col-span-2 rounded-md px-3 py-2" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Rank</span>
                  <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{formatRank(post.postingRiotAccount)}</div>
                </div>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={shareNative}
                disabled={!post && !shareUrl}
                className="w-full rounded-md px-4 py-3 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
              >
                Share Link
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="w-full rounded-md border px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-85"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                {copyState === 'link' ? 'Link Copied' : 'Copy Link'}
              </button>
              <button
                type="button"
                onClick={copyImage}
                disabled={Boolean(error)}
                className="w-full rounded-md border px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                {copyState === 'image' ? 'Image Copied' : 'Copy Image'}
              </button>
            </div>

            <Link href="/feed" className="mt-5 block text-sm hover:underline" style={{ color: 'var(--color-text-muted)' }}>
              Back to duo feed
            </Link>
          </aside>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SharePostPageProps> = async (context) => {
  const id = typeof context.params?.id === 'string' ? context.params.id : '';
  const origin = requestOrigin(context.req);
  const shareUrl = absoluteUrl(`/share/post/${encodeURIComponent(id)}`, origin);
  const fallbackImageUrl = absoluteUrl(`/api/og/post/${encodeURIComponent(id)}`, origin);

  try {
    const res = await fetch(`${API_URL}/api/posts/${encodeURIComponent(id)}`);
    if (!res.ok) {
      return {
        props: {
          initialPost: null,
          initialError: 'Post not found',
          shareUrl,
          ogImageUrl: fallbackImageUrl,
          ssrTitle: 'Duo post not found | RiftEssence',
          ssrDescription: 'This RiftEssence duo post could not be found.',
          ssrOgImage: fallbackImageUrl,
          ssrUrl: shareUrl,
        } as any,
      };
    }

    const data = await res.json();
    const post = (data.post || null) as SharePost | null;
    const imageUrl = buildPostOgImageUrl(post, id, origin);
    const account = post?.postingRiotAccount;
    const name = account?.gameName
      ? `${account.gameName}${account.tagLine ? `#${account.tagLine}` : ''}`
      : post?.username || 'A player';
    const description = post
      ? `${name} is looking for duo on ${post.region || 'RiftEssence'} as ${post.role || 'any role'}.`
      : 'Shareable League of Legends duo post on RiftEssence.';

    return {
      props: {
        initialPost: post,
        initialError: null,
        shareUrl,
        ogImageUrl: imageUrl,
        ssrTitle: `${name} is looking for duo | RiftEssence`,
        ssrDescription: description,
        ssrOgImage: imageUrl,
        ssrUrl: shareUrl,
      } as any,
    };
  } catch {
    return {
      props: {
        initialPost: null,
        initialError: 'Failed to load post',
        shareUrl,
        ogImageUrl: fallbackImageUrl,
        ssrTitle: 'Share Duo Post | RiftEssence',
        ssrDescription: 'Share a League of Legends duo post from RiftEssence.',
        ssrOgImage: fallbackImageUrl,
        ssrUrl: shareUrl,
      } as any,
    };
  }
};
