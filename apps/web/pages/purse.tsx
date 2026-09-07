import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import EconomyLayout, {
  EconomyError,
  EconomyLoading,
  SignInPrompt,
} from '../components/economy/EconomyLayout';
import CosmeticPreview from '../components/economy/CosmeticPreview';
import {
  economyApi,
  GamesOverview,
  LedgerEntry,
  pe,
  Quest,
  Shop,
  WalletSummary,
  walletChanged,
} from '../utils/economy';

export default function WalletPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const enabled = Boolean(user);
  const summary = useQuery(
    ['economy', user?.id, 'summary'],
    ({ signal }) => economyApi<WalletSummary>('/wallet/summary', { signal }),
    { enabled },
  );
  const quests = useQuery(
    ['economy', user?.id, 'quests'],
    ({ signal }) => economyApi<{ quests: Quest[] }>('/wallet/quests', { signal }),
    { enabled },
  );
  const shop = useQuery(
    ['economy', user?.id, 'shop'],
    ({ signal }) => economyApi<Shop>('/wallet/cosmetics', { signal }),
    { enabled },
  );
  const games = useQuery(
    ['economy', user?.id, 'games'],
    ({ signal }) => economyApi<GamesOverview>('/games', { signal }),
    { enabled },
  );
  const ledger = useQuery(
    ['economy', user?.id, 'ledger', offset],
    ({ signal }) =>
      economyApi<{ transactions: LedgerEntry[]; total: number }>(
        `/wallet/transactions?limit=10&offset=${offset}`,
        { signal },
      ),
    { enabled, keepPreviousData: true },
  );
  const nextUnlock = shop.data?.items
    .filter((item) => !item.owned)
    .sort((a, b) => a.costPrismaticEssence - b.costPrismaticEssence)[0];
  const daily = quests.data?.quests.filter((quest) => quest.repeatWindow === 'DAILY') || [];
  const milestones = quests.data?.quests.filter((quest) => quest.repeatWindow === 'ONE_TIME') || [];
  const claim = async (quest: Quest) => {
    if (claiming) return;
    setClaiming(quest.key);
    setActionError(null);
    setNotice('');
    try {
      const result = await economyApi<{ rewardPrismaticEssence: number }>(
        `/wallet/quests/${quest.key}/claim`,
        { method: 'POST', body: '{}' },
      );
      setNotice(`${quest.title} completed. +${pe(result.rewardPrismaticEssence)} PE`);
      await queryClient.invalidateQueries(['economy', user?.id]);
      walletChanged();
    } catch (error) {
      setActionError(error);
    } finally {
      setClaiming(null);
    }
  };
  const questRow = (quest: Quest) => (
    <div className="essence-challenge" key={quest.key}>
      <div className="essence-challenge-copy">
        <strong>{quest.title}</strong>
        <p>{quest.available ? quest.description : quest.reason || quest.description}</p>
      </div>
      <span className="essence-amount">{pe(quest.rewardPrismaticEssence)} PE</span>
      <button
        className="essence-button essence-secondary"
        disabled={!quest.available || Boolean(claiming)}
        onClick={() => claim(quest)}
      >
        {claiming === quest.key
          ? 'Claiming…'
          : quest.completed || quest.nextClaimAt
          ? 'Claimed'
          : 'Claim'}
      </button>
    </div>
  );
  return (
    <EconomyLayout title="Your wallet." description="A little progress, every day.">
      {loading ? (
        <EconomyLoading />
      ) : !user ? (
        <SignInPrompt />
      ) : (
        <>
          <EconomyError error={summary.error} retry={() => summary.refetch()} />
          <EconomyError error={actionError} />
          {notice ? (
            <div className="essence-notice essence-success" role="status">
              {notice}
            </div>
          ) : null}
          {summary.isLoading ? (
            <EconomyLoading />
          ) : summary.data ? (
            <div className="essence-balance">
              <div>
                <div className="essence-number">
                  {pe(summary.data.wallet.prismaticEssence)}
                  <small>PE</small>
                </div>
                <small className="essence-muted">
                  Prismatic Essence · yours to collect and spend
                </small>
              </div>
              <Link className="essence-button essence-secondary" href="/cosmetics">
                Browse collection
              </Link>
            </div>
          ) : null}
          <div className="essence-columns essence-section">
            <section className="essence-panel">
              <div className="essence-section-head">
                <h2>Today’s challenges</h2>
                <span className="essence-muted essence-small">Resets at 00:00 UTC</span>
              </div>
              <EconomyError error={quests.error} retry={() => quests.refetch()} />
              {quests.isLoading ? <EconomyLoading /> : daily.map(questRow)}
              <EconomyError error={games.error} retry={() => games.refetch()} />
              {games.data?.games.map((game) => (
                <div className="essence-challenge" key={game.key}>
                  <div className="essence-challenge-copy">
                    <strong>{game.title}</strong>
                    <p>
                      {game.round?.finished
                        ? game.round.won
                          ? game.round.rewardPaid > 0
                            ? 'Solved. Your reward is in your wallet.'
                            : 'Solved. No PE was awarded for this round.'
                          : 'Daily round complete. Practice is still open.'
                        : game.key === 'archive'
                        ? 'Guess the champion from a trail of clues.'
                        : 'Name the champion from their ability sounds.'}
                    </p>
                  </div>
                  <span className="essence-amount">
                    {pe(
                      game.round?.finished
                        ? game.round.rewardPaid
                        : game.round?.rewardOffer ?? game.reward,
                    )}{' '}
                    PE
                  </span>
                  <Link className="essence-button essence-secondary" href={`/games/${game.key}`}>
                    {game.round?.finished ? 'View' : 'Play'}
                  </Link>
                </div>
              ))}
              {games.data ? (
                <p className="essence-muted essence-small">
                  Daily game rewards: {pe(games.data.earnedToday)} / {pe(games.data.dailyCap)} PE
                </p>
              ) : null}
            </section>
            <section className="essence-panel essence-next-unlock">
              <h2>Next unlock</h2>
              <EconomyError error={shop.error} retry={() => shop.refetch()} />
              {shop.isLoading ? (
                <EconomyLoading />
              ) : nextUnlock ? (
                <>
                  <CosmeticPreview item={nextUnlock} username={user.username} />
                  <h3>{nextUnlock.title.replace('Name Font: ', '').replace('Username: ', '')}</h3>
                  <p className="essence-amount">{pe(nextUnlock.costPrismaticEssence)} PE</p>
                  <Link className="essence-button essence-secondary" href="/cosmetics">
                    View in collection
                  </Link>
                </>
              ) : shop.data ? (
                <div className="essence-empty">
                  You’ve collected everything. Enjoy your loadout.
                </div>
              ) : null}
              {summary.data ? (
                <div className="essence-section">
                  <div className="essence-section-head">
                    <span className="essence-small">Level {summary.data.progression.level}</span>
                    <span className="essence-muted essence-small">
                      {pe(summary.data.progression.currentProgress)} / 1,000 XP
                    </span>
                  </div>
                  <progress
                    className="essence-progress"
                    value={summary.data.progression.currentProgress}
                    max={1000}
                    aria-label="Progress to next level"
                  />
                  <p className="essence-muted essence-small">
                    Earn XP through challenges and daily games.
                  </p>
                </div>
              ) : null}
            </section>
          </div>
          <details className="essence-onboarding">
            <summary>
              Getting started · {milestones.filter((q) => q.completed).length} of{' '}
              {milestones.length} milestones collected
            </summary>
            {milestones.map(questRow)}
          </details>
          <section className="essence-panel essence-section">
            <div className="essence-section-head">
              <h2>Recent activity</h2>
              {summary.data ? (
                <span className="essence-muted essence-small">
                  {pe(summary.data.wallet.totalPrismaticEarned)} earned ·{' '}
                  {pe(summary.data.wallet.totalPrismaticSpent)} spent, all time
                </span>
              ) : null}
            </div>
            <EconomyError error={ledger.error} retry={() => ledger.refetch()} />
            {ledger.isLoading ? (
              <EconomyLoading />
            ) : ledger.data?.transactions.length ? (
              <>
                <div className="essence-table-scroll">
                  <table className="essence-table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Date</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.data.transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td>{tx.note || tx.type.replace(/_/g, ' ')}</td>
                          <td>
                            <time dateTime={tx.createdAt}>
                              {new Date(tx.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </time>
                          </td>
                          <td
                            className={`essence-amount ${
                              tx.amount >= 0 ? 'essence-positive' : 'essence-negative'
                            }`}
                          >
                            {tx.amount > 0 ? '+' : ''}
                            {pe(tx.amount)} {tx.currency === 'RIFT_COINS' ? 'legacy RC' : 'PE'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="essence-pagination">
                  <button
                    className="essence-text-button"
                    disabled={offset === 0 || ledger.isFetching}
                    onClick={() => setOffset(Math.max(0, offset - 10))}
                  >
                    Previous
                  </button>
                  <span className="essence-muted essence-small">
                    {offset + 1}–{Math.min(offset + 10, ledger.data.total)} of {ledger.data.total}
                  </span>
                  <button
                    className="essence-text-button"
                    disabled={offset + 10 >= ledger.data.total || ledger.isFetching}
                    onClick={() => setOffset(offset + 10)}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : !ledger.error ? (
              <p className="essence-empty">Your first reward will appear here.</p>
            ) : null}
          </section>
        </>
      )}
    </EconomyLayout>
  );
}
