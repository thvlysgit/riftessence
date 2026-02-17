# Backend Integrations

> Last updated: 2026-02-11

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
