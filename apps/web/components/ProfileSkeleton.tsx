import React from 'react';

/**
 * Skeleton loader component for profile page
 * Shows animated placeholder while data is loading
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)' }}>
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }} />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
            <div className="h-4 w-60 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
            <div className="flex gap-2">
              {[1, 2].map(i => (
                <div key={i} className="h-8 w-20 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)' }}>
            <div className="h-4 w-16 rounded mb-2" style={{ backgroundColor: 'var(--bg-secondary)' }} />
            <div className="h-6 w-24 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
          </div>
        ))}
      </div>

      {/* Section skeleton */}
      <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)' }}>
        <div className="h-6 w-32 rounded mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }} />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-secondary)' }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
