import React from 'react';
import Link from 'next/link';

const DISCORD_INVITE_URL =
  'https://discord.com/oauth2/authorize?client_id=1363678859471491312&scope=bot&permissions=2147863617';
const SUPPORT_DISCORD_URL = 'https://discord.gg/uypaWqmxx6';

export default function CommunityGuidePage() {
  const commandCards = [
    {
      command: '/linkserver',
      title: 'Link your Discord server',
      description: 'Run once as Discord admin to generate an 8-character code.',
      detail: 'Use that code on RiftEssence to connect your server and community.',
      glow: 'rgba(96, 165, 250, 0.42)',
      chipBg: 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(37,99,235,0.25))',
      chipBorder: 'rgba(96, 165, 250, 0.65)',
    },
    {
      command: '/setup',
      title: 'Configure forwarding in this channel',
      description: 'Choose Duo Feed or LFT Feed, then Global or Custom Filters.',
      detail: 'Run this command in each destination channel you want to use.',
      glow: 'rgba(94, 234, 212, 0.42)',
      chipBg: 'linear-gradient(135deg, rgba(20,184,166,0.35), rgba(13,148,136,0.25))',
      chipBorder: 'rgba(45, 212, 191, 0.65)',
    },
    {
      command: '/rolemenu',
      title: 'Optional: map rank and language roles',
      description: 'Assign Discord roles from RiftEssence profile rank and language.',
      detail: 'Great for communities that want automatic role sync in Discord.',
      glow: 'rgba(251, 191, 36, 0.4)',
      chipBg: 'linear-gradient(135deg, rgba(234,179,8,0.35), rgba(217,119,6,0.22))',
      chipBorder: 'rgba(251, 191, 36, 0.65)',
    },
  ];

  const setupSteps = [
    {
      label: 'Invite Bot',
      text: 'Add RiftEssence Bot to your Discord server.',
    },
    {
      label: 'Run /linkserver',
      text: 'Generate the temporary link code.',
    },
    {
      label: 'Register Community',
      text: 'Paste the code on RiftEssence communities register page.',
    },
    {
      label: 'Run /setup in channel',
      text: 'Pick Duo or LFT and filters for that exact channel.',
    },
  ];

  const commonConfusions = [
    {
      title: 'Placeholder FAQ Slot 01',
      body: 'Reserved for the most reported onboarding friction once enough support data is collected.',
    },
    {
      title: 'Placeholder FAQ Slot 02',
      body: 'Reserved for a high-frequency setup confusion observed from real user questions.',
    },
    {
      title: 'Placeholder FAQ Slot 03',
      body: 'Reserved for a recurrent permission or command-visibility issue once patterns are confirmed.',
    },
    {
      title: 'Placeholder FAQ Slot 04',
      body: 'Reserved for a recurring feed-behavior misunderstanding reported by community admins.',
    },
  ];

  const [previewMode, setPreviewMode] = React.useState<'LFD' | 'LFT'>('LFD');
  const isLfdPreview = previewMode === 'LFD';

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{
        background:
          'radial-gradient(circle at 10% 12%, rgba(59,130,246,0.16) 0%, transparent 40%), radial-gradient(circle at 90% 10%, rgba(20,184,166,0.15) 0%, transparent 36%), linear-gradient(to bottom, var(--color-bg-primary), var(--color-bg-secondary))',
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <section
          className="p-6 sm:p-8 rounded-2xl border relative overflow-hidden"
          style={{
            background: 'linear-gradient(118deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div
            className="absolute -right-14 -top-14 w-52 h-52 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(88,101,242,0.35), transparent 70%)' }}
          />
          <div
            className="absolute -left-10 -bottom-12 w-44 h-44 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.25), transparent 72%)' }}
          />

          <div className="relative flex flex-col lg:flex-row gap-6 lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.16em] font-semibold" style={{ color: 'var(--color-accent-1)' }}>
                Communities • Discord Onboarding
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold mt-2" style={{ color: 'var(--color-text-primary)' }}>
                Set Up Duo and LFT Forwarding in Under 2 Minutes
              </h1>
              <p className="text-sm sm:text-base mt-3" style={{ color: 'var(--color-text-secondary)' }}>
                No guesswork. Link your server, run one command in the destination channel, and your community feed is
                live.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  No coding needed
                </span>
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Works with Duo and LFT
                </span>
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Admin-safe setup flow
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all hover:translate-y-[-1px]"
                style={{ backgroundColor: '#5865F2', color: '#fff', boxShadow: '0 8px 18px rgba(88,101,242,0.35)' }}
              >
                Add Bot
              </a>
              <Link
                href="/communities/register"
                className="px-4 py-2.5 rounded-lg font-semibold border transition-all hover:translate-y-[-1px]"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg-tertiary)',
                }}
              >
                Link your server
              </Link>
            </div>
          </div>
        </section>

        <section
          className="p-4 rounded-xl border"
          style={{
            background: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border)',
            borderLeft: '4px solid var(--color-accent-1)',
          }}
        >
          <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--color-accent-1)' }}>
            Most Important Rule
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Run <strong>/setup</strong> in the exact Discord channel where you want forwarded posts to appear. The
            command configures the current channel only.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Commands You Will Use
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {commandCards.map((card) => (
              <div
                key={card.command}
                className="p-4 rounded-xl border transition-all hover:translate-y-[-1px]"
                style={{
                  background: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  boxShadow: `0 10px 24px ${card.glow}`,
                }}
              >
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold"
                  style={{
                    background: card.chipBg,
                    borderColor: card.chipBorder,
                    color: '#F8FAFC',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 10px 22px rgba(15, 23, 42, 0.45)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {card.command}
                </div>

                <h3 className="text-base font-bold mt-3" style={{ color: 'var(--color-text-primary)' }}>
                  {card.title}
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {card.description}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  {card.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="p-5 rounded-2xl border"
          style={{
            background: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Mirroring Preview: App vs Discord
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Switch between <strong>LFD</strong> and <strong>LFT</strong> previews.
              </p>
            </div>

            <div
              className="inline-flex p-1 rounded-xl border"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewMode('LFD')}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg transition-all"
                style={{
                  background: isLfdPreview ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(14,165,233,0.24))' : 'transparent',
                  color: isLfdPreview ? '#E2E8F0' : 'var(--color-text-muted)',
                  border: isLfdPreview ? '1px solid rgba(96,165,250,0.5)' : '1px solid transparent',
                }}
              >
                LFD Preview
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('LFT')}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg transition-all"
                style={{
                  background: !isLfdPreview ? 'linear-gradient(135deg, rgba(16,185,129,0.28), rgba(20,184,166,0.22))' : 'transparent',
                  color: !isLfdPreview ? '#E2E8F0' : 'var(--color-text-muted)',
                  border: !isLfdPreview ? '1px solid rgba(45,212,191,0.5)' : '1px solid transparent',
                }}
              >
                LFT Preview
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--color-accent-1)' }}>
                RiftEssence Feed Card {isLfdPreview ? '• LFD' : '• LFT'}
              </p>
              <div className="rounded-lg border p-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                {isLfdPreview ? (
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      background: 'linear-gradient(110deg, #151822 0%, #1c202c 55%, #141721 100%)',
                      borderColor: 'rgba(80,120,255,0.42)',
                      boxShadow: '0 16px 34px rgba(2,6,23,0.45)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-3xl font-extrabold leading-none" style={{ color: '#F8FAFC' }}>
                            thvlys
                          </p>
                          <span
                            className="px-3 py-1 rounded-md text-sm font-semibold border"
                            style={{
                              color: '#A5B4FC',
                              background: 'rgba(30,64,175,0.35)',
                              borderColor: 'rgba(129,140,248,0.5)',
                            }}
                          >
                            🎮 thvlys
                          </span>
                        </div>

                        <div className="mt-2 text-sm flex items-center gap-2 flex-wrap" style={{ color: '#D1D5DB' }}>
                          <span>11/04/2026 at 19:36</span>
                          <span style={{ opacity: 0.45 }}>•</span>
                          <span>EUW</span>
                          <span style={{ opacity: 0.45 }}>•</span>
                          <span
                            className="px-2 py-0.5 rounded border text-xs font-semibold"
                            style={{ borderColor: 'rgba(251,191,36,0.7)', color: '#FBBF24' }}
                          >
                            🛡 SUPPORT
                          </span>
                          <span style={{ color: '#9CA3AF' }}>&</span>
                          <span
                            className="px-2 py-0.5 rounded border text-xs font-semibold"
                            style={{ borderColor: 'rgba(251,191,36,0.7)', color: '#FBBF24' }}
                          >
                            🔁 TOP
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <span
                          className="px-3 py-1.5 rounded-md text-sm font-semibold border"
                          style={{ borderColor: 'rgba(113,113,122,0.7)', background: '#23262f', color: '#D4AF67' }}
                        >
                          View Profile
                        </span>
                        <span
                          className="px-3 py-1.5 rounded-md text-sm font-semibold border"
                          style={{ borderColor: 'rgba(113,113,122,0.7)', background: '#23262f', color: '#D4AF67' }}
                        >
                          Share Post
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                      <div className="rounded-lg border p-3" style={{ background: '#2A2D38', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <p className="text-sm" style={{ color: '#A7AAB4' }}>
                          Posting With
                        </p>
                        <p className="mt-1 text-3xl font-bold leading-none" style={{ color: '#F3F4F6' }}>
                          🔴 Thvlys#9099
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className="px-3 py-1 rounded-md text-sm font-semibold border"
                            style={{ borderColor: '#8CC4FF', color: '#BFE5FF', background: 'rgba(56,189,248,0.12)' }}
                          >
                            💠 DIAMOND IV
                          </span>
                          <span
                            className="px-3 py-1 rounded-md text-sm font-semibold border"
                            style={{ borderColor: '#3B82F6', color: '#60A5FA', background: 'rgba(59,130,246,0.15)' }}
                          >
                            ◆ 51.3% WR
                          </span>
                        </div>
                      </div>

                      <div
                        className="rounded-lg border p-3 flex flex-col items-center justify-center"
                        style={{ background: '#2A2D38', borderColor: 'rgba(255,255,255,0.06)' }}
                      >
                        <div style={{ fontSize: 34, color: '#D4AF67', lineHeight: 1 }}>★</div>
                        <p className="text-sm font-bold mt-1" style={{ color: '#D4AF67' }}>
                          MAIN ACCOUNT
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border p-3 mt-3" style={{ background: '#2A2D38', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <p className="text-2xl" style={{ color: '#F3F4F6' }}>
                        cherche duo pour la soirée !
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span
                        className="px-3 py-1 rounded-md text-sm font-bold"
                        style={{ background: 'rgba(217,119,6,0.2)', color: '#D4AF67' }}
                      >
                        VC: SOMETIMES
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-md text-sm font-semibold border"
                        style={{ borderColor: '#2563EB', color: '#F3F4F6', background: 'linear-gradient(135deg, #1E3A8A, #1D4ED8)' }}
                      >
                        French
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-md text-sm font-semibold border"
                        style={{ borderColor: '#DC2626', color: '#F3F4F6', background: 'linear-gradient(135deg, #1E3A8A, #DB2777)' }}
                      >
                        English
                      </span>
                      {['🧙', '🗡️', '🦊', '🔥', '🎯', '🏹'].map((champ, idx) => (
                        <span
                          key={idx}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.22)' }}
                        >
                          {champ}
                        </span>
                      ))}
                    </div>

                    <div
                      className="mt-3 rounded-lg border p-3 flex items-center justify-between gap-3 flex-wrap"
                      style={{ background: '#2A2D38', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="text-sm font-semibold" style={{ color: '#D1D5DB' }}>
                        Skill: ★ ★ ★ ★ ★ <span style={{ color: '#D4AF67', marginLeft: 6 }}>0.0/5</span> <span style={{ color: '#9CA3AF' }}>(0)</span>
                      </div>
                      <div className="text-sm font-semibold" style={{ color: '#D1D5DB' }}>
                        Personality: ☾ ☾ ☾ ☾ ☾ <span style={{ color: '#D4AF67', marginLeft: 6 }}>0.0/5</span> <span style={{ color: '#9CA3AF' }}>(0)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      background: 'linear-gradient(110deg, #151822 0%, #1c202c 55%, #141721 100%)',
                      borderColor: 'rgba(37,99,235,0.65)',
                      boxShadow: '0 16px 34px rgba(2,6,23,0.45)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(37,99,235,0.26)', color: '#93C5FD' }}
                        >
                          👤
                        </span>
                        <div>
                          <p className="text-xs uppercase font-bold" style={{ color: '#60A5FA' }}>
                            PLAYER LISTING
                          </p>
                          <p className="text-3xl font-extrabold leading-none" style={{ color: '#F8FAFC' }}>
                            thvlys
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2.5 py-1 rounded-md text-xs border"
                          style={{ borderColor: 'rgba(255,255,255,0.18)', color: '#D1D5DB', background: '#2A2D38' }}
                        >
                          🕘 12 avr. 2026
                        </span>
                        <span
                          className="px-2.5 py-1 rounded-md text-xs border"
                          style={{ borderColor: 'rgba(59,130,246,0.5)', color: '#93C5FD', background: 'rgba(30,64,175,0.22)' }}
                        >
                          🌍 EUW
                        </span>
                        <span
                          className="px-2.5 py-1 rounded-md text-xs border"
                          style={{ borderColor: 'rgba(99,102,241,0.5)', color: '#A5B4FC', background: 'rgba(49,46,129,0.3)' }}
                        >
                          💬 thvlys
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-3 mt-3">
                      <div className="rounded-lg border p-3" style={{ background: '#2A2D38', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span
                            className="px-3 py-1 rounded-md text-sm font-semibold border"
                            style={{ borderColor: '#3B82F6', color: '#60A5FA', background: 'rgba(59,130,246,0.15)' }}
                          >
                            👤 Player
                          </span>
                          <span
                            className="px-3 py-1 rounded-md text-sm font-semibold border"
                            style={{ borderColor: '#D4AF67', color: '#D4AF67', background: 'rgba(212,175,103,0.14)' }}
                          >
                            🛡 SUPPORT
                          </span>
                          <span
                            className="px-3 py-1 rounded-md text-sm font-semibold border"
                            style={{ borderColor: '#8CC4FF', color: '#BFE5FF', background: 'rgba(56,189,248,0.12)' }}
                          >
                            💠 DIAMOND IV
                          </span>
                        </div>

                        <p className="text-2xl leading-snug" style={{ color: '#F3F4F6' }}>
                          I am looking for a serious team with a coach available, open to changing champion pool!
                        </p>
                      </div>

                      <div className="rounded-lg border p-3" style={{ background: '#2A2D38', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>
                          📌 SNAPSHOT
                        </p>
                        <ul className="mt-2 space-y-1 text-sm" style={{ color: '#E5E7EB' }}>
                          <li>🧩 Experienced</li>
                          <li>🗓 Four Times A Week</li>
                          <li>🎂 Age 20</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2.5 py-1 rounded-md text-sm font-semibold border"
                        style={{ borderColor: '#2563EB', color: '#F3F4F6', background: 'linear-gradient(135deg, #1E3A8A, #1D4ED8)' }}
                      >
                        English
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-md text-sm font-semibold"
                        style={{ background: '#2A2D38', color: '#D4AF67' }}
                      >
                        Weakside
                      </span>
                    </div>

                    <div className="mt-3 rounded-lg border p-3" style={{ background: '#2A2D38', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>
                        🗡 CHAMPION POOL
                      </p>

                      <div className="mt-2 space-y-3">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#F87171' }}>S Tier</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {['Diana', 'Karma', 'Lulu'].map((name) => (
                              <span
                                key={name}
                                className="px-3 py-1 rounded-lg text-sm font-semibold border"
                                style={{ borderColor: '#EF4444', color: '#F87171', background: 'rgba(239,68,68,0.12)' }}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#FCD34D' }}>A Tier</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {['Leona', 'Rell', 'Milio', 'Swain', 'Nami'].map((name) => (
                              <span
                                key={name}
                                className="px-3 py-1 rounded-lg text-sm font-semibold border"
                                style={{ borderColor: '#D4AF67', color: '#D4AF67', background: 'rgba(212,175,103,0.12)' }}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#60A5FA' }}>B Tier</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span
                              className="px-3 py-1 rounded-lg text-sm font-semibold border"
                              style={{ borderColor: '#3B82F6', color: '#60A5FA', background: 'rgba(59,130,246,0.12)' }}
                            >
                              Braum
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span
                        className="px-3 py-1.5 rounded-md text-sm font-semibold"
                        style={{ background: '#2A2D38', color: '#D4AF67' }}
                      >
                        👤 View Profile
                      </span>
                      <span
                        className="px-3 py-1.5 rounded-md text-sm font-semibold"
                        style={{ background: 'rgba(127,29,29,0.35)', color: '#F87171' }}
                      >
                        Delete
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: 'rgba(88,101,242,0.45)',
                background: 'linear-gradient(180deg, #313338 0%, #2b2d31 100%)',
              }}
            >
              <p className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: '#A5B4FC' }}>
                Discord Feed Mirror {isLfdPreview ? '• LFD' : '• LFT'}
              </p>

              <div
                className="text-sm"
                style={{
                  color: '#dbdee1',
                  fontFamily: "'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      background: '#f59e0b',
                      fontSize: 16,
                      boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    🟡
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap" style={{ lineHeight: 1.2 }}>
                      <span style={{ fontWeight: 700, color: '#f2f3f5' }}>RiftEssence Bot</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 4,
                          color: '#fff',
                          background: '#5865f2',
                          letterSpacing: '0.02em',
                        }}
                      >
                        APP
                      </span>
                      <span style={{ fontSize: 12, color: '#949ba4' }}>Yesterday at 7:36 PM</span>
                    </div>

                    <div
                      className="inline-block"
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        color: '#c9cdfb',
                        background: 'rgba(88, 101, 242, 0.2)',
                        border: '1px solid rgba(88, 101, 242, 0.36)',
                      }}
                    >
                      {isLfdPreview ? '@Thvlys' : '@Vortex'}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        borderLeft: '4px solid #4f8cff',
                        borderRadius: 4,
                        padding: '10px 12px',
                        background: '#2f3136',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        maxWidth: 560,
                      }}
                    >
                      <div style={{ color: '#60a5fa', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 8 }}>
                        {isLfdPreview ? 'Duo • thvlys' : 'Player LFT • Vortex'}
                      </div>

                      <div
                        style={{
                          marginBottom: 8,
                          paddingLeft: 10,
                          borderLeft: '3px solid rgba(148, 155, 164, 0.55)',
                          color: '#dbdee1',
                        }}
                      >
                        {isLfdPreview
                          ? 'cherche duo pour la soirée !'
                          : 'Consistent ADC looking for a serious team. Comfortable with structured scrim blocks and VOD review.'}
                      </div>

                      {isLfdPreview ? (
                        <>
                          <div style={{ fontSize: 14, color: '#f2f3f5', lineHeight: 1.35 }}>🔴 <strong>Thvlys#9099</strong></div>
                          <div style={{ fontSize: 14, color: '#f2f3f5', lineHeight: 1.35 }}>📍 <strong>EUW</strong> • 🛡 SUPPORT</div>
                          <div style={{ fontSize: 14, color: '#f2f3f5', lineHeight: 1.35 }}>💎 DIAMOND IV • 📉 51.3%</div>
                          <div style={{ fontSize: 14, color: '#f2f3f5', lineHeight: 1.35 }}>🎙️ Sometimes VC</div>
                          <div style={{ fontSize: 14, color: '#f2f3f5', lineHeight: 1.35 }}>🈯 French, English</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 14, color: '#f2f3f5', lineHeight: 1.35 }}>👤 <strong>Vortex</strong></div>
                          <div style={{ fontSize: 14, color: '#f2f3f5', lineHeight: 1.35 }}>📍 <strong>EUW</strong> • 🏹 ADC</div>
                          <div style={{ fontSize: 14, color: '#f2f3f5', lineHeight: 1.35 }}>🥇 GOLD II • 🧩 Experience: Moderate</div>
                          <div style={{ fontSize: 14, color: '#f2f3f5', lineHeight: 1.35 }}>📅 Availability: Weekdays + Weekends</div>
                          <div style={{ fontSize: 14, color: '#f2f3f5', lineHeight: 1.35 }}>🈯 English, French</div>
                        </>
                      )}
                      <div style={{ marginTop: 2, fontSize: 14, color: '#60a5fa' }}>↗ open in app</div>

                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#f2f3f5' }}>
                        RiftEssence • Yesterday at 7:36 PM
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Quick Setup Flow
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {setupSteps.map((step, idx) => (
              <div
                key={step.label}
                className="rounded-xl border p-4"
                style={{
                  background: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-2"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    color: 'var(--color-accent-1)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {idx + 1}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {step.label}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Need help?
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Make sure you have Administrator permissions in Discord. If forwarding appears in the wrong place, rerun
            <strong> /setup </strong>
            in the correct destination channel.
          </p>

          <div
            className="rounded-lg border p-3 mb-3"
            style={{
              background: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Placeholder FAQ (temporary)
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              These FAQ cards are placeholders for now because we do not yet have enough real support volume to rank
              the most frequent confusions. If something feels unclear, share your case in the support Discord so we
              can replace placeholders with real guidance from your feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {commonConfusions.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border p-3"
                style={{
                  background: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {item.title}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded font-semibold flex items-center gap-2"
              style={{ backgroundColor: '#5865F2', color: '#fff' }}
            >
              Add Bot
            </a>
            <a
              href={SUPPORT_DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded font-semibold flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #5865F2, #3B82F6)',
                color: '#fff',
              }}
            >
              Join Support Discord
            </a>
            <Link
              href="/communities/register"
              className="px-4 py-2 rounded font-semibold"
              style={{
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              Link your server
            </Link>
            <Link
              href="/communities"
              className="px-4 py-2 rounded font-semibold"
              style={{
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              Back to communities
            </Link>
          </div>
        </section>
      </div>

    </div>
  );
}
