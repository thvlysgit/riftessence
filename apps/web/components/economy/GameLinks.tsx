import React from 'react';
import Link from 'next/link';

export const GAME_LINKS = [
  { key: 'archive', title: 'Champion Archive' },
  { key: 'soundcheck', title: 'Soundcheck' },
  { key: 'shopkeeper', title: 'Shopkeeper' },
  { key: 'recipe-rush', title: 'Recipe Rush' },
];

export default function GameLinks({ current }: { current: string }) {
  return (
    <nav className="essence-form-actions essence-game-links" aria-label="Play another game">
      {GAME_LINKS.filter((game) => game.key !== current).map((game) => (
        <Link
          key={game.key}
          className="essence-button essence-secondary"
          href={`/games/${game.key}`}
        >
          Play {game.title} →
        </Link>
      ))}
      <Link className="essence-text-button" href="/games">
        All games
      </Link>
    </nav>
  );
}
