import { useRouter } from 'next/router';
import { useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface Props {
  username: string;
  ssrTitle: string;
  ssrDescription: string;
  canonicalUrl: string;
}

// getServerSideProps runs on the server — gives crawlers proper meta tags
// before the client-side redirect to /profile?username=X kicks in.
export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const username = typeof params?.username === 'string' ? params.username : '';
  if (!username) return { notFound: true };

  let ssrTitle = `${username}'s Profile | RiftEssence`;
  let ssrDescription = `View ${username}'s League of Legends profile on RiftEssence — rank, champion pool, playstyle and duo history.`;

  try {
    const res = await fetch(
      `${API_URL}/api/user/profile?username=${encodeURIComponent(username)}`,
      { next: { revalidate: 0 } } as RequestInit,
    );
    if (res.ok) {
      const data = await res.json();
      const mainAcc = (data.riotAccounts || []).find((a: any) => a.isMain) || data.riotAccounts?.[0];
      const rank = mainAcc?.rank ? `${mainAcc.rank}${mainAcc.division ? ` ${mainAcc.division}` : ''}` : null;
      const region = mainAcc?.region ?? null;
      const roles: string[] = [data.primaryRole, data.preferredRole].filter(Boolean);

      ssrTitle = `${data.username}'s Profile | RiftEssence`;
      ssrDescription = [
        `${data.username} is looking for a duo partner on RiftEssence.`,
        rank ? `Rank: ${rank}.` : '',
        region ? `Region: ${region}.` : '',
        roles.length ? `Plays: ${roles.join(', ')}.` : '',
        data.bio ? data.bio.slice(0, 100) : '',
      ].filter(Boolean).join(' ');
    }
  } catch {
    // Silently fall back to generic meta
  }

  return {
    props: {
      username,
      ssrTitle,
      ssrDescription,
      canonicalUrl: `https://riftessence.app/profile/${username}`,
    },
  };
};

export default function UserProfile({ username, ssrTitle, ssrDescription, canonicalUrl }: Props) {
  const router = useRouter();

  // Client-side: navigate to the main profile page which has full functionality
  useEffect(() => {
    if (username) {
      router.replace(`/profile?username=${encodeURIComponent(username)}`);
    }
  }, [username, router]);

  return (
    <>
      {/* These tags are in the initial SSR HTML — crawlers read them before any redirect */}
      <Head>
        <title>{ssrTitle}</title>
        <meta name="description" content={ssrDescription} />
        <meta property="og:title" content={ssrTitle} />
        <meta property="og:description" content={ssrDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <link rel="canonical" href={canonicalUrl} />
      </Head>
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--color-accent-1)' }}>Loading profile…</div>
      </div>
    </>
  );
}
