import React, { CSSProperties } from 'react';
import { BadgeIcon } from '../../utils/badgeIcons';

export const BADGE_SHAPE_OPTIONS = [
  { key: 'squircle', label: 'Squircle', description: 'Modern premium rounded frame' },
  { key: 'round', label: 'Round', description: 'Coin-like circular badge' },
  { key: 'crest', label: 'Crest', description: 'Heraldic smooth shield silhouette' },
  { key: 'bevel', label: 'Bevel', description: 'Cut-corner esports style frame' },
  { key: 'soft-hex', label: 'Soft Hex', description: 'Subtle hexagonal geometry' },
] as const;

export type BadgeShape = (typeof BADGE_SHAPE_OPTIONS)[number]['key'];

export const BADGE_ANIMATION_OPTIONS = [
  { key: 'none', label: 'None', description: 'Static with hover highlight only' },
  { key: 'breathe', label: 'Breathe', description: 'Slow ambient pulse and depth' },
  { key: 'drift', label: 'Drift', description: 'Gentle icon drift and sheen' },
  { key: 'glint', label: 'Glint', description: 'Clean metallic light sweep' },
  { key: 'spark', label: 'Spark', description: 'More energetic glow and micro-motion' },
] as const;

export type BadgeAnimation = (typeof BADGE_ANIMATION_OPTIONS)[number]['key'];

const BADGE_SHAPE_SET = new Set<string>(BADGE_SHAPE_OPTIONS.map((option) => option.key));
const BADGE_ANIMATION_SET = new Set<string>(BADGE_ANIMATION_OPTIONS.map((option) => option.key));

const DEFAULT_BADGE_SHAPE: BadgeShape = 'squircle';
const DEFAULT_BADGE_ANIMATION: BadgeAnimation = 'breathe';

function normalizeBadgeShape(shape: string | null | undefined): BadgeShape {
  if (!shape) return DEFAULT_BADGE_SHAPE;
  const normalized = shape.trim().toLowerCase();
  return BADGE_SHAPE_SET.has(normalized) ? (normalized as BadgeShape) : DEFAULT_BADGE_SHAPE;
}

function normalizeBadgeAnimation(animation: string | null | undefined): BadgeAnimation {
  if (!animation) return DEFAULT_BADGE_ANIMATION;
  const normalized = animation.trim().toLowerCase();
  return BADGE_ANIMATION_SET.has(normalized)
    ? (normalized as BadgeAnimation)
    : DEFAULT_BADGE_ANIMATION;
}

type LivingBadgeProps = {
  badgeKey: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverBg: string;
  shape?: string | null;
  animation?: string | null;
  label?: string;
  description?: string;
  className?: string;
  iconClassName?: string;
  tooltipIconClassName?: string;
  tooltipClassName?: string;
  showTooltip?: boolean;
  interactive?: boolean;
};

export default function LivingBadge({
  badgeKey,
  icon,
  bgColor,
  borderColor,
  textColor,
  hoverBg,
  shape,
  animation,
  label,
  description,
  className = 'w-10 h-10',
  iconClassName = 'w-6 h-6',
  tooltipIconClassName = 'w-4 h-4',
  tooltipClassName = '',
  showTooltip = true,
  interactive = true,
}: LivingBadgeProps) {
  const resolvedShape = normalizeBadgeShape(shape);
  const resolvedAnimation = normalizeBadgeAnimation(animation);

  const style = {
    background: bgColor,
    borderColor,
    color: textColor,
    boxShadow: `0 4px 18px ${borderColor}36`,
    '--badge-hover-bg': hoverBg,
    '--badge-border-color': borderColor,
    '--badge-shimmer-delay': '0s',
    '--badge-shimmer-duration': '4.6s',
    '--badge-aura-opacity': '0.34',
  } as CSSProperties;

  return (
    <div
      className={[
        'group',
        'relative',
        'inline-flex',
        'items-center',
        'justify-center',
        'select-none',
        interactive ? 'cursor-help' : 'cursor-default',
        'living-badge',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={label}
      data-badge-key={badgeKey}
    >
      <div
        className={[
          'living-badge-shell',
          'w-full',
          'h-full',
          'border-2',
          `living-badge-shape-${resolvedShape}`,
          `living-badge-animation-${resolvedAnimation}`,
        ]
          .filter(Boolean)
          .join(' ')}
        style={style}
      >
        <span className="living-badge-aura" aria-hidden />
        <span className="living-badge-sheen" aria-hidden />
        <span className="living-badge-hover-layer" aria-hidden />

        <div className="relative z-10 living-badge-icon">
          <BadgeIcon icon={icon} className={iconClassName} color={textColor} />
        </div>
      </div>

      {showTooltip && label && (
        <div
          className={[
            'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg',
            'opacity-0 group-hover:opacity-100 group-hover:translate-y-0 -translate-y-1',
            'transition-all duration-200 whitespace-nowrap z-20 shadow-xl backdrop-blur-sm',
            tooltipClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            background: 'var(--bg-tooltip)',
            border: `1px solid ${borderColor}`,
          }}
        >
          <div className="flex items-center gap-2">
            <BadgeIcon icon={icon} className={tooltipIconClassName} color={textColor} />
            <p className="text-xs font-semibold" style={{ color: textColor }}>
              {label}
            </p>
          </div>
          {description && (
            <p className="text-[10px] mt-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          )}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
            style={{
              background: 'var(--bg-tooltip)',
              borderLeft: `1px solid ${borderColor}`,
              borderBottom: `1px solid ${borderColor}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
