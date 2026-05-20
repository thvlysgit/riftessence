import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEOHead from '@components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import NoAccess from '@components/NoAccess';
import { DiscordIcon } from '../../src/components/DiscordBrand';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRememberedTeamSelection } from '../../utils/useRememberedTeamSelection';

type MentionMode = 'EVERYONE' | 'ROLE' | 'TEAM_ROLE_MAP';

const DISCORD_BOT_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1363678859471491312&scope=bot%20applications.commands&permissions=2147863617';
const TEAM_ROLE_OPTIONS = ['TOP', 'JGL', 'MID', 'ADC', 'SUP', 'SUBS', 'MANAGER', 'COACH'] as const;
const REMINDER_DELAY_OPTIONS = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440] as const;
const MAX_REMINDER_DELAY_SELECTIONS = 8;
const FILL_AVAILABILITY_REMINDER_DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;
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

const minutesToTimeInput = (minutes: number): string => {
  const safe = Number.isInteger(minutes) ? Math.max(0, Math.min(1439, minutes)) : 60;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const timeInputToMinutes = (value: string): number | null => {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
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
  scrimCodeWebhookUrl: string | null;
  notifyEvents: boolean;
  notifyMembers: boolean;
  mentionMode: MentionMode;
  mentionRoleId: string | null;
  roleMentions: Record<string, string>;
  pingRecurrence: boolean;
  remindersEnabled: boolean;
  reminderDelaysMinutes: number[];
  playersCanSetScheduleEvents: boolean;
  fillAvailabilitiesReminderEnabled: boolean;
  fillAvailabilitiesReminderDayOfWeek: number;
  fillAvailabilitiesReminderTimeMinutes: number;
  webhookValid?: boolean;
  channelName?: string;
  guildName?: string;
  scrimCodeWebhookValid?: boolean;
  scrimCodeChannelName?: string;
  scrimCodeGuildName?: string;
}

const DiscordSettingsPage: React.FC = () => {
  const _router = useRouter();
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useRememberedTeamSelection(teams.map((team) => team.id));
  const [settings, setSettings] = useState<DiscordSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [scrimCodeWebhookUrl, setScrimCodeWebhookUrl] = useState('');
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyMembers, setNotifyMembers] = useState(false);
  const [mentionMode, setMentionMode] = useState<MentionMode>('EVERYONE');
  const [mentionRoleId, setMentionRoleId] = useState('');
  const [roleMentions, setRoleMentions] = useState<Record<string, string>>({});
  const [pingRecurrence, setPingRecurrence] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderDelaysMinutes, setReminderDelaysMinutes] = useState<number[]>([]);
  const [playersCanSetScheduleEvents, setPlayersCanSetScheduleEvents] = useState(false);
  const [fillAvailabilitiesReminderEnabled, setFillAvailabilitiesReminderEnabled] = useState(true);
  const [fillAvailabilitiesReminderDayOfWeek, setFillAvailabilitiesReminderDayOfWeek] = useState(0);
  const [fillAvailabilitiesReminderTime, setFillAvailabilitiesReminderTime] = useState('01:00');
  const [discordDmEnabled, setDiscordDmEnabled] = useState(false);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);

  const text = currentLanguage === 'fr'
    ? {
        back: 'Retour au tableau de bord',
        noTeams: 'Aucune équipe possédée',
        noTeamsDesc: 'Vous devez posséder une équipe pour configurer les notifications Discord.',
        createTeam: 'Créer une équipe',
        title: 'Notifications Discord',
        subtitle: 'Envoyez les mises à jour du planning vers votre serveur Discord',
        selectTeam: 'Sélectionner une équipe',
        deliveryTitle: 'Fonctionnement de la diffusion Discord',
        inviteBot: 'Inviter le bot RiftEssence',
        webhookTitle: 'Configuration du webhook',
        webhookGuide: 'Configurez le webhook de votre canal',
        dmOptInTitle: 'DMs Discord (par membre)',
        dmOptInDesc: 'Les membres recoivent des DMs Discord seulement s ils lient Discord et activent les notifications DM dans leurs parametres.',
        yourStatus: 'Ton statut',
        discordLinkedDmOn: 'Lie et notifications DM activees',
        discordLinkedDmOff: 'Lie, mais notifications DM desactivees',
        discordNotLinked: 'Discord non lie',
        manageDmSettings: 'Gerer les notifications DM dans les parametres',
        linkDiscordSettings: 'Lier Discord dans les parametres',
        deliveryBullet1: 'Les mises a jour du channel passent par ton webhook, donc les notifications partent meme si le bot ne peut pas poster directement dans le channel.',
        deliveryBullet2: 'Le bot gere toujours les interactions et le processing (presences, slash commands, fanout DM), donc l inviter reste fortement recommande.',
        deliveryBullet3: 'Si le ciblage d audience est utilise, seuls les membres concernes recoivent les DMs et peuvent repondre aux boutons de presence.',
        webhookStep1: 'Ouvre Discord et va dans les parametres de ton serveur',
        webhookStep2Prefix: 'Va dans',
        webhookStep2A: 'Integrations',
        webhookStep2B: 'Webhooks',
        webhookStep3Prefix: 'Clique sur',
        webhookStep3Action: 'Nouveau webhook',
        webhookStep3Suffix: 'et choisis le channel',
        webhookStep4: 'Copie l URL du webhook et colle-la ci-dessous',
        webhookTip: 'Astuce : garde aussi le bot invite pour fiabiliser les presences et le fanout DM.',
        scheduleWebhookUrl: 'URL du webhook Planning team',
        connectedTo: 'Connecte a #{channel} dans {guild}',
        invalidWebhook: 'Webhook invalide ou expire',
        scrimWebhookUrl: 'Webhook des codes scrim (override optionnel)',
        scrimWebhookPlaceholder: 'Laisse vide pour reutiliser le channel du webhook planning',
        scrimWebhookHelp: 'Par defaut, les updates de codes scrim utilisent le channel du webhook planning. Renseigne ceci seulement si tu veux un channel dedie.',
        scrimConnectedTo: 'Updates scrim connectees a #{channel} dans {guild}',
        invalidScrimWebhook: 'Webhook de codes scrim invalide',
        notifyTitle: 'Quoi notifier :',
        scheduleEvents: 'Evenements du planning',
        scheduleEventsDesc: 'Scrims, practices, tournois, reviews VOD, meetings',
        rosterChanges: 'Changements roster',
        rosterChangesDesc: 'Nouveaux membres, changements de role',
        schedulePermissions: 'Permissions planning',
        playersCanSetEvents: 'Les joueurs peuvent creer des evenements',
        playersCanSetEventsDesc: 'Autorise tous les membres de la team a creer, modifier et supprimer des evenements du Planning. Sinon, seuls owner, managers et coaches peuvent les gerer.',
        mentionStrategy: 'Strategie de mention',
        mentionStrategyDesc: 'Choisis comment les notifications de channel ping les gens. Le ciblage par evenement se regle toujours dans le Planning team.',
        everyoneDesc: 'Ping toujours tout le channel',
        singleRole: 'Role Discord unique',
        singleRoleDesc: 'Ping un role Discord fixe',
        teamRoleMapping: 'Mapping roles team',
        teamRoleMappingDesc: 'Mappe les roles team vers des IDs de roles Discord',
        discordRoleId: 'ID du role Discord',
        teamRoleMappingHelp: 'Configure seulement les roles que tu veux ping. Laisse les autres vides.',
        discordRolePlaceholder: 'ID du role Discord',
        mentionPreview: 'Apercu mention :',
        noMappedRoles: 'Aucun role mappe pour le moment (les messages partiront sans ping de role tant que tu n ajoutes pas d IDs).',
      }
    : {
        back: 'Back to Dashboard',
        noTeams: 'No Teams Owned',
        noTeamsDesc: 'You need to own a team to configure Discord notifications.',
        createTeam: 'Create a Team',
        title: 'Discord Notifications',
        subtitle: 'Send schedule updates to your Discord server',
        selectTeam: 'Select Team',
        deliveryTitle: 'How Team Discord Delivery Works',
        inviteBot: 'Invite RiftEssence Bot',
        webhookTitle: 'Webhook Configuration',
        webhookGuide: 'Set up your channel webhook',
        dmOptInTitle: 'Discord DM Opt-In (Per Member)',
        dmOptInDesc: 'Team members only receive Discord DMs when they link their Discord account and enable DM notifications in personal settings.',
        yourStatus: 'Your status',
        discordLinkedDmOn: 'Linked and DM notifications enabled',
        discordLinkedDmOff: 'Linked, but DM notifications disabled',
        discordNotLinked: 'Discord not linked',
        manageDmSettings: 'Manage DM Notifications in Settings',
        linkDiscordSettings: 'Link Discord in Settings',
        deliveryBullet1: 'Channel updates are sent through your webhook, so notifications still go out even if the bot cannot directly post to the channel.',
        deliveryBullet2: 'The bot still powers interactions and processing (attendance updates, slash commands, DM fanout), so inviting it is strongly recommended.',
        deliveryBullet3: 'If event audience targeting is used, only concerned members receive DMs and can act on attendance buttons for that event.',
        webhookStep1: 'Open Discord and go to your server settings',
        webhookStep2Prefix: 'Navigate to',
        webhookStep2A: 'Integrations',
        webhookStep2B: 'Webhooks',
        webhookStep3Prefix: 'Click',
        webhookStep3Action: 'New Webhook',
        webhookStep3Suffix: 'and select the channel',
        webhookStep4: 'Copy the webhook URL and paste it below',
        webhookTip: 'Tip: keep the bot invited too for attendance processing and DM fanout reliability.',
        scheduleWebhookUrl: 'Team Schedule Webhook URL',
        connectedTo: 'Connected to #{channel} in {guild}',
        invalidWebhook: 'Invalid or expired webhook URL',
        scrimWebhookUrl: 'Scrim Code Forwarding Webhook (Optional Override)',
        scrimWebhookPlaceholder: 'Leave empty to reuse the schedule webhook channel',
        scrimWebhookHelp: 'By default, scrim code lifecycle updates use your schedule webhook channel. Set this only if you want a dedicated channel for scrim codes.',
        scrimConnectedTo: 'Scrim updates connected to #{channel} in {guild}',
        invalidScrimWebhook: 'Invalid scrim code webhook URL',
        notifyTitle: 'What to notify:',
        scheduleEvents: 'Schedule Events',
        scheduleEventsDesc: 'Scrims, practices, tournaments, VOD reviews, meetings',
        rosterChanges: 'Roster Changes',
        rosterChangesDesc: 'New members joining, role changes',
        schedulePermissions: 'Schedule Permissions',
        playersCanSetEvents: 'Players can set schedule events',
        playersCanSetEventsDesc: 'Allow every team member to create, edit, and delete Team Schedule events. When disabled, only the owner, managers, and coaches can manage events.',
        mentionStrategy: 'Mention Strategy',
        mentionStrategyDesc: 'Choose how channel notifications ping people. Event audience targeting is still controlled per event in Team Schedule.',
        everyoneDesc: 'Always ping everyone in the channel',
        singleRole: 'Single Discord Role',
        singleRoleDesc: 'Ping one fixed Discord role',
        teamRoleMapping: 'Team Role Mapping',
        teamRoleMappingDesc: 'Map team roles to Discord role IDs',
        discordRoleId: 'Discord Role ID',
        teamRoleMappingHelp: 'Configure only the roles you want pinged. Leave others empty.',
        discordRolePlaceholder: 'Discord role ID',
        mentionPreview: 'Mention preview:',
        noMappedRoles: 'No mapped roles yet (messages will be sent without role ping until you add role IDs).',
      };

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
          setScrimCodeWebhookUrl(data.scrimCodeWebhookUrl || '');
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
          setPlayersCanSetScheduleEvents(data.playersCanSetScheduleEvents ?? false);
          setFillAvailabilitiesReminderEnabled(data.fillAvailabilitiesReminderEnabled ?? true);
          setFillAvailabilitiesReminderDayOfWeek(data.fillAvailabilitiesReminderDayOfWeek ?? 0);
          setFillAvailabilitiesReminderTime(minutesToTimeInput(data.fillAvailabilitiesReminderTimeMinutes ?? 60));
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

    const fillAvailabilityReminderTimeMinutes = timeInputToMinutes(fillAvailabilitiesReminderTime);
    if (fillAvailabilityReminderTimeMinutes === null) {
      setError('Choose a valid fill availabilities reminder time.');
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
          scrimCodeWebhookUrl: scrimCodeWebhookUrl.trim() || null,
          notifyEvents,
          notifyMembers,
          mentionMode,
          mentionRoleId: mentionMode === 'ROLE' ? (normalizedMentionRoleId || null) : null,
          roleMentions: mentionMode === 'TEAM_ROLE_MAP' ? sanitizedRoleMentions : {},
          pingRecurrence,
          remindersEnabled,
          reminderDelaysMinutes: sanitizedReminderDelays,
          playersCanSetScheduleEvents,
          fillAvailabilitiesReminderEnabled,
          fillAvailabilitiesReminderDayOfWeek,
          fillAvailabilitiesReminderTimeMinutes: fillAvailabilityReminderTimeMinutes,
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to save settings');
        return;
      }
      
      setSettings(data);
      setWebhookUrl(data.webhookUrl || '');
      setScrimCodeWebhookUrl(data.scrimCodeWebhookUrl || '');
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
      setPlayersCanSetScheduleEvents(data.playersCanSetScheduleEvents ?? false);
      setFillAvailabilitiesReminderEnabled(data.fillAvailabilitiesReminderEnabled ?? true);
      setFillAvailabilitiesReminderDayOfWeek(data.fillAvailabilitiesReminderDayOfWeek ?? 0);
      setFillAvailabilitiesReminderTime(minutesToTimeInput(data.fillAvailabilitiesReminderTimeMinutes ?? 60));
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
        setScrimCodeWebhookUrl('');
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
              {text.back}
            </Link>
            
            <div className="text-center py-12 border rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <DiscordIcon className="w-16 h-16 mx-auto mb-4" style={{ color: '#5865F2' }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{text.noTeams}</h2>
              <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                {text.noTeamsDesc}
              </p>
              <Link 
                href="/teams/dashboard" 
                className="inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-lg"
                style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
              >
                {text.createTeam}
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
              {text.back}
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(88, 101, 242, 0.15)' }}>
                <DiscordIcon className="w-8 h-8" style={{ color: '#5865F2' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{text.title}</h1>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {text.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Team Selector (if multiple teams) */}
          {teams.length > 1 && (
            <div className="border rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {text.selectTeam}
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
              {text.dmOptInTitle}
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              {text.dmOptInDesc}
            </p>
            <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {text.yourStatus}: {isDiscordLinked ? (discordDmEnabled ? text.discordLinkedDmOn : text.discordLinkedDmOff) : text.discordNotLinked}
                {isDiscordLinked && discordUsername ? ` (${discordUsername})` : ''}
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: '#5865F2' }}
            >
              {isDiscordLinked ? text.manageDmSettings : text.linkDiscordSettings}
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
                  {text.deliveryTitle}
                </h2>
                <ul className="text-sm space-y-2 mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  <li>• {text.deliveryBullet1}</li>
                  <li>• {text.deliveryBullet2}</li>
                  <li>• {text.deliveryBullet3}</li>
                </ul>
                <a
                  href={DISCORD_BOT_INVITE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="discord-cta inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm"
                >
                  <DiscordIcon className="w-4 h-4" />
                  {text.inviteBot}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5h5M5 5v14h14v-5" />
                  </svg>
                </a>
              </div>

              {/* Webhook Configuration */}
              <div className="border rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  {text.webhookTitle}
                </h2>

                {/* Instructions */}
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <h3 className="text-sm font-medium mb-2" style={{ color: '#5865F2' }}>
                    {text.webhookGuide}:
                  </h3>
                  <ol className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <li>1. {text.webhookStep1}</li>
                    <li>2. {text.webhookStep2Prefix} <strong>{text.webhookStep2A}</strong> → <strong>{text.webhookStep2B}</strong></li>
                    <li>3. {text.webhookStep3Prefix} <strong>{text.webhookStep3Action}</strong> {text.webhookStep3Suffix}</li>
                    <li>4. {text.webhookStep4}</li>
                  </ol>
                  <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
                    {text.webhookTip}
                  </p>
                </div>

                {/* Webhook URL Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {text.scheduleWebhookUrl}
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
                        {text.connectedTo.replace('{channel}', settings.channelName).replace('{guild}', settings.guildName || '')}
                      </p>
                    )}
                    {settings?.webhookValid === false && (
                      <p className="mt-2 text-sm flex items-center gap-2" style={{ color: '#EF4444' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {text.invalidWebhook}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {text.scrimWebhookUrl}
                    </label>
                    <input
                      type="url"
                      value={scrimCodeWebhookUrl}
                      onChange={e => setScrimCodeWebhookUrl(e.target.value)}
                      placeholder={text.scrimWebhookPlaceholder}
                      className="w-full px-4 py-3 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-[#5865F2]"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {text.scrimWebhookHelp}
                    </p>
                    {settings?.scrimCodeWebhookValid === true && settings?.scrimCodeChannelName && (
                      <p className="mt-2 text-sm flex items-center gap-2" style={{ color: '#22C55E' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {text.scrimConnectedTo.replace('{channel}', settings.scrimCodeChannelName).replace('{guild}', settings.scrimCodeGuildName || '')}
                      </p>
                    )}
                    {settings?.scrimCodeWebhookValid === false && (
                      <p className="mt-2 text-sm flex items-center gap-2" style={{ color: '#EF4444' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {text.invalidScrimWebhook}
                      </p>
                    )}
                  </div>

                  {/* Notification Options */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      {text.notifyTitle}
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
                            {text.scheduleEvents}
                          </span>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {text.scheduleEventsDesc}
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
                            {text.rosterChanges}
                          </span>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {text.rosterChangesDesc}
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Schedule permissions */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      {text.schedulePermissions}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setPlayersCanSetScheduleEvents(!playersCanSetScheduleEvents)}
                      className="flex items-center gap-3 w-full text-left"
                    >
                      <div
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${playersCanSetScheduleEvents ? 'bg-[#5865F2]' : 'bg-gray-600'}`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${playersCanSetScheduleEvents ? 'left-[22px]' : 'left-0.5'}`}
                        />
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {text.playersCanSetEvents}
                        </span>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {text.playersCanSetEventsDesc}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Mention strategy */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      {text.mentionStrategy}
                    </h3>
                    <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {text.mentionStrategyDesc}
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
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{text.everyoneDesc}</p>
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
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{text.singleRole}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{text.singleRoleDesc}</p>
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
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{text.teamRoleMapping}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{text.teamRoleMappingDesc}</p>
                      </button>
                    </div>

                    {mentionMode === 'ROLE' && (
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                          {text.discordRoleId}
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
                          {text.teamRoleMappingHelp}
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
                                placeholder={text.discordRolePlaceholder}
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
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{text.mentionPreview}</p>
                      {mentionMode === 'TEAM_ROLE_MAP' && previewMentions.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {text.noMappedRoles}
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

                  {/* Fill availabilities reminders */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      Fill Availabilities Reminder
                    </h3>
                    <button
                      type="button"
                      onClick={() => setFillAvailabilitiesReminderEnabled(!fillAvailabilitiesReminderEnabled)}
                      className="flex items-center gap-3 w-full text-left"
                    >
                      <div
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${fillAvailabilitiesReminderEnabled ? 'bg-[#5865F2]' : 'bg-gray-600'}`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${fillAvailabilitiesReminderEnabled ? 'left-[22px]' : 'left-0.5'}`}
                        />
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {fillAvailabilitiesReminderEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Sends a weekly Discord DM and channel prompt so members can fill next week's planning availability.
                        </p>
                      </div>
                    </button>

                    {fillAvailabilitiesReminderEnabled && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#5865F2' }}>
                            Reminder Day
                          </label>
                          <select
                            value={fillAvailabilitiesReminderDayOfWeek}
                            onChange={(event) => setFillAvailabilitiesReminderDayOfWeek(Number(event.target.value))}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{
                              backgroundColor: 'var(--color-bg-tertiary)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {FILL_AVAILABILITY_REMINDER_DAYS.map((day) => (
                              <option key={day.value} value={day.value}>{day.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#5865F2' }}>
                            Reminder Time
                          </label>
                          <input
                            type="time"
                            value={fillAvailabilitiesReminderTime}
                            onChange={(event) => setFillAvailabilitiesReminderTime(event.target.value)}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{
                              backgroundColor: 'var(--color-bg-tertiary)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-primary)',
                            }}
                          />
                        </div>
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
