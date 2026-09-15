import React, { useEffect, useRef, useState } from 'react';
import { FiVolume2, FiVolumeX } from 'react-icons/fi';

export function useGameEffects() {
  const [enabled, setEnabled] = useState(false);
  const context = useRef<AudioContext | null>(null);
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem('game-effects') === 'on');
    } catch {}
    return () => {
      void context.current?.close();
    };
  }, []);
  const prepare = () => {
    try {
      context.current ||= new AudioContext();
      void context.current.resume().catch(() => {});
      return context.current;
    } catch {
      return null;
    }
  };
  const play = (kind: 'coin' | 'miss' | 'stamp' | 'win', matches?: string[]) => {
    if (!enabled) return;
    const ctx = prepare();
    if (!ctx) return;
    const notes =
      kind === 'win'
        ? [523, 659, 784, 1047]
        : kind === 'coin'
        ? [880, 1320]
        : kind === 'stamp'
        ? matches?.map((match) =>
            match === 'correct' ? 620 : match === 'partial' ? 350 : 170,
          ) || [190]
        : [180, 120];
    notes.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.09;
      oscillator.type = kind === 'stamp' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.07, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.2);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  };
  const toggle = () => {
    if (!enabled) prepare();
    setEnabled(!enabled);
    try {
      localStorage.setItem('game-effects', enabled ? 'off' : 'on');
    } catch {}
  };
  return { enabled, toggle, play };
}

export function EffectsToggle({ enabled, toggle }: { enabled: boolean; toggle: () => void }) {
  return (
    <button type="button" className="game-effects-toggle" aria-pressed={enabled} onClick={toggle}>
      {enabled ? <FiVolume2 aria-hidden="true" /> : <FiVolumeX aria-hidden="true" />} Effects{' '}
      {enabled ? 'on' : 'off'}
    </button>
  );
}

export function RewardCount({ value }: { value: number }) {
  const [count, setCount] = useState(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 850);
      setCount(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span aria-label={`${value} PE`}>
      <span aria-hidden="true">
        +{count} <small>PE</small>
      </span>
    </span>
  );
}
