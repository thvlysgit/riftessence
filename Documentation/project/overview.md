# Project Overview

> Last updated: 2026-02-11

## What is RiftEssence?

RiftEssence is a League of Legends LFD (Looking For Duo) platform with social rating features. Players can find duo partners, join communities, manage Riot account verification, and rate other players.

**Brand name**: RiftEssence (riftessence.com)  
**Internal package prefix**: `@lfd/` (legacy name: "LFD Hub")  
**Root package**: `lfd-hub-monorepo`

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | ^5.4.0 |
| Frontend | Next.js (Pages Router) | 14.0.0 |
| UI Library | React | 18.2.0 |
| Styling | Tailwind CSS + CSS Variables | ^3.4.18 |
| Data Fetching | TanStack React Query | ^5.90.11 |
| Backend | Fastify | ^4.0.0 |
| ORM | Prisma Client | 4.16.2 |
| Database | PostgreSQL | 15 |
| Cache | Redis | 7 (optional) |
| Auth | @fastify/jwt + bcryptjs | Bearer tokens, 7-day expiry |
| Validation | Zod | ^3.22.0 |
| Discord Bot | discord.js | ^14.14.1 |
| Package Manager | pnpm workspaces | |
| Testing | Jest + ts-jest | |
| Containerization | Docker + Docker Compose | |
| CI | GitHub Actions | |

## Monorepo Structure

```
apps/web      → @lfd/web    — Next.js 14 frontend (Vercel deployment)
apps/api      → @lfd/api    — Fastify 4 REST API (Heroku/Docker deployment)
packages/types → @lfd/types — Shared Zod schemas
packages/ui   → @lfd/ui     — Shared React components (Button, Card, Tag)
discord-bot   → @riftessence/discord-bot — Standalone Discord bot (NOT in pnpm workspace)
prisma/       → Central database schema + migrations
```

## Key Facts

- API runs on port 3333, frontend uses `NEXT_PUBLIC_API_URL` env var
- Frontend is client-side only — no SSR, no getServerSideProps
- 5 themes: Classic Dark, Arcane Pastel, Nightshade, Infernal Ember, Radiant Light
- 2 languages: English (en) and French (fr)
- Admin detection: `user.badges.some(b => b.key === 'admin')`
- All IDs are `cuid()` strings
- Database has 18 models
- React Query is configured but underutilized (manual `fetch()` is the norm)
