# System Design

> Last updated: 2026-02-11

## Architecture Diagram

```
                          ┌─────────────────┐
                          │   Vercel (Web)   │
                          │  Next.js 14 SPA  │
                          │  Pages Router    │
                          │  Client-only     │
                          └────────┬─────────┘
                                   │ HTTP (REST)
                                   │ JWT Bearer Auth
                          ┌────────▼─────────┐
                          │  Heroku / Docker  │
                          │  Fastify 4 API   │
                          │  Port 3333       │
                          └───┬─────────┬────┘
                              │         │
                    ┌─────────▼──┐  ┌───▼──────────┐
                    │ PostgreSQL │  │  Redis (opt)  │
                    │  (Prisma)  │  │  Cache/Store  │
                    └────────────┘  └──────────────┘
                          ▲
                          │ REST API
              ┌───────────┴──────────┐
              │  Discord Bot         │
              │  (Standalone)        │
              │  discord.js v14      │
              └──────────────────────┘
```

## Data Flow

### Request → Response (Typical)
1. Frontend triggers `fetch(API_URL + '/api/...', { headers: getAuthHeader() })`
2. Fastify handler extracts JWT via `getUserIdFromRequest()`
3. Validates body with Zod (`validateRequest()`)
4. Queries PostgreSQL via Prisma
5. Returns JSON response
6. Frontend updates local state

### Authentication Flow
1. `POST /api/auth/login` → bcrypt verify → JWT (7-day)
2. Frontend stores in `localStorage('lfd_token')`
3. Protected requests: `Authorization: Bearer <token>`
4. Auto-refresh every 10 min when expiring soon
5. Alt auth: Discord OAuth, Riot verification

### Import Boundaries (STRICT)
```
apps/web  → CAN import  → @lfd/types, @lfd/ui
apps/web  → CANNOT      → apps/api, prisma, @prisma/client
apps/api  → CAN import  → @prisma/client, internal modules
apps/api  → CANNOT      → apps/web, @lfd/ui
discord-bot → HTTP only → Communicates with API via REST
```

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Pages Router (not App Router) | Predates stability, no SSR need |
| No service layer | Scale doesn't justify abstraction |
| localStorage JWT | Simple for SPA, XSS mitigated by CSP |
| Manual fetch() | Simpler than React Query for current needs |
| Single API (not microservices) | No independent scaling needs |
| REST (not GraphQL) | Sufficient for current queries |

See `.copilot/architecture.md` and `.copilot/boundaries.md` for detailed rationale.
