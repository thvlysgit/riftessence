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
  return normalized.toFixed(1);
}

function compactName(value: string): string {
  return value.length > 28 ? `${value.slice(0, 27)}...` : value;
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
  const displayName = compactName(account?.gameName
    ? `${account.gameName}${account.tagLine ? `#${account.tagLine}` : ''}`
    : user?.username || username || 'Player');
  const rank = account?.rank && account.rank !== 'UNRANKED'
    ? `${account.rank}${account.division ? ` ${account.division}` : ''}`
    : 'Unranked';
  const feedbackCount = Number(user?.feedbackCount || 0);

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', backgroundColor: '#050B14', color: '#F0E6D2', padding: '42px', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
        <div style={{ display: 'flex', width: '100%', height: '100%', border: '2px solid #263A54', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '724px', padding: '50px', backgroundColor: '#091A2F' }}>
            <div style={{ display: 'flex', color: '#F4D03F', fontSize: '24px', fontWeight: 950 }}>PLAYER RATING PAGE</div>
            <div style={{ display: 'flex', marginTop: '38px', fontSize: displayName.length > 19 ? '58px' : '72px', fontWeight: 950, lineHeight: 1.02, width: '630px', overflow: 'hidden' }}>
              {displayName}
            </div>
            <div style={{ display: 'flex', marginTop: '18px', gap: '12px' }}>
              <div style={{ display: 'flex', height: '46px', alignItems: 'center', padding: '0 16px', borderRadius: '8px', backgroundColor: '#102C49', color: '#D9C98C', fontSize: '21px', fontWeight: 850 }}>
                {account?.region || 'RiftEssence'}
              </div>
              <div style={{ display: 'flex', height: '46px', alignItems: 'center', padding: '0 16px', borderRadius: '8px', backgroundColor: '#102C49', color: '#8BE3F9', fontSize: '21px', fontWeight: 850 }}>
                {rank}
              </div>
            </div>
            <div style={{ display: 'flex', marginTop: '40px', color: '#B7C8DD', fontSize: '31px', lineHeight: 1.27, width: '640px' }}>
              Check the feedback before you queue. Ratings are tied to shared games so duo invites carry real context.
            </div>
            <div style={{ display: 'flex', marginTop: 'auto', color: '#526A88', fontSize: '18px', fontWeight: 750 }}>
              riftessence.app
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '42px', backgroundColor: '#0B223A' }}>
            <div style={{ display: 'flex', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '164px', height: '148px', padding: '24px', borderRadius: '14px', backgroundColor: '#071427', border: '1px solid #F4D03F' }}>
                <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '19px', fontWeight: 850 }}>Skill</div>
                <div style={{ display: 'flex', marginTop: '14px', color: '#F4D03F', fontSize: '54px', fontWeight: 950 }}>{score(user?.skillStars || 0)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '164px', height: '148px', padding: '24px', borderRadius: '14px', backgroundColor: '#071427', border: '1px solid #C084FC' }}>
                <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '19px', fontWeight: 850 }}>Vibe</div>
                <div style={{ display: 'flex', marginTop: '14px', color: '#C084FC', fontSize: '54px', fontWeight: 950 }}>{score(user?.personalityMoons || 0)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', marginTop: '16px', height: '40px', alignItems: 'center', justifyContent: 'center', color: '#E9D9A3', fontSize: '26px', fontWeight: 950, lineHeight: 1 }}>
              {feedbackCount} {feedbackCount === 1 ? 'rating' : 'ratings'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              {[
                ['Queue smarter', 'Know what teammates say after real games.'],
                ['Leave useful feedback', 'Rate skill and personality in one quick flow.'],
                ['Build trust', 'Make future duo posts easier to answer.'],
              ].map(([title, body], index) => (
                <div key={title} style={{ display: 'flex', flexDirection: 'column', height: '78px', padding: '14px 18px', borderRadius: '12px', backgroundColor: '#071427', border: '1px solid #263A54' }}>
                  <div style={{ display: 'flex', color: index === 0 ? '#8BE3F9' : index === 1 ? '#47D889' : '#F4D03F', fontSize: '20px', fontWeight: 950 }}>{title}</div>
                  <div style={{ display: 'flex', marginTop: '5px', color: '#A9BDD7', fontSize: '15px', lineHeight: 1.12, width: '320px' }}>{body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
