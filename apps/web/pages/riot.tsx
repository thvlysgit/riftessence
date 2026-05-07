import React from 'react';
import Link from 'next/link';
import SEOHead from '@components/SEOHead';

const REVIEW_STEPS = [
  {
    title: 'Create an account',
    body: 'A reviewer can register with email/password or sign in to an existing account, then reach the authenticated product surfaces from the navbar.',
  },
  {
    title: 'Link a Riot account',
    body: 'Users can verify ownership of a League of Legends account, attach rank/profile data to RiftEssence, and remove the linked account from their profile controls.',
  },
  {
    title: 'Find teammates',
    body: 'The Duo Finder feed lets players publish and browse looking-for-duo posts filtered by region, role, language, rank, voice preference, and verification state.',
  },
  {
    title: 'Run team practice',
    body: 'Teams can create rosters, schedule events, publish scrim availability, accept proposals, receive lobby handoff information, and confirm results.',
  },
  {
    title: 'Manage privacy',
    body: 'Users can edit profile visibility, disable Discord DM forwarding, unlink third-party accounts, and request account deletion through support.',
  },
];

const DATA_USES = [
  'Account identity: Riot ID, PUUID, region, and profile icon for account verification and display.',
  'League profile data: rank, division, LP, winrate, preferred roles, and champion mastery to make teammate discovery more relevant.',
  'Match data: limited use for practice/result verification and profile context where the user has opted into the related feature.',
  'RSO, when approved: secure user-authorized Riot account linking and future access to data that requires explicit player consent.',
];

export default function RiotReviewPage() {
  return (
    <>
      <SEOHead
        title="Riot API Review"
        description="RiftEssence Riot API production key and RSO review overview: use case, user flows, data usage, security, and legal links."
        path="/riot"
        keywords="RiftEssence Riot API, Riot production key, Riot Sign On, League of Legends community platform"
      />

      <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <section className="border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <Link href="/" className="text-sm hover:underline" style={{ color: 'var(--color-accent-1)' }}>
              Back to RiftEssence
            </Link>
            <div className="mt-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-muted)' }}>
                Riot API review
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl" style={{ color: 'var(--color-text-primary)' }}>
                RiftEssence is a League of Legends teammate discovery and team practice platform.
              </h1>
              <p className="mt-5 text-base leading-7 sm:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                This page summarizes the Riot API use case, user flows, data usage, security posture, and legal pages for production key review.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-lg border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Approved Use Case Fit</h2>
              <p className="mt-4 leading-7" style={{ color: 'var(--color-text-secondary)' }}>
                RiftEssence helps League of Legends players find compatible duo partners, create LFT posts, join teams, schedule practice, and run scrims. Riot API data is used to verify account ownership, enrich player profiles, improve filters, and support fair practice coordination.
              </p>
              <p className="mt-4 leading-7" style={{ color: 'var(--color-text-secondary)' }}>
                RiftEssence does not present itself as an official Riot product. Community ratings, feedback, and future sparring statistics are RiftEssence-only social/practice signals and are not represented as official Riot MMR, ranked ladder data, or Riot endorsement.
              </p>
            </section>

            <aside className="rounded-lg border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Legal Links</h2>
              <div className="mt-4 grid gap-3">
                <Link href="/terms" className="rounded-md border px-4 py-3 text-sm font-semibold hover:underline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-1)' }}>
                  Terms of Service
                </Link>
                <Link href="/privacy" className="rounded-md border px-4 py-3 text-sm font-semibold hover:underline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-1)' }}>
                  Privacy Policy
                </Link>
                <Link href="/cookies" className="rounded-md border px-4 py-3 text-sm font-semibold hover:underline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-1)' }}>
                  Cookie Policy
                </Link>
              </div>
            </aside>
          </div>

          <section className="mt-6 rounded-lg border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Reviewer Flow</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {REVIEW_STEPS.map((step, index) => (
                <article key={step.title} className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
                    Step {index + 1}
                  </div>
                  <h3 className="mt-2 text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{step.title}</h3>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>{step.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Riot Data Usage</h2>
              <ul className="mt-4 space-y-3">
                {DATA_USES.map((item) => (
                  <li key={item} className="text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Security Commitments</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                <li>Riot API keys and OAuth secrets are used only from the backend and are never exposed to browser clients.</li>
                <li>Authentication uses signed JWT sessions, password hashing, input validation, CORS restrictions, and abuse controls.</li>
                <li>Riot account identifiers are used for user-facing features, not sold, and not shared with unrelated third parties.</li>
                <li>Users can unlink accounts, adjust discoverability, and request deletion of account-associated data.</li>
              </ul>
            </div>
          </section>

          <section className="mt-6 rounded-lg border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Riot Disclaimer</h2>
            <p className="mt-4 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
              RiftEssence is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
