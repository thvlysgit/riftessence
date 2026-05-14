import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';

const ROLES: Record<string, { label: string; description: string; keywords: string }> = {
  TOP: {
    label: 'Top Lane',
    description: 'Find a top lane duo partner for League of Legends ranked. Browse active top laners looking for a duo across all ranks and regions.',
    keywords: 'lol top lane duo, top lane duo partner, league of legends top duo, find top laner duo',
  },
  JUNGLE: {
    label: 'Jungle',
    description: 'Find a jungle duo partner for League of Legends ranked. Connect with junglers looking for a duo to dominate the early game together.',
    keywords: 'lol jungle duo, jungle duo partner, league of legends jungler duo, find jungler duo',
  },
  MID: {
    label: 'Mid Lane',
    description: 'Find a mid lane duo partner for League of Legends ranked. Browse mid laners looking for a duo across all ranks and servers.',
    keywords: 'lol mid lane duo, mid duo partner, league of legends mid duo, find mid laner duo',
  },
  ADC: {
    label: 'ADC / Bot Lane',
    description: 'Find an ADC duo partner for League of Legends ranked. Pair up with a support or another bot-laner for ranked duo queue.',
    keywords: 'lol adc duo, adc duo partner, league of legends bot lane duo, find adc duo, lol marksman duo',
  },
  SUPPORT: {
    label: 'Support',
    description: 'Find a support duo partner for League of Legends ranked. Connect with supports looking to duo with their ADC or any role.',
    keywords: 'lol support duo, support duo partner, league of legends supp duo, find support duo',
  },
};

interface Props {
  role: string;
  label: string;
  description: string;
  keywords: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const slug = typeof params?.role === 'string' ? params.role.toUpperCase() : '';
  const info = ROLES[slug];
  if (!info) return { notFound: true };

  return {
    props: {
      role: slug,
      label: info.label,
      description: info.description,
      keywords: info.keywords,
    },
  };
};

export default function RolePage({ role, label, description, keywords }: Props) {
  const title = `Find ${label} Duo Partner | League of Legends | RiftEssence`;
  const canonical = `https://riftessence.app/role/${role.toLowerCase()}`;
  const feedHref = `/feed?role=${encodeURIComponent(role)}`;
  const regionLinks = ['EUW', 'NA', 'EUNE', 'KR', 'BR', 'OCE'] as const;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
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
              League of Legends duo finder
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl" style={{ color: 'var(--color-text-primary)' }}>
              Find a {label} duo partner
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 sm:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              {description} RiftEssence lets you compare posts by rank, region, language, voice chat, Riot verification, and community rating before you commit to a duo queue partner.
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
              Why search by role?
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Find players who fit your lane plan instead of browsing a generic player list.</li>
              <li>Filter for rank range, region, languages, and voice preference at the same time.</li>
              <li>Open profiles with Riot account context, ratings, playstyle tags, and champion pool details.</li>
            </ul>
          </div>

          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Popular {label} regions
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {regionLinks.map((regionCode) => (
                <Link
                  key={regionCode}
                  href={`/feed?role=${encodeURIComponent(role)}&region=${encodeURIComponent(regionCode)}`}
                  className="rounded-md border px-4 py-2 text-sm font-semibold hover:opacity-85"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  {regionCode}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Explore the wider RiftEssence hub
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/feed" className="btn-secondary">All Duo Posts</Link>
              <Link href="/lft" className="btn-secondary">Looking for Team</Link>
              <Link href="/coaching" className="btn-secondary">Free Coaching</Link>
              <Link href="/matchups/marketplace" className="btn-secondary">Matchup Guides</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
