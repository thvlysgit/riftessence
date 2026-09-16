import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import EconomyLayout, {
  EconomyError,
  EconomyLoading,
} from '../../components/economy/EconomyLayout';
import { economyApi, GamesOverview, pe } from '../../utils/economy';
import PuzzleCountdown from '../../components/economy/PuzzleCountdown';

export default function GamesPage() {
  const { user } = useAuth();
  const overview = useQuery(['economy', user?.id, 'games'], ({ signal }) =>
    economyApi<GamesOverview>('/games', { signal }),
  );
  return (
    <EconomyLayout title="Know the Rift." description="Four daily games. A fresh reason to play.">
      <EconomyError error={overview.error} retry={() => overview.refetch()} />
      {overview.isLoading ? <EconomyLoading /> : null}
      {overview.data ? (
        <div className="essence-section-head">
          <span className="essence-muted">
            {user
              ? `${pe(overview.data.earnedToday)} / ${pe(overview.data.dailyCap)} PE earned today`
              : 'Sign in to save your progress and earn PE.'}
          </span>
          <PuzzleCountdown
            resetAt={overview.data.resetAt}
            onReset={() => {
              void overview.refetch();
            }}
          />
        </div>
      ) : null}
      {[
        {
          key: 'archive',
          title: 'Champion Archive',
          text: 'One champion, six guesses. Five clue types drawn for each new case. Follow the evidence.',
          art: 'Ahri',
          credit: 'LoLdle',
          url: 'https://loldle.net/',
        },
        {
          key: 'shopkeeper',
          title: 'Shopkeeper',
          text: 'Know your shop? Compare two items and decide whether the hidden price is higher or lower. Six comparisons, one daily score.',
          art: 'Ornn',
          credit: 'Riot Games item data',
          url: 'https://developer.riotgames.com/docs/lol#data-dragon_items',
        },
        {
          key: 'recipe-rush',
          title: 'Recipe Rush',
          text: 'Three recipes. One forge. Drag the right ingredients into place and craft items from memory.',
          art: '',
          credit: 'Riot Games item data',
          url: 'https://developer.riotgames.com/docs/lol#data-dragon_items',
        },
        {
          key: 'soundcheck',
          title: 'Soundcheck',
          text: 'You’ve heard it a thousand times. Can you name the champion from their ability sounds?',
          art: 'Thresh',
          credit: 'League of Listen',
          url: 'https://lynge.tv/listen/',
        },
      ].map((game) => {
        const state = overview.data?.games.find((g) => g.key === game.key);
        return (
          <article className="essence-game-feature" key={game.key}>
            <Image
              className="essence-game-art"
              src={
                game.key === 'recipe-rush'
                  ? '/assets/games/recipe-forge.png'
                  : `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${game.art}_0.jpg`
              }
              width={640}
              height={380}
              sizes="(max-width: 720px) 100vw, 560px"
              priority={game.key === 'archive'}
              unoptimized={game.key === 'recipe-rush'}
              alt={
                game.key === 'recipe-rush'
                  ? 'The Recipe Rush forge'
                  : `${game.art} artwork by Riot Games`
              }
            />
            <div className="essence-game-intro">
              <h2>{game.title}</h2>
              <p>{game.text}</p>
              <Link className="essence-button" href={`/games/${game.key}`}>
                {state?.round?.finished
                  ? 'View today’s result'
                  : state?.round
                  ? 'Continue puzzle'
                  : 'Play today’s puzzle'}
              </Link>
              <p className="essence-small">
                {state ? `Up to ${state.reward} PE per daily round · ` : ''}Practice rounds
                available
              </p>
              <p className="essence-small">
                {['shopkeeper', 'recipe-rush'].includes(game.key) ? 'Powered by ' : 'Inspired by '}
                <a href={game.url} target="_blank" rel="noopener noreferrer">
                  {game.credit}
                </a>
                .
              </p>
            </div>
          </article>
        );
      })}
      <p className="essence-credit">
        Daily rewards are awarded once per game, within your daily cap. Practice is free and earns
        no PE. Champion artwork and ability audio © Riot Games. RiftEssence is not affiliated with
        Riot Games, LoLdle, or League of Listen.
      </p>
    </EconomyLayout>
  );
}
