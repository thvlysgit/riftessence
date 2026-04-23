import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEOHead from '@components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeader, getAuthToken } from '../../utils/auth';
import NoAccess from '@components/NoAccess';
import { useGlobalUI } from '@components/GlobalUI';
import { CreateTeamLftModal } from '@components/CreateTeamLftModal';
import { DiscordIcon } from '../../src/components/DiscordBrand';
import { useLanguage } from '../../contexts/LanguageContext';

interface TeamMember {
  userId: string;
  username: string;
  role: string;
  isOwner: boolean;
  joinedAt: string;
}

interface Team {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  iconUrl: string | null;
  region: string;
  ownerId: string;
  ownerUsername: string;
  isOwner: boolean;
  myRole: string;
  memberCount: number;
  eventCount: number;
  upcomingEventCount: number;
  pendingInvites: number;
  members: TeamMember[];
  createdAt: string;
}

const REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
const DEFAULT_TEAM_REGION = 'NA';

type ProfileRegionPayload = {
  region?: string | null;
  riotAccounts?: Array<{ region?: string | null; isMain?: boolean }>;
};

function normalizeTeamRegion(region: unknown): string | null {
  if (typeof region !== 'string') {
    return null;
  }

  const normalized = region.trim().toUpperCase();
  return REGIONS.includes(normalized) ? normalized : null;
}

function resolvePreferredTeamRegion(profile: ProfileRegionPayload): string {
  const profileRegion = normalizeTeamRegion(profile.region);
  if (profileRegion) {
    return profileRegion;
  }

  const accounts = Array.isArray(profile.riotAccounts) ? profile.riotAccounts : [];
  const mainAccount = accounts.find((acc) => acc?.isMain);
  const mainRegion = normalizeTeamRegion(mainAccount?.region);
  if (mainRegion) {
    return mainRegion;
  }

  for (const account of accounts) {
    const accountRegion = normalizeTeamRegion(account?.region);
    if (accountRegion) {
      return accountRegion;
    }
  }

  return DEFAULT_TEAM_REGION;
}

const TeamsDashboardPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const { showToast, confirm: confirmAction } = useGlobalUI();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create team modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preferredRegion, setPreferredRegion] = useState<string>(DEFAULT_TEAM_REGION);
  const [createForm, setCreateForm] = useState({ name: '', tag: '', description: '', region: DEFAULT_TEAM_REGION });
  const [creating, setCreating] = useState(false);
  const [showTeamLftModal, setShowTeamLftModal] = useState(false);
  
  // Team selector modal for Manage Roster
  const [showTeamSelectorModal, setShowTeamSelectorModal] = useState(false);

  const pageText = currentLanguage === 'fr'
    ? {
        title: 'Tableau de bord des équipes',
        subtitle: 'Créez et gérez vos équipes',
        createTeam: 'Créer une équipe',
        myTeams: 'Mes équipes',
        loading: 'Chargement...',
        noTeamsTitle: 'Aucune équipe pour le moment',
        noTeamsDesc: 'Créez votre première équipe pour commencer à organiser des scrims et gérer votre roster.',
        firstTeamCta: 'Créer votre première équipe',
        manageRoster: 'Gérer le roster',
        recruitViaLft: 'Recruter via LFT',
        scheduleScrims: 'Planifier des scrims',
        scrimFinder: 'Recherche de scrims',
        draftRoom: 'Salle de draft',
        discordForwarding: 'Redirection Discord',
        quickLinksTitle: 'Vous cherchez des joueurs ou une équipe ?',
        quickLinksDesc: 'Consultez la page LFT pour trouver des coéquipiers.',
        browseLft: 'Parcourir LFT',
        createModalTitle: 'Créer une équipe',
      }
    : {
        title: 'Teams Dashboard',
        subtitle: 'Create and manage your teams',
        createTeam: 'Create Team',
        myTeams: 'My Teams',
        loading: 'Loading...',
        noTeamsTitle: 'No Teams Yet',
        noTeamsDesc: 'Create your first team to start organizing scrims and managing your roster.',
        firstTeamCta: 'Create Your First Team',
        manageRoster: 'Manage Roster',
        recruitViaLft: 'Recruit via LFT',
        scheduleScrims: 'Schedule Scrims',
        scrimFinder: 'Scrim Finder',
        draftRoom: 'Draft Room',
        discordForwarding: 'Discord Forwarding',
        quickLinksTitle: 'Looking for players or want to join a team?',
        quickLinksDesc: 'Check out the LFT page to find teammates.',
        browseLft: 'Browse LFT',
        createModalTitle: 'Create New Team',
      };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchTeams = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        setError(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setTeams([]);
        setError(data.error || 'Failed to fetch teams');
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setTeams([]);
      setError('Failed to fetch teams');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchTeams();
      setLoading(false);
    };
    const token = getAuthToken();
    if (token) loadData();
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || !user) return;

    let cancelled = false;

    const fetchPreferredRegion = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          return;
        }

        const profile = (await res.json()) as ProfileRegionPayload;
        const resolvedRegion = resolvePreferredTeamRegion(profile);

        if (cancelled) {
          return;
        }

        setPreferredRegion(resolvedRegion);
        setCreateForm((prev) => {
          const currentRegion = normalizeTeamRegion(prev.region);
          if (currentRegion && currentRegion !== DEFAULT_TEAM_REGION) {
            return prev;
          }
          if (currentRegion === resolvedRegion) {
            return prev;
          }
          return { ...prev, region: resolvedRegion };
        });
      } catch (regionError) {
        console.error('Failed to resolve preferred team region:', regionError);
      }
    };

    void fetchPreferredRegion();

    return () => {
      cancelled = true;
    };
  }, [apiUrl, user?.id]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token || !createForm.name.trim()) return;
    
    setCreating(true);
    setError(null);
    
    try {
      const res = await fetch(`${apiUrl}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          tag: createForm.tag.trim() || null,
          description: createForm.description.trim() || null,
          region: createForm.region
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowCreateModal(false);
        setCreateForm({ name: '', tag: '', description: '', region: preferredRegion });
        await fetchTeams();
      } else {
        setError(data.error || 'Failed to create team');
      }
    } catch (err) {
      setError('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    const token = getAuthToken();
    if (!token || !user) return;
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/${teamId}/members/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        await fetchTeams();
      }
    } catch (err) {
      console.error('Failed to leave team:', err);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const token = getAuthToken();
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this team? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        await fetchTeams();
      }
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  };

  const handleOpenTeamLftModal = () => {
    if (teams.length === 0) {
      setShowCreateModal(true);
      return;
    }

    setShowTeamLftModal(true);
  };

  const maybeShowDiscordRecruitingNudge = async (): Promise<boolean> => {
    try {
      const headers = getAuthHeader();
      if (!headers || !('Authorization' in headers)) return false;

      const profileRes = await fetch(`${apiUrl}/api/user/profile`, { headers });
      if (!profileRes.ok) return false;

      const profile = await profileRes.json();
      const needsDiscordLink = !profile.discordLinked;
      const needsDmSetup = !profile.discordDmNotifications;

      if (!needsDiscordLink && !needsDmSetup) {
        return false;
      }

      const setupNow = await confirmAction({
        title: 'We Have a Feature That Helps',
        message: needsDiscordLink
          ? 'RiftEssence can help your team stay on top of recruiting through Discord reminders. Link your Discord account first, then enable DM notifications.'
          : 'RiftEssence can help your team stay on top of recruiting through Discord reminders. Enable Discord DM notifications so the bot can send timely updates.',
        confirmText: needsDiscordLink ? 'Open Profile Setup' : 'Open DM Setup',
        cancelText: 'Later',
      });

      if (setupNow) {
        await router.push(needsDiscordLink ? '/profile' : '/settings');
        return true;
      }

      return false;
    } catch (nudgeError) {
      console.error('Failed to check Discord DM setup state:', nudgeError);
      return false;
    }
  };

  const handleTeamLftSubmit = async (data: any) => {
    const token = getAuthToken();
    if (!token) {
      showToast('Please log in to publish a team listing.', 'error');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/lft/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          type: 'TEAM',
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Failed to publish team listing.', 'error');
        return;
      }

      showToast(body?.updated ? 'Team listing updated on LFT.' : 'Team listing published on LFT.', 'success');
      setShowTeamLftModal(false);
      const redirectedToSetup = await maybeShowDiscordRecruitingNudge();
      if (!redirectedToSetup) {
        router.push('/lft');
      }
    } catch (submitError) {
      console.error('Failed to publish team listing:', submitError);
      showToast('Failed to publish team listing.', 'error');
    }
  };
  
  // Handle Manage Roster click - if one team, go directly; if multiple, show modal
  const handleManageRosterClick = () => {
    if (teams.length === 0) {
      // No teams, prompt to create
      setShowCreateModal(true);
    } else if (teams.length === 1) {
      // One team - go directly
      router.push(`/teams/${teams[0].id}`);
    } else {
      // Multiple teams - show selector modal
      setShowTeamSelectorModal(true);
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

  return (
    <>
      <SEOHead
        title="Teams Dashboard"
        description="Create and manage your League of Legends teams. Invite players, organize your roster, and prepare for competitive play."
        path="/teams/dashboard"
        keywords="LoL team management, League of Legends team dashboard, team roster, LoL esports team"
      />
      <div
        className="min-h-screen py-10 px-4"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold"
                style={{ color: 'var(--color-accent-1)' }}
              >
                {pageText.title}
              </h1>
              <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {pageText.subtitle}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 font-semibold rounded transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                color: 'var(--color-bg-primary)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              + {pageText.createTeam}
            </button>
          </header>

          {/* My Teams Section */}
          <section
            className="border p-6 sm:p-8"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {pageText.myTeams} {teams.length > 0 && <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>({teams.length})</span>}
            </h2>
            {error && !showCreateModal && (
              <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                {error}
              </div>
            )}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--color-accent-1)', borderTopColor: 'transparent' }} />
                <p style={{ color: 'var(--color-text-muted)' }}>{pageText.loading}</p>
              </div>
            ) : teams.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto mb-4"
                    style={{ color: 'var(--color-text-muted)' }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {pageText.noTeamsTitle}
                  </h3>
                  <p
                    className="mb-6"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {pageText.noTeamsDesc}
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 font-semibold rounded transition-all hover:opacity-90"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                      color: 'var(--color-bg-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    + {pageText.firstTeamCta}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {teams.map((team) => {
                    // Role colors
                    const roleColors: Record<string, string> = {
                      OWNER: '#FFD700',
                      MANAGER: '#C8AA6D',
                      COACH: '#9D4EDD',
                      TOP: '#FF6B6B',
                      JGL: '#4ECDC4',
                      MID: '#FFE66D',
                      ADC: '#95E1D3',
                      SUP: '#DDA0DD',
                      SUBS: '#6B7280',
                    };
                    const roleColor = roleColors[team.myRole] || '#6B7280';
                    
                    return (
                      <div
                        key={team.id}
                        className="border rounded-xl overflow-hidden transition-all hover:shadow-lg hover:border-opacity-60 group"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        {/* Team Header with gradient */}
                        <div 
                          className="p-4 pb-3"
                          style={{
                            background: `linear-gradient(135deg, ${roleColor}15 0%, transparent 100%)`,
                            borderBottom: '1px solid var(--color-border)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Team Avatar/Icon */}
                              {team.iconUrl ? (
                                <img 
                                  src={team.iconUrl}
                                  alt={team.name}
                                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                  style={{
                                    border: `1px solid ${roleColor}40`,
                                  }}
                                  onError={(e) => {
                                    // Fallback to initials if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0 ${team.iconUrl ? 'hidden' : ''}`}
                                style={{
                                  background: `linear-gradient(135deg, ${roleColor}30 0%, ${roleColor}10 100%)`,
                                  color: roleColor,
                                  border: `1px solid ${roleColor}40`,
                                }}
                              >
                                {team.tag ? team.tag.substring(0, 2) : team.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-lg truncate" style={{ color: 'var(--color-text-primary)' }}>
                                    {team.name}
                                  </h3>
                                  {team.tag && (
                                    <span 
                                      className="text-xs px-2 py-0.5 rounded font-semibold"
                                      style={{ backgroundColor: 'var(--color-accent-primary-bg)', color: 'var(--color-accent-1)' }}
                                    >
                                      [{team.tag}]
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                                    </svg>
                                    {team.region}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                    </svg>
                                    {team.memberCount}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Team Body */}
                        <div className="p-4 pt-3">
                          {/* Role Badge */}
                          <div className="flex items-center justify-between mb-3">
                            <div 
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
                              style={{ backgroundColor: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}
                            >
                              {team.isOwner && (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 1l3.22 3.22h4.56v4.56L23 12l-3.22 3.22v4.56h-4.56L12 23l-3.22-3.22H4.22v-4.56L1 12l3.22-3.22V4.22h4.56L12 1z"/>
                                </svg>
                              )}
                              {team.isOwner ? `Owner${team.myRole ? ` • ${team.myRole}` : ''}` : team.myRole}
                            </div>
                            {team.upcomingEventCount > 0 && (
                              <div 
                                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {team.upcomingEventCount} upcoming
                              </div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2">
                            <Link
                              href={`/teams/${team.id}`}
                              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg text-center transition-all hover:opacity-90"
                              style={{
                                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                                color: 'var(--color-bg-primary)',
                              }}
                            >
                              View Team
                            </Link>
                            {team.isOwner ? (
                              <button
                                onClick={() => handleDeleteTeam(team.id)}
                                className="px-4 py-2.5 text-sm font-medium rounded-lg border transition-all hover:opacity-80"
                                style={{
                                  backgroundColor: 'transparent',
                                  borderColor: 'rgba(239, 68, 68, 0.4)',
                                  color: '#EF4444',
                                }}
                                title="Delete team"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLeaveTeam(team.id)}
                                className="px-4 py-2.5 text-sm font-medium rounded-lg border transition-all hover:opacity-80"
                                style={{
                                  backgroundColor: 'transparent',
                                  borderColor: 'rgba(239, 68, 68, 0.4)',
                                  color: '#EF4444',
                                }}
                                title="Leave team"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </section>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {/* Manage Roster - Clickable */}
            <button
              onClick={handleManageRosterClick}
              className="border p-6 rounded-xl text-left transition-all hover:scale-[1.02] hover:shadow-lg group"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(200, 170, 109, 0.2) 0%, rgba(200, 170, 109, 0.1) 100%)',
                  border: '1px solid rgba(200, 170, 109, 0.3)'
                }}
              >
                <svg
                  className="w-7 h-7"
                  style={{ color: 'var(--color-accent-1)' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className="font-bold text-lg mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {pageText.manageRoster}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Add players, assign roles, and organize your team structure.
                  </p>
                </div>
                <svg 
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" 
                  style={{ color: 'var(--color-accent-1)' }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              {teams.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {teams.length === 1 ? `Go to ${teams[0].name}` : `${teams.length} teams available`}
                  </span>
                </div>
              )}
            </button>

            {/* Recruit via LFT */}
            <button
              onClick={handleOpenTeamLftModal}
              className="border p-6 rounded-xl text-left transition-all hover:scale-[1.02] hover:shadow-lg group"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                <svg className="w-7 h-7" style={{ color: '#22C55E' }} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 9a3 3 0 116 0v1h1a2 2 0 012 2v3H3v-3a2 2 0 012-2h1V9z" />
                  <path d="M10 2a3 3 0 00-3 3v2h6V5a3 3 0 00-3-3z" />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {pageText.recruitViaLft}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Publish or update your team listing, including manager and coach needs.
                  </p>
                </div>
                <svg
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1"
                  style={{ color: '#22C55E' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {teams.length === 0 ? 'Create a team first to post.' : 'One active listing per team, editable anytime.'}
                </span>
              </div>
            </button>

            {/* Schedule Scrims - Clickable Link */}
            <Link
              href="/teams/schedule"
              className="border p-6 rounded-xl block transition-all hover:scale-[1.02] hover:shadow-lg group"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                <svg
                  className="w-7 h-7"
                  style={{ color: '#3B82F6' }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className="font-bold text-lg mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {pageText.scheduleScrims}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Coordinate practice sessions and matches with your team.
                  </p>
                </div>
                <svg 
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" 
                  style={{ color: '#3B82F6' }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Scrim Finder - Clickable Link */}
            <Link
              href="/teams/scrims"
              className="border p-6 rounded-xl block transition-all hover:scale-[1.02] hover:shadow-lg group"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                }}
              >
                <svg className="w-7 h-7" style={{ color: '#2563EB' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 4l6 6-8 8-6-6 8-8z" />
                  <path d="M4 20l4-4" />
                  <path d="M16 8l4-4" />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className="font-bold text-lg mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {pageText.scrimFinder}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Publish scrim slots, filter opponents, and manage proposal decisions.
                  </p>
                </div>
                <svg
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1"
                  style={{ color: '#2563EB' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Draft Room - Clickable Link */}
            <Link
              href="/teams/drafts"
              className="border p-6 rounded-xl block transition-all hover:scale-[1.02] hover:shadow-lg group"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(239, 68, 68, 0.18) 100%)',
                  border: '1px solid rgba(147, 197, 253, 0.3)',
                }}
              >
                <svg className="w-7 h-7" style={{ color: '#93C5FD' }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M4 6h6v6H4z" />
                  <path d="M14 6h6v6h-6z" />
                  <path d="M4 16h6v4H4z" />
                  <path d="M14 14h6v6h-6z" />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className="font-bold text-lg mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {pageText.draftRoom}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Centralize team champion pools and build scenario drafts in one place.
                  </p>
                </div>
                <svg
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1"
                  style={{ color: '#93C5FD' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Discord Forwarding Settings - Now Functional */}
            <Link
              href="/teams/discord"
              className="border p-6 rounded-xl block transition-all hover:scale-[1.02] hover:shadow-lg group"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.2) 0%, rgba(88, 101, 242, 0.1) 100%)',
                  border: '1px solid rgba(88, 101, 242, 0.3)'
                }}
              >
                <DiscordIcon className="w-7 h-7" style={{ color: '#5865F2' }} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className="font-bold text-lg mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {pageText.discordForwarding}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Forward schedule updates and announcements to your Discord server.
                  </p>
                </div>
                <svg 
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" 
                  style={{ color: '#5865F2' }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Quick Links */}
          <div
            className="border p-4 rounded-lg flex flex-wrap items-center justify-between gap-4"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div>
              <p style={{ color: 'var(--color-text-primary)' }} className="font-medium">
                {pageText.quickLinksTitle}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {pageText.quickLinksDesc}
              </p>
            </div>
            <Link
              href="/lft"
              className="px-4 py-2 font-semibold rounded transition-all border"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-accent-1)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              {pageText.browseLft}
            </Link>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-md border rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {pageText.createModalTitle}
            </h2>
            
            {error && (
              <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Team Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Enter team name"
                  maxLength={50}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Team Tag (optional)
                </label>
                <input
                  type="text"
                  value={createForm.tag}
                  onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="e.g., TSM"
                  maxLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Region *
                </label>
                <select
                  value={createForm.region}
                  onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Description (optional)
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded border resize-none"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Describe your team..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 font-medium rounded border transition-all hover:opacity-80"
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
                  disabled={creating || !createForm.name.trim()}
                  className="flex-1 px-4 py-2 font-semibold rounded transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CreateTeamLftModal
        open={showTeamLftModal}
        onClose={() => setShowTeamLftModal(false)}
        onSubmit={handleTeamLftSubmit}
      />
      
      {/* Team Selector Modal */}
      {showTeamSelectorModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTeamSelectorModal(false); }}
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
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                Select Team
              </h2>
              <button
                onClick={() => setShowTeamSelectorModal(false)}
                className="p-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-muted)' }}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Choose which team's roster you want to manage:
              </p>
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => {
                      setShowTeamSelectorModal(false);
                      router.push(`/teams/${team.id}`);
                    }}
                    className="w-full p-4 rounded-lg border text-left transition-all hover:scale-[1.01] hover:shadow-md flex items-center justify-between group"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {team.name}
                        </h3>
                        {team.tag && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-accent-primary-bg)', color: 'var(--color-accent-1)' }}>
                            [{team.tag}]
                          </span>
                        )}
                        {team.isOwner && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)', color: '#FFD700' }}>
                            👑 Owner
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <span>{team.region}</span>
                        <span>•</span>
                        <span>{team.memberCount} members</span>
                        <span>•</span>
                        <span>Your role: {team.isOwner ? `Owner${team.myRole ? ` • ${team.myRole}` : ''}` : team.myRole}</span>
                      </div>
                    </div>
                    <svg 
                      className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" 
                      style={{ color: 'var(--color-accent-1)' }}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamsDashboardPage;
