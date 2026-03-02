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
            flexDirection: 'column',
            backgroundColor: '#0A1428',
            padding: '60px',
          }}
        >
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: '36px', fontWeight: 'bold', color: '#C8AA6D' }}>
                RiftEssence
              </div>
              <div style={{ display: 'flex', fontSize: '24px', color: '#6B7280', marginLeft: '16px' }}>
                Looking For Duo
              </div>
            </div>
            <div style={{ display: 'flex', fontSize: '22px', color: '#C8AA6D', backgroundColor: '#1C2841', padding: '10px 20px', borderRadius: '8px' }}>
              {post.region}
            </div>
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flex: 1, gap: '40px' }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Username */}
              <div style={{ display: 'flex', fontSize: '48px', fontWeight: 'bold', color: '#F0E6D2', marginBottom: '16px' }}>
                {post.username}
              </div>

              {/* Roles */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', fontSize: '20px', fontWeight: 'bold', color: '#C8AA6D', backgroundColor: '#1C2841', padding: '8px 20px', borderRadius: '8px' }}>
                  {post.role}
                </div>
                {post.secondRole ? (
                  <div style={{ display: 'flex', fontSize: '20px', fontWeight: 'bold', color: '#C8AA6D', backgroundColor: '#1C2841', padding: '8px 20px', borderRadius: '8px', opacity: 0.7 }}>
                    {post.secondRole}
                  </div>
                ) : null}
              </div>

              {/* Message */}
              {truncatedMessage ? (
                <div style={{ display: 'flex', fontSize: '20px', color: '#9CA3AF', lineHeight: 1.5, backgroundColor: '#1C2841', padding: '20px', borderRadius: '8px' }}>
                  "{truncatedMessage}"
                </div>
              ) : null}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '340px', gap: '16px' }}>
              {/* Riot account */}
              {postingAccount ? (
                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#1C2841', padding: '24px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                    Posting With
                  </div>
                  <div style={{ display: 'flex', fontSize: '22px', fontWeight: 'bold', color: '#F0E6D2', marginBottom: '12px' }}>
                    {postingAccount.gameName}#{postingAccount.tagLine}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', fontSize: '16px', fontWeight: 'bold', color: rankColor, backgroundColor: '#0A1428', padding: '6px 14px', borderRadius: '6px' }}>
                      {rankLabel}
                    </div>
                    {postingAccount.winrate !== null ? (
                      <div style={{ display: 'flex', fontSize: '16px', fontWeight: 'bold', color: postingAccount.winrate >= 50 ? '#10B981' : '#EF4444', backgroundColor: '#0A1428', padding: '6px 14px', borderRadius: '6px' }}>
                        {postingAccount.winrate.toFixed(1)}% WR
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* VC */}
              <div style={{ display: 'flex', fontSize: '18px', color: '#F0E6D2', backgroundColor: '#1C2841', padding: '16px 24px', borderRadius: '8px' }}>
                {vcText}
              </div>

              {/* Domain */}
              <div style={{ display: 'flex', fontSize: '16px', color: '#4B5563', marginTop: 'auto' }}>
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
