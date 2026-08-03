import React, { CSSProperties } from 'react';
import { BadgeIcon, getBadgeArtworkColor } from '../../utils/badgeIcons';

// Kept as compatibility exports for callers that still receive legacy badge rows.
// The new renderer deliberately ignores per-badge containers and animations.
export const BADGE_SHAPE_OPTIONS = [] as const;
export const BADGE_ANIMATION_OPTIONS = [] as const;

type LivingBadgeProps = {
  badgeKey: string;
  icon?: string | null;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  hoverBg?: string;
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
  label,
  description,
  className = '',
  tooltipClassName = '',
  showTooltip = true,
  interactive = true,
}: LivingBadgeProps) {
  const color = getBadgeArtworkColor(badgeKey, icon);
  const style = { '--badge-mark-color': color } as CSSProperties;

  return (
    <span
      className={[
        'group badge-mark',
        interactive ? 'badge-mark--interactive' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      title={showTooltip ? undefined : label}
      data-badge-key={badgeKey}
    >
      <BadgeIcon badgeKey={badgeKey} icon={icon} className="badge-mark__icon" title={!showTooltip ? label : undefined} />

      {showTooltip && label ? (
        <span className={['badge-mark__tooltip', tooltipClassName].filter(Boolean).join(' ')} role="tooltip">
          <span className="badge-mark__tooltip-title">
            <BadgeIcon badgeKey={badgeKey} icon={icon} className="badge-mark__tooltip-icon" />
            <span>{label}</span>
          </span>
          {description ? <span className="badge-mark__tooltip-description">{description}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
