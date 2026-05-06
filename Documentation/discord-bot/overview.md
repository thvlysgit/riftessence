# Discord Bot

> Last updated: 2026-05-07
> Source: `discord-bot/src/index.ts`  
> Package: `@riftessence/discord-bot` (standalone, NOT in pnpm workspace)

## Tech

- discord.js v14.14.1
- TypeScript
- Intents: Guilds, GuildMessages, MessageContent

## Slash Commands

| Command | Description |
|---------|-------------|
| `/linkserver` | Generate a short code to link a Discord server to a RiftEssence community |
| `/setup` | Configure forwarding for the current channel (Duo/LFT, global or filtered) |
| `/rolemenu` | Configure rank/language to Discord role mappings |
| `/duo` | Create a RiftEssence duo post from a Discord modal |

> Important: `/setup` applies to the channel where it is run.

## Features

### Message Ingestion
- Monitors registered feed channels for new Discord messages
- Ingests messages as app posts via API (`POST /api/discord/ingest`)
- Uses `DISCORD_BOT_API_KEY` Bearer token for API auth

### Duo Modal
- `/duo` opens a modal for Riot ID, roles, languages, message, and VC preference
- Submits modal payloads to `POST /api/discord/ingest` with `source=modal`

### Post Mirroring
- Polls API every 60 seconds for new app-created posts
- Mirrors posts to Discord as rich embeds containing:
  - Player rank, role, region
  - Discord mention (if linked)
  - Winrate stats
  - Post message
  - Verified posts use a green embed color; unverified posts use red
  - Duo forwards include a "Send my own post" button to open the modal

### Discord DM Queue
- Polls `/api/discord/dm-queue` for pending bot DM jobs.
- Legacy chat preview rows use `kind = "CHAT_PREVIEW"` and include a Discord reply button.
- Admin broadcasts use `kind = "ADMIN_EMBED"` and are rendered as Discord embed DMs without creating in-app chat conversations.
- Delivery still depends on Discord privacy settings, mutual server access, or user-installed app access.

## Bot → API Communication

All via REST calls to the Fastify API:
- `/api/discord/feed/channels` — CRUD feed channels + filter configs
- `/api/communities` — Community lookup
- `/api/discord/ingest` — Post ingestion from Discord messages + modal submissions
- `/api/discord/dm-queue` — Bot-polled Discord DM jobs for chat previews and admin embed broadcasts

## Setup

```bash
cd discord-bot
npm install
# Configure .env: DISCORD_BOT_TOKEN, DISCORD_BOT_API_KEY, API_URL
npm start
```
