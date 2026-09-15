import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { FiMove } from 'react-icons/fi';
import { pe } from '../../utils/economy';

export type PriceItem = {
  id: string;
  name: string;
  imageUrl: string;
  price?: number;
  tier?: string;
};
export default function PriceCard({
  item,
  hidden,
  disabled,
  onChoose,
}: {
  item: PriceItem;
  hidden: boolean;
  disabled: boolean;
  onChoose: (choice: 'higher' | 'lower') => void;
}) {
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const active = hidden && !disabled;
  const direction = offset > 0 ? 'higher' : 'lower';
  const cancel = () => {
    drag.current = null;
    setOffset(0);
  };
  return (
    <div className={`price-drag-zone ${Math.abs(offset) > 8 ? direction : ''}`}>
      <div className="price-direction-cues" aria-hidden="true">
        <span>
          ← LESS
          <br />
          <small>Red embers</small>
        </span>
        <span>
          MORE →<br />
          <small>Gold sparks</small>
        </span>
      </div>
      <div className={`price-sparks ${Math.abs(offset) >= 64 ? 'ready' : ''}`} aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} style={{ '--spark': i } as React.CSSProperties} />
        ))}
      </div>
      <article
        className={`essence-item-price-card mystery price-grabbable ${
          hidden ? '' : 'price-revealed'
        } ${drag.current ? 'dragging' : ''}`}
        style={
          { '--drag-x': `${offset}px`, '--drag-tilt': `${offset / 15}deg` } as React.CSSProperties
        }
        tabIndex={active ? 0 : undefined}
        role={active ? 'group' : undefined}
        aria-label={
          active
            ? `Mystery item: ${item.name}. Drag left for lower or right for higher, or use the arrow keys.`
            : undefined
        }
        onKeyDown={(e) => {
          if (active && ['ArrowLeft', 'ArrowRight'].includes(e.key) && !e.repeat) {
            e.preventDefault();
            onChoose(e.key === 'ArrowRight' ? 'higher' : 'lower');
          }
        }}
        onPointerDown={(e) => {
          if (!active || !e.isPrimary || e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          e.currentTarget.setPointerCapture(e.pointerId);
          setOffset(0);
        }}
        onPointerMove={(e) => {
          if (drag.current?.id !== e.pointerId) return;
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 20) {
            cancel();
            return;
          }
          setOffset(Math.max(-110, Math.min(110, dx)));
        }}
        onPointerUp={(e) => {
          if (drag.current?.id !== e.pointerId) return;
          const dx = e.clientX - drag.current.x;
          cancel();
          if (active && Math.abs(dx) >= 64) onChoose(dx > 0 ? 'higher' : 'lower');
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
      >
        <p className="price-tier">
          {item.tier || 'Item'} · {hidden ? 'mystery price' : 'price revealed'}
        </p>
        <Image
          src={item.imageUrl}
          width={112}
          height={112}
          alt={item.name}
          draggable={false}
          unoptimized
        />
        <h2>{item.name}</h2>
        <div className="price-tag" key={hidden ? 'hidden' : 'revealed'}>
          <span>
            {hidden ? '???' : pe(item.price!)} <small>gold</small>
          </span>
        </div>
        {hidden ? (
          <p className="price-grab-hint">
            <FiMove aria-hidden="true" />{' '}
            {Math.abs(offset) >= 64 ? `Release for ${direction}` : 'Grab me · slide left or right'}
          </p>
        ) : (
          <p className="price-grab-hint">Price revealed</p>
        )}
      </article>
    </div>
  );
}
