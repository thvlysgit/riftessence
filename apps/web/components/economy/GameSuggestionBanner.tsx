import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { economyApi } from '../../utils/economy';
import { EconomyError } from './EconomyLayout';

export default function GameSuggestionBanner() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError(null);
    try {
      await economyApi('/games/suggestions', {
        method: 'POST',
        body: JSON.stringify({ idea: new FormData(form).get('idea') }),
      });
      setSent(true);
      form.reset();
      setOpen(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="essence-notice essence-suggestion" aria-label="Suggest a game">
      <div className="essence-section-head">
        <div>
          <strong>What should we play next?</strong>
          <p className="essence-small">
            A quick idea or a whole new game — help shape the next addition.
          </p>
        </div>
        <button
          type="button"
          className="essence-button essence-secondary"
          aria-expanded={open}
          aria-controls="game-suggestion-form"
          onClick={() => {
            setOpen(!open);
            setSent(false);
          }}
        >
          Suggest a game
        </button>
      </div>
      {sent ? <p role="status">Thanks! Your idea has been sent to the admins for review.</p> : null}
      {open ? (
        <div id="game-suggestion-form">
          {user ? (
            <form onSubmit={submit}>
              <label className="essence-field">
                Your game idea
                <textarea
                  name="idea"
                  className="essence-input"
                  rows={5}
                  minLength={10}
                  maxLength={3000}
                  required
                  placeholder="Tell us anything you have in mind: how it plays, what makes it fun, a game that inspired you… No need to have it all figured out."
                />
              </label>
              <EconomyError error={error} />
              <div className="essence-form-actions">
                <button className="essence-button" disabled={busy}>
                  {busy ? 'Sending…' : 'Send idea'}
                </button>
                <span className="essence-muted essence-small">
                  Up to 3,000 characters. Make it your own.
                </span>
              </div>
            </form>
          ) : (
            <p>
              <Link href="/login">Sign in</Link> to share your game idea.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
