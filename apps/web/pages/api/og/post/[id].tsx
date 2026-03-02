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


// Helper to get rank badge color
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

// Helper to format VC preference
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

    // Fetch post data from backend
    const postRes = await fetch(`${API_URL}/api/posts/${id}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!postRes.ok) {
      return new Response('Post not found', { status: 404 });
    }

    const { post } = await postRes.json();

    // Prepare data for the card
    const postingAccount = post.postingRiotAccount;
    const mainAccount = post.bestRank;
    const hasMainAccount = mainAccount && !post.isMainAccount;
    const rankColor = postingAccount ? getRankColor(postingAccount.rank) : '#C8AA6D';
    const vcText = formatVCPreference(post.vcPreference);
    const message = post.message || 'Looking for duo partner!';
    const truncatedMessage = message.length > 120 ? message.substring(0, 117) + '...' : message;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: 'linear-gradient(135deg, #0A1428 0%, #162642 100%)',
            padding: '60px',
          }}
        >
          {/* Main Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundImage: 'linear-gradient(135deg, #1C2841 0%, #253550 100%)',
              borderRadius: '24px',
              padding: '48px',
              width: '1080px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(200, 170, 109, 0.3)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '32px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                  color: '#C8AA6D',
                  }}
                >
                  RiftEssence
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    color: '#9CA3AF',
                    marginLeft: '8px',
                  }}
                >
                  • Looking For Duo
                </div>
              </div>
              <div
                style={{
                  fontSize: '24px',
                  color: '#9CA3AF',
                  backgroundColor: 'rgba(200, 170, 109, 0.1)',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(200, 170, 109, 0.3)',
                }}
              >
                {post.region}
              </div>
            </div>

            {/* Username */}
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#F0E6D2',
                marginBottom: '24px',
              }}
            >
              {post.username}
            </div>

            {/* Roles */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#C8AA6D',
                  backgroundColor: 'rgba(200, 170, 109, 0.15)',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '2px solid #C8AA6D',
                }}
              >
                {post.role}
              </div>
              {post.secondRole && (
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#C8AA6D',
                    backgroundColor: 'rgba(200, 170, 109, 0.1)',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(200, 170, 109, 0.6)',
                  }}
                >
                  {post.secondRole}
                </div>
              )}
            </div>

            {/* Riot Accounts */}
            <div
              style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '32px',
              }}
            >
              {/* Posting Account */}
              {postingAccount && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(28, 40, 65, 0.6)',
                    borderRadius: '16px',
                    padding: '24px',
                    flex: 1,
                    border: '1px solid rgba(200, 170, 109, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '16px', color: '#9CA3AF', marginBottom: '8px' }}>
                    {hasMainAccount ? 'Posting With (Smurf)' : 'Posting With'}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#F0E6D2', marginBottom: '12px' }}>
                    {postingAccount.gameName}#{postingAccount.tagLine}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: rankColor,
                        backgroundColor: `${rankColor}20`,
                        padding: '6px 16px',
                        borderRadius: '8px',
                        border: `2px solid ${rankColor}`,
                      }}
                    >
                      {postingAccount.rank}
                      {postingAccount.division ? ` ${postingAccount.division}` : ''}
                      {postingAccount.lp ? ` ${postingAccount.lp}LP` : ''}
                    </div>
                    {postingAccount.winrate !== null && (
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: postingAccount.winrate >= 50 ? '#10B981' : '#EF4444',
                          backgroundColor: postingAccount.winrate >= 50 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          padding: '6px 16px',
                          borderRadius: '8px',
                        }}
                      >
                        {postingAccount.winrate.toFixed(1)}% WR
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Account */}
              {hasMainAccount && mainAccount && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(28, 40, 65, 0.6)',
                    borderRadius: '16px',
                    padding: '24px',
                    flex: 1,
                    border: '1px solid rgba(200, 170, 109, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '16px', color: '#9CA3AF', marginBottom: '8px' }}>
                    Main Account
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#F0E6D2', marginBottom: '12px' }}>
                    {mainAccount.gameName}#{mainAccount.tagLine}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: getRankColor(mainAccount.rank),
                        backgroundColor: `${getRankColor(mainAccount.rank)}20`,
                        padding: '6px 16px',
                        borderRadius: '8px',
                        border: `2px solid ${getRankColor(mainAccount.rank)}`,
                      }}
                    >
                      {mainAccount.rank}
                      {mainAccount.division ? ` ${mainAccount.division}` : ''}
                      {mainAccount.lp ? ` ${mainAccount.lp}LP` : ''}
                    </div>
                    {mainAccount.winrate !== null && (
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: mainAccount.winrate >= 50 ? '#10B981' : '#EF4444',
                          backgroundColor: mainAccount.winrate >= 50 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          padding: '6px 16px',
                          borderRadius: '8px',
                        }}
                      >
                        {mainAccount.winrate.toFixed(1)}% WR
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            <div
              style={{
                fontSize: '22px',
                color: '#D1D5DB',
                lineHeight: 1.5,
                marginBottom: '32px',
                backgroundColor: 'rgba(28, 40, 65, 0.4)',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid rgba(200, 170, 109, 0.1)',
              }}
            >
              "{truncatedMessage}"
            </div>

            {/* VC Preference */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#F0E6D2',
                  backgroundColor: 'rgba(200, 170, 109, 0.1)',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(200, 170, 109, 0.3)',
                }}
              >
                {vcText}
              </div>
              <div
                style={{
                  fontSize: '18px',
                  color: '#9CA3AF',
                }}
              >
                riftessence.com
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
