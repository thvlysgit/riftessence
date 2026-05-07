import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    IRON: '#8B8B8B',
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD166',
    PLATINUM: '#39D6C6',
    EMERALD: '#47D889',
    DIAMOND: '#8BE3F9',
    MASTER: '#C084FC',
    GRANDMASTER: '#FF6B6B',
    CHALLENGER: '#F4D03F',
    UNRANKED: '#8EA6C4',
  };
  return colors[rank] || '#C8AA6D';
}

function getWinrateColor(winrate: number | null | undefined): string {
  if (winrate == null) return '#8EA6C4';
  if (winrate >= 60) return '#F97316';
  if (winrate >= 55) return '#10B981';
  if (winrate >= 50) return '#84CC16';
  if (winrate >= 45) return '#F59E0B';
  return '#EF4444';
}

function formatVc(value: string | null | undefined): string {
  const map: Record<string, string> = {
    ALWAYS: 'Voice required',
    SOMETIMES: 'Voice optional',
    NEVER: 'No voice',
  };
  return map[String(value || '')] || 'Flexible comms';
}

function formatRank(account: any): string {
  const rank = String(account?.rank || 'UNRANKED').toUpperCase();
  if (rank === 'UNRANKED') return 'Unranked';
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank)) {
    return `${rank} ${account?.lp ?? 0} LP`;
  }
  return account?.division ? `${rank} ${account.division}` : rank;
}

function getId(req: NextRequest): string {
  const parsed = new URL(req.url);
  return parsed.searchParams.get('id') || req.url.split('/api/og/post/')[1]?.split('?')[0] || '';
}

async function loadPost(req: NextRequest) {
  const parsed = new URL(req.url);
  const params = parsed.searchParams;
  const gameName = params.get('gn');

  if (gameName) {
    return {
      username: params.get('user') || gameName,
      role: params.get('role') || '',
      secondRole: params.get('role2') || null,
      region: params.get('region') || '',
      vcPreference: params.get('vc') || '',
      message: params.get('msg') || '',
      languages: (params.get('langs') || '').split(',').filter(Boolean),
      postingRiotAccount: {
        gameName,
        tagLine: params.get('tag') || '',
        rank: params.get('rank') || 'UNRANKED',
        division: params.get('div') || null,
        lp: params.get('lp') ? Number(params.get('lp')) : null,
        winrate: params.get('wr') ? Number(params.get('wr')) : null,
      },
    };
  }

  const id = getId(req);
  if (!id) return null;

  const response = await fetch(`${API_URL}/api/posts/${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.post || null;
}

export default async function handler(req: NextRequest) {
  try {
    const post = await loadPost(req);
    const account = post?.postingRiotAccount || null;
    const rank = String(account?.rank || 'UNRANKED').toUpperCase();
    const rankColor = getRankColor(rank);
    const winrateColor = getWinrateColor(account?.winrate);
    const gameName = account?.gameName || post?.username || 'Duo Player';
    const tagLine = account?.tagLine ? `#${account.tagLine}` : '';
    const message = String(post?.message || 'Ready to queue with someone who fits the same climb.').slice(0, 190);
    const languages = Array.isArray(post?.languages) ? post.languages.slice(0, 4) : [];
    const valueCards = [
      ['Role', post?.secondRole ? `${post.role} / ${post.secondRole}` : post?.role || 'Flexible'],
      ['Region', post?.region || 'Any'],
      ['Comms', formatVc(post?.vcPreference)],
    ];

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            backgroundColor: '#050B14',
            color: '#F0E6D2',
            fontFamily: 'Inter, Segoe UI, sans-serif',
            padding: '42px',
          }}
        >
          <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '20px', overflow: 'hidden', border: '2px solid #23364F' }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: '760px', padding: '46px', backgroundColor: '#08172A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', width: '12px', height: '46px', borderRadius: '6px', backgroundColor: rankColor }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', color: rankColor, fontSize: '22px', fontWeight: 900 }}>LOOKING FOR DUO</div>
                  <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '16px', marginTop: '4px' }}>RiftEssence verified player card</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '38px' }}>
                <div style={{ display: 'flex', fontSize: gameName.length > 14 ? '62px' : '76px', fontWeight: 950, lineHeight: 1, maxWidth: '620px' }}>
                  {gameName}
                </div>
                {tagLine ? (
                  <div style={{ display: 'flex', marginLeft: '12px', marginBottom: '8px', color: rankColor, fontSize: '34px', fontWeight: 800 }}>
                    {tagLine}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', padding: '12px 18px', borderRadius: '8px', backgroundColor: rankColor, color: '#06101F', fontSize: '22px', fontWeight: 900 }}>
                  {formatRank(account)}
                </div>
                {account?.winrate != null ? (
                  <div style={{ display: 'flex', padding: '12px 18px', borderRadius: '8px', backgroundColor: '#0D1B2E', color: winrateColor, border: `1px solid ${winrateColor}`, fontSize: '22px', fontWeight: 900 }}>
                    {Number(account.winrate).toFixed(1)}% WR
                  </div>
                ) : null}
                {languages.map((lang: string) => (
                  <div key={lang} style={{ display: 'flex', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#0D1B2E', color: '#C8AA6D', border: '1px solid #2F4662', fontSize: '18px', fontWeight: 800 }}>
                    {lang.toUpperCase()}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', marginTop: '34px', padding: '24px', borderRadius: '14px', backgroundColor: '#06101F', border: `1px solid ${rankColor}` }}>
                <div style={{ display: 'flex', width: '5px', borderRadius: '4px', backgroundColor: rankColor, marginRight: '20px' }} />
                <div style={{ display: 'flex', color: '#B9C8DB', fontSize: '27px', lineHeight: 1.35 }}>
                  {message}
                </div>
              </div>

              <div style={{ display: 'flex', marginTop: 'auto', color: '#526A88', fontSize: '18px', fontWeight: 700 }}>
                riftessence.app
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '44px', backgroundColor: '#0B223A' }}>
              <div style={{ display: 'flex', color: '#C8AA6D', fontSize: '24px', fontWeight: 900 }}>Queue Snapshot</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '30px' }}>
                {valueCards.map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', padding: '22px', borderRadius: '12px', backgroundColor: '#071427', border: '1px solid #24364D' }}>
                    <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '17px', fontWeight: 700 }}>{label}</div>
                    <div style={{ display: 'flex', marginTop: '8px', color: '#F0E6D2', fontSize: '30px', fontWeight: 900 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', marginTop: 'auto', padding: '22px', borderRadius: '12px', backgroundColor: '#102C49', color: '#D9C98C', fontSize: '22px', fontWeight: 800, lineHeight: 1.25 }}>
                Open the post to check profile, ratings, account context and message them in app.
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch {
    return new ImageResponse(
      (
        <div style={{ width: '1200px', height: '630px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#06101F', color: '#C8AA6D', fontSize: '64px', fontWeight: 900 }}>
          LOOKING FOR DUO
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
