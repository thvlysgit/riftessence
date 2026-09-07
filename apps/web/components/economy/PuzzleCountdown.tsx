import React, { useEffect, useRef, useState } from 'react';

export default function PuzzleCountdown({
  resetAt,
  onReset,
}: {
  resetAt?: string;
  onReset?: () => void;
}) {
  const [now, setNow] = useState<number | null>(null);
  const lastReset = useRef<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const target = resetAt ? Date.parse(resetAt) : NaN;
  useEffect(() => {
    if (now !== null && Number.isFinite(target) && now >= target && lastReset.current !== target) {
      lastReset.current = target;
      onReset?.();
    }
  }, [now, target, onReset]);
  const seconds =
    now === null
      ? null
      : Math.max(
          0,
          Math.ceil(
            ((Number.isFinite(target) ? target : Math.floor(now / 86400000) * 86400000 + 86400000) -
              now) /
              1000,
          ),
        );
  const countdown =
    seconds === null
      ? '…'
      : `${Math.floor(seconds / 3600)}h ${String(Math.floor(seconds / 60) % 60).padStart(
          2,
          '0',
        )}m ${String(seconds % 60).padStart(2, '0')}s`;
  return <span className="essence-muted essence-small">New puzzles in {countdown}</span>;
}
