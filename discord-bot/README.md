# RiftEssence Discord Bot

Discord bot for integrating Discord communities with the RiftEssence app feed system.

## Features

- **Slash Commands**:
  - `/setfeedchannel` - Register current channel to receive app posts
  - `/removefeedchannel` - Remove current channel from feed
  - `/listfeedchannels` - List all registered feed channels

- **Discord → App Ingestion**:
  - Monitors registered feed channels
  - Creates app posts from Discord messages
  - Auto-creates anonymous users for Discord users not linked to the app
  - Auto-joins users to the community

- **App → Discord Mirroring**:
  - Polls backend for new app posts
  - Sends rich embeds to registered Discord feed channels
  - Shows user info, rank, role, region, and preferences

## Setup

### Prerequisites

1. Create a Discord application at https://discord.com/developers/applications
2. Create a bot user and copy the bot token
3. Enable these Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent
4. Invite the bot to your server with these permissions:
   - Send Messages
   - Embed Links
   - Read Messages/View Channels
   - Use Slash Commands

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in the values:
```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_BOT_API_KEY=your_api_key_here
API_BASE_URL=http://localhost:3333
DISCORD_BOT_POLL_INTERVAL_MS=60000
```

- `DISCORD_BOT_TOKEN`: Your Discord bot token from the developer portal
- `DISCORD_BOT_API_KEY`: API key for authenticating with the RiftEssence backend (must match the backend's env var)
- `API_BASE_URL`: URL of the RiftEssence API (e.g., `http://localhost:3333` for dev, `https://api.riftessence.com` for prod)
- `DISCORD_BOT_POLL_INTERVAL_MS`: How often to poll for outgoing posts (default: 60000ms = 1 minute)

3. Build and run:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Usage

### Linking Your Community

1. Register your community on the RiftEssence app at `/communities/register`
2. Fill in your Discord Server ID in the registration form
3. The bot will automatically detect your community when you use slash commands

### Setting Up Feed Channels

1. In your Discord server, navigate to the channel you want to use for the feed
2. Run `/setfeedchannel` to register the channel
3. The channel will now:
   - Receive embeds when app users post to your community
   - Ingest messages from Discord users (creates app posts automatically)

### Managing Feed Channels

- `/removefeedchannel` - Remove the current channel from the feed
- `/listfeedchannels` - View all registered feed channels for your server

## How It Works

### Ingestion (Discord → App)

When a user posts a message in a registered feed channel:

1. Bot detects the message
2. Checks if the channel is registered via `/api/discord/feed/channels`
3. Calls `/api/discord/ingest` with message data
4. Backend checks if Discord user is linked to an app account
5. If not linked: Creates anonymous app user, placeholder Riot account, and links Discord ID
6. If linked: Uses existing user's profile data
7. Creates app post with `source='discord'` and auto-joins user to community

### Mirroring (App → Discord)

Every `DISCORD_BOT_POLL_INTERVAL_MS`:

1. Bot calls `/api/discord/outgoing` with `since` timestamp
2. Backend returns posts where:
   - `source='app'`
   - `discordMirrored=false`
   - `communityId` is not null
3. Bot creates rich embeds with user info, rank, role, region, etc.
4. Sends embeds to all feed channels for that community
5. Calls `/api/discord/posts/:id/mirrored` to mark as sent

## Architecture

- **TypeScript** with discord.js v14
- **Polling** architecture (not webhook-based)
- **Bot authentication** via Bearer token (`DISCORD_BOT_API_KEY`)
- **Slash commands** registered globally
- **Rich embeds** for mirrored posts

## Troubleshooting

### Commands not showing up
- Make sure the bot has the `applications.commands` scope
- Commands are registered globally on bot startup (may take up to 1 hour to propagate)

### Messages not being ingested
- Check that Message Content Intent is enabled
- Verify the channel is registered with `/listfeedchannels`
- Check bot logs for API errors

### Posts not mirroring to Discord
- Ensure `DISCORD_BOT_POLL_INTERVAL_MS` is set (default 60s)
- Verify community has feed channels registered
- Check that app posts have a `communityId` set

### API authentication errors
- Ensure `DISCORD_BOT_API_KEY` matches the backend's `DISCORD_BOT_API_KEY` env var
- Check backend logs for authorization failures

## License

Part of the RiftEssence project.
