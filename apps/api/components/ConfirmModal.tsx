import React from 'react';

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({ open, title = 'Please Confirm', message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--accent-primary)' }}>{title}</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-main)' }}>{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded font-semibold"
            style={{ background: 'var(--btn-disabled-bg)', color: 'var(--text-main)' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded font-bold"
            style={{ background: 'var(--accent-danger)', color: 'var(--btn-gradient-text)' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
