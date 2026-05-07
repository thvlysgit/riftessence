import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    IRON: '#9CA3AF',
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
    ALWAYS: 'Voice chat',
    SOMETIMES: 'Voice optional',
    NEVER: 'No voice',
  };
  return map[String(value || '')] || 'Flexible';
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

function cleanMessage(value: unknown): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampText(value: unknown, max = 190): string {
  const text = cleanMessage(value);
  if (text.length <= max) return text;
  const clipped = text.slice(0, max - 3).trim();
  const lastSpace = clipped.lastIndexOf(' ');
  const safeClip = lastSpace > max * 0.65 ? clipped.slice(0, lastSpace) : clipped;
  return `${safeClip.replace(/[,.!?;:]+$/, '')}...`;
}

function roleLabel(role?: string | null): string {
  const map: Record<string, string> = {
    TOP: 'Top',
    JUNGLE: 'Jungle',
    MID: 'Mid',
    MIDDLE: 'Mid',
    ADC: 'ADC',
    BOT: 'Bot',
    SUPPORT: 'Support',
    SUP: 'Support',
    FILL: 'Flex',
  };
  return map[String(role || '').toUpperCase()] || String(role || 'Flex');
}

async function loadPost(req: NextRequest) {
  const parsed = new URL(req.url);
  const params = parsed.searchParams;
  const gameName = params.get('gn');
  const hasInlineData = Boolean(
    gameName
    || params.get('user')
    || params.get('msg')
    || params.get('role')
    || params.get('rank')
  );

  if (hasInlineData) {
    return {
      username: params.get('user') || gameName || 'Duo Player',
      role: params.get('role') || '',
      secondRole: params.get('role2') || null,
      region: params.get('region') || '',
      vcPreference: params.get('vc') || '',
      message: cleanMessage(params.get('msg')),
      languages: (params.get('langs') || '').split(',').filter(Boolean),
      postingRiotAccount: {
        gameName: gameName || params.get('user') || 'Duo Player',
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
    const primaryRole = roleLabel(post?.role);
    const secondaryRole = post?.secondRole ? roleLabel(post.secondRole) : '';
    const roleText = secondaryRole ? `${primaryRole} / ${secondaryRole}` : primaryRole;
    const rankText = formatRank(account);
    const rawMessage = cleanMessage(post?.message);
    const message = clampText(rawMessage || `Looking for a ${roleText.toLowerCase()} duo with good vibes and clear climb goals.`, 112);
    const messageSize = message.length > 94 ? '31px' : message.length > 72 ? '35px' : '39px';
    const displayName = `${gameName}${tagLine}`;
    const nameSize = displayName.length > 22 ? '31px' : displayName.length > 16 ? '36px' : '42px';
    const languages = Array.isArray(post?.languages) ? post.languages.slice(0, 2) : [];
    const metaItems = [
      rankText,
      account?.winrate != null ? `${Number(account.winrate).toFixed(1)}% WR` : '',
      formatVc(post?.vcPreference),
      ...languages.map((lang: string) => lang.toUpperCase()),
    ].filter(Boolean).slice(0, 4);

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
            padding: '38px',
          }}
        >
          <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '20px', overflow: 'hidden', border: '2px solid #263A54' }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: '750px', padding: '46px', backgroundColor: '#08172A' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', width: '14px', height: '52px', borderRadius: '7px', backgroundColor: rankColor }} />
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '16px' }}>
                  <div style={{ display: 'flex', color: rankColor, fontSize: '24px', fontWeight: 950 }}>
                    LOOKING FOR {roleText.toUpperCase()} DUO
                  </div>
                  <div style={{ display: 'flex', marginTop: '5px', color: '#8EA6C4', fontSize: '18px', fontWeight: 700 }}>
                    Open the post to reply with your Riot account attached
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '38px', height: '240px', padding: '30px', borderRadius: '16px', backgroundColor: '#06101F', border: `1px solid ${rankColor}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', color: rankColor, fontSize: '18px', fontWeight: 950, marginBottom: '16px' }}>
                  PLAYER MESSAGE
                </div>
                <div style={{ display: 'flex', color: '#EEF5FF', fontSize: messageSize, lineHeight: 1.22, fontWeight: 800, width: '622px', maxHeight: '148px', overflow: 'hidden', wordBreak: 'break-word' }}>
                  {message}
                </div>
              </div>

              <div style={{ display: 'flex', marginTop: '26px', gap: '12px' }}>
                {metaItems.map((item, index) => (
                  <div key={item} style={{ display: 'flex', height: '44px', alignItems: 'center', padding: '0 15px', borderRadius: '8px', backgroundColor: index === 1 ? '#0D1B2E' : '#102C49', color: index === 1 ? winrateColor : '#D9C98C', border: index === 1 ? `1px solid ${winrateColor}` : '1px solid #2F4662', fontSize: item.length > 13 ? '18px' : '20px', fontWeight: 900 }}>
                    {item}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', marginTop: 'auto', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', color: '#526A88', fontSize: '18px', fontWeight: 750 }}>
                  riftessence.app
                </div>
                {post?.region ? (
                  <div style={{ display: 'flex', color: '#6F86A5', fontSize: '16px', fontWeight: 750 }}>
                    {post.region}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '34px', backgroundColor: '#0B223A' }}>
              <div style={{ display: 'flex', flexDirection: 'column', height: '112px', padding: '21px', borderRadius: '14px', backgroundColor: '#071427', border: `1px solid ${rankColor}` }}>
                <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '18px', fontWeight: 850 }}>Posted by</div>
                <div style={{ display: 'flex', marginTop: '10px', color: '#F0E6D2', fontSize: nameSize, fontWeight: 950, lineHeight: 1, width: '314px', overflow: 'hidden' }}>
                  {displayName}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
                {[
                  ['Verified context', 'See their linked League account before you reply.'],
                  ['Better replies', 'Open the card, answer in-app, and keep the chat focused.'],
                  ['Trust signal', 'Ratings and match context help filter the fit.'],
                ].map(([title, body], index) => (
                  <div key={title} style={{ display: 'flex', flexDirection: 'column', height: '82px', padding: '15px 18px', borderRadius: '12px', backgroundColor: '#071427', border: '1px solid #263A54' }}>
                    <div style={{ display: 'flex', color: index === 0 ? '#8BE3F9' : index === 1 ? '#47D889' : '#F4D03F', fontSize: '20px', fontWeight: 950 }}>{title}</div>
                    <div style={{ display: 'flex', marginTop: '6px', color: '#A9BDD7', fontSize: '15px', lineHeight: 1.15, width: '304px' }}>{body}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', marginTop: 'auto', height: '56px', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', backgroundColor: '#132F4D', color: '#E9D9A3', fontSize: '22px', fontWeight: 950 }}>
                Open post to duo up
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
