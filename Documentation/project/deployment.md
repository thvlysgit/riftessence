# Deployment

> Last updated: 2026-02-11

See also:
- Root-level `HEROKU_DEPLOYMENT.md` (legacy — to be consolidated here)
- Root-level `RASPBERRY_PI_DEPLOYMENT.md` (legacy — to be consolidated here)

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

- `docker-compose.yml` — 3 services: db (PostgreSQL 15), redis (Redis 7), api
- `apps/api/Dockerfile` — Node 20 base, pnpm via corepack, prisma generate, TypeScript build

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
- Trigger: push/PR to main
- Node 18, pnpm 8
- Steps: install → lint → test
