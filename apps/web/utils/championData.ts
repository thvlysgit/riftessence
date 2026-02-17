/**
 * Champion Data Utility
 * Fetches and caches League of Legends champion data from Riot Data Dragon API
 */

const DDRAGON_VERSION = '14.23.1';
const DDRAGON_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;
const CACHE_KEY = 'lfd_champions_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface ChampionCache {
  champions: string[];
  timestamp: number;
}

/**
 * Champion name normalization map for Data Dragon compatibility
 * Maps display names to Data Dragon asset names
 */
const championNameMap: Record<string, string> = {
  'Wukong': 'MonkeyKing',
  'Renata Glasc': 'Renata',
  'Nunu & Willump': 'Nunu',
  "Kai'Sa": 'Kaisa',
  "Kha'Zix": 'Khazix',
  "Vel'Koz": 'Velkoz',
  "Cho'Gath": 'Chogath',
  "Rek'Sai": 'RekSai',
  'LeBlanc': 'Leblanc',
};

/**
 * Normalize champion name for Data Dragon API
 * @param name Champion display name
 * @returns Normalized name for API/asset requests
 */
export const normalizeChampionName = (name: string): string => {
  return championNameMap[name] || name;
};

/**
 * Get champion icon URL
 * @param name Champion name
 * @param version Data Dragon version (defaults to 14.23.1)
 * @returns Full URL to champion icon
 */
export const getChampionIconUrl = (name: string, version: string = DDRAGON_VERSION): string => {
  const normalizedName = normalizeChampionName(name);
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${normalizedName}.png`;
};

/**
 * Get cached champions from localStorage
 * @returns Cached champions array or null if cache is invalid/expired
 */
export function getCachedChampions(): string[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: ChampionCache = JSON.parse(cached);
    const isExpired = Date.now() - data.timestamp > CACHE_DURATION;
    
    if (isExpired) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data.champions;
  } catch (e) {
    console.error('Failed to read champions cache:', e);
    return null;
  }
}

/**
 * Store champions in localStorage cache
 * @param champions Array of champion names
 */
export function setCachedChampions(champions: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cache: ChampionCache = {
      champions,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to cache champions:', e);
  }
}

/**
 * Fetch champions from Riot Data Dragon API
 * Uses cache when available, fetches from API if cache is missing/expired
 * @returns Promise resolving to array of champion names (sorted alphabetically)
 */
export async function fetchChampions(): Promise<string[]> {
  // Check cache first
  const cached = getCachedChampions();
  if (cached) {
    return cached;
  }
  
  // Fetch from API
  try {
    const response = await fetch(`${DDRAGON_BASE_URL}/data/en_US/champion.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch champions: ${response.status}`);
    }
    
    const data = await response.json();
    const champions = Object.keys(data.data).sort();
    
    // Cache the result
    setCachedChampions(champions);
    
    return champions;
  } catch (error) {
    console.error('Error fetching champions:', error);
    throw error;
  }
}
