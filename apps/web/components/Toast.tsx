import React, { useEffect } from 'react';

type ToastProps = {
  open: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
};

export default function Toast({ open, message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  const bgVar = type === 'success' ? 'var(--accent-primary-bg)'
    : type === 'error' ? 'rgba(239,68,68,0.12)'
    : 'rgba(148,163,184,0.12)';
  const borderVar = type === 'success' ? 'var(--accent-primary)'
    : type === 'error' ? '#EF4444'
    : 'var(--border-card)';
  const textVar = type === 'success' ? 'var(--accent-primary)'
    : type === 'error' ? '#F87171'
    : 'var(--text-main)';

  return (
    <div
      style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1000 }}
      role="status"
      aria-live="polite"
    >
      <div
        className="rounded-lg px-4 py-3 shadow"
        style={{ background: bgVar, border: `1px solid ${borderVar}`, color: textVar, minWidth: 260 }}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-lg">
            {type === 'success' ? '✅' : type === 'error' ? '‼️' : 'ℹ️'}
          </span>
          <div className="text-sm leading-5" style={{ color: textVar }}>{message}</div>
          <button aria-label="Close" onClick={onClose} className="ml-auto opacity-80 hover:opacity-100">✖</button>
        </div>
      </div>
    </div>
  );
}
