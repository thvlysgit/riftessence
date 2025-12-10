import React, { useState } from 'react';

export interface ReportModalProps {
  username: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ username, open, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for the report.');
      return;
    }
    setError('');
    onSubmit(reason);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <form className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md shadow-lg border-2 border-[var(--border-card)]" onSubmit={handleSubmit}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-danger)' }}>Report {username}</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Reason for report</label>
          <textarea 
            className="w-full rounded p-2 bg-[var(--bg-input)] border border-[var(--border-card)] text-[var(--text-main)]" 
            rows={4} 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            placeholder="Describe why you are reporting this user..."
            required
          />
        </div>
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="px-4 py-2 rounded bg-[var(--bg-input)] text-[var(--text-secondary)]" onClick={onClose}>Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-[var(--accent-danger)] text-[var(--btn-gradient-text)] font-bold">Submit Report</button>
        </div>
      </form>
    </div>
  );
};
