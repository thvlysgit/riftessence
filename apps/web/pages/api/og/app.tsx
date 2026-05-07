import { ImageResponse } from 'next/og';

export const config = {
  runtime: 'edge',
};

export default async function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          backgroundColor: '#06101F',
          color: '#F0E6D2',
          padding: '54px',
          fontFamily: 'Inter, Segoe UI, sans-serif',
        }}
      >
        <div style={{ display: 'flex', width: '100%', height: '100%', border: '2px solid #24364D', borderRadius: '18px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '52px', backgroundColor: '#08182B' }}>
            <div style={{ display: 'flex', color: '#C8AA6D', fontSize: '22px', fontWeight: 800, letterSpacing: '4px' }}>
              RIFTESSENCE
            </div>
            <div style={{ display: 'flex', marginTop: '44px', fontSize: '76px', fontWeight: 900, lineHeight: 1.02 }}>
              Find the right League people faster.
            </div>
            <div style={{ display: 'flex', marginTop: '30px', color: '#A9BDD7', fontSize: '28px', lineHeight: 1.35, maxWidth: '700px' }}>
              Duo posts, team rosters, scrims, ratings, coaching and matchup knowledge in one community workspace.
            </div>
            <div style={{ display: 'flex', gap: '14px', marginTop: 'auto' }}>
              {['Duo Finder', 'Teams', 'Ratings', 'Scrims'].map((label) => (
                <div key={label} style={{ display: 'flex', padding: '12px 18px', border: '1px solid #3A5370', borderRadius: '8px', color: '#D9C98C', fontSize: '20px', fontWeight: 700 }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', width: '320px', flexDirection: 'column', justifyContent: 'center', gap: '22px', padding: '40px', backgroundColor: '#0C2138' }}>
            {[
              ['Queue', 'verified player context'],
              ['Roster', 'invite and join flow'],
              ['Trust', 'shared-game ratings'],
            ].map(([title, body]) => (
              <div key={title} style={{ display: 'flex', flexDirection: 'column', padding: '22px', borderRadius: '10px', backgroundColor: '#071427', border: '1px solid #24364D' }}>
                <div style={{ display: 'flex', color: '#C8AA6D', fontSize: '24px', fontWeight: 900 }}>{title}</div>
                <div style={{ display: 'flex', marginTop: '8px', color: '#8EA6C4', fontSize: '18px' }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
