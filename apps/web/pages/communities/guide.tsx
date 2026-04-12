import React from 'react';
import Link from 'next/link';

export default function CommunityGuidePage() {
  return (
    <div className="min-h-screen py-10 px-4" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-wide font-semibold" style={{ color: 'var(--color-accent-1)' }}>
            Communities • Quick Guide
          </p>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            How to link your Discord server and forward posts
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            A fast, step-by-step walkthrough to connect your Discord server and configure Duo/LFT forwarding correctly.
          </p>
        </div>

        <div
          className="mb-6 p-4 rounded-xl border"
          style={{
            background: 'rgba(88, 101, 242, 0.12)',
            borderColor: 'rgba(88, 101, 242, 0.4)',
          }}
        >
          <p className="text-sm font-semibold" style={{ color: '#8EA1FF' }}>
            Important
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Run <strong>/setup</strong> in the exact Discord channel where you want posts to appear. The command configures the current channel only.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              title: '1) Invite the RiftEssence Bot',
              body: 'Add our Discord bot to your server. You need Administrator permissions to do so.',
              action: {
                label: 'Add Bot to Discord',
                href: 'https://discord.com/oauth2/authorize?client_id=1363678859471491312&scope=bot&permissions=2147863617',
                external: true,
                discord: true,
              },
            },
            {
              title: '2) Run /linkserver in Discord',
              body: 'Use the /linkserver command in any channel on your server. You need Administrator permissions. The bot will give you a unique 8-character link code that expires in 10 minutes.',
            },
            {
              title: '3) Enter the code on RiftEssence',
              body: 'Go to the registration page, paste the code, and fill in your community details (name, regions, language). This will link your Discord server and make you the community admin.',
              action: {
                label: 'Open registration page',
                href: '/communities/register',
              },
            },
            {
              title: '4) Set a feed channel in Discord',
              body: 'Open the destination channel and run /setup there. Choose Duo Feed or LFT Feed, then pick Global or Custom Filters. You can run /setup again in another channel to add more feeds.',
            },
            {
              title: '5) Manage your community',
              body: 'As the community admin, you can edit your community info, manage members, and keep Discord forwarding aligned with your server channels.',
            },
          ].map((step, idx) => (
            <div
              key={step.title}
              className="p-5 rounded-xl border"
              style={{
                background: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Step {idx + 1}
                  </p>
                  <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {step.body}
                  </p>
                  {step.action && (
                    step.action.external ? (
                      <a
                        href={step.action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded font-semibold"
                        style={{
                          backgroundColor: step.action.discord ? '#5865F2' : undefined,
                          background: step.action.discord ? undefined : 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                          color: '#fff',
                        }}
                      >
                        {step.action.discord && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
                        )}
                        {step.action.label}
                      </a>
                    ) : (
                      <Link
                        href={step.action.href}
                        className="inline-block mt-3 px-4 py-2 rounded font-semibold"
                        style={{
                          background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                          color: 'var(--color-bg-primary)',
                        }}
                      >
                        {step.action.label}
                      </Link>
                    )
                  )}
                </div>
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold flex-shrink-0"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    color: 'var(--color-accent-1)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {idx + 1}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-6 p-5 rounded-xl border"
          style={{
            background: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Preview: App Feed vs Discord Feed
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Same listing, two surfaces. Discord mirrors the key recruiting info so players can react quickly without leaving their server.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border" style={{ background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs uppercase font-semibold mb-2" style={{ color: 'var(--color-accent-1)' }}>
                RiftEssence Feed
              </p>
              <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <p><strong style={{ color: 'var(--color-text-primary)' }}>Player LFT • Vortex</strong></p>
                <p>🌍 EUW • 🏹 ADC • 🥇 GOLD II</p>
                <p>🧩 Experience: Moderate • 📅 Availability: Everyday</p>
                <p>🗣️ English, French</p>
                <p>🗡️ Champion Pool: S/A/B/C tiers with icons</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border" style={{ background: 'rgba(88, 101, 242, 0.12)', borderColor: 'rgba(88, 101, 242, 0.45)' }}>
              <p className="text-xs uppercase font-semibold mb-2" style={{ color: '#8EA1FF' }}>
                Discord Mirror
              </p>
              <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <p><strong style={{ color: 'var(--color-text-primary)' }}>Player LFT • Vortex</strong></p>
                <p>🌍 EUW</p>
                <p>🏹 ADC • 🥇 GOLD II</p>
                <p>🧩 Experience: MODERATE</p>
                <p>📅 Availability: EVERYDAY • 🗣️ English, French</p>
                <p>↗ Open in app link included</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Need help?
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Make sure you have Administrator permissions on your Discord server before running /linkserver. The link code expires in 10 minutes — you can generate a new one anytime.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://discord.com/oauth2/authorize?client_id=1363678859471491312&scope=bot&permissions=2147863617"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded font-semibold flex items-center gap-2"
              style={{ backgroundColor: '#5865F2', color: '#fff' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
              Add Bot
            </a>
            <Link href="/communities/register" className="px-4 py-2 rounded font-semibold" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
              Link your server
            </Link>
            <Link href="/communities" className="px-4 py-2 rounded font-semibold" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
              Back to communities
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
