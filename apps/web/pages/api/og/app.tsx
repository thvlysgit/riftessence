import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

const features = ['Duo finder', 'Team rosters', 'Player ratings', 'Coaching'];

export default async function handler(req: NextRequest) {
  const logoUrl = new URL('/assets/riftessencelogo.png', req.url).toString();

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
        <div style={{ display: 'flex', width: '100%', height: '100%', border: '2px solid #2E4360', borderRadius: '20px', overflow: 'hidden', backgroundColor: '#08172A' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '720px', padding: '54px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src={logoUrl} width="74" height="74" style={{ borderRadius: '18px' }} />
              <div style={{ display: 'flex', marginLeft: '18px', color: '#C8AA6D', fontSize: '30px', fontWeight: 950 }}>
                RiftEssence
              </div>
            </div>

            <div style={{ display: 'flex', marginTop: '48px', width: '620px', height: '218px', color: '#FFF7E6', fontSize: '62px', fontWeight: 950, lineHeight: 1.08, overflow: 'hidden' }}>
              Find better League teammates.
            </div>

            <div style={{ display: 'flex', width: '620px', height: '86px', color: '#B7C8DD', fontSize: '29px', fontWeight: 650, lineHeight: 1.28, overflow: 'hidden' }}>
              Duo posts, rosters, ratings, coaching, and matchup knowledge in one place.
            </div>

            <div style={{ display: 'flex', marginTop: 'auto', color: '#5F7899', fontSize: '18px', fontWeight: 750 }}>
              riftessence.app
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '48px', backgroundColor: '#0B223A', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {features.map((feature, index) => (
                <div
                  key={feature}
                  style={{
                    display: 'flex',
                    height: '76px',
                    alignItems: 'center',
                    padding: '0 24px',
                    borderRadius: '12px',
                    backgroundColor: '#071427',
                    border: `1px solid ${index === 0 ? '#8BE3F9' : index === 1 ? '#47D889' : index === 2 ? '#F4D03F' : '#C084FC'}`,
                    color: index === 0 ? '#8BE3F9' : index === 1 ? '#47D889' : index === 2 ? '#F4D03F' : '#C084FC',
                    fontSize: '26px',
                    fontWeight: 950,
                  }}
                >
                  {feature}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', marginTop: '28px', height: '82px', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', backgroundColor: '#132F4D', color: '#E9D9A3', fontSize: '25px', fontWeight: 950 }}>
              Queue with context
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
