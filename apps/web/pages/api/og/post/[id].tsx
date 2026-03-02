import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

function getRankColor(rank: string): string {
  const base = rank.split(' ')[0].toUpperCase();
  const colors: Record<string, string> = {
    IRON: '#6B7280',
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#00CED1',
    EMERALD: '#50C878',
    DIAMOND: '#8BE3F9',
    MASTER: '#C084FC',
    GRANDMASTER: '#FF6B6B',
    CHALLENGER: '#F4D03F',
  };
  return colors[base] || '#C8AA6D';
}

function getWRStyle(wr: number): { color: string; bg: string; label: string } {
  if (wr >= 60) return { color: '#F97316', bg: '#2A1500', label: `${wr.toFixed(1)}%  HOT` };
  if (wr >= 55) return { color: '#10B981', bg: '#052015', label: `${wr.toFixed(1)}%` };
  if (wr >= 50) return { color: '#84CC16', bg: '#0E1F02', label: `${wr.toFixed(1)}%` };
  if (wr >= 45) return { color: '#F59E0B', bg: '#1F1200', label: `${wr.toFixed(1)}%` };
  return { color: '#EF4444', bg: '#1F0505', label: `${wr.toFixed(1)}%` };
}

function formatVCPreference(vc: string): string {
  const map: Record<string, string> = {
    ALWAYS: 'VC Required',
    SOMETIMES: 'VC Optional',
    NEVER: 'No VC',
  };
  return map[vc] || vc;
}

export default async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || req.url.split('/api/og/post/')[1]?.split('?')[0];

    if (!id) {
      return new Response('Post ID required', { status: 400 });
    }

    const postRes = await fetch(`${API_URL}/api/posts/${id}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!postRes.ok) {
      return new Response('Post not found', { status: 404 });
    }

    const { post } = await postRes.json();

    const postingAccount = post.postingRiotAccount;
    const rankColor = postingAccount ? getRankColor(postingAccount.rank) : '#C8AA6D';
    const vcText = formatVCPreference(post.vcPreference);
    const message = post.message || '';
    const truncatedMessage = message.length > 110 ? message.substring(0, 107) + '...' : message;
    const rankLabel = postingAccount
      ? `${postingAccount.rank}${postingAccount.division ? ' ' + postingAccount.division : ''}${postingAccount.lp ? ' ' + postingAccount.lp + 'LP' : ''}`
      : '';
    const wrStyle = postingAccount && postingAccount.winrate !== null
      ? getWRStyle(postingAccount.winrate)
      : null;

    return new ImageResponse(
      (
        <div style={{ width: '1200px', height: '630px', display: 'flex', backgroundColor: '#06101F' }}>

          {/* Left accent bar */}
          <div style={{ display: 'flex', width: '10px', backgroundColor: rankColor }} />

          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '48px 60px 40px 52px' }}>

            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
              {/* "LOOKING FOR DUO" stylized pill */}
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: rankColor, padding: '10px 28px', borderRadius: '40px' }}>
                <div style={{ display: 'flex', fontSize: '22px', fontWeight: 'bold', color: '#06101F', letterSpacing: '3px' }}>
                  LOOKING FOR DUO
                </div>
              </div>
              {/* Region + username cluster */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', fontSize: '17px', color: '#4B5563' }}>
                  {post.username}
                </div>
                <div style={{ display: 'flex', fontSize: '17px', color: rankColor, backgroundColor: '#0D1B2E', padding: '8px 18px', borderRadius: '6px', border: `1px solid ${rankColor}` }}>
                  {post.region}
                </div>
              </div>
            </div>

            {/* Riot account name — HERO */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '6px' }}>
              <div style={{ display: 'flex', fontSize: '70px', fontWeight: 'bold', color: rankColor, lineHeight: 1 }}>
                {postingAccount ? postingAccount.gameName : post.username}
              </div>
              {postingAccount ? (
                <div style={{ display: 'flex', fontSize: '36px', fontWeight: 'bold', color: '#374151', lineHeight: 1, marginLeft: '4px' }}>
                  #{postingAccount.tagLine}
                </div>
              ) : null}
            </div>

            {/* Divider line in rank color */}
            <div style={{ display: 'flex', width: '80px', height: '3px', backgroundColor: rankColor, marginBottom: '24px' }} />

            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', flexWrap: 'nowrap' }}>
              {/* Main role — filled */}
              <div style={{ display: 'flex', fontSize: '17px', fontWeight: 'bold', color: '#06101F', backgroundColor: rankColor, padding: '8px 18px', borderRadius: '6px' }}>
                {post.role}
              </div>
              {/* Second role */}
              {post.secondRole ? (
                <div style={{ display: 'flex', fontSize: '17px', fontWeight: 'bold', color: rankColor, backgroundColor: '#0D1B2E', padding: '8px 18px', borderRadius: '6px', border: `1px solid ${rankColor}` }}>
                  {post.secondRole}
                </div>
              ) : null}
              {/* Separator */}
              <div style={{ display: 'flex', width: '1px', height: '28px', backgroundColor: '#1E2D42' }} />
              {/* Rank */}
              {postingAccount ? (
                <div style={{ display: 'flex', fontSize: '17px', fontWeight: 'bold', color: rankColor, backgroundColor: '#0D1B2E', padding: '8px 18px', borderRadius: '6px' }}>
                  {rankLabel}
                </div>
              ) : null}
              {/* WR with flare */}
              {wrStyle ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '17px', fontWeight: 'bold', color: wrStyle.color, backgroundColor: wrStyle.bg, padding: '8px 18px', borderRadius: '6px', border: `1px solid ${wrStyle.color}` }}>
                  <div style={{ display: 'flex' }}>WR</div>
                  <div style={{ display: 'flex', fontSize: '20px', fontWeight: 'bold' }}>{wrStyle.label}</div>
                </div>
              ) : null}
              {/* VC */}
              <div style={{ display: 'flex', fontSize: '15px', color: '#4B5563', backgroundColor: '#0D1B2E', padding: '8px 14px', borderRadius: '6px' }}>
                {vcText}
              </div>
            </div>

            {/* Message */}
            {truncatedMessage ? (
              <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', width: '3px', backgroundColor: rankColor, borderRadius: '2px', marginRight: '18px', alignSelf: 'stretch' }} />
                <div style={{ display: 'flex', fontSize: '19px', color: '#6B7280', lineHeight: 1.6, fontStyle: 'italic' }}>
                  {truncatedMessage}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flex: 1 }} />
            )}

            {/* Bottom watermark */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <div style={{ display: 'flex', fontSize: '13px', color: '#1E2D42' }}>
                riftessence.app
              </div>
            </div>

          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
