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
  members: TeamMember[];
};

type ProfileChampionTierlist = {
  S?: string[];
  A?: string[];
  B?: string[];
  C?: string[];
};

type TeamMemberPool = {
  userId: string;
  username: string;
  role: string;
  champions: string[];
  tiers: {
    S: string[];
    A: string[];
    B: string[];
    C: string[];
  };
};

type DraftSide = 'blue' | 'red';

type DraftSlot = {
  role: 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP';
  champion: string;
  memberUserId: string;
};

const ROLE_ORDER: DraftSlot['role'][] = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];

function normalizeChampion(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function sanitizeTierlist(raw: unknown): { S: string[]; A: string[]; B: string[]; C: string[] } {
  const tierlist = (raw && typeof raw === 'object' ? raw : {}) as ProfileChampionTierlist;
  const seen = new Set<string>();

  const toTier = (entries: unknown): string[] => {
    if (!Array.isArray(entries)) return [];
    const out: string[] = [];
    for (const entry of entries) {
      const champ = normalizeChampion(entry);
      if (!champ) continue;
      const key = champ.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(champ);
    }
    return out;
  };

  return {
    S: toTier(tierlist.S),
    A: toTier(tierlist.A),
    B: toTier(tierlist.B),
    C: toTier(tierlist.C),
  };
}

function flattenMemberPool(mode: unknown, championList: unknown, championTierlist: unknown): TeamMemberPool['tiers'] {
  if (String(mode || '').toUpperCase() === 'TIERLIST') {
    return sanitizeTierlist(championTierlist);
  }

  const list = Array.isArray(championList)
    ? championList.map((entry) => normalizeChampion(entry)).filter((entry): entry is string => !!entry)
    : [];

  return {
    S: list,
    A: [],
    B: [],
    C: [],
  };
}

const TeamDraftsPage: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [memberPools, setMemberPools] = useState<TeamMemberPool[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPools, setLoadingPools] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allChampions, setAllChampions] = useState<string[]>([]);
  const [championSearch, setChampionSearch] = useState('');
  const [draftSituation, setDraftSituation] = useState('');
  const [activeSide, setActiveSide] = useState<DraftSide>('blue');

  const [blueBans, setBlueBans] = useState<string[]>(['', '', '', '', '']);
  const [redBans, setRedBans] = useState<string[]>(['', '', '', '', '']);
  const [bluePicks, setBluePicks] = useState<DraftSlot[]>(ROLE_ORDER.map((role) => ({ role, champion: '', memberUserId: '' })));
  const [redPicks, setRedPicks] = useState<DraftSlot[]>(ROLE_ORDER.map((role) => ({ role, champion: '', memberUserId: '' })));

  const [activeSlot, setActiveSlot] = useState<{ type: 'ban' | 'pick'; side: DraftSide; index: number }>({
    type: 'pick',
    side: 'blue',
    index: 0,
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const teamChampionMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of memberPools) {
      for (const champion of member.champions) {
        map.set(champion, (map.get(champion) || 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
  }, [memberPools]);

  const selectedPoolForActivePick = useMemo(() => {
    if (activeSlot.type !== 'pick') {
      return teamChampionMap.map(([champion]) => champion);
    }

    const picks = activeSlot.side === 'blue' ? bluePicks : redPicks;
    const memberUserId = picks[activeSlot.index]?.memberUserId;
    if (!memberUserId) {
      return teamChampionMap.map(([champion]) => champion);
    }

    const memberPool = memberPools.find((member) => member.userId === memberUserId);
    return memberPool?.champions || [];
  }, [activeSlot, bluePicks, redPicks, memberPools, teamChampionMap]);

  const filteredChampionSuggestions = useMemo(() => {
    const source = selectedPoolForActivePick.length > 0 ? selectedPoolForActivePick : allChampions;
    if (!championSearch.trim()) {
      return source.slice(0, 24);
    }

    const query = championSearch.trim().toLowerCase();
    return source.filter((champion) => champion.toLowerCase().includes(query)).slice(0, 30);
  }, [allChampions, championSearch, selectedPoolForActivePick]);

  useEffect(() => {
    const loadChampions = async () => {
      try {
        const champions = await fetchChampions();
        setAllChampions(champions);
      } catch (championsError) {
        console.error('Failed to load champions list:', championsError);
      }
    };

    void loadChampions();
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
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
        setError('Failed to load teams. Please try again.');
      } finally {
        setLoadingTeams(false);
      }
    };

    void fetchTeams();
  }, [apiUrl]);

  useEffect(() => {
    const fetchPools = async () => {
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
                champions: [],
                tiers: { S: [], A: [], B: [], C: [] },
              } as TeamMemberPool;
            }

            const data = await res.json();
            const tiers = flattenMemberPool(data?.championPoolMode, data?.championList, data?.championTierlist);
            const champions = [...tiers.S, ...tiers.A, ...tiers.B, ...tiers.C];

            return {
              userId: member.userId,
              username: member.username,
              role: member.role,
              champions,
              tiers,
            } as TeamMemberPool;
          })
        );

        setMemberPools(profiles);
      } catch (poolError) {
        console.error('Failed to fetch team member champion pools:', poolError);
        setError('Failed to load champion pools. Please try again.');
      } finally {
        setLoadingPools(false);
      }
    };

    void fetchPools();
  }, [apiUrl, selectedTeam]);

  const applyChampionToActiveSlot = (champion: string) => {
    if (activeSlot.type === 'ban') {
      if (activeSlot.side === 'blue') {
        setBlueBans((prev) => prev.map((entry, index) => (index === activeSlot.index ? champion : entry)));
      } else {
        setRedBans((prev) => prev.map((entry, index) => (index === activeSlot.index ? champion : entry)));
      }
      return;
    }

    const updatePick = (prev: DraftSlot[]) =>
      prev.map((slot, index) => (index === activeSlot.index ? { ...slot, champion } : slot));

    if (activeSlot.side === 'blue') {
      setBluePicks(updatePick);
    } else {
      setRedPicks(updatePick);
    }
  };

  const updatePickMember = (side: DraftSide, index: number, memberUserId: string) => {
    const updateFn = (prev: DraftSlot[]) => prev.map((slot, slotIndex) => (slotIndex === index ? { ...slot, memberUserId } : slot));
    if (side === 'blue') {
      setBluePicks(updateFn);
    } else {
      setRedPicks(updateFn);
    }
  };

  const clearDraft = () => {
    setBlueBans(['', '', '', '', '']);
    setRedBans(['', '', '', '', '']);
    setBluePicks(ROLE_ORDER.map((role) => ({ role, champion: '', memberUserId: '' })));
    setRedPicks(ROLE_ORDER.map((role) => ({ role, champion: '', memberUserId: '' })));
    setDraftSituation('');
    setChampionSearch('');
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
        description="Centralized team champion pools with an interactive draft imager for planning draft scenarios."
        path="/teams/drafts"
        keywords="team draft, champion pool, draft planner, league of legends draft"
      />

      <div className="min-h-screen px-4 py-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Team Draft Room
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Centralized team champion pools plus an interactive draft imager for specific match situations.
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

          {!loadingTeams && teams.length === 0 && (
            <div className="border rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                You are not in a team yet. Create or join a team first to use the Draft Room.
              </p>
            </div>
          )}

          {selectedTeam && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <section className="xl:col-span-1 border rounded-xl p-4 space-y-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Team Champion Pools
                  </h2>
                  {loadingPools && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Refreshing...</span>}
                </div>

                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Shared Priority Pool
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {teamChampionMap.slice(0, 20).map(([champion, count]) => (
                      <button
                        key={champion}
                        onClick={() => applyChampionToActiveSlot(champion)}
                        className="px-2 py-1 rounded-md text-xs"
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.12)',
                          color: '#93C5FD',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                        }}
                      >
                        {champion} ({count})
                      </button>
                    ))}
                    {teamChampionMap.length === 0 && (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        No champion pools found for this team yet.
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 max-h-[640px] overflow-auto pr-1">
                  {memberPools.map((member) => (
                    <article key={member.userId} className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{member.username}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{member.role}</p>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--color-accent-1)' }}>
                          {member.champions.length} champs
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {member.champions.slice(0, 14).map((champion) => (
                          <button
                            key={`${member.userId}-${champion}`}
                            onClick={() => applyChampionToActiveSlot(champion)}
                            className="px-2 py-1 rounded-md text-xs hover:opacity-80"
                            style={{
                              backgroundColor: 'rgba(200, 170, 109, 0.15)',
                              color: 'var(--color-text-primary)',
                              border: '1px solid rgba(200, 170, 109, 0.35)',
                            }}
                          >
                            {champion}
                          </button>
                        ))}
                        {member.champions.length === 0 && (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            No pool configured.
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="xl:col-span-2 border rounded-xl p-4 space-y-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Draft Situation
                    </label>
                    <textarea
                      value={draftSituation}
                      onChange={(e) => setDraftSituation(e.target.value)}
                      rows={4}
                      placeholder="Examples: blind pick game 1, red-side anti-dive, scaling comp into poke..."
                      className="w-full p-3 rounded-lg text-sm"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                        Active Side
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveSide('blue')}
                          className="px-3 py-2 text-sm rounded-md"
                          style={{
                            backgroundColor: activeSide === 'blue' ? '#1D4ED8' : 'var(--color-bg-tertiary)',
                            color: activeSide === 'blue' ? '#fff' : 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          Blue Side
                        </button>
                        <button
                          onClick={() => setActiveSide('red')}
                          className="px-3 py-2 text-sm rounded-md"
                          style={{
                            backgroundColor: activeSide === 'red' ? '#B91C1C' : 'var(--color-bg-tertiary)',
                            color: activeSide === 'red' ? '#fff' : 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          Red Side
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={clearDraft}
                        className="px-3 py-2 text-sm rounded-md"
                        style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                      >
                        Reset Draft
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Draft Imager
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Click a slot, then click a champion from suggestions or team pools.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#93C5FD' }}>Blue Bans</p>
                      <div className="grid grid-cols-5 gap-2">
                        {blueBans.map((champion, index) => (
                          <button
                            key={`blue-ban-${index}`}
                            onClick={() => setActiveSlot({ type: 'ban', side: 'blue', index })}
                            className="h-16 rounded-lg border text-xs overflow-hidden"
                            style={{
                              borderColor: activeSlot.type === 'ban' && activeSlot.side === 'blue' && activeSlot.index === index ? '#60A5FA' : 'var(--color-border)',
                              backgroundColor: 'rgba(30, 64, 175, 0.15)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {champion ? (
                              <img src={getChampionIconUrl(champion)} alt={champion} className="w-full h-full object-cover" />
                            ) : (
                              <span>B{index + 1}</span>
                            )}
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
                            onClick={() => setActiveSlot({ type: 'ban', side: 'red', index })}
                            className="h-16 rounded-lg border text-xs overflow-hidden"
                            style={{
                              borderColor: activeSlot.type === 'ban' && activeSlot.side === 'red' && activeSlot.index === index ? '#FCA5A5' : 'var(--color-border)',
                              backgroundColor: 'rgba(153, 27, 27, 0.15)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {champion ? (
                              <img src={getChampionIconUrl(champion)} alt={champion} className="w-full h-full object-cover" />
                            ) : (
                              <span>R{index + 1}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="border rounded-lg p-3" style={{ borderColor: 'rgba(96, 165, 250, 0.4)', backgroundColor: 'rgba(30, 64, 175, 0.12)' }}>
                      <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#93C5FD' }}>Blue Picks</p>
                      <div className="space-y-2">
                        {bluePicks.map((slot, index) => (
                          <div key={`blue-pick-${slot.role}`} className="grid grid-cols-[72px_1fr_1fr] gap-2">
                            <button
                              onClick={() => setActiveSlot({ type: 'pick', side: 'blue', index })}
                              className="rounded-md border px-2 py-2 text-xs"
                              style={{
                                borderColor: activeSlot.type === 'pick' && activeSlot.side === 'blue' && activeSlot.index === index ? '#60A5FA' : 'var(--color-border)',
                                color: 'var(--color-text-primary)',
                                backgroundColor: 'rgba(30, 58, 138, 0.25)',
                              }}
                            >
                              {slot.role}
                            </button>
                            <button
                              onClick={() => setActiveSlot({ type: 'pick', side: 'blue', index })}
                              className="rounded-md border px-2 py-2 text-left text-xs flex items-center gap-2"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-secondary)' }}
                            >
                              {slot.champion ? <img src={getChampionIconUrl(slot.champion)} alt={slot.champion} className="w-5 h-5 rounded" /> : null}
                              <span>{slot.champion || 'Pick champion'}</span>
                            </button>
                            <select
                              value={slot.memberUserId}
                              onChange={(e) => updatePickMember('blue', index, e.target.value)}
                              className="rounded-md border px-2 py-2 text-xs"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-secondary)' }}
                            >
                              <option value="">Assign member</option>
                              {memberPools.map((member) => (
                                <option key={`blue-member-${member.userId}`} value={member.userId}>
                                  {member.username}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border rounded-lg p-3" style={{ borderColor: 'rgba(252, 165, 165, 0.4)', backgroundColor: 'rgba(127, 29, 29, 0.12)' }}>
                      <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#FCA5A5' }}>Red Picks</p>
                      <div className="space-y-2">
                        {redPicks.map((slot, index) => (
                          <div key={`red-pick-${slot.role}`} className="grid grid-cols-[72px_1fr_1fr] gap-2">
                            <button
                              onClick={() => setActiveSlot({ type: 'pick', side: 'red', index })}
                              className="rounded-md border px-2 py-2 text-xs"
                              style={{
                                borderColor: activeSlot.type === 'pick' && activeSlot.side === 'red' && activeSlot.index === index ? '#FCA5A5' : 'var(--color-border)',
                                color: 'var(--color-text-primary)',
                                backgroundColor: 'rgba(127, 29, 29, 0.25)',
                              }}
                            >
                              {slot.role}
                            </button>
                            <button
                              onClick={() => setActiveSlot({ type: 'pick', side: 'red', index })}
                              className="rounded-md border px-2 py-2 text-left text-xs flex items-center gap-2"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-secondary)' }}
                            >
                              {slot.champion ? <img src={getChampionIconUrl(slot.champion)} alt={slot.champion} className="w-5 h-5 rounded" /> : null}
                              <span>{slot.champion || 'Pick champion'}</span>
                            </button>
                            <select
                              value={slot.memberUserId}
                              onChange={(e) => updatePickMember('red', index, e.target.value)}
                              className="rounded-md border px-2 py-2 text-xs"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-secondary)' }}
                            >
                              <option value="">Assign member</option>
                              {memberPools.map((member) => (
                                <option key={`red-member-${member.userId}`} value={member.userId}>
                                  {member.username}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Champion Suggestions for Active Slot
                  </label>
                  <input
                    value={championSearch}
                    onChange={(e) => setChampionSearch(e.target.value)}
                    placeholder="Search champion..."
                    className="w-full px-3 py-2 rounded-md text-sm mb-3"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                  />
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-auto">
                    {filteredChampionSuggestions.map((champion) => (
                      <button
                        key={`suggestion-${champion}`}
                        onClick={() => applyChampionToActiveSlot(champion)}
                        className="px-2 py-1 rounded-md text-xs flex items-center gap-1"
                        style={{
                          backgroundColor: 'rgba(148, 163, 184, 0.18)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <img src={getChampionIconUrl(champion)} alt={champion} className="w-4 h-4 rounded" />
                        <span>{champion}</span>
                      </button>
                    ))}
                    {filteredChampionSuggestions.length === 0 && (
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        No matching champions for this slot.
                      </span>
                    )}
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
