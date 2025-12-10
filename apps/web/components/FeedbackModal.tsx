import React, { useState } from 'react';

export interface FeedbackModalProps {
  username: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { stars: number; moons: number; comment: string }) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ username, open, onClose, onSubmit }) => {
  const [stars, setStars] = useState(0);
  const [moons, setMoons] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stars < 1 || moons < 1) {
      setError('Please rate both skill and personality (at least 1 star and 1 moon).');
      return;
    }
    setError('');
    onSubmit({ stars, moons, comment });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <form className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md shadow-lg border-2 border-[var(--border-card)]" onSubmit={handleSubmit}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-primary)' }}>Give Feedback for {username}</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Skill (Stars)</label>
          <div className="flex gap-2">
            {[1,2,3,4,5].map((i) => (
              <button type="button" key={i} onClick={() => setStars(i)}>
                <svg className="w-7 h-7" fill={i <= stars ? 'var(--accent-primary)' : 'var(--text-muted)'} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Personality (Moons)</label>
          <div className="flex gap-2">
            {[1,2,3,4,5].map((i) => (
              <button type="button" key={i} onClick={() => setMoons(i)}>
                <svg className="w-7 h-7" fill={i <= moons ? 'var(--accent-primary)' : 'var(--text-muted)'} viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Commentary (Optional)</label>
          <textarea className="w-full rounded p-2 bg-[var(--bg-input)] border border-[var(--border-card)] text-[var(--text-main)]" rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience..." />
        </div>
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="px-4 py-2 rounded bg-[var(--bg-input)] text-[var(--text-secondary)]" onClick={onClose}>Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-[var(--accent-primary)] text-[var(--btn-gradient-text)] font-bold">Submit</button>
        </div>
      </form>
    </div>
  );
};
