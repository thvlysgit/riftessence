import { ImageResponse } from 'next/og';
import { NextApiRequest, NextApiResponse } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

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
    ALWAYS: '🎤 VC Required',
    SOMETIMES: '🎤 VC Optional',
    NEVER: '🔇 No VC',
  };
  return map[vc] || vc;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const id = req.query.id as string;

    if (!id) {
      res.status(400).send('Post ID required');
      return;
    }

    // Fetch post data from backend
    const postRes = await fetch(`${API_URL}/api/posts/${id}`, {
      signal: AbortSignal.timeout(8000),
    });
    
    if (!postRes.ok) {
      res.status(404).send('Post not found');
      return;
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

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0A1428 0%, #162642 100%)',
            padding: '60px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Main Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, #1C2841 0%, #253550 100%)',
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
                    background: 'linear-gradient(90deg, #C8AA6D 0%, #F0E6D2 100%)',
                    backgroundClip: 'text',
                    color: 'transparent',
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

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Error generating OG image:', error);
    res.status(500).send('Failed to generate image');
  }
}
