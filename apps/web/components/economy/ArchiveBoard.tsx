import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { GameRound } from '../../utils/economy';

export default function ArchiveBoard({
  round,
  champions,
  version,
  userId,
}: {
  round: GameRound;
  champions: { id: string; name: string }[];
  version: string;
  userId: string;
}) {
  const storageKey = `archive-notes:${userId}:${round.id}`;
  const [notes, setNotes] = useState<Record<string, 'pinned' | 'out'>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pinned' | 'out'>('all');
  const [limit, setLimit] = useState(36);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (saved && typeof saved === 'object')
        setNotes(
          Object.fromEntries(
            Object.entries(saved).filter(
              ([id, state]) =>
                champions.some((c) => c.id === id) && ['pinned', 'out'].includes(String(state)),
            ),
          ) as Record<string, 'pinned' | 'out'>,
        );
    } catch {}
  }, [storageKey, champions]);
  const mark = (id: string, state: 'pinned' | 'out') => {
    const next = { ...notes };
    if (next[id] === state) delete next[id];
    else next[id] = state;
    setNotes(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };
  const visible = champions.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'all' || notes[c.id] === filter),
  );
  return (
    <div className="archive-investigation">
      <div className="archive-board-heading">
        <div>
          <span>CHAMPION ARCHIVE</span>
          <h2>Follow the evidence.</h2>
        </div>
        <span className="archive-case-number">
          {round.finished
            ? 'CASE CLOSED'
            : `${round.maxGuesses - round.attempts.length} GUESSES LEFT`}
        </span>
      </div>
      {round.attempts.length ? (
        <ol className="archive-evidence" aria-label="Your evidence">
          {round.attempts.map((attempt, n) => (
            <li key={attempt.champion.id} className="archive-evidence-row">
              <div className="archive-portrait">
                <span className="archive-pin" aria-hidden="true" />
                <Image
                  src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${attempt.champion.id}.png`}
                  width={72}
                  height={72}
                  alt=""
                  unoptimized
                />
                <strong>{attempt.champion.name}</strong>
                <small>Guess {n + 1}</small>
              </div>
              <div className="archive-clues">
                {attempt.clues.map((clue, i) => (
                  <div
                    className={`archive-clue ${clue.match}`}
                    key={clue.label}
                    style={{ '--stamp-delay': `${i * 100}ms` } as React.CSSProperties}
                  >
                    <span>{clue.label}</span>
                    <strong>
                      {clue.value}{' '}
                      {clue.direction === 'higher' ? '↑' : clue.direction === 'lower' ? '↓' : ''}
                    </strong>
                    <small>
                      {clue.match === 'correct'
                        ? '✓ MATCH'
                        : clue.match === 'partial'
                        ? '≈ PARTIAL'
                        : clue.direction
                        ? `${clue.direction === 'higher' ? '↑' : '↓'} GO ${clue.direction.toUpperCase()}`
                        : '× NO MATCH'}
                    </small>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="archive-empty-board">
          <div aria-hidden="true">?</div>
          <h3>Every portrait leaves a trail.</h3>
          <p>Make your first guess to stamp evidence onto the board.</p>
        </div>
      )}
      <p className="archive-board-note">
        Each clue belongs to your guess. Arrows point toward the answer. Skin counts exclude chromas
        and base appearances.
      </p>
      {round.finished && !round.won && round.answer?.clues ? (
        <div className="archive-answer-evidence">
          <h3>The clues that close the case</h3>
          <p>
            {round.answer.name}:{' '}
            {round.answer.clues.map((c) => `${c.label}: ${c.value}`).join(' · ')}
          </p>
        </div>
      ) : null}
      {!round.finished ? (
        <details className="archive-roster">
          <summary>
            Manage suspects{' '}
            <span>
              {Object.values(notes).filter((n) => n === 'pinned').length} pinned ·{' '}
              {Object.values(notes).filter((n) => n === 'out').length} ruled out
            </span>
          </summary>
          <p>
            Your notes, your deductions. Pin suspects or cross them out; this never submits a guess.
          </p>
          <label className="archive-roster-search">
            Find a suspect
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(36);
              }}
              placeholder="Champion name"
            />
          </label>
          <div className="archive-roster-filters">
            {(['all', 'pinned', 'out'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => {
                  setFilter(f);
                  setLimit(36);
                }}
              >
                {f === 'out' ? 'Ruled out' : f === 'all' ? 'All champions' : 'Pinned suspects'}
              </button>
            ))}
          </div>
          <div className="archive-roster-grid">
            {visible.slice(0, limit).map((c) => (
              <div className={`archive-suspect ${notes[c.id] || ''}`} key={c.id}>
                <Image
                  src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.id}.png`}
                  width={56}
                  height={56}
                  alt=""
                  loading="lazy"
                  unoptimized
                />
                <strong>{c.name}</strong>
                <div>
                  <button
                    type="button"
                    aria-label={`Pin ${c.name}`}
                    aria-pressed={notes[c.id] === 'pinned'}
                    onClick={() => mark(c.id, 'pinned')}
                  >
                    ◆ Pin
                  </button>
                  <button
                    type="button"
                    aria-label={`Rule out ${c.name}`}
                    aria-pressed={notes[c.id] === 'out'}
                    onClick={() => mark(c.id, 'out')}
                  >
                    × Out
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!visible.length ? <p>No suspects here. Change the filter or search.</p> : null}
          {visible.length > limit ? (
            <button
              type="button"
              className="essence-text-button"
              onClick={() => setLimit(limit + 36)}
            >
              Show more champions
            </button>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}
