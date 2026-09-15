import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiArrowDown, FiArrowUp } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { economyApi, pe, walletChanged } from '../../utils/economy';
import EconomyLayout, { EconomyError, EconomyLoading, SignInPrompt } from './EconomyLayout';
import PuzzleCountdown from './PuzzleCountdown';
import GameLinks from './GameLinks';
import PriceCard from './PriceCard';
import { EffectsToggle, RewardCount, useGameEffects } from './GameEffects';

type Item = { id: string; name: string; imageUrl: string; price?: number; tier?: string };
type Comparison = {
  reference: Item;
  challenger: Item;
  choice: string;
  direction: string;
  correct: boolean;
};
type Round = {
  id: string;
  day: string;
  practice: boolean;
  finished: boolean;
  won: boolean;
  rewardOffer: number;
  rewardAvailable: number;
  rewardPaid: number;
  version: string;
  score: number;
  total: number;
  index: number;
  current: { reference: Item; challenger: Item } | null;
  history: Comparison[];
};

function ItemCard({
  item,
  hidden = false,
  label,
}: {
  item: Item;
  hidden?: boolean;
  label: string;
}) {
  return (
    <article className={`essence-item-price-card ${hidden ? 'mystery' : ''}`}>
      <p className="essence-muted essence-small">{label}</p>
      <p className="price-tier">{item.tier}</p>
      <Image src={item.imageUrl} width={96} height={96} alt={item.name} unoptimized />
      <h2>{item.name}</h2>
      <p className="essence-item-gold">
        {hidden ? '???' : pe(item.price!)} <span>gold</span>
      </p>
    </article>
  );
}

export default function ShopkeeperGame() {
  const { user, loading } = useAuth();
  const client = useQueryClient();
  const effects = useGameEffects();
  const key = ['economy', user?.id, 'round', 'shopkeeper'];
  const [practice, setPractice] = useState<Round | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [revealed, setRevealed] = useState<number | null>(null);
  const daily = useQuery(
    key,
    () => economyApi<Round>('/games/shopkeeper/start', { method: 'POST', body: '{}' }),
    { enabled: Boolean(user), staleTime: 60000, retry: false },
  );
  useEffect(() => {
    setPractice(null);
    setRevealed(null);
    setError(null);
  }, [user?.id]);
  const round = practice || daily.data;
  const feedback = revealed !== null ? round?.history[revealed] : null;
  const comparison = feedback || round?.current;
  const choose = async (choice: 'higher' | 'lower') => {
    if (!round || busy || feedback || round.finished) return;
    setBusy(true);
    setError(null);
    try {
      const next = await economyApi<Round>(`/games/rounds/${round.id}/price`, {
        method: 'POST',
        body: JSON.stringify({ index: round.index, choice }),
      });
      if (next.practice) setPractice(next);
      else client.setQueryData(key, next);
      setRevealed(round.index);
      effects.play(next.history[round.index]?.correct ? 'coin' : 'miss');
      if (next.finished) {
        await Promise.all([
          client.invalidateQueries(['economy', user?.id, 'games']),
          client.invalidateQueries(['economy', user?.id, 'summary']),
        ]);
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
    try {
      setPractice(
        await economyApi<Round>('/games/shopkeeper/start', {
          method: 'POST',
          body: '{"practice":true}',
        }),
      );
      setRevealed(null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <EconomyLayout
      title="Shopkeeper."
      description="Two items. One hidden price. Trust your shop knowledge."
      aside={
        round ? (
          <div className="essence-game-reward">
            <span className="essence-muted essence-small">
              {round.practice ? 'Practice · no PE' : round.finished ? 'Reward earned' : 'Up to'}
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
          <EconomyError
            error={error || daily.error}
            retry={() => {
              setError(null);
              void daily.refetch();
            }}
          />
          {daily.isLoading ? (
            <EconomyLoading />
          ) : round ? (
            <>
              <div className="essence-section-head">
                <Link href="/games" className="essence-muted">
                  All games
                </Link>
                <PuzzleCountdown
                  resetAt={
                    round.practice
                      ? undefined
                      : new Date(Date.parse(`${round.day}T00:00:00Z`) + 86400000).toISOString()
                  }
                  onReset={() => {
                    setRevealed(null);
                    void daily.refetch();
                  }}
                />
              </div>
              <section className="essence-board essence-shopkeeper" aria-label="Item price game">
                <div className="game-stage-title">
                  <div>
                    <span>THE SHOP COUNTER</span>
                    <h2>Trust your shop knowledge.</h2>
                  </div>
                  <EffectsToggle {...effects} />
                </div>
                <div className="essence-section-head">
                  <span className="essence-muted essence-small">
                    {round.finished
                      ? 'Round complete'
                      : `Comparison ${Math.min(round.total, (revealed ?? round.index) + 1)} of ${
                          round.total
                        }`}
                  </span>
                  <strong>
                    {round.score} / {round.total} correct
                  </strong>
                </div>
                <p className="essence-muted essence-small">
                  Total shop prices · Patch {round.version}.{' '}
                  {comparison?.reference.tier ? 'Same tier. Different prices.' : 'Saved round.'}
                </p>
                <ol className="shop-coin-tray" aria-label="Your six comparisons">
                  {Array.from({ length: round.total }, (_, i) => (
                    <li
                      key={i}
                      className={
                        round.history[i]
                          ? round.history[i].correct
                            ? 'coin-earned'
                            : 'coin-cracked'
                          : 'coin-empty'
                      }
                      aria-label={`Comparison ${i + 1}: ${
                        round.history[i]
                          ? round.history[i].correct
                            ? 'correct'
                            : 'incorrect'
                          : 'unanswered'
                      }`}
                    >
                      <span aria-hidden="true">
                        {round.history[i] ? (round.history[i].correct ? '✦' : '×') : i + 1}
                      </span>
                    </li>
                  ))}
                </ol>
                {comparison ? (
                  <>
                    <div
                      className="essence-item-comparison shop-counter"
                      key={`${round.id}-${revealed ?? round.index}`}
                    >
                      <ItemCard item={comparison.reference} label="The price you know" />
                      <span className="essence-item-versus" aria-hidden="true">
                        vs
                      </span>
                      <PriceCard
                        item={comparison.challenger}
                        hidden={!feedback}
                        disabled={busy}
                        onChoose={choose}
                      />
                    </div>
                    {feedback ? (
                      <div
                        className={`essence-notice ${feedback.correct ? 'essence-success' : ''}`}
                        role="status"
                      >
                        <strong>{feedback.correct ? 'Correct!' : 'Not quite.'}</strong>
                        <p>
                          {feedback.challenger.name} costs {pe(feedback.challenger.price!)} gold —{' '}
                          {feedback.direction === 'higher' ? 'more' : 'less'} than{' '}
                          {feedback.reference.name} at {pe(feedback.reference.price!)} gold.
                        </p>
                        <button
                          className="essence-button"
                          disabled={busy}
                          onClick={() => {
                            setRevealed(null);
                            if (round.finished) effects.play('win');
                          }}
                        >
                          {round.finished ? 'See results' : 'Next comparison →'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="essence-item-question">
                          Does <strong>{comparison.challenger.name}</strong> cost more or less than{' '}
                          <strong>{comparison.reference.name}</strong>?
                        </p>
                        <div className="essence-price-choices">
                          <button
                            className="essence-button essence-secondary price-lower"
                            disabled={busy}
                            onClick={() => choose('lower')}
                          >
                            <FiArrowDown aria-hidden="true" /> Lower
                          </button>
                          <button
                            className="essence-button price-higher"
                            disabled={busy}
                            onClick={() => choose('higher')}
                          >
                            <FiArrowUp aria-hidden="true" />
                            Higher
                          </button>
                        </div>
                        {busy ? (
                          <p role="status" className="essence-muted essence-small">
                            Checking price…
                          </p>
                        ) : null}
                      </>
                    )}
                  </>
                ) : null}
                {round.finished && !feedback ? (
                  <div className="essence-empty shop-finale" role="status">
                    <h2>{round.won ? 'You know your shop.' : 'That’s a wrap.'}</h2>
                    <p>
                      You got {round.score} of {round.total} comparisons right.
                    </p>
                    <div className="game-reward-count">
                      <RewardCount value={round.rewardPaid} />
                    </div>
                    <p>
                      {round.practice
                        ? 'Practice complete — no PE rewards.'
                        : round.rewardPaid > 0
                        ? `+${round.rewardPaid} PE added to your wallet.`
                        : 'No PE awarded. Try a practice round and come back tomorrow.'}
                    </p>
                    <button className="essence-button" disabled={busy} onClick={startPractice}>
                      {busy ? 'Starting…' : 'Play a practice round'}
                    </button>
                    <GameLinks current="shopkeeper" />
                  </div>
                ) : null}
                {!round.practice ? (
                  <p className="essence-muted essence-small essence-section">
                    Earn a share of {round.rewardOffer} PE for each correct answer, paid when all{' '}
                    {round.total} comparisons are complete, within your shared daily game cap. Wrong
                    answers never cost PE.
                  </p>
                ) : null}
              </section>
              {round.history.length > 0 ? (
                <section className="essence-section">
                  <h2>Your comparisons</h2>
                  <ol className="essence-price-history">
                    {round.history.map((result, i) => (
                      <li key={i}>
                        <span>
                          {result.correct ? '✓' : '×'}{' '}
                          <span className="sr-only">
                            {result.correct ? 'Correct' : 'Incorrect'}
                          </span>
                        </span>
                        <div>
                          <strong>{result.reference.name}</strong> ({pe(result.reference.price!)}{' '}
                          gold)
                          <br />
                          <strong>{result.challenger.name}</strong> ({pe(result.challenger.price!)}{' '}
                          gold)
                        </div>
                        <span className="essence-muted essence-small">
                          You chose {result.choice}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}
              {round.practice ? (
                <button
                  className="essence-text-button essence-section"
                  disabled={busy}
                  onClick={() => {
                    setPractice(null);
                    setRevealed(null);
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
        Item data and artwork © Riot Games. Prices use the displayed patch and exclude upgrade-only
        costs. An independent RiftEssence game.
      </p>
    </EconomyLayout>
  );
}
