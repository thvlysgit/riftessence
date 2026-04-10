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
    viewBox: '0 0 24 24',
    style: { filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.28))' },
  };

  const outline = 'rgba(15, 23, 42, 0.36)';
  const highlight = 'rgba(255, 255, 255, 0.62)';

  switch (icon) {
    case 'trophy':
      return (
        <svg {...svgProps}>
          <path d="M7 4h10v3.2a5 5 0 0 1-10 0V4Z" fill={color} />
          <path d="M5 5h2v2.7H6.2A1.8 1.8 0 0 1 5 5.9V5Zm14 0h-2v2.7h.8A1.8 1.8 0 0 0 19 5.9V5Z" fill={color} fillOpacity={0.82} />
          <rect x="10.2" y="13.6" width="3.6" height="3.7" rx="0.9" fill={color} fillOpacity={0.56} />
          <path d="M8.4 20.5h7.2" stroke={outline} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M8.4 6.1h7.2" stroke={highlight} strokeWidth="1.15" strokeLinecap="round" />
          <path d="M7 4h10v3.2a5 5 0 0 1-10 0V4Z" stroke={outline} strokeWidth="1" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...svgProps}>
          <path d="M12 2.8 5 5.9v5.4c0 4.7 3 8.1 7 9.9 4-1.8 7-5.2 7-9.9V5.9L12 2.8Z" fill={color} />
          <path d="M12 3.9v16.7" stroke={highlight} strokeWidth="1" opacity="0.35" />
          <path d="m9.2 12.1 1.9 1.9 3.8-3.8" stroke={highlight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 2.8 5 5.9v5.4c0 4.7 3 8.1 7 9.9 4-1.8 7-5.2 7-9.9V5.9L12 2.8Z" stroke={outline} strokeWidth="1" />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...svgProps}>
          <path d="M13.8 2.4 5.8 13.1h4.8L9.9 21.6l8.3-11.2h-4.7l.3-8Z" fill={color} />
          <path d="M13.2 4.8 9.1 10.7h2.6l-.4 5.2 4.2-6h-2.7l.4-5.1Z" fill={highlight} fillOpacity={0.55} />
          <path d="M13.8 2.4 5.8 13.1h4.8L9.9 21.6l8.3-11.2h-4.7l.3-8Z" stroke={outline} strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    case 'crown':
      return (
        <svg {...svgProps}>
          <path d="M3.5 18.5h17L18.8 7.8l-4.8 4.1L12 7.2l-2 4.7-4.8-4.1L3.5 18.5Z" fill={color} />
          <path d="M4 15.6h16" stroke={highlight} strokeWidth="1.1" strokeLinecap="round" />
          <circle cx="7.5" cy="7.2" r="1" fill={highlight} />
          <circle cx="12" cy="6.2" r="1.1" fill={highlight} />
          <circle cx="16.5" cy="7.2" r="1" fill={highlight} />
          <path d="M3.5 18.5h17L18.8 7.8l-4.8 4.1L12 7.2l-2 4.7-4.8-4.1L3.5 18.5Z" stroke={outline} strokeWidth="1" />
        </svg>
      );
    case 'star':
      return (
        <svg {...svgProps}>
          <path d="m12 2.8 2.9 5.8 6.4.9-4.6 4.5 1.1 6.4-5.8-3.1-5.8 3.1 1.1-6.4L2.7 9.5l6.4-.9L12 2.8Z" fill={color} />
          <path d="m12 6.9 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5L12 6.9Z" fill={highlight} fillOpacity={0.48} />
          <path d="m12 2.8 2.9 5.8 6.4.9-4.6 4.5 1.1 6.4-5.8-3.1-5.8 3.1 1.1-6.4L2.7 9.5l6.4-.9L12 2.8Z" stroke={outline} strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    case 'gem':
      return (
        <svg {...svgProps}>
          <path d="M3 10 8 4h8l5 6-9 10-9-10Z" fill={color} />
          <path d="M8 4 12 20 16 4M3 10h18M6.1 7h11.8" stroke={highlight} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.78" />
          <path d="M3 10 8 4h8l5 6-9 10-9-10Z" stroke={outline} strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...svgProps}>
          <path d="M12 2.8s4.3 3.2 4.3 7.4A4.3 4.3 0 0 1 12 14.5a4.3 4.3 0 0 1-4.3-4.3C7.7 6 9.2 4.7 12 2.8Z" fill={color} />
          <path d="M12 13.2c1.9 1 2.8 2.5 2.8 4a2.8 2.8 0 1 1-5.6 0c0-1.5 1-3 2.8-4Z" fill={highlight} fillOpacity={0.48} />
          <path d="M12 2.8s4.3 3.2 4.3 7.4A4.3 4.3 0 0 1 12 14.5a4.3 4.3 0 0 1-4.3-4.3C7.7 6 9.2 4.7 12 2.8Z" stroke={outline} strokeWidth="1" />
        </svg>
      );
    case 'target':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" fill={color} fillOpacity={0.24} stroke={outline} strokeWidth="1" />
          <circle cx="12" cy="12" r="6" fill={color} fillOpacity={0.5} />
          <circle cx="12" cy="12" r="3" fill={color} />
          <circle cx="12" cy="12" r="1.1" fill={highlight} />
          <path d="M12 3.8v2.2m0 12v2.2M3.8 12H6m12 0h2.2" stroke={highlight} strokeWidth="1" strokeLinecap="round" opacity="0.9" />
        </svg>
      );
    case 'medal':
      return (
        <svg {...svgProps}>
          <path d="m8 3 4 5 4-5" fill={color} fillOpacity={0.76} />
          <circle cx="12" cy="15" r="6" fill={color} />
          <path d="m12 11.9 1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4 1.3-2.7Z" fill={highlight} fillOpacity={0.62} />
          <circle cx="12" cy="15" r="6" stroke={outline} strokeWidth="1" />
        </svg>
      );
    case 'rocket':
      return (
        <svg {...svgProps}>
          <path d="M13.2 3.2c3.8.2 6.6 3.2 6.6 7-3.7.9-6.4 3.6-7.3 7.3-3.8 0-6.8-2.8-7-6.6 3.8-.9 6.8-3.8 7.7-7.7Z" fill={color} />
          <path d="M8 15.9 5.8 19.8l4-2.1" fill={color} fillOpacity={0.74} />
          <circle cx="14.1" cy="9.9" r="1.4" fill={highlight} />
          <path d="M13.2 3.2c3.8.2 6.6 3.2 6.6 7-3.7.9-6.4 3.6-7.3 7.3-3.8 0-6.8-2.8-7-6.6 3.8-.9 6.8-3.8 7.7-7.7Z" stroke={outline} strokeWidth="1" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...svgProps}>
          <path d="M4 4.8h16v10H8.4L4 18.8V4.8Z" fill={color} />
          <path d="M7.8 8.9h8.4M7.8 11.7h5.9" stroke={highlight} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M4 4.8h16v10H8.4L4 18.8V4.8Z" stroke={outline} strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    case 'handshake':
      return (
        <svg {...svgProps}>
          <path d="m3.5 10.2 3.4-2.7 3.4 2.4-2.4 2.2a1.9 1.9 0 0 0 2.6 2.8l2.2-2.1 2.9 2.3 4-3.2-3.2-4.2-3.6 2.2-3.4-2.2-5 2.5Z" fill={color} />
          <path d="M3.5 10.2 2 12l2.3 2.5 2.1-1.8M20.5 10.2 22 12l-2.3 2.5-2.1-1.8" fill={color} fillOpacity={0.74} />
          <path d="m8.8 14.2 1.4 1.2a1.9 1.9 0 0 0 2.5-.1l2.2-2.1" stroke={highlight} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m3.5 10.2 3.4-2.7 3.4 2.4-2.4 2.2a1.9 1.9 0 0 0 2.6 2.8l2.2-2.1 2.9 2.3 4-3.2-3.2-4.2-3.6 2.2-3.4-2.2-5 2.5Z" stroke={outline} strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    default:
      return <span className={className} style={{ color }}>{icon}</span>;
  }
}
