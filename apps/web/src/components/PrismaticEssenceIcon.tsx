import React from 'react';
import { GiCrystalCluster } from 'react-icons/gi';

type PrismaticEssenceIconProps = {
  className?: string;
  animated?: boolean;
  title?: string;
};

export default function PrismaticEssenceIcon({
  className = '',
  animated = false,
  title = 'Prismatic Essence',
}: PrismaticEssenceIconProps) {
  return (
    <span
      className={`prismatic-icon ${animated ? 'prismatic-icon-animated' : ''} ${className}`.trim()}
      aria-label={title}
      role="img"
    >
      <GiCrystalCluster className="prismatic-shard-icon" aria-hidden="true" focusable="false" />
    </span>
  );
}
