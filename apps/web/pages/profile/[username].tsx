import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { LoadingSpinner } from '@components/LoadingSpinner';

const ProfilePage = dynamic(() => import('../profile'), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

export default function UserProfile() {
  const router = useRouter();
  const username =
    router.isReady && typeof router.query.username === 'string'
      ? router.query.username
      : null;

  if (!username) return <LoadingSpinner />;

  return (
    <>
      <Head>
        <title>{`${username}'s Profile | RiftEssence`}</title>
        <meta
          name="description"
          content={`View ${username}'s League of Legends profile on RiftEssence.`}
        />
        <link
          rel="canonical"
          href={`https://riftessence.app/profile/${encodeURIComponent(
            username,
          )}`}
        />
      </Head>
      <ProfilePage key={username} />
    </>
  );
}
