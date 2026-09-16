import { createHmac, randomUUID } from 'crypto';
import { z } from 'zod';
import metadata from '../data/archive-metadata.json';
import catalog from '../data/game-catalog.json';
import type { Champion } from './dailyGames';

export const CLUE_LABELS = {
  role: 'Role',
  lanes: 'Typical lanes',
  gender: 'Gender',
  region: 'Lore region',
  skins: 'Skins',
  range: 'Range',
  resource: 'Resource',
  release: 'Release date',
} as const;
export type ClueType = keyof typeof CLUE_LABELS;
export const LEGACY_CLUES: ClueType[] = ['role', 'resource', 'range', 'skins'];
const details = z
  .record(
    z.object({
      lanes: z.array(z.string().min(1)).min(1),
      genders: z.array(z.string().min(1)).min(1),
      regions: z.array(z.string().min(1)).min(1),
      releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .parse(metadata.champions);
for (const champion of catalog.champions) {
  if (!details[champion.id]) throw new Error(`Missing Archive metadata: ${champion.id}`);
}

export function selectClueTypes(day: string, practice: boolean, secret: string): ClueType[] {
  const seed = practice ? randomUUID() : day;
  return (Object.keys(CLUE_LABELS) as ClueType[])
    .map((type) => ({
      type,
      rank: createHmac('sha256', secret).update(`archive-clues:v1:${seed}:${type}`).digest('hex'),
    }))
    .sort((a, b) => a.rank.localeCompare(b.rank))
    .slice(0, 5)
    .map(({ type }) => type);
}

// Existing cases retain the evidence already shown to their players.
export function roundClueTypes(round: { clueTypes?: string[] }): ClueType[] {
  if (!round.clueTypes?.length) return LEGACY_CLUES;
  if (
    round.clueTypes.length !== 5 ||
    new Set(round.clueTypes).size !== 5 ||
    round.clueTypes.some((type) => !Object.prototype.hasOwnProperty.call(CLUE_LABELS, type))
  )
    throw new Error('Invalid Archive clue selection');
  return round.clueTypes as ClueType[];
}

export function compareClue(type: ClueType, guess: Champion, answer: Champion) {
  const value = (c: Champion): string[] | number | string => {
    switch (type) {
      case 'role':
        return c.roles;
      case 'resource':
        return c.resource || 'None';
      case 'range':
        return c.range;
      case 'skins':
        return c.skinCount;
      case 'lanes':
        return details[c.id].lanes;
      case 'gender':
        return details[c.id].genders;
      case 'region':
        return details[c.id].regions;
      case 'release':
        return details[c.id].releaseDate;
    }
  };
  const a = value(guess),
    b = value(answer);
  const common = Array.isArray(a) && Array.isArray(b) ? a.filter((v) => b.includes(v)).length : 0;
  const equal =
    Array.isArray(a) && Array.isArray(b) ? common === a.length && common === b.length : a === b;
  return {
    label: CLUE_LABELS[type],
    value: Array.isArray(a) ? a.join(' / ') : String(a),
    match: equal ? 'correct' : common ? 'partial' : 'wrong',
    ...(type === 'skins' || type === 'release'
      ? {
          direction: a < b ? 'higher' : a > b ? 'lower' : null,
        }
      : {}),
  };
}
