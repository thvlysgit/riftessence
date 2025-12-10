import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, TextChannel, EmbedBuilder, ActivityType } from 'discord.js';
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
// Slash Commands
// ============================================================

const commands = [
  new SlashCommandBuilder()
    .setName('setfeedchannel')
    .setDescription('Set this channel to receive posts from the app')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('removefeedchannel')
    .setDescription('Remove this channel from receiving app posts')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('listfeedchannels')
    .setDescription('List all feed channels for this server')
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

async function handleSetFeedChannel(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  const channelId = interaction.channelId;

  if (!guildId) {
    return interaction.editReply('❌ This command must be used in a server');
  }

  // Find community by discordServerId
  const communityRes = await apiRequest(`/api/communities?discordServerId=${guildId}`);
  if (!communityRes.ok || !communityRes.data.communities?.length) {
    return interaction.editReply(
      '❌ No community is linked to this Discord server. Please register your community on the app first.'
    );
  }

  const community = communityRes.data.communities[0];
  if (!community) {
    return interaction.editReply(
      '❌ No community is linked to this Discord server. Please register your community on the app first.'
    );
  }

  // Register feed channel
  const result = await apiRequest('/api/discord/feed/channels', 'POST', {
    communityId: community.id,
    guildId,
    channelId,
  });

  if (result.ok) {
    return interaction.editReply(
      `✅ This channel is now registered to receive posts from **${community.name}** community!`
    );
  } else {
    return interaction.editReply(
      `❌ Failed to register feed channel: ${result.data.error || 'Unknown error'}`
    );
  }
}

async function handleRemoveFeedChannel(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  const channelId = interaction.channelId;

  if (!guildId) {
    return interaction.editReply('❌ This command must be used in a server');
  }

  // Get feed channels for this guild
  const result = await apiRequest(`/api/discord/feed/channels?guildId=${guildId}`);
  if (!result.ok) {
    return interaction.editReply('❌ Failed to fetch feed channels');
  }

  const feedChannel = result.data.find((fc: any) => fc.channelId === channelId);
  if (!feedChannel) {
    return interaction.editReply('❌ This channel is not registered as a feed channel');
  }

  // Delete feed channel
  const deleteRes = await apiRequest(`/api/discord/feed/channels/${feedChannel.id}`, 'DELETE');
  if (deleteRes.ok) {
    return interaction.editReply('✅ This channel has been removed from the feed');
  } else {
    return interaction.editReply(`❌ Failed to remove feed channel: ${deleteRes.data.error || 'Unknown error'}`);
  }
}

async function handleListFeedChannels(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.editReply('❌ This command must be used in a server');
  }

  const result = await apiRequest(`/api/discord/feed/channels?guildId=${guildId}`);
  if (!result.ok) {
    return interaction.editReply('❌ Failed to fetch feed channels');
  }

  if (result.data.length === 0) {
    return interaction.editReply('ℹ️ No feed channels registered for this server');
  }

  const channelList = result.data
    .map((fc: any) => `• <#${fc.channelId}>`)
    .join('\n');

  return interaction.editReply(`**Feed Channels:**\n${channelList}`);
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
// Outgoing Post Mirroring
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

    // Update poll time IMMEDIATELY - even if no posts - to keep progressing forward
    lastPollTime = new Date().toISOString();

    if (!posts || posts.length === 0) return;

    console.log(`📤 Found ${posts.length} outgoing posts to mirror`);

    for (const post of posts) {
      await mirrorPostToDiscord(post);
    }
  } catch (error: any) {
    console.error('❌ Error in polling loop:', error.message);
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

  // Build embed
  const mainAccount = riotAccount || { gameName: 'Unknown', tagLine: '', rank: '', division: '', winrate: null };
  
  // Use gameName#tagLine if available, otherwise fallback to summonerName
  const displayName = mainAccount.gameName && mainAccount.tagLine
    ? `${mainAccount.gameName}#${mainAccount.tagLine}`
    : mainAccount.summonerName || 'Unknown';
  
  // Build title with Discord mention
  let titleSuffix = '';
  if (author.discordId) {
    titleSuffix = ` <@${author.discordId}>`;
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x0a84ff)
    .setTitle(`Post from: ${author.username}${titleSuffix}`)
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

  embed.setFooter({ text: 'Post on riftessence.com!' });
  embed.setTimestamp();

  // Send to all feed channels
  for (const fc of feedChannels) {
    try {
      const channel = await client.channels.fetch(fc.channelId) as TextChannel;
      if (channel && channel.isTextBased()) {
        await channel.send({ embeds: [embed] });
        console.log(`✅ Mirrored post ${id} to channel ${fc.channelId}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to send to channel ${fc.channelId}:`, error.message);
    }
  }
}

// ============================================================
// Bot Events
// ============================================================

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot logged in as ${c.user.tag}`);
  client.user?.setActivity('RiftEssence | /setfeedchannel', { type: ActivityType.Playing });

  // Register slash commands (global, with per-guild fallback)
  const guildIds = client.guilds.cache.map(g => g.id);
  await registerCommands(c.user.id, guildIds);

  // Start polling for outgoing posts
  console.log(`🔄 Starting outgoing post poll (interval: ${POLL_INTERVAL_MS}ms)`);
  setInterval(pollOutgoingPosts, POLL_INTERVAL_MS);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'setfeedchannel') {
    await handleSetFeedChannel(interaction);
  } else if (commandName === 'removefeedchannel') {
    await handleRemoveFeedChannel(interaction);
  } else if (commandName === 'listfeedchannels') {
    await handleListFeedChannels(interaction);
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
