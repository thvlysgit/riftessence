import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import SEOHead from '../../../api/components/SEOHead';
import { LoadingSpinner } from '../../../api/components/LoadingSpinner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  language: string;
  regions: string[];
  inviteLink: string | null;
  isPartner: boolean;
  memberCount: number;
  postCount: number;
  createdAt: string;
};

type SortMode = 'TRENDING' | 'MEMBERS' | 'POSTS' | 'NEWEST';

const REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];

function formatCompact(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function getCommunityScore(community: Community) {
  const agePenalty = Math.min(90, Math.floor((Date.now() - new Date(community.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  const partnerBoost = community.isPartner ? 400 : 0;
  return community.memberCount * 3 + community.postCount * 4 + partnerBoost - agePenalty;
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [partnerFilter, setPartnerFilter] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('TRENDING');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 280);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    fetchCommunities();
  }, [search, regionFilter, partnerFilter]);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (regionFilter.length > 0) regionFilter.forEach(r => params.append('region', r));
      if (partnerFilter) params.append('isPartner', 'true');

      const res = await fetch(`${API_URL}/api/communities?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCommunities(data.communities || []);
      }
    } catch (error) {
      console.error('Failed to fetch communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRegion = (region: string) => {
    setRegionFilter(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const clearFilters = () => {
    setRegionFilter([]);
    setPartnerFilter(false);
    setSearchInput('');
    setSearch('');
  };

  const sortedCommunities = useMemo(() => {
    const list = [...communities];

    if (sortMode === 'MEMBERS') {
      list.sort((a, b) => b.memberCount - a.memberCount);
      return list;
    }

    if (sortMode === 'POSTS') {
      list.sort((a, b) => b.postCount - a.postCount);
      return list;
    }

    if (sortMode === 'NEWEST') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    }

    list.sort((a, b) => getCommunityScore(b) - getCommunityScore(a));
    return list;
  }, [communities, sortMode]);

  const totalMembers = communities.reduce((sum, community) => sum + community.memberCount, 0);
  const totalPosts = communities.reduce((sum, community) => sum + community.postCount, 0);
  const partnerCount = communities.filter((community) => community.isPartner).length;

  const hasActiveFilters = search.length > 0 || regionFilter.length > 0 || partnerFilter;

  return (
    <>
      <SEOHead
        title="Communities"
        description="Discover and join League of Legends communities. Connect with players from your region, find teammates, and participate in community events."
        path="/communities"
        keywords="LoL communities, League of Legends groups, LoL Discord servers, join LoL community, League community finder"
      />
      <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        <div
          className="mb-8 p-6 md:p-8 border"
          style={{
            borderRadius: 'calc(var(--border-radius) * 1.4)',
            borderColor: 'var(--color-border)',
            background: 'radial-gradient(circle at 10% 0%, rgba(88,101,242,0.20), transparent 38%), radial-gradient(circle at 95% 90%, rgba(200,170,110,0.25), transparent 42%), var(--color-bg-secondary)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                RiftEssence Network
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                Discover active communities, not dead servers
              </h1>
              <p className="max-w-3xl text-sm md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                Filter by region, compare activity, and join groups where people are actually posting and queueing now.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="https://discord.com/oauth2/authorize?client_id=1363678859471491312&scope=bot&permissions=2147863617"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded font-semibold"
                style={{ backgroundColor: '#5865F2', color: '#fff' }}
              >
                Add Bot
              </a>
              <Link
                href="/communities/guide"
                className="px-4 py-2 rounded border font-semibold"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-bg-primary)',
                }}
              >
                Setup Guide
              </Link>
              <Link
                href="/communities/register"
                className="px-4 py-2 font-semibold shadow-md"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                Link Server
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 border" style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--border-radius)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Communities</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatCompact(communities.length)}</p>
            </div>
            <div className="p-4 border" style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--border-radius)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Members Reached</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatCompact(totalMembers)}</p>
            </div>
            <div className="p-4 border" style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--border-radius)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Partner Groups</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatCompact(partnerCount)}</p>
            </div>
          </div>
        </div>

        <div
          className="mb-6 border p-5"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <p className="text-sm uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--color-accent-1)' }}>
                Discovery Controls
              </p>
              <h3 className="text-lg md:text-xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Find the right place fast
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Search updates live, stack region filters, and sort by activity or member size.
              </p>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Total visible posts across current results: <strong style={{ color: 'var(--color-text-primary)' }}>{formatCompact(totalPosts)}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Search
              </label>
              <input
                type="text"
                value={searchInput}
                placeholder="Type a community name..."
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-4 py-3 border"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Sort
              </label>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="w-full px-4 py-3 border"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                <option value="TRENDING">Trending</option>
                <option value="MEMBERS">Most members</option>
                <option value="POSTS">Most posts</option>
                <option value="NEWEST">Newest first</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => toggleRegion(region)}
                className="px-3 py-1.5 text-sm font-medium border transition-colors"
                style={{
                  borderRadius: '999px',
                  backgroundColor: regionFilter.includes(region) ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                  borderColor: regionFilter.includes(region) ? 'var(--color-accent-1)' : 'var(--color-border)',
                  color: regionFilter.includes(region) ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                }}
              >
                {region}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setPartnerFilter((prev) => !prev)}
              className="px-3 py-1.5 text-sm font-semibold border"
              style={{
                borderRadius: '999px',
                backgroundColor: partnerFilter ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                borderColor: partnerFilter ? 'var(--color-accent-1)' : 'var(--color-border)',
                color: partnerFilter ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
              }}
            >
              ⭐ Partner only
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm border"
                style={{
                  borderRadius: '999px',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-bg-primary)',
                }}
              >
                Clear filters
              </button>
            )}

            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {sortedCommunities.length} result{sortedCommunities.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : sortedCommunities.length === 0 ? (
          <div
            className="text-center py-14 px-6 border"
            style={{
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              No communities match these filters
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Try widening regions, disabling partner-only mode, or searching by another keyword.
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 font-semibold"
              style={{
                borderRadius: 'var(--border-radius)',
                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                color: 'var(--color-bg-primary)',
              }}
            >
              Reset discovery filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCommunities.map((community) => (
              <Link
                key={community.id}
                href={`/communities/${community.id}`}
                className="border p-5 transition-all hover:-translate-y-1"
                style={{
                  position: 'relative',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--border-radius)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'var(--border-radius)',
                    background: 'linear-gradient(120deg, rgba(88,101,242,0.08), rgba(200,170,110,0.08), transparent 60%)',
                    pointerEvents: 'none',
                  }}
                />
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold pr-3" style={{ color: 'var(--color-text-primary)' }}>
                    {community.name}
                  </h3>
                  {community.isPartner && (
                    <span 
                      className="px-2 py-1 text-xs font-bold"
                      style={{
                        background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                        color: 'var(--color-bg-primary)',
                        borderRadius: 'var(--border-radius)',
                      }}
                    >
                      PARTNER
                    </span>
                  )}
                </div>

                {community.description && (
                  <p
                    className="text-sm mb-4"
                    style={{
                      color: 'var(--color-text-muted)',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {community.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {community.regions.slice(0, 4).map((region) => (
                    <span
                      key={region}
                      className="px-2 py-1 text-xs font-medium border"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        borderRadius: 'calc(var(--border-radius) * 0.5)',
                      }}
                    >
                      {region}
                    </span>
                  ))}
                  {community.regions.length > 4 && (
                    <span
                      className="px-2 py-1 text-xs font-medium border"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-muted)',
                        borderRadius: 'calc(var(--border-radius) * 0.5)',
                      }}
                    >
                      +{community.regions.length - 4}
                    </span>
                  )}
                  <span
                    className="px-2 py-1 text-xs font-medium border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      borderRadius: 'calc(var(--border-radius) * 0.5)',
                    }}
                  >
                    {community.language}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <span>{formatCompact(community.memberCount)} members</span>
                  <span>{formatCompact(community.postCount)} posts</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
