import Head from 'next/head';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import {
  EconomyError,
  EconomyLoading,
} from '../../../components/economy/EconomyLayout';
import { economyApi } from '../../../utils/economy';

type Campaign = {
  id: string;
  title: string;
  imageUrl: string;
  isActive: boolean;
  impressionBudget: number | null;
  remainingImpressions: number | null;
  peSpent: number;
  endDate: string;
  impressionCount: number;
  clickCount: number;
};

const isRunning = (ad: Campaign) =>
  ad.isActive &&
  (ad.impressionBudget !== null
    ? (ad.remainingImpressions || 0) > 0
    : new Date(ad.endDate).getTime() >= Date.now());

export default function AdDashboardsPage() {
  const { user } = useAuth();
  const query = useQuery(
    ['my-ad-dashboards', user?.id],
    () => economyApi<{ ads: Campaign[] }>('/ads/my-dashboard'),
    { enabled: Boolean(user) },
  );
  const ads = query.data?.ads || [];
  const active = ads.filter(isRunning);
  const past = ads.filter((ad) => !active.includes(ad));

  return (
    <main className="ad-dashboard-page">
      <Head>
        <title>Your ad dashboards | RiftEssence</title>
      </Head>
      <div className="ad-dashboard-shell">
        <header className="ad-dashboard-header">
          <div>
            <p className="ad-eyebrow">COMMUNITIES / ADVERTISING</p>
            <h1>Your ad dashboards</h1>
            <p>
              Follow every approved campaign from first impression to final
              click.
            </p>
          </div>
          <Link className="ad-action" href="/advertise">
            Create a campaign
          </Link>
        </header>
        <EconomyError error={query.error} retry={() => query.refetch()} />
        {query.isLoading ? (
          <EconomyLoading />
        ) : (
          <>
            {active.length ? (
              <section aria-labelledby="active-ads">
                <h2 id="active-ads">Running campaigns</h2>
                <div className="ad-card-grid">
                  {active.map((ad) => (
                    <CampaignCard key={ad.id} ad={ad} />
                  ))}
                </div>
              </section>
            ) : (
              <div className="ad-empty">
                <span className="ad-empty-mark">◎</span>
                <h2>No active ads yet</h2>
                <p>
                  Once a campaign is approved, you can follow its impressions
                  and clicks here.
                </p>
                <Link className="ad-action" href="/advertise">
                  Plan an ad →
                </Link>
              </div>
            )}
            {past.length ? (
              <section aria-labelledby="past-ads">
                <h2 id="past-ads">Past and paused campaigns</h2>
                <div className="ad-card-grid">
                  {past.map((ad) => (
                    <CampaignCard key={ad.id} ad={ad} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function CampaignCard({ ad }: { ad: Campaign }) {
  const progress =
    ad.impressionBudget === null
      ? null
      : ad.impressionBudget - (ad.remainingImpressions || 0);
  return (
    <Link
      className="ad-campaign-card"
      href={`/ads/dashboard/${encodeURIComponent(ad.id)}`}
    >
      <img src={ad.imageUrl} alt="" loading="lazy" />
      <div>
        <span className="ad-status">
          {isRunning(ad)
            ? 'RUNNING'
            : ad.impressionBudget !== null && ad.remainingImpressions === 0
            ? 'COMPLETED'
            : ad.impressionBudget === null &&
              new Date(ad.endDate).getTime() < Date.now()
            ? 'ENDED'
            : 'PAUSED'}
        </span>
        <h3>{ad.title}</h3>
        <p>
          {progress !== null
            ? `${progress} of ${ad.impressionBudget} impressions used`
            : `${ad.impressionCount} impressions`}
        </p>
        <div className="ad-card-footer">
          <span>{ad.clickCount} clicks</span>
          <strong>View dashboard ↗</strong>
        </div>
      </div>
    </Link>
  );
}
