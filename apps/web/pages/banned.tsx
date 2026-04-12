import Head from 'next/head';
import Link from 'next/link';

export default function BannedPage() {
  return (
    <>
      <Head>
        <title>Access Restricted | RiftEssence</title>
      </Head>

      <main
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background: 'linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))',
        }}
      >
        <div
          className="max-w-xl w-full border rounded-xl p-8 text-center"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'rgba(239, 68, 68, 0.45)',
          }}
        >
          <h1 className="text-3xl font-bold mb-3" style={{ color: '#EF4444' }}>
            Access Restricted
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            This account or IP address is currently blocked from RiftEssence. If you think this is a mistake,
            please contact support.
          </p>

          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex px-4 py-2 rounded-lg border text-sm font-semibold"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-accent-1)',
                backgroundColor: 'var(--color-bg-tertiary)',
              }}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
