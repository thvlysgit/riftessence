// Riot client abstraction — uses platform routing and the X-Riot-Token header.
export interface RiotAccountRef {
  puuid: string;
  summonerName: string;
  region: string;
}

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

export async function getProfileIcon(account: RiotAccountRef): Promise<number | null> {
  // For quick local testing you can set USE_FAKE_RIOT=1 and FAKE_PROFILE_ICON_ID to return
  // a deterministic profile icon id without calling Riot.
  if (process.env.USE_FAKE_RIOT === '1') {
    const v = process.env.FAKE_PROFILE_ICON_ID ? Number(process.env.FAKE_PROFILE_ICON_ID) : 1234;
    return v;
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error('Riot API key (RIOT_API_KEY) not set');

  // Parse summoner name into gameName and tagLine (format: "name#tag")
  let gameName: string;
  let tagLine: string;
  
  if (account.summonerName.includes('#')) {
    const parts = account.summonerName.split('#');
    gameName = parts[0];
    tagLine = parts[1];
  } else {
    // If no tag provided, assume it's just the game name and use a default tag
    gameName = account.summonerName;
    tagLine = account.region; // Use region as fallback tag
  }

  // Step 1: Get PUUID from Riot Account API (new mandatory flow)
  const routingHost = routingHostForRegion(account.region);
  const accountUrl = `https://${routingHost}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  
  const accountResp = await fetch(accountUrl, { headers: { 'X-Riot-Token': apiKey } });
  if (!accountResp.ok) {
    const txt = await accountResp.text().catch(() => '');
    const err = new Error(`Riot Account API error: ${accountResp.status} ${accountResp.statusText} ${txt}`);
    (err as any).status = accountResp.status;
    throw err;
  }

  const accountData = await accountResp.json();
  const puuid = accountData.puuid;

  // Step 2: Get summoner info using PUUID
  const platformHost = platformHostForRegion(account.region);
  const summonerUrl = `https://${platformHost}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;

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
  if (typeof icon === 'number') return icon;
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
 * @returns The most played role or null
 */
export async function detectPreferredRole(puuid: string, region: string): Promise<string | null> {
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

    // Find the most played role
    let maxRole: string | null = null;
    let maxCount = 0;
    const tiedRoles: string[] = [];

    for (const [role, count] of Object.entries(countsToUse)) {
      if (count > maxCount) {
        maxCount = count;
        maxRole = role;
        tiedRoles.length = 0;
        tiedRoles.push(role);
      } else if (count === maxCount && count > 0) {
        tiedRoles.push(role);
      }
    }

    // If tied, pick random from tied roles
    if (tiedRoles.length > 1) {
      maxRole = tiedRoles[Math.floor(Math.random() * tiedRoles.length)];
      console.log(`[RoleDetection] Tie detected between ${tiedRoles.join(', ')}, randomly picked ${maxRole}`);
    }

    console.log(`[RoleDetection] Most played role: ${maxRole} (${maxCount} games)`);
    return maxRole;

  } catch (err) {
    console.log(`[RoleDetection] Error detecting role:`, err);
    return null;
  }
}
