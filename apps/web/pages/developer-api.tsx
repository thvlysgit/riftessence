import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from '@components/GlobalUI';
import { getAuthHeader } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const REGION_OPTIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
const RANK_OPTIONS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER', 'UNRANKED'];

type RequestFormState = {
  name: string;
  description: string;
  website: string;
  contactEmail: string;
  useCase: string;
  audience: string;
  notes: string;
};

export default function DeveloperApiPage() {
  const { user, loading } = useAuth();
  const { showToast } = useGlobalUI();
  const [submitting, setSubmitting] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [activeExample, setActiveExample] = useState<'duo' | 'lft' | 'request'>('duo');
  const [builder, setBuilder] = useState({
    endpoint: 'duo' as 'duo' | 'lft',
    region: '',
    language: '',
    rank: '',
    minRank: '',
    maxRank: '',
    verifiedOnly: '',
    limit: '20',
    offset: '0',
  });
  const [form, setForm] = useState<RequestFormState>({
    name: '',
    description: '',
    website: '',
    contactEmail: user?.email || '',
    useCase: '',
    audience: '',
    notes: '',
  });

  const endpointBase = useMemo(() => `${API_URL}/api/developer-api`, []);
  const builderUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (builder.region.trim()) params.set('region', builder.region.trim());
    if (builder.language.trim()) params.set('language', builder.language.trim());
    if (builder.rank.trim()) params.set('rank', builder.rank.trim());
    if (builder.minRank.trim()) params.set('minRank', builder.minRank.trim());
    if (builder.maxRank.trim()) params.set('maxRank', builder.maxRank.trim());
    if (builder.verifiedOnly.trim()) params.set('verifiedOnly', builder.verifiedOnly.trim());
    if (builder.limit.trim()) params.set('limit', builder.limit.trim());
    if (builder.offset.trim()) params.set('offset', builder.offset.trim());

    const endpointPath = builder.endpoint === 'duo' ? 'duo/posts' : 'lft/posts';
    const query = params.toString();
    return `${endpointBase}/${endpointPath}${query ? `?${query}` : ''}`;
  }, [builder, endpointBase]);

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      showToast('Please log in first. A RiftEssence account is required for API key requests.', 'error');
      return;
    }

    if (form.name.trim().length < 3) {
      showToast('Application name must be at least 3 characters.', 'error');
      return;
    }

    if (form.useCase.trim().length < 20) {
      showToast('Use case must be at least 20 characters.', 'error');
      return;
    }

    setSubmitting(true);
    setIssuedKey(null);

    try {
      const res = await fetch(`${endpointBase}/requests`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const rawText = await res.text();
      let body: any = {};
      try {
        body = rawText ? JSON.parse(rawText) : {};
      } catch {
        body = {};
      }

      if (!res.ok) {
        const explicitMessage = body?.error || body?.message;
        const fallbackMessage = rawText && !body?.error ? rawText.slice(0, 180) : '';
        throw new Error(explicitMessage || fallbackMessage || `Failed to submit API request (HTTP ${res.status})`);
      }

      setIssuedKey(body.apiKey || null);
      showToast('Developer API key created successfully. Save it now, it is shown once.', 'success');
      setForm((prev) => ({
        ...prev,
        useCase: '',
        notes: '',
      }));
    } catch (error: any) {
      showToast(error?.message || 'Failed to submit API request', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyKey() {
    if (!issuedKey) return;
    try {
      await navigator.clipboard.writeText(issuedKey);
      showToast('API key copied to clipboard', 'success');
    } catch {
      showToast('Could not copy key automatically. Please copy it manually.', 'error');
    }
  }

  async function copyBuilderUrl() {
    try {
      await navigator.clipboard.writeText(builderUrl);
      showToast('Request URL copied to clipboard', 'success');
    } catch {
      showToast('Could not copy URL automatically. Please copy it manually.', 'error');
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))' }}>
      <Head>
        <title>Developer API • RiftEssence</title>
        <meta name="description" content="RiftEssence Developer API docs, filters, auth requirements, and API key request form." />
      </Head>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>Developer API</h1>
          <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
            Free public API access for live Duo and LFT posts with strict throttling to protect the core app.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="xl:col-span-2 border rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>How It Works</h2>
            <div className="space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p>1. Log in to your RiftEssence account.</p>
              <p>2. Submit the request form on this page to receive a non-priority key instantly.</p>
              <p>3. Use your key in `x-api-key` or `Authorization: Bearer` headers.</p>
              <p>4. Admins can promote your key to priority from the admin dashboard after review.</p>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Endpoints</h3>
              <div className="space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>GET /api/developer-api/duo/posts</div>
                  <div>Read live Duo feed posts with filtering and pagination.</div>
                </div>
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>GET /api/developer-api/lft/posts</div>
                  <div>Read live LFT posts for teams and players.</div>
                </div>
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>POST /api/developer-api/requests</div>
                  <div>Submit your app details and receive a one-time API key immediately.</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Query Parameters (Always Available)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <strong>region</strong>: comma-separated regions
                  <div className="mt-1 text-xs">Options: NA, EUW, EUNE, KR, JP, OCE, LAN, LAS, BR, RU</div>
                </div>
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <strong>language</strong>: comma-separated languages
                  <div className="mt-1 text-xs">Examples: English, French, Spanish, German</div>
                </div>
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <strong>rank</strong>: exact rank filter
                  <div className="mt-1 text-xs">Options: IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER, UNRANKED</div>
                </div>
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <strong>minRank/maxRank</strong>: rank range
                  <div className="mt-1 text-xs">Use both for a range, e.g. minRank=GOLD&maxRank=DIAMOND</div>
                </div>
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <strong>verifiedOnly</strong>: account verification filter
                  <div className="mt-1 text-xs">Options: true, false (true means RiftEssence account + linked Riot account)</div>
                </div>
                <div className="border rounded-lg p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <strong>limit/offset</strong>: pagination controls
                  <div className="mt-1 text-xs">limit: 1-50, offset: 0+</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Pagination (Offset Model)</h3>
              <div className="border rounded-lg p-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <p>Every list endpoint returns:</p>
                <pre className="mt-2 p-3 rounded text-xs overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
{`"pagination": {
  "total": 240,
  "limit": 20,
  "offset": 40,
  "hasMore": true
}`}
                </pre>
                <p className="mt-3"><strong>How to request next page:</strong> set <code>offset = currentOffset + limit</code>. Example: from offset 40 with limit 20, next offset is 60.</p>
                <p className="mt-2"><strong>When to stop:</strong> if <code>hasMore</code> is false, you reached the end.</p>
                <p className="mt-2"><strong>Recommended default:</strong> limit=20 for best responsiveness.</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Example</h3>
              <pre className="p-4 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
{`curl -X GET "${endpointBase}/duo/posts?region=EUW,NA&language=English&verifiedOnly=true&minRank=GOLD&limit=20" \\
  -H "x-api-key: re_xxxx_your_key_here"`}
              </pre>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Try Request URL Builder</h3>
              <div className="border rounded-lg p-4 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Endpoint
                    <select
                      value={builder.endpoint}
                      onChange={(e) => setBuilder((prev) => ({ ...prev, endpoint: e.target.value as 'duo' | 'lft' }))}
                      className="w-full mt-1 px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      <option value="duo">/duo/posts</option>
                      <option value="lft">/lft/posts</option>
                    </select>
                  </label>
                  <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Region(s)
                    <input
                      value={builder.region}
                      onChange={(e) => setBuilder((prev) => ({ ...prev, region: e.target.value }))}
                      placeholder="EUW,NA"
                      className="w-full mt-1 px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                      list="region-options"
                    />
                  </label>
                  <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Language(s)
                    <input
                      value={builder.language}
                      onChange={(e) => setBuilder((prev) => ({ ...prev, language: e.target.value }))}
                      placeholder="English,French"
                      className="w-full mt-1 px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    />
                  </label>
                  <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Exact Rank
                    <select
                      value={builder.rank}
                      onChange={(e) => setBuilder((prev) => ({ ...prev, rank: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      <option value="">(none)</option>
                      {RANK_OPTIONS.map((rank) => (<option key={rank} value={rank}>{rank}</option>))}
                    </select>
                  </label>
                  <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Min Rank
                    <select
                      value={builder.minRank}
                      onChange={(e) => setBuilder((prev) => ({ ...prev, minRank: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      <option value="">(none)</option>
                      {RANK_OPTIONS.map((rank) => (<option key={`min-${rank}`} value={rank}>{rank}</option>))}
                    </select>
                  </label>
                  <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Max Rank
                    <select
                      value={builder.maxRank}
                      onChange={(e) => setBuilder((prev) => ({ ...prev, maxRank: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      <option value="">(none)</option>
                      {RANK_OPTIONS.map((rank) => (<option key={`max-${rank}`} value={rank}>{rank}</option>))}
                    </select>
                  </label>
                  <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    verifiedOnly
                    <select
                      value={builder.verifiedOnly}
                      onChange={(e) => setBuilder((prev) => ({ ...prev, verifiedOnly: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      <option value="">(none)</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </label>
                  <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    limit
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={builder.limit}
                      onChange={(e) => setBuilder((prev) => ({ ...prev, limit: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    />
                  </label>
                  <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    offset
                    <input
                      type="number"
                      min={0}
                      value={builder.offset}
                      onChange={(e) => setBuilder((prev) => ({ ...prev, offset: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    />
                  </label>
                </div>

                <datalist id="region-options">
                  {REGION_OPTIONS.map((region) => (
                    <option key={region} value={region} />
                  ))}
                </datalist>

                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Generated URL:</div>
                <code className="block p-3 rounded text-xs break-all" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
                  {builderUrl}
                </code>
                <button
                  type="button"
                  onClick={copyBuilderUrl}
                  className="px-3 py-1 rounded text-sm"
                  style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
                >
                  Copy URL
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Response Shape Examples</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveExample('duo')}
                  className="px-3 py-1 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: activeExample === 'duo' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: activeExample === 'duo' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                  }}
                >
                  Duo Response
                </button>
                <button
                  type="button"
                  onClick={() => setActiveExample('lft')}
                  className="px-3 py-1 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: activeExample === 'lft' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: activeExample === 'lft' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                  }}
                >
                  LFT Response
                </button>
                <button
                  type="button"
                  onClick={() => setActiveExample('request')}
                  className="px-3 py-1 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: activeExample === 'request' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: activeExample === 'request' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                  }}
                >
                  Request Success
                </button>
              </div>

              {activeExample === 'duo' && (
                <div>
                  <div className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Duo posts (GET /duo/posts)</div>
                  <pre className="p-4 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
{`{
  "posts": [
    {
      "id": "...",
      "region": "EUW",
      "role": "MID",
      "languages": ["English"],
      "username": "Player123",
      "createdAt": "2026-05-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 240,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}`}
                  </pre>
                </div>
              )}

              {activeExample === 'lft' && (
                <div>
                  <div className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>LFT posts (GET /lft/posts)</div>
                  <pre className="p-4 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
{`{
  "posts": [
    {
      "id": "...",
      "type": "PLAYER",
      "region": "NA",
      "mainRole": "JUNGLE",
      "rank": "PLATINUM",
      "username": "RiftUser",
      "createdAt": "2026-05-01T13:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 112,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}`}
                  </pre>
                </div>
              )}

              {activeExample === 'request' && (
                <div>
                  <div className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Request key success (POST /requests)</div>
                  <pre className="p-4 rounded-lg text-xs overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
{`{
  "success": true,
  "apiKey": "re_ab12cd34_xxxxxxxxxxxxxxxxxxxxxxxx",
  "priorityAccess": false,
  "issuedAt": "2026-05-01T14:00:00.000Z"
}`}
                  </pre>
                </div>
              )}
            </div>
          </section>

          <section className="border rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Request API Key</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Requires login and at least one linked Riot account.
            </p>

            {!loading && !user && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--color-text-primary)' }}>
                You are not logged in. Please <Link href="/login" className="underline">log in</Link> first.
              </div>
            )}

            <form className="space-y-3" onSubmit={submitRequest}>
              <Field label="App name" required>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded border" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </Field>
              <Field label="Contact email/Discord username">
                <input value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} className="w-full px-3 py-2 rounded border" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </Field>
              <Field label="Website">
                <input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://example.com" className="w-full px-3 py-2 rounded border" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </Field>
              <Field label="Description">
                <textarea rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 rounded border" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </Field>
              <Field label="Use case" required>
                <textarea rows={4} value={form.useCase} onChange={(e) => setForm((p) => ({ ...p, useCase: e.target.value }))} className="w-full px-3 py-2 rounded border" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </Field>
              <Field label="Audience">
                <textarea rows={2} value={form.audience} onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value }))} className="w-full px-3 py-2 rounded border" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </Field>
              <Field label="Notes">
                <textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 rounded border" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </Field>

              <button
                type="submit"
                disabled={submitting || loading || !user}
                className="w-full px-4 py-2 rounded-lg font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
              >
                {submitting ? 'Submitting...' : 'Submit & Generate Non-Priority Key'}
              </button>
            </form>

            {issuedKey && (
              <div className="mt-5 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Your API key (shown once)</div>
                <code className="block text-xs break-all mb-3" style={{ color: 'var(--color-text-primary)' }}>{issuedKey}</code>
                <button onClick={copyKey} className="px-3 py-1 rounded text-sm" style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}>
                  Copy key
                </button>
              </div>
            )}

          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {label} {required ? '*' : ''}
      </div>
      {children}
    </label>
  );
}
