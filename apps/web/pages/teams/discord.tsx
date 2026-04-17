import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEOHead from '@components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import NoAccess from '@components/NoAccess';
import { DiscordIcon } from '../../src/components/DiscordBrand';

type MentionMode = 'EVERYONE' | 'ROLE' | 'TEAM_ROLE_MAP';

const DISCORD_BOT_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1363678859471491312&scope=bot%20applications.commands&permissions=2147863617';
const TEAM_ROLE_OPTIONS = ['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS', 'MANAGER', 'COACH'] as const;
const REMINDER_DELAY_OPTIONS = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440] as const;
const MAX_REMINDER_DELAY_SELECTIONS = 8;
const TEAM_ROLE_LABELS: Record<(typeof TEAM_ROLE_OPTIONS)[number], string> = {
  TOP: 'Top Lane',
  JGL: 'Jungle',
  MID: 'Mid Lane',
  ADC: 'ADC',
  SUP: 'Support',
  SUBS: 'Substitutes',
  MANAGER: 'Manager',
  COACH: 'Coach',
};

const normalizeDiscordRoleId = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const mentionMatch = trimmed.match(/^<@&(\d+)>$/);
  const roleId = mentionMatch ? mentionMatch[1] : trimmed;
  return /^\d{6,30}$/.test(roleId) ? roleId : null;
};

const sanitizeReminderDelays = (raw: unknown): number[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const allowed = new Set<number>(REMINDER_DELAY_OPTIONS);
  const unique = new Set<number>();

  for (const value of raw) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) continue;
    if (!allowed.has(parsed)) continue;
    unique.add(parsed);
  }

  return Array.from(unique).sort((a, b) => a - b);
};

const formatReminderDelayLabel = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours}h`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

interface Team {
  id: string;
  name: string;
  tag: string | null;
  isOwner: boolean;
  myRole: string;
}

interface DiscordSettings {
  webhookUrl: string | null;
  notifyEvents: boolean;
  notifyMembers: boolean;
  mentionMode: MentionMode;
  mentionRoleId: string | null;
  roleMentions: Record<string, string>;
  pingRecurrence: boolean;
  remindersEnabled: boolean;
  reminderDelaysMinutes: number[];
  webhookValid?: boolean;
  channelName?: string;
  guildName?: string;
}

const DiscordSettingsPage: React.FC = () => {
  const _router = useRouter();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [settings, setSettings] = useState<DiscordSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyMembers, setNotifyMembers] = useState(false);
  const [mentionMode, setMentionMode] = useState<MentionMode>('EVERYONE');
  const [mentionRoleId, setMentionRoleId] = useState('');
  const [roleMentions, setRoleMentions] = useState<Record<string, string>>({});
  const [pingRecurrence, setPingRecurrence] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderDelaysMinutes, setReminderDelaysMinutes] = useState<number[]>([]);
  const [discordDmEnabled, setDiscordDmEnabled] = useState(false);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch teams user owns
  useEffect(() => {
    const fetchTeams = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const [teamsRes, profileRes] = await Promise.all([
          fetch(`${apiUrl}/api/teams`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${apiUrl}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          // Only show teams user owns (can manage Discord settings)
          const ownedTeams = data.filter((t: Team) => t.isOwner);
          setTeams(ownedTeams);
          if (ownedTeams.length > 0) {
            setSelectedTeamId((prev) => {
              if (prev && ownedTeams.some((team: Team) => team.id === prev)) {
                return prev;
              }
              return ownedTeams[0].id;
            });
          }
        }

        if (profileRes.ok) {
          const profile = await profileRes.json();
          setDiscordDmEnabled(profile.discordDmNotifications ?? false);
          setDiscordUsername(profile.discordUsername || null);
        }
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, [apiUrl]);

  // Fetch Discord settings when team is selected
  useEffect(() => {
    const fetchSettings = async () => {
      if (!selectedTeamId) {
        setSettings(null);
        return;
      }
      
      const token = getAuthToken();
      if (!token) return;
      
      try {
        const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/discord`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const fetchedMentionMode: MentionMode = data.mentionMode === 'ROLE' || data.mentionMode === 'TEAM_ROLE_MAP'
            ? data.mentionMode
            : 'EVERYONE';
          const fetchedReminderDelays = sanitizeReminderDelays(data.reminderDelaysMinutes);

          setSettings(data);
          setWebhookUrl(data.webhookUrl || '');
          setNotifyEvents(data.notifyEvents ?? true);
          setNotifyMembers(data.notifyMembers ?? false);
          setMentionMode(fetchedMentionMode);
          setMentionRoleId(data.mentionRoleId || '');
          setRoleMentions(
            data.roleMentions && typeof data.roleMentions === 'object' && !Array.isArray(data.roleMentions)
              ? data.roleMentions
              : {}
          );
          setPingRecurrence(data.pingRecurrence ?? true);
          setRemindersEnabled(data.remindersEnabled ?? false);
          setReminderDelaysMinutes(fetchedReminderDelays);
        }
      } catch (err) {
        console.error('Failed to fetch Discord settings:', err);
      }
    };
    
    fetchSettings();
  }, [selectedTeamId, apiUrl]);

  const handleSave = async () => {
    if (!selectedTeamId) return;
    
    const token = getAuthToken();
    if (!token) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);

    const normalizedMentionRoleId = normalizeDiscordRoleId(mentionRoleId);
    if (mentionMode === 'ROLE' && mentionRoleId.trim() && !normalizedMentionRoleId) {
      setError('Invalid Discord role ID for mention strategy. Use a numeric role ID or <@&roleId>.');
      setSaving(false);
      return;
    }

    const sanitizedRoleMentions: Record<string, string> = {};
    if (mentionMode === 'TEAM_ROLE_MAP') {
      const invalidRoles: string[] = [];
      for (const role of TEAM_ROLE_OPTIONS) {
        const rawValue = roleMentions[role] || '';
        if (!rawValue.trim()) continue;

        const normalized = normalizeDiscordRoleId(rawValue);
        if (!normalized) {
          invalidRoles.push(TEAM_ROLE_LABELS[role]);
          continue;
        }
        sanitizedRoleMentions[role] = normalized;
      }

      if (invalidRoles.length > 0) {
        setError(`Invalid Discord role IDs for: ${invalidRoles.join(', ')}`);
        setSaving(false);
        return;
      }
    }

    const sanitizedReminderDelays = sanitizeReminderDelays(reminderDelaysMinutes);
    if (remindersEnabled && sanitizedReminderDelays.length === 0) {
      setError('Choose at least one reminder delay when reminders are enabled.');
      setSaving(false);
      return;
    }
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/discord`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim() || null,
          notifyEvents,
          notifyMembers,
          mentionMode,
          mentionRoleId: mentionMode === 'ROLE' ? (normalizedMentionRoleId || null) : null,
          roleMentions: mentionMode === 'TEAM_ROLE_MAP' ? sanitizedRoleMentions : {},
          pingRecurrence,
          remindersEnabled,
          reminderDelaysMinutes: sanitizedReminderDelays,
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to save settings');
        return;
      }
      
      setSettings(data);
      setMentionMode(data.mentionMode === 'ROLE' || data.mentionMode === 'TEAM_ROLE_MAP' ? data.mentionMode : 'EVERYONE');
      setMentionRoleId(data.mentionRoleId || '');
      setRoleMentions(
        data.roleMentions && typeof data.roleMentions === 'object' && !Array.isArray(data.roleMentions)
          ? data.roleMentions
          : {}
      );
      setPingRecurrence(data.pingRecurrence ?? true);
      setRemindersEnabled(data.remindersEnabled ?? false);
      setReminderDelaysMinutes(sanitizeReminderDelays(data.reminderDelaysMinutes));
      setSuccess('Discord settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedTeamId || !webhookUrl.trim()) return;
    
    const token = getAuthToken();
    if (!token) return;
    
    setTesting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/discord/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Test failed');
        return;
      }
      
      setSuccess('Test message sent! Check your Discord channel.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Failed to send test message');
    } finally {
      setTesting(false);
    }
  };

  const handleRemoveWebhook = async () => {
    if (!selectedTeamId) return;
    
    const token = getAuthToken();
    if (!token) return;
    
    if (!confirm('Are you sure you want to remove the Discord webhook? Notifications will stop.')) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/discord`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setSettings(null);
        setWebhookUrl('');
        setNotifyEvents(true);
        setNotifyMembers(false);
        setPingRecurrence(true);
        setRemindersEnabled(false);
        setReminderDelaysMinutes([]);
        setSuccess('Webhook removed');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to remove webhook');
    } finally {
      setSaving(false);
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
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: '#5865F2', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <>
        <SEOHead
          title="Discord Settings"
          description="Configure Discord notifications for your team"
          path="/teams/discord"
        />
        <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <div className="max-w-2xl mx-auto">
            <Link href="/teams/dashboard" className="inline-flex items-center gap-2 mb-6 text-sm hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            
            <div className="text-center py-12 border rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <DiscordIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#5865F2' }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>No Teams Owned</h2>
              <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                You need to own a team to configure Discord notifications.
              </p>
              <Link 
                href="/teams/dashboard" 
                className="inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-lg"
                style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
              >
                Create a Team
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const isDiscordLinked = Boolean(user?.discordLinked || discordUsername);

  const toggleReminderDelay = (delay: number) => {
    const alreadySelected = reminderDelaysMinutes.includes(delay);
    if (!alreadySelected && reminderDelaysMinutes.length >= MAX_REMINDER_DELAY_SELECTIONS) {
      setError(`You can select up to ${MAX_REMINDER_DELAY_SELECTIONS} reminder delays.`);
      return;
    }

    if (error && error.includes('reminder delay')) {
      setError(null);
    }

    setReminderDelaysMinutes((prev) => {
      if (prev.includes(delay)) {
        return prev.filter((value) => value !== delay);
      }
      return [...prev, delay].sort((a, b) => a - b);
    });
  };

  const roleMapMentions = TEAM_ROLE_OPTIONS
    .map((role) => {
      const normalized = normalizeDiscordRoleId(roleMentions[role] || '');
      return normalized ? `<@&${normalized}>` : null;
    })
    .filter((value): value is string => Boolean(value));

  const previewMentions = mentionMode === 'EVERYONE'
    ? ['@everyone']
    : mentionMode === 'ROLE'
      ? (() => {
          const normalized = normalizeDiscordRoleId(mentionRoleId);
          return normalized ? [`<@&${normalized}>`] : ['@role'];
        })()
      : roleMapMentions;

  const selectedReminderLabels = reminderDelaysMinutes
    .slice()
    .sort((a, b) => a - b)
    .map((delay) => formatReminderDelayLabel(delay));
  const reminderSelectionLimitReached = reminderDelaysMinutes.length >= MAX_REMINDER_DELAY_SELECTIONS;

  return (
    <>
      <SEOHead
        title="Discord Settings"
        description="Configure Discord notifications for your team"
        path="/teams/discord"
      />
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <Link href="/teams/dashboard" className="inline-flex items-center gap-2 mb-4 text-sm hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(88, 101, 242, 0.15)' }}>
                <DiscordIcon className="w-8 h-8" style={{ color: '#5865F2' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Discord Notifications</h1>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Send schedule updates to your Discord server
                </p>
              </div>
            </div>
          </div>

          {/* Team Selector (if multiple teams) */}
          {teams.length > 1 && (
            <div className="border rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Select Team
              </label>
              <div className="flex flex-wrap gap-2">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedTeamId === team.id ? 'ring-2 ring-offset-2 ring-[#5865F2]' : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: selectedTeamId === team.id ? '#5865F2' : 'var(--color-bg-tertiary)',
                      color: selectedTeamId === team.id ? '#fff' : 'var(--color-text-primary)',
                    }}
                  >
                    {team.tag ? `[${team.tag}] ` : ''}{team.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DM discoverability */}
          <div className="border rounded-xl p-5" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Discord DM Opt-In (Per Member)
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Team members only receive Discord DMs when they link their Discord account and enable DM notifications in personal settings.
            </p>
            <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                Your status: {isDiscordLinked ? (discordDmEnabled ? 'Linked and DM notifications enabled' : 'Linked, but DM notifications disabled') : 'Discord not linked'}
                {isDiscordLinked && discordUsername ? ` (${discordUsername})` : ''}
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: '#5865F2' }}
            >
              {isDiscordLinked ? 'Manage DM Notifications in Settings' : 'Link Discord in Settings'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {selectedTeamId && (
            <>
              {/* Delivery behavior */}
              <div className="border rounded-xl p-5" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  How Team Discord Delivery Works
                </h2>
                <ul className="text-sm space-y-2 mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  <li>• Channel updates are sent through your webhook, so notifications still go out even if the bot cannot directly post to the channel.</li>
                  <li>• The bot still powers interactions and processing (attendance updates, slash commands, DM fanout), so inviting it is strongly recommended.</li>
                  <li>• If event audience targeting is used, only concerned members receive DMs and can act on attendance buttons for that event.</li>
                </ul>
                <a
                  href={DISCORD_BOT_INVITE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="discord-cta inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm"
                >
                  <DiscordIcon className="w-4 h-4" />
                  Invite RiftEssence Bot
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5h5M5 5v14h14v-5" />
                  </svg>
                </a>
              </div>

              {/* Webhook Configuration */}
              <div className="border rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Webhook Configuration
                </h2>

                {/* Instructions */}
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <h3 className="text-sm font-medium mb-2" style={{ color: '#5865F2' }}>
                    Set up your channel webhook:
                  </h3>
                  <ol className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <li>1. Open Discord and go to your server settings</li>
                    <li>2. Navigate to <strong>Integrations</strong> → <strong>Webhooks</strong></li>
                    <li>3. Click <strong>New Webhook</strong> and select the channel</li>
                    <li>4. Copy the webhook URL and paste it below</li>
                  </ol>
                  <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
                    Tip: keep the bot invited too for attendance processing and DM fanout reliability.
                  </p>
                </div>

                {/* Webhook URL Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-4 py-3 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-[#5865F2]"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    {settings?.webhookValid === true && settings?.channelName && (
                      <p className="mt-2 text-sm flex items-center gap-2" style={{ color: '#22C55E' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Connected to #{settings.channelName} in {settings.guildName}
                      </p>
                    )}
                    {settings?.webhookValid === false && (
                      <p className="mt-2 text-sm flex items-center gap-2" style={{ color: '#EF4444' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Invalid or expired webhook URL
                      </p>
                    )}
                  </div>

                  {/* Notification Options */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      What to notify:
                    </h3>
                    
                    <div className="space-y-3">
                      <button 
                        type="button"
                        onClick={() => setNotifyEvents(!notifyEvents)}
                        className="flex items-center gap-3 w-full text-left group"
                      >
                        <div 
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifyEvents ? 'bg-[#5865F2]' : 'bg-gray-600'}`}
                        >
                          <div 
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${notifyEvents ? 'left-[22px]' : 'left-0.5'}`}
                          />
                        </div>
                        <div>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            Schedule Events
                          </span>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            Scrims, practices, tournaments, VOD reviews, meetings
                          </p>
                        </div>
                      </button>

                      <button 
                        type="button"
                        onClick={() => setNotifyMembers(!notifyMembers)}
                        className="flex items-center gap-3 w-full text-left group"
                      >
                        <div 
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifyMembers ? 'bg-[#5865F2]' : 'bg-gray-600'}`}
                        >
                          <div 
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${notifyMembers ? 'left-[22px]' : 'left-0.5'}`}
                          />
                        </div>
                        <div>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            Roster Changes
                          </span>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            New members joining, role changes
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Mention strategy */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      Mention Strategy
                    </h3>
                    <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                      Choose how channel notifications ping people. Event audience targeting is still controlled per event in Team Schedule.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setMentionMode('EVERYONE')}
                        className="p-3 rounded-lg text-left border transition-all"
                        style={{
                          backgroundColor: mentionMode === 'EVERYONE' ? 'rgba(88, 101, 242, 0.15)' : 'var(--color-bg-tertiary)',
                          borderColor: mentionMode === 'EVERYONE' ? 'rgba(88, 101, 242, 0.4)' : 'var(--color-border)',
                        }}
                      >
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>@everyone</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Always ping everyone in the channel</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMentionMode('ROLE')}
                        className="p-3 rounded-lg text-left border transition-all"
                        style={{
                          backgroundColor: mentionMode === 'ROLE' ? 'rgba(88, 101, 242, 0.15)' : 'var(--color-bg-tertiary)',
                          borderColor: mentionMode === 'ROLE' ? 'rgba(88, 101, 242, 0.4)' : 'var(--color-border)',
                        }}
                      >
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Single Discord Role</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Ping one fixed Discord role</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMentionMode('TEAM_ROLE_MAP')}
                        className="p-3 rounded-lg text-left border transition-all"
                        style={{
                          backgroundColor: mentionMode === 'TEAM_ROLE_MAP' ? 'rgba(88, 101, 242, 0.15)' : 'var(--color-bg-tertiary)',
                          borderColor: mentionMode === 'TEAM_ROLE_MAP' ? 'rgba(88, 101, 242, 0.4)' : 'var(--color-border)',
                        }}
                      >
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Team Role Mapping</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Map team roles to Discord role IDs</p>
                      </button>
                    </div>

                    {mentionMode === 'ROLE' && (
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                          Discord Role ID
                        </label>
                        <input
                          type="text"
                          value={mentionRoleId}
                          onChange={(e) => setMentionRoleId(e.target.value)}
                          placeholder="123456789012345678 or <@&123456789012345678>"
                          className="w-full px-4 py-3 rounded-lg border text-sm"
                          style={{
                            backgroundColor: 'var(--color-bg-tertiary)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </div>
                    )}

                    {mentionMode === 'TEAM_ROLE_MAP' && (
                      <div>
                        <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                          Configure only the roles you want pinged. Leave others empty.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {TEAM_ROLE_OPTIONS.map((role) => (
                            <div key={role}>
                              <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#5865F2' }}>
                                {TEAM_ROLE_LABELS[role]}
                              </label>
                              <input
                                type="text"
                                value={roleMentions[role] || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setRoleMentions((prev) => {
                                    const next = { ...prev };
                                    if (value.trim()) {
                                      next[role] = value;
                                    } else {
                                      delete next[role];
                                    }
                                    return next;
                                  });
                                }}
                                placeholder="Discord role ID"
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{
                                  backgroundColor: 'var(--color-bg-tertiary)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text-primary)',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Mention preview:</p>
                      {mentionMode === 'TEAM_ROLE_MAP' && previewMentions.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          No mapped roles yet (messages will be sent without role ping until you add role IDs).
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {previewMentions.map((mention, index) => (
                            <span key={`${mention}-${index}`} className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'rgba(88, 101, 242, 0.25)', color: '#dee0fc' }}>
                              {mention}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ping recurrence */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      Ping Recurrence
                    </h3>
                    <button
                      type="button"
                      onClick={() => setPingRecurrence(!pingRecurrence)}
                      className="flex items-center gap-3 w-full text-left"
                    >
                      <div
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${pingRecurrence ? 'bg-[#5865F2]' : 'bg-gray-600'}`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${pingRecurrence ? 'left-[22px]' : 'left-0.5'}`}
                        />
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {pingRecurrence ? 'Allow pings on every notification' : 'Limit pings to once per hour'}
                        </span>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          When disabled, messages still send every time but role/everyone pings are throttled to once per hour per team channel.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Event reminders */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      Pre-Event Reminders
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setRemindersEnabled((prev) => {
                          const next = !prev;
                          if (next) {
                            setReminderDelaysMinutes((existing) => (existing.length > 0 ? existing : [30]));
                          }
                          return next;
                        });
                      }}
                      className="flex items-center gap-3 w-full text-left"
                    >
                      <div
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${remindersEnabled ? 'bg-[#5865F2]' : 'bg-gray-600'}`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${remindersEnabled ? 'left-[22px]' : 'left-0.5'}`}
                        />
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {remindersEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Sends reminders to the Discord channel and DMs (for linked members with DM opt-in) before event start.
                        </p>
                      </div>
                    </button>

                    {remindersEnabled && (
                      <div className="mt-3">
                        <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                          Choose one or multiple lead times (max {MAX_REMINDER_DELAY_SELECTIONS}):
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          {REMINDER_DELAY_OPTIONS.map((delay) => {
                            const isSelected = reminderDelaysMinutes.includes(delay);
                            const isDisabled = !isSelected && reminderSelectionLimitReached;
                            return (
                              <button
                                key={delay}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => toggleReminderDelay(delay)}
                                className="px-3 py-2 rounded-lg border text-sm font-medium transition-all"
                                style={{
                                  backgroundColor: isSelected ? 'rgba(88, 101, 242, 0.2)' : 'var(--color-bg-tertiary)',
                                  borderColor: isSelected ? 'rgba(88, 101, 242, 0.5)' : 'var(--color-border)',
                                  color: isSelected ? '#dee0fc' : 'var(--color-text-primary)',
                                  opacity: isDisabled ? 0.55 : 1,
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {formatReminderDelayLabel(delay)}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                          {selectedReminderLabels.length > 0
                            ? `Selected: ${selectedReminderLabels.join(', ')}`
                            : 'Select at least one delay to enable reminders.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {(error || success) && (
                    <div>
                      {error && (
                        <div className="border rounded-lg p-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                          </div>
                        </div>
                      )}
                      {success && (
                        <div className="border rounded-lg p-4" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)', color: '#22C55E' }}>
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {success}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="discord-cta flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg"
                    >
                      <DiscordIcon className="w-4 h-4" />
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Saving...
                        </span>
                      ) : 'Save Settings'}
                    </button>
                    
                    <button
                      onClick={handleTest}
                      disabled={testing || !webhookUrl.trim()}
                      className="discord-cta-outline inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-lg"
                    >
                      <DiscordIcon className="w-4 h-4" />
                      {testing ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Testing...
                        </span>
                      ) : 'Send Test'}
                    </button>

                    {settings?.webhookUrl && (
                      <button
                        onClick={handleRemoveWebhook}
                        disabled={saving}
                        className="px-6 py-3 font-semibold rounded-lg border transition-all hover:opacity-80 disabled:opacity-50"
                        style={{
                          backgroundColor: 'transparent',
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                          color: '#EF4444'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="border rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Notification Preview
                </h2>
                
                {/* Discord-style embed preview */}
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#36393f' }}>
                  <div className="p-4 flex items-start gap-4">
                    {/* Bot avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))' }}>
                      <span className="text-white font-bold text-sm">RE</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Bot name and timestamp */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">RiftEssence</span>
                        <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: '#5865F2' }}>BOT</span>
                        <span className="text-xs" style={{ color: '#a3a6aa' }}>Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      {/* Mention */}
                      <div className="mb-2 flex flex-wrap gap-2">
                        {previewMentions.length > 0 ? previewMentions.slice(0, 4).map((mention, index) => (
                          <span key={`${mention}-${index}`} className="text-sm px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(88, 101, 242, 0.3)', color: '#dee0fc' }}>
                            {mention}
                          </span>
                        )) : (
                          <span className="text-sm px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' }}>
                            (no ping)
                          </span>
                        )}
                        {previewMentions.length > 4 && (
                          <span className="text-sm px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' }}>
                            +{previewMentions.length - 4} more
                          </span>
                        )}
                      </div>
                      
                      {/* Embed */}
                      <div className="rounded overflow-hidden flex" style={{ backgroundColor: '#2f3136' }}>
                        {/* Left accent bar */}
                        <div className="w-1" style={{ backgroundColor: '#22C55E' }} />
                        
                        <div className="p-3 flex-1">
                          {/* Embed title */}
                          <div className="font-semibold mb-2" style={{ color: '#00b0f4' }}>
                            📅 New Event: Practice Session
                          </div>
                          
                          {/* Embed fields */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div style={{ color: '#a3a6aa' }}>Type</div>
                              <div style={{ color: '#dcddde' }}>Practice</div>
                            </div>
                            <div>
                              <div style={{ color: '#a3a6aa' }}>When</div>
                              <div style={{ color: '#dcddde' }}>Tomorrow, 7:00 PM</div>
                            </div>
                            <div>
                              <div style={{ color: '#a3a6aa' }}>Duration</div>
                              <div style={{ color: '#dcddde' }}>2 hours</div>
                            </div>
                            <div>
                              <div style={{ color: '#a3a6aa' }}>Created by</div>
                              <div style={{ color: '#dcddde' }}>{user?.username || 'You'}</div>
                            </div>
                          </div>
                          
                          {/* Footer */}
                          <div className="mt-3 pt-2 border-t flex items-center gap-2 text-xs" style={{ borderColor: '#40444b', color: '#a3a6aa' }}>
                            <span>{selectedTeam?.name || 'Your Team'}</span>
                            <span>•</span>
                            <span>RiftEssence Team Manager</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="mt-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  This is how notifications will appear in your Discord channel.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DiscordSettingsPage;
