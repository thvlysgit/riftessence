import type { GetServerSideProps } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://riftessence.app';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: string;
};

const STATIC_ENTRIES: SitemapEntry[] = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/feed', changefreq: 'daily', priority: '0.9' },
  { loc: '/lft', changefreq: 'daily', priority: '0.8' },
  { loc: '/communities', changefreq: 'daily', priority: '0.8' },
  { loc: '/matchups/marketplace', changefreq: 'daily', priority: '0.7' },
  { loc: '/coaching', changefreq: 'daily', priority: '0.7' },
  { loc: '/leaderboards', changefreq: 'daily', priority: '0.6' },
  { loc: '/developer-api', changefreq: 'monthly', priority: '0.5' },
  { loc: '/riot', changefreq: 'monthly', priority: '0.4' },
  { loc: '/terms', changefreq: 'yearly', priority: '0.4' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.4' },
  { loc: '/cookies', changefreq: 'yearly', priority: '0.4' },
];

const REGIONS = ['na', 'euw', 'eune', 'kr', 'br', 'lan', 'las', 'oce', 'jp', 'tr', 'ru'];
const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

function toEntryXml(entry: SitemapEntry): string {
  return [
    '  <url>',
    `    <loc>${escapeXml(absoluteUrl(entry.loc))}</loc>`,
    entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '',
    entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : '',
    entry.priority ? `    <priority>${entry.priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

function addEntry(entries: Map<string, SitemapEntry>, entry: SitemapEntry) {
  const loc = absoluteUrl(entry.loc);
  if (!entries.has(loc)) {
    entries.set(loc, { ...entry, loc });
  }
}

function isPublicProfileUsername(username: string | undefined): username is string {
  const normalized = String(username || '').trim();
  return Boolean(normalized) && normalized.toLowerCase() !== 'anonymous' && normalized.toLowerCase() !== 'unknown';
}

async function collectDynamicEntries(entries: Map<string, SitemapEntry>) {
  const [postsPayload, communitiesPayload, matchupsPayload] = await Promise.all([
    fetchJson<{ posts?: Array<{ id?: string; updatedAt?: string; createdAt?: string; username?: string }> }>('/api/posts?limit=200'),
    fetchJson<{ communities?: Array<{ id?: string; updatedAt?: string; createdAt?: string }> }>('/api/communities?limit=500'),
    fetchJson<{ matchups?: Array<{ id?: string; updatedAt?: string; createdAt?: string; authorUsername?: string }> }>('/api/matchups/public?limit=500&offset=0&sortBy=newest'),
  ]);

  for (const post of postsPayload?.posts || []) {
    if (post.id) {
      addEntry(entries, {
        loc: `/share/post/${encodeURIComponent(post.id)}`,
        lastmod: post.updatedAt || post.createdAt,
        changefreq: 'daily',
        priority: '0.6',
      });
    }

    if (isPublicProfileUsername(post.username)) {
      addEntry(entries, {
        loc: `/profile/${encodeURIComponent(post.username)}`,
        changefreq: 'weekly',
        priority: '0.5',
      });
    }
  }

  for (const community of communitiesPayload?.communities || []) {
    if (!community.id) continue;
    addEntry(entries, {
      loc: `/communities/${encodeURIComponent(community.id)}`,
      lastmod: community.updatedAt || community.createdAt,
      changefreq: 'weekly',
      priority: '0.6',
    });
  }

  for (const matchup of matchupsPayload?.matchups || []) {
    if (matchup.id) {
      addEntry(entries, {
        loc: `/matchups/${encodeURIComponent(matchup.id)}`,
        lastmod: matchup.updatedAt || matchup.createdAt,
        changefreq: 'weekly',
        priority: '0.6',
      });
    }

    if (isPublicProfileUsername(matchup.authorUsername)) {
      addEntry(entries, {
        loc: `/profile/${encodeURIComponent(matchup.authorUsername)}`,
        changefreq: 'weekly',
        priority: '0.5',
      });
    }
  }
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const entries = new Map<string, SitemapEntry>();

  for (const entry of STATIC_ENTRIES) addEntry(entries, entry);
  for (const region of REGIONS) addEntry(entries, { loc: `/region/${region}`, changefreq: 'daily', priority: '0.7' });
  for (const role of ROLES) addEntry(entries, { loc: `/role/${role}`, changefreq: 'daily', priority: '0.7' });

  await collectDynamicEntries(entries);

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Array.from(entries.values()).map(toEntryXml),
    '</urlset>',
  ].join('\n');

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default function SitemapXml() {
  return null;
}
