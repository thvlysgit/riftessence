# Communities System + Discord Bot Integration Setup Guide

This guide covers setup for the complete Communities System and Discord Bot integration.

## Overview

The Communities System allows users to:
- Register and manage communities linked to Discord servers
- Join/leave communities via the app
- Post to specific communities (posts are mirrored to Discord)
- Receive Discord messages in the app feed (auto-creates app posts)

## Prerequisites

- Existing RiftEssence app setup (API + Web)
- PostgreSQL database
- Discord bot application (for Discord integration)
- Node.js 18+ and pnpm

## Part 1: Database Migration

### 1. Run Prisma Migration

The schema has been updated to include:
- `Community` model (name, slug, language, regions, inviteLink, discordServerId, isPartner)
- `UserCommunity` join table (userId, communityId, role)
- `DiscordFeedChannel` model (communityId, guildId, channelId)
- Extensions to `Post` and `LftPost` models (communityId, source, discordMirrored, discordMessageId)

Run the migration:

```bash
cd c:\c\Users\thoms\Desktop\riftessence
npx prisma migrate dev --name add_communities
```

This will:
- Create the new tables
- Add new columns to existing tables
- Generate Prisma client types

### 2. Verify Migration

Check that tables were created:
```bash
npx prisma studio
```

Look for:
- `Community`
- `UserCommunity`
- `DiscordFeedChannel`
- Updated `Post` and `LftPost` tables

## Part 2: Backend API Setup

### Environment Variables

Add to `apps/api/.env`:

```env
# Discord Bot Authentication
DISCORD_BOT_API_KEY=your_secure_random_key_here
```

**Important**: Generate a secure random key for `DISCORD_BOT_API_KEY`. This is used to authenticate the Discord bot when it calls the API. Example:

```bash
# Generate a secure key (PowerShell)
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### New API Endpoints

The following routes are now available:

#### Communities Routes (`/api/communities`)
- `GET /api/communities` - List communities (supports filters: region, isPartner, search)
- `GET /api/communities/:id` - Get community details with members
- `POST /api/communities` - Register new community (requires userId)
- `PATCH /api/communities/:id` - Update community (requires membership or admin)
- `POST /api/communities/:id/join` - Join community
- `DELETE /api/communities/:id/leave` - Leave community
- `GET /api/communities/:id/posts` - Get community posts (supports type=lft)

#### Discord Feed Routes (`/api/discord`) - Bot Authentication Required
- `GET /api/discord/feed/channels` - List feed channels (by communityId or guildId)
- `POST /api/discord/feed/channels` - Register feed channel
- `DELETE /api/discord/feed/channels/:id` - Remove feed channel
- `POST /api/discord/ingest` - Ingest Discord message as app post
- `GET /api/discord/outgoing` - Get posts to mirror (supports since query param)
- `PATCH /api/discord/posts/:postId/mirrored` - Mark post as mirrored

#### Updated Posts Route
- `POST /api/posts` - Now accepts `communityId` field
- `GET /api/posts` - Now includes `community` relation and `source` field

## Part 3: Frontend Setup

### Environment Variables

No new frontend env vars required. Existing `NEXT_PUBLIC_API_URL` is used.

### New Pages

- `/communities` - Community discovery/list page
- `/communities/register` - Register new community
- `/communities/[id]` - Community detail page (view, join/leave, posts)

### Updated Pages

- `/create` - Now includes community selector dropdown
- `/feed` - Post cards now show community badges and Discord source tags
- `/profile` - Displays user's communities (read-only, join via community detail page)

## Part 4: Discord Bot Setup

### 1. Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it (e.g., "RiftEssence")
4. Go to the "Bot" tab
5. Click "Add Bot"
6. Copy the bot token (you'll need this for `DISCORD_BOT_TOKEN`)

### 2. Enable Required Intents

In the "Bot" tab, enable:
- ✅ Server Members Intent
- ✅ Message Content Intent

### 3. Generate Bot Invite Link

In the "OAuth2 > URL Generator" tab:
- **Scopes**: `bot`, `applications.commands`
- **Bot Permissions**:
  - Read Messages/View Channels
  - Send Messages
  - Embed Links
  - Use Slash Commands

Copy the generated URL and use it to invite the bot to your Discord server.

### 4. Configure Bot Environment

Create `discord-bot/.env`:

```env
DISCORD_BOT_TOKEN=your_bot_token_from_developer_portal
DISCORD_BOT_API_KEY=same_as_backend_api_key
API_BASE_URL=http://localhost:3333
DISCORD_BOT_POLL_INTERVAL_MS=60000
```

**Important**: `DISCORD_BOT_API_KEY` must match the backend's `DISCORD_BOT_API_KEY` exactly.

### 5. Install Dependencies

```bash
cd discord-bot
npm install
```

### 6. Run Bot

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

You should see:
```
✅ Bot logged in as RiftEssence#1234
🔄 Registering slash commands...
✅ Slash commands registered globally
🔄 Starting outgoing post poll (interval: 60000ms)
```

## Part 5: Community Registration Flow

### 1. Register Community on App

1. User navigates to `/communities/register`
2. Fills in:
   - Community Name (required)
   - Description (optional)
   - Language (default: English)
   - Regions (required, multi-select)
   - Discord Invite Link (optional)
   - Discord Server ID (required for bot integration)
3. Submits form
4. Backend creates `Community` record
5. User is auto-joined as `ADMIN` role via `UserCommunity` record
6. Redirected to `/communities/[id]`

### 2. Link Discord Server

To get your Discord Server ID:
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click your server icon → "Copy Server ID"
3. Paste into the registration form

### 3. Set Up Feed Channels

In Discord:
1. Navigate to channel you want to use for the feed
2. Run `/setfeedchannel`
3. Bot confirms channel is registered

The channel will now:
- Receive embeds when app users post to the community
- Ingest Discord messages (creates app posts automatically)

## Part 6: Usage Examples

### Posting to a Community

**From the App**:
1. Go to `/create`
2. Select a community from the dropdown (or leave as "None" for general feed)
3. Fill in post details
4. Submit
5. Post is created with `source='app'`, `discordMirrored=false`, `communityId=<selected>`
6. Bot polls `/api/discord/outgoing` and mirrors post to Discord feed channels

**From Discord**:
1. Post a message in a registered feed channel
2. Bot calls `/api/discord/ingest`
3. Backend creates app post with `source='discord'`
4. If Discord user not linked: Creates anonymous app user with Discord ID
5. If Discord user linked: Uses existing app user's data
6. User is auto-joined to the community

### Joining a Community

1. Browse communities at `/communities`
2. Click on a community card
3. View community detail page
4. Click "Join Community" button
5. Backend creates `UserCommunity` record with `role='MEMBER'`
6. User can now post to this community

### Viewing Community Posts

- **Community detail page**: Shows recent posts from that community
- **Feed page**: Posts show community badge (partner badge if `isPartner=true`)
- **Discord source tag**: Posts from Discord show "Discord" badge

## Part 7: Admin Features

### Setting Partner Status

Only users with the `admin` badge can set `isPartner=true` on communities.

To grant admin badge:
```sql
-- In your database
UPDATE "User" SET badges = ARRAY['admin'] WHERE username = 'your_username';
```

### Managing Communities

Community admins (role `ADMIN` or `MODERATOR`) can:
- Update community details via `PATCH /api/communities/:id`
- Cannot change `isPartner` (only app admins can)

## Part 8: Testing

### Test Community Registration
1. Navigate to `/communities/register`
2. Create a test community with your Discord server ID
3. Verify it appears in `/communities` list

### Test Discord Bot Commands
1. In Discord, run `/setfeedchannel` in a test channel
2. Run `/listfeedchannels` to verify
3. Post a message in the feed channel
4. Check the app feed for the ingested post

### Test App → Discord Mirroring
1. Create a post on the app with your test community selected
2. Wait for bot poll interval (default 60s)
3. Check Discord feed channel for the mirrored embed

### Test Join/Leave
1. Join a community from `/communities/[id]`
2. Verify it appears in your profile
3. Leave the community
4. Verify it's removed from your profile

## Troubleshooting

### Migration Issues
- **Error: relation already exists**: Run `npx prisma db push --force-reset` (WARNING: Deletes all data)
- **Type errors**: Run `npx prisma generate` to regenerate Prisma client

### Bot Not Responding
- Check bot is running (`npm run dev` in discord-bot/)
- Verify `DISCORD_BOT_TOKEN` is correct
- Check Message Content Intent is enabled in Discord Developer Portal

### API Authentication Errors
- Ensure `DISCORD_BOT_API_KEY` matches between backend and bot
- Check backend logs for 401/403 errors
- Verify bot is sending `Authorization: Bearer <key>` header

### Posts Not Mirroring
- Check bot poll interval (`DISCORD_BOT_POLL_INTERVAL_MS`)
- Verify posts have `communityId` set
- Ensure community has feed channels registered
- Check bot logs for API errors

### Feed Channels Not Working
- Run `/listfeedchannels` to verify registration
- Check community's `discordServerId` matches actual Discord server ID
- Verify bot has permissions to send messages in the channel

## Production Deployment

### Backend
1. Set `DISCORD_BOT_API_KEY` in production environment
2. Run migration: `npx prisma migrate deploy`
3. Restart API server

### Frontend
1. No changes needed (uses existing `NEXT_PUBLIC_API_URL`)
2. Rebuild and deploy: `pnpm build`

### Discord Bot
1. Update `discord-bot/.env` with production values:
   - `API_BASE_URL=https://api.yourdomain.com`
   - Same `DISCORD_BOT_API_KEY` as backend
2. Build: `npm run build`
3. Run: `npm start` (or use PM2/systemd)
4. Consider using a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name riftessence-bot
   pm2 save
   ```

## Summary of Changes

### Database
- 3 new tables: `Community`, `UserCommunity`, `DiscordFeedChannel`
- 4 new columns in `Post`: `communityId`, `source`, `discordMirrored`, `discordMessageId`
- 1 new column in `LftPost`: `communityId`

### Backend
- 2 new route files: `communities.ts`, `discordFeed.ts`
- 1 updated route: `posts.ts` (accepts communityId)
- 1 new env var: `DISCORD_BOT_API_KEY`

### Frontend
- 3 new pages: `/communities`, `/communities/register`, `/communities/[id]`
- 3 updated pages: `/create`, `/feed`, `/profile`

### Discord Bot
- New standalone app in `discord-bot/` folder
- 3 slash commands: `/setfeedchannel`, `/removefeedchannel`, `/listfeedchannels`
- Message ingestion (Discord → App)
- Post mirroring (App → Discord)

## Next Steps

1. Run Prisma migration
2. Set backend env var (`DISCORD_BOT_API_KEY`)
3. Set up Discord bot application
4. Install and run Discord bot
5. Register your first community
6. Test the full flow!

For more details on the Discord bot, see `discord-bot/README.md`.
