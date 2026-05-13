import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, TextChannel, EmbedBuilder, ActivityType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonInteraction, StringSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ModalSubmitInteraction, Guild } from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const DISCORD_BOT_API_KEY = process.env.DISCORD_BOT_API_KEY!;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3333';
const POLL_INTERVAL_MS = parseInt(process.env.DISCORD_BOT_POLL_INTERVAL_MS || '60000', 10);

if (!DISCORD_BOT_TOKEN || !DISCORD_BOT_API_KEY) {
  console.error('❌ Missing required environment variables: DISCORD_BOT_TOKEN and DISCORD_BOT_API_KEY');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ============================================================
// Constants
// ============================================================

const APP_URL = process.env.APP_URL || 'https://riftessence.app';
const EMOJI_SOURCE_GUILD_ID = process.env.DISCORD_EMOJI_SOURCE_GUILD_ID || '1051156621860020304';
const CHAMPION_ICON_SOURCE_GUILD_IDS = (process.env.DISCORD_CHAMPION_ICON_SOURCE_GUILD_IDS
  || '1161703478851280956,1051156621860020304,1051156621860020304,908030229803581471')
  .split(',')
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0);

const REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU', 'SG'];
const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
const RANKS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const ROLE_FORWARDING_RANK_KEYS = [...RANKS, 'UNRANKED'];
const ROLE_FORWARDING_LANGUAGE_KEYS = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Polish', 'Russian', 'Turkish', 'Korean', 'Japanese', 'Chinese',
];

const CHAT_REPLY_BUTTON_PREFIX = 'chat_reply_open_';
const CHAT_REPLY_MODAL_PREFIX = 'chat_reply_modal_';
const CHAT_REPLY_TEXT_INPUT_ID = 'chat_reply_text';

const ROLE_MENU_MODE_PREFIX = 'rolemenu_mode_';
const ROLE_MENU_SAVE = 'rolemenu_save';
const ROLE_MENU_CLEAR = 'rolemenu_clear';
const ROLE_MENU_BACK = 'rolemenu_back';
const ROLE_MENU_REFRESH = 'rolemenu_refresh';
const ROLE_MENU_SYNC = 'rolemenu_sync';
const ROLE_MENU_CLOSE = 'rolemenu_close';
const ROLE_MENU_SELECT_KEY = 'rolemenu_select_key';
const ROLE_MENU_SELECT_ROLE = 'rolemenu_select_role';
const ROLE_MENU_ROLE_PAGE_PREV = 'rolemenu_role_page_prev';
const ROLE_MENU_ROLE_PAGE_NEXT = 'rolemenu_role_page_next';
const ROLE_MENU_ROLES_PER_PAGE = 25;

const SETUP_FILTER_LANGUAGE = 'filter_language';
const SETUP_FILTER_RANK_RANGE = 'filter_rank_range';
const SEND_DRAFT_TEAM_SELECT = 'send_draft_team_select';
const SEND_DRAFT_PICK_SELECT = 'send_draft_pick_select';
const TEAM_EVENT_TEAM_SELECT = 'team_event_team_select';
const TEAM_EVENT_TYPE_SELECT = 'team_event_type_select';
const TEAM_EVENT_MODAL = 'team_event_modal';
const TEAM_EVENT_TITLE_INPUT = 'team_event_title';
const TEAM_EVENT_DATETIME_INPUT = 'team_event_datetime';
const TEAM_EVENT_DURATION_INPUT = 'team_event_duration';
const TEAM_EVENT_OPPONENT_INPUT = 'team_event_opponent';
const TEAM_EVENT_DESCRIPTION_INPUT = 'team_event_description';
const TEAM_EVENT_TYPES = ['SCRIM', 'PRACTICE', 'VOD_REVIEW', 'TOURNAMENT', 'TEAM_MEETING'] as const;
const TEAM_AVAILABILITY_BUTTON_PREFIX = 'team_avail_open_';
const TEAM_AVAILABILITY_MODAL_PREFIX = 'team_avail_modal_';
const TEAM_AVAILABILITY_DAY_INPUT_PREFIX = 'team_avail_day_';
const TEAM_AVAILABILITY_SCOPES = ['week', 'weekend'] as const;
const DUO_POST_MODAL = 'duo_post_modal';
const DUO_POST_MODAL_BUTTON = 'duo_post_modal_open';
const DUO_RIOT_ID_INPUT = 'duo_riot_id';
const DUO_ROLES_INPUT = 'duo_roles';
const DUO_LANGUAGES_INPUT = 'duo_languages';
const DUO_MESSAGE_INPUT = 'duo_message';
const DUO_VC_INPUT = 'duo_vc';
const CHAMPION_EMOJI_BATCH_COUNT = 4;
const CHAMPION_POOL_TIER_ORDER = ['S', 'A', 'B', 'C'] as const;

const ROLE_FORWARDING_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_ROLE_FORWARDING_POLL_INTERVAL_MS || '300000', 10);
const TEAM_AVAILABILITY_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_TEAM_AVAILABILITY_POLL_INTERVAL_MS || '300000', 10);
const MIRROR_DELETION_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_MIRROR_DELETION_POLL_INTERVAL_MS || '20000', 10);
const MIRROR_DELETION_BATCH_SIZE = parseInt(process.env.DISCORD_MIRROR_DELETION_BATCH_SIZE || '20', 10);
const MIRRORED_MESSAGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const RANK_EMOJIS: Record<string, string> = {
  IRON: '🪨', BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇', PLATINUM: '💎',
  EMERALD: '💚', DIAMOND: '💠', MASTER: '🟣', GRANDMASTER: '🔴', CHALLENGER: '👑',
};

const ROLE_EMOJIS: Record<string, string> = {
  TOP: '🛡️', JUNGLE: '🌿', MID: '⚔️', ADC: '🏹', SUPPORT: '❤️',
};

const ROLE_CUSTOM_EMOJI_NAMES: Record<string, string> = {
  TOP: 'top',
  JUNGLE: 'jgl',
  MID: 'mid',
  ADC: 'adc',
  SUPPORT: 'sup',
};

const RANK_CUSTOM_EMOJI_NAMES: Record<string, string> = {
  IRON: 'loliron',
  BRONZE: 'lolbronze',
  SILVER: 'lolsilver',
  GOLD: 'lolgold',
  PLATINUM: 'lolplatine',
  EMERALD: 'lolemerald',
  DIAMOND: 'loldiamant',
  MASTER: 'lolmaster',
  GRANDMASTER: 'lolgrandmaster',
  CHALLENGER: 'lolchallenger',
};

const globalEmojiFallbackMap = new Map<string, string>();
const globalChampionEmojiFallbackMap = new Map<string, string>();

type MirrorPostType = 'DUO' | 'LFT' | 'SCRIM';

type MirrorDeletionEvent = {
  id: string;
  postType: MirrorPostType;
  postId: string;
  queuedAt: string;
  attempts: number;
};

type MirroredMessageRef = {
  guildId: string;
  channelId: string;
  messageId: string;
  createdAtMs: number;
};

const mirroredMessageRefs = new Map<string, MirroredMessageRef[]>();

function getMirrorIndexKey(postType: MirrorPostType, postId: string): string {
  return `${postType}:${postId}`;
}

function storeMirroredMessageRef(postType: MirrorPostType, postId: string, guildId: string, channelId: string, messageId: string) {
  const key = getMirrorIndexKey(postType, postId);
  const now = Date.now();
  const existing = mirroredMessageRefs.get(key) || [];

  const filtered = existing.filter((entry) => now - entry.createdAtMs <= MIRRORED_MESSAGE_RETENTION_MS);
  filtered.push({ guildId, channelId, messageId, createdAtMs: now });
  mirroredMessageRefs.set(key, filtered.slice(-100));
}

function getMirroredMessageRefs(postType: MirrorPostType, postId: string): MirroredMessageRef[] {
  const key = getMirrorIndexKey(postType, postId);
  const now = Date.now();
  const entries = (mirroredMessageRefs.get(key) || []).filter((entry) => now - entry.createdAtMs <= MIRRORED_MESSAGE_RETENTION_MS);
  if (entries.length === 0) {
    mirroredMessageRefs.delete(key);
    return [];
  }

  mirroredMessageRefs.set(key, entries);
  return entries;
}

function removeMirroredMessageRef(postType: MirrorPostType, postId: string, channelId: string, messageId: string) {
  const key = getMirrorIndexKey(postType, postId);
  const remaining = (mirroredMessageRefs.get(key) || []).filter((entry) => !(entry.channelId === channelId && entry.messageId === messageId));
  if (remaining.length === 0) {
    mirroredMessageRefs.delete(key);
    return;
  }

  mirroredMessageRefs.set(key, remaining);
}

function clearMirroredMessageRefs(postType: MirrorPostType, postId: string) {
  mirroredMessageRefs.delete(getMirrorIndexKey(postType, postId));
}

function formatEmojiMention(emoji: { id: string; name: string | null; animated?: boolean | null }): string | null {
  if (!emoji.name) return null;
  return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
}

async function refreshGlobalEmojiFallbackMap() {
  globalEmojiFallbackMap.clear();
  globalChampionEmojiFallbackMap.clear();

  const sourceGuildIds = Array.from(new Set([EMOJI_SOURCE_GUILD_ID, ...CHAMPION_ICON_SOURCE_GUILD_IDS]));
  const championSourceGuildIds = Array.from(new Set(CHAMPION_ICON_SOURCE_GUILD_IDS));

  for (const guildId of sourceGuildIds) {
    try {
      const sourceGuild = await client.guilds.fetch(guildId);
      await sourceGuild.emojis.fetch();

      for (const emoji of sourceGuild.emojis.cache.values()) {
        const mention = formatEmojiMention(emoji);
        if (!emoji.name || !mention) continue;
        const key = emoji.name.toLowerCase();
        if (!globalEmojiFallbackMap.has(key)) {
          globalEmojiFallbackMap.set(key, mention);
        }

        if (championSourceGuildIds.includes(guildId) && !globalChampionEmojiFallbackMap.has(key)) {
          globalChampionEmojiFallbackMap.set(key, mention);
        }
      }
    } catch (error: any) {
      console.warn(
        `⚠️ Could not load shared emojis from source guild ${guildId}: ${error?.message || error}`
      );
    }
  }

  console.log(
    `😀 Loaded ${globalEmojiFallbackMap.size} shared emojis and ` +
    `${globalChampionEmojiFallbackMap.size} champion fallback emojis from ${sourceGuildIds.length} source guild(s)`
  );
}

function findCustomEmoji(guild: Guild | null | undefined, emojiName: string): string | null {
  const key = emojiName.toLowerCase();

  if (guild) {
    const found = guild.emojis.cache.find((emoji) => (emoji.name || '').toLowerCase() === key);
    const localMention = found ? formatEmojiMention(found) : null;
    if (localMention) return localMention;
  }

  return globalEmojiFallbackMap.get(key) || null;
}

function findChampionEmoji(guild: Guild | null | undefined, emojiName: string): string | null {
  const key = emojiName.toLowerCase();

  if (guild) {
    const found = guild.emojis.cache.find((emoji) => (emoji.name || '').toLowerCase() === key);
    const localMention = found ? formatEmojiMention(found) : null;
    if (localMention) return localMention;
  }

  return globalChampionEmojiFallbackMap.get(key) || null;
}

function resolveEmoji(guild: Guild | null | undefined, preferredName: string | undefined, fallback: string): string {
  if (!preferredName) return fallback;
  return findCustomEmoji(guild, preferredName) || fallback;
}

function truncateForDiscord(text: string | null | undefined, maxLen = 260): string {
  const normalized = (text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 3)}...`;
}

function safeDiscordDisplayText(text: string | null | undefined, maxLen = 260): string {
  const normalized = truncateForDiscord(text, maxLen)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/@/g, '@\u200B');

  return normalized.replace(/([\\`*_{}\[\]()#+.!|>~])/g, '\\$1');
}

function normalizeRankTier(rank: string | null | undefined): string | null {
  if (!rank) return null;
  const tier = rank.trim().toUpperCase().split(/\s+/)[0];
  return tier || null;
}

function formatRoleLabelForDiscord(role: string | null | undefined, guild: Guild | null | undefined): string {
  const raw = (role || '').trim().toUpperCase();
  const aliasMap: Record<string, string> = {
    JGL: 'JUNGLE',
    JG: 'JUNGLE',
    SUP: 'SUPPORT',
    BOT: 'ADC',
    BOTTOM: 'ADC',
    MIDDLE: 'MID',
  };
  const normalized = aliasMap[raw] || raw;
  if (!normalized) {
    return `${resolveEmoji(guild, undefined, '🎮')} Unknown`;
  }
  const customEmojiName = ROLE_CUSTOM_EMOJI_NAMES[normalized];
  const fallbackEmoji = ROLE_EMOJIS[normalized] || '🎮';
  return `${resolveEmoji(guild, customEmojiName, fallbackEmoji)} ${normalized}`;
}

function formatRankLabelForDiscord(
  rank: string | null | undefined,
  division: string | null | undefined,
  guild: Guild | null | undefined,
): string | null {
  if (!rank) return null;

  const tier = normalizeRankTier(rank);
  const customEmojiName = tier ? RANK_CUSTOM_EMOJI_NAMES[tier] : undefined;
  const fallbackEmoji = tier ? (RANK_EMOJIS[tier] || '🏅') : '🏅';

  const hasDivision = Boolean(division && String(division).trim().length > 0);
  const normalizedDivision = hasDivision ? String(division).trim().toUpperCase() : '';
  const rankText = hasDivision && !rank.toUpperCase().includes(normalizedDivision)
    ? `${rank} ${normalizedDivision}`
    : rank;

  return `${resolveEmoji(guild, customEmojiName, fallbackEmoji)} ${rankText}`;
}

function formatVcLabelForDiscord(vcPreference: string | null | undefined, guild: Guild | null | undefined): string | null {
  const normalized = (vcPreference || '').toUpperCase();
  if (!normalized) return null;

  if (normalized === 'ALWAYS') {
    return `${resolveEmoji(guild, 'VC', '🎤')} VC`;
  }
  if (normalized === 'NEVER') {
    return `${resolveEmoji(guild, 'NoVC', '🔇')} No VC`;
  }
  if (normalized === 'SOMETIMES') {
    return `${resolveEmoji(guild, 'sometimesVC', '🎙️')} Sometimes VC`;
  }

  return `${resolveEmoji(guild, undefined, '🎙️')} ${vcPreference}`;
}

function formatLanguagesForDiscord(languages: string[] | null | undefined, guild: Guild | null | undefined): string | null {
  if (!Array.isArray(languages) || languages.length === 0) return null;
  const cleaned = languages
    .map((lang) => String(lang || '').trim())
    .filter((lang) => lang.length > 0);
  if (cleaned.length === 0) return null;
  return `${resolveEmoji(guild, 'language', '🗣️')} ${cleaned.join(', ')}`;
}

function normalizeChampionEmojiName(champion: string): string {
  const normalized = champion.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const trimmed = normalized.replace(/^_+|_+$/g, '');
  const safe = trimmed.length >= 2 ? trimmed : `c_${trimmed || 'x'}`;
  return safe.slice(0, 32);
}

function formatChampionLabelForDiscord(champion: string | null | undefined, guild: Guild | null | undefined): string {
  const cleaned = String(champion || '').trim();
  if (!cleaned) {
    return `${resolveEmoji(guild, undefined, '🧩')} Unknown`;
  }

  const normalized = normalizeChampionEmojiName(cleaned);
  const compact = normalized.replace(/_/g, '');
  const rawLower = cleaned.toLowerCase();
  const alphaNumeric = rawLower.replace(/[^a-z0-9]/g, '');
  const candidates = Array.from(new Set([normalized, compact, rawLower, alphaNumeric]));

  let emojiMention: string | null = null;
  for (const candidate of candidates) {
    emojiMention = findChampionEmoji(guild, candidate);
    if (emojiMention) break;
  }

  return `${emojiMention || '🧩'} ${cleaned}`;
}

function formatChampionListForDiscord(
  champions: string[] | null | undefined,
  guild: Guild | null | undefined,
  limit = 8,
): string | null {
  if (!Array.isArray(champions) || champions.length === 0) return null;

  const uniqueChampions: string[] = [];
  const seen = new Set<string>();

  for (const champion of champions) {
    const cleaned = String(champion || '').trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueChampions.push(cleaned);
  }

  if (uniqueChampions.length === 0) return null;

  const visibleChampions = uniqueChampions.slice(0, Math.max(1, limit));
  const overflow = uniqueChampions.length - visibleChampions.length;
  const championText = visibleChampions.map((champion) => formatChampionLabelForDiscord(champion, guild)).join(' • ');
  return overflow > 0 ? `${championText} • +${overflow} more` : championText;
}

function buildChampionTierlistFields(
  championTierlist: { S?: string[]; A?: string[]; B?: string[]; C?: string[] } | null | undefined,
  guild: Guild | null | undefined,
) {
  if (!championTierlist || typeof championTierlist !== 'object') return [];

  return CHAMPION_POOL_TIER_ORDER
    .map((tier) => {
      const champions = Array.isArray(championTierlist[tier]) ? championTierlist[tier] || [] : [];
      const championText = formatChampionListForDiscord(champions, guild, 8);
      if (!championText) return null;

      return {
        name: `${tier} Tier`,
        value: championText.slice(0, 1024),
        inline: false,
      };
    })
    .filter((field): field is { name: string; value: string; inline: boolean } => Boolean(field));
}

function buildChampionPoolSummary(
  championPoolMode: string | null | undefined,
  championList: string[] | null | undefined,
  championTierlist: { S?: string[]; A?: string[]; B?: string[]; C?: string[] } | null | undefined,
  guild: Guild | null | undefined,
): string | null {
  const mode = String(championPoolMode || '').toUpperCase();
  if (mode === 'TIERLIST' || (!mode && championTierlist)) {
    const fields = buildChampionTierlistFields(championTierlist, guild);
    if (fields.length > 0) {
      return fields.map((field) => `${field.name}: ${field.value}`).join('\n');
    }
  }

  return formatChampionListForDiscord(championList, guild, 8);
}

type RoleForwardingConfig = {
  guildId: string;
  communityId: string;
  communityName: string;
  rankRoleMap: Record<string, string>;
  languageRoleMap: Record<string, string>;
  configuredRanks: number;
  configuredLanguages: number;
};

type RoleForwardingSyncMember = {
  userId: string;
  username: string;
  discordId: string | null;
  rank: string | null;
  languages: string[];
  desiredRoleIds: string[];
  status: 'ELIGIBLE' | 'MISSING_DISCORD_LINK' | 'MISSING_RIOT_LINK' | 'NO_MATCHING_MAPPING' | string;
};

type RoleForwardingSyncPayload = {
  enabled: boolean;
  guildId: string;
  communityId: string;
  communityName: string;
  rankRoleMap: Record<string, string>;
  languageRoleMap: Record<string, string>;
  managedRoleIds: string[];
  summary: {
    totalMembers: number;
    eligibleMembers: number;
    missingDiscordLink: number;
    missingRiotLink: number;
    noMatchingMapping: number;
  };
  members: RoleForwardingSyncMember[];
};

type PendingRoleMenuSession = {
  guildId: string;
  mode: 'RANK' | 'LANGUAGE';
  selectedKey: string | null;
  selectedRoleId: string | null;
  rolePage: number;
};

type SendDraftOption = {
  id: string;
  name: string;
  updatedAt: string;
};

type SendDraftTeamOption = {
  id: string;
  name: string;
  tag: string | null;
  drafts: SendDraftOption[];
};

type PendingSendDraftSession = {
  guildId: string;
  discordUserId: string;
  teams: SendDraftTeamOption[];
  selectedTeamId: string | null;
};

type PendingTeamEventSession = {
  guildId: string;
  discordUserId: string;
  teams: TeamEventTeamOption[];
  selectedTeamId: string | null;
  selectedType: (typeof TEAM_EVENT_TYPES)[number] | null;
};

type ChampionIconAsset = {
  id: string;
  emojiName: string;
  iconUrl: string;
};

type TeamEventTeamOption = {
  id: string;
  name: string;
  tag: string | null;
};

// ============================================================
// Slash Commands
// ============================================================

const commands = [
  new SlashCommandBuilder()
    .setName('linkserver')
    .setDescription('Generate a code to link this Discord server to RiftEssence')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up or manage forwarding for this channel (run /setup in target channel)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('rolemenu')
    .setDescription('Configure automatic Discord roles from RiftEssence rank/language profile data')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('send-draft')
    .setDescription('Send a saved team draft embed to this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('duo')
    .setDescription('Create a RiftEssence duo post')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('create-team-event')
    .setDescription('Create a team event for one of your linked teams')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('import-league-icons')
    .setDescription('Import champion, role, or rank icons as custom emojis in this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .addStringOption((option) =>
      option
        .setName('asset_type')
        .setDescription('Which icon set to import')
        .setRequired(true)
        .addChoices(
          { name: 'Champion icons', value: 'CHAMPION' },
          { name: 'Role icons', value: 'ROLE' },
          { name: 'Rank icons', value: 'RANK' },
        )
    )
    .addIntegerOption((option) =>
      option
        .setName('batch')
        .setDescription('Champion batch to import (only used for champion icons)')
        .setRequired(false)
        .addChoices(
          { name: 'Batch 1/4', value: 1 },
          { name: 'Batch 2/4', value: 2 },
          { name: 'Batch 3/4', value: 3 },
          { name: 'Batch 4/4', value: 4 },
        )
    )
    .addBooleanOption((option) =>
      option
        .setName('replace_existing')
        .setDescription('Delete existing matching champion emojis before import')
        .setRequired(false)
    )
    .toJSON(),
];

async function registerCommands(clientId: string, guildIds: string[]) {
  const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

  // Try global registration first
  try {
    console.log('🔄 Registering slash commands globally...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Slash commands registered globally');
  } catch (error: any) {
    const code = error?.code;
    const msg = error?.message || error?.toString?.() || 'Unknown error';
    console.error(`❌ Global command registration failed (code ${code}): ${msg}`);
    // If entry point conflict or other global issue, fall back to per-guild registration
    for (const gid of guildIds) {
      try {
        console.log(`🔄 Registering slash commands for guild ${gid}...`);
        await rest.put(Routes.applicationGuildCommands(clientId, gid), { body: commands });
        console.log(`✅ Registered commands for guild ${gid}`);
      } catch (guildErr: any) {
        console.error(`❌ Failed to register commands for guild ${gid}:`, guildErr?.message || guildErr);
      }
    }
  }

  // Log what commands are visible (global)
  try {
    const existing = await rest.get(Routes.applicationCommands(clientId)) as any[];
    console.log(`ℹ️ Global commands now: ${existing.map(c => c.name).join(', ') || 'none'}`);
  } catch (err: any) {
    console.error('⚠️ Could not fetch global commands:', err?.message || err);
  }
}

// ============================================================
// API Helpers
// ============================================================

async function apiRequest(endpoint: string, method = 'GET', body?: any) {
  try {
    const options: any = {
      method,
      headers: {
        'Authorization': `Bearer ${DISCORD_BOT_API_KEY}`,
      },
    };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const url = `${API_BASE_URL}${endpoint}`;
    const res = await fetch(url, options);
    let data: any;
    try {
      data = await res.json();
    } catch {
      data = { error: 'Failed to parse response' };
    }
    if (!res.ok) {
      console.error(`❌ API ${method} ${endpoint} returned ${res.status}:`, data);
    }
    return { ok: res.ok, status: res.status, data };
  } catch (error: any) {
    console.error(`❌ API request failed for ${endpoint}:`, error.message);
    return { ok: false, status: 500, data: { error: error.message } };
  }
}

const pendingRoleMenuSessions = new Map<string, PendingRoleMenuSession>();
const pendingSendDraftSessions = new Map<string, PendingSendDraftSession>();
const pendingTeamEventSessions = new Map<string, PendingTeamEventSession>();

function getRoleMenuSessionKey(userId: string, guildId: string) {
  return `${userId}-${guildId}`;
}

function getSendDraftSessionKey(userId: string, guildId: string) {
  return `${userId}-${guildId}`;
}

function getTeamEventSessionKey(userId: string, guildId: string) {
  return `${userId}-${guildId}`;
}

function hasSendDraftPermission(member: any): boolean {
  return Boolean(
    member?.permissions?.has?.(PermissionFlagsBits.Administrator)
    || member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)
  );
}

async function fetchSendDraftOptions(guildId: string, discordId: string) {
  const endpoint = `/api/teams/discord-drafts/options?guildId=${encodeURIComponent(guildId)}&discordId=${encodeURIComponent(discordId)}`;
  const result = await apiRequest(endpoint);
  if (!result.ok) {
    return {
      ok: false,
      error: result.data?.error || 'Failed to fetch draft options',
      status: 'ERROR',
      teams: [] as SendDraftTeamOption[],
    };
  }

  return {
    ok: true,
    error: null,
    status: String(result.data?.status || 'ERROR'),
    teams: Array.isArray(result.data?.teams) ? (result.data.teams as SendDraftTeamOption[]) : [],
  };
}

async function fetchSendDraftById(draftId: string, discordId: string) {
  const endpoint = `/api/teams/discord-drafts/${encodeURIComponent(draftId)}?discordId=${encodeURIComponent(discordId)}`;
  const result = await apiRequest(endpoint);
  if (!result.ok || !result.data?.draft) {
    return { ok: false, error: result.data?.error || 'Failed to fetch selected draft', draft: null };
  }

  return { ok: true, error: null, draft: result.data.draft };
}

async function fetchTeamEventOptions(guildId: string, discordId: string) {
  const endpoint = `/api/teams/discord-events/options?guildId=${encodeURIComponent(guildId)}&discordId=${encodeURIComponent(discordId)}`;
  const result = await apiRequest(endpoint);
  if (!result.ok) {
    return {
      ok: false,
      error: result.data?.error || 'Failed to fetch event options',
      status: 'ERROR',
      teams: [] as TeamEventTeamOption[],
    };
  }

  return {
    ok: true,
    error: null,
    status: String(result.data?.status || 'ERROR'),
    teams: Array.isArray(result.data?.teams) ? (result.data.teams as TeamEventTeamOption[]) : [],
  };
}

async function ensureDuoCommunity(interaction: ChatInputCommandInteraction | ButtonInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: '❌ This action must be used in a server.', ephemeral: true });
    return false;
  }

  const communityRes = await apiRequest(`/api/communities?discordServerId=${guildId}`);
  const communities = communityRes.ok ? communityRes.data?.communities : null;
  if (!communityRes.ok || !Array.isArray(communities) || communities.length === 0) {
    await interaction.reply({
      content: '❌ No community is linked to this server. Use `/linkserver` and complete community registration first.',
      ephemeral: true,
    });
    return false;
  }

  return true;
}

async function createTeamEventFromDiscord(payload: {
  discordId: string;
  teamId: string;
  title: string;
  type: string;
  description?: string;
  scheduledAt: string;
  duration?: number;
  enemyMultigg?: string;
}) {
  const result = await apiRequest('/api/teams/discord-events', 'POST', payload);
  if (!result.ok || !result.data?.success) {
    return {
      ok: false,
      error: result.data?.error || 'Failed to create event',
      event: null,
    };
  }

  return {
    ok: true,
    error: null,
    event: result.data.event,
  };
}

function buildTeamEventTeamChooserEmbed(guildName: string, teams: TeamEventTeamOption[]) {
  const lines = teams.map((team) => `• **${team.name}${team.tag ? ` [${team.tag}]` : ''}**`);
  return new EmbedBuilder()
    .setColor(0x3B82F6)
    .setTitle('📅 Create Team Event')
    .setDescription(
      `Server: **${guildName}**\n` +
      'Choose one of your linked teams to continue.'
    )
    .addFields({
      name: 'Eligible Teams',
      value: lines.join('\n').slice(0, 1024) || 'No eligible teams found.',
    })
    .setFooter({ text: 'Requires a linked Discord account and owner or manager access.' })
    .setTimestamp();
}

function buildTeamEventTypeChooserEmbed(team: TeamEventTeamOption) {
  return new EmbedBuilder()
    .setColor(0x2563EB)
    .setTitle('🗓️ Choose Event Type')
    .setDescription(`Team: **${team.name}${team.tag ? ` [${team.tag}]` : ''}**\nPick the event type to create.`)
    .setTimestamp();
}

function buildTeamEventModal(team: TeamEventTeamOption, type: string) {
  const modal = new ModalBuilder()
    .setCustomId(TEAM_EVENT_MODAL)
    .setTitle(`Create ${type.replace('_', ' ')} for ${team.name}`.slice(0, 45));

  const titleInput = new TextInputBuilder()
    .setCustomId(TEAM_EVENT_TITLE_INPUT)
    .setLabel('Event title')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true)
    .setPlaceholder('Scrim vs Academy, VOD review, etc.');

  const dateTimeInput = new TextInputBuilder()
    .setCustomId(TEAM_EVENT_DATETIME_INPUT)
    .setLabel('Date & time')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('YYYY-MM-DD HH:MM');

  const durationInput = new TextInputBuilder()
    .setCustomId(TEAM_EVENT_DURATION_INPUT)
    .setLabel('Duration (minutes)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('90');

  const opponentInput = new TextInputBuilder()
    .setCustomId(TEAM_EVENT_OPPONENT_INPUT)
    .setLabel('Opponent link (op.gg / multi.gg)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('https://...');

  const descriptionInput = new TextInputBuilder()
    .setCustomId(TEAM_EVENT_DESCRIPTION_INPUT)
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Optional notes for the team');

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(dateTimeInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(opponentInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
  );

  return modal;
}

async function handleCreateTeamEvent(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId || !interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
  }

  const options = await fetchTeamEventOptions(interaction.guildId, interaction.user.id);
  if (!options.ok) {
    return interaction.reply({ content: `❌ ${options.error || 'Failed to load event options.'}`, ephemeral: true });
  }

  if (options.status !== 'READY' || options.teams.length === 0) {
    const reason = options.status === 'MISSING_DISCORD_LINK'
      ? 'Link your Discord account in RiftEssence first.'
      : 'No linked team ownership or manager access was found.';
    return interaction.reply({ content: `❌ ${reason}`, ephemeral: true });
  }

  const sessionKey = getTeamEventSessionKey(interaction.user.id, interaction.guildId);
  pendingTeamEventSessions.set(sessionKey, {
    guildId: interaction.guildId,
    discordUserId: interaction.user.id,
    teams: options.teams,
    selectedTeamId: null,
    selectedType: null,
  });

  const teamOptions = options.teams.slice(0, 25).map((team) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(team.name.slice(0, 100))
      .setValue(team.id)
      .setDescription(team.tag ? `[${team.tag}]` : 'Linked team')
  );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(TEAM_EVENT_TEAM_SELECT)
      .setPlaceholder('Choose a team')
      .addOptions(teamOptions)
  );

  return interaction.reply({
    embeds: [buildTeamEventTeamChooserEmbed(interaction.guild.name, options.teams)],
    components: [row],
    ephemeral: true,
  });
}

async function handleTeamEventSelectMenu(interaction: StringSelectMenuInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: '❌ This action must be used in a server.', ephemeral: true });
  }

  const sessionKey = getTeamEventSessionKey(interaction.user.id, interaction.guildId);
  const session = pendingTeamEventSessions.get(sessionKey);
  if (!session) {
    return interaction.update({ content: '❌ Event menu expired. Run `/create-team-event` again.', embeds: [], components: [] });
  }

  if (interaction.customId === TEAM_EVENT_TEAM_SELECT) {
    const teamId = interaction.values[0];
    const selectedTeam = session.teams.find((team) => team.id === teamId);
    if (!selectedTeam) {
      return interaction.update({ content: '❌ Selected team is no longer available.', embeds: [], components: [] });
    }

    session.selectedTeamId = selectedTeam.id;
    pendingTeamEventSessions.set(sessionKey, session);

    const typeOptions = TEAM_EVENT_TYPES.map((eventType) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(eventType.replace('_', ' '))
        .setValue(eventType)
    );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(TEAM_EVENT_TYPE_SELECT)
        .setPlaceholder('Choose an event type')
        .addOptions(typeOptions)
    );

    return interaction.update({
      embeds: [buildTeamEventTypeChooserEmbed(selectedTeam)],
      components: [row],
    });
  }

  if (interaction.customId === TEAM_EVENT_TYPE_SELECT) {
    const type = interaction.values[0] as (typeof TEAM_EVENT_TYPES)[number] | undefined;
    if (!type || !TEAM_EVENT_TYPES.includes(type)) {
      return interaction.update({ content: '❌ Invalid event type selection.', embeds: [], components: [] });
    }

    const selectedTeam = session.teams.find((team) => team.id === session.selectedTeamId);
    if (!selectedTeam) {
      return interaction.update({ content: '❌ Selected team is no longer available.', embeds: [], components: [] });
    }

    session.selectedType = type;
    pendingTeamEventSessions.set(sessionKey, session);

    return interaction.showModal(buildTeamEventModal(selectedTeam, type));
  }
}

async function handleTeamEventModalSubmit(interaction: ModalSubmitInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: '❌ This action must be used in a server.', ephemeral: true });
  }

  const sessionKey = getTeamEventSessionKey(interaction.user.id, interaction.guildId);
  const session = pendingTeamEventSessions.get(sessionKey);
  if (!session || !session.selectedTeamId || !session.selectedType) {
    return interaction.reply({ content: '❌ Event session expired. Run `/create-team-event` again.', ephemeral: true });
  }

  const title = interaction.fields.getTextInputValue(TEAM_EVENT_TITLE_INPUT).trim();
  const dateTimeValue = interaction.fields.getTextInputValue(TEAM_EVENT_DATETIME_INPUT).trim();
  const durationValue = interaction.fields.getTextInputValue(TEAM_EVENT_DURATION_INPUT).trim();
  const opponentValue = interaction.fields.getTextInputValue(TEAM_EVENT_OPPONENT_INPUT).trim();
  const description = interaction.fields.getTextInputValue(TEAM_EVENT_DESCRIPTION_INPUT).trim();

  if (!title || !dateTimeValue) {
    return interaction.reply({ content: '❌ Title and date/time are required.', ephemeral: true });
  }

  const dateTimeNormalized = dateTimeValue.includes('T')
    ? dateTimeValue
    : dateTimeValue.replace(' ', 'T');
  const dateTimeWithSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTimeNormalized)
    ? `${dateTimeNormalized}:00`
    : dateTimeNormalized;
  const scheduledAt = new Date(dateTimeWithSeconds);
  if (Number.isNaN(scheduledAt.getTime())) {
    return interaction.reply({ content: '❌ Invalid date/time. Use YYYY-MM-DD HH:MM.', ephemeral: true });
  }

  let duration: number | undefined;
  if (durationValue) {
    const parsedDuration = Number.parseInt(durationValue, 10);
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      return interaction.reply({ content: '❌ Duration must be a positive whole number of minutes.', ephemeral: true });
    }
    duration = parsedDuration;
  }

  const needsOpponentLink = session.selectedType === 'SCRIM' || session.selectedType === 'TOURNAMENT';
  if (needsOpponentLink && !opponentValue) {
    return interaction.reply({ content: '❌ Opponent link is required for scrims and tournaments.', ephemeral: true });
  }

  const createResult = await createTeamEventFromDiscord({
    discordId: interaction.user.id,
    teamId: session.selectedTeamId,
    title,
    type: session.selectedType,
    description: description || undefined,
    scheduledAt: scheduledAt.toISOString(),
    duration,
    enemyMultigg: opponentValue || undefined,
  });

  if (!createResult.ok) {
    return interaction.reply({ content: `❌ ${createResult.error || 'Failed to create the event.'}`, ephemeral: true });
  }

  pendingTeamEventSessions.delete(sessionKey);

  return interaction.reply({
    content: `✅ Created **${title}** for your team.`,
    ephemeral: true,
  });
}

function buildSendDraftTeamChooserEmbed(guildName: string, teams: SendDraftTeamOption[]) {
  const lines = teams.map((team) => `• **${team.name}${team.tag ? ` [${team.tag}]` : ''}** (${team.drafts.length} drafts)`);
  return new EmbedBuilder()
    .setColor(0x3B82F6)
    .setTitle('📋 Send Saved Draft')
    .setDescription(
      `Server: **${guildName}**\n` +
      `Choose a team first, then pick one of its saved drafts.`
    )
    .addFields({
      name: 'Eligible Teams',
      value: lines.join('\n').slice(0, 1024) || 'No eligible teams found.',
    })
    .setFooter({ text: 'Requires linked Discord account, team membership, and at least one saved draft.' })
    .setTimestamp();
}

function buildSendDraftPickChooserEmbed(team: SendDraftTeamOption) {
  return new EmbedBuilder()
    .setColor(0x2563EB)
    .setTitle('🧠 Choose Draft')
    .setDescription(`Team: **${team.name}${team.tag ? ` [${team.tag}]` : ''}**\nPick a saved draft to send to this channel.`)
    .setTimestamp();
}

function buildDraftRoundLine(label: string, champion: string | null | undefined, role: string | null | undefined, guild: Guild | null | undefined) {
  const champ = formatChampionLabelForDiscord(champion, guild);
  const rolePart = role ? ` (${formatRoleLabelForDiscord(role, guild)})` : '';
  return `${label}: ${champ}${rolePart}`;
}

function buildSendDraftEmbed(draft: any, requestedBy: string, guild: Guild | null | undefined) {
  const picks = Array.isArray(draft?.picks) ? draft.picks : [];
  const blueIndexes = [0, 3, 4, 7, 8];
  const redIndexes = [1, 2, 5, 6, 9];

  const blueRounds = blueIndexes.map((pickIndex, i) => {
    const slot = picks[pickIndex] || {};
    return buildDraftRoundLine(`B${i + 1}`, slot?.champion, slot?.assignedRole || null, guild);
  });
  const redRounds = redIndexes.map((pickIndex, i) => {
    const slot = picks[pickIndex] || {};
    return buildDraftRoundLine(`R${i + 1}`, slot?.champion, slot?.assignedRole || null, guild);
  });

  const blueBans = Array.isArray(draft?.blueBans) ? draft.blueBans : [];
  const redBans = Array.isArray(draft?.redBans) ? draft.redBans : [];

  const buildBanLine = (label: string, champion: string | null | undefined) => {
    const championLabel = formatChampionLabelForDiscord(champion, guild);
    return `${label}: ${championLabel}`;
  };

  return new EmbedBuilder()
    .setColor(0x1D4ED8)
    .setTitle(`Draft • ${draft?.name || 'Unnamed Draft'}`)
    .setDescription(`Team: **${draft?.team?.name || 'Unknown Team'}${draft?.team?.tag ? ` [${draft.team.tag}]` : ''}**`)
    .addFields(
      {
        name: '🔵 Blue Bans',
        value: (blueBans.map((entry: string, i: number) => buildBanLine(`B${i + 1}`, entry)).join('\n') || 'None').slice(0, 1024),
        inline: true,
      },
      {
        name: '🔴 Red Bans',
        value: (redBans.map((entry: string, i: number) => buildBanLine(`R${i + 1}`, entry)).join('\n') || 'None').slice(0, 1024),
        inline: true,
      },
      {
        name: '🔵 Blue Picks (Rounds)',
        value: blueRounds.join('\n').slice(0, 1024),
        inline: true,
      },
      {
        name: '🔴 Red Picks (Rounds)',
        value: redRounds.join('\n').slice(0, 1024),
        inline: true,
      },
    )
    .setFooter({ text: `Sent by ${requestedBy} • Last updated ${new Date(draft?.updatedAt || Date.now()).toLocaleString()}` })
    .setTimestamp();
}

function splitIntoBatches<T>(values: T[], totalBatches: number): T[][] {
  const result: T[][] = [];
  const batchSize = Math.ceil(values.length / totalBatches);
  for (let i = 0; i < totalBatches; i += 1) {
    const start = i * batchSize;
    result.push(values.slice(start, start + batchSize));
  }
  return result;
}

function getGuildStaticEmojiLimit(guild: Guild): number {
  switch (guild.premiumTier) {
    case 1:
      return 100;
    case 2:
      return 150;
    case 3:
      return 250;
    default:
      return 50;
  }
}

async function fetchChampionIconsForBatch(batchNumber: number): Promise<{ version: string; assets: ChampionIconAsset[] }> {
  if (batchNumber < 1 || batchNumber > CHAMPION_EMOJI_BATCH_COUNT) {
    throw new Error(`Batch must be between 1 and ${CHAMPION_EMOJI_BATCH_COUNT}`);
  }

  const sourceGuildId = CHAMPION_ICON_SOURCE_GUILD_IDS[batchNumber - 1];
  if (!sourceGuildId) {
    throw new Error(`No source guild configured for champion batch ${batchNumber}`);
  }

  const sourceGuild = await client.guilds.fetch(sourceGuildId);
  await sourceGuild.emojis.fetch();

  const selected = Array.from(sourceGuild.emojis.cache.values())
    .filter((emoji) => !emoji.animated && Boolean(emoji.name))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return {
    version: sourceGuildId,
    assets: selected.map((championId) => ({
      id: championId.name || 'champion',
      emojiName: normalizeChampionEmojiName(championId.name || 'champion'),
      iconUrl: championId.url,
    })),
  };
}

type EmojiImportKind = 'CHAMPION' | 'ROLE' | 'RANK';

type EmojiImportAsset = {
  id: string;
  emojiName: string;
  iconUrl: string;
};

function getSourceGuildEmojiNames(kind: 'ROLE' | 'RANK'): string[] {
  return kind === 'ROLE'
    ? Object.values(ROLE_CUSTOM_EMOJI_NAMES)
    : Object.values(RANK_CUSTOM_EMOJI_NAMES);
}

async function fetchSourceGuildEmojiAssets(kind: 'ROLE' | 'RANK'): Promise<EmojiImportAsset[]> {
  const sourceGuild = await client.guilds.fetch(EMOJI_SOURCE_GUILD_ID);
  await sourceGuild.emojis.fetch();

  return getSourceGuildEmojiNames(kind).map((emojiName) => {
    const emoji = sourceGuild.emojis.cache.find((entry) => (entry.name || '').toLowerCase() === emojiName.toLowerCase());
    if (!emoji) {
      throw new Error(`Could not find ${kind.toLowerCase()} emoji ${emojiName} in source guild`);
    }

    return {
      id: emoji.name || emojiName,
      emojiName: emoji.name || emojiName,
      iconUrl: emoji.url,
    };
  });
}

async function handleImportChampionEmojis(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    return interaction.editReply('❌ This command must be used in a server.');
  }

  const member = interaction.member as any;
  if (!member?.permissions?.has?.(PermissionFlagsBits.Administrator) && !member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)) {
    return interaction.editReply('❌ You need **Manage Server** or **Administrator** permission to import champion emojis.');
  }

  const me = guild.members.me;
  if (!me?.permissions?.has(PermissionFlagsBits.ManageGuildExpressions)) {
    return interaction.editReply('❌ Bot is missing **Manage Expressions** permission in this server.');
  }

  const assetType = String(interaction.options.getString('asset_type', true) || 'CHAMPION').toUpperCase() as EmojiImportKind;
  const batch = interaction.options.getInteger('batch') || 1;
  const replaceExisting = interaction.options.getBoolean('replace_existing') === true;

  if (assetType === 'CHAMPION' && (batch < 1 || batch > CHAMPION_EMOJI_BATCH_COUNT)) {
    return interaction.editReply(`❌ Batch must be between 1 and ${CHAMPION_EMOJI_BATCH_COUNT}.`);
  }

  try {
    await guild.emojis.fetch();

    const assetsResult = assetType === 'ROLE'
      ? { description: 'role icons', assets: await fetchSourceGuildEmojiAssets('ROLE'), version: null as string | null }
      : assetType === 'RANK'
        ? { description: 'rank icons', assets: await fetchSourceGuildEmojiAssets('RANK'), version: null as string | null }
        : { description: `champion icons batch ${batch}/${CHAMPION_EMOJI_BATCH_COUNT}`, ...(await fetchChampionIconsForBatch(batch)) };

    const { version, assets, description } = assetsResult;
    if (assets.length === 0) {
      return interaction.editReply(`❌ No emoji assets found for ${description}.`);
    }

    const guildStaticEmojiLimit = getGuildStaticEmojiLimit(guild);

    const existingStatic = guild.emojis.cache.filter((emoji) => !emoji.animated);
    const existingByName = new Map(existingStatic.map((emoji) => [emoji.name?.toLowerCase() || '', emoji]));

    const preexisting = assets.filter((asset) => existingByName.has(asset.emojiName.toLowerCase()));

    let deletedCount = 0;
    if (replaceExisting && preexisting.length > 0) {
      for (const asset of preexisting) {
        const existing = existingByName.get(asset.emojiName.toLowerCase());
        if (!existing) continue;
        try {
          await existing.delete(`Re-importing champion emoji ${asset.id}`);
          deletedCount += 1;
        } catch (error: any) {
          console.warn(`⚠️ Could not delete existing emoji ${asset.emojiName}: ${error?.message || error}`);
        }
      }
      await guild.emojis.fetch();
    }

    const existingAfterDelete = guild.emojis.cache.filter((emoji) => !emoji.animated).size;
    const alreadyPresent = assets.filter((asset) => guild.emojis.cache.some((emoji) => !emoji.animated && (emoji.name || '').toLowerCase() === asset.emojiName.toLowerCase()));
    const candidates = assets.filter((asset) => !alreadyPresent.some((present) => present.emojiName === asset.emojiName));
    const availableSlots = Math.max(0, guildStaticEmojiLimit - existingAfterDelete);
    const uploadQueue = candidates.slice(0, availableSlots);

    let created = 0;
    let failed = 0;
    for (const asset of uploadQueue) {
      try {
        const iconResponse = await fetch(asset.iconUrl);
        if (!iconResponse.ok) {
          console.warn(`⚠️ Emoji asset fetch failed for ${asset.id}: ${iconResponse.status}`);
          failed += 1;
          continue;
        }

        const iconBuffer = Buffer.from(await iconResponse.arrayBuffer());
        await guild.emojis.create({ attachment: iconBuffer, name: asset.emojiName });
        created += 1;
      } catch (error: any) {
        console.error(`❌ Failed to create emoji for champion ${asset.id}:`, error?.message || error);
        failed += 1;
      }
    }

    const skippedForCapacity = Math.max(0, candidates.length - uploadQueue.length);
    const skippedExisting = alreadyPresent.length;

    console.log(
      `[EmojiImport] guild=${guild.id} type=${assetType} ${description} ` +
      `version=${version || 'source'} total=${assets.length} created=${created} failed=${failed} ` +
      `skippedExisting=${skippedExisting} skippedCapacity=${skippedForCapacity} replaced=${deletedCount} limit=${guildStaticEmojiLimit}`
    );

    const embed = new EmbedBuilder()
      .setColor(created > 0 ? 0x22C55E : 0xEAB308)
      .setTitle('Emoji Import Summary')
      .setDescription(
        assetType === 'CHAMPION'
          ? `Batch **${batch}/${CHAMPION_EMOJI_BATCH_COUNT}** from source guild **${version}**`
          : `Imported **${description}** from the RiftEssence source guild`
      )
      .addFields(
        { name: 'Created', value: String(created), inline: true },
        { name: 'Failed', value: String(failed), inline: true },
        { name: 'Skipped (Existing)', value: String(skippedExisting), inline: true },
        { name: 'Skipped (Capacity)', value: String(skippedForCapacity), inline: true },
        { name: 'Replaced', value: String(deletedCount), inline: true },
        { name: 'Server Static Emoji Count', value: `${guild.emojis.cache.filter((emoji) => !emoji.animated).size}/${guildStaticEmojiLimit}`, inline: true },
      )
      .setFooter({ text: assetType === 'CHAMPION' ? 'Run batches 1, 2, 3, and 4 to clone all champion icon source guilds.' : 'Use the import type that matches the asset pack you want to clone.' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('❌ Emoji import failed:', error?.message || error);
    return interaction.editReply(`❌ Import failed: ${error?.message || 'Unknown error'}`);
  }
}

function modeLabel(mode: 'RANK' | 'LANGUAGE') {
  return mode === 'RANK' ? 'Rank roles' : 'Language roles';
}

function getRoleMenuModeFromCustomId(customId: string): 'RANK' | 'LANGUAGE' | null {
  if (!customId.startsWith(ROLE_MENU_MODE_PREFIX)) return null;
  const raw = customId.slice(ROLE_MENU_MODE_PREFIX.length).toUpperCase();
  if (raw === 'RANK' || raw === 'LANGUAGE') return raw;
  return null;
}

function getKeyOptions(mode: 'RANK' | 'LANGUAGE') {
  if (mode === 'RANK') {
    return ROLE_FORWARDING_RANK_KEYS.map((rank) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(rank)
        .setValue(rank)
        .setEmoji(RANK_EMOJIS[rank] || '🏅')
    );
  }

  return ROLE_FORWARDING_LANGUAGE_KEYS.map((language) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(language)
      .setValue(language)
  );
}

function truncateRoleLabel(value: string, maxLen = 90) {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 3)}...`;
}

function getPagedGuildRoleOptions(guild: Guild, session: PendingRoleMenuSession) {
  const allRoles = Array.from(guild.roles.cache.values())
    .filter((role) => role.id !== guild.id)
    .sort((a, b) => {
      if (b.position !== a.position) return b.position - a.position;
      return a.name.localeCompare(b.name);
    });

  const totalRoles = allRoles.length;
  const totalPages = Math.max(1, Math.ceil(totalRoles / ROLE_MENU_ROLES_PER_PAGE));
  const safePage = Math.min(Math.max(0, session.rolePage || 0), totalPages - 1);
  const start = safePage * ROLE_MENU_ROLES_PER_PAGE;
  const currentPageRoles = allRoles.slice(start, start + ROLE_MENU_ROLES_PER_PAGE);

  const options = currentPageRoles.map((role) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(truncateRoleLabel(role.name))
      .setValue(role.id)
      .setDescription(`Position ${role.position}`)
      .setDefault(role.id === session.selectedRoleId)
  );

  return {
    options,
    page: safePage,
    totalPages,
    totalRoles,
  };
}

function formatRoleMapSummary(map: Record<string, string>, orderedKeys: string[], iconByKey?: Record<string, string>) {
  const lines = orderedKeys
    .filter((key) => Boolean(map[key]))
    .map((key) => `${iconByKey?.[key] || '•'} ${key}: <@&${map[key]}>`);

  if (lines.length === 0) {
    return 'Not configured yet.';
  }

  return lines.join('\n');
}

function buildRoleMenuOverviewEmbed(config: RoleForwardingConfig, guildName?: string) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎛️ Role Forwarding Setup')
    .setDescription(
      `Server: **${guildName || config.guildId}**\n` +
      `Linked community: **${config.communityName}**\n\n` +
      'Configure automatic role assignments based on RiftEssence profile data.\n\n' +
      '**How assignment works**\n' +
      '1) User must link Discord + Riot account in RiftEssence\n' +
      '2) User should have rank/languages set on profile\n' +
      '3) Bot sync assigns mapped roles and removes outdated mapped roles'
    )
    .addFields(
      {
        name: `🏆 Rank Mappings (${config.configuredRanks})`,
        value: formatRoleMapSummary(config.rankRoleMap, ROLE_FORWARDING_RANK_KEYS, RANK_EMOJIS),
        inline: false,
      },
      {
        name: `🗣️ Language Mappings (${config.configuredLanguages})`,
        value: formatRoleMapSummary(config.languageRoleMap, ROLE_FORWARDING_LANGUAGE_KEYS),
        inline: false,
      }
    )
    .setFooter({ text: 'Tip: Ensure bot role is above mapped roles and has Manage Roles permission.' })
    .setTimestamp();
}

function buildRoleMenuOverviewRows() {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${ROLE_MENU_MODE_PREFIX}RANK`)
      .setLabel('🏆 Configure Rank Roles')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${ROLE_MENU_MODE_PREFIX}LANGUAGE`)
      .setLabel('🗣️ Configure Language Roles')
      .setStyle(ButtonStyle.Primary),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(ROLE_MENU_SYNC)
      .setLabel('🔄 Sync Now')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(ROLE_MENU_REFRESH)
      .setLabel('🔁 Refresh')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ROLE_MENU_CLOSE)
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger),
  );

  return [row1, row2];
}

function buildRoleMenuEditorEmbed(session: PendingRoleMenuSession, config: RoleForwardingConfig) {
  const currentMap = session.mode === 'RANK' ? config.rankRoleMap : config.languageRoleMap;
  const selectedKeyDisplay = session.selectedKey || 'Not selected';
  const selectedRoleDisplay = session.selectedRoleId ? `<@&${session.selectedRoleId}>` : 'Not selected';
  const existingRoleDisplay = session.selectedKey && currentMap[session.selectedKey]
    ? `<@&${currentMap[session.selectedKey]}>`
    : 'None';

  return new EmbedBuilder()
    .setColor(0x0a84ff)
    .setTitle(`⚙️ Configure ${modeLabel(session.mode)}`)
    .setDescription(
      'Pick a key and a Discord role, then click **Save Mapping**.\n' +
      'Use **Clear Mapping** to remove a mapped role from the selected key.'
    )
    .addFields(
      { name: 'Selected Key', value: selectedKeyDisplay, inline: true },
      { name: 'Selected Role', value: selectedRoleDisplay, inline: true },
      { name: 'Current Mapping', value: existingRoleDisplay, inline: true },
    )
    .setFooter({ text: `${config.communityName} • ${modeLabel(session.mode)}` });
}

function buildRoleMenuEditorRows(session: PendingRoleMenuSession, guild?: Guild | null) {
  const keyOptions = getKeyOptions(session.mode).map((option) =>
    option.setDefault(option.data.value === session.selectedKey)
  );

  const keyMenu = new StringSelectMenuBuilder()
    .setCustomId(ROLE_MENU_SELECT_KEY)
    .setPlaceholder(`Choose ${session.mode === 'RANK' ? 'a rank tier' : 'a language'}`)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(keyOptions);

  const roleMenu = new StringSelectMenuBuilder()
    .setCustomId(ROLE_MENU_SELECT_ROLE)
    .setPlaceholder('Choose a Discord role to map (page 1)')
    .setMinValues(1)
    .setMaxValues(1);

  const roleOptions = guild ? getPagedGuildRoleOptions(guild, session) : null;
  if (roleOptions && roleOptions.options.length > 0) {
    roleMenu
      .setPlaceholder(`Choose a Discord role (${roleOptions.page + 1}/${roleOptions.totalPages})`)
      .addOptions(roleOptions.options);
  } else {
    roleMenu
      .setDisabled(true)
      .setPlaceholder('No server roles found');
  }

  const rows: ActionRowBuilder<any>[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(keyMenu),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(roleMenu),
  ];

  if (roleOptions && roleOptions.totalPages > 1) {
    const paginationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ROLE_MENU_ROLE_PAGE_PREV)
        .setLabel('⬅️ Roles')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(roleOptions.page <= 0),
      new ButtonBuilder()
        .setCustomId('rolemenu_role_page_indicator')
        .setLabel(`Page ${roleOptions.page + 1}/${roleOptions.totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(ROLE_MENU_ROLE_PAGE_NEXT)
        .setLabel('Roles ➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(roleOptions.page >= roleOptions.totalPages - 1),
    );
    rows.push(paginationRow);
  }

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(ROLE_MENU_SAVE)
      .setLabel('💾 Save Mapping')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(ROLE_MENU_CLEAR)
      .setLabel('🧹 Clear Mapping')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!session.selectedKey),
    new ButtonBuilder()
      .setCustomId(ROLE_MENU_BACK)
      .setLabel('⬅️ Back')
      .setStyle(ButtonStyle.Secondary),
  );

  rows.push(actionRow);
  return rows;
}

async function fetchRoleForwardingConfig(guildId: string): Promise<{ ok: true; config: RoleForwardingConfig } | { ok: false; error: string }> {
  const result = await apiRequest(`/api/discord/role-forwarding?guildId=${guildId}`);
  if (!result.ok) {
    return { ok: false, error: result.data?.error || 'Failed to load role forwarding configuration.' };
  }

  return {
    ok: true,
    config: {
      guildId,
      communityId: result.data.communityId,
      communityName: result.data.communityName,
      rankRoleMap: result.data.rankRoleMap || {},
      languageRoleMap: result.data.languageRoleMap || {},
      configuredRanks: result.data.configuredRanks || 0,
      configuredLanguages: result.data.configuredLanguages || 0,
    },
  };
}

async function syncRoleForwardingForGuild(guildId: string, guildHint?: Guild, silentNoop = false) {
  const syncResult = await apiRequest('/api/discord/role-forwarding/sync', 'POST', { guildId });
  if (!syncResult.ok) {
    return {
      ok: false,
      message: syncResult.data?.error || 'Failed to prepare role forwarding sync payload.',
    };
  }

  const payload = syncResult.data as RoleForwardingSyncPayload;
  if (!payload.enabled || !Array.isArray(payload.managedRoleIds) || payload.managedRoleIds.length === 0) {
    return {
      ok: true,
      message: silentNoop ? '' : 'No role mappings configured yet. Configure at least one rank/language role first.',
      summary: payload.summary,
    };
  }

  const guild = guildHint || await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    return { ok: false, message: 'Bot cannot access this guild right now.' };
  }

  const botMember = await guild.members.fetchMe().catch(() => null);
  if (!botMember) {
    return { ok: false, message: 'Failed to resolve bot member in this guild.' };
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { ok: false, message: 'Missing Manage Roles permission. Grant it to the bot and retry.' };
  }

  const manageableRoleIds = new Set<string>();
  let blockedByHierarchy = 0;

  for (const roleId of payload.managedRoleIds) {
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;
    if (botMember.roles.highest.comparePositionTo(role) > 0) {
      manageableRoleIds.add(roleId);
    } else {
      blockedByHierarchy += 1;
    }
  }

  if (manageableRoleIds.size === 0) {
    return {
      ok: false,
      message: 'All configured roles are above the bot role. Move the bot role above mapped roles and retry.',
    };
  }

  let eligibleProcessed = 0;
  let updatedMembers = 0;
  let unchangedMembers = 0;
  let failedMembers = 0;
  let notFoundMembers = 0;

  for (const member of payload.members || []) {
    if (member.status !== 'ELIGIBLE' || !member.discordId) {
      continue;
    }

    eligibleProcessed += 1;

    const guildMember = await guild.members.fetch(member.discordId).catch(() => null);
    if (!guildMember) {
      notFoundMembers += 1;
      continue;
    }

    const desiredRoleIds = member.desiredRoleIds.filter((id) => manageableRoleIds.has(id));
    const currentManagedRoleIds = guildMember.roles.cache
      .filter((role) => manageableRoleIds.has(role.id))
      .map((role) => role.id);

    const toAdd = desiredRoleIds.filter((roleId) => !guildMember.roles.cache.has(roleId));
    const toRemove = currentManagedRoleIds.filter((roleId) => !desiredRoleIds.includes(roleId));

    if (toAdd.length === 0 && toRemove.length === 0) {
      unchangedMembers += 1;
      continue;
    }

    try {
      if (toAdd.length > 0) {
        await guildMember.roles.add(toAdd, 'RiftEssence role forwarding sync');
      }
      if (toRemove.length > 0) {
        await guildMember.roles.remove(toRemove, 'RiftEssence role forwarding sync');
      }
      updatedMembers += 1;
    } catch (error: any) {
      failedMembers += 1;
      console.error(`❌ Role sync failed for ${member.username} (${member.discordId}): ${error.message}`);
    }
  }

  const summaryParts = [
    `eligible=${payload.summary?.eligibleMembers ?? eligibleProcessed}`,
    `updated=${updatedMembers}`,
    `unchanged=${unchangedMembers}`,
    `notFound=${notFoundMembers}`,
    `failed=${failedMembers}`,
    `missingDiscord=${payload.summary?.missingDiscordLink ?? 0}`,
    `missingRiot=${payload.summary?.missingRiotLink ?? 0}`,
    `noMapping=${payload.summary?.noMatchingMapping ?? 0}`,
  ];

  if (blockedByHierarchy > 0) {
    summaryParts.push(`blockedByHierarchy=${blockedByHierarchy}`);
  }

  return {
    ok: true,
    message: `Sync completed: ${summaryParts.join(', ')}`,
    summary: payload.summary,
  };
}

async function pollRoleForwardingSync() {
  const guildEntries = Array.from(client.guilds.cache.values());
  if (guildEntries.length === 0) return;

  for (const guild of guildEntries) {
    const result = await syncRoleForwardingForGuild(guild.id, guild, true);
    if (!result.ok) {
      console.warn(`⚠️ Role forwarding sync failed for guild ${guild.id}: ${result.message}`);
    } else if (result.message) {
      console.log(`🔁 Role forwarding sync (${guild.name}): ${result.message}`);
    }
  }
}

function buildChatReplyButtonCustomId(conversationId: string) {
  return `${CHAT_REPLY_BUTTON_PREFIX}${conversationId}`;
}

function extractConversationIdFromChatReplyCustomId(customId: string, prefix: string) {
  if (!customId.startsWith(prefix)) return null;
  const conversationId = customId.slice(prefix.length).trim();
  return conversationId || null;
}

// ============================================================
// Command Handlers
// ============================================================

async function handleLinkServer(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  const guild = interaction.guild;

  if (!guildId || !guild) {
    return interaction.editReply('❌ This command must be used in a server.');
  }

  // Double-check administrator permission
  const member = interaction.member as any;
  if (!member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
    return interaction.editReply('❌ You need **Administrator** permissions to link this server.');
  }

  // Request a link code from the API
  const result = await apiRequest('/api/communities/link-code', 'POST', {
    guildId,
    guildName: guild.name,
  });

  if (!result.ok) {
    return interaction.editReply(`❌ ${result.data.error || 'Failed to generate link code.'}`);
  }

  const { code, expiresAt } = result.data;
  const expiresIn = Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000);

  const embed = new EmbedBuilder()
    .setColor(0x0a84ff)
    .setTitle('🔗 Server Link Code')
    .setDescription(
      `Your link code is:\n\n` +
      `# \`${code}\`\n\n` +
      `Go to **${APP_URL}/communities/register** and enter this code to link your server.\n\n` +
      `⏳ This code expires in **${expiresIn} minutes**.`
    )
    .setFooter({ text: 'Only administrators can generate link codes.' })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

// ============================================================
// /setup — Interactive Feed Configuration
// ============================================================

// Temporary state for multi-step setup flows (keyed by `${userId}-${channelId}`)
const pendingSetups = new Map<string, {
  feedType: 'DUO' | 'LFT' | 'SCRIM';
  channelId: string;
  guildId: string;
  communityId: string;
  filterRegions: string[];
  filterRoles: string[];
  filterLanguages: string[];
  filterMinRank: string | null;
  filterMaxRank: string | null;
}>();

async function handleSetup(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  if (!guildId) return interaction.editReply('❌ This command must be used in a server.');

  // Verify community link
  const communityRes = await apiRequest(`/api/communities?discordServerId=${guildId}`);
  if (!communityRes.ok || !communityRes.data.communities?.length) {
    return interaction.editReply(
      '❌ No community is linked to this Discord server.\nUse `/linkserver` first, then register the community on the app.'
    );
  }
  const community = communityRes.data.communities[0];

  // Fetch existing channels for this guild
  const channelsRes = await apiRequest(`/api/discord/feed/channels?guildId=${guildId}`);
  const existingChannels = channelsRes.ok
    ? (channelsRes.data.channels || channelsRes.data || [])
    : [];

  // Build the main setup embed
  const embed = new EmbedBuilder()
    .setColor(0x0a84ff)
    .setTitle('⚙️ RiftEssence Feed Setup')
    .setDescription(
      `Community: **${community.name}**\n` +
      `Channel: <#${interaction.channelId}>\n\n` +
      `Choose what type of posts to forward to **this channel**, or manage existing channels.\n` +
      `Run **/setup** in the exact destination channel if you want forwarding there.\n\n` +
      `📌 Max 5 feed channels per server (currently ${existingChannels.length}/5).`
    )
    .setFooter({ text: 'Only administrators can configure feeds.' });

  if (existingChannels.length > 0) {
    const list = existingChannels.map((fc: any) =>
      `• <#${fc.channelId}> — **${fc.feedType}**${describeFilters(fc)}`
    ).join('\n');
    embed.addFields({ name: '📋 Current Channels', value: list });
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('setup_duo').setLabel('🤝 Duo Feed').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_lft').setLabel('👥 LFT Feed').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_scrim').setLabel('⚔️ Scrim Feed').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('setup_remove').setLabel('🗑️ Remove Channel').setStyle(ButtonStyle.Danger)
      .setDisabled(existingChannels.length === 0),
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleRoleMenu(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  const guild = interaction.guild;

  if (!guildId || !guild) {
    return interaction.editReply('❌ This command must be used in a server.');
  }

  const member = interaction.member as any;
  if (!member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
    return interaction.editReply('❌ You need **Administrator** permissions to configure role forwarding.');
  }

  const configResult = await fetchRoleForwardingConfig(guildId);
  if (!configResult.ok) {
    const helpText = configResult.error.includes('linked community')
      ? '❌ This server is not linked to a RiftEssence community yet.\nUse `/linkserver` first, then register on the app.'
      : `❌ ${configResult.error}`;
    return interaction.editReply(helpText);
  }

  const sessionKey = getRoleMenuSessionKey(interaction.user.id, guildId);
  pendingRoleMenuSessions.delete(sessionKey);

  return interaction.editReply({
    embeds: [buildRoleMenuOverviewEmbed(configResult.config, guild.name)],
    components: buildRoleMenuOverviewRows(),
  });
}

async function handleSendDraft(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  const guild = interaction.guild;
  if (!guildId || !guild) {
    return interaction.editReply('❌ This command must be used in a server.');
  }

  const member = interaction.member as any;
  if (!hasSendDraftPermission(member)) {
    return interaction.editReply('❌ You need **Manage Server** or **Administrator** permission to send drafts.');
  }

  const options = await fetchSendDraftOptions(guildId, interaction.user.id);
  if (!options.ok) {
    return interaction.editReply(`❌ ${options.error || 'Failed to load draft options.'}`);
  }

  if (options.status === 'MISSING_DISCORD_LINK') {
    return interaction.editReply('❌ Your Discord account is not linked to RiftEssence. Link it from your profile first.');
  }

  if (options.status === 'NO_TEAM_MEMBERSHIP') {
    return interaction.editReply('❌ You are not part of any RiftEssence team. Join or create a team first.');
  }

  const teamsWithDrafts = options.teams.filter((team) => Array.isArray(team.drafts) && team.drafts.length > 0);
  if (options.status === 'NO_SAVED_DRAFTS' || teamsWithDrafts.length === 0) {
    return interaction.editReply('❌ No saved drafts found. Create and save at least one draft in the Team Draft Room first.');
  }

  const sessionKey = getSendDraftSessionKey(interaction.user.id, guildId);
  pendingSendDraftSessions.set(sessionKey, {
    guildId,
    discordUserId: interaction.user.id,
    teams: teamsWithDrafts,
    selectedTeamId: null,
  });

  const teamOptions = teamsWithDrafts.slice(0, 25).map((team) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${team.name}${team.tag ? ` [${team.tag}]` : ''}`.slice(0, 100))
      .setValue(team.id)
      .setDescription(`${team.drafts.length} saved drafts`.slice(0, 100))
  );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(SEND_DRAFT_TEAM_SELECT)
      .setPlaceholder('Choose a team')
      .addOptions(teamOptions)
  );

  return interaction.editReply({
    embeds: [buildSendDraftTeamChooserEmbed(guild.name, teamsWithDrafts)],
    components: [row],
  });
}

function buildDuoPostModal() {
  const modal = new ModalBuilder()
    .setCustomId(DUO_POST_MODAL)
    .setTitle('Create Duo Post');

  const riotIdInput = new TextInputBuilder()
    .setCustomId(DUO_RIOT_ID_INPUT)
    .setLabel('Riot ID (GameName#TAG)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(60)
    .setPlaceholder('PlayerName#NA1');

  const rolesInput = new TextInputBuilder()
    .setCustomId(DUO_ROLES_INPUT)
    .setLabel('Roles (primary / secondary)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(40)
    .setPlaceholder('TOP / JUNGLE');

  const languagesInput = new TextInputBuilder()
    .setCustomId(DUO_LANGUAGES_INPUT)
    .setLabel('Languages (comma separated)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(80)
    .setPlaceholder('English, French');

  const messageInput = new TextInputBuilder()
    .setCustomId(DUO_MESSAGE_INPUT)
    .setLabel('Message')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('Tell teammates what you want to play, rank goals, availability, etc.');

  const vcInput = new TextInputBuilder()
    .setCustomId(DUO_VC_INPUT)
    .setLabel('VC Preference (optional)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(20)
    .setPlaceholder('ALWAYS | SOMETIMES | NEVER');

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(riotIdInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(rolesInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(languagesInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(vcInput),
  );

  return modal;
}

async function handleDuoPost(interaction: ChatInputCommandInteraction) {
  const ok = await ensureDuoCommunity(interaction);
  if (!ok) return;
  return interaction.showModal(buildDuoPostModal());
}

async function handleDuoPostModalSubmit(interaction: ModalSubmitInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: '❌ This action must be used in a server.', ephemeral: true });
  }

  const riotId = interaction.fields.getTextInputValue(DUO_RIOT_ID_INPUT).trim();
  const roles = interaction.fields.getTextInputValue(DUO_ROLES_INPUT).trim();
  const languages = interaction.fields.getTextInputValue(DUO_LANGUAGES_INPUT).trim();
  const message = interaction.fields.getTextInputValue(DUO_MESSAGE_INPUT).trim();
  const vcPreference = interaction.fields.getTextInputValue(DUO_VC_INPUT).trim();

  const rawTag = interaction.user.tag || `${interaction.user.username}#${interaction.user.discriminator}`;
  const discordTag = rawTag.endsWith('#0') ? interaction.user.username : rawTag;

  const payload = {
    source: 'modal',
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    authorDiscordId: interaction.user.id,
    authorDiscordUsername: discordTag,
    riotId: riotId || undefined,
    roles: roles || undefined,
    languages: languages || undefined,
    message: message || undefined,
    vcPreference: vcPreference || undefined,
    timestamp: new Date().toISOString(),
  };

  const result = await apiRequest('/api/discord/ingest', 'POST', payload);
  if (!result.ok) {
    const errorMessage = result.data?.error || 'Failed to create duo post.';
    return interaction.reply({ content: `❌ ${errorMessage}`, ephemeral: true });
  }

  return interaction.reply({
    content: `✅ Duo post created! View it in the app: ${APP_URL}/feed`,
    ephemeral: true,
  });
}

function describeFilters(fc: any): string {
  const parts: string[] = [];
  if (fc.filterRegions?.length > 0) parts.push(`Regions: ${fc.filterRegions.join(', ')}`);
  if (fc.filterRoles?.length > 0) parts.push(`Roles: ${fc.filterRoles.join(', ')}`);
  if (fc.filterLanguages?.length > 0) parts.push(`Languages: ${fc.filterLanguages.join(', ')}`);
  if (fc.filterMinRank) parts.push(`Min: ${fc.filterMinRank}`);
  if (fc.filterMaxRank) parts.push(`Max: ${fc.filterMaxRank}`);
  return parts.length > 0 ? ` (${parts.join(' | ')})` : ' (Global)';
}

function feedTypeLabel(feedType: 'DUO' | 'LFT' | 'SCRIM'): string {
  if (feedType === 'DUO') return 'Duo';
  if (feedType === 'LFT') return 'LFT';
  return 'Scrim';
}

function feedTypeTitle(feedType: 'DUO' | 'LFT' | 'SCRIM'): string {
  if (feedType === 'DUO') return '🤝 Duo';
  if (feedType === 'LFT') return '👥 LFT';
  return '⚔️ Scrim';
}

// ============================================================
// Button & Select Menu Interaction Handlers
// ============================================================

async function handleButtonInteraction(interaction: ButtonInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const customId = interaction.customId;
  const key = `${interaction.user.id}-${interaction.channelId}`;
  const roleMenuSessionKey = getRoleMenuSessionKey(interaction.user.id, guildId);

  if (customId === ROLE_MENU_CLOSE) {
    pendingRoleMenuSessions.delete(roleMenuSessionKey);
    return interaction.update({ content: 'Role forwarding menu closed.', embeds: [], components: [] });
  }

  if (customId === ROLE_MENU_REFRESH) {
    const configResult = await fetchRoleForwardingConfig(guildId);
    if (!configResult.ok) {
      return interaction.update({ content: `❌ ${configResult.error}`, embeds: [], components: [] });
    }

    pendingRoleMenuSessions.delete(roleMenuSessionKey);
    return interaction.update({
      content: '🔁 Refreshed role forwarding configuration.',
      embeds: [buildRoleMenuOverviewEmbed(configResult.config, interaction.guild?.name)],
      components: buildRoleMenuOverviewRows(),
    });
  }

  if (customId === ROLE_MENU_SYNC) {
    const syncResult = await syncRoleForwardingForGuild(guildId, interaction.guild || undefined);
    const configResult = await fetchRoleForwardingConfig(guildId);

    if (!configResult.ok) {
      return interaction.update({
        content: `${syncResult.ok ? '✅' : '❌'} ${syncResult.message}\n⚠️ Could not refresh role menu: ${configResult.error}`,
        embeds: [],
        components: [],
      });
    }

    return interaction.update({
      content: `${syncResult.ok ? '✅' : '❌'} ${syncResult.message}`,
      embeds: [buildRoleMenuOverviewEmbed(configResult.config, interaction.guild?.name)],
      components: buildRoleMenuOverviewRows(),
    });
  }

  const roleMenuMode = getRoleMenuModeFromCustomId(customId);
  if (roleMenuMode) {
    const configResult = await fetchRoleForwardingConfig(guildId);
    if (!configResult.ok) {
      return interaction.update({ content: `❌ ${configResult.error}`, embeds: [], components: [] });
    }

    const session: PendingRoleMenuSession = {
      guildId,
      mode: roleMenuMode,
      selectedKey: null,
      selectedRoleId: null,
      rolePage: 0,
    };
    pendingRoleMenuSessions.set(roleMenuSessionKey, session);

    return interaction.update({
      content: '',
      embeds: [buildRoleMenuEditorEmbed(session, configResult.config)],
      components: buildRoleMenuEditorRows(session, interaction.guild || null),
    });
  }

  if (customId === ROLE_MENU_ROLE_PAGE_PREV || customId === ROLE_MENU_ROLE_PAGE_NEXT) {
    const session = pendingRoleMenuSessions.get(roleMenuSessionKey);
    if (!session) {
      return interaction.update({ content: '❌ Role menu session expired. Run `/rolemenu` again.', embeds: [], components: [] });
    }

    const delta = customId === ROLE_MENU_ROLE_PAGE_PREV ? -1 : 1;
    session.rolePage = Math.max(0, session.rolePage + delta);
    pendingRoleMenuSessions.set(roleMenuSessionKey, session);

    const configResult = await fetchRoleForwardingConfig(guildId);
    if (!configResult.ok) {
      return interaction.update({ content: `❌ ${configResult.error}`, embeds: [], components: [] });
    }

    return interaction.update({
      content: '',
      embeds: [buildRoleMenuEditorEmbed(session, configResult.config)],
      components: buildRoleMenuEditorRows(session, interaction.guild || null),
    });
  }

  if (customId === ROLE_MENU_BACK) {
    const configResult = await fetchRoleForwardingConfig(guildId);
    if (!configResult.ok) {
      return interaction.update({ content: `❌ ${configResult.error}`, embeds: [], components: [] });
    }

    pendingRoleMenuSessions.delete(roleMenuSessionKey);
    return interaction.update({
      content: '',
      embeds: [buildRoleMenuOverviewEmbed(configResult.config, interaction.guild?.name)],
      components: buildRoleMenuOverviewRows(),
    });
  }

  if (customId === ROLE_MENU_SAVE || customId === ROLE_MENU_CLEAR) {
    const session = pendingRoleMenuSessions.get(roleMenuSessionKey);
    if (!session) {
      return interaction.update({ content: '❌ Role menu session expired. Run `/rolemenu` again.', embeds: [], components: [] });
    }

    if (!session.selectedKey) {
      const configResult = await fetchRoleForwardingConfig(guildId);
      if (!configResult.ok) {
        return interaction.update({ content: `❌ ${configResult.error}`, embeds: [], components: [] });
      }

      return interaction.update({
        content: '❌ Select a key first (rank/language) before saving.',
        embeds: [buildRoleMenuEditorEmbed(session, configResult.config)],
        components: buildRoleMenuEditorRows(session, interaction.guild || null),
      });
    }

    if (customId === ROLE_MENU_SAVE && !session.selectedRoleId) {
      const configResult = await fetchRoleForwardingConfig(guildId);
      if (!configResult.ok) {
        return interaction.update({ content: `❌ ${configResult.error}`, embeds: [], components: [] });
      }

      return interaction.update({
        content: '❌ Select a Discord role before saving this mapping.',
        embeds: [buildRoleMenuEditorEmbed(session, configResult.config)],
        components: buildRoleMenuEditorRows(session, interaction.guild || null),
      });
    }

    const updateResult = await apiRequest('/api/discord/role-forwarding', 'PATCH', {
      guildId,
      type: session.mode,
      key: session.selectedKey,
      roleId: customId === ROLE_MENU_CLEAR ? null : session.selectedRoleId,
    });

    if (!updateResult.ok) {
      const configResult = await fetchRoleForwardingConfig(guildId);
      if (!configResult.ok) {
        return interaction.update({ content: `❌ ${updateResult.data?.error || 'Failed to update mapping.'}`, embeds: [], components: [] });
      }

      return interaction.update({
        content: `❌ ${updateResult.data?.error || 'Failed to update mapping.'}`,
        embeds: [buildRoleMenuEditorEmbed(session, configResult.config)],
        components: buildRoleMenuEditorRows(session, interaction.guild || null),
      });
    }

    const configResult = await fetchRoleForwardingConfig(guildId);
    if (!configResult.ok) {
      return interaction.update({
        content: `✅ Mapping updated, but refresh failed: ${configResult.error}`,
        embeds: [],
        components: [],
      });
    }

    pendingRoleMenuSessions.delete(roleMenuSessionKey);
    const actionText = customId === ROLE_MENU_CLEAR ? 'cleared' : 'saved';
    return interaction.update({
      content: `✅ ${modeLabel(session.mode)} mapping ${actionText}: **${session.selectedKey}** ${customId === ROLE_MENU_CLEAR ? '' : `→ <@&${session.selectedRoleId}>`}`,
      embeds: [buildRoleMenuOverviewEmbed(configResult.config, interaction.guild?.name)],
      components: buildRoleMenuOverviewRows(),
    });
  }

  // ── Choose feed type ──
  if (customId === 'setup_duo' || customId === 'setup_lft' || customId === 'setup_scrim') {
    const feedType = customId === 'setup_duo'
      ? 'DUO'
      : customId === 'setup_lft'
        ? 'LFT'
        : 'SCRIM';

    const communityRes = await apiRequest(`/api/communities?discordServerId=${guildId}`);
    const community = communityRes.data?.communities?.[0];
    if (!community) {
      return interaction.update({ content: '❌ Community not found.', embeds: [], components: [] });
    }

    pendingSetups.set(key, {
      feedType,
      channelId: interaction.channelId!,
      guildId,
      communityId: community.id,
      filterRegions: [],
      filterRoles: [],
      filterLanguages: [],
      filterMinRank: null,
      filterMaxRank: null,
    });

    const embed = new EmbedBuilder()
      .setColor(0x0a84ff)
      .setTitle(`${feedTypeTitle(feedType)} Feed Setup`)
      .setDescription(
        `Setting up **${feedType}** forwarding in <#${interaction.channelId}>.\n\n` +
        'Choose a mode:'
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('setup_global').setLabel('🌐 Global (All Posts)').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('setup_filters').setLabel('⚙️ Custom Filters').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('setup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    return interaction.update({ embeds: [embed], components: [row] });
  }

  // ── Global (no filters) ──
  if (customId === 'setup_global') {
    const setup = pendingSetups.get(key);
    if (!setup) return interaction.update({ content: '❌ Setup session expired. Run `/setup` again.', embeds: [], components: [] });

    const res = await apiRequest('/api/discord/feed/channels', 'POST', {
      communityId: setup.communityId,
      guildId: setup.guildId,
      channelId: setup.channelId,
      feedType: setup.feedType,
    });

    pendingSetups.delete(key);

    if (res.ok) {
      const label = feedTypeLabel(setup.feedType);
      const verb = res.data.updated ? 'updated' : 'configured';
      return interaction.update({
        content: `✅ **${label} Feed** ${verb} for <#${setup.channelId}> — **Global** (all posts).`,
        embeds: [], components: [],
      });
    }
    return interaction.update({ content: `❌ ${res.data.error || 'Failed to save channel.'}`, embeds: [], components: [] });
  }

  // ── Custom Filters: show select menus ──
  if (customId === 'setup_filters') {
    const setup = pendingSetups.get(key);
    if (!setup) return interaction.update({ content: '❌ Setup session expired. Run `/setup` again.', embeds: [], components: [] });

    const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

    // Row 1: Region select
    const regionMenu = new StringSelectMenuBuilder()
      .setCustomId('filter_region')
      .setPlaceholder('Select regions (leave empty = all)')
      .setMinValues(0)
      .setMaxValues(REGIONS.length)
      .addOptions(REGIONS.map(r => new StringSelectMenuOptionBuilder().setLabel(r).setValue(r)));
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(regionMenu));

    // Row 2: Language select (DUO + LFT)
    const languageMenu = new StringSelectMenuBuilder()
      .setCustomId(SETUP_FILTER_LANGUAGE)
      .setPlaceholder('Select languages (leave empty = all)')
      .setMinValues(0)
      .setMaxValues(Math.min(ROLE_FORWARDING_LANGUAGE_KEYS.length, 25))
      .addOptions(
        ROLE_FORWARDING_LANGUAGE_KEYS.map((language) =>
          new StringSelectMenuOptionBuilder().setLabel(language).setValue(language)
        )
      );
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(languageMenu));

    // Row 3: Role select (DUO only)
    if (setup.feedType === 'DUO') {
      const roleMenu = new StringSelectMenuBuilder()
        .setCustomId('filter_role')
        .setPlaceholder('Select roles (leave empty = all)')
        .setMinValues(0)
        .setMaxValues(ROLES.length)
        .addOptions(ROLES.map(r => new StringSelectMenuOptionBuilder().setLabel(r).setValue(r).setEmoji(ROLE_EMOJIS[r] || '🎮')));
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(roleMenu));
    }

    // Row 4: Rank range (single row to stay within Discord's 5-row component limit)
    const rankRangeMenu = new StringSelectMenuBuilder()
      .setCustomId(SETUP_FILTER_RANK_RANGE)
      .setPlaceholder('Rank range (optional): choose min and/or max')
      .setMinValues(0)
      .setMaxValues(2)
      .addOptions([
        ...RANKS.map((r) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`Min: ${r}`)
            .setValue(`min:${r}`)
            .setEmoji(RANK_EMOJIS[r] || '🏆')
        ),
        ...RANKS.map((r) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`Max: ${r}`)
            .setValue(`max:${r}`)
            .setEmoji(RANK_EMOJIS[r] || '🏆')
        ),
      ]);
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rankRangeMenu));

    // Row 5: Confirm / Cancel
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('setup_confirm').setLabel('✅ Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('setup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    ));

    const embed = new EmbedBuilder()
      .setColor(0x0a84ff)
      .setTitle(`⚙️ Custom Filters — ${setup.feedType}`)
      .setDescription(
        'Use the dropdown menus below to set filters.\n' +
        'Leave a menu empty to accept all values for that filter.\n' +
        'Press **Confirm** when done.'
      );

    return interaction.update({ embeds: [embed], components: rows });
  }

  // ── Confirm filtered setup ──
  if (customId === 'setup_confirm') {
    const setup = pendingSetups.get(key);
    if (!setup) return interaction.update({ content: '❌ Setup session expired. Run `/setup` again.', embeds: [], components: [] });

    const res = await apiRequest('/api/discord/feed/channels', 'POST', {
      communityId: setup.communityId,
      guildId: setup.guildId,
      channelId: setup.channelId,
      feedType: setup.feedType,
      filterRegions: setup.filterRegions,
      filterRoles: setup.filterRoles,
      filterLanguages: setup.filterLanguages,
      filterMinRank: setup.filterMinRank,
      filterMaxRank: setup.filterMaxRank,
    });

    pendingSetups.delete(key);

    if (res.ok) {
      const label = feedTypeLabel(setup.feedType);
      const verb = res.data.updated ? 'updated' : 'configured';
      const filterDesc = describeFilters(setup);
      return interaction.update({
        content: `✅ **${label} Feed** ${verb} for <#${setup.channelId}>${filterDesc}.`,
        embeds: [], components: [],
      });
    }
    return interaction.update({ content: `❌ ${res.data.error || 'Failed to save channel.'}`, embeds: [], components: [] });
  }

  // ── Cancel ──
  if (customId === 'setup_cancel') {
    pendingSetups.delete(key);
    return interaction.update({ content: 'Setup cancelled.', embeds: [], components: [] });
  }

  // ── Remove channel flow ──
  if (customId === 'setup_remove') {
    const channelsRes = await apiRequest(`/api/discord/feed/channels?guildId=${guildId}`);
    const channels = channelsRes.ok ? (channelsRes.data.channels || channelsRes.data || []) : [];

    if (channels.length === 0) {
      return interaction.update({ content: 'ℹ️ No feed channels to remove.', embeds: [], components: [] });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('remove_channel_select')
      .setPlaceholder('Select a channel config to remove')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(channels.slice(0, 25).map((fc: any) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`#${fc.channelId} — ${fc.feedType}${fc.filterRegions?.length ? ` (${fc.filterRegions.join(',')})` : ' (Global)'}`)
          .setValue(fc.id)
      ));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
    return interaction.update({ content: 'Select a feed channel configuration to remove:', embeds: [], components: [row] });
  }

  // ── Remove channel button after selecting from delete list ──
  if (customId.startsWith('remove_confirm_')) {
    const channelConfigId = customId.replace('remove_confirm_', '');
    const deleteRes = await apiRequest(`/api/discord/feed/channels/${channelConfigId}`, 'DELETE');
    if (deleteRes.ok) {
      return interaction.update({ content: '✅ Feed channel removed.', components: [] });
    }
    return interaction.update({ content: `❌ ${deleteRes.data.error || 'Failed to remove.'}`, components: [] });
  }
}

async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
  const key = `${interaction.user.id}-${interaction.channelId}`;
  const customId = interaction.customId;
  const guildId = interaction.guildId;

  if (customId === SEND_DRAFT_TEAM_SELECT || customId === SEND_DRAFT_PICK_SELECT) {
    if (!guildId) {
      return interaction.update({ content: '❌ This action must be used in a server.', embeds: [], components: [] });
    }

    const sessionKey = getSendDraftSessionKey(interaction.user.id, guildId);
    const session = pendingSendDraftSessions.get(sessionKey);
    if (!session) {
      return interaction.update({ content: '❌ Draft menu expired. Run `/send-draft` again.', embeds: [], components: [] });
    }

    if (customId === SEND_DRAFT_TEAM_SELECT) {
      const teamId = interaction.values[0];
      const selectedTeam = session.teams.find((team) => team.id === teamId);
      if (!selectedTeam) {
        return interaction.update({ content: '❌ Selected team is no longer available.', embeds: [], components: [] });
      }

      session.selectedTeamId = selectedTeam.id;
      pendingSendDraftSessions.set(sessionKey, session);

      const draftOptions = selectedTeam.drafts.slice(0, 25).map((draft) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(draft.name.slice(0, 100))
          .setValue(`${selectedTeam.id}::${draft.id}`)
          .setDescription(`Updated ${new Date(draft.updatedAt).toLocaleString()}`.slice(0, 100))
      );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(SEND_DRAFT_PICK_SELECT)
          .setPlaceholder('Choose a saved draft')
          .addOptions(draftOptions)
      );

      return interaction.update({
        embeds: [buildSendDraftPickChooserEmbed(selectedTeam)],
        components: [row],
      });
    }

    const encoded = interaction.values[0] || '';
    const [teamId, draftId] = encoded.split('::');
    if (!teamId || !draftId) {
      return interaction.update({ content: '❌ Invalid draft selection.', embeds: [], components: [] });
    }

    const selectedTeam = session.teams.find((team) => team.id === teamId);
    if (!selectedTeam) {
      return interaction.update({ content: '❌ Selected team is no longer available.', embeds: [], components: [] });
    }

    const draftResult = await fetchSendDraftById(draftId, interaction.user.id);
    if (!draftResult.ok || !draftResult.draft) {
      return interaction.update({ content: `❌ ${draftResult.error || 'Failed to load selected draft.'}`, embeds: [], components: [] });
    }

    try {
      if (!interaction.channel || !interaction.channel.isTextBased()) {
        return interaction.update({ content: '❌ Could not find a text channel to post this draft.', embeds: [], components: [] });
      }

      const channel = interaction.channel as TextChannel;
      const embed = buildSendDraftEmbed(draftResult.draft, interaction.user.username, channel.guild);
      await channel.send({ embeds: [embed] });

      pendingSendDraftSessions.delete(sessionKey);
      return interaction.update({
        content: '✅ Draft sent to this channel.',
        embeds: [],
        components: [],
      });
    } catch (error: any) {
      console.error('❌ Failed to send selected draft embed:', error?.message || error);
      return interaction.update({
        content: '❌ Failed to send the draft embed to this channel. Check bot channel permissions and try again.',
        embeds: [],
        components: [],
      });
    }
  }

  if (customId === ROLE_MENU_SELECT_KEY) {
    if (!guildId) return interaction.deferUpdate();

    const roleMenuSessionKey = getRoleMenuSessionKey(interaction.user.id, guildId);
    const session = pendingRoleMenuSessions.get(roleMenuSessionKey);
    if (!session) {
      return interaction.update({ content: '❌ Role menu session expired. Run `/rolemenu` again.', embeds: [], components: [] });
    }

    session.selectedKey = interaction.values[0] || null;
    pendingRoleMenuSessions.set(roleMenuSessionKey, session);

    const configResult = await fetchRoleForwardingConfig(guildId);
    if (!configResult.ok) {
      return interaction.update({ content: `❌ ${configResult.error}`, embeds: [], components: [] });
    }

    return interaction.update({
      content: '',
      embeds: [buildRoleMenuEditorEmbed(session, configResult.config)],
      components: buildRoleMenuEditorRows(session, interaction.guild || null),
    });
  }

  if (customId === ROLE_MENU_SELECT_ROLE) {
    if (!guildId) return interaction.deferUpdate();

    const roleMenuSessionKey = getRoleMenuSessionKey(interaction.user.id, guildId);
    const session = pendingRoleMenuSessions.get(roleMenuSessionKey);
    if (!session) {
      return interaction.update({ content: '❌ Role menu session expired. Run `/rolemenu` again.', embeds: [], components: [] });
    }

    session.selectedRoleId = interaction.values[0] || null;
    pendingRoleMenuSessions.set(roleMenuSessionKey, session);

    const configResult = await fetchRoleForwardingConfig(guildId);
    if (!configResult.ok) {
      return interaction.update({ content: `❌ ${configResult.error}`, embeds: [], components: [] });
    }

    return interaction.update({
      content: '',
      embeds: [buildRoleMenuEditorEmbed(session, configResult.config)],
      components: buildRoleMenuEditorRows(session, interaction.guild || null),
    });
  }

  // ── Filter select menus (update pending state) ──
  if (
    customId === 'filter_region' ||
    customId === 'filter_role' ||
    customId === SETUP_FILTER_LANGUAGE ||
    customId === SETUP_FILTER_RANK_RANGE ||
    customId === 'filter_min_rank' ||
    customId === 'filter_max_rank'
  ) {
    const setup = pendingSetups.get(key);
    if (!setup) {
      return interaction.deferUpdate(); // session expired, don't crash
    }

    if (customId === 'filter_region') setup.filterRegions = interaction.values;
    if (customId === 'filter_role') setup.filterRoles = interaction.values;
    if (customId === SETUP_FILTER_LANGUAGE) setup.filterLanguages = interaction.values;

    if (customId === SETUP_FILTER_RANK_RANGE) {
      const selectedMin = interaction.values.find((value) => value.startsWith('min:'))?.slice(4) || null;
      const selectedMax = interaction.values.find((value) => value.startsWith('max:'))?.slice(4) || null;

      let min = selectedMin;
      let max = selectedMax;

      if (min && max) {
        const minIndex = RANKS.indexOf(min);
        const maxIndex = RANKS.indexOf(max);
        if (minIndex > -1 && maxIndex > -1 && minIndex > maxIndex) {
          min = selectedMax;
          max = selectedMin;
        }
      }

      setup.filterMinRank = min;
      setup.filterMaxRank = max;
    }

    if (customId === 'filter_min_rank') setup.filterMinRank = interaction.values[0] || null;
    if (customId === 'filter_max_rank') setup.filterMaxRank = interaction.values[0] || null;

    return interaction.deferUpdate();
  }

  // ── Remove channel selection ──
  if (customId === 'remove_channel_select') {
    const channelConfigId = interaction.values[0];
    if (!channelConfigId) return interaction.deferUpdate();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`remove_confirm_${channelConfigId}`).setLabel('🗑️ Confirm Remove').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('setup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    return interaction.update({ content: 'Are you sure you want to remove this feed channel?', components: [row] });
  }
}

async function handleChatReplyButton(interaction: ButtonInteraction) {
  const conversationId = extractConversationIdFromChatReplyCustomId(interaction.customId, CHAT_REPLY_BUTTON_PREFIX);
  if (!conversationId) {
    return interaction.reply({ content: '❌ Invalid reply action.', ephemeral: interaction.inGuild() });
  }

  const modal = new ModalBuilder()
    .setCustomId(`${CHAT_REPLY_MODAL_PREFIX}${conversationId}`)
    .setTitle('Reply in RiftEssence Chat');

  const input = new TextInputBuilder()
    .setCustomId(CHAT_REPLY_TEXT_INPUT_ID)
    .setLabel('Your message')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(2000)
    .setPlaceholder('Type your reply. It will be sent to the same conversation in the app.')
    .setRequired(true);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
  modal.addComponents(row);

  return interaction.showModal(modal);
}

async function handleChatReplyModalSubmit(interaction: ModalSubmitInteraction) {
  const conversationId = extractConversationIdFromChatReplyCustomId(interaction.customId, CHAT_REPLY_MODAL_PREFIX);
  if (!conversationId) {
    return interaction.reply({ content: '❌ Invalid reply context. Please try again from the DM notification.', ephemeral: interaction.inGuild() });
  }

  const content = interaction.fields.getTextInputValue(CHAT_REPLY_TEXT_INPUT_ID)?.trim();
  if (!content) {
    return interaction.reply({ content: '❌ Message cannot be empty.', ephemeral: interaction.inGuild() });
  }

  const sendResult = await apiRequest('/api/discord/dm-reply', 'POST', {
    discordId: interaction.user.id,
    conversationId,
    content,
  });

  if (!sendResult.ok) {
    const errorMessage = sendResult.data?.error || 'Failed to send reply from Discord.';
    return interaction.reply({ content: `❌ ${errorMessage}`, ephemeral: interaction.inGuild() });
  }

  return interaction.reply({
    content: `✅ Reply sent! Continue in app: ${APP_URL}`,
    ephemeral: interaction.inGuild(),
  });
}

// ============================================================
// Message Ingestion
// ============================================================

async function ingestDiscordMessage(message: any) {
  if (message.author.bot) return; // Ignore bot messages
  if (!message.guildId) return; // Only process server messages

  const guildId = message.guildId;
  const channelId = message.channelId;
  const discordUserId = message.author.id;
  const discordUsername = `${message.author.username}#${message.author.discriminator}`;
  const content = message.content;

  // Check if this channel is a registered feed channel
  const channelsRes = await apiRequest(`/api/discord/feed/channels?guildId=${guildId}`);
  if (!channelsRes.ok) return;

  const channels = Array.isArray(channelsRes.data?.channels)
    ? channelsRes.data.channels
    : Array.isArray(channelsRes.data)
      ? channelsRes.data
      : [];
  
  const isRegisteredChannel = channels.some((fc: any) => fc.channelId === channelId);
  if (!isRegisteredChannel) return; // Not a feed channel

  console.log(`📥 Ingesting message from ${discordUsername} in guild ${guildId}`);

  const payload = {
    guildId,
    channelId,
    messageId: message.id,
    authorDiscordId: discordUserId,
    authorDiscordUsername: discordUsername,
    content,
    timestamp: message.createdTimestamp ? new Date(message.createdTimestamp).toISOString() : new Date().toISOString(),
  };

  const result = await apiRequest('/api/discord/ingest', 'POST', payload);
  if (result.ok) {
    console.log(`✅ Ingested post: ${result.data.id}`);
  } else {
    console.error(`❌ Failed to ingest message: ${result.data.error}`);
  }
}

// ============================================================
// Outgoing Duo Post Mirroring
// ============================================================

let lastPollTime = new Date().toISOString();

async function pollOutgoingPosts() {
  try {
    const result = await apiRequest(`/api/discord/outgoing?since=${encodeURIComponent(lastPollTime)}`);
    if (!result.ok) {
      console.error('❌ Failed to poll outgoing posts:', result.data.error);
      return;
    }

    const posts = Array.isArray(result.data?.posts)
      ? result.data.posts
      : Array.isArray(result.data)
        ? result.data
        : [];

    lastPollTime = new Date().toISOString();

    if (!posts || posts.length === 0) return;

    console.log(`📤 Found ${posts.length} outgoing duo posts to mirror`);

    for (const post of posts) {
      await mirrorPostToDiscord(post);
    }
  } catch (error: any) {
    console.error('❌ Error in duo polling loop:', error.message);
  }
}

function buildDuoForwardEmbed(post: any, guild: Guild | null | undefined): EmbedBuilder {
  const { id, author, riotAccount, message, role, region, vcPreference, languages, communityName } = post;

  const mainAccount = riotAccount || { gameName: 'Unknown', tagLine: '', rank: '', division: '', winrate: null };
  const rawDisplayName = mainAccount.gameName && mainAccount.tagLine
    ? `${mainAccount.gameName}#${mainAccount.tagLine}`
    : mainAccount.summonerName || 'Unknown';
  const displayName = safeDiscordDisplayText(rawDisplayName, 80);
  const authorName = safeDiscordDisplayText(author?.username || 'Unknown', 80);
  const safeMessage = safeDiscordDisplayText(message, 320);
  const safeCommunityName = safeDiscordDisplayText(communityName, 80);

  const postUrl = `${APP_URL}/share/post/${id}`;
  const regionLine = `${resolveEmoji(guild, 'region', '🌍')} **${region || 'Unknown'}** • ${formatRoleLabelForDiscord(role, guild)}`;
  const rankLine = formatRankLabelForDiscord(mainAccount.rank, mainAccount.division, guild);
  const winrateLine = mainAccount.winrate !== null && mainAccount.winrate !== undefined
    ? `${resolveEmoji(guild, 'winrate', '📈')} ${Number(mainAccount.winrate).toFixed(1)}%`
    : null;
  const vcLine = formatVcLabelForDiscord(vcPreference, guild);
  const languagesLine = formatLanguagesForDiscord(languages, guild);
  const championSummary = buildChampionPoolSummary(post.championPoolMode, post.championList, post.championTierlist, guild);
  const verification = post.verification || null;
  const verificationMissing = Array.isArray(verification?.missing) ? verification.missing : [];
  const isVerified = verification?.isVerified === true;
  const verificationMissingLabel = verificationMissing.length > 0
    ? verificationMissing
        .map((value: string) => (value === 'riot' ? 'Riot link' : value === 'discord' ? 'Discord link' : value))
        .join(', ')
    : '';
  const verificationLine = verification
    ? (isVerified
      ? `${resolveEmoji(guild, 'verified', '✅')} Verified`
      : `${resolveEmoji(guild, 'unverified', '⚠️')} Unverified${verificationMissingLabel ? ` • Missing ${verificationMissingLabel}` : ''}`)
    : null;
  const embedColor = verification ? (isVerified ? 0x22C55E : 0xEF4444) : 0x3B82F6;
  const missingFields = Array.isArray(post.missingFields) ? post.missingFields : [];
  const missingFieldsLabel = missingFields.length > 0 ? missingFields.join(', ') : '';
  const missingInfoLine = missingFieldsLabel
    ? `${resolveEmoji(guild, 'missing', '🧩')} Missing info: ${missingFieldsLabel}`
    : null;

  const descriptionParts = [
    safeMessage ? `> ${safeMessage}` : null,
    `${resolveEmoji(guild, 'riot', '🎮')} **${displayName}**`,
    regionLine,
    [rankLine, winrateLine].filter(Boolean).join(' • ') || null,
    vcLine,
    languagesLine,
    verificationLine,
    missingInfoLine,
    championSummary ? `🗡️ Champion Pool\n${championSummary}` : null,
    safeCommunityName ? `🏠 ${safeCommunityName}` : null,
    `↗ [open in app](${postUrl})`,
  ].filter(Boolean);

  return new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`Duo • ${authorName}`)
    .setURL(postUrl)
    .setDescription(descriptionParts.join('\n'))
    .setFooter({ text: 'RiftEssence' })
    .setTimestamp();
}

function buildForwardMessagePayload(
  embed: EmbedBuilder,
  mentionDiscordId?: string | null,
  messageUrl?: string,
  extraButton?: { label: string; customId: string },
) {
  const payload: any = {
    embeds: [embed],
  };

  if (mentionDiscordId) {
    payload.content = `<@${mentionDiscordId}>`;
    payload.allowedMentions = {
      users: [mentionDiscordId],
    };
  }

  const buttons: ButtonBuilder[] = [];
  if (messageUrl) {
    buttons.push(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('💬 Message in App')
        .setURL(messageUrl)
    );
  }

  if (extraButton) {
    buttons.push(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setCustomId(extraButton.customId)
        .setLabel(extraButton.label)
    );
  }

  if (buttons.length > 0) {
    payload.components = [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)];
  }

  return payload;
}

async function mirrorPostToDiscord(post: any) {
  const { id, feedChannels } = post;

  // Mark as mirrored FIRST to prevent duplicate processing
  const markResult = await apiRequest(`/api/discord/posts/${id}/mirrored`, 'PATCH');
  if (!markResult.ok) {
    console.error(`❌ Failed to mark post ${id} as mirrored, skipping to prevent duplicates`);
    return;
  }

  if (!feedChannels || feedChannels.length === 0) {
    console.warn(`⚠️ Post ${id} has no feed channels, skipping`);
    return;
  }

  for (const fc of feedChannels) {
    try {
      const channel = await client.channels.fetch(fc.channelId);
      if (channel && channel.isTextBased() && 'guild' in channel) {
        const textChannel = channel as TextChannel;
        const embed = buildDuoForwardEmbed(post, textChannel.guild);
        const sent = await textChannel.send(
          buildForwardMessagePayload(
            embed,
            post.author?.discordId,
            `${APP_URL}/share/post/${id}`,
            { label: 'Send my own post', customId: DUO_POST_MODAL_BUTTON }
          )
        );
        storeMirroredMessageRef('DUO', id, textChannel.guild.id, fc.channelId, sent.id);
        console.log(`✅ Mirrored duo post ${id} to channel ${fc.channelId}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to send to channel ${fc.channelId}:`, error.message);
    }
  }
}

// ============================================================
// Outgoing LFT Post Mirroring
// ============================================================

async function pollOutgoingLftPosts() {
  try {
    const result = await apiRequest('/api/discord/outgoing-lft');
    if (!result.ok) {
      console.error('❌ Failed to poll outgoing LFT posts:', result.data.error);
      return;
    }

    const posts = Array.isArray(result.data?.posts)
      ? result.data.posts
      : Array.isArray(result.data)
        ? result.data
        : [];

    if (!posts || posts.length === 0) return;

    console.log(`📤 Found ${posts.length} outgoing LFT posts to mirror`);

    for (const post of posts) {
      await mirrorLftPostToDiscord(post);
    }
  } catch (error: any) {
    console.error('❌ Error in LFT polling loop:', error.message);
  }
}

function buildLftForwardEmbed(post: any, guild: Guild | null | undefined): EmbedBuilder {
  const isTeam = post.type === 'TEAM';
  const appUrl = `${APP_URL}/lft`;
  const regionPrefix = resolveEmoji(guild, 'region', '🌍');

  if (isTeam) {
    const teamName = post.teamName || 'Unnamed Team';
    const rankLabel = formatRankLabelForDiscord(post.averageRank, post.averageDivision, guild);
    const rolesNeeded = Array.isArray(post.rolesNeeded)
      ? post.rolesNeeded.map((role: string) => formatRoleLabelForDiscord(role, guild)).join(' • ')
      : '';

    const descriptionParts = [
      truncateForDiscord(post.details || post.description, 340) ? `> ${truncateForDiscord(post.details || post.description, 340)}` : null,
      post.region ? `${regionPrefix} **${post.region}**` : null,
      rankLabel,
      rolesNeeded ? `🎯 ${rolesNeeded}` : null,
      typeof post.scrims === 'boolean' ? `⚔️ Scrims: ${post.scrims ? 'Yes' : 'No'}` : null,
      post.minAvailability ? `📅 Min availability: ${post.minAvailability}` : null,
      post.coachingAvailability ? `🧠 Coaching: ${post.coachingAvailability}` : null,
      `↗ [open in app](${appUrl})`,
    ].filter(Boolean);

    return new EmbedBuilder()
      .setColor(0x22C55E)
      .setTitle(`Team LFT • ${teamName}`)
      .setURL(appUrl)
      .setDescription(descriptionParts.join('\n'))
      .setFooter({ text: 'RiftEssence' })
      .setTimestamp();
  }

  const authorName = post.author?.username || 'Unknown';
  const candidateType = String(post.candidateType || 'PLAYER').toUpperCase();
  const candidateColorMap: Record<string, number> = {
    PLAYER: 0x3B82F6,
    MANAGER: 0x14B8A6,
    COACH: 0xF97316,
    OTHER: 0xA855F7,
  };
  const candidateLabel = candidateType === 'PLAYER'
    ? 'Player'
    : candidateType.charAt(0) + candidateType.slice(1).toLowerCase();
  const customOtherName = candidateType === 'OTHER' && typeof post.representedName === 'string' && post.representedName.trim().length > 0
    ? post.representedName.trim()
    : null;
  const listingName = customOtherName || authorName;
  const rankLabel = formatRankLabelForDiscord(post.rank, post.division, guild);
  const languagesLine = formatLanguagesForDiscord(post.languages, guild);
  const championTierFields = buildChampionTierlistFields(post.championTierlist, guild);
  const championPoolSummary = buildChampionPoolSummary(post.championPoolMode, post.championPool, post.championTierlist, guild);
  const showTierFields = candidateType === 'PLAYER' && championTierFields.length > 0;

  const descriptionParts = [
    truncateForDiscord(post.details || post.description, 340) ? `> ${truncateForDiscord(post.details || post.description, 340)}` : null,
    post.region ? `${regionPrefix} **${post.region}**` : null,
    candidateType === 'PLAYER' && post.mainRole ? formatRoleLabelForDiscord(post.mainRole, guild) : null,
    rankLabel,
    post.experience ? `🧩 Experience: ${post.experience}` : null,
    post.availability ? `📅 Availability: ${post.availability}` : null,
    languagesLine,
    candidateType === 'PLAYER' && !showTierFields && championPoolSummary ? `🗡️ Champion Pool\n${championPoolSummary}` : null,
    post.author?.discordUsername ? `💬 ${post.author.discordUsername}` : null,
    `↗ [open in app](${appUrl})`,
  ].filter(Boolean);

  const embed = new EmbedBuilder()
    .setColor(candidateColorMap[candidateType] ?? candidateColorMap.PLAYER)
    .setTitle(`${candidateLabel} LFT • ${listingName}`)
    .setURL(appUrl)
    .setDescription(descriptionParts.join('\n'))
    .setFooter({ text: 'RiftEssence' })
    .setTimestamp();

  if (showTierFields) {
    embed.addFields(championTierFields);
  }

  return embed;
}

async function mirrorLftPostToDiscord(post: any) {
  const { id, feedChannels } = post;

  // Mark as mirrored FIRST
  const markResult = await apiRequest(`/api/discord/lft-posts/${id}/mirrored`, 'PATCH');
  if (!markResult.ok) {
    console.error(`❌ Failed to mark LFT post ${id} as mirrored, skipping`);
    return;
  }

  if (!feedChannels || feedChannels.length === 0) {
    console.warn(`⚠️ LFT post ${id} has no feed channels, skipping`);
    return;
  }

  for (const fc of feedChannels) {
    try {
      const channel = await client.channels.fetch(fc.channelId);
      if (channel && channel.isTextBased() && 'guild' in channel) {
        const textChannel = channel as TextChannel;
        const embed = buildLftForwardEmbed(post, textChannel.guild);
        const messageUrl = post.type === 'TEAM' && post.teamId ? `${APP_URL}/teams/${post.teamId}` : `${APP_URL}/lft`;
        const sent = await textChannel.send(buildForwardMessagePayload(embed, post.author?.discordId, messageUrl));
        storeMirroredMessageRef('LFT', id, textChannel.guild.id, fc.channelId, sent.id);
        console.log(`✅ Mirrored LFT post ${id} to channel ${fc.channelId}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to send LFT to channel ${fc.channelId}:`, error.message);
    }
  }
}

// ============================================================
// Outgoing Scrim Finder Post Mirroring
// ============================================================

async function pollOutgoingScrimPosts() {
  try {
    const result = await apiRequest('/api/discord/outgoing-scrims');
    if (!result.ok) {
      console.error('❌ Failed to poll outgoing SCRIM posts:', result.data.error);
      return;
    }

    const posts = Array.isArray(result.data?.posts)
      ? result.data.posts
      : Array.isArray(result.data)
        ? result.data
        : [];

    if (!posts || posts.length === 0) return;

    console.log(`📤 Found ${posts.length} outgoing SCRIM posts to mirror`);

    for (const post of posts) {
      await mirrorScrimPostToDiscord(post);
    }
  } catch (error: any) {
    console.error('❌ Error in SCRIM polling loop:', error.message);
  }
}

function buildScrimForwardEmbed(post: any, guild: Guild | null | undefined): EmbedBuilder {
  const appUrl = `${APP_URL}/teams/scrims`;
  const teamLabel = post.teamTag ? `${post.teamName} [${post.teamTag}]` : post.teamName;
  const rankLabel = formatRankLabelForDiscord(post.averageRank, post.averageDivision, guild);
  const startDate = new Date(post.startTimeUtc);
  const startTimestamp = Number.isFinite(startDate.getTime())
    ? `<t:${Math.floor(startDate.getTime() / 1000)}:F>`
    : String(post.startTimeUtc || 'Unknown');

  const descriptionParts = [
    truncateForDiscord(post.details, 320) ? `> ${truncateForDiscord(post.details, 320)}` : null,
    `${resolveEmoji(guild, 'region', '🌍')} **${post.region || 'Unknown'}**`,
    rankLabel,
    `⚔️ Format: **${post.scrimFormat || 'N/A'}**`,
    `🕒 Start: ${startTimestamp}`,
    `📌 Status: **${post.status || 'AVAILABLE'}**`,
    typeof post.proposalCount === 'number' ? `📨 Proposals: **${post.proposalCount}**` : null,
    post.opggMultisearchUrl ? `🔎 [OP.GG multisearch](${post.opggMultisearchUrl.startsWith('http') ? post.opggMultisearchUrl : `https://${post.opggMultisearchUrl}`})` : null,
    `↗ [open in app](${appUrl})`,
  ].filter(Boolean);

  return new EmbedBuilder()
    .setColor(0x2563EB)
    .setTitle(`Scrim Finder • ${teamLabel}`)
    .setURL(appUrl)
    .setDescription(descriptionParts.join('\n'))
    .setFooter({ text: 'RiftEssence' })
    .setTimestamp();
}

async function mirrorScrimPostToDiscord(post: any) {
  const { id, feedChannels } = post;

  const markResult = await apiRequest(`/api/discord/scrim-posts/${id}/mirrored`, 'PATCH');
  if (!markResult.ok) {
    console.error(`❌ Failed to mark SCRIM post ${id} as mirrored, skipping`);
    return;
  }

  if (!feedChannels || feedChannels.length === 0) {
    console.warn(`⚠️ SCRIM post ${id} has no feed channels, skipping`);
    return;
  }

  for (const fc of feedChannels) {
    try {
      const channel = await client.channels.fetch(fc.channelId);
      if (channel && channel.isTextBased() && 'guild' in channel) {
        const textChannel = channel as TextChannel;
        const embed = buildScrimForwardEmbed(post, textChannel.guild);
        const sent = await textChannel.send(buildForwardMessagePayload(embed, post.author?.discordId, `${APP_URL}/teams/scrims`));
        storeMirroredMessageRef('SCRIM', id, textChannel.guild.id, fc.channelId, sent.id);
        console.log(`✅ Mirrored SCRIM post ${id} to channel ${fc.channelId}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to send SCRIM to channel ${fc.channelId}:`, error.message);
    }
  }
}

async function waitMs(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function processMirrorDeletionEvent(event: MirrorDeletionEvent) {
  const refs = getMirroredMessageRefs(event.postType, event.postId);

  if (refs.length === 0) {
    const ackResult = await apiRequest(`/api/discord/mirror-deletions/${event.id}/acked`, 'PATCH');
    if (!ackResult.ok) {
      console.error(`❌ Failed to ack mirror deletion ${event.id} with empty refs`);
    }
    return;
  }

  let hasRetriableFailure = false;

  for (const ref of refs) {
    try {
      const channel = await client.channels.fetch(ref.channelId);
      if (!channel || !channel.isTextBased() || !('messages' in channel)) {
        removeMirroredMessageRef(event.postType, event.postId, ref.channelId, ref.messageId);
        continue;
      }

      const textChannel = channel as TextChannel;
      await textChannel.messages.delete(ref.messageId);
      removeMirroredMessageRef(event.postType, event.postId, ref.channelId, ref.messageId);
    } catch (error: any) {
      const discordCode = error?.code || error?.rawError?.code;

      // Unknown message/channel means already gone, so we can safely drop this ref.
      if (discordCode === 10008 || discordCode === 10003) {
        removeMirroredMessageRef(event.postType, event.postId, ref.channelId, ref.messageId);
      } else {
        hasRetriableFailure = true;
        console.error(
          `❌ Failed deleting mirrored ${event.postType} post ${event.postId} message ${ref.messageId} in ${ref.channelId}:`,
          error?.message || error
        );
      }
    }

    // Keep a tiny pace between deletes; discord.js also applies route-level rate limit handling.
    await waitMs(150);
  }

  if (hasRetriableFailure) {
    return;
  }

  clearMirroredMessageRefs(event.postType, event.postId);
  const ackResult = await apiRequest(`/api/discord/mirror-deletions/${event.id}/acked`, 'PATCH');
  if (!ackResult.ok) {
    console.error(`❌ Failed to ack mirror deletion ${event.id}`);
  } else {
    console.log(`🧹 Synced Discord deletion for ${event.postType} post ${event.postId}`);
  }
}

async function pollMirrorDeletions() {
  try {
    const safeLimit = Math.max(1, Math.min(100, MIRROR_DELETION_BATCH_SIZE));
    const result = await apiRequest(`/api/discord/mirror-deletions?limit=${safeLimit}`);
    if (!result.ok) {
      console.error('❌ Failed to poll mirror deletions:', result.data?.error || result.status);
      return;
    }

    const events = Array.isArray(result.data?.events) ? (result.data.events as MirrorDeletionEvent[]) : [];
    if (events.length === 0) return;

    console.log(`🧹 Found ${events.length} mirror deletion event(s)`);
    for (const event of events) {
      await processMirrorDeletionEvent(event);
    }
  } catch (error: any) {
    console.error('❌ Error in mirror deletion polling loop:', error?.message || error);
  }
}

// ============================================================
// Discord DM Notifications for Chat Messages
// ============================================================

const DM_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_DM_POLL_INTERVAL_MS || '15000', 10);

async function pollDmQueue() {
  try {
    const result = await apiRequest('/api/discord/dm-queue');
    if (!result.ok) {
      console.error('❌ Failed to poll DM queue:', result.data.error);
      return;
    }

    const dms = Array.isArray(result.data?.dms) ? result.data.dms : [];
    if (dms.length === 0) return;

    console.log(`📨 Found ${dms.length} pending DM notifications`);

    for (const dm of dms) {
      await sendChatDmNotification(dm);
    }
  } catch (error: any) {
    console.error('❌ Error polling DM queue:', error.message);
  }
}

async function sendChatDmNotification(dm: {
  id: string;
  recipientDiscordId: string;
  senderUsername: string;
  messagePreview: string;
  conversationId: string;
  kind?: string;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
  embedUrl?: string | null;
  embedFooter?: string | null;
  embedImageUrl?: string | null;
}) {
  const markResult = await apiRequest(`/api/discord/dm-queue/${dm.id}/sent`, 'PATCH');
  if (!markResult.ok) {
    console.error(`❌ Failed to mark DM ${dm.id} as sent, skipping to prevent duplicates`);
    return;
  }

  try {
    const user = await client.users.fetch(dm.recipientDiscordId);
    if (!user) {
      console.warn(`⚠️ Could not find Discord user ${dm.recipientDiscordId}`);
      return;
    }

    const isAdRequestNotification = typeof dm.conversationId === 'string' && dm.conversationId.startsWith('ad-request:');

    if (dm.kind === 'ADMIN_EMBED') {
      const colorHex = (dm.embedColor || '#5865F2').replace('#', '');
      const embedColor = /^[0-9a-fA-F]{6}$/.test(colorHex) ? parseInt(colorHex, 16) : 0x5865f2;
      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle((dm.embedTitle || 'RiftEssence Announcement').substring(0, 256))
        .setDescription((dm.embedDescription || dm.messagePreview || '').substring(0, 4000))
        .setTimestamp();

      if (dm.embedUrl) {
        embed.setURL(dm.embedUrl);
      }

      if (dm.embedFooter) {
        embed.setFooter({ text: dm.embedFooter.substring(0, 2048) });
      } else {
        embed.setFooter({ text: 'You can disable DM notifications in your RiftEssence settings.' });
      }

      if (dm.embedImageUrl) {
        embed.setImage(dm.embedImageUrl);
      }

      await user.send({ embeds: [embed] });
      console.log(`âœ… Sent admin broadcast DM embed to ${dm.recipientDiscordId}`);
      return;
    }

    if (isAdRequestNotification) {
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('📢 New ad request on RiftEssence')
        .setDescription(`**${dm.senderUsername}** submitted an ad request for admin review.`)
        .addFields({
          name: 'Request Summary',
          value: dm.messagePreview.length > 180
            ? dm.messagePreview.substring(0, 180) + '...'
            : dm.messagePreview,
        })
        .addFields({
          name: '🔗 Review Queue',
          value: `[Open Admin Ads queue](${APP_URL}/admin/ads)`,
        })
        .setFooter({ text: 'You can disable DM notifications in your RiftEssence settings.' })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Open Admin Ads')
          .setStyle(ButtonStyle.Link)
          .setURL(`${APP_URL}/admin/ads`)
      );

      await user.send({ embeds: [embed], components: [row] });
      console.log(`✅ Sent ad request DM notification to ${dm.recipientDiscordId}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x0a84ff)
      .setTitle('💬 New message on RiftEssence')
      .setDescription(`**${dm.senderUsername}** sent you a message:`)
      .addFields({
        name: 'Message',
        value: dm.messagePreview.length > 180
          ? dm.messagePreview.substring(0, 180) + '...'
          : dm.messagePreview,
      })
      .addFields({
        name: '🔗 Reply',
        value: `[Open conversation on RiftEssence](${APP_URL})`,
      })
      .setFooter({ text: 'You can disable DM notifications in your RiftEssence settings.' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildChatReplyButtonCustomId(dm.conversationId))
        .setLabel('✍️ Reply from Discord')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel('Open in RiftEssence')
        .setStyle(ButtonStyle.Link)
        .setURL(APP_URL)
    );

    await user.send({ embeds: [embed], components: [row] });
    console.log(`✅ Sent DM notification to ${dm.recipientDiscordId} for message from ${dm.senderUsername}`);
  } catch (error: any) {
    if (error.code === 50007) {
      console.warn(`⚠️ Cannot send DM to ${dm.recipientDiscordId} (DMs disabled or bot not in mutual server)`);
    } else {
      console.error(`❌ Failed to send DM to ${dm.recipientDiscordId}:`, error.message);
    }
  }
}

// ============================================================
// Scrim Proposal Discord Notifications
// ============================================================

const SCRIM_NOTIFICATION_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_SCRIM_NOTIFICATION_POLL_INTERVAL_MS || '15000', 10);

type ScrimDiscordNotification = {
  id: string;
  recipientDiscordId: string;
  type: string;
  message: string;
  actionRequired: boolean;
  proposal: {
    id: string;
    status: string;
    message: string | null;
    proposedStartTimeUtc: string | null;
    post: {
      id: string;
      teamName: string;
      teamTag: string | null;
      startTimeUtc: string;
      scrimFormat: string;
      opggMultisearchUrl: string | null;
    };
    proposerTeam: {
      id: string;
      name: string;
      tag: string | null;
      region: string;
    };
    targetTeam: {
      id: string;
      name: string;
      tag: string | null;
      region: string;
    };
  };
};

function buildScrimNotificationComponents(notification: ScrimDiscordNotification): ActionRowBuilder<ButtonBuilder>[] {
  const appLink = `${APP_URL}/notifications`;
  if (!notification.actionRequired) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel('Open Notifications').setStyle(ButtonStyle.Link).setURL(appLink)
    );
    return [row];
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`scrim_proposal_accept_${notification.proposal.id}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`scrim_proposal_delay_${notification.proposal.id}`)
      .setLabel('Delay')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`scrim_proposal_reject_${notification.proposal.id}`)
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setLabel('Open Notifications')
      .setStyle(ButtonStyle.Link)
      .setURL(appLink),
  );

  return [row];
}

function buildScrimNotificationEmbed(notification: ScrimDiscordNotification): EmbedBuilder {
  const proposal = notification.proposal;
  const teamLabel = proposal.proposerTeam.tag
    ? `${proposal.proposerTeam.name} [${proposal.proposerTeam.tag}]`
    : proposal.proposerTeam.name;
  const targetLabel = proposal.targetTeam.tag
    ? `${proposal.targetTeam.name} [${proposal.targetTeam.tag}]`
    : proposal.targetTeam.name;
  const startDate = new Date(proposal.post.startTimeUtc);
  const startTimestamp = Number.isFinite(startDate.getTime())
    ? `<t:${Math.floor(startDate.getTime() / 1000)}:F>`
    : proposal.post.startTimeUtc;

  const colorByType: Record<string, number> = {
    PROPOSAL_RECEIVED: 0x3B82F6,
    PROPOSAL_ACCEPTED: 0x22C55E,
    PROPOSAL_REJECTED: 0xEF4444,
    PROPOSAL_DELAYED: 0x8B5CF6,
    PROPOSAL_AUTO_REJECTED: 0xF59E0B,
  };

  const titleByType: Record<string, string> = {
    PROPOSAL_RECEIVED: '⚔️ New Scrim Proposal',
    PROPOSAL_ACCEPTED: '✅ Scrim Proposal Accepted',
    PROPOSAL_REJECTED: '❌ Scrim Proposal Rejected',
    PROPOSAL_DELAYED: '🕒 Scrim Proposal Delayed',
    PROPOSAL_AUTO_REJECTED: '⌛ Scrim Proposal Timed Out',
  };

  const embed = new EmbedBuilder()
    .setColor(colorByType[notification.type] || 0x3B82F6)
    .setTitle(titleByType[notification.type] || 'Scrim Update')
    .setDescription(notification.message)
    .addFields(
      {
        name: 'Matchup',
        value: `${teamLabel} → ${targetLabel}`,
        inline: false,
      },
      {
        name: 'Start',
        value: `${startTimestamp} (${proposal.post.scrimFormat})`,
        inline: false,
      },
      {
        name: 'Region',
        value: proposal.targetTeam.region || proposal.proposerTeam.region || 'Unknown',
        inline: true,
      },
      {
        name: 'Status',
        value: proposal.status,
        inline: true,
      }
    )
    .setFooter({ text: 'RiftEssence Scrim Finder' })
    .setTimestamp();

  if (proposal.message) {
    embed.addFields({
      name: 'Proposal Note',
      value: truncateForDiscord(proposal.message, 350),
      inline: false,
    });
  }

  if (proposal.post.opggMultisearchUrl) {
    const opggUrl = proposal.post.opggMultisearchUrl.startsWith('http')
      ? proposal.post.opggMultisearchUrl
      : `https://${proposal.post.opggMultisearchUrl}`;
    embed.addFields({
      name: 'Scouting',
      value: `[Open OP.GG multisearch](${opggUrl})`,
      inline: false,
    });
  }

  return embed;
}

async function sendScrimDiscordNotification(notification: ScrimDiscordNotification) {
  const markResult = await apiRequest(`/api/scrims/discord-notifications/${notification.id}/processed`, 'PATCH');
  if (!markResult.ok) {
    console.error(`❌ Failed to mark scrim notification ${notification.id} as processed, skipping to avoid duplicates`);
    return;
  }

  try {
    const user = await client.users.fetch(notification.recipientDiscordId);
    if (!user) {
      console.warn(`⚠️ Could not fetch Discord user ${notification.recipientDiscordId} for scrim notification`);
      return;
    }

    await user.send({
      embeds: [buildScrimNotificationEmbed(notification)],
      components: buildScrimNotificationComponents(notification),
    });

    console.log(`✅ Sent scrim Discord notification ${notification.id} to ${notification.recipientDiscordId}`);
  } catch (error: any) {
    if (error.code === 50007) {
      console.warn(`⚠️ Cannot DM ${notification.recipientDiscordId} for scrim notification (DMs disabled or no mutual server)`);
      return;
    }

    console.error(`❌ Failed to send scrim notification ${notification.id}:`, error.message);
  }
}

async function pollScrimDiscordNotifications() {
  try {
    const result = await apiRequest('/api/scrims/discord-notifications');
    if (!result.ok) {
      console.error('❌ Failed to poll scrim Discord notifications:', result.data.error);
      return;
    }

    const notifications = Array.isArray(result.data?.notifications)
      ? result.data.notifications
      : [];

    if (notifications.length === 0) return;

    console.log(`⚔️ Found ${notifications.length} pending scrim Discord notifications`);
    for (const notification of notifications as ScrimDiscordNotification[]) {
      await sendScrimDiscordNotification(notification);
    }
  } catch (error: any) {
    console.error('❌ Error polling scrim Discord notifications:', error.message);
  }
}

async function handleScrimProposalButton(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  if (!customId.startsWith('scrim_proposal_')) return false;

  const parts = customId.split('_');
  if (parts.length < 4) return false;

  const actionRaw = parts[2].toUpperCase();
  const proposalId = parts.slice(3).join('_');
  const action = actionRaw === 'ACCEPT'
    ? 'ACCEPT'
    : actionRaw === 'DELAY'
      ? 'DELAY'
      : actionRaw === 'REJECT'
        ? 'REJECT'
        : null;

  if (!action) {
    await interaction.reply({ content: '❌ Unknown scrim action.', ephemeral: interaction.inGuild() });
    return true;
  }

  await interaction.deferReply({ ephemeral: interaction.inGuild() });

  try {
    const result = await apiRequest(`/api/scrims/proposals/${proposalId}/discord-decision`, 'POST', {
      discordId: interaction.user.id,
      action,
    });

    if (!result.ok) {
      const errorMessage = result.data?.error || 'Failed to apply scrim decision.';
      if (errorMessage.includes('not linked')) {
        return interaction.editReply({
          content: `❌ Your Discord account is not linked to RiftEssence. Link it in ${APP_URL}/settings.`,
        });
      }

      return interaction.editReply({ content: `❌ ${errorMessage}` });
    }

    const label = action === 'ACCEPT' ? 'accepted' : action === 'DELAY' ? 'delayed' : 'rejected';

    try {
      await interaction.message.edit({ components: [] });
    } catch {
      // Ignore message edit failures and still acknowledge decision.
    }

    return interaction.editReply({ content: `✅ Proposal ${label}.` });
  } catch (error: any) {
    console.error('❌ Error handling scrim proposal button:', error.message);
    return interaction.editReply({ content: '❌ An unexpected error occurred. Please try again.' });
  }
}

// ============================================================
// Team Event Notifications
// ============================================================

const TEAM_EVENT_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_TEAM_EVENT_POLL_INTERVAL_MS || '15000', 10);
const TEAM_REMINDER_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_TEAM_REMINDER_POLL_INTERVAL_MS || '15000', 10);
const TEAM_CHANNEL_PING_COOLDOWN_MS = 60 * 60 * 1000;

const EVENT_TYPE_LABELS: Record<string, string> = {
  SCRIM: '⚔️ Scrim',
  PRACTICE: '📈 Practice',
  VOD_REVIEW: '🎥 VOD Review',
  TOURNAMENT: '🏆 Tournament',
  TEAM_MEETING: '👥 Team Meeting',
};

const EVENT_TYPE_COLORS: Record<string, number> = {
  SCRIM: 0x22C55E,      // Green
  PRACTICE: 0x3B82F6,   // Blue
  VOD_REVIEW: 0xF59E0B, // Amber
  TOURNAMENT: 0xEF4444, // Red
  TEAM_MEETING: 0x8B5CF6, // Purple
};

type TeamEventMember = {
  id: string;
  username: string;
  role: string;
  discordId: string | null;
  dmEnabled?: boolean;
};

type TeamEventAttendance = {
  userId: string;
  status: string;
};

type TeamEventDeliveryPayload = {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  webhookUrl: string | null;
  eventId: string;
  eventTitle: string;
  eventType: string;
  scheduledAt: string;
  duration: number | null;
  description: string | null;
  enemyLink: string | null;
  concernedMemberIds: string[];
  mentionMode: 'EVERYONE' | 'ROLE' | 'TEAM_ROLE_MAP' | string;
  mentionRoleId: string | null;
  roleMentions: Record<string, string>;
  pingRecurrenceEnabled: boolean;
  lastChannelPingAt: string | null;
  members: TeamEventMember[];
};

type TeamEventNotification = TeamEventDeliveryPayload & {
  id: string;
  notifyEnabled: boolean;
  notificationType: string;
  triggeredBy: string;
};

type TeamEventReminder = TeamEventDeliveryPayload & {
  id: string;
  reminderMinutes: number;
  remindAt: string;
  attendances?: TeamEventAttendance[];
};

type TeamAvailabilityReminder = {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  webhookUrl: string | null;
  weekStart: string;
  members: TeamEventMember[];
};

type ReminderAvailabilityBuckets = {
  present: TeamEventMember[];
  absent: TeamEventMember[];
  unsure: TeamEventMember[];
  noResponse: TeamEventMember[];
};

const TEAM_EVENT_WEBHOOK_REGEX = /discord(?:app)?\.com\/api\/webhooks\/([^/]+)\/([^/?]+)/i;
const teamLastChannelPingCache = new Map<string, number>();

function parseIsoDateToMs(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function syncTeamLastPingCache(teamId: string, lastChannelPingAt: string | null | undefined) {
  const parsed = parseIsoDateToMs(lastChannelPingAt);
  if (parsed === null) {
    return;
  }
  const existing = teamLastChannelPingCache.get(teamId) || 0;
  if (parsed > existing) {
    teamLastChannelPingCache.set(teamId, parsed);
  }
}

function resolveMentionForDispatch(
  notification: TeamEventDeliveryPayload,
  rawMentionContent: string,
): { content: string; mentionAllowed: boolean; throttled: boolean } {
  const mention = rawMentionContent.trim();
  if (!mention) {
    return { content: '', mentionAllowed: false, throttled: false };
  }

  syncTeamLastPingCache(notification.teamId, notification.lastChannelPingAt);

  if (notification.pingRecurrenceEnabled !== false) {
    return { content: mention, mentionAllowed: true, throttled: false };
  }

  const lastPingAt = teamLastChannelPingCache.get(notification.teamId);
  if (typeof lastPingAt === 'number' && Date.now() - lastPingAt < TEAM_CHANNEL_PING_COOLDOWN_MS) {
    return { content: '', mentionAllowed: false, throttled: true };
  }

  return { content: mention, mentionAllowed: true, throttled: false };
}

function recordChannelMentionDispatch(teamId: string) {
  teamLastChannelPingCache.set(teamId, Date.now());
}

function buildTeamEventEmbed(notification: TeamEventNotification, teamDisplay: string) {
  const scheduledDate = new Date(notification.scheduledAt);
  const typeLabel = EVENT_TYPE_LABELS[notification.eventType] || notification.eventType;
  const color = EVENT_TYPE_COLORS[notification.eventType] || 0xC8AA6E;

  const isScrimLifecycle = typeof notification.notificationType === 'string'
    && notification.notificationType.startsWith('SCRIM_');

  if (isScrimLifecycle) {
    const lifecycleColor: Record<string, number> = {
      SCRIM_SERIES_ACCEPTED: 0x2563EB,
      SCRIM_MATCH_CODE_REGENERATED: 0xF59E0B,
      SCRIM_RESULT_AUTO_CONFIRMED: 0x22C55E,
      SCRIM_RESULT_MANUAL_CONFIRMED: 0x14B8A6,
      SCRIM_RESULT_MANUAL_REQUIRED: 0xEF4444,
      SCRIM_RESULT_CONFLICT_ESCALATION: 0xDC2626,
    };

    const embed = new EmbedBuilder()
      .setTimestamp()
      .setColor(lifecycleColor[notification.notificationType] || 0x2563EB)
      .setTitle(notification.eventTitle || 'Scrim Lifecycle Update')
      .setDescription(notification.description || 'A scrim lifecycle update is available in Scrim Finder.')
      .addFields({
        name: '📅 Scheduled Start',
        value: scheduledDate.toLocaleString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        }),
        inline: false,
      })
      .setFooter({ text: `Scrim Lifecycle • ${teamDisplay}` });

    return embed;
  }

  const embed = new EmbedBuilder().setTimestamp();

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];
  fields.push({
    name: '📅 When',
    value: scheduledDate.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }),
    inline: true,
  });

  if (notification.duration) {
    fields.push({
      name: '⏱️ Duration',
      value: `${notification.duration} minutes`,
      inline: true,
    });
  }

  if (notification.description) {
    fields.push({
      name: '📝 Description',
      value: notification.description.substring(0, 200),
      inline: false,
    });
  }

  if (notification.enemyLink) {
    const linkUrl = notification.enemyLink.startsWith('http') ? notification.enemyLink : `https://${notification.enemyLink}`;
    fields.push({
      name: '🎯 Enemy Team',
      value: `[View Link](${linkUrl})`,
      inline: false,
    });
  }

  if (notification.notificationType === 'CREATED') {
    embed
      .setTitle(`${typeLabel}: ${notification.eventTitle}`)
      .setDescription(`New event scheduled for **${teamDisplay}**`)
      .setColor(color);
  } else if (notification.notificationType === 'UPDATED') {
    embed
      .setTitle(`📝 Event Updated: ${notification.eventTitle}`)
      .setDescription(`**${teamDisplay}** - ${typeLabel}`)
      .setColor(0xF59E0B);
  } else if (notification.notificationType === 'DELETED') {
    embed
      .setTitle(`🗑️ Event Cancelled: ${notification.eventTitle}`)
      .setDescription(`**${teamDisplay}** - ${typeLabel}`)
      .setColor(0xEF4444);
    fields.splice(0);
    fields.push({
      name: '📅 Was Scheduled For',
      value: scheduledDate.toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      inline: true,
    });
  }

  embed.addFields(fields);
  embed.setFooter({
    text: `${notification.notificationType === 'DELETED' ? 'Cancelled' : notification.notificationType === 'UPDATED' ? 'Updated' : 'Created'} by ${notification.triggeredBy} • ${teamDisplay}`,
  });

  return embed;
}

function normalizeRoleId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const mentionMatch = trimmed.match(/^<@&(\d+)>$/);
  const roleId = mentionMatch ? mentionMatch[1] : trimmed;
  return /^\d{6,30}$/.test(roleId) ? roleId : null;
}

function getConcernedMembers(notification: TeamEventDeliveryPayload) {
  const explicitConcerned = Array.isArray(notification.concernedMemberIds)
    ? notification.concernedMemberIds.filter((id) => typeof id === 'string' && id.length > 0)
    : [];

  if (explicitConcerned.length === 0) {
    return notification.members;
  }

  const idSet = new Set(explicitConcerned);
  return notification.members.filter((member) => idSet.has(member.id));
}

function normalizeAttendanceStatus(raw: string | null | undefined): 'PRESENT' | 'ABSENT' | 'UNSURE' | null {
  if (!raw || typeof raw !== 'string') return null;
  const normalized = raw.toUpperCase();
  if (normalized === 'PRESENT' || normalized === 'ABSENT' || normalized === 'UNSURE') {
    return normalized;
  }
  return null;
}

function summarizeReminderAvailability(
  reminder: TeamEventReminder,
  concernedMembers: TeamEventMember[]
): ReminderAvailabilityBuckets {
  const statusByUserId = new Map<string, 'PRESENT' | 'ABSENT' | 'UNSURE'>();

  if (Array.isArray(reminder.attendances)) {
    for (const attendance of reminder.attendances) {
      const status = normalizeAttendanceStatus(attendance?.status);
      if (!status || !attendance?.userId) continue;
      statusByUserId.set(attendance.userId, status);
    }
  }

  const buckets: ReminderAvailabilityBuckets = {
    present: [],
    absent: [],
    unsure: [],
    noResponse: [],
  };

  for (const member of concernedMembers) {
    const status = statusByUserId.get(member.id);
    if (status === 'PRESENT') {
      buckets.present.push(member);
    } else if (status === 'ABSENT') {
      buckets.absent.push(member);
    } else if (status === 'UNSURE') {
      buckets.unsure.push(member);
    } else {
      buckets.noResponse.push(member);
    }
  }

  return buckets;
}

function formatAvailabilityNames(members: TeamEventMember[], maxShown = 20): string {
  if (!members.length) {
    return 'None';
  }

  const names = members
    .map((member) => member.username)
    .filter((name) => typeof name === 'string' && name.trim().length > 0);

  if (names.length <= maxShown) {
    return names.join(', ');
  }

  const remaining = names.length - maxShown;
  return `${names.slice(0, maxShown).join(', ')}, +${remaining} more`;
}

function buildReminderDmPrompt(member: TeamEventMember, availability: ReminderAvailabilityBuckets): string | null {
  if (availability.noResponse.some((entry) => entry.id === member.id)) {
    return 'You have not responded to this event yet. Please tap Present, Absent, or Unsure below.';
  }

  return null;
}

function buildMentionContent(
  notification: TeamEventDeliveryPayload,
  concernedMembers: TeamEventMember[]
): string {
  const mode = (notification.mentionMode || 'EVERYONE').toUpperCase();

  if (mode === 'ROLE') {
    const roleId = normalizeRoleId(notification.mentionRoleId);
    return roleId ? `<@&${roleId}>` : '';
  }

  if (mode === 'TEAM_ROLE_MAP') {
    const map = notification.roleMentions && typeof notification.roleMentions === 'object'
      ? notification.roleMentions
      : {};
    const roleMentions = new Set<string>();

    for (const member of concernedMembers) {
      const mappedRoleId = normalizeRoleId(map[member.role]);
      if (mappedRoleId) {
        roleMentions.add(`<@&${mappedRoleId}>`);
      }
    }

    return Array.from(roleMentions).join(' ');
  }

  // Default behavior: ping everyone in the configured channel
  return '@everyone';
}

function formatReminderLead(reminderMinutes: number): string {
  const safeMinutes = Math.max(1, Math.floor(reminderMinutes));
  if (safeMinutes < 60) {
    return `${safeMinutes} minute${safeMinutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function buildTeamEventReminderEmbed(
  reminder: TeamEventReminder,
  teamDisplay: string,
  availability: ReminderAvailabilityBuckets
) {
  const scheduledDate = new Date(reminder.scheduledAt);
  const typeLabel = EVENT_TYPE_LABELS[reminder.eventType] || reminder.eventType;
  const color = EVENT_TYPE_COLORS[reminder.eventType] || 0xC8AA6E;
  const leadTime = formatReminderLead(reminder.reminderMinutes);

  const embed = new EmbedBuilder()
    .setTitle(`⏰ Reminder: ${reminder.eventTitle}`)
    .setDescription(`**${teamDisplay}** - ${typeLabel}`)
    .setColor(color)
    .setTimestamp();

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];
  fields.push({
    name: '⏳ Starts In',
    value: leadTime,
    inline: true,
  });

  fields.push({
    name: '📅 Starts At',
    value: scheduledDate.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }),
    inline: true,
  });

  if (reminder.duration) {
    fields.push({
      name: '⏱️ Duration',
      value: `${reminder.duration} minutes`,
      inline: true,
    });
  }

  if (reminder.description) {
    fields.push({
      name: '📝 Description',
      value: reminder.description.substring(0, 200),
      inline: false,
    });
  }

  if (reminder.enemyLink) {
    const linkUrl = reminder.enemyLink.startsWith('http') ? reminder.enemyLink : `https://${reminder.enemyLink}`;
    fields.push({
      name: '🎯 Enemy Team',
      value: `[View Link](${linkUrl})`,
      inline: false,
    });
  }

  fields.push({
    name: '✅ Present',
    value: formatAvailabilityNames(availability.present),
    inline: false,
  });

  fields.push({
    name: '❌ Absent',
    value: formatAvailabilityNames(availability.absent),
    inline: false,
  });

  fields.push({
    name: '❓ Unsure',
    value: formatAvailabilityNames(availability.unsure),
    inline: false,
  });

  fields.push({
    name: '⏳ No Response',
    value: formatAvailabilityNames(availability.noResponse),
    inline: false,
  });

  embed.addFields(fields);
  embed.setFooter({ text: `Reminder sent ${leadTime} before start • ${teamDisplay}` });
  return embed;
}

function buildTeamEventActionComponents(teamId: string, eventId: string): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`team_event_present_${eventId}`)
      .setLabel('✅ Present')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`team_event_absent_${eventId}`)
      .setLabel('❌ Absent')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`team_event_unsure_${eventId}`)
      .setLabel('❓ Unsure')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('View on RiftEssence')
      .setStyle(ButtonStyle.Link)
      .setURL(`${APP_URL}/teams/${teamId}`)
  );

  return [row];
}

function buildTeamEventComponents(notification: TeamEventNotification): ActionRowBuilder<ButtonBuilder>[] {
  if (typeof notification.notificationType === 'string' && notification.notificationType.startsWith('SCRIM_')) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Open Scrim Finder')
        .setStyle(ButtonStyle.Link)
        .setURL(`${APP_URL}/teams/scrims`)
    );
    return [row];
  }

  if (notification.notificationType === 'DELETED') {
    return [];
  }

  return buildTeamEventActionComponents(notification.teamId, notification.eventId);
}

async function sendTeamEventChannelNotification(
  notification: TeamEventDeliveryPayload,
  content: string,
  embed: EmbedBuilder,
  components: ActionRowBuilder<ButtonBuilder>[]
): Promise<{ sent: boolean; messageId?: string }> {
  if (!notification.webhookUrl) {
    return { sent: false };
  }

  const parsedWebhook = notification.webhookUrl.match(TEAM_EVENT_WEBHOOK_REGEX);
  if (parsedWebhook) {
    const webhookId = parsedWebhook[1];
    const webhookToken = parsedWebhook[2];

    try {
      const webhook = await client.fetchWebhook(webhookId, webhookToken);
      if (webhook.channelId) {
        const channel = await client.channels.fetch(webhook.channelId);
        if (channel && channel.isTextBased()) {
          const message = await (channel as TextChannel).send({
            content: content || undefined,
            embeds: [embed],
            components,
          });
          console.log(`✅ Sent team event notification to channel ${webhook.channelId} for "${notification.eventTitle}"`);
          return { sent: true, messageId: message.id };
        }
      }
      console.warn(`⚠️ Could not resolve text channel from webhook for team ${notification.teamName}, falling back to raw webhook send`);
    } catch (error: any) {
      console.warn(`⚠️ Bot channel send failed for team ${notification.teamName}, falling back to webhook send: ${error.message}`);
    }
  }

  try {
    const webhookUrlWithWait = notification.webhookUrl.includes('?')
      ? `${notification.webhookUrl}&wait=true`
      : `${notification.webhookUrl}?wait=true`;

    const response = await fetch(webhookUrlWithWait, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content || undefined,
        embeds: [embed.toJSON()],
        components: components.map((c) => c.toJSON()),
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'No response body');
      console.error(`❌ Failed team event webhook send (${response.status}): ${text}`);
      return { sent: false };
    }

    const body: any = await response.json().catch(() => null);
    console.log(`✅ Sent team event notification via webhook for "${notification.eventTitle}"`);
    return { sent: true, messageId: body?.id };
  } catch (error: any) {
    console.error(`❌ Error sending team event notification via webhook: ${error.message}`);
    return { sent: false };
  }
}

async function sendTeamEventDmNotification(
  member: TeamEventMember,
  notification: { eventTitle: string },
  embed: EmbedBuilder,
  components: ActionRowBuilder<ButtonBuilder>[],
  dmPrompt?: string | null
): Promise<boolean> {
  if (!member.discordId || !member.dmEnabled) {
    return false;
  }

  try {
    const user = await client.users.fetch(member.discordId);
    if (!user) {
      console.warn(`⚠️ Could not fetch Discord user ${member.discordId} for team event DM`);
      return false;
    }

    await user.send({
      content: dmPrompt || undefined,
      embeds: [embed],
      components,
    });

    console.log(`✅ Sent team event DM to ${member.username} (${member.discordId}) for "${notification.eventTitle}"`);
    return true;
  } catch (error: any) {
    if (error.code === 50007) {
      console.warn(`⚠️ Cannot DM ${member.username} (${member.discordId}) - DMs disabled or no mutual server`);
      return false;
    }
    console.error(`❌ Failed team event DM to ${member.username} (${member.discordId}): ${error.message}`);
    return false;
  }
}

async function pollTeamEventNotifications() {
  try {
    const result = await apiRequest('/api/discord/team-events');
    if (!result.ok) {
      console.error('❌ Failed to poll team event notifications:', result.data.error);
      return;
    }

    const notifications = Array.isArray(result.data?.notifications) ? result.data.notifications : [];
    if (notifications.length === 0) return;

    console.log(`📅 Found ${notifications.length} pending team event notifications`);

    for (const notification of notifications) {
      await sendTeamEventNotification(notification);
    }
  } catch (error: any) {
    console.error('❌ Error polling team event notifications:', error.message);
  }
}

async function pollTeamEventReminders() {
  try {
    const result = await apiRequest('/api/discord/team-event-reminders');
    if (!result.ok) {
      console.error('❌ Failed to poll team event reminders:', result.data.error);
      return;
    }

    const reminders = Array.isArray(result.data?.reminders) ? result.data.reminders : [];
    if (reminders.length === 0) return;

    console.log(`⏰ Found ${reminders.length} due team event reminders`);

    for (const reminder of reminders) {
      await sendTeamEventReminder(reminder);
    }
  } catch (error: any) {
    console.error('❌ Error polling team event reminders:', error.message);
  }
}

async function sendTeamEventNotification(notification: TeamEventNotification) {
  if (!notification.notifyEnabled) {
    const markSkipped = await apiRequest(`/api/discord/team-events/${notification.id}/processed`, 'PATCH');
    if (!markSkipped.ok) {
      console.error(`❌ Failed to mark skipped team notification ${notification.id} as processed`);
    }
    console.log(`⏭️ Skipping team notification ${notification.id} (notifications disabled)`);
    return;
  }

  const teamDisplay = notification.teamTag ? `[${notification.teamTag}] ${notification.teamName}` : notification.teamName;
  const embed = buildTeamEventEmbed(notification, teamDisplay);
  const components = buildTeamEventComponents(notification);
  const concernedMembers = getConcernedMembers(notification);
  const mentionContent = buildMentionContent(notification, concernedMembers);
  const mentionDispatch = resolveMentionForDispatch(notification, mentionContent);

  if (notification.concernedMemberIds?.length > 0 && concernedMembers.length === 0) {
    console.warn(`⚠️ Team event ${notification.eventId} has explicit concernedMemberIds but no matching active members`);
  }

  if (mentionDispatch.throttled) {
    console.log(`🔕 Team ${notification.teamName} mention throttled (ping recurrence disabled, last ping < 1h)`);
  }

  let channelSent = false;
  let channelMentionSent = false;
  let channelMessageId: string | undefined;
  if (notification.webhookUrl) {
    const channelResult = await sendTeamEventChannelNotification(notification, mentionDispatch.content, embed, components);
    channelSent = channelResult.sent;
    channelMessageId = channelResult.messageId;
    if (channelSent && mentionDispatch.mentionAllowed) {
      channelMentionSent = true;
      recordChannelMentionDispatch(notification.teamId);
    }
  } else {
    console.log(`ℹ️ Team ${notification.teamName} has no channel webhook configured; DM-only delivery path will be used`);
  }

  if (channelMessageId && (notification.notificationType === 'CREATED' || notification.notificationType === 'UPDATED')) {
    const storeResult = await apiRequest(`/api/discord/team-events/${notification.eventId}/message`, 'PATCH', { messageId: channelMessageId });
    if (!storeResult.ok) {
      console.warn(`⚠️ Could not persist Discord message ID ${channelMessageId} for event ${notification.eventId}`);
    }
  }

  const dmTargets = concernedMembers.filter((member) => Boolean(member.discordId && member.dmEnabled));
  let dmSentCount = 0;

  for (const member of dmTargets) {
    const sent = await sendTeamEventDmNotification(member, notification, embed, components);
    if (sent) {
      dmSentCount += 1;
    }
  }

  if (dmTargets.length === 0) {
    console.log(`ℹ️ No eligible DM recipients for team ${notification.teamName} (concerned + linked + opted-in)`);
  }

  if (!channelSent && dmSentCount === 0) {
    console.warn(`⚠️ Team event notification ${notification.id} had no successful deliveries`);
  }

  const markResult = await apiRequest(
    `/api/discord/team-events/${notification.id}/processed`,
    'PATCH',
    channelMentionSent ? { recordPing: true } : undefined
  );
  if (!markResult.ok) {
    console.error(`❌ Failed to mark team notification ${notification.id} as processed after delivery attempts`);
    return;
  }

  console.log(
    `✅ Processed team notification ${notification.id} (channelSent=${channelSent}, channelMention=${channelMentionSent}, dmSent=${dmSentCount}/${dmTargets.length})`
  );
}

async function sendTeamEventReminder(reminder: TeamEventReminder) {
  const teamDisplay = reminder.teamTag ? `[${reminder.teamTag}] ${reminder.teamName}` : reminder.teamName;
  const concernedMembers = getConcernedMembers(reminder);
  const availability = summarizeReminderAvailability(reminder, concernedMembers);
  const embed = buildTeamEventReminderEmbed(reminder, teamDisplay, availability);
  const components = buildTeamEventActionComponents(reminder.teamId, reminder.eventId);
  const mentionContent = buildMentionContent(reminder, concernedMembers);
  const mentionDispatch = resolveMentionForDispatch(reminder, mentionContent);

  if (reminder.concernedMemberIds?.length > 0 && concernedMembers.length === 0) {
    console.warn(`⚠️ Team event reminder ${reminder.id} has explicit concernedMemberIds but no matching active members`);
  }

  if (mentionDispatch.throttled) {
    console.log(`🔕 Team ${reminder.teamName} reminder mention throttled (ping recurrence disabled, last ping < 1h)`);
  }

  let channelSent = false;
  let channelMentionSent = false;
  if (reminder.webhookUrl) {
    const channelResult = await sendTeamEventChannelNotification(reminder, mentionDispatch.content, embed, components);
    channelSent = channelResult.sent;
    if (channelSent && mentionDispatch.mentionAllowed) {
      channelMentionSent = true;
      recordChannelMentionDispatch(reminder.teamId);
    }
  } else {
    console.log(`ℹ️ Team ${reminder.teamName} has no channel webhook configured; reminder DM-only delivery path will be used`);
  }

  const dmTargets = concernedMembers.filter((member) => Boolean(member.discordId && member.dmEnabled));
  let dmSentCount = 0;

  for (const member of dmTargets) {
    const dmPrompt = buildReminderDmPrompt(member, availability);
    const sent = await sendTeamEventDmNotification(member, reminder, embed, components, dmPrompt);
    if (sent) {
      dmSentCount += 1;
    }
  }

  if (dmTargets.length === 0) {
    console.log(`ℹ️ No eligible reminder DM recipients for team ${reminder.teamName} (concerned + linked + opted-in)`);
  }

  if (!channelSent && dmSentCount === 0) {
    console.warn(`⚠️ Team event reminder ${reminder.id} had no successful deliveries`);
  }

  const markResult = await apiRequest(
    `/api/discord/team-event-reminders/${reminder.id}/processed`,
    'PATCH',
    channelMentionSent ? { recordPing: true } : undefined
  );

  if (!markResult.ok) {
    console.error(`❌ Failed to mark reminder ${reminder.id} as processed after delivery attempts`);
    return;
  }

  console.log(
    `✅ Processed team reminder ${reminder.id} (channelSent=${channelSent}, channelMention=${channelMentionSent}, dmSent=${dmSentCount}/${dmTargets.length})`
  );
}

function formatAvailabilityWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  if (Number.isNaN(start.getTime())) return 'next week';
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function buildTeamAvailabilityCustomId(scope: 'week' | 'weekend', teamId: string, weekStart: string) {
  const datePart = new Date(weekStart).toISOString().slice(0, 10);
  return `${TEAM_AVAILABILITY_BUTTON_PREFIX}${scope}_${teamId}_${datePart}`;
}

function parseTeamAvailabilityCustomId(customId: string, prefix: string): { scope: 'week' | 'weekend'; teamId: string; weekStart: string } | null {
  if (!customId.startsWith(prefix)) return null;
  const parts = customId.slice(prefix.length).split('_');
  if (parts.length < 3) return null;
  const scope = parts[0] as 'week' | 'weekend';
  if (!TEAM_AVAILABILITY_SCOPES.includes(scope)) return null;
  return { scope, teamId: parts[1], weekStart: parts.slice(2).join('_') };
}

function buildTeamAvailabilityComponents(reminder: TeamAvailabilityReminder): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(buildTeamAvailabilityCustomId('week', reminder.teamId, reminder.weekStart)).setLabel('Set week availability').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(buildTeamAvailabilityCustomId('weekend', reminder.teamId, reminder.weekStart)).setLabel('Set weekend availability').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setLabel('Open full planner').setStyle(ButtonStyle.Link).setURL(`${APP_URL}/teams/schedule`)
  );
  return [row];
}

function buildTeamAvailabilityEmbed(reminder: TeamAvailabilityReminder) {
  const teamDisplay = reminder.teamTag ? `[${reminder.teamTag}] ${reminder.teamName}` : reminder.teamName;
  return new EmbedBuilder()
    .setTitle('Fill your team availability')
    .setDescription(`Help **${teamDisplay}** choose better event times for **${formatAvailabilityWeekLabel(reminder.weekStart)}**.`)
    .setColor(0x5865F2)
    .addFields(
      { name: 'Discord shortcut', value: 'Use the buttons below to fill weekdays or weekend without leaving Discord.', inline: false },
      { name: 'Recommended format', value: '`18h30 - 23h`, `11AM - 5PM`, or `13h20 - 14h30, 18h30 - 23h`', inline: false },
      { name: 'Full interface', value: `[Open the weekly planner](${APP_URL}/teams/schedule) for the easier visual view.`, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'RiftEssence Team Availability' });
}

function buildTeamAvailabilityModal(scope: 'week' | 'weekend', teamId: string, weekStart: string) {
  const days = scope === 'week'
    ? [{ index: 0, label: 'Monday' }, { index: 1, label: 'Tuesday' }, { index: 2, label: 'Wednesday' }, { index: 3, label: 'Thursday' }, { index: 4, label: 'Friday' }]
    : [{ index: 5, label: 'Saturday' }, { index: 6, label: 'Sunday' }];

  const modal = new ModalBuilder()
    .setCustomId(`${TEAM_AVAILABILITY_MODAL_PREFIX}${scope}_${teamId}_${weekStart}`)
    .setTitle(scope === 'week' ? 'Week availability' : 'Weekend availability');

  modal.addComponents(...days.map((day) => new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId(`${TEAM_AVAILABILITY_DAY_INPUT_PREFIX}${day.index}`)
      .setLabel(day.label)
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(240)
      .setPlaceholder(day.index < 5 ? '18h30 - 23h' : '11AM - 5PM, 20h - 23h')
  )));

  return modal;
}

async function sendTeamAvailabilityReminder(reminder: TeamAvailabilityReminder) {
  const embed = buildTeamAvailabilityEmbed(reminder);
  const components = buildTeamAvailabilityComponents(reminder);
  let channelSent = false;
  let dmSentCount = 0;

  if (reminder.webhookUrl) {
    const result = await sendTeamEventChannelNotification({
      ...reminder,
      eventId: `availability-${reminder.teamId}`,
      eventTitle: 'Fill team availability',
      eventType: 'TEAM_MEETING',
      scheduledAt: reminder.weekStart,
      duration: null,
      description: null,
      enemyLink: null,
      concernedMemberIds: [],
      mentionMode: 'EVERYONE',
      mentionRoleId: null,
      roleMentions: {},
      pingRecurrenceEnabled: false,
      lastChannelPingAt: null,
    }, '', embed, components);
    channelSent = result.sent;
  }

  const dmTargets = reminder.members.filter((member) => Boolean(member.discordId && member.dmEnabled));
  for (const member of dmTargets) {
    const sent = await sendTeamEventDmNotification(
      member,
      { eventTitle: 'Fill team availability' },
      embed,
      components,
      'This Discord modal is a quick shortcut. The full weekly planner is easier to use on RiftEssence.'
    );
    if (sent) dmSentCount += 1;
  }

  const markResult = await apiRequest(`/api/teams/discord-availability-reminders/${reminder.teamId}/processed`, 'PATCH');
  if (!markResult.ok) {
    console.error(`Failed to mark availability reminder for team ${reminder.teamName} as processed`);
    return;
  }

  console.log(`Processed availability reminder for ${reminder.teamName} (channelSent=${channelSent}, dmSent=${dmSentCount}/${dmTargets.length})`);
}

async function pollTeamAvailabilityReminders() {
  try {
    const result = await apiRequest('/api/teams/discord-availability-reminders');
    if (!result.ok) {
      console.error('Failed to poll team availability reminders:', result.data.error);
      return;
    }

    const reminders = Array.isArray(result.data?.reminders) ? result.data.reminders : [];
    if (reminders.length === 0) return;

    console.log(`Found ${reminders.length} due team availability reminders`);
    for (const reminder of reminders) {
      await sendTeamAvailabilityReminder(reminder);
    }
  } catch (error: any) {
    console.error('Error polling team availability reminders:', error.message);
  }
}

async function handleTeamAvailabilityButton(interaction: ButtonInteraction) {
  const parsed = parseTeamAvailabilityCustomId(interaction.customId, TEAM_AVAILABILITY_BUTTON_PREFIX);
  if (!parsed) return false;
  return interaction.showModal(buildTeamAvailabilityModal(parsed.scope, parsed.teamId, parsed.weekStart));
}

async function handleTeamAvailabilityModalSubmit(interaction: ModalSubmitInteraction) {
  const parsed = parseTeamAvailabilityCustomId(interaction.customId, TEAM_AVAILABILITY_MODAL_PREFIX);
  if (!parsed) return false;

  await interaction.deferReply({ ephemeral: interaction.inGuild() });

  const dayIndexes = parsed.scope === 'week' ? [0, 1, 2, 3, 4] : [5, 6];
  const days = dayIndexes.map((dayOfWeek) => ({
    dayOfWeek,
    rawText: interaction.fields.getTextInputValue(`${TEAM_AVAILABILITY_DAY_INPUT_PREFIX}${dayOfWeek}`) || '',
  }));

  const result = await apiRequest('/api/teams/discord-availability', 'POST', {
    discordId: interaction.user.id,
    teamId: parsed.teamId,
    weekStart: parsed.weekStart,
    days,
  });

  if (!result.ok) {
    return interaction.editReply({ content: `Error: ${result.data?.error || 'Failed to save availability. Try the full planner on RiftEssence.'}` });
  }

  return interaction.editReply({ content: `Availability saved for ${formatAvailabilityWeekLabel(parsed.weekStart)}. You can refine it anytime here: ${APP_URL}/teams/schedule` });
}

// Handle team event attendance button clicks
async function handleTeamEventButton(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  if (!customId.startsWith('team_event_')) return false;

  const parts = customId.split('_');
  if (parts.length < 4) return false;

  const status = parts[2].toUpperCase(); // present, absent, unsure
  const eventId = parts.slice(3).join('_');

  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: interaction.inGuild() });

  try {
    const result = await apiRequest(`/api/discord/team-events/${eventId}/attendance`, 'POST', {
      discordId,
      status: status === 'PRESENT' ? 'PRESENT' : status === 'ABSENT' ? 'ABSENT' : 'UNSURE',
    });

    if (!result.ok) {
      const errorMsg = result.data.error || 'Failed to update attendance';
      
      if (errorMsg === 'User not linked to Discord') {
        return interaction.editReply({
          content: `❌ Your Discord account is not linked to RiftEssence. Please link it in your [settings](${APP_URL}/settings).`,
        });
      }
      if (errorMsg === 'Not a team member') {
        return interaction.editReply({
          content: '❌ You are not a member of this team.',
        });
      }
      if (errorMsg === 'Not concerned by this event') {
        return interaction.editReply({
          content: '❌ You are not targeted by this event notification.',
        });
      }
      
      return interaction.editReply({ content: `❌ ${errorMsg}` });
    }

    const statusEmoji = status === 'PRESENT' ? '✅' : status === 'ABSENT' ? '❌' : '❓';
    const statusText = status === 'PRESENT' ? 'Present' : status === 'ABSENT' ? 'Absent' : 'Unsure';
    
    return interaction.editReply({
      content: `${statusEmoji} Your attendance has been updated to **${statusText}**!`,
    });
  } catch (error: any) {
    console.error('❌ Error handling team event button:', error.message);
    return interaction.editReply({ content: '❌ An error occurred. Please try again later.' });
  }
}

// ============================================================
// Bot Events
// ============================================================

function startGuardedPollLoop(name: string, pollFn: () => Promise<void>, intervalMs: number, initialDelayMs: number) {
  let running = false;
  const safeIntervalMs = Math.max(5000, intervalMs);
  const safeInitialDelayMs = Math.max(0, initialDelayMs);

  const tick = async () => {
    if (running) {
      console.warn(`⏭️ Skipping ${name} poll tick because a previous run is still in progress`);
      return;
    }

    running = true;
    try {
      await pollFn();
    } catch (error: any) {
      console.error(`❌ Unhandled error in ${name} poll loop:`, error?.message || error);
    } finally {
      running = false;
    }
  };

  setTimeout(() => {
    void tick();
    setInterval(() => {
      void tick();
    }, safeIntervalMs);
  }, safeInitialDelayMs);
}

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot logged in as ${c.user.tag}`);
  client.user?.setActivity('RiftEssence | /setup', { type: ActivityType.Playing });

  // Load shared emoji fallback map (source guild), used when target guild lacks custom emojis.
  await refreshGlobalEmojiFallbackMap();

  // Register slash commands
  const guildIds = client.guilds.cache.map(g => g.id);
  await registerCommands(c.user.id, guildIds);

  // Start polling for outgoing duo posts
  console.log(`🔄 Starting duo post poll (interval: ${POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('duo post', pollOutgoingPosts, POLL_INTERVAL_MS, 1500);

  // Start polling for outgoing LFT posts
  const LFT_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_LFT_POLL_INTERVAL_MS || '30000', 10);
  console.log(`🔄 Starting LFT post poll (interval: ${LFT_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('LFT post', pollOutgoingLftPosts, LFT_POLL_INTERVAL_MS, 6500);

  // Start polling for outgoing Scrim Finder posts
  const SCRIM_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_SCRIM_POLL_INTERVAL_MS || '30000', 10);
  console.log(`🔄 Starting SCRIM post poll (interval: ${SCRIM_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('SCRIM post', pollOutgoingScrimPosts, SCRIM_POLL_INTERVAL_MS, 9000);

  // Start polling for mirrored message deletions triggered by app-side deletes
  console.log(`🧹 Starting mirror deletion poll (interval: ${MIRROR_DELETION_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('mirror deletion', pollMirrorDeletions, MIRROR_DELETION_POLL_INTERVAL_MS, 10500);

  // Start polling for DM notifications
  console.log(`📨 Starting DM notification poll (interval: ${DM_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('DM queue', pollDmQueue, DM_POLL_INTERVAL_MS, 12000);

  // Start polling for scrim-specific Discord notifications with decision buttons
  console.log(`⚔️ Starting scrim notification poll (interval: ${SCRIM_NOTIFICATION_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('scrim notification', pollScrimDiscordNotifications, SCRIM_NOTIFICATION_POLL_INTERVAL_MS, 14500);

  // Start polling for team event notifications
  console.log(`📅 Starting team event poll (interval: ${TEAM_EVENT_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('team event', pollTeamEventNotifications, TEAM_EVENT_POLL_INTERVAL_MS, 18000);

  // Start polling for team event reminders
  console.log(`⏰ Starting team reminder poll (interval: ${TEAM_REMINDER_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('team reminder', pollTeamEventReminders, TEAM_REMINDER_POLL_INTERVAL_MS, 21000);
  console.log(`Starting team availability reminder poll (interval: ${TEAM_AVAILABILITY_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('team availability reminder', pollTeamAvailabilityReminders, TEAM_AVAILABILITY_POLL_INTERVAL_MS, 22500);

  // Start polling for Discord role forwarding sync
  console.log(`🏷️ Starting role forwarding sync poll (interval: ${ROLE_FORWARDING_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('role forwarding sync', pollRoleForwardingSync, ROLE_FORWARDING_POLL_INTERVAL_MS, 24000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    if (commandName === 'linkserver') {
      await handleLinkServer(interaction);
    } else if (commandName === 'setup') {
      await handleSetup(interaction);
    } else if (commandName === 'rolemenu') {
      await handleRoleMenu(interaction);
    } else if (commandName === 'send-draft') {
      await handleSendDraft(interaction);
    } else if (commandName === 'duo') {
      await handleDuoPost(interaction);
    } else if (commandName === 'create-team-event') {
      await handleCreateTeamEvent(interaction);
    } else if (commandName === 'import-league-icons' || commandName === 'import-champion-emojis') {
      await handleImportChampionEmojis(interaction);
    }
    return;
  }

  // Button interactions (setup flow + team events)
  if (interaction.isButton()) {
    if (interaction.customId.startsWith(TEAM_AVAILABILITY_BUTTON_PREFIX)) {
      await handleTeamAvailabilityButton(interaction as ButtonInteraction);
      return;
    }

    // Team event attendance buttons are public (anyone can respond)
    if (interaction.customId.startsWith('team_event_')) {
      await handleTeamEventButton(interaction as ButtonInteraction);
      return;
    }

    // Scrim proposal decision buttons are public to eligible recipients.
    if (interaction.customId.startsWith('scrim_proposal_')) {
      await handleScrimProposalButton(interaction as ButtonInteraction);
      return;
    }

    // Chat reply buttons are private DM interactions and do not require admin rights.
    if (interaction.customId.startsWith(CHAT_REPLY_BUTTON_PREFIX)) {
      await handleChatReplyButton(interaction as ButtonInteraction);
      return;
    }

    if (interaction.customId === DUO_POST_MODAL_BUTTON) {
      const ok = await ensureDuoCommunity(interaction as ButtonInteraction);
      if (!ok) return;
      return interaction.showModal(buildDuoPostModal());
    }
    
    // Only allow administrators for setup buttons
    const member = interaction.member as any;
    if (!member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only administrators can configure bot settings.', ephemeral: true });
    }
    await handleButtonInteraction(interaction as ButtonInteraction);
    return;
  }

  // Select menu interactions (filter menus)
  if (interaction.isStringSelectMenu()) {
    const member = interaction.member as any;
    const isSendDraftMenu = interaction.customId === SEND_DRAFT_TEAM_SELECT || interaction.customId === SEND_DRAFT_PICK_SELECT;
    const isTeamEventMenu = interaction.customId === TEAM_EVENT_TEAM_SELECT || interaction.customId === TEAM_EVENT_TYPE_SELECT;

    if (isSendDraftMenu) {
      if (!hasSendDraftPermission(member)) {
        return interaction.reply({ content: '❌ You need **Manage Server** or **Administrator** permission to send drafts.', ephemeral: true });
      }
      await handleSelectMenuInteraction(interaction as StringSelectMenuInteraction);
      return;
    }

    if (isTeamEventMenu) {
      await handleTeamEventSelectMenu(interaction as StringSelectMenuInteraction);
      return;
    }

    if (!member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only administrators can configure bot settings.', ephemeral: true });
    }
    await handleSelectMenuInteraction(interaction as StringSelectMenuInteraction);
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith(CHAT_REPLY_MODAL_PREFIX)) {
      await handleChatReplyModalSubmit(interaction as ModalSubmitInteraction);
    } else if (interaction.customId === DUO_POST_MODAL) {
      await handleDuoPostModalSubmit(interaction as ModalSubmitInteraction);
    } else if (interaction.customId === TEAM_EVENT_MODAL) {
      await handleTeamEventModalSubmit(interaction as ModalSubmitInteraction);
    } else if (interaction.customId.startsWith(TEAM_AVAILABILITY_MODAL_PREFIX)) {
      await handleTeamAvailabilityModalSubmit(interaction as ModalSubmitInteraction);
    }
    return;
  }
});

// When the bot joins a new guild, ensure commands are registered there
client.on(Events.GuildCreate, async (guild) => {
  const clientId = client.user?.id;
  if (!clientId) return;
  await registerCommands(clientId, [guild.id]);
});

client.on(Events.MessageCreate, async (message) => {
  await ingestDiscordMessage(message);
});

// ============================================================
// Start Bot
// ============================================================

client.login(DISCORD_BOT_TOKEN);
