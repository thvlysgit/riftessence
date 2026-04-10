import React, { CSSProperties, useMemo } from 'react';
import { BadgeIcon } from '../../utils/badgeIcons';

type BadgeShape = 'squircle' | 'hex' | 'shield' | 'ticket' | 'diamond';
type BadgeMotion = 'pulse' | 'float' | 'drift' | 'orbit';

type LivingBadgeProps = {
  badgeKey: string;
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverBg: string;
  label?: string;
  description?: string;
  className?: string;
  iconClassName?: string;
  tooltipIconClassName?: string;
  tooltipClassName?: string;
  showTooltip?: boolean;
  interactive?: boolean;
};

const SHAPES: BadgeShape[] = ['squircle', 'hex', 'shield', 'ticket', 'diamond'];
const MOTIONS: BadgeMotion[] = ['pulse', 'float', 'drift', 'orbit'];

function normalizeSeed(value: string): string {
  return (value || 'badge').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getBadgeVariant(seedInput: string) {
  const seed = normalizeSeed(seedInput) || 'badge';
  const hash = hashString(seed);

  return {
    shape: SHAPES[hash % SHAPES.length],
    motion: MOTIONS[Math.floor(hash / SHAPES.length) % MOTIONS.length],
    tiltDeg: ((hash % 9) - 4) * 0.45,
    shimmerDelay: `${(hash % 7) * 0.2}s`,
    shimmerDuration: `${4 + (hash % 4) * 0.55}s`,
    auraOpacity: (0.3 + ((hash >> 2) % 4) * 0.05).toFixed(2),
  };
}

export default function LivingBadge({
  badgeKey,
  icon,
  bgColor,
  borderColor,
  textColor,
  hoverBg,
  label,
  description,
  className = 'w-10 h-10',
  iconClassName = 'w-6 h-6',
  tooltipIconClassName = 'w-4 h-4',
  tooltipClassName = '',
  showTooltip = true,
  interactive = true,
}: LivingBadgeProps) {
  const variant = useMemo(
    () => getBadgeVariant(badgeKey || label || icon),
    [badgeKey, label, icon]
  );

  const style = {
    background: bgColor,
    borderColor,
    color: textColor,
    boxShadow: `0 3px 14px ${borderColor}38`,
    '--badge-hover-bg': hoverBg,
    '--badge-border-color': borderColor,
    '--badge-tilt': `${variant.tiltDeg}deg`,
    '--badge-shimmer-delay': variant.shimmerDelay,
    '--badge-shimmer-duration': variant.shimmerDuration,
    '--badge-aura-opacity': variant.auraOpacity,
  } as CSSProperties;

  return (
    <div
      className={[
        'group',
        'relative',
        'inline-flex',
        'items-center',
        'justify-center',
        'border-2',
        'select-none',
        interactive ? 'cursor-help' : 'cursor-default',
        'living-badge',
        `living-badge-shape-${variant.shape}`,
        `living-badge-motion-${variant.motion}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      title={label}
    >
      <span className="living-badge-aura" aria-hidden />
      <span className="living-badge-sheen" aria-hidden />
      <span className="living-badge-hover-layer" aria-hidden />

      <div className="relative z-10 living-badge-icon">
        <BadgeIcon icon={icon} className={iconClassName} color={textColor} />
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
