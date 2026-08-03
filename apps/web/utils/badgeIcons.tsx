import React from 'react';

export type BadgeArtworkKey =
  | 'admin'
  | 'bot'
  | 'bug-hunter'
  | 'developer'
  | 'founder'
  | 'gem'
  | 'prestige'
  | 'staff'
  | 'verified'
  | 'veteran';

export const BADGE_ICON_OPTIONS = [
  { key: 'admin', label: 'Admin shield', category: 'Core' },
  { key: 'staff', label: 'Staff gavel', category: 'Core' },
  { key: 'developer', label: 'Developer', category: 'Core' },
  { key: 'verified', label: 'Verified', category: 'Core' },
  { key: 'founder', label: 'Founder crown', category: 'Recognition' },
  { key: 'veteran', label: 'Veteran laurel', category: 'Recognition' },
  { key: 'bug-hunter', label: 'Bug hunter', category: 'Recognition' },
  { key: 'bot', label: 'Bot', category: 'Utility' },
  { key: 'prestige', label: 'Prestige diamond', category: 'Recognition' },
  { key: 'gem', label: 'Gem', category: 'Recognition' },
] as const;

type BadgeVisual = {
  artwork: BadgeArtworkKey;
  color: string;
};

const BADGE_VISUALS: Record<BadgeArtworkKey, BadgeVisual> = {
  admin: { artwork: 'admin', color: '#ED4245' },
  staff: { artwork: 'staff', color: '#B5BAC1' },
  developer: { artwork: 'developer', color: '#A970FF' },
  verified: { artwork: 'verified', color: '#23A6A6' },
  founder: { artwork: 'founder', color: '#F0B232' },
  veteran: { artwork: 'veteran', color: '#D6A756' },
  'bug-hunter': { artwork: 'bug-hunter', color: '#57F287' },
  bot: { artwork: 'bot', color: '#4CC9F0' },
  prestige: { artwork: 'prestige', color: '#F8C44F' },
  gem: { artwork: 'gem', color: '#F0B232' },
};

const normalize = (value: string | null | undefined) =>
  String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function resolveBadgeArtwork(badgeKey?: string | null, icon?: string | null): BadgeVisual {
  const haystack = `${normalize(badgeKey)} ${normalize(icon)}`;

  if (/\badmin\b/.test(haystack)) return BADGE_VISUALS.admin;
  if (/\b(staff|moderator|mod|support)\b/.test(haystack)) return BADGE_VISUALS.staff;
  if (/\b(developer|dev|code)\b/.test(haystack)) return BADGE_VISUALS.developer;
  if (/\b(verified|partner|official)\b/.test(haystack)) return BADGE_VISUALS.verified;
  if (/\b(founder|owner|creator|goat)\b/.test(haystack)) return BADGE_VISUALS.founder;
  if (/\b(veteran|early-supporter|early|mvp)\b/.test(haystack)) return BADGE_VISUALS.veteran;
  if (/\b(bug-hunter|bughunter|bug)\b/.test(haystack)) return BADGE_VISUALS['bug-hunter'];
  if (/\b(bot|robot|ai)\b/.test(haystack)) return BADGE_VISUALS.bot;
  if (/\b(shop-|fortune|prestige|ascendant|expert|advanced|novice|vip)\b/.test(haystack)) {
    return BADGE_VISUALS.prestige;
  }

  return BADGE_VISUALS.gem;
}

export function getBadgeIconDisplayLabel(icon: string | null | undefined): string {
  const normalized = normalize(icon);
  return BADGE_ICON_OPTIONS.find((option) => option.key === normalized)?.label || 'Badge';
}

type MarkProps = { className?: string; title?: string };

const Svg = ({ children, className, title }: MarkProps & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {title ? <title>{title}</title> : null}
    {children}
  </svg>
);

const AdminMark = (props: MarkProps) => (
  <Svg {...props}>
    <path d="M12 2.8 19 5.6v5.3c0 4.5-2.8 8.3-7 10.3-4.2-2-7-5.8-7-10.3V5.6L12 2.8Z" fill="currentColor" fillOpacity=".16" />
    <path d="m8.7 12 2.1 2.1 4.6-4.7" />
  </Svg>
);

const StaffMark = (props: MarkProps) => (
  <Svg {...props}>
    <path d="m9.2 7.1 3.3 3.3M7.4 8.9l3.3 3.3M10.7 5.6l4 4-3 3-4-4 3-3Z" fill="currentColor" fillOpacity=".16" />
    <path d="m12.2 11.7 6.1 6.1M15.8 15.3l-2.4 2.4M5 19.6h8" />
  </Svg>
);

const DeveloperMark = (props: MarkProps) => (
  <Svg {...props}>
    <path d="m8.2 7-4.5 5 4.5 5M15.8 7l4.5 5-4.5 5M13.7 4.5l-3.4 15" />
  </Svg>
);

const VerifiedMark = (props: MarkProps) => (
  <Svg {...props}>
    <path d="m12 2.8 2.1 1.5 2.6-.1.7 2.5 2.2 1.4-.9 2.4.9 2.4-2.2 1.4-.7 2.5-2.6-.1L12 18.2l-2.1-1.5-2.6.1-.7-2.5-2.2-1.4.9-2.4-.9-2.4 2.2-1.4.7-2.5 2.6.1L12 2.8Z" fill="currentColor" fillOpacity=".18" />
    <path d="m8.4 10.7 2.3 2.3 4.9-5" />
  </Svg>
);

const FounderMark = (props: MarkProps) => (
  <Svg {...props}>
    <path d="m4 8 4.4 3.1L12 5l3.6 6.1L20 8l-1.4 9H5.4L4 8Z" fill="currentColor" fillOpacity=".18" />
    <path d="M6 20h12M8.6 14.2h6.8" />
  </Svg>
);

const VeteranMark = (props: MarkProps) => (
  <Svg {...props}>
    <path d="M7.4 18.7C4.8 16.9 3.5 14.5 3.5 11M16.6 18.7c2.6-1.8 3.9-4.2 3.9-7.7M5 15.8l-2.2.2M6.3 12.8 4 12.2M19 15.8l2.2.2M17.7 12.8l2.3-.6" />
    <path d="m12 5 2.2 3.8L12 13 9.8 8.8 12 5Z" fill="currentColor" fillOpacity=".22" />
    <path d="M8.8 20h6.4" />
  </Svg>
);

const BugHunterMark = (props: MarkProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" opacity=".35" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <path d="M9 10.5h6v4.2a3 3 0 0 1-6 0v-4.2ZM10 10.5V9a2 2 0 0 1 4 0v1.5M7.2 11.3 9 12M16.8 11.3 15 12M7.2 15.8 9 15M16.8 15.8 15 15" fill="currentColor" fillOpacity=".15" />
  </Svg>
);

const BotMark = (props: MarkProps) => (
  <Svg {...props}>
    <rect x="4" y="7" width="16" height="12" rx="4" fill="currentColor" fillOpacity=".16" />
    <path d="M12 7V4.5M10.5 3h3M8.5 13h.01M15.5 13h.01M8.5 16h7" />
  </Svg>
);

const GemMark = (props: MarkProps) => (
  <Svg {...props}>
    <path d="m4 9 3-4h10l3 4-8 10L4 9Z" fill="currentColor" fillOpacity=".2" />
    <path d="m4 9 8 10 8-10M7 5l2 4 3-4 3 4 2-4M9 9l3 10 3-10H4" />
  </Svg>
);

const PrestigeMark = (props: MarkProps) => (
  <Svg {...props}>
    <path d="m5 9 3-4h8l3 4-7 9-7-9Z" fill="currentColor" fillOpacity=".22" />
    <path d="m5 9 7 9 7-9M8 5l2 4 2-4 2 4 2-4M10 9l2 9 2-9" />
    <path d="M19.5 3.5v3M18 5h3" />
  </Svg>
);

const ARTWORK_COMPONENTS: Record<BadgeArtworkKey, React.ComponentType<MarkProps>> = {
  admin: AdminMark,
  staff: StaffMark,
  developer: DeveloperMark,
  verified: VerifiedMark,
  founder: FounderMark,
  veteran: VeteranMark,
  'bug-hunter': BugHunterMark,
  bot: BotMark,
  prestige: PrestigeMark,
  gem: GemMark,
};

type BadgeIconProps = {
  badgeKey?: string | null;
  icon?: string | null;
  className?: string;
  color?: string;
  title?: string;
};

export function BadgeIcon({ badgeKey, icon, className = 'w-5 h-5', title }: BadgeIconProps) {
  const visual = resolveBadgeArtwork(badgeKey, icon);
  const Icon = ARTWORK_COMPONENTS[visual.artwork];
  return <Icon className={className} title={title} />;
}

export function getBadgeArtworkColor(badgeKey?: string | null, icon?: string | null) {
  return resolveBadgeArtwork(badgeKey, icon).color;
}
