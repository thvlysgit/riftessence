import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import SEOHead from '@components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import NoAccess from '@components/NoAccess';
import { useLanguage } from '../../contexts/LanguageContext';

interface TeamMember {
  id: string;
  userId: string;
  username: string;
  role: string;
  joinedAt: string;
  rank: string | null;
  division: string | null;
  lp: number | null;
  gameName: string | null;
  tagLine: string | null;
  riotRegion: string | null;
}

interface PendingSpot {
  id: string;
  riotId: string | null;
  username: string | null;
  role: string;
  addedAt: string;
}

interface TeamEvent {
  id: string;
  title: string;
  type: string;
  description: string | null;
  scheduledAt: string;
  duration: number | null;
  attendances: { userId: string; status: string }[];
}

interface TeamDetails {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  iconUrl: string | null;
  region: string;
  ownerId: string;
  ownerUsername: string;
  isOwner: boolean;
  isMember: boolean;
  canJoin: boolean;
  pendingSpotId: string | null;
  pendingSpotRole: string | null;
  myRole: string | null;
  canManageRoster: boolean;
  canEditSchedule: boolean;
  members: TeamMember[];
  pendingRoster: PendingSpot[];
  upcomingEvents: TeamEvent[];
  scrimPerformance: {
    totalSeries: number;
    wins: number;
    losses: number;
    winRate: number | null;
  };
  scrimReputation: {
    averageRating: number | null;
    reviewCount: number;
    recentReviews: Array<{
      id: string;
      reviewerTeam: {
        id: string;
        name: string;
        tag: string | null;
      };
      politeness: number;
      punctuality: number;
      gameplay: number;
      averageRating: number;
      message: string | null;
      createdAt: string;
      series: {
        id: string;
        matchCode: string;
        scheduledAt: string;
      } | null;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

const PLAYER_ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS'];
const STAFF_ROLES = ['MANAGER', 'COACH'];
const ALL_ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS', 'MANAGER', 'COACH'];

// Rank colors for visual consistency
const getRankColor = (rank: string | null): string => {
  const colors: Record<string, string> = {
    IRON: '#6B5650',
    BRONZE: '#A0522D',
    SILVER: '#A8B8C4',
    GOLD: '#FFD700',
    PLATINUM: '#40E0D0',
    EMERALD: '#00C853',
    DIAMOND: '#B9F2FF',
    MASTER: '#AB47BC',
    GRANDMASTER: '#F44336',
    CHALLENGER: '#00BCD4',
    UNRANKED: '#6B7280',
  };
  return colors[rank || 'UNRANKED'] || colors.UNRANKED;
};

// Get rank icon from community dragon
const getRankIcon = (rank: string): string => {
  const rankLower = rank.toLowerCase();
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${rankLower}.png`;
};

// Format rank display with LP for Master+
const formatRankDisplay = (rank: string | null, division: string | null, lp: number | null): string => {
  if (!rank || rank === 'UNRANKED') return 'Unranked';
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank)) {
    return `${rank} ${lp || 0} LP`;
  }
  return division ? `${rank} ${division}` : rank;
};

// Role display with LoL-style icons (SVGs)
const getRoleIcon = (role: string, size: string = 'w-4 h-4'): React.ReactNode => {
  const r = role.toUpperCase();
  switch(r) {
    case 'TOP':
      return <svg className={size} viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c32.06 0 64.12-.01 96.18.01-6.72 6.67-13.45 13.33-20.19 19.99H36v56c-6.66 6.73-13.33 13.46-19.99 20.18-.02-32.06 0-64.12-.01-96.18Z"/><path d="M104 44.02c5.32-5.33 10.65-10.64 15.99-15.94.02 30.64.01 61.28.01 91.92-30.64 0-61.28.01-91.93-.01 5.33-5.34 10.66-10.66 16-15.99 19.97-.01 39.95.01 59.93 0V44.02Z" opacity="0.75"/><path d="M56 56h28v28H56V56Z" opacity="0.75"/></svg>;
    case 'JGL':
    case 'JUNGLE':
      return <svg className={size} viewBox="0 0 136 136" fill="currentColor"><path d="M72.13 57.86C78.7 41.1 90.04 26.94 99.94 12.1 93 29.47 84.31 46.87 84.04 65.97c-.73 4.81-2.83 9.31-4 14.03-2.08-7.57-4.91-14.9-7.91-22.14ZM36.21 12.35c13.06 20.19 26.67 40.61 33.61 63.87 4.77 15.49 5.42 32.94-1.8 47.8-5.58-6.1-11.08-12.29-16.71-18.34-4.97-4.72-10.26-9.1-15.32-13.71-1.55-11.73-2.97-23.87-8.72-34.42-2.75-5.24-6.71-9.72-11.19-13.55 9.67 4.75 19.18 10.41 26.23 18.72 4.37 4.98 7.46 10.94 9.69 17.15 1.15-10.29.58-20.79-2.05-30.81-3.31-12.68-8.99-24.55-13.74-36.71ZM105.84 53.83c4.13-4 8.96-7.19 14.04-9.84-4.4 3.88-8.4 8.32-11.14 13.55-5.75 10.56-7.18 22.71-8.74 34.45-5.32 5.35-10.68 10.65-15.98 16.01.15-4.37-.25-8.84 1.02-13.1 3.39-15.08 9.48-30.18 20.8-41.07Z"/></svg>;
    case 'MID':
    case 'MIDDLE':
      return <svg className={size} viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c22.67 0 45.33 0 67.99.01C78.62 21.34 73.28 26.69 67.88 32c-11.96 0-23.92-.01-35.88 0-.01 12 .01 24-.01 36-5.32 5.3-10.64 10.6-15.98 15.89C15.99 61.26 16 38.63 16 16zm87.95 51.9c5.32-5.37 10.69-10.68 16.04-16.02.02 22.71.01 45.41 0 68.12-22.65 0-45.31.01-67.97-.01 5.33-5.33 10.65-10.67 15.99-15.99 12-.01 23.99.01 35.99 0 .04-12.04-.05-24.07-.05-36.1z" opacity="0.75"/><path d="M100.02 16H120v19.99C92 64 64 92 35.99 120H16v-19.99C44 72 72 43.99 100.02 16z"/></svg>;
    case 'ADC':
    case 'BOT':
    case 'BOTTOM':
      return <Image src="/assets/BotLane.png" alt="Bot" width={16} height={16} className={size} style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(16%) saturate(1018%) hue-rotate(8deg) brightness(91%) contrast(85%)' }} />;
    case 'SUP':
    case 'SUPPORT':
      return <svg className={size} viewBox="0 0 136 136" fill="currentColor"><path d="M52.21 12.03c10.33-.1 20.66.06 30.99-.08 1.71 2.62 3.2 5.37 4.79 8.07C81.32 28 74.68 36.01 68 43.98 61.32 36 54.66 28 48.01 19.99c1.4-2.65 2.82-5.29 4.2-7.96ZM0 36.3c14.64-.68 29.33-.11 43.99-.3C48 40 52 44 56 48.01c-2.67 9.32-5.32 18.66-8.01 27.98-6.66-2.65-13.32-5.32-19.98-7.99 3.97-5.35 8.02-10.63 11.96-15.99-5.01-.08-10.15.4-15-1.14C15.58 48.12 7.75 42.05 0 36.34v-.04ZM92.02 36c14.66.05 29.32-.09 43.98.07v.03c-7.3 5.9-15.1 11.53-24.1 14.5-5.11 1.85-10.59 1.34-15.91 1.41 4.01 5.32 8 10.65 11.99 15.98-6.64 2.7-13.31 5.34-19.97 8-2.69-9.32-5.34-18.65-8.01-27.98C84.01 44 88 39.99 92.02 36ZM64.01 52.11c1.36 1.26 2.7 2.55 3.99 3.89 1.32-1.33 2.65-2.65 3.99-3.97 4.04 19.97 7.97 39.96 12.02 59.92-5.31 4.05-10.66 8.07-16.04 12.03-5.32-4.01-10.67-7.97-15.98-12.01 4.04-19.94 7.96-39.92 12.02-59.86Z"/></svg>;
    case 'SUBS':
      return <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
    case 'MANAGER':
      return <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 14l2 2 4-4"/></svg>;
    case 'COACH':
      return <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
    case 'OWNER':
      return <svg className={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l3.22 3.22h4.56v4.56L23 12l-3.22 3.22v4.56h-4.56L12 23l-3.22-3.22H4.22v-4.56L1 12l3.22-3.22V4.22h4.56L12 1z"/></svg>;
    default:
      return <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/></svg>;
  }
};

const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    TOP: '#FF6B6B',
    JGL: '#4ECDC4',
    MID: '#FFE66D',
    ADC: '#95E1D3',
    SUP: '#DDA0DD',
    SUBS: '#6B7280',
    MANAGER: '#C8AA6D',
    COACH: '#9D4EDD',
    OWNER: '#FFD700',
  };
  return colors[role] || '#6B7280';
};

const teamLabel = (name: string, tag: string | null): string => {
  return tag ? `${name} [${tag}]` : name;
};

const renderRatingStars = (rating: number): string => {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}`;
};

const TeamDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  // Edit team modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', tag: '', description: '', region: '', iconUrl: '' });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Transfer ownership modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Add to roster modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ riotId: '', username: '', role: 'TOP' });
  const [addType, setAddType] = useState<'player' | 'staff'>('player');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const text = currentLanguage === 'fr'
    ? {
        loading: 'Chargement de l’équipe...',
        notFound: 'Équipe introuvable',
        back: 'Retour au tableau de bord',
        titleSuffix: 'Détails de l’équipe',
      }
    : {
        loading: 'Loading team...',
        notFound: 'Team not found',
        back: 'Back to Dashboard',
        titleSuffix: 'Team Details',
      };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const REGIONS = ['EUW', 'EUNE', 'NA', 'KR', 'JP', 'BR', 'LAN', 'LAS', 'OCE', 'TR', 'RU', 'PH', 'SG', 'TH', 'TW', 'VN', 'ME'];

  const fetchTeam = async () => {
    const token = getAuthToken();
    if (!token || !id) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setTeam(data);
        setError(null);
      } else if (res.status === 404) {
        setError(text.notFound);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load team');
      }
    } catch (err) {
      setError(text.notFound);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTeam();
    }
  }, [id]);

  const openEditModal = () => {
    if (team) {
      setEditForm({
        name: team.name,
        tag: team.tag || '',
        description: team.description || '',
        region: team.region,
        iconUrl: team.iconUrl || '',
      });
      setEditError(null);
      setShowEditModal(true);
    }
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token || !id) return;

    setEditing(true);
    setEditError(null);

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          tag: editForm.tag || null,
          description: editForm.description || null,
          region: editForm.region,
          iconUrl: editForm.iconUrl || null,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        await fetchTeam();
      } else {
        const data = await res.json();
        setEditError(data.error || 'Failed to update team');
      }
    } catch (err) {
      setEditError('Failed to update team');
    } finally {
      setEditing(false);
    }
  };

  const handleTransferOwnership = async () => {
    const token = getAuthToken();
    if (!token || !id || !transferTarget) return;

    if (!confirm(`Are you sure you want to transfer ownership? You will become a Manager and cannot undo this action.`)) {
      return;
    }

    setTransferring(true);
    setTransferError(null);

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/transfer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newOwnerId: transferTarget }),
      });

      if (res.ok) {
        setShowTransferModal(false);
        setTransferTarget('');
        await fetchTeam();
      } else {
        const data = await res.json();
        setTransferError(data.error || 'Failed to transfer ownership');
      }
    } catch (err) {
      setTransferError('Failed to transfer ownership');
    } finally {
      setTransferring(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/teams/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinTeam = async () => {
    const token = getAuthToken();
    if (!token || !id) return;

    setJoining(true);
    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchTeam();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to join team');
      }
    } catch (err) {
      alert('Failed to join team');
    } finally {
      setJoining(false);
    }
  };

  const handleAddToRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token || !id) return;

    setAdding(true);
    setAddError(null);

    const body: any = { role: addForm.role };
    if (addType === 'player') {
      body.riotId = addForm.riotId.trim();
    } else {
      body.username = addForm.username.trim();
    }

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/roster`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        setShowAddModal(false);
        setAddForm({ riotId: '', username: '', role: 'TOP' });
        await fetchTeam();
      } else {
        setAddError(data.error || 'Failed to add to roster');
      }
    } catch (err) {
      setAddError('Failed to add to roster');
    } finally {
      setAdding(false);
    }
  };

  const handleRemovePendingSpot = async (spotId: string) => {
    const token = getAuthToken();
    if (!token || !id) return;
    if (!confirm('Remove this pending roster spot?')) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/roster/${spotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchTeam();
      }
    } catch (err) {
      console.error('Failed to remove roster spot:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const token = getAuthToken();
    if (!token || !id) return;
    if (!confirm('Remove this member from the team?')) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchTeam();
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    const token = getAuthToken();
    if (!token || !id) return;

    try {
      const res = await fetch(`${apiUrl}/api/teams/${id}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        await fetchTeam();
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto">
          <NoAccess action="view" showButtons={true} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--color-accent-1)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>{text.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {error || text.notFound}
          </h1>
          <Link
            href="/teams/dashboard"
            className="inline-block px-4 py-2 rounded font-medium"
            style={{
              backgroundColor: 'var(--color-accent-1)',
              color: 'var(--color-bg-primary)',
            }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${team.name} - ${text.titleSuffix}`}
        description={currentLanguage === 'fr'
          ? `Voir et gérer le roster et le planning de ${team.name}.`
          : `View and manage ${team.name} team roster and schedule.`}
        path={`/teams/${team.id}`}
      />
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <header 
            className="border p-6 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Link
                href="/teams/dashboard"
                className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                {text.back}
              </Link>
            </div>
            
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex gap-4 flex-1 min-w-0">
                {/* Team Icon */}
                {team.iconUrl ? (
                  <img 
                    src={team.iconUrl}
                    alt={team.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0"
                    style={{
                      border: '2px solid var(--color-accent-1)',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center font-bold text-xl sm:text-2xl flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-accent-1)30 0%, var(--color-accent-1)10 100%)',
                      color: 'var(--color-accent-1)',
                      border: '2px solid var(--color-accent-1)',
                    }}
                  >
                    {team.tag ? team.tag.substring(0, 2) : team.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  {/* Team Name & Tag */}
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--color-accent-1)' }}>
                      {team.name}
                    </h1>
                    {team.tag && (
                      <span 
                        className="text-lg px-3 py-1 rounded-lg font-bold"
                        style={{ 
                          backgroundColor: 'var(--color-accent-primary-bg)', 
                          color: 'var(--color-accent-1)',
                          border: '1px solid var(--color-accent-1)',
                          opacity: 0.9
                        }}
                      >
                        [{team.tag}]
                      </span>
                    )}
                  </div>
                  
                  {/* Team Info Pills */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span 
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                    >
                      🌍 {team.region}
                    </span>
                    <span 
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                    >
                      👥 {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                    </span>
                    <Link
                      href={`/profile/${team.ownerUsername}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#FFD700' }}><path d="M12 1l3.22 3.22h4.56v4.56L23 12l-3.22 3.22v4.56h-4.56L12 23l-3.22-3.22H4.22v-4.56L1 12l3.22-3.22V4.22h4.56L12 1z"/></svg>
                      {team.ownerUsername}
                    </Link>
                    <span 
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
                    >
                      📅 Created {new Date(team.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Description */}
                  {team.description && (
                  <p 
                    className="text-sm leading-relaxed max-w-2xl"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {team.description}
                  </p>
                )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                {/* Edit Team Button (owner only) */}
                {team.isOwner && (
                  <button
                    onClick={openEditModal}
                    className="px-4 py-2.5 font-medium rounded-lg transition-all hover:opacity-80 border flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit Team
                  </button>
                )}
                {/* Transfer Ownership Button (owner only) */}
                {team.isOwner && team.members.length > 1 && (
                  <button
                    onClick={() => { setShowTransferModal(true); setTransferTarget(''); setTransferError(null); }}
                    className="px-4 py-2.5 font-medium rounded-lg transition-all hover:opacity-80 border flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'rgba(245, 158, 11, 0.4)',
                      color: '#F59E0B',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <polyline points="17 11 19 13 23 9"/>
                    </svg>
                    Transfer
                  </button>
                )}
                {/* Copy Link Button */}
                {team.canManageRoster && (
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 font-medium rounded-lg transition-all hover:opacity-80 border flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {copied ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        Share Link
                      </>
                    )}
                  </button>
                )}
                {/* Join Team Button (for users with pending spot) */}
                {team.canJoin && (
                  <button
                    onClick={handleJoinTeam}
                    disabled={joining}
                    className="px-5 py-2.5 font-semibold rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                    }}
                  >
                    {joining ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Joining...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="8.5" cy="7" r="4"/>
                          <line x1="20" y1="8" x2="20" y2="14"/>
                          <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                        Join as {team.pendingSpotRole}
                      </>
                    )}
                  </button>
                )}
                {/* Add to Roster Button (for owner/manager) */}
                {team.canManageRoster && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-5 py-2.5 font-semibold rounded-lg transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <line x1="20" y1="8" x2="20" y2="14"/>
                      <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                    Add to Roster
                  </button>
                )}
              </div>
            </div>
          </header>

          <section
            className="border p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Scrim Performance & Reputation
              </h2>
              <Link
                href="/teams/scrims"
                className="text-sm px-3 py-1.5 rounded-lg border hover:opacity-85"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Open Scrim Finder
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(59,130,246,0.35)', backgroundColor: 'rgba(59,130,246,0.08)' }}>
                <p className="text-xs uppercase tracking-wide" style={{ color: '#93C5FD' }}>Win Rate</p>
                <p className="text-2xl font-extrabold mt-1" style={{ color: '#DBEAFE' }}>
                  {team.scrimPerformance?.winRate !== null && team.scrimPerformance?.winRate !== undefined
                    ? `${team.scrimPerformance.winRate}%`
                    : 'No data'}
                </p>
              </div>

              <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(34,197,94,0.35)', backgroundColor: 'rgba(34,197,94,0.08)' }}>
                <p className="text-xs uppercase tracking-wide" style={{ color: '#86EFAC' }}>Record</p>
                <p className="text-2xl font-extrabold mt-1" style={{ color: '#DCFCE7' }}>
                  {team.scrimPerformance?.wins || 0}W - {team.scrimPerformance?.losses || 0}L
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {team.scrimPerformance?.totalSeries || 0} confirmed series
                </p>
              </div>

              <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.08)' }}>
                <p className="text-xs uppercase tracking-wide" style={{ color: '#FCD34D' }}>Team Rating</p>
                <p className="text-2xl font-extrabold mt-1" style={{ color: '#FEF3C7' }}>
                  {team.scrimReputation?.averageRating !== null && team.scrimReputation?.averageRating !== undefined
                    ? `${team.scrimReputation.averageRating.toFixed(2)} / 5`
                    : 'No reviews'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {team.scrimReputation?.reviewCount || 0} review{(team.scrimReputation?.reviewCount || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                Recent Public Scrim Reviews
              </h3>
              {!team.scrimReputation?.recentReviews || team.scrimReputation.recentReviews.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No public comments yet.
                </p>
              ) : (
                team.scrimReputation.recentReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-lg border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <div className="flex flex-wrap items-center gap-2 justify-between mb-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        From {teamLabel(review.reviewerTeam.name, review.reviewerTeam.tag)}
                      </p>
                      <span className="text-xs" style={{ color: '#FCD34D' }}>
                        {renderRatingStars(review.averageRating)} ({review.averageRating.toFixed(2)})
                      </span>
                    </div>

                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Politeness {review.politeness}/5 • Punctuality {review.punctuality}/5 • Gameplay {review.gameplay}/5
                    </p>

                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {review.message || 'No comment provided.'}
                    </p>

                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                      {review.series?.matchCode ? `${review.series.matchCode} • ` : ''}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Roster */}
          <section
            className="border p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <span>👥</span> Roster
                <span className="text-sm font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                  {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                </span>
              </h2>
            </div>
            {team.members.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-lg mb-2" style={{ color: 'var(--color-text-muted)' }}>No members yet</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Add team members using the "Add to Roster" button</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {team.members.map((member) => {
                  const rankColor = getRankColor(member.rank);
                  const roleColor = getRoleColor(member.role);
                  const hasRiotAccount = member.gameName && member.tagLine;
                  
                  return (
                    <div
                      key={member.id}
                      className="relative overflow-hidden rounded-lg border transition-all hover:border-opacity-60"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        borderLeft: `4px solid ${roleColor}`,
                      }}
                    >
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {/* Left side - Member info */}
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            {/* Role Icon */}
                            <div 
                              className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${roleColor}20`, border: `1px solid ${roleColor}40`, color: roleColor }}
                            >
                              {getRoleIcon(member.role, 'w-6 h-6')}
                            </div>
                            
                            {/* Member Details */}
                            <div className="flex-1 min-w-0">
                              {/* Username - clickable */}
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Link
                                  href={`/profile/${member.username}`}
                                  className="text-lg font-bold hover:underline transition-all"
                                  style={{ color: 'var(--color-accent-1)' }}
                                  title={`View ${member.username}'s profile`}
                                >
                                  {member.username}
                                </Link>
                              </div>
                              
                              {/* Riot Account */}
                              <div className="flex items-center gap-2 mb-2">
                                {hasRiotAccount ? (
                                  <div className="flex items-center gap-1.5">
                                    <img 
                                      width="14" 
                                      height="14" 
                                      src="https://img.icons8.com/color/48/riot-games.png" 
                                      alt="Riot Games" 
                                      className="opacity-80"
                                    />
                                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                      {member.gameName}#{member.tagLine}
                                    </span>
                                    {member.riotRegion && (
                                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
                                        {member.riotRegion}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
                                    No Riot account linked
                                  </span>
                                )}
                              </div>
                              
                              {/* Rank Badge */}
                              <div className="flex items-center gap-3">
                                {member.rank && member.rank !== 'UNRANKED' ? (
                                  <div 
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border"
                                    style={{ 
                                      backgroundColor: `${rankColor}15`, 
                                      color: rankColor, 
                                      borderColor: `${rankColor}40` 
                                    }}
                                  >
                                    <img 
                                      src={getRankIcon(member.rank)} 
                                      alt={member.rank} 
                                      className="w-4 h-4"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <span>{formatRankDisplay(member.rank, member.division, member.lp)}</span>
                                  </div>
                                ) : (
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}
                                  >
                                    Unranked
                                  </span>
                                )}
                                
                                {/* Joined date */}
                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right side - Role & Actions */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {team.canManageRoster && member.role !== 'OWNER' ? (
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                                className="px-3 py-1.5 text-sm rounded-lg border font-medium cursor-pointer transition-all hover:border-opacity-80"
                                style={{
                                  backgroundColor: 'var(--color-bg-secondary)',
                                  borderColor: roleColor,
                                  color: roleColor,
                                }}
                              >
                                {ALL_ROLES.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            ) : (
                              <span 
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
                                style={{ backgroundColor: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}
                              >
                                {getRoleIcon(member.role)} {member.role}
                              </span>
                            )}
                            {team.canManageRoster && member.role !== 'OWNER' && (
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                className="p-2 rounded-lg transition-all hover:opacity-80"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                                title="Remove member"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pending Roster (Owner/Manager only) */}
          {team.canManageRoster && team.pendingRoster.length > 0 && (
            <section
              className="border p-6"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <span>⏳</span> Pending Invites
                  <span className="text-sm font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', color: '#FFC107' }}>
                    {team.pendingRoster.length} pending
                  </span>
                </h2>
              </div>
              <div 
                className="p-3 rounded-lg mb-4 flex items-start gap-2"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
              >
                <span className="text-lg">ℹ️</span>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  These players and staff have been invited but haven't joined yet. They need to visit this team page and click the "Join" button to confirm their spot.
                </p>
              </div>
              <div className="grid gap-3">
                {team.pendingRoster.map((spot) => {
                  const roleColor = getRoleColor(spot.role);
                  const isPlayer = !!spot.riotId;
                  
                  return (
                    <div
                      key={spot.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        borderLeft: `4px solid ${roleColor}`,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${roleColor}20`, border: `1px solid ${roleColor}40`, color: roleColor }}
                        >
                          {getRoleIcon(spot.role, 'w-5 h-5')}
                        </div>
                        
                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isPlayer ? (
                              <div className="flex items-center gap-1.5">
                                <img 
                                  width="14" 
                                  height="14" 
                                  src="https://img.icons8.com/color/48/riot-games.png" 
                                  alt="Riot Games"
                                />
                                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                  {spot.riotId}
                                </span>
                              </div>
                            ) : (
                              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                @{spot.username}
                              </span>
                            )}
                            <span 
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: isPlayer ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)', color: isPlayer ? '#3B82F6' : '#A855F7' }}
                            >
                              {isPlayer ? 'Player' : 'Staff'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <span>Added {new Date(spot.addedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span 
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
                          style={{ backgroundColor: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}
                        >
                          {getRoleIcon(spot.role)} {spot.role}
                        </span>
                        <button
                          onClick={() => handleRemovePendingSpot(spot.id)}
                          className="p-2 rounded-lg transition-all hover:opacity-80"
                          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                          title="Cancel invitation"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Upcoming Events (Members only) */}
          {team.isMember && (
            <section
              className="border p-6"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <span>📅</span> Upcoming Events
                  {team.upcomingEvents.length > 0 && (
                    <span className="text-sm font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
                      {team.upcomingEvents.length} scheduled
                    </span>
                  )}
                </h2>
                <Link
                  href="/teams/schedule"
                  className="text-sm font-medium hover:opacity-80 flex items-center gap-1 transition-opacity"
                  style={{ color: 'var(--color-accent-1)' }}
                >
                  View Full Schedule
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
              {team.upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-lg mb-1" style={{ color: 'var(--color-text-muted)' }}>No upcoming events</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {team.canEditSchedule ? 'Create an event from the schedule page' : 'Events will appear here when scheduled'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {team.upcomingEvents.slice(0, 5).map((event) => {
                    const eventDate = new Date(event.scheduledAt);
                    const isToday = eventDate.toDateString() === new Date().toDateString();
                    const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                    
                    const getEventTypeColor = (type: string) => {
                      const colors: Record<string, string> = {
                        SCRIM: '#3B82F6',
                        PRACTICE: '#22C55E',
                        MATCH: '#EF4444',
                        MEETING: '#A855F7',
                        VOD_REVIEW: '#F59E0B',
                        OTHER: '#6B7280',
                      };
                      return colors[type] || colors.OTHER;
                    };
                    
                    const typeColor = getEventTypeColor(event.type);
                    
                    return (
                      <div
                        key={event.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border transition-all hover:border-opacity-60"
                        style={{ 
                          backgroundColor: 'var(--color-bg-tertiary)', 
                          borderColor: 'var(--color-border)',
                          borderLeft: `4px solid ${typeColor}`,
                        }}
                      >
                        {/* Date/Time */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div 
                            className="w-14 h-14 rounded-lg flex flex-col items-center justify-center"
                            style={{ backgroundColor: isToday ? 'rgba(34, 197, 94, 0.15)' : isTomorrow ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-bg-secondary)' }}
                          >
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                              {eventDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
                            </span>
                            <span className="text-xl font-bold" style={{ color: isToday ? '#22C55E' : isTomorrow ? '#3B82F6' : 'var(--color-text-primary)' }}>
                              {eventDate.getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : eventDate.toLocaleDateString(undefined, { weekday: 'long' })}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {event.duration && ` • ${event.duration} min`}
                            </p>
                          </div>
                        </div>
                        
                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              {event.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Type Badge */}
                        <span 
                          className="self-start sm:self-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}40` }}
                        >
                          {event.type.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Add to Roster Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); setAddError(null); } }}
        >
          <div
            className="w-full max-w-md border rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Modal Header */}
            <div 
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--color-border)', background: 'linear-gradient(135deg, var(--color-bg-tertiary) 0%, var(--color-bg-secondary) 100%)' }}
            >
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-accent-1)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Add to Roster
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setAddError(null); }}
                className="p-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-muted)' }}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Type Toggle */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => { setAddType('player'); setAddForm({ ...addForm, role: 'TOP' }); }}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: addType === 'player' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: addType === 'player' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                    border: `2px solid ${addType === 'player' ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                  }}
                >
                  <img 
                    width="16" 
                    height="16" 
                    src="https://img.icons8.com/color/48/riot-games.png" 
                    alt="Riot"
                    style={{ opacity: addType === 'player' ? 1 : 0.5 }}
                  />
                  Player
                </button>
                <button
                  onClick={() => { setAddType('staff'); setAddForm({ ...addForm, role: 'MANAGER' }); }}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: addType === 'staff' ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: addType === 'staff' ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                    border: `2px solid ${addType === 'staff' ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                  }}
                >
                  👔 Staff
                </button>
              </div>

              {addType === 'staff' && (
                <div 
                  className="mb-5 p-3 rounded-lg text-sm flex items-start gap-2"
                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                >
                  <span className="text-base">ℹ️</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Managers and Coaches must already have a RiftEssence profile before being added.
                  </span>
                </div>
              )}

              {addError && (
                <div 
                  className="mb-5 p-3 rounded-lg text-sm flex items-start gap-2"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                >
                  <span className="text-base">⚠️</span>
                  <span style={{ color: '#EF4444' }}>{addError}</span>
                </div>
              )}

              <form onSubmit={handleAddToRoster} className="space-y-5">
                {addType === 'player' ? (
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      Riot ID
                    </label>
                    <div className="relative">
                      <img 
                        width="16" 
                        height="16" 
                        src="https://img.icons8.com/color/48/riot-games.png" 
                        alt="Riot"
                        className="absolute left-3 top-1/2 transform -translate-y-1/2"
                      />
                      <input
                        type="text"
                        value={addForm.riotId}
                        onChange={(e) => setAddForm({ ...addForm, riotId: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                        placeholder="GameName#TAG"
                        required
                      />
                    </div>
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Enter the player's Riot ID (e.g., Faker#KR1)
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>@</span>
                      <input
                        type="text"
                        value={addForm.username}
                        onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                        className="w-full pl-9 pr-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                        placeholder="username"
                        required
                      />
                    </div>
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Enter their RiftEssence username
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(addType === 'player' ? PLAYER_ROLES : STAFF_ROLES).map((r) => {
                      const isSelected = addForm.role === r;
                      const roleColor = getRoleColor(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAddForm({ ...addForm, role: r })}
                          className="px-3 py-2.5 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-1.5"
                          style={{
                            backgroundColor: isSelected ? `${roleColor}20` : 'var(--color-bg-tertiary)',
                            color: isSelected ? roleColor : 'var(--color-text-secondary)',
                            border: `2px solid ${isSelected ? roleColor : 'var(--color-border)'}`,
                          }}
                        >
                          {getRoleIcon(r)} {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setAddError(null); }}
                    className="flex-1 px-4 py-3 font-medium rounded-lg border transition-all hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding || (addType === 'player' ? !addForm.riotId.trim() : !addForm.username.trim())}
                    className="flex-1 px-4 py-3 font-semibold rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                    }}
                  >
                    {adding ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Add to Roster
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-xl border overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div 
              className="px-6 py-4 border-b"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}
            >
              <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Edit Team
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Update your team's information
              </p>
            </div>
            <form onSubmit={handleEditTeam} className="p-6 space-y-4">
              {editError && (
                <div 
                  className="p-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Team Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border text-sm transition-all focus:outline-none"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Team name (2-50 characters)"
                  minLength={2}
                  maxLength={50}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Team Tag
                </label>
                <input
                  type="text"
                  value={editForm.tag}
                  onChange={(e) => setEditForm({ ...editForm, tag: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 rounded-lg border text-sm transition-all focus:outline-none uppercase"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="TAG (2-5 characters)"
                  minLength={2}
                  maxLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Region *
                </label>
                <select
                  value={editForm.region}
                  onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border text-sm transition-all focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  required
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border text-sm transition-all focus:outline-none resize-none"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Tell others about your team..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Team Icon URL
                </label>
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={editForm.iconUrl}
                      onChange={(e) => setEditForm({ ...editForm, iconUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border text-sm transition-all focus:outline-none"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      placeholder="https://example.com/team-icon.png"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Paste a URL to an image (e.g., from Imgur, Discord CDN, etc.)
                    </p>
                  </div>
                  {editForm.iconUrl && (
                    <div 
                      className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <img 
                        src={editForm.iconUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditError(null); }}
                  className="flex-1 px-4 py-3 font-medium rounded-lg border transition-all hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing || !editForm.name.trim() || !editForm.region}
                  className="flex-1 px-4 py-3 font-semibold rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  {editing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && team && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={(e) => e.target === e.currentTarget && setShowTransferModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-xl border overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div 
              className="px-6 py-4 border-b"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'var(--color-border)' }}
            >
              <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F59E0B' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <polyline points="17 11 19 13 23 9"/>
                </svg>
                Transfer Ownership
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                This action cannot be undone. You will become a Manager.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {transferError && (
                <div 
                  className="p-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  {transferError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Select New Owner
                </label>
                <select
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border text-sm transition-all focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="">Select a team member...</option>
                  {team.members.filter(m => m.role !== 'OWNER').map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.username} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              <div 
                className="p-3 rounded-lg text-sm"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.2)' }}
              >
                <strong>Warning:</strong> The new owner will have full control over the team, including the ability to remove members and delete the team.
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowTransferModal(false); setTransferError(null); }}
                  className="flex-1 px-4 py-3 font-medium rounded-lg border transition-all hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferOwnership}
                  disabled={transferring || !transferTarget}
                  className="flex-1 px-4 py-3 font-semibold rounded-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: '#F59E0B',
                    color: '#000',
                  }}
                >
                  {transferring ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Transferring...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="17 11 19 13 23 9"/>
                      </svg>
                      Transfer Ownership
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamDetailPage;
