# Backend Integrations

> Last updated: 2026-04-17

## Riot Games API

**Client**: `apps/api/src/riotClient.ts` (pure functions, no global state)

### Capabilities
- PUUID lookup by gameName#tagLine
- Summoner data by PUUID
- Match history retrieval
- Ranked stats (rank, division, LP, winrate)
- Profile icon lookup

### Verification Flow
1. User initiates verification in profile
2. API generates random icon ID → stored in database
3. User sets icon in League client
4. Background worker (`workers/riotVerifier.ts`) polls Riot API
5. On match → account marked verified

### Rate Limits
Regional and per-endpoint rate limits enforced by Riot API. Caching recommended but not fully implemented.

## Discord OAuth

**Route**: `apps/api/src/routes/discord.ts` (prefix: `/api/auth/discord`)

- `DISCORD_CLIENT_ID` + `DISCORD_CLIENT_SECRET` env vars
- Redirect-based OAuth flow
- Links Discord account to user profile
- Frontend callback on `/authenticate` page

## Cloudflare Turnstile

- CAPTCHA on registration
- `TURNSTILE_SECRET_KEY` (API) + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (frontend)
- Optional — can be disabled

## Discord Bot Integration

The Discord bot (standalone service) communicates with the API via REST:
- `/api/discord/*` endpoints for feed channel management
- Bot bearer token via `DISCORD_BOT_API_KEY`
- Post mirroring: bot polls API every 60s for new posts → embeds in Discord
- Message ingestion: bot monitors registered channels → creates posts via API

### Team Event and Reminder Delivery

- Team schedule mutations enqueue bot work items in database-backed queues:
	- `TeamEventNotification` for created/updated/deleted event notifications
	- `TeamEventReminder` for due reminder fanout before event start
- Team-level Discord delivery settings are managed in `apps/api/src/routes/teams.ts` and consumed by the bot:
	- `pingRecurrence` (when disabled, channel mentions are throttled to once/hour)
	- `remindersEnabled` + `reminderDelaysMinutes` (multiple lead-time reminders)
- Bot polling endpoints:
	- `GET /api/discord/team-events`
	- `PATCH /api/discord/team-events/:id/processed`
	- `GET /api/discord/team-event-reminders`
	- `PATCH /api/discord/team-event-reminders/:id/processed`
- `PATCH .../processed` accepts `recordPing` for channel mention sends so the API can persist `discordLastChannelPingAt` and enforce recurrence rules consistently across event notifications and reminder notifications.
