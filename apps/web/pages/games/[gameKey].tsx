import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ArchiveBoard from '../../components/economy/ArchiveBoard';
import { EffectsToggle, RewardCount, useGameEffects } from '../../components/economy/GameEffects';
import { useAuth } from '../../contexts/AuthContext';
import EconomyLayout, {
  EconomyError,
  EconomyLoading,
  SignInPrompt,
} from '../../components/economy/EconomyLayout';
import ChampionSearch from '../../components/economy/ChampionSearch';
import AbilityPlayer from '../../components/economy/AbilityPlayer';
import PuzzleCountdown from '../../components/economy/PuzzleCountdown';
import ShopkeeperGame from '../../components/economy/ShopkeeperGame';
import RecipeRushGame from '../../components/economy/RecipeRushGame';
import GameLinks from '../../components/economy/GameLinks';
import { economyApi, GameRound, pe, walletChanged } from '../../utils/economy';

export default function DailyGamePage() {
  const router = useRouter();
  if (router.query.gameKey === 'recipe-rush') return <RecipeRushGame />;
  return router.query.gameKey === 'shopkeeper' ? <ShopkeeperGame /> : <ChampionGamePage />;
}

function ChampionGamePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const client = useQueryClient();
  const effects = useGameEffects();
  const gameKey = typeof router.query.gameKey === 'string' ? router.query.gameKey : '';
  const valid = gameKey === 'archive' || gameKey === 'soundcheck';
  const title = gameKey === 'soundcheck' ? 'Soundcheck.' : 'Champion Archive.';
  const key = ['economy', user?.id, 'round', gameKey];
  const [practice, setPractice] = useState<GameRound | null>(null);
  const [busy, setBusy] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const catalog = useQuery(
    ['game-catalog'],
    ({ signal }) =>
      economyApi<{ version: string; champions: { id: string; name: string }[] }>('/games/catalog', {
        signal,
      }),
    { staleTime: 86400000 },
  );
  const daily = useQuery(
    key,
    () => economyApi<GameRound>(`/games/${gameKey}/start`, { method: 'POST', body: '{}' }),
    { enabled: Boolean(user && valid), staleTime: 60000, retry: false },
  );
  useEffect(() => {
    setPractice(null);
    setError(null);
    setConfirmGiveUp(false);
  }, [user?.id, gameKey]);
  const round = practice?.gameKey === gameKey ? practice : daily.data;
  const submit = async (championId?: string, giveUp = false) => {
    if (!round || busy || audioBusy) return;
    setBusy(true);
    setError(null);
    setConfirmGiveUp(false);
    try {
      const next = await economyApi<GameRound>(`/games/rounds/${round.id}/guess`, {
        method: 'POST',
        body: JSON.stringify({ championId, giveUp }),
      });
      effects.play(
        next.finished ? (next.won ? 'win' : 'miss') : gameKey === 'archive' ? 'stamp' : 'miss',
        next.attempts[next.attempts.length - 1]?.clues.map((clue) => clue.match),
      );
      if (next.practice) setPractice(next);
      else client.setQueryData(key, next);
      if (next.finished) {
        await client.invalidateQueries(['economy', user?.id, 'games']);
        await client.invalidateQueries(['economy', user?.id, 'summary']);
        walletChanged();
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const startPractice = async () => {
    setBusy(true);
    setError(null);
    setConfirmGiveUp(false);
    try {
      setPractice(
        await economyApi<GameRound>(`/games/${gameKey}/start`, {
          method: 'POST',
          body: '{"practice":true}',
        }),
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  if (router.isReady && !valid)
    return (
      <EconomyLayout
        title="Puzzle not found."
        description="Choose a game from the daily collection."
      >
        <Link className="essence-button" href="/games">
          Browse games
        </Link>
      </EconomyLayout>
    );
  return (
    <EconomyLayout
      title={title}
      description={
        gameKey === 'soundcheck'
          ? 'Recognize the ability. Name the champion.'
          : 'Six guesses. One champion. Follow the clues.'
      }
      aside={
        round ? (
          <div className="essence-game-reward">
            <span className="essence-muted essence-small">
              {round.practice
                ? 'Practice round'
                : round.finished
                ? 'Reward earned'
                : 'Today’s reward'}
            </span>
            <div className="essence-number">
              {pe(round.finished ? round.rewardPaid : round.rewardAvailable)}
              <small>PE</small>
            </div>
          </div>
        ) : null
      }
    >
      {loading ? (
        <EconomyLoading />
      ) : !user ? (
        <SignInPrompt />
      ) : (
        <>
          <EconomyError error={daily.error} retry={() => daily.refetch()} />
          <EconomyError error={catalog.error} retry={() => catalog.refetch()} />
          <EconomyError
            error={error}
            retry={async () => {
              setError(null);
              setPractice(null);
              await daily.refetch();
            }}
          />
          {daily.isLoading || catalog.isLoading ? (
            <EconomyLoading />
          ) : round && catalog.data ? (
            <>
              <div className="essence-section-head">
                <Link className="essence-muted" href="/games">
                  All games
                </Link>
                <span className="essence-muted essence-small">
                  {round.practice ? (
                    'Practice · no PE rewards'
                  ) : (
                    <PuzzleCountdown
                      resetAt={new Date(
                        Date.parse(`${round.day}T00:00:00Z`) + 86400000,
                      ).toISOString()}
                      onReset={() => {
                        void daily.refetch();
                      }}
                    />
                  )}
                </span>
              </div>
              <section
                className={`essence-board game-champion-stage ${gameKey}`}
                aria-label={title}
              >
                <div className="game-effects-bar">
                  <EffectsToggle {...effects} />
                </div>
                {round.finished && round.answer ? (
                  <div
                    className={`game-champion-reveal ${round.won ? 'solved' : 'unsolved'}`}
                    key={`reveal-${round.id}`}
                    role="status"
                  >
                    <Image
                      src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${round.answer.id}_0.jpg`}
                      width={640}
                      height={380}
                      sizes="(max-width: 720px) 100vw, 480px"
                      alt={round.answer.name}
                    />
                    <div>
                      <span className="essence-muted essence-small">
                        {round.won
                          ? `Solved in ${round.attempts.length} ${
                              round.attempts.length === 1 ? 'guess' : 'guesses'
                            }.`
                          : 'The champion was…'}
                      </span>
                      <h2>{round.answer.name}</h2>
                      <div className="game-reward-count">
                        <RewardCount value={round.rewardPaid} />
                      </div>
                      <p>{round.answer.title}</p>
                      {round.rewardPaid > 0 ? (
                        <p className="essence-positive">
                          +{round.rewardPaid} PE added to your wallet.
                        </p>
                      ) : (
                        <p className="essence-small">
                          {round.practice
                            ? 'Practice round complete.'
                            : round.won
                            ? 'Solved. No PE was awarded for this round.'
                            : 'No PE lost. There’s a new puzzle tomorrow.'}
                        </p>
                      )}
                      <button
                        className="essence-button essence-secondary"
                        onClick={startPractice}
                        disabled={busy}
                      >
                        {busy ? 'Starting…' : 'Play a practice round'}
                      </button>
                      <GameLinks current={gameKey} />
                    </div>
                  </div>
                ) : null}
                {gameKey === 'soundcheck' ? (
                  <AbilityPlayer
                    round={round}
                    key={`audio-${round.id}`}
                    disabled={busy}
                    onBusyChange={setAudioBusy}
                    onListened={(slot) => {
                      const update = (current: GameRound | undefined) => {
                        if (
                          !current ||
                          current.id !== round.id ||
                          current.finished ||
                          current.listenedSlots.includes(slot)
                        )
                          return current;
                        const listenedSlots = [...current.listenedSlots, slot];
                        return {
                          ...current,
                          listenedSlots,
                          rewardAvailable: Math.max(
                            0,
                            current.rewardOffer - Math.max(0, listenedSlots.length - 1) * 10,
                          ),
                        };
                      };
                      if (round.practice)
                        setPractice((current) => update(current || undefined) || null);
                      else client.setQueryData<GameRound>(key, update);
                    }}
                  />
                ) : null}
                {!round.practice && !round.finished ? (
                  <p className="essence-reward-rule essence-muted essence-small">
                    {gameKey === 'archive'
                      ? 'Each guess after your first reduces the reward by 10 PE.'
                      : 'The first ability is free. Each new ability after it reduces the reward by 10 PE; replays are free.'}{' '}
                    Rewards never fall below 0 PE.
                  </p>
                ) : null}
                {!round.finished ? (
                  <ChampionSearch
                    key={`search-${round.id}`}
                    champions={catalog.data.champions}
                    excluded={round.attempts.map((a) => a.champion.id)}
                    version={catalog.data.version}
                    disabled={busy || audioBusy}
                    onGuess={(id) => submit(id)}
                  />
                ) : null}
                {gameKey === 'archive' ? (
                  <ArchiveBoard
                    key={`board-${round.id}`}
                    round={round}
                    champions={catalog.data.champions}
                    version={catalog.data.version}
                    userId={user.id}
                  />
                ) : round.attempts.length ? (
                  <ol className="sound-guesses" aria-label="Your guesses">
                    {round.attempts.map((attempt) => (
                      <li key={attempt.champion.id} className={attempt.correct ? 'correct' : ''}>
                        <Image
                          src={`https://ddragon.leagueoflegends.com/cdn/${
                            catalog.data!.version
                          }/img/champion/${attempt.champion.id}.png`}
                          width={40}
                          height={40}
                          alt=""
                          unoptimized
                        />
                        <span>{attempt.champion.name}</span>
                        <strong>{attempt.correct ? '✓ Identified' : '× Not this champion'}</strong>
                      </li>
                    ))}
                  </ol>
                ) : null}
                <div className="essence-attempts">
                  <span className="essence-attempt-dots" aria-hidden="true">
                    {Array.from({ length: 6 }, (_, i) => (
                      <span
                        key={i}
                        className={`essence-attempt-dot ${i < round.attempts.length ? 'used' : ''}`}
                      />
                    ))}
                  </span>
                  <span aria-live="polite">
                    {round.attempts.length} of {round.maxGuesses} guesses
                  </span>
                  {!round.finished ? (
                    <button
                      className="essence-text-button"
                      disabled={busy}
                      onClick={() => setConfirmGiveUp(true)}
                    >
                      Reveal answer
                    </button>
                  ) : null}
                </div>
                {confirmGiveUp ? (
                  <div className="essence-notice">
                    <p>Reveal the answer and finish this round without a reward?</p>
                    <div className="essence-form-actions">
                      <button
                        className="essence-button essence-secondary"
                        disabled={busy}
                        onClick={() => submit(undefined, true)}
                      >
                        Reveal answer
                      </button>
                      <button
                        className="essence-text-button"
                        onClick={() => setConfirmGiveUp(false)}
                      >
                        Keep guessing
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
              {round.practice ? (
                <button
                  className="essence-text-button essence-section"
                  onClick={() => {
                    setPractice(null);
                    setConfirmGiveUp(false);
                    setError(null);
                  }}
                >
                  Back to today’s result
                </button>
              ) : null}
            </>
          ) : null}
        </>
      )}
      <p className="essence-credit">
        {gameKey === 'soundcheck' ? (
          <>
            Inspired by{' '}
            <a href="https://lynge.tv/listen/" target="_blank" rel="noopener noreferrer">
              League of Listen by Lynge
            </a>
            . Ability audio from Riot Games’ champion demonstrations.
          </>
        ) : (
          <>
            Inspired by{' '}
            <a href="https://loldle.net/" target="_blank" rel="noopener noreferrer">
              LoLdle
            </a>
            . Champion data and artwork from Riot Games.
          </>
        )}{' '}
        An independent RiftEssence game.
      </p>
    </EconomyLayout>
  );
}
