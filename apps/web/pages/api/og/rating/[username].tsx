import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

function getUsername(req: NextRequest): string {
  const parsed = new URL(req.url);
  return parsed.searchParams.get('username') || req.url.split('/api/og/rating/')[1]?.split('?')[0] || '';
}

function score(value: number): string {
  const normalized = Math.max(0, Math.min(5, Number(value || 0)));
  return `${normalized.toFixed(1)} / 5`;
}

export default async function handler(req: NextRequest) {
  const username = decodeURIComponent(getUsername(req));

  let user: any = null;
  try {
    if (username) {
      const response = await fetch(`${API_URL}/api/rate/${encodeURIComponent(username)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json();
        user = data.user;
      }
    }
  } catch {
    user = null;
  }

  const account = user?.mainAccount;
  const displayName = account?.gameName
    ? `${account.gameName}${account.tagLine ? `#${account.tagLine}` : ''}`
    : user?.username || username || 'Player';
  const rank = account?.rank && account.rank !== 'UNRANKED'
    ? `${account.rank}${account.division ? ` ${account.division}` : ''}`
    : 'Unranked';

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', backgroundColor: '#07101E', color: '#F0E6D2', padding: '44px', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
        <div style={{ display: 'flex', width: '100%', height: '100%', border: '2px solid #263A54', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '50px', backgroundColor: '#091A2F' }}>
            <div style={{ display: 'flex', color: '#C8AA6D', fontSize: '24px', fontWeight: 900 }}>PLAYER RATING PAGE</div>
            <div style={{ display: 'flex', marginTop: '42px', fontSize: displayName.length > 18 ? '58px' : '76px', fontWeight: 950, lineHeight: 1.02 }}>
              {displayName}
            </div>
            <div style={{ display: 'flex', marginTop: '18px', gap: '14px' }}>
              <div style={{ display: 'flex', padding: '12px 18px', borderRadius: '8px', backgroundColor: '#102C49', color: '#D9C98C', fontSize: '22px', fontWeight: 800 }}>
                {account?.region || 'RiftEssence'}
              </div>
              <div style={{ display: 'flex', padding: '12px 18px', borderRadius: '8px', backgroundColor: '#102C49', color: '#8BE3F9', fontSize: '22px', fontWeight: 800 }}>
                {rank}
              </div>
            </div>
            <div style={{ display: 'flex', marginTop: '42px', color: '#A9BDD7', fontSize: '30px', lineHeight: 1.3, maxWidth: '720px' }}>
              Rate this player after shared games. Identity checks and match history verification keep feedback useful.
            </div>
            <div style={{ display: 'flex', marginTop: 'auto', color: '#526A88', fontSize: '18px', fontWeight: 700 }}>
              riftessence.app
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: '350px', padding: '44px', backgroundColor: '#0B223A', justifyContent: 'center', gap: '22px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '26px', borderRadius: '14px', backgroundColor: '#071427', border: '1px solid #314A68' }}>
              <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '20px', fontWeight: 800 }}>Skill</div>
              <div style={{ display: 'flex', marginTop: '12px', color: '#F4D03F', fontSize: '42px', fontWeight: 900 }}>{score(user?.skillStars || 0)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '26px', borderRadius: '14px', backgroundColor: '#071427', border: '1px solid #314A68' }}>
              <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '20px', fontWeight: 800 }}>Personality</div>
              <div style={{ display: 'flex', marginTop: '12px', color: '#C084FC', fontSize: '42px', fontWeight: 900 }}>{score(user?.personalityMoons || 0)}</div>
            </div>
            <div style={{ display: 'flex', padding: '22px', borderRadius: '14px', backgroundColor: '#102C49', color: '#D9C98C', fontSize: '28px', fontWeight: 900, justifyContent: 'center' }}>
              {user?.feedbackCount || 0} ratings
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
