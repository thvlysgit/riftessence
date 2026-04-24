import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

type ChampionSuggestion = {
  champion: string;
  score: number;
  players: number;
  bestTier: TierKey;
};

type SavedDraft = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  createdAt: string;
  updatedAt: string;
  blueBans: string[];
  redBans: string[];
  picks: PickSlot[];
};

const CHAMPION_ROLE_HINTS: Record<string, DraftRole> = {
  Aatrox: 'TOP',
  Ahri: 'MID',
  Akali: 'MID',
  Alistar: 'SUP',
  Ashe: 'ADC',
  Blitzcrank: 'SUP',
  Camille: 'TOP',
  Caitlyn: 'ADC',
  ChoGath: 'TOP',
  Darius: 'TOP',
  Draven: 'ADC',
  Ezreal: 'ADC',
  Galio: 'MID',
  Garen: 'TOP',
  Gragas: 'JGL',
  Hecarim: 'JGL',
  Irelia: 'MID',
  Janna: 'SUP',
  JarvanIV: 'JGL',
  Jinx: 'ADC',
  KaiSa: 'ADC',
  Karthus: 'JGL',
  Katarina: 'MID',
  Kayle: 'TOP',
  KhaZix: 'JGL',
  LeeSin: 'JGL',
  Leona: 'SUP',
  Lucian: 'ADC',
  Lux: 'MID',
  Malphite: 'TOP',
  Maokai: 'SUP',
  MissFortune: 'ADC',
  Morgana: 'SUP',
  Nasus: 'TOP',
  Nautilus: 'SUP',
  Nilah: 'ADC',
  Nunu: 'JGL',
  Orianna: 'MID',
  Pyke: 'SUP',
  Rakan: 'SUP',
  Renekton: 'TOP',
  Rengar: 'JGL',
  Sejuani: 'JGL',
  Senna: 'SUP',
  Seraphine: 'SUP',
  Sett: 'TOP',
  Shen: 'TOP',
  Singed: 'TOP',
  Sion: 'TOP',
  Sivir: 'ADC',
  Soraka: 'SUP',
  Sylas: 'MID',
  Syndra: 'MID',
  TahmKench: 'SUP',
  Taliyah: 'MID',
  Taric: 'SUP',
  Teemo: 'TOP',
  Thresh: 'SUP',
  Tristana: 'ADC',
  Tryndamere: 'TOP',
  TwistedFate: 'MID',
  Udyr: 'JGL',
  Urgot: 'TOP',
  Vayne: 'ADC',
  Veigar: 'MID',
  Vi: 'JGL',
  Vladimir: 'MID',
  Volibear: 'TOP',
  Warwick: 'JGL',
  Wukong: 'TOP',
  Xayah: 'ADC',
  Xerath: 'MID',
  Yasuo: 'MID',
  Zac: 'JGL',
  Zed: 'MID',
  Ziggs: 'MID',
  Zilean: 'SUP',
  Zeri: 'ADC',
  Zyra: 'SUP',
};

const PLAYER_ROLES = new Set(['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS', 'OWNER']);
const ROLE_ORDER: DraftRole[] = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];

// Tournament pick order: B1 R1 R2 B2 B3 R3 R4 B4 B5 R5
const PICK_ORDER: DraftSide[] = ['BLUE', 'RED', 'RED', 'BLUE', 'BLUE', 'RED', 'RED', 'BLUE', 'BLUE', 'RED'];
const BLUE_PICK_SLOT_INDEXES = [0, 3, 4, 7, 8];
const RED_PICK_SLOT_INDEXES = [1, 2, 5, 6, 9];

const TIER_STYLE: Record<TierKey, { border: string; bg: string }> = {
  S: { border: '#FFD700', bg: 'rgba(255, 215, 0, 0.16)' },
  A: { border: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.16)' },
  B: { border: '#CD7F32', bg: 'rgba(205, 127, 50, 0.16)' },
  C: { border: '#7A7A7A', bg: 'rgba(122, 122, 122, 0.16)' },
};

const TIER_WEIGHT: Record<TierKey, number> = { S: 4, A: 3, B: 2, C: 1 };

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
    return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M72.13 57.86C78.7 41.1 90.04 26.94 99.94 12.1 93 29.47 84.31 46.87 84.04 65.97c-.73 4.81-2.83 9.31-4 14.03-2.08-7.57-4.91-14.9-7.91-22.14ZM36.21 12.35c13.06 20.19 26.67 40.61 33.61 63.87 4.77 15.49 5.42 32.94-1.8 47.8-5.58-6.1-11.08-12.29-16.71-18.34-4.97-4.72-10.26-9.1-15.32-13.71-1.55-11.73-2.97-23.87-8.72-34.42-2.75-5.24-6.71-9.72-11.19-13.55 9.67 4.75 19.18 10.41 26.23 18.72 4.37 4.98 7.46 10.94 9.69 17.15 1.15-10.29.58-20.79-2.05-30.81-3.31-12.68-8.99-24.55-13.74-36.71ZM105.84 53.83c4.13-4 8.96-7.19 14.04-9.84-4.4 3.88-8.4 8.32-11.14 13.55-5.75 10.56-7.18 22.71-8.74 34.45-5.32 5.35-10.68 10.65-15.98 16.01.15-4.37-.25-8.84 1.02-13.1 3.39-15.08 9.48-30.18 20.8-41.07Z"/></svg>;
  }
  if (role === 'MID') {
    return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c22.67 0 45.33 0 67.99.01C78.62 21.34 73.28 26.69 67.88 32c-11.96 0-23.92-.01-35.88 0-.01 12 .01 24-.01 36-5.32 5.3-10.64 10.6-15.98 15.89C15.99 61.26 16 38.63 16 16zm87.95 51.9c5.32-5.37 10.69-10.68 16.04-16.02.02 22.71.01 45.41 0 68.12-22.65 0-45.31.01-67.97-.01 5.33-5.33 10.65-10.67 15.99-15.99 12-.01 23.99.01 35.99 0 .04-12.04-.05-24.07-.05-36.1z" opacity="0.75"/><path d="M100.02 16H120v19.99C92 64 64 92 35.99 120H16v-19.99C44 72 72 43.99 100.02 16z"/></svg>;
  }
  if (role === 'ADC') {
    return <Image src="/assets/BotLane.png" alt="Bot" width={16} height={16} className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(93%) sepia(4%) saturate(134%) hue-rotate(177deg) brightness(107%) contrast(92%)' }} />;
  }
  return <svg className="w-4 h-4" viewBox="0 0 136 136" fill="currentColor"><path d="M52.21 12.03c10.33-.1 20.66.06 30.99-.08 1.71 2.62 3.2 5.37 4.79 8.07C81.32 28 74.68 36.01 68 43.98 61.32 36 54.66 28 48.01 19.99c1.4-2.65 2.82-5.29 4.2-7.96ZM0 36.3c14.64-.68 29.33-.11 43.99-.3C48 40 52 44 56 48.01c-2.67 9.32-5.32 18.66-8.01 27.98-6.66-2.65-13.32-5.32-19.98-7.99 3.97-5.35 8.02-10.63 11.96-15.99-5.01-.08-10.15.4-15-1.14C15.58 48.12 7.75 42.05 0 36.34v-.04ZM92.02 36c14.66.05 29.32-.09 43.98.07v.03c-7.3 5.9-15.1 11.53-24.1 14.5-5.11 1.85-10.59 1.34-15.91 1.41 4.01 5.32 8 10.65 11.99 15.98-6.64 2.7-13.31 5.34-19.97 8-2.69-9.32-5.34-18.65-8.01-27.98C84.01 44 88 39.99 92.02 36ZM64.01 52.11c1.36 1.26 2.7 2.55 3.99 3.89 1.32-1.33 2.65-2.65 3.99-3.97 4.04 19.97 7.97 39.96 12.02 59.92-5.31 4.05-10.66 8.07-16.04 12.03-5.32-4.01-10.67-7.97-15.98-12.01 4.04-19.94 7.96-39.92 12.02-59.86Z"/></svg>;
}

function normalizeChampionKey(name: string): string {
  return name.replace(/[^a-zA-Z]/g, '');
}

function getChampionRoleHint(champion: string): DraftRole | null {
  const normalized = normalizeChampionKey(champion);
  return CHAMPION_ROLE_HINTS[normalized] || null;
}

function normalizeSavedDraft(raw: any): SavedDraft {
  const picksRaw = Array.isArray(raw?.picks) ? raw.picks : [];
  const picks = (picksRaw.length === PICK_ORDER.length ? picksRaw : PICK_ORDER.map((side) => ({ side, champion: '', assignedRole: null }))).map((pick: any, index: number) => {
    const role = typeof pick?.assignedRole === 'string' ? pick.assignedRole.toUpperCase() : null;
    const normalizedRole = ROLE_ORDER.includes(role as DraftRole) ? (role as DraftRole) : null;
    return {
      side: PICK_ORDER[index],
      champion: typeof pick?.champion === 'string' ? pick.champion : '',
      assignedRole: normalizedRole,
    } as PickSlot;
  });

  const normalizeBans = (value: any) => {
    if (!Array.isArray(value) || value.length !== 5) {
      return ['', '', '', '', ''];
    }
    return value.map((entry: any) => (typeof entry === 'string' ? entry : ''));
  };

  return {
    id: String(raw?.id || ''),
    name: String(raw?.name || 'New Draft'),
    teamId: String(raw?.teamId || raw?.team?.id || ''),
    teamName: String(raw?.team?.name || 'Unknown Team'),
    createdAt: String(raw?.createdAt || new Date().toISOString()),
    updatedAt: String(raw?.updatedAt || new Date().toISOString()),
    blueBans: normalizeBans(raw?.blueBans),
    redBans: normalizeBans(raw?.redBans),
    picks,
  };
}

const TeamDraftsPage: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [memberPools, setMemberPools] = useState<TeamMemberPool[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPools, setLoadingPools] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allChampions, setAllChampions] = useState<string[]>([]);
  const [championSearch, setChampionSearch] = useState('');
  const [draggingChampion, setDraggingChampion] = useState<DragPayload | null>(null);
  const [draftName, setDraftName] = useState('New Draft');
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
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

  const pickerChampions = useMemo(() => {
    const merged = new Map<string, string>();
    for (const champion of allChampions) {
      merged.set(champion.toLowerCase(), champion);
    }
    for (const member of playerPools) {
      for (const tier of Object.keys(member.tiers) as TierKey[]) {
        for (const champion of member.tiers[tier]) {
          const key = champion.toLowerCase();
          if (!merged.has(key)) merged.set(key, champion);
        }
      }
    }
    return Array.from(merged.values()).sort((a, b) => a.localeCompare(b));
  }, [allChampions, playerPools]);

  const filteredPickerChampions = useMemo(() => {
    const query = championSearch.trim().toLowerCase();
    if (!query) return pickerChampions;
    return pickerChampions.filter((champion) => champion.toLowerCase().includes(query));
  }, [pickerChampions, championSearch]);

  const suggestions = useMemo(() => {
    const bucket = new Map<string, { champion: string; score: number; players: Set<string>; bestTierWeight: number }>();

    for (const member of playerPools) {
      const localBest = new Map<string, number>();
      for (const tier of Object.keys(member.tiers) as TierKey[]) {
        for (const champion of member.tiers[tier]) {
          const key = champion.toLowerCase();
          const weight = TIER_WEIGHT[tier];
          localBest.set(key, Math.max(localBest.get(key) || 0, weight));
          if (!bucket.has(key)) {
            bucket.set(key, { champion, score: 0, players: new Set<string>(), bestTierWeight: weight });
          }
          const entry = bucket.get(key)!;
          if (weight > entry.bestTierWeight) entry.bestTierWeight = weight;
        }
      }

      for (const [key, weight] of localBest) {
        const entry = bucket.get(key)!;
        entry.score += weight;
        entry.players.add(member.userId);
      }
    }

    const toTier = (weight: number): TierKey => {
      if (weight >= 4) return 'S';
      if (weight >= 3) return 'A';
      if (weight >= 2) return 'B';
      return 'C';
    };

    return Array.from(bucket.values())
      .filter((entry) => !usedChampions.has(entry.champion.toLowerCase()))
      .map((entry) => ({
        champion: entry.champion,
        score: entry.score,
        players: entry.players.size,
        bestTier: toTier(entry.bestTierWeight),
      } as ChampionSuggestion))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.players !== a.players) return b.players - a.players;
        return a.champion.localeCompare(b.champion);
      })
      .slice(0, 16);
  }, [playerPools, usedChampions]);

  const visibleSavedDrafts = useMemo(() => {
    if (!selectedTeamId) return savedDrafts;
    return savedDrafts.filter((draft) => draft.teamId === selectedTeamId);
  }, [savedDrafts, selectedTeamId]);

  const activeSavedDraft = useMemo(
    () => savedDrafts.find((draft) => draft.id === activeDraftId) || null,
    [savedDrafts, activeDraftId]
  );

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
    const loadSavedDrafts = async () => {
      const token = getAuthToken();
      if (!token || !selectedTeamId) {
        setSavedDrafts([]);
        setActiveDraftId(null);
        return;
      }

      setLoadingDrafts(true);

      try {
        const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/drafts`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch saved drafts');
        }

        const data = await res.json();
        const drafts = Array.isArray(data?.drafts) ? data.drafts.map((entry: any) => normalizeSavedDraft(entry)) : [];

        setSavedDrafts(drafts);
        setActiveDraftId((current) => (current && drafts.some((draft: SavedDraft) => draft.id === current) ? current : null));
      } catch (loadError) {
        console.error('Failed to load saved drafts:', loadError);
        setError('Failed to load saved drafts.');
      } finally {
        setLoadingDrafts(false);
      }
    };

    void loadSavedDrafts();
  }, [apiUrl, selectedTeamId]);

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
      setPicks((prev) => prev.map((entry, i) => {
        if (i !== target.index || entry.assignedRole) return entry;
        return { ...entry, assignedRole: getChampionRoleHint(draggingChampion.champion) };
      }));
    }
    setDraggingChampion(null);
  };

  const setPickRole = (index: number, role: DraftRole) => {
    setPicks((prev) => prev.map((pick, i) => (i === index ? { ...pick, assignedRole: role } : pick)));
  };

  const buildDraftPayload = () => ({
    name: draftName.trim() || 'New Draft',
    blueBans,
    redBans,
    picks,
  });

  const applySavedDraft = (draft: SavedDraft) => {
    setSelectedTeamId(draft.teamId);
    setDraftName(draft.name);
    setBlueBans(draft.blueBans.length === 5 ? draft.blueBans : ['', '', '', '', '']);
    setRedBans(draft.redBans.length === 5 ? draft.redBans : ['', '', '', '', '']);
    setPicks(
      (draft.picks.length === PICK_ORDER.length ? draft.picks : PICK_ORDER.map((side) => ({ side, champion: '', assignedRole: null }))).map((pick, index) => ({
        side: PICK_ORDER[index],
        champion: pick.champion || '',
        assignedRole: pick.assignedRole || null,
      }))
    );
    setActiveDraftId(draft.id);
  };

  const saveCurrentDraft = async (mode: 'overwrite' | 'duplicate') => {
    const token = getAuthToken();
    if (!token || !selectedTeamId) {
      setError('Select a team before saving drafts.');
      return;
    }

    const payload = buildDraftPayload();
    const shouldOverwrite = mode === 'overwrite' && Boolean(activeDraftId);
    const endpoint = shouldOverwrite
      ? `${apiUrl}/api/teams/${selectedTeamId}/drafts/${activeDraftId}`
      : `${apiUrl}/api/teams/${selectedTeamId}/drafts`;
    const method = shouldOverwrite ? 'PUT' : 'POST';

    setSavingDraft(true);
    setError(null);

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.draft) {
        throw new Error(data?.error || 'Failed to save draft');
      }

      const normalized = normalizeSavedDraft(data.draft);
      setSavedDrafts((prev) => [normalized, ...prev.filter((draft) => draft.id !== normalized.id)]);
      setActiveDraftId(normalized.id);
      setDraftName(normalized.name);
    } catch (saveError: any) {
      console.error('Failed to save draft:', saveError);
      setError(saveError?.message || 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const deleteSavedDraft = async (draftId: string) => {
    const token = getAuthToken();
    if (!token || !selectedTeamId) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/drafts/${draftId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete draft');
      }

      setSavedDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
      setActiveDraftId((current) => (current === draftId ? null : current));
    } catch (deleteError: any) {
      console.error('Failed to delete draft:', deleteError);
      setError(deleteError?.message || 'Failed to delete draft.');
    }
  };

  const resetDraft = () => {
    setBlueBans(['', '', '', '', '']);
    setRedBans(['', '', '', '', '']);
    setPicks(PICK_ORDER.map((side) => ({ side, champion: '', assignedRole: null })));
    setDraggingChampion(null);
    setActiveDraftId(null);
    setDraftName('New Draft');
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
                Player champion pools only. Drag champions into bans and tournament pick slots.
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

                <div className="border rounded-lg p-3 space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
                        Draft Name
                      </label>
                      <input
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        placeholder="New Draft"
                        className="w-full px-3 py-2 rounded-md text-sm"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                    </div>
                    <button
                      onClick={() => saveCurrentDraft('duplicate')}
                      disabled={savingDraft || !selectedTeamId}
                      className="px-3 py-2 rounded-md text-sm"
                      style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', opacity: savingDraft || !selectedTeamId ? 0.6 : 1 }}
                    >
                      {savingDraft ? 'Saving...' : 'Save as New'}
                    </button>
                    <button
                      onClick={() => saveCurrentDraft('overwrite')}
                      disabled={savingDraft || !selectedTeamId}
                      className="px-3 py-2 rounded-md text-sm"
                      style={{ backgroundColor: 'var(--color-accent-1)', color: '#111', border: '1px solid transparent', opacity: savingDraft || !selectedTeamId ? 0.6 : 1 }}
                    >
                      {savingDraft ? 'Saving...' : 'Save Current'}
                    </button>
                    <button
                      onClick={() => {
                        resetDraft();
                        setDraftName('New Draft');
                      }}
                      className="px-3 py-2 rounded-md text-sm"
                      style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                    >
                      New Blank Draft
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span>
                      {activeSavedDraft ? `Loaded: ${activeSavedDraft.name}` : 'No saved draft loaded'}
                    </span>
                    <span>
                      {loadingDrafts
                        ? 'Loading saved drafts...'
                        : `${visibleSavedDrafts.length} saved draft${visibleSavedDrafts.length === 1 ? '' : 's'} for this team`}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-auto pr-1">
                    {visibleSavedDrafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2"
                        style={{ borderColor: draft.id === activeDraftId ? 'var(--color-accent-1)' : 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
                      >
                        <button
                          onClick={() => applySavedDraft(draft)}
                          className="flex-1 text-left min-w-0"
                        >
                          <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{draft.name}</span>
                          <span className="block text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {draft.teamName} • Updated {new Date(draft.updatedAt).toLocaleString()}
                          </span>
                        </button>
                        <button
                          onClick={() => deleteSavedDraft(draft.id)}
                          className="px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#FCA5A5', border: '1px solid rgba(239, 68, 68, 0.35)' }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                    {visibleSavedDrafts.length === 0 && (
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        No saved drafts for this team yet.
                      </p>
                    )}
                  </div>
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
                    Tournament Pick Rounds
                  </p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-1 text-[11px] uppercase tracking-wide">
                      <p style={{ color: '#93C5FD' }}>Blue Side</p>
                      <p style={{ color: 'var(--color-text-muted)' }}>Round</p>
                      <p className="text-right" style={{ color: '#FCA5A5' }}>Red Side</p>
                    </div>

                    {Array.from({ length: 5 }).map((_, roundIndex) => {
                      const bluePickIndex = BLUE_PICK_SLOT_INDEXES[roundIndex];
                      const redPickIndex = RED_PICK_SLOT_INDEXES[roundIndex];
                      const blueSlot = picks[bluePickIndex];
                      const redSlot = picks[redPickIndex];

                      return (
                        <div key={`round-${roundIndex}`} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                          {[{ slot: blueSlot, index: bluePickIndex }, { slot: redSlot, index: redPickIndex }].map(({ slot, index }, sideIndex) => {
                            const sideColor = slot.side === 'BLUE' ? '#93C5FD' : '#FCA5A5';
                            return (
                              <div
                                key={`${slot.side}-${index}`}
                                className="border rounded-lg p-2"
                                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
                              >
                                <div className="flex items-center justify-between mb-2 text-[11px]">
                                  <span style={{ color: sideColor }}>{slot.side === 'BLUE' ? `B${roundIndex + 1}` : `R${roundIndex + 1}`}</span>
                                  <span style={{ color: 'var(--color-text-muted)' }}>Turn {index + 1}</span>
                                </div>
                                <div className={`flex items-center gap-2 ${sideIndex === 1 ? 'justify-end' : ''}`}>
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

                                  <div className="flex items-center gap-1 flex-wrap">
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
                                                color: '#E5E7EB',
                                          }}
                                          title={role}
                                        >
                                          {getRoleIcon(role)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          <div className="text-xs font-semibold text-center" style={{ color: 'var(--color-text-muted)' }}>
                            R{roundIndex + 1}
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
                  <input
                    value={championSearch}
                    onChange={(event) => setChampionSearch(event.target.value)}
                    placeholder="Search champion..."
                    className="w-full mb-2 px-3 py-2 rounded-md text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <div className="flex flex-wrap gap-2 max-h-56 overflow-auto">
                    {filteredPickerChampions.map((champion) => (
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
                  <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                    Showing {filteredPickerChampions.length} of {pickerChampions.length} champions.
                  </p>
                </div>

                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Drafting Suggestions (From Team Pools)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {suggestions.map((entry) => (
                      <button
                        key={`suggestion-${entry.champion}`}
                        draggable={!usedChampions.has(entry.champion.toLowerCase())}
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', entry.champion);
                          setDraggingChampion({ champion: entry.champion, sourceUserId: 'suggestion', tier: entry.bestTier });
                        }}
                        onDragEnd={() => setDraggingChampion(null)}
                        className="border rounded-lg p-2 flex items-center gap-2 text-left"
                        style={{ borderColor: TIER_STYLE[entry.bestTier].border, backgroundColor: TIER_STYLE[entry.bestTier].bg }}
                      >
                        <img src={getChampionIconUrl(entry.champion)} alt={entry.champion} className="w-8 h-8 rounded" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs truncate" style={{ color: 'var(--color-text-primary)' }}>{entry.champion}</span>
                          <span className="block text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            Tier {entry.bestTier} | {entry.players} players
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  {suggestions.length === 0 && (
                    <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                      No suggestions available (all pool candidates may already be used).
                    </p>
                  )}
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
