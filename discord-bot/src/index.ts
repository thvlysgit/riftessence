import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, TextChannel, EmbedBuilder, ActivityType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
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
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ============================================================
// Constants
// ============================================================

const APP_URL = process.env.APP_URL || 'https://riftessence.app';

const REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU', 'SG'];
const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
const RANKS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];

const RANK_EMOJIS: Record<string, string> = {
  IRON: '🪨', BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇', PLATINUM: '💎',
  EMERALD: '💚', DIAMOND: '💠', MASTER: '🟣', GRANDMASTER: '🔴', CHALLENGER: '👑',
};

const ROLE_EMOJIS: Record<string, string> = {
  TOP: '🛡️', JUNGLE: '🌿', MID: '⚔️', ADC: '🏹', SUPPORT: '❤️',
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
    .setDescription('Set up or manage post forwarding to Discord channels')
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
      `Choose what type of posts to forward to **this channel**, or manage existing channels.\n\n` +
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

function describeFilters(fc: any): string {
  const parts: string[] = [];
  if (fc.filterRegions?.length > 0) parts.push(`Regions: ${fc.filterRegions.join(', ')}`);
  if (fc.filterRoles?.length > 0) parts.push(`Roles: ${fc.filterRoles.join(', ')}`);
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

    // Row 2: Role select (DUO only)
    if (setup.feedType === 'DUO') {
      const roleMenu = new StringSelectMenuBuilder()
        .setCustomId('filter_role')
        .setPlaceholder('Select roles (leave empty = all)')
        .setMinValues(0)
        .setMaxValues(ROLES.length)
        .addOptions(ROLES.map(r => new StringSelectMenuOptionBuilder().setLabel(r).setValue(r).setEmoji(ROLE_EMOJIS[r] || '🎮')));
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(roleMenu));
    }

    // Row 3: Min rank
    const minRankMenu = new StringSelectMenuBuilder()
      .setCustomId('filter_min_rank')
      .setPlaceholder('Minimum rank (optional)')
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions(RANKS.map(r => new StringSelectMenuOptionBuilder().setLabel(r).setValue(r).setEmoji(RANK_EMOJIS[r] || '🏆')));
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(minRankMenu));

    // Row 4: Max rank
    const maxRankMenu = new StringSelectMenuBuilder()
      .setCustomId('filter_max_rank')
      .setPlaceholder('Maximum rank (optional)')
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions(RANKS.map(r => new StringSelectMenuOptionBuilder().setLabel(r).setValue(r).setEmoji(RANK_EMOJIS[r] || '🏆')));
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(maxRankMenu));

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

  // ── Filter select menus (update pending state) ──
  if (customId === 'filter_region' || customId === 'filter_role' || customId === 'filter_min_rank' || customId === 'filter_max_rank') {
    const setup = pendingSetups.get(key);
    if (!setup) {
      return interaction.deferUpdate(); // session expired, don't crash
    }

    if (customId === 'filter_region') setup.filterRegions = interaction.values;
    if (customId === 'filter_role') setup.filterRoles = interaction.values;
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

async function mirrorPostToDiscord(post: any) {
  const { id, author, riotAccount, message, role, region, vcPreference, languages, feedChannels } = post;

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

  const mainAccount = riotAccount || { gameName: 'Unknown', tagLine: '', rank: '', division: '', winrate: null };
  const displayName = mainAccount.gameName && mainAccount.tagLine
    ? `${mainAccount.gameName}#${mainAccount.tagLine}`
    : mainAccount.summonerName || 'Unknown';

  let titleSuffix = '';
  if (author.discordId) {
    titleSuffix = ` <@${author.discordId}>`;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0a84ff)
    .setTitle(`🤝 Duo Post — ${author.username}${titleSuffix}`)
    .setDescription(message || 'Looking for teammates!')
    .addFields(
      { name: '🎮 Riot Account', value: displayName, inline: true },
      { name: '🌍 Region', value: region, inline: true },
      { name: '🎭 Role', value: role, inline: true },
    );

  if (author.discordUsername) {
    embed.addFields({ name: '💬 Discord', value: author.discordUsername, inline: true });
  }
  if (mainAccount.rank) {
    embed.addFields({ name: '🏆 Rank', value: mainAccount.rank, inline: true });
  }
  if (mainAccount.division) {
    embed.addFields({ name: '📊 Division', value: mainAccount.division, inline: true });
  }
  if (mainAccount.winrate !== null && mainAccount.winrate !== undefined) {
    embed.addFields({ name: '📈 Winrate', value: `${mainAccount.winrate.toFixed(1)}%`, inline: true });
  }
  if (vcPreference) {
    embed.addFields({ name: '🎤 Voice', value: vcPreference, inline: true });
  }
  if (languages && languages.length > 0) {
    embed.addFields({ name: '🗣️ Languages', value: languages.join(', '), inline: true });
  }

  const communitySlug = post.communitySlug || post.communityId;
  if (communitySlug) {
    embed.addFields({
      name: '🔗 Join Community',
      value: `[Join on RiftEssence](${APP_URL}/communities/join/${communitySlug})`,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Find your duo on riftessence.app!' });
  embed.setTimestamp();

  for (const fc of feedChannels) {
    try {
      const channel = await client.channels.fetch(fc.channelId) as TextChannel;
      if (channel && channel.isTextBased()) {
        await channel.send({ embeds: [embed] });
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

  const isTeam = post.type === 'TEAM';

  const embed = new EmbedBuilder()
    .setColor(isTeam ? 0xe74c3c : 0x2ecc71)
    .setTimestamp();

  if (isTeam) {
    // TEAM looking for players
    embed.setTitle(`👥 Team LFT — ${post.teamName || 'Unnamed Team'}`);
    embed.setDescription(post.description || 'Looking for players!');

    if (post.region) embed.addFields({ name: '🌍 Region', value: post.region, inline: true });
    if (post.averageRank) embed.addFields({ name: '🏆 Average Rank', value: post.averageRank, inline: true });
    if (post.rolesNeeded?.length > 0) {
      embed.addFields({
        name: '🎭 Roles Needed',
        value: post.rolesNeeded.map((r: string) => `${ROLE_EMOJIS[r] || '🎮'} ${r}`).join(', '),
        inline: true,
      });
    }
    if (post.schedule) embed.addFields({ name: '📅 Schedule', value: post.schedule, inline: true });
  } else {
    // PLAYER looking for team
    const authorName = post.author?.username || 'Unknown';
    let titleSuffix = '';
    if (post.author?.discordId) titleSuffix = ` <@${post.author.discordId}>`;

    embed.setTitle(`🙋 Player LFT — ${authorName}${titleSuffix}`);
    embed.setDescription(post.description || 'Looking for a team!');

    if (post.region) embed.addFields({ name: '🌍 Region', value: post.region, inline: true });
    if (post.mainRole) embed.addFields({ name: '🎭 Main Role', value: `${ROLE_EMOJIS[post.mainRole] || '🎮'} ${post.mainRole}`, inline: true });
    if (post.rank) embed.addFields({ name: '🏆 Rank', value: post.rank, inline: true });
    if (post.availability) embed.addFields({ name: '📅 Availability', value: post.availability, inline: true });
    if (post.author?.discordUsername) {
      embed.addFields({ name: '💬 Discord', value: post.author.discordUsername, inline: true });
    }
  }

  const communitySlug = post.communitySlug || post.communityId;
  if (communitySlug) {
    embed.addFields({
      name: '🔗 View on RiftEssence',
      value: `[Open](${APP_URL}/communities/${communitySlug}/lft)`,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Find your team on riftessence.app!' });

  for (const fc of feedChannels) {
    try {
      const channel = await client.channels.fetch(fc.channelId) as TextChannel;
      if (channel && channel.isTextBased()) {
        await channel.send({ embeds: [embed] });
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

    await user.send({ embeds: [embed] });
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

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot logged in as ${c.user.tag}`);
  client.user?.setActivity('RiftEssence | /setup', { type: ActivityType.Playing });

  // Register slash commands
  const guildIds = client.guilds.cache.map(g => g.id);
  await registerCommands(c.user.id, guildIds);

  // Start polling for outgoing duo posts
  console.log(`🔄 Starting duo post poll (interval: ${POLL_INTERVAL_MS}ms)`);
  setInterval(pollOutgoingPosts, POLL_INTERVAL_MS);

  // Start polling for outgoing LFT posts
  const LFT_POLL_INTERVAL_MS = parseInt(process.env.DISCORD_LFT_POLL_INTERVAL_MS || '30000', 10);
  console.log(`🔄 Starting LFT post poll (interval: ${LFT_POLL_INTERVAL_MS}ms)`);
  setInterval(pollOutgoingLftPosts, LFT_POLL_INTERVAL_MS);

  // Start polling for DM notifications
  console.log(`📨 Starting DM notification poll (interval: ${DM_POLL_INTERVAL_MS}ms)`);
  setInterval(pollDmQueue, DM_POLL_INTERVAL_MS);

  // Start polling for team event notifications
  console.log(`📅 Starting team event poll (interval: ${TEAM_EVENT_POLL_INTERVAL_MS}ms)`);
  setInterval(pollTeamEventNotifications, TEAM_EVENT_POLL_INTERVAL_MS);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    if (commandName === 'linkserver') {
      await handleLinkServer(interaction);
    } else if (commandName === 'setup') {
      await handleSetup(interaction);
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
    
    // Only allow administrators for setup buttons
    const member = interaction.member as any;
    if (!member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only administrators can configure feeds.', ephemeral: true });
    }
    await handleButtonInteraction(interaction as ButtonInteraction);
    return;
  }

  // Select menu interactions (filter menus)
  if (interaction.isStringSelectMenu()) {
    const member = interaction.member as any;
    if (!member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only administrators can configure feeds.', ephemeral: true });
    }
    await handleSelectMenuInteraction(interaction as StringSelectMenuInteraction);
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
