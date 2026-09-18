import Head from 'next/head';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  EconomyError,
  EconomyLoading,
} from '../../../components/economy/EconomyLayout';
import { economyApi } from '../../../utils/economy';

type Analytics = {
  totals: {
    totalAds: number;
    activeAds: number;
    pendingAds: number;
    paidAds: number;
    impressions: number;
    clicks: number;
    purchases: number;
    peSpent: number;
    impressionsPurchased: number;
  };
  recentPurchases: {
    id: string;
    adId: string;
    adTitle: string;
    dashboardAvailable: boolean;
    purchaserId: string;
    username: string;
    peAmount: number;
    impressions: number;
    refundedAt: string | null;
    createdAt: string;
  }[];
};

export default function AdminAdAnalyticsPage() {
  const query = useQuery(['admin-ad-analytics'], () =>
    economyApi<Analytics>('/ads/admin/analytics'),
  );
  const data = query.data;
  return (
    <main className="ad-dashboard-page">
      <Head>
        <title>Ad analytics | RiftEssence</title>
      </Head>
      <div className="ad-dashboard-shell">
        <Link className="ad-back" href="/admin/ads">
          ← Ads management
        </Link>
        <header className="ad-dashboard-header">
          <div>
            <p className="ad-eyebrow">ADMIN / ADVERTISING</p>
            <h1>Advertising overview</h1>
            <p>Campaign delivery and PE purchases across RiftEssence.</p>
          </div>
          <Link className="ad-action subtle" href="/admin/ads">
            Manage ads
          </Link>
        </header>
        <EconomyError error={query.error} retry={() => query.refetch()} />
        {query.isLoading ? (
          <EconomyLoading />
        ) : data ? (
          <>
            <div className="ad-metrics">
              <Metric label="Running ads" value={data.totals.activeAds} />
              <Metric label="Pending review" value={data.totals.pendingAds} />
              <Metric
                label="Total impressions"
                value={data.totals.impressions}
              />
              <Metric label="Total clicks" value={data.totals.clicks} />
            </div>
            <section className="ad-panel">
              <h2>PE purchases</h2>
              <div className="ad-metrics inset">
                <Metric label="Net PE spent" value={data.totals.peSpent} />
                <Metric
                  label="Impressions purchased"
                  value={data.totals.impressionsPurchased}
                />
                <Metric label="Paid purchases" value={data.totals.purchases} />
                <Metric label="Approved paid ads" value={data.totals.paidAds} />
              </div>
              <p>
                {data.totals.totalAds} campaigns recorded overall. Refunded
                purchases are excluded from net totals.
              </p>
            </section>
            <section className="ad-panel">
              <h2>Recent purchases</h2>
              {data.recentPurchases.length ? (
                <div className="ad-purchase-list">
                  {data.recentPurchases.map((purchase) => (
                    <div className="ad-feed-row" key={purchase.id}>
                      <div>
                        {purchase.dashboardAvailable ? (
                          <Link
                            href={`/ads/dashboard/${encodeURIComponent(
                              purchase.adId,
                            )}`}
                          >
                            {purchase.adTitle}
                          </Link>
                        ) : (
                          <span>{purchase.adTitle}</span>
                        )}
                        <small>
                          {purchase.username} ·{' '}
                          {new Date(purchase.createdAt).toLocaleString()}
                          {purchase.refundedAt ? ' · Refunded' : ''}
                        </small>
                      </div>
                      <strong>
                        {purchase.peAmount.toLocaleString()} PE /{' '}
                        {purchase.impressions} impressions
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No PE purchases yet.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="ad-metric">
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}
