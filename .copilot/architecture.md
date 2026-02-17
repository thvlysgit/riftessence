# Architecture

## System Overview

RiftEssence is a League of Legends LFD (Looking For Duo) platform with social rating features. Built as a pnpm monorepo with a strict separation between frontend (Next.js) and backend (Fastify API).

**Core Purpose**: Connect League players, enable post creation/browsing, manage Riot account verification, support community/team features, and provide player ratings/feedback.

## Package Structure

```
apps/
  web/        Next.js 14 frontend (Pages Router)
  api/        Fastify 4 REST API
packages/
  types/      Zod schemas shared between web/api (NOT Prisma types)
  ui/         Basic React components (Button, Card, Tag)
```

## Responsibilities

### apps/web
- **Client-side only**: All rendering happens in the browser
- Pages Router: No SSR, no SSG, no server components
- Direct fetch() calls to API with hardcoded URL pattern
- JWT storage in localStorage, extracted manually in client code
- Routing via Next.js pages/ directory
- Context providers wrap entire app in _app.tsx:
  - AuthContext (user state + login/logout)
  - ThemeContext (theme switching)
  - GlobalUIProvider (toasts, modals)
  - QueryClientProvider (React Query - currently underutilized)

**NOT responsible for**:
- Business logic (belongs in API)
- Data validation beyond UI concerns (API validates with Zod)
- Server-side rendering or static generation

### apps/api
- Single Fastify instance exported from `src/index.ts` via `build()` function
- All routes registered as Fastify plugins with prefixes:
  - `/api/auth` → auth.ts (register, login, refresh)
  - `/api/auth/discord` → discord.ts (OAuth flow)
  - `/api/user` → user.ts (profile, Riot accounts, champion pool)
  - `/api` → posts.ts, lft.ts, communities.ts, discordFeed.ts
- Inline route handlers in `src/index.ts` for:
  - `/api/feedback` (ratings)
  - `/api/report` (user reports)
  - `/health`, `/health/db`, `/health/deep` (health checks)
- Environment validation on startup via `src/env.ts` (Zod-based)
- Prisma client initialized once in `src/prisma.ts`
- Riot API client in `src/riotClient.ts` (pure functions, no state)

**NOT responsible for**:
- UI rendering
- Frontend routing
- Browser-specific features

### packages/types
- Zod schemas defining API contracts
- NO Prisma-generated types (those live in @prisma/client)
- Manually mirrored subset of database models
- Used by frontend for validation (currently minimal usage)
- Example: `User`, `Post`, `RiotAccount` schemas

**NOT responsible for**:
- Database schema definition (in prisma/schema.prisma)
- API-specific validation logic (in apps/api/src/validation.ts)

### packages/ui
- Minimal shared components (Button, Card, Tag)
- Tailwind-based styling, no CSS modules
- NOT a comprehensive design system
- Transpiled by Next.js via `transpilePackages` config

**NOT responsible for**:
- Complex domain-specific components (those live in apps/web/components)
- State management or data fetching

## Data Flow

### Request → Response (Typical Flow)

1. **Frontend**: User action triggers fetch() in page/component
   ```tsx
   // apps/web/pages/feed.tsx
   const res = await fetch(`${API_URL}/api/posts?region=NA`, {
     headers: getAuthHeader() // Injects Bearer token from localStorage
   });
   ```

2. **API Receives**: Fastify route handler extracts JWT
   ```typescript
   // apps/api/src/routes/posts.ts
   const userId = await getUserIdFromRequest(request, reply);
   if (!userId) return; // Returns 401 if invalid
   ```

3. **Business Logic**: Route handler queries Prisma, applies rules
   ```typescript
   const posts = await prisma.post.findMany({
     where: { region: 'NA' },
     include: { author: { include: { riotAccounts: true } } }
   });
   ```

4. **Response**: Handler formats data, sends JSON
   ```typescript
   return reply.send({ posts: formattedPosts });
   ```

5. **Frontend**: Component updates state, re-renders
   ```tsx
   setAllPosts(data.posts);
   ```

### Authentication Flow

1. User submits credentials to `/api/auth/login`
2. API verifies via bcrypt, generates JWT (7-day expiry)
3. Frontend stores token in localStorage
4. Subsequent requests include `Authorization: Bearer <token>`
5. API middleware (`getUserIdFromRequest`) verifies JWT on each protected route
6. Token refresh endpoint `/api/auth/refresh` issues new token before expiry

### Riot Account Verification Flow

1. User initiates verification in profile page
2. API generates random icon ID, stores in database
3. User sets icon in League client
4. Background worker (`src/workers/riotVerifier.ts`) polls Riot API
5. On match, API marks account as verified
6. Frontend polls profile endpoint to show updated status

## External Dependencies

- **Riot API**: Summoner data, rank, match history (via `src/riotClient.ts`)
- **PostgreSQL**: Primary datastore (via Prisma)
- **Redis**: Optional session store and cache (configured, minimally used)
- **Discord OAuth**: Optional login alternative (configured, fully functional)
- **Cloudflare Turnstile**: Optional CAPTCHA on registration (configured, optional)

## Non-Goals

This system does NOT:
- Provide real-time features (no WebSockets, no subscriptions)
- Support mobile apps (web-only, responsive design)
- Handle payments or subscriptions
- Integrate with game client directly
- Provide in-game overlays
- Store chat/messaging history (Discord integration delegates this)
- Support multiple games (League of Legends only)
- Provide server-side rendering (Next.js used as SPA)

## Key Design Decisions

### Why Pages Router, not App Router?
- Codebase predates App Router stability
- No SSR requirements → Pages Router sufficient
- Migration path exists but not prioritized

### Why inline route handlers vs service layer?
- Current scale doesn't justify abstraction
- Business logic embedded in route handlers (pattern established)
- **Known debt**: As complexity grows, service extraction recommended

### Why localStorage for JWT?
- Simple, works for SPA use case
- XSS risk mitigated by CSP (configured in API)
- No httpOnly cookies due to CORS + domain separation in dev

### Why Zod in both packages/types and apps/api/src/validation.ts?
- `packages/types`: Minimal schemas for frontend consumption
- `apps/api/src/validation.ts`: Full request validation schemas
- **Inconsistency**: Types package underutilized, most validation in API

## Scalability Boundaries

Current architecture supports:
- ~1000 concurrent users (single API instance)
- ~100 requests/second (rate-limited per user)
- Database queries optimized with indexes (e.g., Post region+role+vc)

Known bottlenecks:
- No horizontal scaling (single Fastify instance)
- Prisma connection pool (default limits)
- Riot API rate limits (regional, per-endpoint)
- No caching layer for Riot data (Redis configured but minimal usage)

## Deployment Model

- **Development**: Docker Compose (api, db, redis services)
- **Production** (inferred from vercel.json): 
  - Frontend on Vercel
  - API likely containerized separately
  - Database hosted externally (connection string in env)
