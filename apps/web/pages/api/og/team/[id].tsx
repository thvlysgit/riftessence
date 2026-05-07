import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

function getId(req: NextRequest): string {
  const parsed = new URL(req.url);
  return parsed.searchParams.get('id') || req.url.split('/api/og/team/')[1]?.split('?')[0] || '';
}

function roleSummary(record: Record<string, number> | null | undefined): string[] {
  if (!record) return [];
  return Object.entries(record)
    .filter(([, count]) => count > 0)
    .map(([role, count]) => (count > 1 ? `${role} x${count}` : role))
    .slice(0, 6);
}

export default async function handler(req: NextRequest) {
  const id = getId(req);
  let team: any = null;

  try {
    if (id) {
      const response = await fetch(`${API_URL}/api/teams/${encodeURIComponent(id)}/share`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json();
        team = data.team;
      }
    }
  } catch {
    team = null;
  }

  const label = team?.tag ? `${team.name} [${team.tag}]` : team?.name || 'RiftEssence Team';
  const openRoles = roleSummary(team?.openRoles);
  const rosterRoles = roleSummary(team?.roleCounts);

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', backgroundColor: '#06101F', color: '#F0E6D2', padding: '44px', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
        <div style={{ display: 'flex', width: '100%', height: '100%', border: '2px solid #263A54', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '50px', backgroundColor: '#08172A' }}>
            <div style={{ display: 'flex', color: '#47D889', fontSize: '24px', fontWeight: 900 }}>TEAM INVITE</div>
            <div style={{ display: 'flex', marginTop: '40px', fontSize: label.length > 22 ? '58px' : '74px', fontWeight: 950, lineHeight: 1.04 }}>
              {label}
            </div>
            <div style={{ display: 'flex', marginTop: '18px', gap: '14px' }}>
              <div style={{ display: 'flex', padding: '12px 18px', borderRadius: '8px', backgroundColor: '#102C49', color: '#D9C98C', fontSize: '22px', fontWeight: 800 }}>
                {team?.region || 'Region open'}
              </div>
              <div style={{ display: 'flex', padding: '12px 18px', borderRadius: '8px', backgroundColor: '#102C49', color: '#8BE3F9', fontSize: '22px', fontWeight: 800 }}>
                {team?.memberCount || 0} members
              </div>
              <div style={{ display: 'flex', padding: '12px 18px', borderRadius: '8px', backgroundColor: '#102C49', color: '#47D889', fontSize: '22px', fontWeight: 800 }}>
                {team?.pendingSpotCount || 0} invites
              </div>
            </div>
            <div style={{ display: 'flex', marginTop: '42px', color: '#A9BDD7', fontSize: '30px', lineHeight: 1.3, maxWidth: '720px' }}>
              {team?.description || 'Join the roster, claim your spot, and keep schedule, scrims and team context in one place.'}
            </div>
            <div style={{ display: 'flex', marginTop: 'auto', color: '#526A88', fontSize: '18px', fontWeight: 700 }}>
              riftessence.app
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '360px', padding: '44px', backgroundColor: '#0B223A' }}>
            <div style={{ display: 'flex', color: '#C8AA6D', fontSize: '24px', fontWeight: 900 }}>Roster Rundown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '24px', borderRadius: '14px', backgroundColor: '#071427', border: '1px solid #314A68' }}>
                <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '18px', fontWeight: 800 }}>Open spots</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                  {(openRoles.length ? openRoles : ['Invite ready']).map((role) => (
                    <div key={role} style={{ display: 'flex', padding: '9px 12px', borderRadius: '7px', backgroundColor: '#102C49', color: '#47D889', fontSize: '20px', fontWeight: 900 }}>
                      {role}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '24px', borderRadius: '14px', backgroundColor: '#071427', border: '1px solid #314A68' }}>
                <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '18px', fontWeight: 800 }}>Current roster</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                  {(rosterRoles.length ? rosterRoles : ['Building']).map((role) => (
                    <div key={role} style={{ display: 'flex', padding: '9px 12px', borderRadius: '7px', backgroundColor: '#102C49', color: '#D9C98C', fontSize: '20px', fontWeight: 900 }}>
                      {role}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', marginTop: 'auto', padding: '22px', borderRadius: '14px', backgroundColor: '#102C49', color: '#D9C98C', fontSize: '22px', fontWeight: 800, lineHeight: 1.25 }}>
              Open the link, sign in, and claim the roster invite that matches your account.
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
