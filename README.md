# RiftEssence

RiftEssence is a League of Legends LFD/LFT platform for finding duo partners, joining communities, managing teams and scrims, linking Riot/Discord accounts, and sharing posts through Discord.

The canonical project memory lives in [Documentation/README.md](Documentation/README.md). Start there for architecture, API contracts, page inventory, deployment notes, and the changelog.

## Stack

- `apps/web` - Next.js 14 Pages Router frontend
- `apps/api` - Fastify REST API
- `discord-bot` - standalone discord.js bot
- `packages/types` - shared Zod/TypeScript schemas
- `prisma` - PostgreSQL schema and migrations

## Common Commands

```powershell
pnpm install
pnpm --filter @lfd/web dev
pnpm --filter @lfd/api dev
pnpm test
pnpm --filter @lfd/web build
pnpm --filter @lfd/api build
```

## Notes

- Use `pnpm` from the repository root.
- Frontend reads `NEXT_PUBLIC_API_URL` for API calls.
- API runs on port `3333` by default.
- The Discord bot is not part of the pnpm workspace; see [discord-bot/README.md](discord-bot/README.md).
