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
            How to link your Discord server
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            A fast, step-by-step walkthrough to connect your Discord server and start syncing posts.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              title: '1) Invite the RiftEssence Bot',
              body: 'Add our Discord bot to your server. You can find the invite link on our website or Discord.',
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
              body: 'In your server, run /setfeedchannel in the channel that should receive duo posts from the app. Use /listfeedchannels to verify.',
            },
            {
              title: '5) Manage your community',
              body: 'As the community admin, you can edit your community info, update the invite link, or remove it entirely from your community page on RiftEssence.',
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

        <div className="mt-6 p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Need help?
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Make sure you have Administrator permissions on your Discord server before running /linkserver. The link code expires in 10 minutes — you can generate a new one anytime.
          </p>
          <div className="flex flex-wrap gap-3">
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
