# Discord Bot

> Last updated: 2026-02-11  
> Source: `discord-bot/src/index.ts`  
> Package: `@riftessence/discord-bot` (standalone, NOT in pnpm workspace)

## Tech

- discord.js v14.14.1
- TypeScript
- Intents: Guilds, GuildMessages, MessageContent

## Slash Commands

| Command | Description |
|---------|-------------|
| `/setfeedchannel` | Register a Discord channel as a feed channel for a community |
| `/removefeedchannel` | Unregister a feed channel |
| `/listfeedchannels` | List all registered feed channels in the guild |

## Features

### Message Ingestion
- Monitors registered feed channels for new Discord messages
- Ingests messages as app posts via API (`POST /api/discord/ingest`)
- Uses `DISCORD_BOT_API_KEY` Bearer token for API auth

### Post Mirroring
- Polls API every 60 seconds for new app-created posts
- Mirrors posts to Discord as rich embeds containing:
  - Player rank, role, region
  - Discord mention (if linked)
  - Winrate stats
  - Post message

## Bot → API Communication

All via REST calls to the Fastify API:
- `/api/discord/channels` — CRUD feed channels
- `/api/communities` — Community lookup
- `/api/discord/ingest` — Post ingestion from Discord messages

## Setup

```bash
cd discord-bot
npm install
# Configure .env: DISCORD_BOT_TOKEN, DISCORD_BOT_API_KEY, API_URL
npm start
```
