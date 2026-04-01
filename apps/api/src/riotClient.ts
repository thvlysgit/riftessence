// Riot client abstraction — uses platform routing and the X-Riot-Token header.
export interface RiotAccountRef {
  puuid: string;
  summonerName: string;
  region: string;
}

import { cacheGet, cacheSet } from './utils/cache';
import { createHash } from 'crypto';

const REGION_TO_PLATFORM: Record<string, string> = {
  NA: 'na1',
  EUW: 'euw1',
  EUNE: 'eun1',
  KR: 'kr',
  JP: 'jp1',
  OCE: 'oc1',
  LAN: 'la1',
  LAS: 'la2',
  BR: 'br1',
  RU: 'ru'
};

const REGION_TO_ROUTING: Record<string, string> = {
  NA: 'americas',
  EUW: 'europe',
  EUNE: 'europe',
  KR: 'asia',
  JP: 'asia',
  OCE: 'sea',
  LAN: 'americas',
  LAS: 'americas',
  BR: 'americas',
  RU: 'europe'
};

function platformHostForRegion(region: string) {
  const p = REGION_TO_PLATFORM[region as keyof typeof REGION_TO_PLATFORM];
  if (!p) throw new Error(`Unsupported region: ${region}`);
  return `${p}.api.riotgames.com`;
}

function routingHostForRegion(region: string) {
  const r = REGION_TO_ROUTING[region as keyof typeof REGION_TO_ROUTING];
  if (!r) throw new Error(`Unsupported region: ${region}`);
  return `${r}.api.riotgames.com`;
}

/**
 * Fetch PUUID from Riot Account API
 * @param gameName - Player game name (without tag)
 * @param tagLine - Player tag line
 * @param region - Player region
 * @returns PUUID string or null if not found
 */
export async function getPuuid(gameName: string, tagLine: string, region: string): Promise<string | null> {
  // Check cache first (24 hour TTL - PUUIDs don't change)
  const cacheKey = `riot:puuid:${gameName.toLowerCase()}:${tagLine.toLowerCase()}:${region}`;
  const cachedPuuid = await cacheGet<string>(cacheKey);
  if (cachedPuuid !== null) {
    return cachedPuuid;
  }

  // For quick local testing
  if (process.env.USE_FAKE_RIOT === '1') {
    const fakePuuid = createHash('sha256')
      .update(`${gameName.toLowerCase()}::${tagLine.toLowerCase()}::${region}`)
      .digest('hex')
      .slice(0, 32);
    await cacheSet(cacheKey, fakePuuid, 86400); // Cache for 24 hours
    return fakePuuid;
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error('Riot API key (RIOT_API_KEY) not set');

  const routingHost = routingHostForRegion(region);
  const accountUrl = `https://${routingHost}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  
  console.log(`[Riot API] Looking up: ${gameName}#${tagLine} on ${region} (${accountUrl})`);
  
  const accountResp = await fetch(accountUrl, { headers: { 'X-Riot-Token': apiKey } });
  if (!accountResp.ok) {
    console.log(`[Riot API] Response status: ${accountResp.status} ${accountResp.statusText}`);
    if (accountResp.status === 404) {
      console.log(`[Riot API] Account not found: ${gameName}#${tagLine}`);
      return null; // Account not found
    }
    if (accountResp.status === 403) {
      console.error('[Riot API] 403 Forbidden - API key may be expired or invalid');
    }
    const txt = await accountResp.text().catch(() => '');
    console.error(`[Riot API] Error response body: ${txt}`);
    const err = new Error(`Riot Account API error: ${accountResp.status} ${accountResp.statusText} ${txt}`);
    (err as any).status = accountResp.status;
    throw err;
  }

  const accountData = await accountResp.json();
  const puuid = accountData.puuid;

  if (puuid) {
    // Cache for 24 hours - PUUIDs are stable
    await cacheSet(cacheKey, puuid, 86400);
    return puuid;
  }

  return null;
}

/**
 * Fetch account info by PUUID from Riot Account API
 * @param puuid - The player's PUUID (from RSO)
 * @returns Account info including gameName, tagLine, and region
 */
export async function getAccountByPuuid(puuid: string): Promise<{ gameName: string; tagLine: string; region: string } | null> {
  // Check cache first (24 hour TTL)
  const cacheKey = `riot:account:${puuid}`;
  const cached = await cacheGet<{ gameName: string; tagLine: string; region: string }>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // For quick local testing
  if (process.env.USE_FAKE_RIOT === '1') {
    const fakeAccount = {
      gameName: `FakeSummoner_${puuid.slice(0, 4)}`,
      tagLine: 'FAKE',
      region: 'EUW',
    };
    await cacheSet(cacheKey, fakeAccount, 86400);
    return fakeAccount;
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error('Riot API key (RIOT_API_KEY) not set');

  // Try each routing region to find the account
  // PUUID is global, but we need to find which region has summoner data
  const routingRegions = ['europe', 'americas', 'asia', 'sea'];

  for (const routing of routingRegions) {
    try {
      const accountUrl = `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`;

      console.log(`[Riot API] Looking up PUUID in ${routing}: ${puuid.substring(0, 8)}...`);

      const accountResp = await fetch(accountUrl, { headers: { 'X-Riot-Token': apiKey } });

      if (accountResp.ok) {
        const accountData = await accountResp.json();

        // Determine region from routing
        const regionMap: Record<string, string> = {
          europe: 'EUW',
          americas: 'NA',
          asia: 'KR',
          sea: 'OCE',
        };

        const result = {
          gameName: accountData.gameName,
          tagLine: accountData.tagLine,
          region: regionMap[routing] || 'EUW',
        };

        // Cache for 24 hours
        await cacheSet(cacheKey, result, 86400);
        return result;
      }

      if (accountResp.status !== 404) {
        const txt = await accountResp.text().catch(() => '');
        console.log(`[Riot API] Error from ${routing}:`, accountResp.status, txt);
      }
    } catch (err) {
      console.log(`[Riot API] Failed to fetch from ${routing}:`, err);
    }
  }

  return null;
}

export async function getProfileIcon(account: RiotAccountRef, bypassCache: boolean = false): Promise<number | null> {
  // Check cache first (1 hour TTL) unless bypassing
  const cacheKey = `riot:profileIcon:${account.puuid}`;
  if (!bypassCache) {
    const cachedIcon = await cacheGet<number>(cacheKey);
    if (cachedIcon !== null) {
      return cachedIcon;
    }
  }

  // For quick local testing you can set USE_FAKE_RIOT=1 and FAKE_PROFILE_ICON_ID to return
  // a deterministic profile icon id without calling Riot.
  if (process.env.USE_FAKE_RIOT === '1') {
    const v = process.env.FAKE_PROFILE_ICON_ID ? Number(process.env.FAKE_PROFILE_ICON_ID) : 1234;
    await cacheSet(cacheKey, v, 3600); // Cache for 1 hour
    return v;
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error('Riot API key (RIOT_API_KEY) not set');

  // Use PUUID to get summoner info directly
  const platformHost = platformHostForRegion(account.region);
  const summonerUrl = `https://${platformHost}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(account.puuid)}`;

  const summonerResp = await fetch(summonerUrl, { headers: { 'X-Riot-Token': apiKey } });
  if (!summonerResp.ok) {
    const txt = await summonerResp.text().catch(() => '');
    const err = new Error(`Riot Summoner API error: ${summonerResp.status} ${summonerResp.statusText} ${txt}`);
    (err as any).status = summonerResp.status;
    throw err;
  }

  const summonerData = await summonerResp.json();
  // Riot summoner object contains `profileIconId`.
  const icon = summonerData?.profileIconId;
  if (typeof icon === 'number') {
    // Cache the icon for 1 hour
    await cacheSet(cacheKey, icon, 3600);
    return icon;
  }
  return null;
}

/**
 * Fetch recent match IDs for a given PUUID across the last N days
 * @param puuid - The player's PUUID
 * @param region - The region (for routing)
 * @param count - Number of matches to fetch (max 100 per request)
 * @returns Array of match IDs
 */
export async function getRecentMatchIds(puuid: string, region: string, count: number = 100): Promise<string[]> {
  if (process.env.USE_FAKE_RIOT === '1') {
    // Return fake match IDs for testing
    return Array.from({ length: Math.min(count, 20) }, (_, i) => `FAKE_MATCH_${i}`);
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error('Riot API key (RIOT_API_KEY) not set');

  const routingHost = routingHostForRegion(region);
  const matchListUrl = `https://${routingHost}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=${Math.min(count, 100)}`;

  const response = await fetch(matchListUrl, { headers: { 'X-Riot-Token': apiKey } });
  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    const err = new Error(`Riot Match List API error: ${response.status} ${response.statusText} ${txt}`);
    (err as any).status = response.status;
    throw err;
  }

  const matchIds: string[] = await response.json();
  return matchIds || [];
}

/**
 * Fetch match details by match ID
 * @param matchId - The match ID
 * @param region - The region (for routing)
 * @returns Match data including timestamps
 */
export async function getMatchDetails(matchId: string, region: string): Promise<any> {
  if (process.env.USE_FAKE_RIOT === '1') {
    // Return fake match data
    return {
      info: {
        gameCreation: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Random time in last 7 days
        gameDuration: 1800,
        queueId: 420, // Fake ranked solo/duo
      },
    };
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error('Riot API key (RIOT_API_KEY) not set');

  const routingHost = routingHostForRegion(region);
  const matchUrl = `https://${routingHost}/lol/match/v5/matches/${encodeURIComponent(matchId)}`;

  const response = await fetch(matchUrl, { headers: { 'X-Riot-Token': apiKey } });
  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    const err = new Error(`Riot Match API error: ${response.status} ${response.statusText} ${txt}`);
    (err as any).status = response.status;
    throw err;
  }

  return await response.json();
}

/**
 * Calculate games per day and games per week for a PUUID
 * Only counts ranked solo/duo games (queueId 420)
 * @param puuid - The player's PUUID
 * @param region - The region
 * @returns Object with gamesPerDay and gamesPerWeek
 */
export async function calculateGameActivity(puuid: string, region: string): Promise<{ gamesPerDay: number; gamesPerWeek: number }> {
  try {
    // Fetch last 100 matches (Riot API limit per request)
    const matchIds = await getRecentMatchIds(puuid, region, 100);
    
    console.log(`[GameActivity] Found ${matchIds.length} recent matches for PUUID ${puuid.substring(0, 8)}...`);
    
    if (matchIds.length === 0) {
      return { gamesPerDay: 0, gamesPerWeek: 0 };
    }

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneWeekMs = 7 * oneDayMs;

    let gamesInLastDay = 0;
    let gamesInLastWeek = 0;
    let checkedMatches = 0;
    let rankedMatches = 0;

    // Process matches to count games in last day and week
    for (const matchId of matchIds) {
      try {
        const matchData = await getMatchDetails(matchId, region);
        const gameCreation = matchData?.info?.gameCreation;
        const queueId = matchData?.info?.queueId;
        
        checkedMatches++;
        
        if (!gameCreation) {
          console.log(`[GameActivity] Match ${matchId} has no gameCreation timestamp, skipping`);
          continue;
        }
        
        const timeSinceGame = now - gameCreation;
        const daysAgo = timeSinceGame / oneDayMs;
        
        // Only count ranked solo/duo games (queueId 420)
        if (queueId !== 420) {
          console.log(`[GameActivity] Match ${matchId} queueId=${queueId}, not ranked solo/duo (420), skipping`);
          continue;
        }
        
        rankedMatches++;
        console.log(`[GameActivity] Match ${matchId} is ranked solo/duo, ${daysAgo.toFixed(2)} days ago`);
        
        if (timeSinceGame <= oneDayMs) {
          gamesInLastDay++;
        }
        
        if (timeSinceGame <= oneWeekMs) {
          gamesInLastWeek++;
        }
        
        // If we've gone beyond a week, no need to check more matches
        if (timeSinceGame > oneWeekMs) {
          console.log(`[GameActivity] Reached matches older than 7 days, stopping`);
          break;
        }
      } catch (err) {
        console.log(`[GameActivity] Failed to fetch match ${matchId}:`, err);
        // Skip matches that fail to fetch
        continue;
      }
    }

    console.log(`[GameActivity] Summary: checked ${checkedMatches} matches, ${rankedMatches} were ranked solo/duo, found ${gamesInLastDay} in last day, ${gamesInLastWeek} in last week`);

    return {
      gamesPerDay: gamesInLastDay,
      gamesPerWeek: gamesInLastWeek,
    };
  } catch (err) {
    console.log(`[GameActivity] Error calculating activity:`, err);
    // Return zeros if fetch fails
    return { gamesPerDay: 0, gamesPerWeek: 0 };
  }
}

/**
 * Map lane position from Riot API to our Role enum
 */
function mapLaneToRole(lane: string, role: string): string | null {
  // Riot API provides: TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY (support)
  // Also provides teamPosition which is more accurate
  const position = (lane || role || '').toUpperCase();
  
  if (position.includes('TOP')) return 'TOP';
  if (position.includes('JUNGLE')) return 'JUNGLE';
  if (position.includes('MID') || position.includes('MIDDLE')) return 'MID';
  if (position.includes('BOT') || position.includes('BOTTOM')) return 'ADC';
  if (position.includes('SUPPORT') || position.includes('UTILITY')) return 'SUPPORT';
  
  return null;
}

/**
 * Detect most played role from match history
 * Prioritizes ranked solo/duo, falls back to other modes if no ranked games
 * @param puuid - The player's PUUID
 * @param region - The region
 * @returns An object with the two most played roles or null
 */
export async function detectPreferredRole(puuid: string, region: string): Promise<{ primary: string | null; secondary: string | null } | null> {
  try {
    const matchIds = await getRecentMatchIds(puuid, region, 100);
    
    console.log(`[RoleDetection] Analyzing ${matchIds.length} matches for PUUID ${puuid.substring(0, 8)}...`);
    
    if (matchIds.length === 0) {
      return null;
    }

    const roleCounts: Record<string, number> = {
      TOP: 0,
      JUNGLE: 0,
      MID: 0,
      ADC: 0,
      SUPPORT: 0,
    };

    const rankedRoleCounts: Record<string, number> = {
      TOP: 0,
      JUNGLE: 0,
      MID: 0,
      ADC: 0,
      SUPPORT: 0,
    };

    let rankedGamesFound = 0;
    let totalGamesProcessed = 0;

    for (const matchId of matchIds) {
      try {
        const matchData = await getMatchDetails(matchId, region);
        const queueId = matchData?.info?.queueId;
        const participants = matchData?.info?.participants || [];
        
        // Find player's data in match
        const playerData = participants.find((p: any) => p.puuid === puuid);
        if (!playerData) continue;

        const teamPosition = playerData.teamPosition || playerData.individualPosition;
        const lane = playerData.lane;
        const detectedRole = mapLaneToRole(teamPosition || lane, playerData.role);
        
        if (!detectedRole) continue;

        totalGamesProcessed++;

        // Ranked solo/duo (420) or Ranked Flex (440)
        if (queueId === 420 || queueId === 440) {
          rankedRoleCounts[detectedRole]++;
          rankedGamesFound++;
          console.log(`[RoleDetection] Ranked game: ${detectedRole} (queueId: ${queueId})`);
        } else {
          // Normal games (400, 430) or other modes
          roleCounts[detectedRole]++;
          console.log(`[RoleDetection] Normal game: ${detectedRole} (queueId: ${queueId})`);
        }
        
      } catch (err) {
        console.log(`[RoleDetection] Failed to process match ${matchId}:`, err);
        continue;
      }
    }

    console.log(`[RoleDetection] Processed ${totalGamesProcessed} games (${rankedGamesFound} ranked)`);
    console.log(`[RoleDetection] Ranked role counts:`, rankedRoleCounts);
    console.log(`[RoleDetection] All role counts:`, roleCounts);

    // Prioritize ranked games if available
    const countsToUse = rankedGamesFound >= 3 ? rankedRoleCounts : roleCounts;
    
    if (totalGamesProcessed === 0) {
      return null;
    }

    // Find the most played role and second most played role
    const roleEntries = Object.entries(countsToUse)
      .filter(([_, count]) => count > 0)
      .sort(([_a, countA], [_b, countB]) => countB - countA);

    if (roleEntries.length === 0) {
      return null;
    }

    const primaryRole = roleEntries[0][0];
    const primaryCount = roleEntries[0][1];
    const secondaryRole = roleEntries.length > 1 ? roleEntries[1][0] : null;
    const secondaryCount = roleEntries.length > 1 ? roleEntries[1][1] : 0;

    console.log(`[RoleDetection] Most played role: ${primaryRole} (${primaryCount} games)`);
    if (secondaryRole) {
      console.log(`[RoleDetection] Second most played role: ${secondaryRole} (${secondaryCount} games)`);
    }
    
    return {
      primary: primaryRole,
      secondary: secondaryRole,
    };

  } catch (err) {
    console.log(`[RoleDetection] Error detecting role:`, err);
    return null;
  }
}

/**
 * Champion ID to name mapping for common champions
 * This is a subset - full mapping would need Data Dragon
 */
const CHAMPION_ID_TO_NAME: Record<number, string> = {
  1: 'Annie', 2: 'Olaf', 3: 'Galio', 4: 'Twisted Fate', 5: 'Xin Zhao',
  6: 'Urgot', 7: 'LeBlanc', 8: 'Vladimir', 9: 'Fiddlesticks', 10: 'Kayn',
  11: 'Master Yi', 12: 'Alistar', 13: 'Ryze', 14: 'Sion', 15: 'Sivir',
  16: 'Soraka', 17: 'Teemo', 18: 'Tristana', 19: 'Warwick', 20: 'Nunu & Willump',
  21: 'Miss Fortune', 22: 'Ashe', 23: 'Tryndamere', 24: 'Jax', 25: 'Morgana',
  26: 'Zilean', 27: 'Singed', 28: 'Evelynn', 29: 'Twitch', 30: 'Karthus',
  31: "Cho'Gath", 32: 'Amumu', 33: 'Rammus', 34: 'Anivia', 35: 'Shaco',
  36: 'Dr. Mundo', 37: 'Sona', 38: 'Kassadin', 39: 'Irelia', 40: 'Janna',
  41: 'Gangplank', 42: 'Corki', 43: 'Karma', 44: 'Taric', 45: 'Veigar',
  48: 'Trundle', 50: 'Swain', 51: 'Caitlyn', 53: 'Blitzcrank', 54: 'Malphite',
  55: 'Katarina', 56: 'Nocturne', 57: 'Maokai', 58: 'Renekton', 59: 'Jarvan IV',
  60: 'Elise', 61: 'Orianna', 62: 'Wukong', 63: 'Brand', 64: 'Lee Sin',
  67: 'Vayne', 68: 'Rumble', 69: 'Cassiopeia', 72: 'Skarner', 74: 'Heimerdinger',
  75: 'Nasus', 76: 'Nidalee', 77: 'Udyr', 78: 'Poppy', 79: 'Gragas',
  80: 'Pantheon', 81: 'Ezreal', 82: 'Mordekaiser', 83: 'Yorick', 84: 'Akali',
  85: 'Kennen', 86: 'Garen', 89: 'Leona', 90: 'Malzahar', 91: 'Talon',
  92: 'Riven', 96: "Kog'Maw", 98: 'Shen', 99: 'Lux', 101: 'Xerath',
  102: 'Shyvana', 103: 'Ahri', 104: 'Graves', 105: 'Fizz', 106: 'Volibear',
  107: 'Rengar', 110: 'Varus', 111: 'Nautilus', 112: 'Viktor', 113: 'Sejuani',
  114: 'Fiora', 115: 'Ziggs', 117: 'Lulu', 119: 'Draven', 120: 'Hecarim',
  121: "Kha'Zix", 122: 'Darius', 126: 'Jayce', 127: 'Lissandra', 131: 'Diana',
  133: 'Quinn', 134: 'Syndra', 136: 'Aurelion Sol', 141: 'Kayn', 142: 'Zoe',
  143: 'Zyra', 145: "Kai'Sa", 147: 'Seraphine', 150: 'Gnar', 154: 'Zac',
  157: 'Yasuo', 161: "Vel'Koz", 163: 'Taliyah', 164: 'Camille', 166: "Akshan",
  200: "Bel'Veth", 201: 'Braum', 202: 'Jhin', 203: 'Kindred', 221: 'Zeri',
  222: 'Jinx', 223: 'Tahm Kench', 234: 'Viego', 235: 'Senna', 236: 'Lucian',
  238: 'Zed', 240: 'Kled', 245: 'Ekko', 246: 'Qiyana', 254: 'Vi',
  266: 'Aatrox', 267: 'Nami', 268: 'Azir', 350: 'Yuumi', 360: 'Samira',
  412: 'Thresh', 420: 'Illaoi', 421: "Rek'Sai", 427: 'Ivern', 429: 'Kalista',
  432: 'Bard', 497: 'Rakan', 498: 'Xayah', 516: 'Ornn', 517: 'Sylas',
  518: 'Neeko', 523: 'Aphelios', 526: 'Rell', 555: 'Pyke', 711: 'Vex',
  777: 'Yone', 875: 'Sett', 876: 'Lillia', 887: 'Gwen', 888: 'Renata Glasc',
  895: 'Nilah', 897: "K'Sante", 901: 'Smolder', 902: 'Milio', 910: 'Hwei',
  950: 'Naafiri', 233: 'Briar'
};

/**
 * Fetch top champion masteries for a player
 * @param puuid - The player's PUUID
 * @param region - Player region
 * @param count - Number of top champions to return (default 10)
 * @returns Array of champion mastery data with names
 */
export async function getTopChampionMasteries(
  puuid: string, 
  region: string, 
  count: number = 10
): Promise<Array<{ championId: number; championName: string; masteryLevel: number; masteryPoints: number }>> {
  // Check cache first (6 hour TTL - mastery changes slowly)
  const cacheKey = `riot:mastery:${puuid}:${region}:${count}`;
  const cached = await cacheGet<Array<{ championId: number; championName: string; masteryLevel: number; masteryPoints: number }>>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // For quick local testing
  if (process.env.USE_FAKE_RIOT === '1') {
    const fakeChampions = ['Jinx', 'Lux', 'Yasuo', 'Ezreal', 'Lee Sin', 'Thresh', 'Ahri', 'Vayne', 'Zed', 'Darius'];
    const fakeMasteries = fakeChampions.slice(0, count).map((name, i) => ({
      championId: Object.entries(CHAMPION_ID_TO_NAME).find(([_, n]) => n === name)?.[0] ? parseInt(Object.entries(CHAMPION_ID_TO_NAME).find(([_, n]) => n === name)![0]) : i + 1,
      championName: name,
      masteryLevel: 7 - Math.floor(i / 2),
      masteryPoints: 500000 - (i * 50000),
    }));
    await cacheSet(cacheKey, fakeMasteries, 21600); // Cache for 6 hours
    return fakeMasteries;
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error('Riot API key (RIOT_API_KEY) not set');

  const platformHost = platformHostForRegion(region);
  const masteryUrl = `https://${platformHost}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}/top?count=${count}`;

  console.log(`[Riot API] Fetching top ${count} champion masteries for ${puuid.substring(0, 8)}...`);

  try {
    const response = await fetch(masteryUrl, { headers: { 'X-Riot-Token': apiKey } });
    
    if (!response.ok) {
      console.log(`[Riot API] Mastery API error: ${response.status}`);
      return [];
    }

    const masteryData = await response.json();
    
    // Map champion IDs to names
    const result = masteryData.map((m: any) => ({
      championId: m.championId,
      championName: CHAMPION_ID_TO_NAME[m.championId] || `Champion ${m.championId}`,
      masteryLevel: m.championLevel,
      masteryPoints: m.championPoints,
    }));

    // Cache for 6 hours
    await cacheSet(cacheKey, result, 21600);
    
    return result;
  } catch (err) {
    console.log(`[Riot API] Error fetching masteries:`, err);
    return [];
  }
}
