import React from 'react';
import { FaGem, FaStar } from 'react-icons/fa';

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
  return (
    <span className={`prismatic-icon ${animated ? 'prismatic-icon-animated' : ''} ${className}`.trim()} aria-label={title} role="img">
      <FaGem className="prismatic-gem" aria-hidden="true" />
      <FaGem className="prismatic-gem-aura" aria-hidden="true" />
      <FaStar className="prismatic-glint" aria-hidden="true" />
    </span>
  );
}
