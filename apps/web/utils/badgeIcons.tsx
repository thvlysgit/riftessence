import Image from 'next/image';

export type BadgeArtworkKey =
  | 'admin'
  | 'bug-hunter'
  | 'developer'
  | 'early-supporter'
  | 'moderator'
  | 'prestige-1'
  | 'prestige-2'
  | 'prestige-3'
  | 'prestige-4'
  | 'verified';

export const BADGE_ICON_OPTIONS = [
  { key: 'admin', label: 'Admin', category: 'Core' },
  { key: 'moderator', label: 'Moderator', category: 'Core' },
  { key: 'developer', label: 'Developer', category: 'Core' },
  { key: 'verified', label: 'Verified', category: 'Core' },
  { key: 'early-supporter', label: 'Early supporter', category: 'Recognition' },
  { key: 'bug-hunter', label: 'Bug hunter', category: 'Recognition' },
  { key: 'prestige-1', label: 'Prestige I', category: 'Prestige' },
  { key: 'prestige-2', label: 'Prestige II', category: 'Prestige' },
  { key: 'prestige-3', label: 'Prestige III', category: 'Prestige' },
  { key: 'prestige-4', label: 'Prestige IV', category: 'Prestige' },
] as const;

type BadgeVisual = {
  artwork: BadgeArtworkKey;
  color: string;
  src: string;
};

const BADGE_VISUALS: Record<BadgeArtworkKey, BadgeVisual> = {
  admin: { artwork: 'admin', color: '#ff4545', src: '/badges/admin.png' },
  moderator: { artwork: 'moderator', color: '#d7dce5', src: '/badges/moderator.png' },
  developer: { artwork: 'developer', color: '#c977ff', src: '/badges/developer.png' },
  verified: { artwork: 'verified', color: '#65eee7', src: '/badges/verified.png' },
  'early-supporter': { artwork: 'early-supporter', color: '#52d9ff', src: '/badges/early-supporter.png' },
  'bug-hunter': { artwork: 'bug-hunter', color: '#79ff3c', src: '/badges/bug-hunter.png' },
  'prestige-1': { artwork: 'prestige-1', color: '#ffd83d', src: '/badges/prestige-1.png' },
  'prestige-2': { artwork: 'prestige-2', color: '#ffd052', src: '/badges/prestige-2.png' },
  'prestige-3': { artwork: 'prestige-3', color: '#ffc22f', src: '/badges/prestige-3.png' },
  'prestige-4': { artwork: 'prestige-4', color: '#ffc433', src: '/badges/prestige-4.png' },
};

const normalize = (value: string | null | undefined) =>
  String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

const matches = (value: string, pattern: RegExp) => pattern.test(value);

export function resolveBadgeArtwork(badgeKey?: string | null, icon?: string | null): BadgeVisual {
  const key = normalize(badgeKey);
  const iconKey = normalize(icon);
  const value = `${key} ${iconKey}`;

  if (matches(value, /shop-fortune-coin|fortune-badge-i(?:\s|$)|fortune-sigil-i(?:\s|$)|\bnovice\b|prestige-1/)) {
    return BADGE_VISUALS['prestige-1'];
  }
  if (matches(value, /shop-oracle-dice|fortune-badge-ii(?:\s|$)|fortune-sigil-ii(?:\s|$)|\badvanced\b|prestige-2/)) {
    return BADGE_VISUALS['prestige-2'];
  }
  if (matches(value, /shop-jackpot-crown|fortune-badge-iii(?:\s|$)|fortune-sigil-iii(?:\s|$)|\bexpert\b|prestige-3/)) {
    return BADGE_VISUALS['prestige-3'];
  }
  if (matches(value, /shop-vault-ascendant|fortune-badge-iv(?:\s|$)|fortune-sigil-iv(?:\s|$)|\bascendant\b|prestige-4/)) {
    return BADGE_VISUALS['prestige-4'];
  }
  if (matches(value, /\badmin\b/)) return BADGE_VISUALS.admin;
  if (matches(value, /\b(developer|dev|code)\b/)) return BADGE_VISUALS.developer;
  if (matches(value, /\b(bug-hunter|bughunter|bug)\b/)) return BADGE_VISUALS['bug-hunter'];
  if (matches(value, /\b(early-supporter|early|bot|robot|ai)\b/)) return BADGE_VISUALS['early-supporter'];
  if (matches(value, /\b(staff|moderator|mod|support)\b/)) return BADGE_VISUALS.moderator;
  if (matches(value, /\b(verified|partner|official)\b/)) return BADGE_VISUALS.verified;
  if (matches(value, /\b(founder|owner|creator|goat|vip)\b/)) return BADGE_VISUALS['prestige-4'];
  if (matches(value, /\b(veteran|mvp)\b/)) return BADGE_VISUALS['prestige-3'];
  if (matches(value, /\b(prestige|fortune|gem)\b/)) return BADGE_VISUALS['prestige-1'];

  return BADGE_VISUALS.verified;
}

export function getBadgeIconDisplayLabel(icon: string | null | undefined): string {
  const normalized = normalize(icon);
  return BADGE_ICON_OPTIONS.find((option) => option.key === normalized)?.label || 'Badge';
}

type BadgeIconProps = {
  badgeKey?: string | null;
  icon?: string | null;
  className?: string;
  color?: string;
  title?: string;
};

export function BadgeIcon({ badgeKey, icon, className = 'w-9 h-9', title }: BadgeIconProps) {
  const visual = resolveBadgeArtwork(badgeKey, icon);

  return (
    <Image
      src={visual.src}
      width={36}
      height={36}
      alt={title || ''}
      title={title}
      className={className}
      draggable={false}
      unoptimized
    />
  );
}

export function getBadgeArtworkColor(badgeKey?: string | null, icon?: string | null) {
  return resolveBadgeArtwork(badgeKey, icon).color;
}
