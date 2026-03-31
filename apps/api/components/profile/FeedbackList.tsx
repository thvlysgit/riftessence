import React from 'react';

type Feedback = {
  id: string;
  stars: number;
  moons: number;
  comment: string;
  date: string;
  raterUsername: string;
};

interface FeedbackListProps {
  feedback: Feedback[];
  isOwnProfile: boolean;
  onDeleteFeedback?: (feedbackId: string) => void;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({
  feedback,
  isOwnProfile,
  onDeleteFeedback
}) => {
  if (feedback.length === 0) {
    return (
      <div className="text-center py-8 opacity-50">
        No feedback received yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedback.map((fb) => (
        <div
          key={fb.id}
          className="p-4 rounded-lg"
          style={{
            backgroundColor: 'var(--color-card)',
            borderLeft: '3px solid var(--color-accent-1)',
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">⭐</span>
                <span className="font-bold">{fb.stars}/5</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-blue-400">🌙</span>
                <span className="font-bold">{fb.moons}/5</span>
              </div>
            </div>
            <div className="text-sm opacity-75">
              {new Date(fb.date).toLocaleDateString()}
            </div>
          </div>
          
          {fb.comment && (
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {fb.comment}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-50">
              From: {fb.raterUsername}
            </div>
            {isOwnProfile && onDeleteFeedback && (
              <button
                onClick={() => onDeleteFeedback(fb.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
