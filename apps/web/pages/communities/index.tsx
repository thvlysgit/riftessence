import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SEOHead from '../../components/SEOHead';
import { LoadingSpinner } from '../../components/LoadingSpinner';

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

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [partnerFilter, setPartnerFilter] = useState(false);

  useEffect(() => {
    fetchCommunities();
  }, [regionFilter, partnerFilter]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCommunities();
  };

  const toggleRegion = (region: string) => {
    setRegionFilter(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const regions = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];

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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-accent-1)' }}>
              Communities
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Discover and join League of Legends communities
            </p>
          </div>
          <Link
            href="/communities/register"
            className="px-4 py-2 font-semibold transition-all shadow-md"
            style={{
              background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
              color: 'var(--color-bg-primary)',
              borderRadius: 'var(--border-radius)',
            }}
          >
            Link Server
          </Link>
        </div>

        {/* Quick guide card */}
        <div
          className="mb-6 p-6 rounded-xl border"
          style={{
            background: 'linear-gradient(120deg, rgba(96,165,250,0.12), rgba(167,139,250,0.12))',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--color-accent-1)' }}>
                New to communities?
              </p>
              <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Link your Discord server in 3 easy steps
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Invite our bot, run /linkserver, enter the code here — done.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://discord.com/oauth2/authorize?client_id=1363678859471491312&scope=bot&permissions=2147863617"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded font-semibold flex items-center gap-2"
                style={{
                  backgroundColor: '#5865F2',
                  color: '#fff',
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
                Add Bot
              </a>
              <Link
                href="/communities/guide"
                className="px-4 py-2 rounded font-semibold border"
                style={{
                  background: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              >
                Open quick guide
              </Link>
              <Link
                href="/communities/register"
                className="px-4 py-2 font-semibold transition-all shadow-md"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                Start linking
              </Link>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div 
          className="border p-6 mb-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search communities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2 border"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              />
              <button
                type="submit"
                className="px-6 py-2 font-semibold"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                Search
              </button>
            </div>
          </form>

          {/* Region Filter */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Regions
            </label>
            <div className="flex flex-wrap gap-2">
              {regions.map(region => (
                <button
                  key={region}
                  onClick={() => toggleRegion(region)}
                  className="px-3 py-1 text-sm font-medium border transition-colors"
                  style={{
                    backgroundColor: regionFilter.includes(region) ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    borderColor: regionFilter.includes(region) ? 'var(--color-accent-1)' : 'var(--color-border)',
                    color: regionFilter.includes(region) ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--border-radius)',
                  }}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          {/* Partner Filter */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Show only partner communities
            </span>
          </label>
        </div>

        {/* Communities Grid */}
        {loading ? (
          <LoadingSpinner />
        ) : communities.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            No communities found. Try adjusting your filters or register a new community!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map(community => (
              <Link
                key={community.id}
                href={`/communities/${community.id}`}
                className="border p-6 hover:shadow-lg transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
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
                  <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                    {community.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {community.regions.map(region => (
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

                <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <span>{community.memberCount} members</span>
                  <span>{community.postCount} posts</span>
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
