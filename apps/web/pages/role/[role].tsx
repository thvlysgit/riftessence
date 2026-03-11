import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps } from 'next';

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

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = Object.keys(ROLES).map((r) => ({
    params: { role: r.toLowerCase() },
  }));
  return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
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
    revalidate: 86400,
  };
};

export default function RolePage({ role, label, description, keywords }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/feed?role=${encodeURIComponent(role)}`);
  }, [role, router]);

  const title = `Find ${label} Duo Partner | League of Legends | RiftEssence`;
  const canonical = `https://riftessence.app/role/${role.toLowerCase()}`;

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-accent-1)' }}>
            Loading {label} duo posts…
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            You&apos;re being redirected to the feed filtered for {label}.
          </p>
        </div>
      </div>
    </>
  );
}
