import React from 'react';
import { Cosmetic } from '../../utils/economy';
import {
  USERNAME_DECORATION_STYLES,
  USERNAME_FONT_FAMILIES,
  USERNAME_HOVER_EFFECT_CLASSES,
} from '../../utils/cosmeticStyles';
import LivingBadge from '../../src/components/LivingBadge';

export default function CosmeticPreview({
  item,
  username = 'riftwalker',
}: {
  item: Cosmetic;
  username?: string;
}) {
  if (item.badgePreview)
    return (
      <div className="essence-cosmetic-preview">
        <LivingBadge
          badgeKey={item.badgePreview.key}
          icon={item.badgePreview.icon}
          label={item.title}
          className="essence-badge-art"
        />
      </div>
    );
  const key = item.unlockKey || '';
  return (
    <div className="essence-cosmetic-preview">
      <span
        className={USERNAME_HOVER_EFFECT_CLASSES[key] || ''}
        style={{
          ...USERNAME_DECORATION_STYLES[key],
          ...(USERNAME_FONT_FAMILIES[key] ? { fontFamily: USERNAME_FONT_FAMILIES[key] } : {}),
        }}
      >
        {username}
      </span>
    </div>
  );
}
