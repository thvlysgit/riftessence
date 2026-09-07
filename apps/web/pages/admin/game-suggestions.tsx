import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import EconomyLayout, {
  EconomyError,
  EconomyLoading,
} from '../../components/economy/EconomyLayout';
import { economyApi } from '../../utils/economy';

type Suggestion = {
  id: string;
  idea: string;
  reviewed: boolean;
  reviewedAt: string | null;
  createdAt: string;
  user: { username: string };
};

export default function GameSuggestionsPage() {
  const { user, loading } = useAuth();
  const client = useQueryClient();
  const admin = user?.badges?.some((badge) => badge.key === 'admin');
  const [reviewed, setReviewed] = useState(false);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const ideas = useQuery(
    ['game-suggestions', user?.id, reviewed, page],
    () =>
      economyApi<{ suggestions: Suggestion[]; total: number }>(
        `/games/admin/suggestions?reviewed=${reviewed}&page=${page}`,
      ),
    { enabled: Boolean(admin) },
  );
  const review = async (idea: Suggestion) => {
    setBusy(idea.id);
    setError(null);
    try {
      await economyApi(`/games/admin/suggestions/${idea.id}`, {
        method: 'PUT',
        body: JSON.stringify({ reviewed: !idea.reviewed }),
      });
      await client.invalidateQueries(['game-suggestions', user?.id]);
      const result = await ideas.refetch();
      if (!result.data?.suggestions.length && page > 1) setPage(page - 1);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };
  return (
    <EconomyLayout
      title="Game suggestions."
      description="Explore the games your community wants to play next."
      admin
    >
      {loading ? (
        <EconomyLoading />
      ) : !admin ? (
        <p>Admin access required.</p>
      ) : (
        <>
          <div className="essence-form-actions">
            {[false, true].map((value) => (
              <button
                key={String(value)}
                className="essence-button essence-secondary"
                aria-pressed={reviewed === value}
                onClick={() => {
                  setReviewed(value);
                  setPage(1);
                }}
              >
                {value ? 'Reviewed' : 'Awaiting review'}
              </button>
            ))}
          </div>
          <EconomyError
            error={error || ideas.error}
            retry={() => {
              void ideas.refetch();
            }}
          />
          {ideas.isLoading ? (
            <EconomyLoading />
          ) : ideas.data?.suggestions.length ? (
            ideas.data.suggestions.map((idea) => (
              <article key={idea.id} className="essence-panel essence-section">
                <div className="essence-section-head">
                  <Link href={`/profile/${encodeURIComponent(idea.user.username)}`}>
                    @{idea.user.username}
                  </Link>
                  <span className="essence-muted essence-small">
                    {new Date(idea.createdAt).toLocaleString()}
                  </span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{idea.idea}</p>
                <div className="essence-form-actions">
                  <button
                    className="essence-button essence-secondary"
                    disabled={busy !== null}
                    onClick={() => review(idea)}
                  >
                    {busy === idea.id ? 'Saving…' : idea.reviewed ? 'Reopen' : 'Mark reviewed'}
                  </button>
                  {idea.reviewedAt ? (
                    <span className="essence-muted essence-small">
                      Reviewed {new Date(idea.reviewedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="essence-section essence-muted">
              {reviewed ? 'No reviewed suggestions yet.' : 'No game ideas awaiting review.'}
            </p>
          )}
          {ideas.data && ideas.data.total > 25 ? (
            <div className="essence-form-actions">
              <button
                className="essence-button essence-secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {Math.ceil(ideas.data.total / 25)}
              </span>
              <button
                className="essence-button essence-secondary"
                disabled={page * 25 >= ideas.data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </EconomyLayout>
  );
}
