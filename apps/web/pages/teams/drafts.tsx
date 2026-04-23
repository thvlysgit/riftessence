import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SEOHead from '@components/SEOHead';
import NoAccess from '@components/NoAccess';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import { fetchChampions, getChampionIconUrl } from '../../utils/championData';

type TeamMember = {
  userId: string;
  username: string;
  role: string;
};

type Team = {
  id: string;
  name: string;
  tag: string | null;
  ownerId?: string;
  members: TeamMember[];
};

type TierKey = 'S' | 'A' | 'B' | 'C';

type TierPools = {
  S: string[];
  A: string[];
  B: string[];
  C: string[];
};

type TeamMemberPool = {
  userId: string;
  username: string;
  role: string;
  tiers: TierPools;
};

type DraftSide = 'BLUE' | 'RED';
type DraftRole = 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP';

type PickSlot = {
  side: DraftSide;
  champion: string;
  assignedRole: DraftRole | null;
};

type DragPayload = {
  champion: string;
  sourceUserId: string;
  tier: TierKey;
};

const PLAYER_ROLES = new Set(['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS', 'OWNER']);
const ROLE_ORDER: DraftRole[] = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const PICK_ORDER: DraftSide[] = ['BLUE', 'RED', 'RED', 'BLUE', 'BLUE', 'RED', 'RED', 'BLUE', 'BLUE', 'RED'];

const TIER_STYLE: Record<TierKey, { border: string; bg: string }> = {
  S: { border: '#FFD700', bg: 'rgba(255, 215, 0, 0.16)' },
  A: { border: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.16)' },
  B: { border: '#CD7F32', bg: 'rgba(205, 127, 50, 0.16)' },
  C: { border: '#7A7A7A', bg: 'rgba(122, 122, 122, 0.16)' },
};

function normalizeChampion(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function uniquePush(target: string[], values: unknown[]) {
  const seen = new Set(target.map((c) => c.toLowerCase()));
  for (const value of values) {
    const champion = normalizeChampion(value);
    if (!champion) continue;
    const key = champion.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(champion);
  }
}

function parseChampionTiers(rawMode: unknown, rawList: unknown, rawTierlist: unknown): TierPools {
  const result: TierPools = { S: [], A: [], B: [], C: [] };
  const mode = String(rawMode || '').toUpperCase();

  if (mode === 'TIERLIST' && rawTierlist && typeof rawTierlist === 'object') {
    const tierlist = rawTierlist as Record<string, unknown>;
    uniquePush(result.S, Array.isArray(tierlist.S) ? tierlist.S : []);
    uniquePush(result.A, Array.isArray(tierlist.A) ? tierlist.A : []);
    uniquePush(result.B, Array.isArray(tierlist.B) ? tierlist.B : []);
    uniquePush(result.C, Array.isArray(tierlist.C) ? tierlist.C : []);
    return result;
  }

  uniquePush(result.A, Array.isArray(rawList) ? rawList : []);
  return result;
}

function getRoleIcon(role: DraftRole): React.ReactNode {
  if (role === 'TOP') {
    return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c32.06 0 64.12-.01 96.18.01-6.72 6.67-13.45 13.33-20.19 19.99H36v56c-6.66 6.73-13.33 13.46-19.99 20.18-.02-32.06 0-64.12-.01-96.18Z"/><path d="M104 44.02c5.32-5.33 10.65-10.64 15.99-15.94.02 30.64.01 61.28.01 91.92-30.64 0-61.28.01-91.93-.01 5.33-5.34 10.66-10.66 16-15.99 19.97-.01 39.95.01 59.93 0V44.02Z" opacity="0.75"/><path d="M56 56h28v28H56V56Z" opacity="0.75"/></svg>;
  }
  if (role === 'JGL') {
    return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M72.13 57.86C78.7 41.1 90.04 26.94 99.94 12.1 93 29.47 84.31 46.87 84.04 65.97c-.73 4.81-2.83 9.31-4 14.03-2.08-7.57-4.91-14.9-7.91-22.14Z"/><path d="M36.21 12.35c13.06 20.19 26.67 40.61 33.61 63.87 4.77 15.49 5.42 32.94-1.8 47.8-5.58-6.1-11.08-12.29-16.71-18.34-4.97-4.72-10.26-9.1-15.32-13.71-1.55-11.73-2.97-23.87-8.72-34.42-2.75-5.24-6.71-9.72-11.19-13.55 9.67 4.75 19.18 10.41 26.23 18.72 4.37 4.98 7.46 10.94 9.69 17.15 1.15-10.29.58-20.79-2.05-30.81-3.31-12.68-8.99-24.55-13.74-36.71Z"/></svg>;
  }
  if (role === 'MID') {
    return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c22.67 0 45.33 0 67.99.01C78.62 21.34 73.28 26.69 67.88 32c-11.96 0-23.92-.01-35.88 0-.01 12 .01 24-.01 36-5.32 5.3-10.64 10.6-15.98 15.89C15.99 61.26 16 38.63 16 16zm87.95 51.9c5.32-5.37 10.69-10.68 16.04-16.02.02 22.71.01 45.41 0 68.12-22.65 0-45.31.01-67.97-.01 5.33-5.33 10.65-10.67 15.99-15.99 12-.01 23.99.01 35.99 0 .04-12.04-.05-24.07-.05-36.1z" opacity="0.75"/></svg>;
  }
  if (role === 'ADC') {
    return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 4h10l2 4-7 12-7-12 2-4z"/></svg>;
  }
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
}

const TeamDraftsPage: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [memberPools, setMemberPools] = useState<TeamMemberPool[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPools, setLoadingPools] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allChampions, setAllChampions] = useState<string[]>([]);
  const [draggingChampion, setDraggingChampion] = useState<DragPayload | null>(null);
  const [blueBans, setBlueBans] = useState<string[]>(['', '', '', '', '']);
  const [redBans, setRedBans] = useState<string[]>(['', '', '', '', '']);
  const [picks, setPicks] = useState<PickSlot[]>(PICK_ORDER.map((side) => ({ side, champion: '', assignedRole: null })));

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const playerPools = useMemo(
    () => memberPools.filter((member) => PLAYER_ROLES.has(String(member.role || '').toUpperCase())),
    [memberPools]
  );

  const usedChampions = useMemo(() => {
    const used = new Set<string>();
    for (const ban of [...blueBans, ...redBans]) {
      if (ban) used.add(ban.toLowerCase());
    }
    for (const pick of picks) {
      if (pick.champion) used.add(pick.champion.toLowerCase());
    }
    return used;
  }, [blueBans, redBans, picks]);

  useEffect(() => {
    const loadChampions = async () => {
      try {
        const champions = await fetchChampions();
        setAllChampions(champions);
      } catch (loadError) {
        console.error('Failed to load champions list:', loadError);
      }
    };

    void loadChampions();
  }, []);

  useEffect(() => {
    const loadTeams = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoadingTeams(false);
        return;
      }

      setLoadingTeams(true);
      setError(null);

      try {
        const res = await fetch(`${apiUrl}/api/teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch teams');
        }

        const data = (await res.json()) as Team[];
        setTeams(data);
        if (data.length > 0) {
          setSelectedTeamId((prev) => {
            if (prev && data.some((team) => team.id === prev)) {
              return prev;
            }
            return data[0].id;
          });
        }
      } catch (teamsError) {
        console.error('Failed to fetch teams:', teamsError);
        setError('Failed to load teams.');
      } finally {
        setLoadingTeams(false);
      }
    };

    void loadTeams();
  }, [apiUrl]);

  useEffect(() => {
    const loadPools = async () => {
      const token = getAuthToken();
      if (!token || !selectedTeam) {
        setMemberPools([]);
        return;
      }

      setLoadingPools(true);
      setError(null);

      try {
        const profiles = await Promise.all(
          selectedTeam.members.map(async (member) => {
            const res = await fetch(`${apiUrl}/api/user/profile?username=${encodeURIComponent(member.username)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
              return {
                userId: member.userId,
                username: member.username,
                role: member.role,
                tiers: { S: [], A: [], B: [], C: [] },
              } as TeamMemberPool;
            }

            const data = await res.json();
            return {
              userId: member.userId,
              username: member.username,
              role: member.role,
              tiers: parseChampionTiers(data?.championPoolMode, data?.championList, data?.championTierlist),
            } as TeamMemberPool;
          })
        );

        setMemberPools(profiles);
      } catch (poolsError) {
        console.error('Failed to fetch member pools:', poolsError);
        setError('Failed to load champion pools.');
      } finally {
        setLoadingPools(false);
      }
    };

    void loadPools();
  }, [apiUrl, selectedTeam]);

  const applyChampionToBan = (side: DraftSide, index: number, champion: string) => {
    if (side === 'BLUE') {
      setBlueBans((prev) => prev.map((entry, i) => (i === index ? champion : entry)));
    } else {
      setRedBans((prev) => prev.map((entry, i) => (i === index ? champion : entry)));
    }
  };

  const applyChampionToPick = (index: number, champion: string) => {
    setPicks((prev) => prev.map((entry, i) => (i === index ? { ...entry, champion } : entry)));
  };

  const onDropChampion = (target: { kind: 'ban' | 'pick'; side?: DraftSide; index: number }) => {
    if (!draggingChampion) return;
    if (target.kind === 'ban' && target.side) {
      applyChampionToBan(target.side, target.index, draggingChampion.champion);
    } else if (target.kind === 'pick') {
      applyChampionToPick(target.index, draggingChampion.champion);
    }
    setDraggingChampion(null);
  };

  const setPickRole = (index: number, role: DraftRole) => {
    setPicks((prev) => prev.map((pick, i) => (i === index ? { ...pick, assignedRole: role } : pick)));
  };

  const resetDraft = () => {
    setBlueBans(['', '', '', '', '']);
    setRedBans(['', '', '', '', '']);
    setPicks(PICK_ORDER.map((side) => ({ side, champion: '', assignedRole: null })));
  };

  if (!user) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto">
          <NoAccess action="view" showButtons={true} />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Team Draft Room"
        description="Player-only team champion pools and drag-and-drop draft planner."
        path="/teams/drafts"
        keywords="team draft, champion pool, draft planner"
      />

      <div className="min-h-screen px-4 py-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Team Draft Room
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Player champion pools only. Drag champions into bans and pick order slots.
              </p>
            </div>
            <Link href="/teams/dashboard" className="text-sm hover:opacity-80" style={{ color: 'var(--color-accent-1)' }}>
              Back to Teams Dashboard
            </Link>
          </div>

          <section className="border rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                Team Selector
              </span>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                disabled={loadingTeams || teams.length === 0}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  minWidth: '240px',
                }}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} {team.tag ? `[${team.tag}]` : ''}
                  </option>
                ))}
              </select>
              {loadingTeams && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading teams...</span>}
              {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
            </div>
          </section>

          {selectedTeam && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <section className="xl:col-span-1 border rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Player Champion Pools</h2>
                  {loadingPools && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Refreshing...</span>}
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  Staff pools are hidden here. Drag icon to draft slots.
                </p>

                <div className="space-y-3 max-h-[720px] overflow-auto pr-1">
                  {playerPools.map((member) => (
                    <article
                      key={member.userId}
                      className="border rounded-lg p-3"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{member.username}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{member.role}</p>
                      </div>
                      <div className="space-y-2">
                        {(Object.keys(member.tiers) as TierKey[]).map((tier) => (
                          <div key={`${member.userId}-${tier}`} className="flex flex-wrap gap-1.5">
                            {member.tiers[tier].map((champion) => {
                              const disabled = usedChampions.has(champion.toLowerCase());
                              return (
                                <button
                                  key={`${member.userId}-${tier}-${champion}`}
                                  draggable={!disabled}
                                  onDragStart={(event) => {
                                    if (disabled) return;
                                    event.dataTransfer.setData('text/plain', champion);
                                    setDraggingChampion({ champion, sourceUserId: member.userId, tier });
                                  }}
                                  onDragEnd={() => setDraggingChampion(null)}
                                  onClick={() => {
                                    if (!disabled) {
                                      setDraggingChampion({ champion, sourceUserId: member.userId, tier });
                                    }
                                  }}
                                  className="relative w-10 h-10 rounded-md overflow-hidden"
                                  style={{
                                    border: `2px solid ${TIER_STYLE[tier].border}`,
                                    backgroundColor: TIER_STYLE[tier].bg,
                                    opacity: disabled ? 0.35 : 1,
                                  }}
                                  title={`${champion} (${tier})`}
                                >
                                  <img src={getChampionIconUrl(champion)} alt={champion} className="w-full h-full object-cover" />
                                  <span
                                    className="absolute bottom-0 right-0 text-[9px] leading-none px-1 py-[1px] rounded-tl"
                                    style={{ backgroundColor: TIER_STYLE[tier].border, color: '#111' }}
                                  >
                                    {tier}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                  {!loadingPools && playerPools.length === 0 && (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      No player champion pools found in this team.
                    </p>
                  )}
                </div>
              </section>

              <section className="xl:col-span-2 border rounded-xl p-4 space-y-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Draft Imager</h2>
                  <button
                    onClick={resetDraft}
                    className="px-3 py-2 text-sm rounded-md"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#93C5FD' }}>Blue Bans</p>
                    <div className="grid grid-cols-5 gap-2">
                      {blueBans.map((champion, index) => (
                        <button
                          key={`blue-ban-${index}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => onDropChampion({ kind: 'ban', side: 'BLUE', index })}
                          onClick={() => {
                            if (draggingChampion) onDropChampion({ kind: 'ban', side: 'BLUE', index });
                          }}
                          className="h-16 rounded-lg border text-xs overflow-hidden"
                          style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(30, 64, 175, 0.15)', color: 'var(--color-text-primary)' }}
                        >
                          {champion ? <img src={getChampionIconUrl(champion)} alt={champion} className="w-full h-full object-cover" /> : `B${index + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#FCA5A5' }}>Red Bans</p>
                    <div className="grid grid-cols-5 gap-2">
                      {redBans.map((champion, index) => (
                        <button
                          key={`red-ban-${index}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => onDropChampion({ kind: 'ban', side: 'RED', index })}
                          onClick={() => {
                            if (draggingChampion) onDropChampion({ kind: 'ban', side: 'RED', index });
                          }}
                          className="h-16 rounded-lg border text-xs overflow-hidden"
                          style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(153, 27, 27, 0.15)', color: 'var(--color-text-primary)' }}
                        >
                          {champion ? <img src={getChampionIconUrl(champion)} alt={champion} className="w-full h-full object-cover" /> : `R${index + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Pick Order (Blue/Red)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {picks.map((slot, index) => {
                      const sideColor = slot.side === 'BLUE' ? '#93C5FD' : '#FCA5A5';
                      return (
                        <div
                          key={`pick-${index}`}
                          className="border rounded-lg p-2 flex items-center gap-2"
                          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
                        >
                          <div className="text-xs font-semibold w-14" style={{ color: sideColor }}>
                            {slot.side[0]}{index + 1}
                          </div>
                          <button
                            className="w-12 h-12 rounded-md border overflow-hidden flex items-center justify-center text-xs"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDropChampion({ kind: 'pick', index })}
                            onClick={() => {
                              if (draggingChampion) onDropChampion({ kind: 'pick', index });
                            }}
                            style={{ borderColor: 'var(--color-border)', backgroundColor: slot.side === 'BLUE' ? 'rgba(30, 64, 175, 0.15)' : 'rgba(153, 27, 27, 0.15)' }}
                            title={slot.champion || 'Drop champion'}
                          >
                            {slot.champion ? (
                              <img src={getChampionIconUrl(slot.champion)} alt={slot.champion} className="w-full h-full object-cover" />
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>+</span>
                            )}
                          </button>

                          <div className="flex items-center gap-1 flex-1">
                            {ROLE_ORDER.map((role) => {
                              const selected = slot.assignedRole === role;
                              return (
                                <button
                                  key={`${index}-${role}`}
                                  onClick={() => setPickRole(index, role)}
                                  className="w-7 h-7 rounded-md border flex items-center justify-center"
                                  style={{
                                    borderColor: selected ? sideColor : 'var(--color-border)',
                                    backgroundColor: selected ? `${sideColor}30` : 'transparent',
                                    color: selected ? sideColor : 'var(--color-text-muted)',
                                  }}
                                  title={role}
                                >
                                  {getRoleIcon(role)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Manual Champion Search
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                    {allChampions.slice(0, 80).map((champion) => (
                      <button
                        key={champion}
                        draggable={!usedChampions.has(champion.toLowerCase())}
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', champion);
                          setDraggingChampion({ champion, sourceUserId: 'search', tier: 'A' });
                        }}
                        onDragEnd={() => setDraggingChampion(null)}
                        className="w-8 h-8 rounded overflow-hidden border"
                        style={{ borderColor: 'var(--color-border)', opacity: usedChampions.has(champion.toLowerCase()) ? 0.35 : 1 }}
                        title={champion}
                      >
                        <img src={getChampionIconUrl(champion)} alt={champion} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TeamDraftsPage;
