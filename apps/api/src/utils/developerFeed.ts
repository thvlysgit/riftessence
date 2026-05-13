const RANK_ORDER = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
  'UNRANKED',
] as const;

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0);
}

function safeDisplayText(value: unknown, fallback = '', maxLength = 120): string {
  const normalized = String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return (normalized || fallback).slice(0, maxLength);
}

function isRealRiotAccount(account: any): boolean {
  const puuid = String(account?.puuid || '');
  if (!puuid) return false;
  const linked = Boolean(account?.rsoLinked || account?.verified);
  return linked && !puuid.startsWith('discord_');
}

const REAL_LINKED_RIOT_ACCOUNT_WHERE = {
  puuid: { not: { startsWith: 'discord_' } },
  OR: [{ rsoLinked: true }, { verified: true }],
};

export function getDuoVerificationAuthorWhere(verified: boolean) {
  if (verified) {
    return {
      discordAccount: { isNot: null },
      riotAccounts: { some: REAL_LINKED_RIOT_ACCOUNT_WHERE },
    };
  }

  return {
    OR: [
      { discordAccount: { is: null } },
      { riotAccounts: { none: REAL_LINKED_RIOT_ACCOUNT_WHERE } },
    ],
  };
}

function getVerificationState(author: any): { isVerified: boolean; missing: string[] } {
  const hasDiscord = Boolean(author?.discordAccount);
  const riotAccounts = Array.isArray(author?.riotAccounts) ? author.riotAccounts : [];
  const hasRiot = riotAccounts.some((account: any) => isRealRiotAccount(account));
  const missing: string[] = [];
  if (!hasRiot) missing.push('riot');
  if (!hasDiscord) missing.push('discord');
  return { isVerified: hasRiot && hasDiscord, missing };
}

function getMissingDuoFields(post: any): string[] {
  const missing: string[] = [];
  const region = String(post?.region || '').toUpperCase();
  if (!region || region === 'UNKNOWN') missing.push('region');
  const languages = Array.isArray(post?.languages) ? post.languages : [];
  if (languages.length === 0) missing.push('languages');
  return missing;
}

export function normalizeChampionPool(author: any): string[] {
  const lowerSeen = new Set<string>();
  const pool: string[] = [];

  const pushUnique = (entries: unknown) => {
    for (const champion of normalizeStringArray(entries)) {
      const key = champion.toLowerCase();
      if (lowerSeen.has(key)) continue;
      lowerSeen.add(key);
      pool.push(champion);
    }
  };

  const mode = String(author?.championPoolMode || '').toUpperCase();
  if (mode === 'TIERLIST' && author?.championTierlist && typeof author.championTierlist === 'object') {
    const tierlist = author.championTierlist as Record<string, unknown>;
    pushUnique(tierlist.S);
    pushUnique(tierlist.A);
    pushUnique(tierlist.B);
    pushUnique(tierlist.C);
  }

  pushUnique(author?.championList);
  return pool;
}

export function normalizeChampionTierlist(author: any): { S: string[]; A: string[]; B: string[]; C: string[] } | null {
  const tiers: { S: string[]; A: string[]; B: string[]; C: string[] } = { S: [], A: [], B: [], C: [] };
  const lowerSeen = new Set<string>();

  const pushUniqueToTier = (tier: 'S' | 'A' | 'B' | 'C', entries: unknown) => {
    for (const champion of normalizeStringArray(entries)) {
      const key = champion.toLowerCase();
      if (lowerSeen.has(key)) continue;
      lowerSeen.add(key);
      tiers[tier].push(champion);
    }
  };

  if (author?.championTierlist && typeof author.championTierlist === 'object') {
    const tierlist = author.championTierlist as Record<string, unknown>;
    pushUniqueToTier('S', tierlist.S);
    pushUniqueToTier('A', tierlist.A);
    pushUniqueToTier('B', tierlist.B);
    pushUniqueToTier('C', tierlist.C);
  }

  if (tiers.S.length + tiers.A.length + tiers.B.length + tiers.C.length === 0) {
    pushUniqueToTier('A', author?.championList);
  }

  return tiers.S.length + tiers.A.length + tiers.B.length + tiers.C.length > 0 ? tiers : null;
}

export function formatDuoPost(post: any, viewerIsAdmin: boolean = false) {
  const author: any = post.author;
  const authorAccounts = Array.isArray(author.riotAccounts) ? author.riotAccounts : [];
  const postingAccount = authorAccounts.find((acc: any) => acc.id === post.postingRiotAccountId)
    || (post.postingRiotAccount?.id === post.postingRiotAccountId ? post.postingRiotAccount : null);
  const mainAccount = authorAccounts.find((acc: any) => acc.isMain) || authorAccounts[0];
  const isSameAccount = postingAccount && mainAccount && postingAccount.id === mainAccount.id;
  const verification = getVerificationState(author);
  const missingFields = getMissingDuoFields(post);

  const ratings: any[] = author.ratingsReceived || [];
  const skillRatings = ratings.filter((r: any) => r.stars !== null && r.stars !== undefined);
  const personalityRatings = ratings.filter((r: any) => r.moons !== null && r.moons !== undefined);

  const avgSkill = skillRatings.length > 0
    ? skillRatings.reduce((sum: number, r: any) => sum + r.stars, 0) / skillRatings.length
    : 0;
  const avgPersonality = personalityRatings.length > 0
    ? personalityRatings.reduce((sum: number, r: any) => sum + r.moons, 0) / personalityRatings.length
    : 0;

  const username = author.anonymous ? 'Anonymous' : safeDisplayText(author.username, 'Unknown', 50);
  const discordUsername = author.anonymous ? null : safeDisplayText(author.discordAccount?.username, '', 50) || null;
  const postingGameName = postingAccount
    ? safeDisplayText(postingAccount.gameName || postingAccount.summonerName?.split('#')[0], 'Unknown', 50)
    : 'Unknown';
  const postingTagLine = postingAccount
    ? safeDisplayText(postingAccount.tagLine || postingAccount.summonerName?.split('#')[1], '0000', 20)
    : '0000';
  const mainGameName = mainAccount
    ? safeDisplayText(mainAccount.gameName || mainAccount.summonerName?.split('#')[0], 'Unknown', 50)
    : 'Unknown';
  const mainTagLine = mainAccount
    ? safeDisplayText(mainAccount.tagLine || mainAccount.summonerName?.split('#')[1], '0000', 20)
    : '0000';

  return {
    id: post.id,
    createdAt: post.createdAt,
    message: post.message,
    role: post.role,
    secondRole: post.secondRole,
    region: post.region,
    languages: post.languages,
    vcPreference: post.vcPreference,
    duoType: post.duoType,
    authorId: author.id,
    username,
    isAnonymous: author.anonymous,
    isAdmin: viewerIsAdmin,
    reportCount: author.reportCount || 0,
    preferredRole: author.anonymous ? null : author.preferredRole,
    secondaryRole: author.anonymous ? null : author.secondaryRole,
    discordUsername,
    postingRiotAccount: postingAccount ? {
      gameName: author.anonymous
        ? 'Hidden'
        : postingGameName,
      tagLine: author.anonymous
        ? 'XXX'
        : postingTagLine,
      region: postingAccount.region,
      rank: postingAccount.rank,
      division: postingAccount.division,
      lp: postingAccount.lp,
      winrate: postingAccount.winrate,
    } : null,
    bestRank: mainAccount && !isSameAccount ? {
      gameName: author.anonymous
        ? 'Hidden'
        : mainGameName,
      tagLine: author.anonymous
        ? 'XXX'
        : mainTagLine,
      rank: mainAccount.rank,
      division: mainAccount.division,
      lp: mainAccount.lp,
      winrate: mainAccount.winrate,
    } : null,
    ratings: {
      skill: avgSkill,
      personality: avgPersonality,
      skillCount: skillRatings.length,
      personalityCount: personalityRatings.length,
    },
    community: post.community ? {
      id: post.community.id,
      name: safeDisplayText(post.community.name, 'Community', 80),
      isPartner: post.community.isPartner,
      inviteLink: post.community.inviteLink,
    } : null,
    source: post.source || 'app',
    isMainAccount: isSameAccount,
    championPoolMode: author.anonymous ? null : (author.championPoolMode || null),
    championList: author.anonymous ? [] : (author.championList || []),
    championTierlist: author.anonymous ? null : (author.championTierlist || null),
    activeUsernameDecoration: author.anonymous ? null : (author.activeUsernameDecoration || null),
    activeHoverEffect: author.anonymous ? null : (author.activeHoverEffect || null),
    activeNameplateFont: author.anonymous ? null : (author.activeNameplateFont || null),
    verification,
    missingFields,
  };
}

export function formatLftPost(post: any, viewerIsAdmin: boolean = false) {
  const championPool = normalizeChampionPool(post.author);
  const championTierlist = normalizeChampionTierlist(post.author);

  return {
    id: post.id,
    type: post.type,
    createdAt: post.createdAt,
    region: post.region,
    authorId: post.author.id,
    username: post.author.username,
    discordUsername: post.author?.discordAccount?.username || null,
    isAdmin: viewerIsAdmin,
    preferredRole: post.author.preferredRole,
    secondaryRole: post.author.secondaryRole,
    activeUsernameDecoration: post.author.activeUsernameDecoration || null,
    activeHoverEffect: post.author.activeHoverEffect || null,
    activeNameplateFont: post.author.activeNameplateFont || null,
    teamId: post.teamId || null,
    candidateType: post.candidateType || 'PLAYER',
    representedName: post.representedName || null,
    ...(post.type === 'TEAM' && {
      teamName: post.teamName,
      rolesNeeded: post.rolesNeeded,
      staffNeeded: post.staffNeeded || [],
      averageRank: post.averageRank,
      averageDivision: post.averageDivision,
      scrims: post.scrims,
      minAvailability: post.minAvailability,
      coachingAvailability: post.coachingAvailability,
      details: post.details,
    }),
    ...(post.type === 'PLAYER' && {
      mainRole: post.mainRole,
      rank: post.rank,
      division: post.division,
      championPool,
      championTierlist,
      experience: post.experience,
      languages: post.languages,
      skills: post.skills,
      age: post.age,
      availability: post.availability,
      details: post.details,
    }),
  };
}

export function getAllowedRanks(minRank?: string, maxRank?: string, exactRank?: string): string[] | null {
  const exact = String(exactRank || '').trim().toUpperCase();
  if (exact && RANK_ORDER.includes(exact as typeof RANK_ORDER[number])) {
    return [exact];
  }

  const min = String(minRank || '').trim().toUpperCase();
  const max = String(maxRank || '').trim().toUpperCase();
  const minIndex = min && RANK_ORDER.includes(min as typeof RANK_ORDER[number]) ? RANK_ORDER.indexOf(min as typeof RANK_ORDER[number]) : 0;
  const maxIndex = max && RANK_ORDER.includes(max as typeof RANK_ORDER[number]) ? RANK_ORDER.indexOf(max as typeof RANK_ORDER[number]) : RANK_ORDER.length - 1;

  if (minIndex > maxIndex) {
    return null;
  }

  return RANK_ORDER.slice(minIndex, maxIndex + 1) as unknown as string[];
}

export function parseBooleanQuery(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export function parseQueryArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter((entry) => entry.length > 0);
  }

  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw.split(',').map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}
