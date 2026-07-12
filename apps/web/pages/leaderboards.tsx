import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '@components/LoadingSpinner';
import { useGlobalUI } from '@components/GlobalUI';
import { getProfileIconUrl } from '../utils/championData';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type LeaderboardEntry = {
  id: string;
  username: string;
  verified: boolean;
  profileIconId?: number;
  badges: Array<{ key: string; name: string }>;
  skillStars: number;
  personalityMoons: number;
  rank: string | null;
  division: string | null;
  lp: number | null;
  winrate: number | null;
  region: string | null;
  rankScore: number;
  inGameSkillScore: number;
  overallScore: number;
  prismaticEssence: number;
  ratingCount: number;
  position: number;
};

type LeaderboardType = 'overall' | 'skill' | 'personality' | 'rank' | 'ingame' | 'prismatic';

type LeaderboardTab = {
  key: LeaderboardType;
  label: string;
  shortLabel: string;
  mark: string;
  description: string;
  formula: string;
};

const LEADERBOARD_TABS: LeaderboardTab[] = [
  {
    key: 'overall',
    label: 'Overall',
    shortLabel: 'All',
    mark: 'OV',
    description: 'Ratings, rank, and winrate blended into one score.',
    formula: 'Skill 30%, personality 20%, ranked score 30%, winrate 20%. Requires at least one rating and a ranked Riot account.',
  },
  {
    key: 'skill',
    label: 'Skill Rating',
    shortLabel: 'Skill',
    mark: 'SR',
    description: 'Average skill stars from player feedback.',
    formula: 'Average received skill ratings on a 0 to 5 scale. Requires at least three ratings.',
  },
  {
    key: 'personality',
    label: 'Personality',
    shortLabel: 'Social',
    mark: 'PR',
    description: 'Average personality moons from player feedback.',
    formula: 'Average received personality ratings on a 0 to 5 scale. Requires at least three ratings.',
  },
  {
    key: 'rank',
    label: 'In-Game Rank',
    shortLabel: 'Rank',
    mark: 'RG',
    description: 'Raw League tier, division, and LP.',
    formula: 'Rank tiers are scored from Iron through Challenger, with division bonuses and LP for Master+.',
  },
  {
    key: 'ingame',
    label: 'In-Game Skill',
    shortLabel: 'Game',
    mark: 'IG',
    description: 'Rank score adjusted by winrate.',
    formula: 'Rank score multiplied by winrate relative to 50%. Requires ranked status and winrate data.',
  },
  {
    key: 'prismatic',
    label: 'Prismatic Essence',
    shortLabel: 'PE',
    mark: 'PE',
    description: 'Highest current Prismatic Essence balances.',
    formula: 'Sorted by live wallet PE balance. Requires at least one PE.',
  },
];

const RANKS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function getRankDisplay(rank: string | null, division: string | null, lp: number | null) {
  if (!rank || rank === 'UNRANKED') return 'Unranked';
  const title = rank.replace(/_/g, ' ');
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank)) {
    return `${title} ${lp || 0} LP`;
  }
  return `${title} ${division || 'IV'}`;
}

function getRankTone(rank: string | null) {
  switch (rank) {
    case 'IRON':
      return '#8f7169';
    case 'BRONZE':
      return '#c78349';
    case 'SILVER':
      return '#b7c3cf';
    case 'GOLD':
      return '#d9b75f';
    case 'PLATINUM':
      return '#54d7c8';
    case 'EMERALD':
      return '#2fd27a';
    case 'DIAMOND':
      return '#9ad7ff';
    case 'MASTER':
      return '#c084fc';
    case 'GRANDMASTER':
      return '#fb7185';
    case 'CHALLENGER':
      return '#67e8f9';
    default:
      return 'var(--color-text-muted)';
  }
}

function getMedalLabel(position: number) {
  if (position === 1) return '1st';
  if (position === 2) return '2nd';
  if (position === 3) return '3rd';
  return `#${position}`;
}

function getRatingCount(entry: LeaderboardEntry) {
  return Number.isFinite(entry.ratingCount) ? entry.ratingCount : 0;
}

function getMetricValue(entry: LeaderboardEntry, activeTab: LeaderboardType) {
  switch (activeTab) {
    case 'skill':
      return `${entry.skillStars.toFixed(1)} stars`;
    case 'personality':
      return `${entry.personalityMoons.toFixed(1)} moons`;
    case 'rank':
      return getRankDisplay(entry.rank, entry.division, entry.lp);
    case 'ingame':
      return `${formatCompact(entry.inGameSkillScore)} pts`;
    case 'prismatic':
      return `${formatCompact(entry.prismaticEssence)} PE`;
    case 'overall':
    default:
      return `${formatCompact(Math.round(entry.overallScore))} pts`;
  }
}

function getMetricDetail(entry: LeaderboardEntry, activeTab: LeaderboardType) {
  switch (activeTab) {
    case 'rank':
      return `${entry.region || 'No region'} - score ${formatCompact(entry.rankScore)}`;
    case 'ingame':
      return `${getRankDisplay(entry.rank, entry.division, entry.lp)} - ${entry.winrate?.toFixed(1) || '0.0'}% WR`;
    case 'prismatic':
      return 'Current wallet balance';
    default: {
      const ratingCount = getRatingCount(entry);
      return `${ratingCount} rating${ratingCount === 1 ? '' : 's'} - ${getRankDisplay(entry.rank, entry.division, entry.lp)}`;
    }
  }
}

function getScorePercent(entry: LeaderboardEntry, activeTab: LeaderboardType, maxPrismatic: number) {
  switch (activeTab) {
    case 'skill':
      return Math.min(100, (entry.skillStars / 5) * 100);
    case 'personality':
      return Math.min(100, (entry.personalityMoons / 5) * 100);
    case 'rank':
      return Math.min(100, (entry.rankScore / 11000) * 100);
    case 'ingame':
      return Math.min(100, (entry.inGameSkillScore / 14000) * 100);
    case 'prismatic':
      return maxPrismatic > 0 ? Math.min(100, (entry.prismaticEssence / maxPrismatic) * 100) : 0;
    case 'overall':
    default:
      return Math.min(100, (entry.overallScore / 9000) * 100);
  }
}

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const { showToast } = useGlobalUI();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('overall');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [rankFilter, setRankFilter] = useState('all');
  const [pagination, setPagination] = useState({ total: 0, offset: 0, limit: 100, hasMore: false });

  const activeMeta = LEADERBOARD_TABS.find((tab) => tab.key === activeTab) || LEADERBOARD_TABS[0];

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type: activeTab,
        limit: '100',
      });
      const res = await fetch(`${API_URL}/api/leaderboards?${params.toString()}`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load leaderboard');
      }

      setLeaderboard(Array.isArray(data?.leaderboard) ? data.leaderboard : []);
      setPagination(data?.pagination || { total: 0, offset: 0, limit: 100, hasMore: false });
    } catch (err: any) {
      const message = err?.message || 'Failed to load leaderboard';
      setLeaderboard([]);
      setPagination({ total: 0, offset: 0, limit: 100, hasMore: false });
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, showToast]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    setQuery('');
    setRegionFilter('all');
    setRankFilter('all');
  }, [activeTab]);

  const availableRegions = useMemo(() => {
    return Array.from(new Set(leaderboard.map((entry) => entry.region).filter(Boolean) as string[])).sort();
  }, [leaderboard]);

  const maxPrismatic = useMemo(() => {
    return Math.max(0, ...leaderboard.map((entry) => entry.prismaticEssence || 0));
  }, [leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return leaderboard.filter((entry) => {
      const matchesQuery =
        !normalizedQuery ||
        entry.username.toLowerCase().includes(normalizedQuery) ||
        String(entry.region || '').toLowerCase().includes(normalizedQuery) ||
        String(entry.rank || '').toLowerCase().includes(normalizedQuery);
      const matchesRegion = regionFilter === 'all' || entry.region === regionFilter;
      const matchesRank = rankFilter === 'all' || entry.rank === rankFilter;
      return matchesQuery && matchesRegion && matchesRank;
    });
  }, [leaderboard, query, regionFilter, rankFilter]);

  const topThree = leaderboard.slice(0, 3);
  const totalRatings = leaderboard.reduce((sum, entry) => sum + getRatingCount(entry), 0);
  const currentUserEntry = user ? leaderboard.find((entry) => entry.id === user.id) : null;

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-wrap">
        <section className="leaderboard-hero">
          <div>
            <p className="leaderboard-kicker">Competitive index</p>
            <h1>Leaderboards</h1>
            <p className="leaderboard-hero-copy">
              Track the players rising through RiftEssence by social rating, ranked strength, and Prismatic Essence.
            </p>
          </div>
          <div className="leaderboard-hero-stats" aria-label="Leaderboard summary">
            <div>
              <span>{pagination.total.toLocaleString()}</span>
              <small>qualified players</small>
            </div>
            <div>
              <span>{formatCompact(totalRatings)}</span>
              <small>ratings counted</small>
            </div>
            <div>
              <span>{currentUserEntry ? getMedalLabel(currentUserEntry.position) : '--'}</span>
              <small>your place</small>
            </div>
          </div>
        </section>

        <section className="leaderboard-tabs" aria-label="Leaderboard categories">
          {LEADERBOARD_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`leaderboard-tab ${activeTab === tab.key ? 'leaderboard-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="leaderboard-tab-mark">{tab.mark}</span>
              <span>
                <strong>{tab.label}</strong>
                <small>{tab.description}</small>
              </span>
            </button>
          ))}
        </section>

        <section className="leaderboard-control-panel">
          <div className="leaderboard-search">
            <span aria-hidden="true">Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Player, region, or rank..."
            />
          </div>
          <label>
            Region
            <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
              <option value="all">All regions</option>
              {availableRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rank
            <select value={rankFilter} onChange={(event) => setRankFilter(event.target.value)}>
              <option value="all">All ranks</option>
              {RANKS.map((rank) => (
                <option key={rank} value={rank}>
                  {rank}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="leaderboard-reset"
            onClick={() => {
              setQuery('');
              setRegionFilter('all');
              setRankFilter('all');
            }}
          >
            Reset
          </button>
        </section>

        <section className="leaderboard-insight">
          <div className="leaderboard-insight-mark">{activeMeta.mark}</div>
          <div>
            <h2>{activeMeta.label}</h2>
            <p>{activeMeta.formula}</p>
          </div>
          <button type="button" onClick={fetchLeaderboard}>
            Refresh
          </button>
        </section>

        {!loading && !error && topThree.length > 0 && (
          <section className="leaderboard-podium" aria-label="Top ranked players">
            {topThree.map((entry) => (
              <Link key={entry.id} href={`/profile/${entry.username}`} className="leaderboard-podium-card">
                <span className="leaderboard-podium-rank">{getMedalLabel(entry.position)}</span>
                <Avatar entry={entry} size="large" />
                <strong>{entry.username}</strong>
                <small>{getMetricValue(entry, activeTab)}</small>
              </Link>
            ))}
          </section>
        )}

        <section className="leaderboard-board">
          <div className="leaderboard-board-head">
            <span>Rank</span>
            <span>Player</span>
            <span>Score</span>
            <span>Region</span>
            <span>Ratings</span>
          </div>

          {loading ? (
            <div className="leaderboard-state">
              <LoadingSpinner compact />
              <p>Loading leaderboard...</p>
            </div>
          ) : error ? (
            <div className="leaderboard-state leaderboard-error-state">
              <h3>Leaderboard could not load</h3>
              <p>{error}</p>
              <button type="button" onClick={fetchLeaderboard}>
                Try again
              </button>
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="leaderboard-state">
              <h3>No entries match this view</h3>
              <p>
                {leaderboard.length === 0
                  ? activeTab === 'skill' || activeTab === 'personality'
                    ? 'Players need at least three ratings to qualify here.'
                    : activeTab === 'prismatic'
                      ? 'No wallets currently have Prismatic Essence.'
                      : 'No ranked players currently qualify for this board.'
                  : 'Try clearing search or filter controls.'}
              </p>
            </div>
          ) : (
            <div className="leaderboard-rows">
              {filteredLeaderboard.map((entry) => {
                const isCurrentUser = user?.id === entry.id;
                const scorePercent = getScorePercent(entry, activeTab, maxPrismatic);

                return (
                  <Link
                    key={entry.id}
                    href={`/profile/${entry.username}`}
                    className={`leaderboard-row ${isCurrentUser ? 'leaderboard-row-current' : ''}`}
                  >
                    <div className="leaderboard-rank-cell">
                      <span>{getMedalLabel(entry.position)}</span>
                    </div>
                    <div className="leaderboard-player-cell">
                      <Avatar entry={entry} />
                      <div>
                        <div className="leaderboard-name-line">
                          <strong>{entry.username}</strong>
                          {entry.verified && <span className="leaderboard-verified">Verified</span>}
                          {isCurrentUser && <span className="leaderboard-you">You</span>}
                        </div>
                        <small>{getMetricDetail(entry, activeTab)}</small>
                      </div>
                    </div>
                    <div className="leaderboard-score-cell">
                      <strong>{getMetricValue(entry, activeTab)}</strong>
                      <span className="leaderboard-meter" aria-hidden="true">
                        <span style={{ width: `${scorePercent}%` }} />
                      </span>
                    </div>
                    <div className="leaderboard-region-cell">
                      <span>{entry.region || 'N/A'}</span>
                      {entry.rank && entry.rank !== 'UNRANKED' && (
                        <small style={{ color: getRankTone(entry.rank) }}>{entry.rank}</small>
                      )}
                    </div>
                    <div className="leaderboard-rating-cell">
                      {activeTab === 'prismatic' ? '-' : getRatingCount(entry)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {!loading && !error && leaderboard.length > 0 && (
          <p className="leaderboard-footer-note">
            Showing {filteredLeaderboard.length} of {pagination.total.toLocaleString()} qualified players.
          </p>
        )}
      </div>
    </div>
  );
}

function Avatar({ entry, size = 'default' }: { entry: LeaderboardEntry; size?: 'default' | 'large' }) {
  const className = size === 'large' ? 'leaderboard-avatar leaderboard-avatar-large' : 'leaderboard-avatar';

  if (entry.profileIconId) {
    return <img src={getProfileIconUrl(entry.profileIconId)} alt={entry.username} className={className} />;
  }

  return <span className={className}>{entry.username[0]?.toUpperCase() || '?'}</span>;
}
