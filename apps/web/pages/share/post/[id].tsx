import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface Post {
  id: string;
  createdAt: string;
  message: string;
  role: string;
  secondRole: string | null;
  region: string;
  languages: string[];
  vcPreference: string;
  authorId: string;
  username: string;
  isAnonymous: boolean;
  preferredRole: string | null;
  secondaryRole: string | null;
  discordUsername: string | null;
  postingRiotAccount: {
    gameName: string;
    tagLine: string;
    region: string;
    rank: string;
    division?: string | null;
    lp?: number | null;
    winrate: number | null;
  } | null;
  bestRank: {
    gameName: string;
    tagLine: string;
    rank: string;
    division?: string | null;
    lp?: number | null;
    winrate: number | null;
  } | null;
  isMainAccount: boolean;
}

interface SharePostPageProps {
  post: Post | null;
  error?: string;
  baseUrl: string;
}

// Helper to format VC preference
function formatVCPreference(vc: string): string {
  const map: Record<string, string> = {
    ALWAYS: 'Voice Chat Required',
    SOMETIMES: 'Voice Chat Optional',
    NEVER: 'No Voice Chat',
  };
  return map[vc] || vc;
}

// Helper for rank badges
function getRankBadge(rank: string, division?: string, lp?: number) {
  const base = rank.split(' ')[0];
  const displayRank = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(base)
    ? `${rank}${lp !== undefined ? ` ${lp}LP` : ''}`
    : division
    ? `${rank} ${division}`
    : rank;

  const colors: Record<string, string> = {
    IRON: '#4A4A4A',
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#00CED1',
    EMERALD: '#50C878',
    DIAMOND: '#B9F2FF',
    MASTER: '#9D4EDD',
    GRANDMASTER: '#FF6B6B',
    CHALLENGER: '#F4D03F',
  };

  const color = colors[base] || '#C8AA6D';

  return (
    <span
      className="px-3 py-1 rounded font-bold text-sm"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `2px solid ${color}`,
      }}
    >
      {displayRank}
    </span>
  );
}

// Helper for winrate badges
function getWinrateBadge(winrate: number) {
  const color = winrate >= 50 ? '#10B981' : '#EF4444';
  return (
    <span
      className="px-3 py-1 rounded font-bold text-sm"
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {winrate.toFixed(1)}% WR
    </span>
  );
}

// Role icon helper
const getRoleIcon = (role: string) => {
  const r = role.toUpperCase();
  switch (r) {
    case 'TOP':
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c32.06 0 64.12-.01 96.18.01-6.72 6.67-13.45 13.33-20.19 19.99H36v56c-6.66 6.73-13.33 13.46-19.99 20.18-.02-32.06 0-64.12-.01-96.18Z"/><path d="M104 44.02c5.32-5.33 10.65-10.64 15.99-15.94.02 30.64.01 61.28.01 91.92-30.64 0-61.28.01-91.93-.01 5.33-5.34 10.66-10.66 16-15.99 19.97-.01 39.95.01 59.93 0V44.02Z" opacity="0.75"/><path d="M56 56h28v28H56V56Z" opacity="0.75"/></svg>;
    case 'JUNGLE':
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M72.13 57.86C78.7 41.1 90.04 26.94 99.94 12.1 93 29.47 84.31 46.87 84.04 65.97c-.73 4.81-2.83 9.31-4 14.03-2.08-7.57-4.91-14.9-7.91-22.14ZM36.21 12.35c13.06 20.19 26.67 40.61 33.61 63.87 4.77 15.49 5.42 32.94-1.8 47.8-5.58-6.1-11.08-12.29-16.71-18.34-4.97-4.72-10.26-9.1-15.32-13.71-1.55-11.73-2.97-23.87-8.72-34.42-2.75-5.24-6.71-9.72-11.19-13.55 9.67 4.75 19.18 10.41 26.23 18.72 4.37 4.98 7.46 10.94 9.69 17.15 1.15-10.29.58-20.79-2.05-30.81-3.31-12.68-8.99-24.55-13.74-36.71ZM105.84 53.83c4.13-4 8.96-7.19 14.04-9.84-4.4 3.88-8.4 8.32-11.14 13.55-5.75 10.56-7.18 22.71-8.74 34.45-5.32 5.35-10.68 10.65-15.98 16.01.15-4.37-.25-8.84 1.02-13.1 3.39-15.08 9.48-30.18 20.8-41.07Z"/></svg>;
    case 'MID':
    case 'MIDDLE':
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c22.67 0 45.33 0 67.99.01C78.62 21.34 73.28 26.69 67.88 32c-11.96 0-23.92-.01-35.88 0-.01 12 .01 24-.01 36-5.32 5.3-10.64 10.6-15.98 15.89C15.99 61.26 16 38.63 16 16zm87.95 51.9c5.32-5.37 10.69-10.68 16.04-16.02.02 22.71.01 45.41 0 68.12-22.65 0-45.31.01-67.97-.01 5.33-5.33 10.65-10.67 15.99-15.99 12-.01 23.99.01 35.99 0 .04-12.04-.05-24.07-.05-36.1z" opacity="0.75"/><path d="M100.02 16H120v19.99C92 64 64 92 35.99 120H16v-19.99C44 72 72 43.99 100.02 16z"/></svg>;
    case 'ADC':
    case 'BOT':
    case 'BOTTOM':
      return <Image src="/assets/BotLane.png" alt="Bot" width={16} height={16} className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(16%) saturate(1018%) hue-rotate(8deg) brightness(91%) contrast(85%)' }} />;
    case 'SUPPORT':
    case 'SUP':
      return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M52.21 12.03c10.33-.1 20.66.06 30.99-.08 1.71 2.62 3.2 5.37 4.79 8.07C81.32 28 74.68 36.01 68 43.98 61.32 36 54.66 28 48.01 19.99c1.4-2.65 2.82-5.29 4.2-7.96ZM0 36.3c14.64-.68 29.33-.11 43.99-.3C48 40 52 44 56 48.01c-2.67 9.32-5.32 18.66-8.01 27.98-6.66-2.65-13.32-5.32-19.98-7.99 3.97-5.35 8.02-10.63 11.96-15.99-5.01-.08-10.15.4-15-1.14C15.58 48.12 7.75 42.05 0 36.34v-.04ZM92.02 36c14.66.05 29.32-.09 43.98.07v.03c-7.3 5.9-15.1 11.53-24.1 14.5-5.11 1.85-10.59 1.34-15.91 1.41 4.01 5.32 8 10.65 11.99 15.98-6.64 2.7-13.31 5.34-19.97 8-2.69-9.32-5.34-18.65-8.01-27.98C84.01 44 88 39.99 92.02 36ZM64.01 52.11c1.36 1.26 2.7 2.55 3.99 3.89 1.32-1.33 2.65-2.65 3.99-3.97 4.04 19.97 7.97 39.96 12.02 59.92-5.31 4.05-10.66 8.07-16.04 12.03-5.32-4.01-10.67-7.97-15.98-12.01 4.04-19.94 7.96-39.92 12.02-59.86Z"/></svg>;
    default:
      return null;
  }
};

export default function SharePostPage({ post, error, baseUrl }: SharePostPageProps) {
  if (error || !post) {
    return (
      <>
        <Head>
          <title>Post Not Found | RiftEssence</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              Post Not Found
            </h1>
            <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              {error || 'This duo post could not be found.'}
            </p>
            <Link href="/feed" className="px-6 py-3 rounded font-semibold" style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}>
              Go to Feed
            </Link>
          </div>
        </div>
      </>
    );
  }

  const ogImageUrl = `${baseUrl}/api/og/post/${post.id}?id=${post.id}`;
  const shareUrl = `${baseUrl}/share/post/${post.id}`;
  const postingAccount = post.postingRiotAccount;
  const mainAccount = post.bestRank;
  const hasMainAccount = mainAccount && !post.isMainAccount;

  // Build description for OG tags
  const accountText = postingAccount
    ? `${postingAccount.gameName}#${postingAccount.tagLine} (${postingAccount.rank}${postingAccount.division ? ` ${postingAccount.division}` : ''})`
    : post.username;
  const description = `${post.username} is looking for a duo partner on ${post.region}! Role: ${post.role}${post.secondRole ? ` / ${post.secondRole}` : ''} • ${accountText}`;

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{`${post.username}'s Duo Post | RiftEssence`}</title>
        <meta name="title" content={`${post.username} - Looking For Duo on ${post.region}`} />
        <meta name="description" content={description} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:title" content={`${post.username} - Looking For Duo on ${post.region}`} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="RiftEssence" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={shareUrl} />
        <meta name="twitter:title" content={`${post.username} - Looking For Duo on ${post.region}`} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImageUrl} />

        {/* Discord-specific */}
        <meta name="theme-color" content="#C8AA6D" />
      </Head>

      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-accent-1)' }}>
              Looking For Duo
            </h1>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Shared from RiftEssence
            </p>
          </div>

          {/* Post Card */}
          <div
            className="border rounded-xl p-8 mb-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--shadow)',
            }}
          >
            {/* Username & Region */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {post.username}
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div
                className="px-4 py-2 rounded font-semibold"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-accent-1)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {post.region}
              </div>
            </div>

            {/* Roles */}
            <div className="flex gap-2 mb-6">
              <span className="px-3 py-1 rounded font-semibold text-sm border inline-flex items-center gap-1" style={{ background: 'rgba(200, 170, 109, 0.15)', color: '#C8AA6D', borderColor: '#C8AA6D' }}>
                {getRoleIcon(post.role)}
                {post.role}
              </span>
              {post.secondRole && (
                <span className="px-3 py-1 rounded font-semibold text-sm border inline-flex items-center gap-1" style={{ background: 'rgba(200, 170, 109, 0.1)', color: '#C8AA6D', borderColor: '#C8AA6D', opacity: 0.8 }}>
                  {getRoleIcon(post.secondRole)}
                  {post.secondRole}
                </span>
              )}
            </div>

            {/* Account Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Posting Account */}
              {postingAccount && (
                <div className="rounded-lg p-4" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    {hasMainAccount ? 'Posting With (Smurf)' : 'Posting With'}
                  </p>
                  <p className="font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    <img width="16" height="16" src="https://img.icons8.com/color/48/riot-games.png" alt="riot-games" />
                    {postingAccount.gameName}#{postingAccount.tagLine}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getRankBadge(postingAccount.rank, postingAccount.division || undefined, postingAccount.lp || undefined)}
                    {postingAccount.winrate !== null && getWinrateBadge(postingAccount.winrate)}
                  </div>
                </div>
              )}

              {/* Main Account */}
              {hasMainAccount && mainAccount && (
                <div className="rounded-lg p-4" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Main Account
                  </p>
                  <p className="font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    <img width="16" height="16" src="https://img.icons8.com/color/48/riot-games.png" alt="riot-games" />
                    {mainAccount.gameName}#{mainAccount.tagLine}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getRankBadge(mainAccount.rank, mainAccount.division || undefined, mainAccount.lp || undefined)}
                    {mainAccount.winrate !== null && getWinrateBadge(mainAccount.winrate)}
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            {post.message && (
              <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--color-bg-tertiary)' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {post.message}
                </p>
              </div>
            )}

            {/* VC Preference & Languages */}
            <div className="flex items-center gap-4 flex-wrap">
              <div
                className="px-4 py-2 rounded font-semibold text-sm"
                style={{
                  backgroundColor: 'rgba(200, 170, 109, 0.1)',
                  color: 'var(--color-accent-1)',
                  border: '1px solid rgba(200, 170, 109, 0.3)',
                }}
              >
                {formatVCPreference(post.vcPreference)}
              </div>
              <div className="flex gap-2 flex-wrap">
                {post.languages.map((lang) => (
                  <span
                    key={lang}
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {lang.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/feed"
              className="px-6 py-3 rounded font-semibold transition-colors"
              style={{
                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                color: 'var(--color-bg-primary)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              Browse More Duo Posts
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded font-semibold border transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-accent-1)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              Create Your Own Post
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };
  const { req } = context;
  const rawProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(rawProto) ? rawProto[0] : (typeof rawProto === 'string' ? rawProto.split(',')[0].trim() : null);
  const protocol = proto || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host;
  const host = (Array.isArray(rawHost) ? rawHost[0] : rawHost) || 'www.riftessence.app';
  const baseUrl = `${protocol}://${host}`;

  try {
    const res = await fetch(`${API_URL}/api/posts/${id}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {
        props: {
          post: null,
          error: 'Post not found',
          baseUrl,
        },
      };
    }

    const data = await res.json();

    return {
      props: {
        post: data.post || null,
        baseUrl,
      },
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    return {
      props: {
        post: null,
        error: 'Failed to load post',
        baseUrl,
      },
    };
  }
};
