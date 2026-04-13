import React, { useId } from 'react';

type PrismaticEssenceIconProps = {
  className?: string;
  animated?: boolean;
  title?: string;
};

export default function PrismaticEssenceIcon({
  className = '',
  animated = true,
  title = 'Prismatic Essence',
}: PrismaticEssenceIconProps) {
  const seed = useId().replace(/:/g, '');
  const shardGradientId = `${seed}-prismatic-shards`;

  return (
    <span className={`prismatic-icon ${animated ? 'prismatic-icon-animated' : ''} ${className}`.trim()} aria-label={title} role="img">
      <svg viewBox="0 0 64 64" className="prismatic-shard-svg" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={shardGradientId} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22d3ee">
              <animate attributeName="stop-color" values="#22d3ee;#60a5fa;#a78bfa;#f472b6;#22d3ee" dur="4.8s" repeatCount="indefinite" />
            </stop>
            <stop offset="52%" stopColor="#38bdf8">
              <animate attributeName="stop-color" values="#38bdf8;#a78bfa;#f472b6;#22d3ee;#38bdf8" dur="4.8s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#67e8f9">
              <animate attributeName="stop-color" values="#67e8f9;#22d3ee;#60a5fa;#a78bfa;#67e8f9" dur="4.8s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>

        <g className="prismatic-shard-group">
          <path className="prismatic-shard-piece" d="M31 6L57 23L36 47L13 36Z" fill={`url(#${shardGradientId})`} />
          <path className="prismatic-shard-piece" d="M38 35L53 47L41 61L28 50Z" fill={`url(#${shardGradientId})`} />
          <path className="prismatic-shard-piece" d="M8 35L33 44L22 62Z" fill={`url(#${shardGradientId})`} />
          <path className="prismatic-shard-piece" d="M30 44L40 48L33 54Z" fill={`url(#${shardGradientId})`} />
          <circle className="prismatic-glint" cx="33" cy="13" r="2.2" />
        </g>
      </svg>
    </span>
  );
}
