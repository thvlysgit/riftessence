import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

type CursorKind = 'default' | 'pointer' | 'text' | 'dropdown' | 'post' | 'message' | 'disabled';

interface CursorState {
  kind: CursorKind;
  visible: boolean;
  active: boolean;
}

const interactiveSelector = [
  'a[href]',
  'button',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
  'summary',
  'label',
  '.clickable',
].join(',');

const disabledSelector = [
  ':disabled',
  '[aria-disabled="true"]',
  '.disabled',
  '[class*="disabled:cursor-not-allowed"]',
].join(',');

function getCursorKind(target: EventTarget | null): CursorKind {
  if (!(target instanceof Element)) return 'default';

  const explicit = target.closest('[data-cursor]');
  const explicitKind = explicit?.getAttribute('data-cursor');
  if (explicitKind && isCursorKind(explicitKind)) return explicitKind;

  if (target.closest(disabledSelector)) return 'disabled';
  if (target.closest('textarea, input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], input[type="number"], [contenteditable="true"]')) return 'text';
  if (target.closest('select, option, [role="combobox"], [aria-haspopup="true"], [aria-expanded]')) return 'dropdown';
  if (target.closest('.cursor-message')) return 'message';
  if (target.closest('.cursor-post')) return 'post';

  const semanticText = [
    target.getAttribute('aria-label'),
    target.closest('[aria-label]')?.getAttribute('aria-label'),
    target.textContent?.slice(0, 80),
  ].filter(Boolean).join(' ').toLowerCase();

  if (semanticText.includes('message') || semanticText.includes('chat') || semanticText.includes('discord')) {
    return 'message';
  }

  if (semanticText.includes('post') || semanticText.includes('publish')) {
    return 'post';
  }

  if (target.closest(interactiveSelector)) return 'pointer';
  return 'default';
}

function isCursorKind(value: string): value is CursorKind {
  return ['default', 'pointer', 'text', 'dropdown', 'post', 'message', 'disabled'].includes(value);
}

function getCursorGlyph(kind: CursorKind) {
  switch (kind) {
    case 'text':
      return 'I';
    case 'dropdown':
      return 'v';
    case 'post':
      return '+';
    case 'message':
      return '"';
    case 'disabled':
      return 'x';
    case 'pointer':
      return '';
    case 'default':
    default:
      return '';
  }
}

export function ThemeCursor() {
  const { themeCursorsEnabled } = useTheme();
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [canUseCustomCursor, setCanUseCustomCursor] = useState(false);
  const [state, setState] = useState<CursorState>({
    kind: 'default',
    visible: false,
    active: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const syncCapability = () => setCanUseCustomCursor(mediaQuery.matches);
    syncCapability();

    mediaQuery.addEventListener('change', syncCapability);
    return () => mediaQuery.removeEventListener('change', syncCapability);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (!themeCursorsEnabled || !canUseCustomCursor) {
      root.removeAttribute('data-theme-cursor-ready');
      setState((current) => ({ ...current, visible: false, active: false }));
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      }
      root.setAttribute('data-theme-cursor-ready', 'true');
      const kind = getCursorKind(event.target);
      setState((current) => {
        if (current.kind === kind && current.visible) return current;
        return {
          ...current,
          kind,
          visible: true,
        };
      });
    };

    const handlePointerDown = () => {
      setState((current) => ({ ...current, active: true }));
    };

    const handlePointerUp = () => {
      setState((current) => ({ ...current, active: false }));
    };

    const handlePointerLeave = () => {
      setState((current) => ({ ...current, visible: false, active: false }));
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.documentElement.removeEventListener('mouseleave', handlePointerLeave);
      root.removeAttribute('data-theme-cursor-ready');
    };
  }, [themeCursorsEnabled, canUseCustomCursor]);

  if (!themeCursorsEnabled || !canUseCustomCursor) return null;

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className={[
        'theme-cursor',
        `theme-cursor-${state.kind}`,
        state.visible ? 'theme-cursor-visible' : '',
        state.active ? 'theme-cursor-active' : '',
      ].join(' ')}
      data-kind={state.kind}
    >
      <span className="theme-cursor-trail" />
      <span className="theme-cursor-ring" />
      <span className="theme-cursor-core">
        <span className="theme-cursor-glyph">{getCursorGlyph(state.kind)}</span>
      </span>
    </div>
  );
}
