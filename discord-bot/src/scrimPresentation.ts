const SCRIM_RANK_COLORS: Record<string, number> = {
  IRON: 0x5c5b57,
  BRONZE: 0x9b6a43,
  SILVER: 0xa8b4c2,
  GOLD: 0xd4a437,
  PLATINUM: 0x3ea69a,
  EMERALD: 0x35b76e,
  DIAMOND: 0x6f8cff,
  MASTER: 0x9b5de5,
  GRANDMASTER: 0xe05a60,
  CHALLENGER: 0xf4c95d,
};

export function scrimEmbedColor(status: unknown, averageRank: unknown): number {
  if (!['AVAILABLE', 'CANDIDATES'].includes(String(status || ''))) {
    return 0x000000;
  }
  return (
    SCRIM_RANK_COLORS[String(averageRank || '').toUpperCase()] || 0x000000
  );
}

export function scrimAvailabilityLabel(status: unknown): string {
  return status === 'SETTLED' ? 'UNAVAILABLE' : String(status || 'AVAILABLE');
}
