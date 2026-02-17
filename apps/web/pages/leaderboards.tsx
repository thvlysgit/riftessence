import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useGlobalUI } from '../components/GlobalUI';

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
  ratingCount: number;
  position: number;
};

type LeaderboardType = 'overall' | 'skill' | 'personality' | 'rank' | 'ingame';

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const { showToast } = useGlobalUI();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('overall');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, offset: 0, limit: 100, hasMore: false });

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/leaderboards?type=${activeTab}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setPagination(data.pagination || { total: 0, offset: 0, limit: 100, hasMore: false });
      } else {
        showToast('Failed to load leaderboard', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      showToast('Failed to load leaderboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (rank: string | null, division: string | null, lp: number | null) => {
    if (!rank || rank === 'UNRANKED') return 'Unranked';
    
    if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank)) {
      return `${rank} ${lp || 0} LP`;
    }
    
    return `${rank} ${division || 'IV'}`;
  };

  const getRankColor = (rank: string | null) => {
    switch (rank) {
      case 'IRON': return '#6B5650';
      case 'BRONZE': return '#A0522D';
      case 'SILVER': return '#A8B8C4';
      case 'GOLD': return '#FFD700';
      case 'PLATINUM': return '#40E0D0';
      case 'EMERALD': return '#00C853';
      case 'DIAMOND': return '#B9F2FF';
      case 'MASTER': return '#AB47BC';
      case 'GRANDMASTER': return '#F44336';
      case 'CHALLENGER': return '#00BCD4';
      default: return 'var(--color-text-muted)';
    }
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  const getColumnValue = (entry: LeaderboardEntry) => {
    switch (activeTab) {
      case 'skill':
        return `⭐ ${entry.skillStars.toFixed(1)}`;
      case 'personality':
        return `🌙 ${entry.personalityMoons.toFixed(1)}`;
      case 'rank':
        return getRankDisplay(entry.rank, entry.division, entry.lp);
      case 'ingame':
        return `${getRankDisplay(entry.rank, entry.division, entry.lp)} • ${entry.winrate?.toFixed(1)}% WR`;
      case 'overall':
        return `${entry.overallScore.toFixed(0)} pts`;
      default:
        return '';
    }
  };

  const tabs: { key: LeaderboardType; label: string; icon: string; description: string; tooltip: string }[] = [
    { 
      key: 'overall', 
      label: 'Overall', 
      icon: '🏆', 
      description: 'Combined rating from all metrics',
      tooltip: `**Calculation Formula:**
• Skill Rating: 30% weight (⭐ stars × 600, max 3,000 pts)
• Personality Rating: 20% weight (🌙 moons × 400, max 2,000 pts)
• In-Game Rank: 30% weight (rank score ÷ 4, normalized)
• Winrate: 20% weight (winrate % × 20, max 2,000 pts)

**Example:** 4.5⭐ + 4.0🌙 + Diamond II + 58% WR
= 2,700 + 1,600 + 1,825 + 1,160 = **7,285 points**

**Requirements:** At least 1 rating AND ranked status`
    },
    { 
      key: 'skill', 
      label: 'Skill Rating', 
      icon: '⭐', 
      description: 'Average skill stars from feedback',
      tooltip: `**Calculation:**
Average of all skill stars (⭐) received from player feedback ratings.

**Scale:** 0.0 to 5.0 stars (rounded to 1 decimal place)

**Example:** If you received ratings of 4⭐, 5⭐, and 4.5⭐ from 3 different players, your skill rating would be (4 + 5 + 4.5) ÷ 3 = **4.5 stars**

**Requirements:** Minimum of 3 ratings to appear on this leaderboard`
    },
    { 
      key: 'personality', 
      label: 'Personality', 
      icon: '🌙', 
      description: 'Average personality moons from feedback',
      tooltip: `**Calculation:**
Average of all personality moons (🌙) received from player feedback ratings.

**Scale:** 0.0 to 5.0 moons (rounded to 1 decimal place)

**Example:** If you received ratings of 5🌙, 4.5🌙, and 5🌙 from 3 different players, your personality rating would be (5 + 4.5 + 5) ÷ 3 = **4.8 moons**

**Requirements:** Minimum of 3 ratings to appear on this leaderboard`
    },
    { 
      key: 'rank', 
      label: 'In-Game Rank', 
      icon: '🎮', 
      description: 'League of Legends ranked tier',
      tooltip: `**Calculation:**
Base Score = Rank Tier × 1,000 points
• Iron = 1,000 | Bronze = 2,000 | Silver = 3,000
• Gold = 4,000 | Platinum = 5,000 | Emerald = 6,000
• Diamond = 7,000 | Master = 8,000 | GM = 9,000 | Challenger = 10,000

**Division Bonus (Gold-Diamond):**
• Division I = +400 | Division II = +300 | Division III = +200 | Division IV = +100

**Master+ Bonus:** LP points added directly

**Examples:**
• Gold II = 4,000 + 300 = **4,300 points**
• Master 150 LP = 8,000 + 150 = **8,150 points**
• Challenger 1000 LP = 10,000 + 1,000 = **11,000 points**

**Requirements:** Ranked players only (not UNRANKED)`
    },
    { 
      key: 'ingame', 
      label: 'In-Game Skill', 
      icon: '⚔️', 
      description: 'Rank combined with winrate',
      tooltip: `**Calculation Formula:**
Rank Score (see In-Game Rank tab) × Winrate Multiplier

**Winrate Multiplier:** (Winrate % ÷ 50)
• 50% winrate = 1.0x multiplier (baseline)
• 55% winrate = 1.1x multiplier (+10%)
• 60% winrate = 1.2x multiplier (+20%)
• 65% winrate = 1.3x multiplier (+30%)
• 70% winrate = 1.4x multiplier (+40%)

**Example:** Diamond I player with 55% winrate
• Rank Score: 7,400 (Diamond I)
• Winrate Multiplier: 1.1x (55% ÷ 50)
• Total: 7,400 × 1.1 = **8,140 points**

**Requirements:** Ranked status AND winrate data available`
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-accent-1)' }}>
            🏆 Leaderboards
          </h1>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            See who's dominating the rankings across different categories
          </p>
        </div>

        {/* Tabs */}
        <div 
          className="mb-6 flex gap-2 pb-2 sticky z-10 overflow-x-auto"
          style={{
            top: '0',
            backgroundColor: 'var(--color-bg-primary)',
            paddingTop: '1rem',
            paddingBottom: '1rem',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-2.5 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: activeTab === tab.key ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: activeTab === tab.key ? 'var(--color-accent-1)' : 'var(--color-border)',
                color: activeTab === tab.key ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
              }}
            >
              <span className="text-lg sm:text-xl">{tab.icon}</span>
              <div className="text-left">
                <div className="font-bold text-sm">{tab.label}</div>
                <div className="text-[10px] sm:text-[11px] opacity-75 hidden sm:block leading-tight">{tab.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Info Hover Area */}
        <div className="mb-4 flex justify-end">
          <div className="relative group">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm cursor-help"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span>ℹ️</span>
              <span>How is this calculated?</span>
            </div>

            {/* Calculation Info (appears on hover) */}
            <div 
              className="absolute right-0 top-full mt-2 w-[90vw] sm:w-[600px] p-4 sm:p-5 rounded-xl border-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{tabs.find(t => t.key === activeTab)?.icon}</span>
                <div>
                  <div className="font-bold text-base" style={{ color: 'var(--color-accent-1)' }}>
                    {tabs.find(t => t.key === activeTab)?.label}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    How this leaderboard is calculated
                  </div>
                </div>
              </div>
              <div 
                className="text-sm leading-relaxed whitespace-pre-line pl-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {tabs.find(t => t.key === activeTab)?.tooltip.split('**').map((part, i) => {
                  if (i % 2 === 1) {
                    return <strong key={i} style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{part}</strong>;
                  }
                  return <span key={i}>{part}</span>;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : leaderboard.length === 0 ? (
          <div 
            className="text-center py-16 rounded-lg border"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            <p className="text-lg mb-2">No entries yet</p>
            <p className="text-sm">
              {activeTab === 'skill' || activeTab === 'personality'
                ? 'Users need at least 3 ratings to appear here'
                : 'No ranked players found'}
            </p>
          </div>
        ) : (
          <div 
            className="rounded-lg border overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Table Header */}
            <div 
              className="grid grid-cols-12 gap-4 px-4 py-3 border-b font-bold text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-5">Player</div>
              <div className="col-span-3">Score</div>
              <div className="col-span-2">Region</div>
              <div className="col-span-1 text-center">Ratings</div>
            </div>

            {/* Table Body */}
            {leaderboard.map((entry) => {
              const isCurrentUser = user && user.id === entry.id;
              
              return (
                <Link
                  key={entry.id}
                  href={`/profile/${entry.username}`}
                  className="grid grid-cols-12 gap-4 px-4 py-4 border-b transition-colors items-center"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: isCurrentUser ? 'rgba(var(--color-accent-1-rgb), 0.1)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isCurrentUser 
                      ? 'rgba(var(--color-accent-1-rgb), 0.15)' 
                      : 'var(--color-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isCurrentUser 
                      ? 'rgba(var(--color-accent-1-rgb), 0.1)' 
                      : 'transparent';
                  }}
                >
                  {/* Rank */}
                  <div className="col-span-1 text-center font-bold text-lg">
                    {getMedalEmoji(entry.position)}
                  </div>

                  {/* Player */}
                  <div className="col-span-5 flex items-center gap-3">
                    {entry.profileIconId ? (
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${entry.profileIconId}.png`}
                        alt={entry.username}
                        className="w-10 h-10 rounded-full"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{
                          background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))',
                          color: 'var(--color-bg-primary)',
                        }}
                      >
                        {entry.username[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {entry.username}
                        </span>
                        {entry.verified && (
                          <span className="text-xs text-green-400">✓</span>
                        )}
                        {isCurrentUser && (
                          <span 
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--color-accent-1)',
                              color: 'var(--color-bg-primary)',
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>
                      {entry.badges.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {entry.badges.slice(0, 3).map((badge) => (
                            <span 
                              key={badge.key} 
                              className="text-xs"
                              title={badge.name}
                            >
                              {badge.name.includes('Admin') ? '🛡️' : '🏅'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-3">
                    <div className="font-bold text-lg" style={{ color: 'var(--color-accent-1)' }}>
                      {getColumnValue(entry)}
                    </div>
                    {activeTab === 'rank' && entry.rank && (
                      <div className="text-xs mt-1" style={{ color: getRankColor(entry.rank) }}>
                        {entry.rank}
                      </div>
                    )}
                  </div>

                  {/* Region */}
                  <div className="col-span-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {entry.region || 'N/A'}
                  </div>

                  {/* Rating Count */}
                  <div className="col-span-1 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {entry.ratingCount}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Stats Footer */}
        {!loading && leaderboard.length > 0 && (
          <div className="mt-4 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Showing {leaderboard.length} of {pagination.total} players
          </div>
        )}
      </div>
    </div>
  );
}
