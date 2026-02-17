# Backend Routes

> Last updated: 2026-02-12  
> Source: `apps/api/src/routes/`, `apps/api/src/index.ts`

## Route Modules

| File | Prefix | Endpoints |
|------|--------|-----------|
| `routes/auth.ts` | `/api/auth` | Register, login, set-password, refresh token |
| `routes/discord.ts` | `/api/auth/discord` | Discord OAuth flow (redirect, callback) |
| `routes/user.ts` | `/api/user` | Profile CRUD, Riot accounts, champion pool, user search |
| `routes/posts.ts` | `/api` | Duo posts CRUD with pagination + filtering |
| `routes/lft.ts` | `/api` | LFT posts (team + player) CRUD |
| `routes/communities.ts` | `/api` | Community CRUD, join/leave, membership |
| `routes/discordFeed.ts` | `/api` | Discord feed channel management, post ingestion/mirroring |
| `routes/ads.ts` | `/api` | Ad management (admin only) |
| `routes/blocks.ts` | `/api/user` | Block/unblock users |
| `routes/leaderboards.ts` | `/api` | Leaderboard queries |
| `routes/chat.ts` | `/api/chat` | Chat conversations, messages, unread counts |

## Inline Routes (`index.ts`)

These routes are still defined directly in the main `index.ts` file (~1057 lines):
- `POST /api/feedback` — Submit rating (stars + moons)
- `POST /api/report` — Report a user
- `GET /health`, `/health/db`, `/health/deep` — Health checks
- Admin operations (ban, badge management, account administration)
- Riot account verification endpoints
- Notification CRUD

**Known debt**: These should be extracted into separate route modules.

## Route Registration Pattern

```typescript
// routes/example.ts
export default async function exampleRoutes(fastify: FastifyInstance) {
  fastify.get('/endpoint', handler);
  fastify.post('/endpoint', handler);
}

// index.ts
await server.register(exampleRoutes, { prefix: '/api' });
```
