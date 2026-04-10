import React from 'react';

export const BADGE_ICON_OPTIONS = [
  { key: 'trophy', label: 'Trophy' },
  { key: 'shield', label: 'Shield' },
  { key: 'bolt', label: 'Bolt' },
  { key: 'crown', label: 'Crown' },
  { key: 'star', label: 'Star' },
  { key: 'gem', label: 'Gem' },
  { key: 'flame', label: 'Flame' },
  { key: 'target', label: 'Target' },
  { key: 'medal', label: 'Medal' },
  { key: 'rocket', label: 'Rocket' },
  { key: 'chat', label: 'Chat' },
  { key: 'handshake', label: 'Handshake' },
] as const;

export type BadgeIconKey = (typeof BADGE_ICON_OPTIONS)[number]['key'];

const BADGE_ICON_SET = new Set<string>(BADGE_ICON_OPTIONS.map((option) => option.key));

export function isKnownBadgeIcon(icon: string | null | undefined): icon is BadgeIconKey {
  return Boolean(icon && BADGE_ICON_SET.has(icon));
}

export function getBadgeIconDisplayLabel(icon: string | null | undefined): string {
  if (!icon) return 'Trophy';
  const match = BADGE_ICON_OPTIONS.find((option) => option.key === icon);
  return match ? match.label : icon;
}

type BadgeIconProps = {
  icon: string | null | undefined;
  className?: string;
  color?: string;
};

export function BadgeIcon({ icon, className = 'w-5 h-5', color = 'currentColor' }: BadgeIconProps) {
  if (!icon) {
    return <span className={className} style={{ color }}>🏆</span>;
  }

  if (!isKnownBadgeIcon(icon)) {
    return <span className={className} style={{ color }}>{icon}</span>;
  }

  const svgProps = {
    className,
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
  };

  switch (icon) {
    case 'trophy':
      return (
        <svg {...svgProps}>
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M17 6h2a2 2 0 0 1 0 4h-2" />
          <path d="M7 6H5a2 2 0 0 0 0 4h2" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...svgProps}>
          <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3Z" />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...svgProps}>
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
      );
    case 'crown':
      return (
        <svg {...svgProps}>
          <path d="M3 19h18" />
          <path d="m4 19 2-11 6 5 6-5 2 11" />
        </svg>
      );
    case 'star':
      return (
        <svg {...svgProps}>
          <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3Z" />
        </svg>
      );
    case 'gem':
      return (
        <svg {...svgProps}>
          <path d="M3 10 8 4h8l5 6-9 10-9-10Z" />
          <path d="M8 4 12 20 16 4" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...svgProps}>
          <path d="M12 3s4 3 4 7a4 4 0 0 1-8 0c0-2 1-4 4-7Z" />
          <path d="M12 13c2 1 3 2.5 3 4a3 3 0 1 1-6 0c0-1.5 1-3 3-4Z" />
        </svg>
      );
    case 'target':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      );
    case 'medal':
      return (
        <svg {...svgProps}>
          <path d="m8 3 4 5 4-5" />
          <circle cx="12" cy="15" r="6" />
          <path d="m12 12 1.5 3h3l-2.5 1.8.9 3-2.9-1.8-2.9 1.8.9-3L7.5 15h3L12 12Z" />
        </svg>
      );
    case 'rocket':
      return (
        <svg {...svgProps}>
          <path d="M12 3c4 0 7 3 7 7-4 1-7 4-8 8-4 0-7-3-7-7 4-1 7-4 8-8Z" />
          <circle cx="14" cy="10" r="1.5" />
          <path d="m7 17-2 4 4-2" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...svgProps}>
          <path d="M4 5h16v10H8l-4 4V5Z" />
          <path d="M8 9h8" />
          <path d="M8 12h5" />
        </svg>
      );
    case 'handshake':
      return (
        <svg {...svgProps}>
          <path d="m7 12 3 3a2 2 0 0 0 2.8 0L17 11" />
          <path d="m3 10 4-4 4 3" />
          <path d="m21 10-4-4-4 3" />
          <path d="M9 14 7 16" />
          <path d="M12 16 10 18" />
          <path d="M15 14 13 16" />
        </svg>
      );
    default:
      return <span className={className} style={{ color }}>{icon}</span>;
  }
}
