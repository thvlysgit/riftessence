import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import EconomyLayout, {
  EconomyError,
  EconomyLoading,
} from '../../components/economy/EconomyLayout';
import {
  economyApi,
  EconomyOverview,
  EconomySettings,
  pe,
  walletChanged,
} from '../../utils/economy';

const fields: {
  key: keyof Omit<EconomySettings, 'gameRewardsEnabled' | 'version'>;
  label: string;
  max: number;
}[] = [
  { key: 'starterGrant', label: 'Welcome grant', max: 5000 },
  { key: 'dailyCheckin', label: 'Daily check-in', max: 500 },
  { key: 'dailySocial', label: 'Daily conversation', max: 500 },
  { key: 'championReward', label: 'Champion Archive', max: 500 },
  { key: 'soundReward', label: 'Soundcheck', max: 500 },
  { key: 'dailyGameCap', label: 'Daily game cap', max: 1000 },
];
const sourceLabels: Record<string, string> = {
  archive: 'Champion Archive',
  soundcheck: 'Soundcheck',
  quests: 'Challenges',
  welcome: 'Welcome grants',
  cosmetics: 'Cosmetics',
  adjustments: 'Admin adjustments',
  legacy_activity: 'Legacy activity',
};

export default function AdminEconomyPage() {
  const { user, loading } = useAuth();
  const admin = user?.badges?.some((b) => b.key.toLowerCase() === 'admin');
  const [days, setDays] = useState(30);
  const [draft, setDraft] = useState<EconomySettings | null>(null);
  const [settingsReason, setSettingsReason] = useState('');
  const [action, setAction] = useState('grant');
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState<unknown>(null);
  const operation = useRef<{ payload: string; key: string } | null>(null);
  const report = useQuery(
    ['economy-admin', user?.id, days],
    ({ signal }) => economyApi<EconomyOverview>(`/wallet/admin/economy?days=${days}`, { signal }),
    { enabled: Boolean(admin), refetchOnWindowFocus: false },
  );
  useEffect(() => {
    if (report.data?.settings && !draft) setDraft(report.data.settings);
  }, [report.data?.settings, draft]);
  const data = report.data;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || busy) return;
    setBusy('settings');
    setError(null);
    setNotice('');
    try {
      const result = await economyApi<{ settings: EconomySettings }>(
        '/wallet/admin/economy/settings',
        { method: 'PUT', body: JSON.stringify({ ...draft, reason: settingsReason }) },
      );
      setDraft(result.settings);
      setSettingsReason('');
      await report.refetch();
      setNotice(
        'Reward settings saved. New games use the new rewards; daily caps and the pause switch apply immediately.',
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };
  const adjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy('wallet');
    setError(null);
    setNotice('');
    const payload = JSON.stringify({
      targetUsername: target.trim(),
      amount,
      reason: reason.trim(),
      grantToSelf: false,
      removeFromSelf: false,
    });
    const signature = action + payload;
    if (operation.current?.payload !== signature)
      operation.current = { payload: signature, key: crypto.randomUUID() };
    try {
      const result = await economyApi<{
        grant: { target: { username: string }; newBalance: number };
      }>(`/wallet/admin/${action}-pe`, {
        method: 'POST',
        headers: { 'Idempotency-Key': operation.current.key },
        body: payload,
      });
      setNotice(
        `${action === 'grant' ? 'Granted' : 'Removed'} ${pe(amount)} PE ${
          action === 'grant' ? 'to' : 'from'
        } ${result.grant.target.username}. Balance: ${pe(result.grant.newBalance)} PE.`,
      );
      operation.current = null;
      setReason('');
      await report.refetch();
      walletChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };
  const series = data
    ? Array.from({ length: data.days }, (_, i) => {
        const day = new Date(new Date(data.start).getTime() + i * 86400000)
          .toISOString()
          .slice(0, 10);
        return data.daily.find((d) => d.day === day) || { day, earned: 0, spent: 0 };
      })
    : [];
  const chartMax = Math.max(1, ...series.flatMap((day) => [day.earned, day.spent]));
  return (
    <EconomyLayout
      title="Economy."
      description="Understand where essence comes from, and where it goes."
      admin
      aside={
        <label className="essence-field">
          <span className="sr-only">Reporting period</span>
          <select
            className="essence-input"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      }
    >
      {loading || (admin && report.isLoading) ? (
        <EconomyLoading />
      ) : !admin ? (
        <p>Admin access is required.</p>
      ) : (
        <>
          <EconomyError error={report.error} retry={() => report.refetch()} />
          <EconomyError error={error} />
          {notice ? (
            <div className="essence-notice essence-success" role="status">
              {notice}
            </div>
          ) : null}
          {data ? (
            <>
              {data.reconciliationWarnings ? (
                <div className="essence-notice" role="status">
                  {data.reconciliationWarnings}{' '}
                  {data.reconciliationWarnings === 1 ? 'wallet needs' : 'wallets need'}{' '}
                  reconciliation: the balance and PE history disagree. Review legacy activity before
                  issuing adjustments.
                </div>
              ) : null}
              <div className="essence-stats">
                {[
                  ['In circulation · all wallets', pe(data.totals.circulation) + ' PE'],
                  ['Earned in period', pe(data.totals.earned) + ' PE'],
                  ['Spent in period', pe(data.totals.spent) + ' PE'],
                  ['Active wallets in period', pe(data.totals.activeWallets)],
                ].map(([label, value]) => (
                  <div className="essence-stat" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="essence-columns">
                <section className="essence-panel">
                  <h2>Earned &amp; spent</h2>
                  <div className="essence-chart-legend">
                    <span>Earned PE</span>
                    <span>Spent PE</span>
                  </div>
                  {data.totals.earned || data.totals.spent ? (
                    <>
                      <div
                        className="essence-chart"
                        role="img"
                        aria-label={`Daily PE earned and spent. Scale 0 to ${pe(
                          chartMax,
                        )} PE; exact values below.`}
                      >
                        {series.map((day) => (
                          <div
                            className="essence-chart-day"
                            key={day.day}
                            title={`${day.day}: +${pe(day.earned)} earned, ${pe(day.spent)} spent`}
                          >
                            <span
                              className="essence-bar"
                              style={{ height: `${(day.earned / chartMax) * 100}%` }}
                            />
                            <span
                              className="essence-bar spent"
                              style={{ height: `${(day.spent / chartMax) * 100}%` }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="essence-chart-labels">
                        <span>{series[0]?.day}</span>
                        <span>Scale: 0–{pe(chartMax)} PE</span>
                        <span>{series[series.length - 1]?.day}</span>
                      </div>
                    </>
                  ) : (
                    <div className="essence-empty">No PE activity in this period.</div>
                  )}
                  <p className="essence-muted essence-small" style={{ marginTop: 18 }}>
                    Net change: {data.totals.earned - data.totals.spent > 0 ? '+' : ''}
                    {pe(data.totals.earned - data.totals.spent)} PE. Legacy currency conversions are
                    excluded.
                  </p>
                  <details className="essence-onboarding">
                    <summary>Daily figures</summary>
                    <div className="essence-table-scroll">
                      <table className="essence-table">
                        <thead>
                          <tr>
                            <th>Date (UTC)</th>
                            <th>Earned</th>
                            <th>Spent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {series.map((day) => (
                            <tr key={day.day}>
                              <td>{day.day}</td>
                              <td>{pe(day.earned)}</td>
                              <td>{pe(day.spent)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </section>
                <section className="essence-panel">
                  <h2>Sources &amp; sinks</h2>
                  <div className="essence-table-scroll">
                    <table className="essence-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Earned</th>
                          <th>Spent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.categories.map((row) => (
                          <tr key={row.source}>
                            <td>{sourceLabels[row.source] || row.source}</td>
                            <td className="essence-positive">{pe(row.earned)}</td>
                            <td>{pe(row.spent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!data.categories.length ? (
                    <p className="essence-empty">No transactions yet.</p>
                  ) : null}
                  <div className="essence-section">
                    <h3>Balance distribution</h3>
                    <p className="essence-muted essence-small">
                      {pe(data.totals.wallets)} wallets · median {pe(data.totals.median)} PE
                    </p>
                    {data.distribution.map((row) => (
                      <div className="essence-distribution" key={row.bucket}>
                        <span>{row.bucket}</span>
                        <progress
                          className="essence-progress"
                          value={row.count}
                          max={Math.max(data.totals.wallets, 1)}
                          aria-label={`${row.bucket} PE: ${row.count} wallets`}
                        />
                        <strong>{row.count}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="essence-columns essence-section">
                <form className="essence-panel" onSubmit={save}>
                  <div className="essence-section-head">
                    <h2>Reward settings</h2>
                    <button
                      className="essence-text-button essence-small"
                      type="button"
                      onClick={async () => {
                        const result = await report.refetch();
                        if (result.data) setDraft(result.data.settings);
                      }}
                    >
                      Reload saved
                    </button>
                  </div>
                  {draft ? (
                    <>
                      <div className="essence-form-grid">
                        {fields.map((field) => (
                          <label className="essence-field" key={field.key}>
                            {field.label} (PE)
                            <input
                              className="essence-input"
                              type="number"
                              min={0}
                              max={field.max}
                              step={1}
                              required
                              value={draft[field.key]}
                              onChange={(e) =>
                                setDraft({ ...draft, [field.key]: Number(e.target.value) })
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <label
                        className="essence-filter-end"
                        style={{ marginTop: 24, justifyContent: 'flex-start' }}
                      >
                        <input
                          type="checkbox"
                          checked={draft.gameRewardsEnabled}
                          onChange={(e) =>
                            setDraft({ ...draft, gameRewardsEnabled: e.target.checked })
                          }
                        />
                        Game rewards enabled
                      </label>
                      <p className="essence-muted essence-small" style={{ marginTop: 12 }}>
                        The cap applies per player, per UTC day. Pausing rewards keeps games
                        playable. Existing rounds keep their offered reward, subject to the current
                        cap and pause switch.
                      </p>
                      <p className="essence-small" style={{ marginTop: 12 }} aria-live="polite">
                        Recurring daily ceiling:{' '}
                        <strong>
                          {pe(
                            draft.dailyCheckin +
                              draft.dailySocial +
                              (draft.gameRewardsEnabled
                                ? Math.min(
                                    draft.dailyGameCap,
                                    draft.championReward + draft.soundReward,
                                  )
                                : 0),
                          )}{' '}
                          PE
                        </strong>{' '}
                        per player, excluding welcome grants and one-time milestones.
                      </p>
                      <label className="essence-field essence-section">
                        Reason for change
                        <input
                          className="essence-input"
                          required
                          minLength={3}
                          maxLength={180}
                          value={settingsReason}
                          onChange={(e) => setSettingsReason(e.target.value)}
                          placeholder="Recorded in the admin audit log"
                        />
                      </label>
                      <div className="essence-form-actions">
                        <button className="essence-button" disabled={Boolean(busy)}>
                          {busy === 'settings' ? 'Saving…' : 'Save settings'}
                        </button>
                      </div>
                    </>
                  ) : null}
                </form>
                <form className="essence-panel" onSubmit={adjust}>
                  <h2>Adjust a wallet</h2>
                  <p className="essence-muted essence-small" style={{ marginTop: 10 }}>
                    Every adjustment needs a reason and is recorded. Adjustments do not grant
                    progression XP.
                  </p>
                  <div className="essence-form-grid essence-section">
                    <label className="essence-field full">
                      Exact username
                      <input
                        className="essence-input"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        required
                        minLength={2}
                        maxLength={40}
                        placeholder="Player username"
                      />
                    </label>
                    <label className="essence-field">
                      Action
                      <select
                        className="essence-input"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                      >
                        <option value="grant">Grant PE</option>
                        <option value="remove">Remove PE</option>
                      </select>
                    </label>
                    <label className="essence-field">
                      Amount (PE)
                      <input
                        className="essence-input"
                        type="number"
                        min={1}
                        max={1000000}
                        step={1}
                        required
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                      />
                    </label>
                    <label className="essence-field full">
                      Reason
                      <textarea
                        className="essence-input"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        minLength={3}
                        maxLength={180}
                        required
                        placeholder="Why is this balance changing?"
                      />
                    </label>
                  </div>
                  <div className="essence-form-actions">
                    <button className="essence-button" disabled={Boolean(busy)}>
                      {busy === 'wallet' ? 'Applying…' : 'Apply adjustment'}
                    </button>
                  </div>
                </form>
              </div>
              <section className="essence-panel essence-section">
                <h2>Daily game completion</h2>
                <table className="essence-table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Started</th>
                      <th>Solved</th>
                      <th>PE awarded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['archive', 'soundcheck'].map((key) => {
                      const rows = data.games.filter((game) => game.gameKey === key);
                      const started = rows.reduce((n, row) => n + row._count._all, 0);
                      const won = rows
                        .filter((row) => row.won)
                        .reduce((n, row) => n + row._count._all, 0);
                      return (
                        <tr key={key}>
                          <td>{sourceLabels[key]}</td>
                          <td>{started}</td>
                          <td>
                            {won}
                            {started ? ` (${Math.round((won / started) * 100)}%)` : ''}
                          </td>
                          <td>{pe(rows.reduce((n, row) => n + (row._sum.rewardPaid || 0), 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="essence-muted essence-small">
                  Includes unfinished daily rounds in the started count. Practice rounds are
                  excluded.
                </p>
              </section>
              <section className="essence-panel essence-section">
                <div className="essence-section-head">
                  <h2>Recent transactions</h2>
                  <span className="essence-muted essence-small">Latest 50 in this period</span>
                </div>
                <div className="essence-table-scroll">
                  <table className="essence-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Player</th>
                        <th>Activity</th>
                        <th>Amount</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((tx) => (
                        <tr key={tx.id}>
                          <td>
                            <time dateTime={tx.createdAt}>
                              {new Date(tx.createdAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </time>
                          </td>
                          <td>{tx.user.username}</td>
                          <td>{tx.note}</td>
                          <td
                            className={`essence-amount ${
                              tx.amount >= 0 ? 'essence-positive' : 'essence-negative'
                            }`}
                          >
                            {tx.amount > 0 ? '+' : ''}
                            {pe(tx.amount)}
                          </td>
                          <td className="essence-amount">{pe(tx.balanceAfter)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!data.recent.length ? (
                  <p className="essence-empty">No transactions in this period.</p>
                ) : null}
              </section>
              <p className="essence-credit">
                Snapshot taken {new Date(data.generatedAt).toLocaleString()}. Period boundaries use
                UTC.
              </p>
            </>
          ) : null}
        </>
      )}
    </EconomyLayout>
  );
}
