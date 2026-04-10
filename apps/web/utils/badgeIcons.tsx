import React from 'react';
import { IconType } from 'react-icons';
import {
  FaBolt,
  FaBullseye,
  FaCommentDots,
  FaCrown,
  FaFireAlt,
  FaGem,
  FaHandshake,
  FaMedal,
  FaRocket,
  FaShieldAlt,
  FaStar,
  FaTrophy,
} from 'react-icons/fa';

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

const BADGE_ICON_COMPONENTS: Record<BadgeIconKey, IconType> = {
  trophy: FaTrophy,
  shield: FaShieldAlt,
  bolt: FaBolt,
  crown: FaCrown,
  star: FaStar,
  gem: FaGem,
  flame: FaFireAlt,
  target: FaBullseye,
  medal: FaMedal,
  rocket: FaRocket,
  chat: FaCommentDots,
  handshake: FaHandshake,
};

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

  const IconComponent = BADGE_ICON_COMPONENTS[icon];
  return (
    <IconComponent
      className={className}
      color={color}
      style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.22))' }}
      aria-hidden="true"
    />
  );
}
