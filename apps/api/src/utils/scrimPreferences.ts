export function choosePreferredScrimRegion(
  memberRegions: Array<string | null | undefined>,
  managerRegion: string | null | undefined,
  teamRegion: string | null | undefined,
): string | null {
  const normalizedTeamRegion = teamRegion?.trim().toUpperCase() || null;
  const normalizedManagerRegion = managerRegion?.trim().toUpperCase() || null;
  const regions = memberRegions
    .map((region) => region?.trim().toUpperCase() || null)
    .filter((region): region is string => Boolean(region));

  if (regions.length < 2) {
    return normalizedManagerRegion || regions[0] || normalizedTeamRegion;
  }

  const counts = new Map<string, number>();
  for (const region of regions) {
    counts.set(region, (counts.get(region) || 0) + 1);
  }

  return Array.from(counts.entries()).sort(([regionA, countA], [regionB, countB]) => {
    if (countA !== countB) return countB - countA;
    if (regionA === normalizedTeamRegion) return -1;
    if (regionB === normalizedTeamRegion) return 1;
    return regionA.localeCompare(regionB);
  })[0]?.[0] || normalizedManagerRegion || normalizedTeamRegion;
}
