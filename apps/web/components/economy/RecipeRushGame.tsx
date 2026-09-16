import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiClock, FiEye, FiPlay } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { economyApi, pe, walletChanged } from '../../utils/economy';
import { RecipeAction, RecipeRound } from '../../utils/recipeRush';
import EconomyLayout, { EconomyError, EconomyLoading, SignInPrompt } from './EconomyLayout';
import PuzzleCountdown from './PuzzleCountdown';
import { EffectsToggle, RewardCount, useGameEffects } from './GameEffects';
import GameLinks from './GameLinks';
import RecipeTray from './RecipeTray';

function RecipeTimer({
  deadlineAt,
  serverTime,
  onExpire,
}: {
  deadlineAt: string;
  serverTime: string;
  onExpire: () => void;
}) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const callback = useRef(onExpire);
  callback.current = onExpire;
  useEffect(() => {
    const offset = Date.parse(serverTime) - Date.now();
    let lastExpiryAttempt = 0;
    const tick = () => {
      const left = Math.max(0, Math.ceil((Date.parse(deadlineAt) - Date.now() - offset) / 1000));
      setSeconds(left);
      if (!left && Date.now() - lastExpiryAttempt >= 3000) {
        lastExpiryAttempt = Date.now();
        callback.current();
      }
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [deadlineAt, serverTime]);
  return (
    <span
      className={`recipe-timer ${seconds !== null && seconds <= 15 ? 'urgent' : ''}`}
      role="timer"
      aria-label={`${seconds ?? 90} seconds left`}
    >
      <FiClock aria-hidden="true" />{' '}
      {seconds === null
        ? '1:30'
        : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
    </span>
  );
}

export default function RecipeRushGame() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const mode =
    router.query.practice === 'timed'
      ? 'timed'
      : router.query.practice === 'free'
      ? 'free'
      : 'daily';
  const client = useQueryClient();
  const key = ['economy', user?.id, 'round', 'recipe-rush', mode];
  const effects = useGameEffects();
  const forge = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [revealConfirm, setRevealConfirm] = useState(false);
  const query = useQuery(
    key,
    () =>
      economyApi<RecipeRound>('/games/recipe-rush/start', {
        method: 'POST',
        body: JSON.stringify({ practice: mode !== 'daily', timedPractice: mode === 'timed' }),
      }),
    {
      enabled: !!user && router.isReady,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );
  const round = query.data;
  useEffect(() => {
    setRevealed(null);
    setError(null);
    setMessage('');
    setRevealConfirm(false);
  }, [user?.id, mode, round?.id]);
  const feedback = revealed === null ? null : round?.history[revealed];
  const current = round?.current;
  const target = feedback?.target || current?.target;
  const finishedView = round?.finished && !feedback;
  const slotItems = feedback?.ingredients || current?.accepted.map((p) => p.item) || [];
  const slots = feedback?.ingredients.length || current?.slots || 0;
  const activeIndex = revealed ?? round?.index ?? 0;

  const send = async (action: RecipeAction) => {
    if (!round || round.finished || inFlight.current || (feedback && action.action !== 'sync'))
      return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setRevealConfirm(false);
    try {
      const next = await economyApi<RecipeRound>(`/games/rounds/${round.id}/recipe`, {
        method: 'POST',
        body: JSON.stringify(action),
      });
      client.setQueryData(key, next);
      if (action.action === 'sync') {
        setRevealed(null);
        setMessage(
          next.finished ? 'Time is up. Your recipes are revealed below.' : 'Progress saved.',
        );
      } else if (next.history[round.index]) {
        setRevealed(round.index);
        const crafted = next.history[round.index].status === 'crafted';
        setMessage(
          crafted
            ? `${next.history[round.index].target.name} forged!`
            : 'Recipe revealed. This craft earns no PE.',
        );
        effects.play(crafted ? 'win' : 'miss');
      } else {
        const wrong = next.mistakes > round.mistakes;
        setMessage(
          wrong
            ? `Not in this recipe.${
                round.practice ? '' : ' Reward reduced by 10 PE, with a zero floor.'
              }`
            : 'Ingredient locked in.',
        );
        effects.play(wrong ? 'miss' : 'coin');
      }
      if (next.finished || next.rewardAvailable !== round.rewardAvailable) {
        await client.invalidateQueries(['economy', user?.id, 'games']);
      }
      if (next.finished) {
        await client.invalidateQueries(['economy', user?.id, 'summary']);
        walletChanged();
      }
    } catch (err) {
      setError(err);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const practice = async (timed: boolean) => {
    if (busy) return;
    setRevealed(null);
    setMessage('');
    setError(null);
    const nextMode = timed ? 'timed' : 'free';
    if (mode === nextMode) await query.refetch();
    else await router.push(`/games/recipe-rush?practice=${nextMode}`, undefined, { shallow: true });
  };
  return (
    <EconomyLayout
      title="Recipe Rush."
      description="Three recipes. One forge. Build it from memory."
      aside={
        round ? (
          <div className="essence-game-reward">
            <span className="essence-muted essence-small">
              {round.practice
                ? round.deadlineAt
                  ? 'Timed practice'
                  : 'Free practice'
                : round.finished
                ? 'Reward earned'
                : 'Available reward'}
            </span>
            <div className="essence-number">
              {pe(round.finished ? round.rewardPaid : round.rewardAvailable)} <small>PE</small>
            </div>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <EconomyLoading />
      ) : !user ? (
        <SignInPrompt />
      ) : (
        <>
          <EconomyError
            error={error || query.error}
            retry={() => {
              setError(null);
              setRevealed(null);
              void query.refetch();
            }}
          />
          {query.isLoading ? (
            <EconomyLoading />
          ) : round ? (
            <>
              <div className="essence-section-head">
                <Link href="/games" className="essence-muted">
                  ← All games
                </Link>
                {round.practice ? (
                  <Link className="essence-text-button" href="/games/recipe-rush">
                    Back to daily puzzle
                  </Link>
                ) : (
                  <PuzzleCountdown
                    resetAt={new Date(
                      Date.parse(`${round.day}T00:00:00Z`) + 86400000,
                    ).toISOString()}
                    onReset={() => {
                      setRevealed(null);
                      void query.refetch();
                    }}
                  />
                )}
              </div>
              <section
                className={`recipe-game ${feedback?.status === 'crafted' ? 'just-crafted' : ''}`}
                aria-label="Recipe Rush forge"
                aria-busy={busy}
              >
                <div className="recipe-toolbar">
                  <ol className="recipe-steps" aria-label="Recipe progress">
                    {['Simple', 'Skilled', 'Masterwork'].map((label, i) => (
                      <li
                        key={label}
                        className={
                          round.history[i]
                            ? round.history[i].status
                            : activeIndex === i
                            ? 'active'
                            : ''
                        }
                        aria-current={activeIndex === i ? 'step' : undefined}
                      >
                        <span aria-hidden="true">
                          {round.history[i]?.status === 'crafted' ? '✓' : i + 1}
                        </span>
                        <strong>{label}</strong>
                      </li>
                    ))}
                  </ol>
                  <div className="recipe-toolbar-tools">
                    {round.deadlineAt && !round.finished ? (
                      <RecipeTimer
                        deadlineAt={round.deadlineAt}
                        serverTime={round.serverTime}
                        onExpire={() => void send({ action: 'sync' })}
                      />
                    ) : null}
                    <EffectsToggle {...effects} />
                  </div>
                </div>
                {!finishedView && target ? (
                  <>
                    <div className="recipe-stage">
                      <Image
                        className="recipe-forge-art"
                        src="/assets/games/recipe-forge.png"
                        fill
                        sizes="(max-width: 800px) 100vw, 1120px"
                        alt=""
                        priority
                        unoptimized
                      />
                      <h2>
                        {feedback?.status === 'crafted'
                          ? 'Masterfully forged.'
                          : feedback
                          ? 'Study the recipe.'
                          : `Craft ${target.name}`}
                      </h2>
                      <div className="recipe-target" key={target.id}>
                        <Image
                          src={target.imageUrl}
                          width={88}
                          height={88}
                          alt={target.name}
                          unoptimized
                          draggable={false}
                        />
                        {feedback ? <strong>{target.name}</strong> : null}
                      </div>
                      <div
                        className="recipe-forge-drop"
                        ref={forge}
                        aria-label={`Forge: ${slotItems.length} of ${slots} ingredients placed`}
                      >
                        <div className="recipe-sockets">
                          {Array.from({ length: slots }, (_, i) => (
                            <div
                              key={`${target.id}-${i}`}
                              className={`recipe-socket ${slotItems[i] ? 'filled' : ''}`}
                            >
                              {slotItems[i] ? (
                                <>
                                  <Image
                                    src={slotItems[i].imageUrl}
                                    width={64}
                                    height={64}
                                    alt={slotItems[i].name}
                                    unoptimized
                                    draggable={false}
                                  />
                                  <span>{slotItems[i].name}</span>
                                </>
                              ) : (
                                <span aria-label={`Empty ingredient slot ${i + 1}`}>+</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="recipe-instruction">
                        {feedback
                          ? 'The direct ingredients. No combine gold needed.'
                          : 'Drag ingredients onto the forge. Or tap an item to add it.'}
                      </p>
                    </div>
                    <div className="recipe-workbench">
                      {feedback ? (
                        <div className={`recipe-complete ${feedback.status}`}>
                          <h3>
                            {feedback.status === 'crafted'
                              ? 'Another item, made by memory.'
                              : 'A recipe learned.'}
                          </h3>
                          <p>
                            {feedback.status === 'crafted'
                              ? `${
                                  feedback.mistakes
                                    ? `${feedback.mistakes} mistake${
                                        feedback.mistakes === 1 ? '' : 's'
                                      }`
                                    : 'Flawless craft'
                                }. ${round.crafted} of 3 items forged.`
                              : 'This revealed recipe earns no PE. Keep going with the next one.'}
                          </p>
                          <button
                            className="essence-button"
                            disabled={busy}
                            onClick={() => {
                              setRevealed(null);
                              setMessage('');
                            }}
                          >
                            {round.finished ? 'See results' : 'Next recipe →'}
                          </button>
                        </div>
                      ) : current ? (
                        <RecipeTray
                          key={`${round.id}-${round.index}`}
                          pieces={current.tray}
                          forge={forge}
                          disabled={busy}
                          onAdd={(pieceKey) =>
                            void send({ action: 'add', index: round.index, pieceKey })
                          }
                        />
                      ) : null}
                      <p className="recipe-status" role="status" aria-live="polite">
                        {busy
                          ? 'Working the forge…'
                          : message || 'The tray has everything you need, plus a few decoys.'}
                      </p>
                      <p className="recipe-rule">
                        {round.practice
                          ? 'Practice is free and earns no PE.'
                          : 'Wrong ingredients cost 10 PE. Repeated mistakes with the same piece are free.'}{' '}
                        Direct recipes · Patch {round.version}.
                      </p>
                      <div className="recipe-bottom-row">
                        {!feedback ? (
                          <div className="recipe-reveal">
                            {revealConfirm ? (
                              <>
                                <span>Reveal this recipe? It will earn no PE.</span>
                                <button
                                  className="essence-text-button"
                                  disabled={busy}
                                  onClick={() =>
                                    void send({ action: 'reveal', index: round.index })
                                  }
                                >
                                  Reveal it
                                </button>
                                <button
                                  className="essence-text-button"
                                  onClick={() => setRevealConfirm(false)}
                                >
                                  Keep forging
                                </button>
                              </>
                            ) : (
                              <button
                                className="essence-button essence-secondary"
                                disabled={busy}
                                onClick={() => setRevealConfirm(true)}
                              >
                                <FiEye aria-hidden="true" /> Reveal recipe
                              </button>
                            )}
                          </div>
                        ) : (
                          <span />
                        )}
                        <div className="recipe-craft-shelf" aria-label="Your crafts">
                          <strong>Your crafts</strong>
                          {[0, 1, 2].map((i) => (
                            <span key={i} className={round.history[i]?.status || ''}>
                              {round.history[i] ? (
                                <Image
                                  src={round.history[i].target.imageUrl}
                                  width={40}
                                  height={40}
                                  alt={`${round.history[i].target.name}: ${round.history[i].status}`}
                                  unoptimized
                                />
                              ) : (
                                <span aria-label={`Craft ${i + 1} pending`}>·</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="recipe-finale">
                    <h2>
                      {round.won
                        ? 'Your forge is full.'
                        : round.history.some((h) => h.status === 'timeout')
                        ? 'Time’s up. Keep the knowledge.'
                        : 'Every recipe is a lesson.'}
                    </h2>
                    <p>
                      {round.crafted} of 3 items forged · {round.mistakes} mistake
                      {round.mistakes === 1 ? '' : 's'}
                    </p>
                    <div className="game-reward-count">
                      <RewardCount value={round.rewardPaid} />
                    </div>
                    <p>
                      {round.practice
                        ? 'Practice complete. No PE awarded.'
                        : round.rewardPaid
                        ? `+${pe(round.rewardPaid)} PE added to your wallet.`
                        : 'No PE awarded. Rewards depend on crafts, mistakes, and the shared daily cap.'}
                    </p>
                    <div className="recipe-results">
                      {round.history.map((entry) => (
                        <article key={entry.target.id}>
                          <Image
                            src={entry.target.imageUrl}
                            width={64}
                            height={64}
                            alt=""
                            unoptimized
                          />
                          <h3>{entry.target.name}</h3>
                          <span className={`recipe-result-status ${entry.status}`}>
                            {entry.status === 'crafted'
                              ? '✓ Forged'
                              : entry.status === 'timeout'
                              ? 'Time ran out'
                              : 'Revealed'}
                          </span>
                          <p>{entry.ingredients.map((i) => i.name).join(' + ')}</p>
                        </article>
                      ))}
                    </div>
                    <GameLinks current="recipe-rush" />
                  </div>
                )}
              </section>
              <div className="recipe-practice-actions">
                <span>Keep your forge warm. Practice earns no PE.</span>
                <button
                  className="essence-button essence-secondary"
                  disabled={busy || query.isFetching}
                  onClick={() => void practice(false)}
                >
                  <FiPlay aria-hidden="true" />{' '}
                  {mode === 'free' && !round.finished ? 'Resume practice' : 'Practice'}
                </button>
                <button
                  className="essence-button essence-secondary"
                  disabled={busy || query.isFetching}
                  onClick={() => void practice(true)}
                >
                  <FiClock aria-hidden="true" /> 90-second challenge
                </button>
              </div>
              <p className="essence-credit">
                Item artwork and recipes © Riot Games. An independent RiftEssence game.
              </p>
            </>
          ) : null}
        </>
      )}
    </EconomyLayout>
  );
}
