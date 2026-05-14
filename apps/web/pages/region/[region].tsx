import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';

const REGIONS: Record<string, { label: string; full: string }> = {
  NA: { label: 'NA', full: 'North America' },
  EUW: { label: 'EUW', full: 'Europe West' },
  EUNE: { label: 'EUNE', full: 'Europe Nordic & East' },
  KR: { label: 'KR', full: 'Korea' },
  BR: { label: 'BR', full: 'Brazil' },
  LAN: { label: 'LAN', full: 'Latin America North' },
  LAS: { label: 'LAS', full: 'Latin America South' },
  OCE: { label: 'OCE', full: 'Oceania' },
  JP: { label: 'JP', full: 'Japan' },
  TR: { label: 'TR', full: 'Turkey' },
  RU: { label: 'RU', full: 'Russia' },
  SG: { label: 'SG', full: 'SEA' },
};

interface Props {
  region: string;
  label: string;
  fullName: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const slug = typeof params?.region === 'string' ? params.region.toUpperCase() : '';
  const info = REGIONS[slug];
  if (!info) return { notFound: true };

  return {
    props: {
      region: slug,
      label: info.label,
      fullName: info.full,
    },
  };
};

export default function RegionPage({ region, label, fullName }: Props) {
  const title = `Find Duo Partner ${label} | League of Legends ${fullName} | RiftEssence`;
  const description = `Looking for a duo partner in League of Legends ${fullName} (${label})? Browse active duo posts, filter by rank and role, and find your perfect ranked duo on RiftEssence.`;
  const canonical = `https://riftessence.app/region/${region.toLowerCase()}`;
  const feedHref = `/feed?region=${encodeURIComponent(region)}`;
  const roleLinks = [
    ['Top lane', 'TOP'],
    ['Jungle', 'JUNGLE'],
    ['Mid lane', 'MID'],
    ['ADC', 'ADC'],
    ['Support', 'SUPPORT'],
  ] as const;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={`lol duo ${label}, league of legends duo ${label}, duo partner ${label}, lol ${fullName} duo, find duo ${label}, ranked duo ${label}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={canonical} />
      </Head>

      <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <section className="border-b px-4 py-14 sm:px-6 lg:px-8" style={{ borderColor: 'var(--color-border)' }}>
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase" style={{ color: 'var(--color-accent-1)', letterSpacing: '0.16em' }}>
              League of Legends {label}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl" style={{ color: 'var(--color-text-primary)' }}>
              Find a League of Legends duo partner in {fullName}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 sm:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              Browse RiftEssence duo posts for {label} players, then narrow the feed by role, rank, language, voice preference, and verified Riot account context before you message anyone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={feedHref} className="btn-primary">
                Browse {label} duo posts
              </Link>
              <Link href="/register" className="btn-secondary">
                Create your duo profile
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              What you can filter in {label}
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Rank range from Iron through Challenger, including Master+ LP context.</li>
              <li>Main and secondary roles, language preferences, and voice chat availability.</li>
              <li>Riot-verified profiles, community ratings, and Discord contact context where available.</li>
            </ul>
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Popular {label} role searches
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {roleLinks.map(([roleLabel, roleValue]) => (
                <Link
                  key={roleValue}
                  href={`/feed?region=${encodeURIComponent(region)}&role=${encodeURIComponent(roleValue)}`}
                  className="rounded-md border px-4 py-2 text-sm font-semibold hover:opacity-85"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  {roleLabel}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              More ways to find League teammates
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/lft" className="btn-secondary">Looking for Team</Link>
              <Link href="/coaching" className="btn-secondary">Free Coaching</Link>
              <Link href="/matchups/marketplace" className="btn-secondary">Matchup Guides</Link>
              <Link href="/communities" className="btn-secondary">Communities</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
