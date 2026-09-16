import React, { RefObject, useRef, useState } from 'react';
import Image from 'next/image';
import { RecipePiece } from '../../utils/recipeRush';

export default function RecipeTray({
  pieces,
  forge,
  disabled,
  onAdd,
  reusable,
}: {
  pieces: RecipePiece[];
  forge: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  onAdd: (key: string) => void;
  reusable: boolean;
}) {
  const gesture = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{
    piece: RecipePiece;
    x: number;
    y: number;
    over: boolean;
  } | null>(null);
  const insideForge = (x: number, y: number) => {
    const box = forge.current?.getBoundingClientRect();
    return !!box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  };
  const clear = () => {
    gesture.current = null;
    setDrag(null);
    forge.current?.removeAttribute('data-drag-over');
  };
  return (
    <>
      <div className="recipe-tray" aria-label="Ingredient tray">
        {pieces.map((piece, i) => (
          <button
            key={piece.key}
            type="button"
            className={`recipe-piece ${piece.state} ${
              drag?.piece.key === piece.key ? 'dragging' : ''
            }`}
            disabled={disabled || piece.state !== 'ready'}
            aria-label={`${
              piece.state === 'accepted'
                ? 'Added'
                : piece.state === 'rejected'
                ? 'Incorrect'
                : 'Add'
            } ${piece.item.name}, piece ${i + 1}`}
            onClick={(event) => {
              const suppressPointerClick = suppressClick.current;
              suppressClick.current = false;
              if (suppressPointerClick && event.detail > 0) return;
              onAdd(piece.key);
            }}
            onPointerDown={(e) => {
              if (e.button !== 0 || disabled || piece.state !== 'ready') return;
              suppressClick.current = false;
              gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const g = gesture.current;
              if (!g || g.id !== e.pointerId) return;
              if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8) g.moved = true;
              if (!g.moved) return;
              const over = insideForge(e.clientX, e.clientY);
              forge.current?.setAttribute('data-drag-over', String(over));
              setDrag({ piece, x: e.clientX, y: e.clientY, over });
            }}
            onPointerUp={(e) => {
              const g = gesture.current;
              if (!g || g.id !== e.pointerId) return;
              if (g.moved) {
                suppressClick.current = true;
                if (insideForge(e.clientX, e.clientY)) onAdd(piece.key);
              }
              clear();
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              suppressClick.current = true;
              clear();
            }}
            onLostPointerCapture={clear}
          >
            <span className="recipe-piece-art" key={`${piece.key}-${piece.used}`}>
              <Image
                src={piece.item.imageUrl}
                width={64}
                height={64}
                alt=""
                unoptimized
                draggable={false}
              />
              {piece.state !== 'ready' ? (
                <span className="recipe-piece-mark" aria-hidden="true">
                  {piece.state === 'accepted' ? '✓' : '×'}
                </span>
              ) : null}
            </span>
            <span>{piece.item.name}</span>
            <small>
              {piece.state === 'accepted'
                ? 'In the forge'
                : piece.state === 'rejected'
                ? 'Not needed here'
                : reusable && piece.used
                ? `Added ${piece.used} · use again`
                : 'Drag or tap'}
            </small>
          </button>
        ))}
      </div>
      {drag ? (
        <div
          className={`recipe-drag-ghost ${drag.over ? 'over' : ''}`}
          style={{ left: drag.x, top: drag.y }}
          aria-hidden="true"
        >
          <Image src={drag.piece.item.imageUrl} width={64} height={64} alt="" unoptimized />
          <span>{drag.over ? 'Release to forge' : drag.piece.item.name}</span>
        </div>
      ) : null}
    </>
  );
}
