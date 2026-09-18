import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import {
  EconomyError,
  EconomyLoading,
} from '../../../components/economy/EconomyLayout';
import { economyApi } from '../../../utils/economy';

type Dashboard = {
  ad: {
    id: string;
    title: string;
    imageUrl: string;
    targetUrl: string;
    isActive: boolean;
    impressionBudget: number | null;
    remainingImpressions: number | null;
    peSpent: number;
    startDate: string;
    endDate: string;
    targetFeeds: string[];
    targetRegions: string[];
  };
  metrics: { impressions: number; clicks: number; ctr: number };
  daily: { day: string; impressions: number; clicks: number }[];
  feeds: { feed: string; impressions: number; clicks: number }[];
  purchases: {
    id: string;
    peAmount: number;
    impressions: number;
    refundedAt: string | null;
    createdAt: string;
  }[];
};

export default function CampaignDashboardPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : null;
  const query = useQuery(
    ['ad-dashboard', id],
    () => economyApi<Dashboard>(`/ads/dashboard/${encodeURIComponent(id!)}`),
    { enabled: Boolean(id) },
  );
  const data = query.data;
  const ad = data?.ad;
  const delivered =
    ad?.impressionBudget === null || ad?.impressionBudget === undefined
      ? null
      : ad.impressionBudget - (ad.remainingImpressions || 0);
  const max = Math.max(1, ...(data?.daily.map((day) => day.impressions) || []));
  return (
    <main className="ad-dashboard-page">
      <Head>
        <title>
          {ad
            ? `${ad.title} · Ad dashboard | RiftEssence`
            : 'Ad dashboard | RiftEssence'}
        </title>
      </Head>
      <div className="ad-dashboard-shell">
        <Link className="ad-back" href="/ads/dashboard">
          ← Your dashboards
        </Link>
        <EconomyError error={query.error} retry={() => query.refetch()} />
        {query.isLoading || !router.isReady ? (
          <EconomyLoading />
        ) : data && ad ? (
          <>
            <header className="ad-dashboard-header">
              <div>
                <p className="ad-eyebrow">CAMPAIGN PERFORMANCE</p>
                <h1>{ad.title}</h1>
                <p>
                  {ad.isActive &&
                  (ad.impressionBudget !== null
                    ? (ad.remainingImpressions || 0) > 0
                    : new Date(ad.endDate).getTime() >= Date.now())
                    ? 'Your ad is running.'
                    : ad.remainingImpressions === 0
                    ? 'The impression budget is complete.'
                    : 'Your ad is paused or has ended.'}
                </p>
              </div>
              <a
                className="ad-action subtle"
                href={ad.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit destination ↗
              </a>
            </header>
            <div className="ad-metrics">
              <Metric
                label="Impressions"
                value={data.metrics.impressions.toLocaleString()}
              />
              <Metric
                label="Clicks"
                value={data.metrics.clicks.toLocaleString()}
              />
              <Metric
                label="Click-through rate"
                value={`${data.metrics.ctr}%`}
              />
              {ad.impressionBudget !== null ? (
                <Metric
                  label="Remaining"
                  value={(ad.remainingImpressions || 0).toLocaleString()}
                />
              ) : null}
            </div>
            {delivered !== null ? (
              <section className="ad-panel">
                <div className="ad-panel-title">
                  <h2>Impression budget</h2>
                  <span>
                    {delivered} / {ad.impressionBudget}
                  </span>
                </div>
                <progress max={ad.impressionBudget || 1} value={delivered} />
                <p>
                  {ad.peSpent.toLocaleString()} PE spent · 3 impressions for
                  every 100 PE
                </p>
              </section>
            ) : null}
            <div className="ad-detail-grid">
              <section className="ad-panel">
                <h2>Last 30 days</h2>
                {data.daily.length ? (
                  <div className="ad-chart" aria-label="Daily impressions">
                    {data.daily.map((day) => (
                      <div
                        key={day.day}
                        className="ad-chart-day"
                        title={`${day.day}: ${day.impressions} impressions, ${day.clicks} clicks`}
                      >
                        <div
                          className="ad-chart-bar"
                          style={{
                            height: `${Math.max(
                              4,
                              (day.impressions / max) * 100,
                            )}%`,
                          }}
                        />
                        <span>{day.day.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>
                    No counted impressions yet. The chart will appear once the
                    ad is shown.
                  </p>
                )}
              </section>
              <section className="ad-panel">
                <h2>Placement</h2>
                {data.feeds.length ? (
                  data.feeds.map((feed) => (
                    <div className="ad-feed-row" key={feed.feed}>
                      <strong>
                        {feed.feed === 'duo'
                          ? 'Duo finder'
                          : feed.feed === 'lft'
                          ? 'Team finder'
                          : feed.feed}
                      </strong>
                      <span>
                        {feed.impressions} impressions · {feed.clicks} clicks
                      </span>
                    </div>
                  ))
                ) : (
                  <p>No feed activity yet.</p>
                )}
                <p className="ad-muted">
                  Target feeds:{' '}
                  {ad.targetFeeds.length ? ad.targetFeeds.join(', ') : 'All'} ·
                  Regions:{' '}
                  {ad.targetRegions.length
                    ? ad.targetRegions.join(', ')
                    : 'All'}
                </p>
              </section>
            </div>
            {data.purchases.length ? (
              <section className="ad-panel">
                <h2>Purchases</h2>
                {data.purchases.map((purchase) => (
                  <div className="ad-feed-row" key={purchase.id}>
                    <span>
                      {new Date(purchase.createdAt).toLocaleDateString()} ·{' '}
                      {purchase.impressions} impressions
                    </span>
                    <strong>
                      {purchase.peAmount.toLocaleString()} PE
                      {purchase.refundedAt ? ' · refunded' : ''}
                    </strong>
                  </div>
                ))}
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="ad-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
