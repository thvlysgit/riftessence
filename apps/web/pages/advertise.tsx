import React, { useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { EconomyError, EconomyLoading } from '../components/economy/EconomyLayout';
import { economyApi, WalletSummary, walletChanged } from '../utils/economy';

export default function AdvertisePage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState(false);
  const [peAmount, setPeAmount] = useState(500);
  const operation = useRef<{ signature: string; key: string } | null>(null);
  const wallet = useQuery(['advertising-wallet', user?.id], () => economyApi<WalletSummary>('/wallet/summary'), { enabled: Boolean(user) });
  const requests = useQuery(
    ['advertising', user?.id],
    () =>
      economyApi<{ requests: { id: string; title: string; isActive: boolean; endDate: string; reviewStatus: string; peSpent: number; impressionBudget: number | null }[] }>(
        '/ads/my-requests',
      ),
    { enabled: Boolean(user) },
  );
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const payload = { ...values, peAmount };
    const signature = JSON.stringify(payload);
    if (operation.current?.signature !== signature) operation.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    setError(null);
    try {
      await economyApi('/ads/request-slot', {
        method: 'POST',
        headers: { 'Idempotency-Key': operation.current.key },
        body: signature,
      });
      setSubmitted(true);
      form.reset();
      setPeAmount(500);
      operation.current = null;
      walletChanged();
      await wallet.refetch();
      await requests.refetch();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="essence-page">
      <Head>
        <title>Advertise | RiftEssence</title>
      </Head>
      <main className="essence-width essence-main essence-advertise">
        <header className="essence-heading">
          <div>
            <h1>Reach your next teammate.</h1>
            <p>
              Promote your community, team, or project on RiftEssence. Buy a fixed number of impressions with PE, then submit your creative for review.
            </p>
          </div>
        </header>
        <div className="essence-notice">
          100 PE buys 3 counted impressions. The minimum campaign is 500 PE for 15 impressions. PE is charged when you submit and refunded in full if staff reject the ad. Approved campaigns run until their impression budget is used, unless paused.
          <br />A view counts when at least half the ad is visible for one second; repeated views from the same connection within an hour are excluded.
        </div>
        {loading ? (
          <EconomyLoading />
        ) : !user ? (
          <div className="essence-empty">
            <p>Sign in to send an advertising request.</p>
            <Link className="essence-button" href="/login">
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <EconomyError error={error} />
            {submitted ? (
              <div className="essence-notice essence-success" role="status">
                <strong>Request received.</strong>
                <p>
                  The team will review it. You’ll receive an account notification when a decision is made. Your purchased impressions start only after approval.
                </p>
              </div>
            ) : null}
            <form onSubmit={submit} className="essence-panel">
              <h2>Tell us about your project</h2>
              <div className="essence-notice ad-pricing">
                <label className="essence-field">
                  Campaign budget (PE)
                  <input className="essence-input" type="number" min={500} max={1000000} step={100} value={peAmount} onChange={(event) => setPeAmount(Number(event.target.value))} required />
                </label>
                <div>
                  <strong>{Number.isSafeInteger(peAmount) && peAmount >= 500 && peAmount % 100 === 0 ? ((peAmount / 100) * 3).toLocaleString() : '—'} impressions</strong>
                  <p className="essence-muted essence-small">3 impressions per 100 PE · minimum 500 PE · increments of 100 PE</p>
                  <p className="essence-muted essence-small">Your balance: {wallet.data?.wallet.prismaticEssence.toLocaleString() ?? '…'} PE · <Link href="/purse">View wallet</Link></p>
                </div>
              </div>
              <div className="essence-form-grid">
                <div className="essence-field full essence-notice">
                  <strong>Discord is the best way to arrange your ad.</strong>
                  <p>
                    {user.discordLinked
                      ? 'We can follow up using your linked Discord. Please confirm the username below, or give us another contact.'
                      : 'You haven’t linked Discord yet. We strongly recommend leaving your Discord username so the team can quickly discuss your request and placement.'}
                  </p>
                  {!user.discordLinked ? (
                    <Link href="/settings">You can also link Discord in settings →</Link>
                  ) : null}
                </div>
                <label className="essence-field full">
                  Discord username (strongly recommended)
                  <input
                    className="essence-input"
                    name="discordContact"
                    maxLength={100}
                    defaultValue={user.discordUsername || ''}
                    placeholder="Your Discord username"
                    aria-describedby="ad-discord-help"
                  />
                  <span id="ad-discord-help" className="essence-muted essence-small">
                    Only staff can see this contact. Optional, but it helps us follow up faster.
                  </span>
                </label>
                <label className="essence-field full">
                  Campaign title
                  <input
                    className="essence-input"
                    name="title"
                    minLength={3}
                    maxLength={80}
                    required
                    placeholder="Your team, community, or project"
                  />
                </label>
                <label className="essence-field full">
                  Description
                  <textarea
                    className="essence-input"
                    name="description"
                    maxLength={500}
                    placeholder="What are you promoting?"
                  />
                </label>
                <label className="essence-field">
                  Destination URL
                  <input
                    className="essence-input"
                    name="targetUrl"
                    type="url"
                    required
                    maxLength={2000}
                    placeholder="https://"
                  />
                </label>
                <label className="essence-field">
                  Banner image URL
                  <input
                    className="essence-input"
                    name="imageUrl"
                    type="url"
                    required
                    maxLength={2000}
                    placeholder="https://…/banner.jpg"
                  />
                </label>
                <label className="essence-field">
                  Placement
                  <select className="essence-input" name="feed">
                    <option value="all">All feeds</option>
                    <option value="duo">Duo finder</option>
                    <option value="lft">Team finder</option>
                  </select>
                </label>
                <label className="essence-field">
                  Audience
                  <select className="essence-input" name="targetRegion">
                    {['ALL', 'EUW', 'EUNE', 'NA', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'].map(
                      (region) => (
                        <option key={region} value={region}>
                          {region === 'ALL' ? 'All regions' : region}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <label className="essence-field" style={{ marginTop: 20 }}>
                Special requests (optional)
                <textarea
                  className="essence-input"
                  name="specialRequests"
                  rows={5}
                  maxLength={3000}
                  placeholder="Preferred dates, custom placements, creative ideas, questions, or anything else you’d like us to consider…"
                />
                <span className="essence-muted essence-small">
                  Share freely — these notes are for staff and won’t appear in your ad.
                </span>
              </label>
              <div className="essence-form-actions">
                <button className="essence-button" disabled={busy}>
                  {busy ? 'Sending…' : 'Send request'}
                </button>
                <span className="essence-muted essence-small">
                  Up to three requests awaiting review. Rejected requests receive a full PE refund.
                </span>
              </div>
            </form>
            <section className="essence-section">
              <h2>Your requests</h2>
              <EconomyError error={requests.error} retry={() => requests.refetch()} />
              {requests.isLoading ? (
                <EconomyLoading />
              ) : requests.data?.requests.length ? (
                requests.data.requests.map((ad) => (
                  <div className="essence-challenge" key={ad.id}>
                    <span className="essence-challenge-copy">{ad.title}</span>
                    <span className="essence-muted essence-small">
                      {ad.reviewStatus === 'PENDING' ? 'Awaiting review' : ad.reviewStatus === 'REJECTED' ? 'Rejected · refunded' : ad.isActive ? 'Running' : 'Completed or paused'}
                      {ad.peSpent > 0 ? ` · ${ad.peSpent.toLocaleString()} PE / ${ad.impressionBudget} impressions` : ''}
                    </span>
                    {ad.reviewStatus === 'APPROVED' ? <Link href={`/ads/dashboard/${encodeURIComponent(ad.id)}`}>View dashboard →</Link> : null}
                  </div>
                ))
              ) : (
                <p className="essence-muted" style={{ marginTop: 15 }}>
                  Your requests will appear here.
                </p>
              )}
            </section>
            <Link href="/ads/dashboard" className="essence-button">Your ad dashboards →</Link>
          </>
        )}
      </main>
    </div>
  );
}
