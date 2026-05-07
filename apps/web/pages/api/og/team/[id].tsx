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
    .slice(0, 5);
}

function clampText(value: unknown, max = 150): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
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
  const compactLabel = label.length > 28 ? `${label.slice(0, 27)}...` : label;
  const openRoles = roleSummary(team?.openRoles);
  const rosterRoles = roleSummary(team?.roleCounts);
  const description = clampText(team?.description || 'Join the roster, claim your spot, and keep schedule, scrims, and team context in one place.', 150);

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', backgroundColor: '#050B14', color: '#F0E6D2', padding: '42px', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
        <div style={{ display: 'flex', width: '100%', height: '100%', border: '2px solid #263A54', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '720px', padding: '50px', backgroundColor: '#08172A' }}>
            <div style={{ display: 'flex', color: '#47D889', fontSize: '24px', fontWeight: 950 }}>TEAM ROSTER INVITE</div>
            <div style={{ display: 'flex', marginTop: '38px', fontSize: compactLabel.length > 22 ? '58px' : '72px', fontWeight: 950, lineHeight: 1.03, width: '624px', overflow: 'hidden' }}>
              {compactLabel}
            </div>
            <div style={{ display: 'flex', marginTop: '18px', gap: '12px' }}>
              <div style={{ display: 'flex', height: '46px', alignItems: 'center', padding: '0 16px', borderRadius: '8px', backgroundColor: '#102C49', color: '#D9C98C', fontSize: '21px', fontWeight: 850 }}>
                {team?.region || 'Region open'}
              </div>
              <div style={{ display: 'flex', height: '46px', alignItems: 'center', padding: '0 16px', borderRadius: '8px', backgroundColor: '#102C49', color: '#8BE3F9', fontSize: '21px', fontWeight: 850 }}>
                {team?.memberCount || 0} members
              </div>
              <div style={{ display: 'flex', height: '46px', alignItems: 'center', padding: '0 16px', borderRadius: '8px', backgroundColor: '#102C49', color: '#47D889', fontSize: '21px', fontWeight: 850 }}>
                {team?.pendingSpotCount || 0} invites
              </div>
            </div>
            <div style={{ display: 'flex', marginTop: '38px', color: '#B7C8DD', fontSize: '28px', lineHeight: 1.22, width: '640px', height: '112px', overflow: 'hidden' }}>
              {description}
            </div>
            <div style={{ display: 'flex', marginTop: 'auto', color: '#526A88', fontSize: '18px', fontWeight: 750 }}>
              riftessence.app
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '42px', backgroundColor: '#0B223A' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '150px', padding: '24px', borderRadius: '14px', backgroundColor: '#071427', border: '1px solid #47D889' }}>
              <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '19px', fontWeight: 850 }}>Open spots</div>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '13px', gap: '7px' }}>
                {(openRoles.length ? openRoles : ['Invite ready']).slice(0, 3).map((role) => (
                  <div key={role} style={{ display: 'flex', color: '#47D889', fontSize: '23px', fontWeight: 950, lineHeight: 1 }}>
                    {role}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', height: '150px', marginTop: '20px', padding: '24px', borderRadius: '14px', backgroundColor: '#071427', border: '1px solid #C8AA6D' }}>
              <div style={{ display: 'flex', color: '#8EA6C4', fontSize: '19px', fontWeight: 850 }}>Current roster</div>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '13px', gap: '7px' }}>
                {(rosterRoles.length ? rosterRoles : ['Building']).slice(0, 3).map((role) => (
                  <div key={role} style={{ display: 'flex', color: '#D9C98C', fontSize: '23px', fontWeight: 950, lineHeight: 1 }}>
                    {role}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', marginTop: 'auto', height: '92px', padding: '18px 22px', borderRadius: '14px', backgroundColor: '#132F4D', color: '#E9D9A3', fontSize: '22px', fontWeight: 900, lineHeight: 1.15, alignItems: 'center' }}>
              Open the link, sign in, and claim the roster spot that matches your account.
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
