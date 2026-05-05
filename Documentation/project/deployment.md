# Deployment

> Last updated: 2026-04-16

## Vercel (Frontend)

Configuration in `vercel.json`:
- Framework: `nextjs`
- Build command: `pnpm --filter @lfd/web build`
- Output directory: `.next`

## Heroku (API)

Configuration in `Procfile` and `app.json`:
- Web process: `cd apps/api && node dist/index.js`
- PostgreSQL mini addon
- Build via `heroku-postbuild`: `pnpm build`

## Docker

- `docker-compose.yml` — 4 services: db (PostgreSQL 15), redis (Redis 7), api, discord-bot
- `apps/api/Dockerfile` — Node 20 base, pnpm via corepack, Prisma client generation, TypeScript build
- API runtime defaults include Prisma engine and pressure controls:
	- Binary engine mode (`PRISMA_CLIENT_ENGINE_TYPE`, `PRISMA_CLI_QUERY_ENGINE_TYPE`)
	- Query retry/connect/concurrency controls (`PRISMA_QUERY_RETRY_ATTEMPTS`, `PRISMA_QUERY_RETRY_DELAY_MS`, `PRISMA_ENGINE_CONNECT_COOLDOWN_MS`, `PRISMA_MAX_CONCURRENT_QUERIES`)
	- Route cache TTL controls for hot endpoints
- The API container runs `prisma migrate deploy` on startup, so Pi deployments should rebuild/restart the API container instead of using `prisma migrate dev` manually.
- `prisma migrate dev` uses a shadow database and can fail on historical migration ordering issues; if you hit that locally, use the container startup path or `prisma migrate deploy` against the running production container.
- Discord bot runtime defaults include stagger-friendly poll interval env vars (`DISCORD_LFT_POLL_INTERVAL_MS`, `DISCORD_DM_POLL_INTERVAL_MS`, `DISCORD_TEAM_EVENT_POLL_INTERVAL_MS`, `DISCORD_ROLE_FORWARDING_POLL_INTERVAL_MS`)

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
- Trigger: push/PR to main
- Node 18, pnpm 8
- Steps: install → lint → test
