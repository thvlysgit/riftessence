import React, { CSSProperties, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

type TooltipPosition = {
  left: number;
  top: number;
  placement: 'above' | 'below';
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
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const tooltipInstanceId = useId().replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const tooltipId = `badge-tooltip-${badgeKey.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}-${tooltipInstanceId}`;
  const canShowTooltip = Boolean(showTooltip && label);

  const updateTooltipPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || typeof window === 'undefined') return;

    const anchorRect = anchor.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = tooltipRef.current?.offsetWidth || Math.min(272, window.innerWidth - viewportPadding * 2);
    const tooltipHeight = tooltipRef.current?.offsetHeight || 72;
    const centeredLeft = anchorRect.left + anchorRect.width / 2;
    const left = Math.min(
      window.innerWidth - viewportPadding - tooltipWidth / 2,
      Math.max(viewportPadding + tooltipWidth / 2, centeredLeft)
    );
    const canFitAbove = anchorRect.top - tooltipHeight - 8 >= viewportPadding;

    setTooltipPosition({
      left,
      top: canFitAbove ? anchorRect.top - 8 : anchorRect.bottom + 8,
      placement: canFitAbove ? 'above' : 'below',
    });
  }, []);

  useEffect(() => {
    if (!tooltipOpen) {
      setTooltipPosition(null);
      return;
    }

    updateTooltipPosition();
    const frame = window.requestAnimationFrame(updateTooltipPosition);
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [tooltipOpen, updateTooltipPosition]);

  const tooltip = canShowTooltip && label && tooltipOpen && typeof document !== 'undefined'
    ? createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          className={[
            'badge-mark__tooltip',
            'badge-mark__tooltip--portal',
            !tooltipPosition ? 'badge-mark__tooltip--pending' : '',
            tooltipPosition?.placement === 'below' ? 'badge-mark__tooltip--below' : '',
            tooltipClassName,
          ].filter(Boolean).join(' ')}
          role="tooltip"
          style={{
            ...style,
            ...(tooltipPosition ? { left: tooltipPosition.left, top: tooltipPosition.top } : {}),
          }}
        >
          <span className="badge-mark__tooltip-title">
            <BadgeIcon badgeKey={badgeKey} icon={icon} className="badge-mark__tooltip-icon" />
            <span>{label}</span>
          </span>
          {description ? <span className="badge-mark__tooltip-description">{description}</span> : null}
        </span>,
        document.body
      )
    : null;

  return (
    <>
      <span
        ref={anchorRef}
        className={[
          'group badge-mark',
          interactive ? 'badge-mark--interactive' : '',
          className,
        ].filter(Boolean).join(' ')}
        style={style}
        title={showTooltip ? undefined : label}
        data-badge-key={badgeKey}
        tabIndex={interactive && canShowTooltip ? 0 : undefined}
        aria-describedby={canShowTooltip && tooltipOpen ? tooltipId : undefined}
        onMouseEnter={() => canShowTooltip && setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => canShowTooltip && setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
      >
        <BadgeIcon badgeKey={badgeKey} icon={icon} className="badge-mark__icon" title={!showTooltip ? label : undefined} />
      </span>
      {tooltip}
    </>
  );
}
