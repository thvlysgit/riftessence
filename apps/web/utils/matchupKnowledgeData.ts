import { normalizeChampionName } from './championData';

const DDRAGON_VERSION_CACHE_KEY = 'riftessence_ddragon_version_v1';
const MATCHUP_KNOWLEDGE_CACHE_KEY = 'riftessence_matchup_knowledge_v1';
const MATCHUP_RUNE_TREE_CACHE_KEY = 'riftessence_matchup_rune_trees_v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

interface VersionCache {
  version: string;
  timestamp: number;
}

interface KnowledgeCache {
  version: string;
  items: MatchupKnowledgeSuggestion[];
  runes: MatchupKnowledgeSuggestion[];
  timestamp: number;
}

interface ChampionSpellCache {
  version: string;
  champion: string;
  spells: MatchupKnowledgeSuggestion[];
  timestamp: number;
}

interface RuneTreeCache {
  version: string;
  runeTrees: MatchupRuneTree[];
  timestamp: number;
}

export type MatchupKnowledgeType = 'spell' | 'item' | 'rune';

export interface MatchupKnowledgeSuggestion {
  id: string;
  type: MatchupKnowledgeType;
  name: string;
  label: string;
  detail?: string;
  iconUrl: string;
  insertText: string;
  keywords: string[];
}

export interface MatchupRune {
  id: number;
  key: string;
  name: string;
  iconUrl: string;
  detail?: string;
  slotIndex: number;
}

export interface MatchupRuneTree {
  id: number;
  key: string;
  name: string;
  iconUrl: string;
  slots: MatchupRune[][];
}

const readCache = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const writeCache = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache is best-effort only.
  }
};

export const fetchLatestDDragonVersion = async (): Promise<string> => {
  const cached = readCache<VersionCache>(DDRAGON_VERSION_CACHE_KEY);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.version;
  }

  const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  if (!response.ok) {
    throw new Error('Failed to fetch Data Dragon version');
  }

  const versions = await response.json();
  const version = versions[0] as string;
  writeCache(DDRAGON_VERSION_CACHE_KEY, { version, timestamp: Date.now() });
  return version;
};

export const getItemIconUrl = (version: string, image: string) => (
  `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${image}`
);

export const getRuneIconUrl = (icon: string) => (
  `https://ddragon.leagueoflegends.com/cdn/img/${icon}`
);

export const getSpellIconUrl = (version: string, image: string) => (
  `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${image}`
);

const cleanText = (value?: string) => (
  value
    ? value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    : ''
);

export const fetchMatchupKnowledge = async (): Promise<{
  version: string;
  items: MatchupKnowledgeSuggestion[];
  runes: MatchupKnowledgeSuggestion[];
}> => {
  const version = await fetchLatestDDragonVersion();
  const cached = readCache<KnowledgeCache>(MATCHUP_KNOWLEDGE_CACHE_KEY);
  if (cached && cached.version === version && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { version, items: cached.items, runes: cached.runes };
  }

  const [itemResponse, runeResponse] = await Promise.all([
    fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`),
    fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`),
  ]);

  if (!itemResponse.ok || !runeResponse.ok) {
    throw new Error('Failed to fetch Data Dragon knowledge data');
  }

  const itemData = await itemResponse.json();
  const runeData = await runeResponse.json();

  const items: MatchupKnowledgeSuggestion[] = Object.entries<any>(itemData.data)
    .filter(([, item]) => item?.maps?.['11'] !== false && item?.gold?.purchasable !== false && item?.image?.full)
    .map(([id, item]) => ({
      id: `item-${id}`,
      type: 'item' as const,
      name: item.name,
      label: item.name,
      detail: cleanText(item.plaintext || item.description),
      iconUrl: getItemIconUrl(version, item.image.full),
      insertText: `**${item.name}**`,
      keywords: [item.name, item.plaintext || ''].filter(Boolean),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const runes: MatchupKnowledgeSuggestion[] = runeData.flatMap((tree: any) => (
    tree.slots.flatMap((slot: any) => (
      slot.runes.map((rune: any) => ({
        id: `rune-${rune.id}`,
        type: 'rune' as const,
        name: rune.name,
        label: rune.name,
        detail: cleanText(rune.shortDesc || rune.longDesc),
        iconUrl: getRuneIconUrl(rune.icon),
        insertText: `**${rune.name}**`,
        keywords: [rune.name, tree.name].filter(Boolean),
      }))
    ))
  ));

  writeCache(MATCHUP_KNOWLEDGE_CACHE_KEY, {
    version,
    items,
    runes,
    timestamp: Date.now(),
  });

  return { version, items, runes };
};

export const fetchRuneTrees = async (): Promise<MatchupRuneTree[]> => {
  const version = await fetchLatestDDragonVersion();
  const cached = readCache<RuneTreeCache>(MATCHUP_RUNE_TREE_CACHE_KEY);
  if (cached && cached.version === version && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.runeTrees;
  }

  const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`);
  if (!response.ok) {
    throw new Error('Failed to fetch Data Dragon rune trees');
  }

  const runeData = await response.json();
  const runeTrees: MatchupRuneTree[] = runeData.map((tree: any) => ({
    id: tree.id,
    key: tree.key,
    name: tree.name,
    iconUrl: getRuneIconUrl(tree.icon),
    slots: tree.slots.map((slot: any, slotIndex: number) => (
      slot.runes.map((rune: any) => ({
        id: rune.id,
        key: rune.key,
        name: rune.name,
        iconUrl: getRuneIconUrl(rune.icon),
        detail: cleanText(rune.shortDesc || rune.longDesc),
        slotIndex,
      }))
    )),
  }));

  writeCache(MATCHUP_RUNE_TREE_CACHE_KEY, {
    version,
    runeTrees,
    timestamp: Date.now(),
  });

  return runeTrees;
};

export const fetchItemSuggestions = async (): Promise<MatchupKnowledgeSuggestion[]> => {
  const knowledge = await fetchMatchupKnowledge();
  return knowledge.items;
};

export const fetchChampionSpellSuggestions = async (champion: string): Promise<MatchupKnowledgeSuggestion[]> => {
  if (!champion) return [];

  const version = await fetchLatestDDragonVersion();
  const normalizedChampion = normalizeChampionName(champion);
  const cacheKey = `${MATCHUP_KNOWLEDGE_CACHE_KEY}_spells_${normalizedChampion}`;
  const cached = readCache<ChampionSpellCache>(cacheKey);
  if (cached && cached.version === version && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.spells;
  }

  const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${normalizedChampion}.json`);
  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const championData = data.data?.[normalizedChampion];
  const spellKeys = ['Q', 'W', 'E', 'R'];
  const spells: MatchupKnowledgeSuggestion[] = (championData?.spells || []).map((spell: any, index: number) => {
    const key = spellKeys[index] || '';

    return {
      id: `spell-${normalizedChampion}-${key}`,
      type: 'spell' as const,
      name: spell.name,
      label: `${key} - ${spell.name}`,
      detail: cleanText(spell.description),
      iconUrl: getSpellIconUrl(version, spell.image.full),
      insertText: `${key} - ${spell.name}`,
      keywords: [key, spell.name],
    };
  });

  writeCache(cacheKey, {
    version,
    champion: normalizedChampion,
    spells,
    timestamp: Date.now(),
  });

  return spells;
};
