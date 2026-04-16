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

const ROLE_FORWARDING_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_ROLE_FORWARDING_POLL_INTERVAL_MS || '300000', 10);

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

function formatEmojiMention(emoji: { id: string; name: string | null; animated?: boolean | null }): string | null {
  if (!emoji.name) return null;
  return `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
}

async function refreshGlobalEmojiFallbackMap() {
  globalEmojiFallbackMap.clear();

  try {
    const sourceGuild = await client.guilds.fetch(EMOJI_SOURCE_GUILD_ID);
    await sourceGuild.emojis.fetch();

    for (const emoji of sourceGuild.emojis.cache.values()) {
      const mention = formatEmojiMention(emoji);
      if (!emoji.name || !mention) continue;
      globalEmojiFallbackMap.set(emoji.name.toLowerCase(), mention);
    }

    console.log(`😀 Loaded ${globalEmojiFallbackMap.size} shared emojis from source guild ${EMOJI_SOURCE_GUILD_ID}`);
  } catch (error: any) {
    console.warn(
      `⚠️ Could not load shared emojis from source guild ${EMOJI_SOURCE_GUILD_ID}: ${error?.message || error}`
    );
  }
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

function resolveEmoji(guild: Guild | null | undefined, preferredName: string | undefined, fallback: string): string {
  if (!preferredName) return fallback;
  return findCustomEmoji(guild, preferredName) || fallback;
}

function truncateForDiscord(text: string | null | undefined, maxLen = 260): string {
  const normalized = (text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 3)}...`;
}

function normalizeRankTier(rank: string | null | undefined): string | null {
  if (!rank) return null;
  const tier = rank.trim().toUpperCase().split(/\s+/)[0];
  return tier || null;
}

function formatRoleLabelForDiscord(role: string | null | undefined, guild: Guild | null | undefined): string {
  const normalized = (role || '').trim().toUpperCase();
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

function getRoleMenuSessionKey(userId: string, guildId: string) {
  return `${userId}-${guildId}`;
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
  feedType: 'DUO' | 'LFT';
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

function describeFilters(fc: any): string {
  const parts: string[] = [];
  if (fc.filterRegions?.length > 0) parts.push(`Regions: ${fc.filterRegions.join(', ')}`);
  if (fc.filterRoles?.length > 0) parts.push(`Roles: ${fc.filterRoles.join(', ')}`);
  if (fc.filterLanguages?.length > 0) parts.push(`Languages: ${fc.filterLanguages.join(', ')}`);
  if (fc.filterMinRank) parts.push(`Min: ${fc.filterMinRank}`);
  if (fc.filterMaxRank) parts.push(`Max: ${fc.filterMaxRank}`);
  return parts.length > 0 ? ` (${parts.join(' | ')})` : ' (Global)';
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
  if (customId === 'setup_duo' || customId === 'setup_lft') {
    const feedType = customId === 'setup_duo' ? 'DUO' : 'LFT';

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
      .setTitle(`${feedType === 'DUO' ? '🤝 Duo' : '👥 LFT'} Feed Setup`)
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
      const label = setup.feedType === 'DUO' ? 'Duo' : 'LFT';
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
      const label = setup.feedType === 'DUO' ? 'Duo' : 'LFT';
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
  const displayName = mainAccount.gameName && mainAccount.tagLine
    ? `${mainAccount.gameName}#${mainAccount.tagLine}`
    : mainAccount.summonerName || 'Unknown';

  const postUrl = `${APP_URL}/share/post/${id}`;
  const regionLine = `${resolveEmoji(guild, 'region', '🌍')} **${region || 'Unknown'}** • ${formatRoleLabelForDiscord(role, guild)}`;
  const rankLine = formatRankLabelForDiscord(mainAccount.rank, mainAccount.division, guild);
  const winrateLine = mainAccount.winrate !== null && mainAccount.winrate !== undefined
    ? `${resolveEmoji(guild, 'winrate', '📈')} ${Number(mainAccount.winrate).toFixed(1)}%`
    : null;
  const vcLine = formatVcLabelForDiscord(vcPreference, guild);
  const languagesLine = formatLanguagesForDiscord(languages, guild);

  const descriptionParts = [
    truncateForDiscord(message, 320) ? `> ${truncateForDiscord(message, 320)}` : null,
    `${resolveEmoji(guild, 'riot', '🎮')} **${displayName}**`,
    regionLine,
    [rankLine, winrateLine].filter(Boolean).join(' • ') || null,
    vcLine,
    languagesLine,
    communityName ? `🏠 ${communityName}` : null,
    `↗ [open in app](${postUrl})`,
  ].filter(Boolean);

  return new EmbedBuilder()
    .setColor(0x3B82F6)
    .setTitle(`Duo • ${author.username}`)
    .setURL(postUrl)
    .setDescription(descriptionParts.join('\n'))
    .setFooter({ text: 'RiftEssence' })
    .setTimestamp();
}

function buildForwardMessagePayload(embed: EmbedBuilder, mentionDiscordId?: string | null, messageUrl?: string) {
  const payload: any = {
    embeds: [embed],
  };

  if (mentionDiscordId) {
    payload.content = `<@${mentionDiscordId}>`;
    payload.allowedMentions = {
      users: [mentionDiscordId],
    };
  }

  if (messageUrl) {
    payload.components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('💬 Message in App')
          .setURL(messageUrl)
      ),
    ];
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
        await textChannel.send(buildForwardMessagePayload(embed, post.author?.discordId, `${APP_URL}/share/post/${id}`));
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

  const descriptionParts = [
    truncateForDiscord(post.details || post.description, 340) ? `> ${truncateForDiscord(post.details || post.description, 340)}` : null,
    post.region ? `${regionPrefix} **${post.region}**` : null,
    candidateType === 'PLAYER' && post.mainRole ? formatRoleLabelForDiscord(post.mainRole, guild) : null,
    rankLabel,
    post.experience ? `🧩 Experience: ${post.experience}` : null,
    post.availability ? `📅 Availability: ${post.availability}` : null,
    languagesLine,
    post.author?.discordUsername ? `💬 ${post.author.discordUsername}` : null,
    `↗ [open in app](${appUrl})`,
  ].filter(Boolean);

  return new EmbedBuilder()
    .setColor(candidateColorMap[candidateType] ?? candidateColorMap.PLAYER)
    .setTitle(`${candidateLabel} LFT • ${listingName}`)
    .setURL(appUrl)
    .setDescription(descriptionParts.join('\n'))
    .setFooter({ text: 'RiftEssence' })
    .setTimestamp();
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
        await textChannel.send(buildForwardMessagePayload(embed, post.author?.discordId, messageUrl));
        console.log(`✅ Mirrored LFT post ${id} to channel ${fc.channelId}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to send LFT to channel ${fc.channelId}:`, error.message);
    }
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
// Team Event Notifications
// ============================================================

const TEAM_EVENT_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_TEAM_EVENT_POLL_INTERVAL_MS || '15000', 10);

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

type TeamEventNotification = {
  id: string;
  teamId: string;
  teamName: string;
  teamTag: string | null;
  webhookUrl: string | null;
  notifyEnabled: boolean;
  eventId: string;
  eventTitle: string;
  eventType: string;
  scheduledAt: string;
  duration: number | null;
  description: string | null;
  enemyLink: string | null;
  concernedMemberIds: string[];
  notificationType: string;
  triggeredBy: string;
  mentionMode: 'EVERYONE' | 'ROLE' | 'TEAM_ROLE_MAP' | string;
  mentionRoleId: string | null;
  roleMentions: Record<string, string>;
  members: Array<{ id: string; username: string; role: string; discordId: string | null; dmEnabled?: boolean }>;
};

const TEAM_EVENT_WEBHOOK_REGEX = /discord(?:app)?\.com\/api\/webhooks\/([^/]+)\/([^/?]+)/i;

function buildTeamEventEmbed(notification: TeamEventNotification, teamDisplay: string) {
  const scheduledDate = new Date(notification.scheduledAt);
  const typeLabel = EVENT_TYPE_LABELS[notification.eventType] || notification.eventType;
  const color = EVENT_TYPE_COLORS[notification.eventType] || 0xC8AA6E;

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

function getConcernedMembers(notification: TeamEventNotification) {
  const explicitConcerned = Array.isArray(notification.concernedMemberIds)
    ? notification.concernedMemberIds.filter((id) => typeof id === 'string' && id.length > 0)
    : [];

  if (explicitConcerned.length === 0) {
    return notification.members;
  }

  const idSet = new Set(explicitConcerned);
  return notification.members.filter((member) => idSet.has(member.id));
}

function buildMentionContent(
  notification: TeamEventNotification,
  concernedMembers: Array<{ id: string; username: string; role: string; discordId: string | null; dmEnabled?: boolean }>
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

function buildTeamEventComponents(notification: TeamEventNotification): ActionRowBuilder<ButtonBuilder>[] {
  if (notification.notificationType === 'DELETED') {
    return [];
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`team_event_present_${notification.eventId}`)
      .setLabel('✅ Present')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`team_event_absent_${notification.eventId}`)
      .setLabel('❌ Absent')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`team_event_unsure_${notification.eventId}`)
      .setLabel('❓ Unsure')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('View on RiftEssence')
      .setStyle(ButtonStyle.Link)
      .setURL(`${APP_URL}/teams/${notification.teamId}`)
  );

  return [row];
}

async function sendTeamEventChannelNotification(
  notification: TeamEventNotification,
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
  member: { id: string; username: string; role: string; discordId: string | null; dmEnabled?: boolean },
  notification: TeamEventNotification,
  embed: EmbedBuilder,
  components: ActionRowBuilder<ButtonBuilder>[]
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

  if (notification.concernedMemberIds?.length > 0 && concernedMembers.length === 0) {
    console.warn(`⚠️ Team event ${notification.eventId} has explicit concernedMemberIds but no matching active members`);
  }

  let channelSent = false;
  let channelMessageId: string | undefined;
  if (notification.webhookUrl) {
    const channelResult = await sendTeamEventChannelNotification(notification, mentionContent, embed, components);
    channelSent = channelResult.sent;
    channelMessageId = channelResult.messageId;
  } else {
    console.log(`ℹ️ Team ${notification.teamName} has no channel webhook configured; DM-only delivery path will be used`);
  }

  if (channelMessageId && notification.notificationType !== 'DELETED') {
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

  const markResult = await apiRequest(`/api/discord/team-events/${notification.id}/processed`, 'PATCH');
  if (!markResult.ok) {
    console.error(`❌ Failed to mark team notification ${notification.id} as processed after delivery attempts`);
    return;
  }

  console.log(
    `✅ Processed team notification ${notification.id} (channelSent=${channelSent}, dmSent=${dmSentCount}/${dmTargets.length})`
  );
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

  // Start polling for DM notifications
  console.log(`📨 Starting DM notification poll (interval: ${DM_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('DM queue', pollDmQueue, DM_POLL_INTERVAL_MS, 12000);

  // Start polling for team event notifications
  console.log(`📅 Starting team event poll (interval: ${TEAM_EVENT_POLL_INTERVAL_MS}ms)`);
  startGuardedPollLoop('team event', pollTeamEventNotifications, TEAM_EVENT_POLL_INTERVAL_MS, 18000);

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
    }
    return;
  }

  // Button interactions (setup flow + team events)
  if (interaction.isButton()) {
    // Team event attendance buttons are public (anyone can respond)
    if (interaction.customId.startsWith('team_event_')) {
      await handleTeamEventButton(interaction as ButtonInteraction);
      return;
    }

    // Chat reply buttons are private DM interactions and do not require admin rights.
    if (interaction.customId.startsWith(CHAT_REPLY_BUTTON_PREFIX)) {
      await handleChatReplyButton(interaction as ButtonInteraction);
      return;
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
    if (!member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only administrators can configure bot settings.', ephemeral: true });
    }
    await handleSelectMenuInteraction(interaction as StringSelectMenuInteraction);
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith(CHAT_REPLY_MODAL_PREFIX)) {
      await handleChatReplyModalSubmit(interaction as ModalSubmitInteraction);
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
