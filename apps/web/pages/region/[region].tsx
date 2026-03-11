import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps } from 'next';

// Canonical regions and their display labels
const REGIONS: Record<string, { label: string; full: string }> = {
  NA:   { label: 'NA',   full: 'North America' },
  EUW:  { label: 'EUW',  full: 'Europe West' },
  EUNE: { label: 'EUNE', full: 'Europe Nordic & East' },
  KR:   { label: 'KR',   full: 'Korea' },
  BR:   { label: 'BR',   full: 'Brazil' },
  LAN:  { label: 'LAN',  full: 'Latin America North' },
  LAS:  { label: 'LAS',  full: 'Latin America South' },
  OCE:  { label: 'OCE',  full: 'Oceania' },
  JP:   { label: 'JP',   full: 'Japan' },
  TR:   { label: 'TR',   full: 'Turkey' },
  RU:   { label: 'RU',   full: 'Russia' },
  SG:   { label: 'SG',   full: 'SEA' },
};

interface Props {
  region: string;
  label: string;
  fullName: string;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = Object.keys(REGIONS).map((r) => ({
    params: { region: r.toLowerCase() },
  }));
  return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = typeof params?.region === 'string' ? params.region.toUpperCase() : '';
  const info = REGIONS[slug];
  if (!info) return { notFound: true };
  return {
    props: {
      region: slug,
      label: info.label,
      fullName: info.full,
    },
    revalidate: 86400, // Re-generate at most once per day
  };
};

export default function RegionPage({ region, label, fullName }: Props) {
  const router = useRouter();

  // Navigate to the feed with the region filter pre-applied
  useEffect(() => {
    router.replace(`/feed?region=${encodeURIComponent(region)}`);
  }, [region, router]);

  const title = `Find Duo Partner ${label} | League of Legends ${fullName} | RiftEssence`;
  const description = `Looking for a duo partner in League of Legends ${fullName} (${label})? Browse active duo posts, filter by rank and role, and find your perfect ranked duo on RiftEssence.`;
  const canonical = `https://riftessence.app/region/${region.toLowerCase()}`;

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
      {/* Minimal visible content while the redirect happens */}
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-accent-1)' }}>
            Loading {fullName} duo posts…
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            You&apos;re being redirected to the feed filtered for {label}.
          </p>
        </div>
      </div>
    </>
  );
}
