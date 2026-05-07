import { ImageResponse } from 'next/og';

export const config = {
  runtime: 'edge',
};

const valueCards = [
  ['Duo Finder', 'Share once. Replies keep rank and account context attached.', '#8BE3F9'],
  ['Team Invites', 'Roster links show roles, spots, and next steps instantly.', '#47D889'],
  ['Player Trust', 'Ratings stay tied to shared games, not anonymous noise.', '#F4D03F'],
];

export default async function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          backgroundColor: '#050B14',
          color: '#F0E6D2',
          padding: '42px',
          fontFamily: 'Inter, Segoe UI, sans-serif',
        }}
      >
        <div style={{ display: 'flex', width: '100%', height: '100%', border: '2px solid #223650', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '704px', padding: '50px', backgroundColor: '#08172A' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', width: '14px', height: '48px', borderRadius: '7px', backgroundColor: '#C8AA6D' }} />
              <div style={{ display: 'flex', marginLeft: '16px', color: '#C8AA6D', fontSize: '24px', fontWeight: 900 }}>
                RIFTESSENCE
              </div>
            </div>

            <div style={{ display: 'flex', marginTop: '42px', height: '230px', fontSize: '62px', fontWeight: 950, lineHeight: 1.08, width: '610px', overflow: 'hidden' }}>
              Find teammates worth adding.
            </div>

            <div style={{ display: 'flex', color: '#B7C8DD', fontSize: '27px', lineHeight: 1.28, width: '610px', height: '106px', overflow: 'hidden' }}>
              Share duo posts, roster invites, scrims, and rating pages with the context Discord chats usually lose.
            </div>

            <div style={{ display: 'flex', marginTop: 'auto', color: '#526A88', fontSize: '18px', fontWeight: 750 }}>
              riftessence.app
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '42px', backgroundColor: '#0B223A', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {valueCards.map(([title, body, color]) => (
                <div key={title} style={{ display: 'flex', flexDirection: 'column', height: '132px', padding: '21px', borderRadius: '12px', backgroundColor: '#071427', border: `1px solid ${color}` }}>
                  <div style={{ display: 'flex', color, fontSize: '25px', fontWeight: 950 }}>{title}</div>
                  <div style={{ display: 'flex', marginTop: '10px', color: '#A9BDD7', fontSize: '18px', lineHeight: 1.22, width: '322px', height: '64px', overflow: 'hidden' }}>{body}</div>
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
