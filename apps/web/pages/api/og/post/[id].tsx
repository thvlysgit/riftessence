import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

function getRankColor(rank: string): string {
  const base = rank.split(' ')[0].toUpperCase();
  const colors: Record<string, string> = {
    IRON: '#4A4A4A',
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#00CED1',
    EMERALD: '#50C878',
    DIAMOND: '#B9F2FF',
    MASTER: '#9D4EDD',
    GRANDMASTER: '#FF6B6B',
    CHALLENGER: '#F4D03F',
  };
  return colors[base] || '#C8AA6D';
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
    const truncatedMessage = message.length > 100 ? message.substring(0, 97) + '...' : message;
    const rankLabel = postingAccount
      ? `${postingAccount.rank}${postingAccount.division ? ' ' + postingAccount.division : ''}${postingAccount.lp ? ' ' + postingAccount.lp + 'LP' : ''}`
      : '';

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            backgroundColor: '#080E1A',
          }}
        >
          {/* Left accent bar in rank color */}
          <div style={{ display: 'flex', width: '8px', backgroundColor: rankColor }} />

          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '52px 56px' }}>

            {/* Top row: "Looking for Duo" label + region */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div style={{ display: 'flex', fontSize: '18px', color: rankColor, fontWeight: 'bold', letterSpacing: '2px' }}>
                LOOKING FOR DUO
              </div>
              <div style={{ display: 'flex', fontSize: '18px', color: '#9CA3AF', backgroundColor: '#131D2E', padding: '8px 18px', borderRadius: '6px' }}>
                {post.region}
              </div>
            </div>

            {/* Username — hero element */}
            <div style={{ display: 'flex', fontSize: '72px', fontWeight: 'bold', color: '#F0E6D2', marginBottom: '8px', lineHeight: 1 }}>
              {post.username}
            </div>

            {/* Riot account name below username */}
            {postingAccount ? (
              <div style={{ display: 'flex', fontSize: '22px', color: '#6B7280', marginBottom: '28px' }}>
                {postingAccount.gameName}#{postingAccount.tagLine}
              </div>
            ) : (
              <div style={{ display: 'flex', marginBottom: '28px' }} />
            )}

            {/* Roles + Rank + WR row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
              {/* Main role */}
              <div style={{ display: 'flex', fontSize: '18px', fontWeight: 'bold', color: '#080E1A', backgroundColor: rankColor, padding: '8px 20px', borderRadius: '6px' }}>
                {post.role}
              </div>
              {/* Second role */}
              {post.secondRole ? (
                <div style={{ display: 'flex', fontSize: '18px', fontWeight: 'bold', color: rankColor, backgroundColor: '#131D2E', padding: '8px 20px', borderRadius: '6px' }}>
                  {post.secondRole}
                </div>
              ) : null}
              {/* Divider */}
              {postingAccount ? (
                <div style={{ display: 'flex', width: '1px', height: '32px', backgroundColor: '#1E2D42', marginLeft: '4px', marginRight: '4px' }} />
              ) : null}
              {/* Rank badge */}
              {postingAccount ? (
                <div style={{ display: 'flex', fontSize: '18px', fontWeight: 'bold', color: rankColor, backgroundColor: '#131D2E', padding: '8px 20px', borderRadius: '6px' }}>
                  {rankLabel}
                </div>
              ) : null}
              {/* WR badge */}
              {postingAccount && postingAccount.winrate !== null ? (
                <div style={{ display: 'flex', fontSize: '18px', fontWeight: 'bold', color: postingAccount.winrate >= 50 ? '#10B981' : '#EF4444', backgroundColor: '#131D2E', padding: '8px 20px', borderRadius: '6px' }}>
                  {postingAccount.winrate.toFixed(1)}% WR
                </div>
              ) : null}
              {/* VC badge */}
              <div style={{ display: 'flex', fontSize: '16px', color: '#6B7280', backgroundColor: '#131D2E', padding: '8px 16px', borderRadius: '6px' }}>
                {vcText}
              </div>
            </div>

            {/* Message */}
            {truncatedMessage ? (
              <div style={{ display: 'flex', flex: 1, fontSize: '20px', color: '#9CA3AF', lineHeight: 1.6, borderLeft: `3px solid ${rankColor}`, paddingLeft: '20px' }}>
                {truncatedMessage}
              </div>
            ) : (
              <div style={{ display: 'flex', flex: 1 }} />
            )}

            {/* Bottom: watermark only */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <div style={{ display: 'flex', fontSize: '14px', color: '#2D3A4A' }}>
                riftessence.app
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
