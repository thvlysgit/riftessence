import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// This page handles the /profile/[username] route
// It redirects to /profile?username=[username] which the profile page already supports

export default function UserProfile() {
  const router = useRouter();
  const { username } = router.query;

  useEffect(() => {
    if (username && typeof username === 'string') {
      // Redirect to the main profile page with username query param
      router.replace(`/profile?username=${encodeURIComponent(username)}`);
    }
  }, [username, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="text-xl" style={{ color: 'var(--color-accent-1)' }}>Loading profile...</div>
    </div>
  );
}
