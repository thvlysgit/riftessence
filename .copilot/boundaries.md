# Boundaries

## Import Rules

### Forbidden Cross-Package Imports

**NEVER import API code in frontend**:
```typescript
// ❌ FORBIDDEN in apps/web
import prisma from '../../api/src/prisma';
import { getUserIdFromRequest } from '../../api/src/middleware/auth';
```

**NEVER import frontend code in API**:
```typescript
// ❌ FORBIDDEN in apps/api
import { AuthContext } from '../../web/contexts/AuthContext';
import Navbar from '../../web/components/Navbar';
```

**NEVER import between apps directly**:
- apps/web → apps/api: NO
- apps/api → apps/web: NO
- Communication ONLY via HTTP requests

### Allowed Workspace Dependencies

**Frontend CAN import**:
```typescript
// ✅ ALLOWED in apps/web
import { User, Post } from '@lfd/types';
import { Button, Card } from '@lfd/ui';
```

**API MUST NOT import packages/types or packages/ui**:
- API uses Prisma-generated types, not @lfd/types
- API has no UI concerns
- **Current state**: API doesn't import from packages/* (verified)

### Within-Package Import Rules

**API internal structure**:
```typescript
// ✅ ALLOWED in apps/api/src/routes/*.ts
import prisma from '../prisma';
import { getUserIdFromRequest } from '../middleware/auth';
import { validateRequest, RegisterSchema } from '../validation';
import { logError } from '../middleware/logger';
```

**Web internal structure**:
```typescript
// ✅ ALLOWED in apps/web/pages/*.tsx
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeader } from '../utils/auth';
import Navbar from '../components/Navbar';
```

## Server vs Client Boundaries

### Server-Only Code (API)

**Enforced by deployment architecture**:
- Fastify server runs in Node.js environment
- Direct database access via Prisma
- Environment variables via process.env (server-side)
- bcrypt password hashing
- JWT signing/verification
- Riot API calls (with API key)

**NEVER expose in frontend**:
- Database connection strings
- API keys (Riot, Discord, Turnstile secret)
- JWT signing secret
- Hashed passwords
- Internal business logic that validates permissions

### Client-Only Code (Web)

**Enforced by Next.js Pages Router**:
- All code runs in browser (no SSR in this project)
- localStorage access
- window/document APIs
- React hooks and component lifecycle
- Client-side routing via Next.js router

**NEVER accessible from API**:
- Browser APIs (fetch is used, but Node.js compatible)
- React context providers
- User session state (stored in browser)

### Environment Variable Boundary

**API environment variables** (server-side only):
```
DATABASE_URL
JWT_SECRET
RIOT_API_KEY
DISCORD_CLIENT_SECRET
TURNSTILE_SECRET_KEY
```

**Web environment variables** (exposed to browser):
```
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_TURNSTILE_SITE_KEY
```

**Rule**: Only NEXT_PUBLIC_* variables reach the browser. Never prefix secrets with NEXT_PUBLIC_*.

## Data Flow Boundaries

### Frontend → Backend ONLY via HTTP

**Enforced pattern**:
```typescript
// apps/web/pages/feed.tsx
const res = await fetch(`${API_URL}/api/posts`, {
  method: 'GET',
  headers: getAuthHeader()
});
```

**NEVER**:
- Direct Prisma calls from frontend
- Shared in-memory state
- RPC-style function calls
- gRPC or other protocols (REST only)

### Authentication Token Boundary

**Token flows**:
1. API generates JWT after login → sends in response body
2. Frontend stores in localStorage
3. Frontend includes in Authorization header
4. API verifies on each request

**NEVER**:
- Store JWT in cookies (current architecture choice)
- Share JWT between users/devices without re-authentication
- Expose JWT secret to frontend
- Parse JWT in frontend for authorization decisions (only for display)

## Database Access Boundary

**ONLY API may access database**:
- All Prisma queries in apps/api/src/**
- Frontend has ZERO database access
- prisma/schema.prisma is not imported by frontend

**Enforced by**:
- Network isolation (frontend can't reach DB host)
- No database credentials in frontend env
- Prisma client only instantiated in API

## Third-Party Service Boundaries

### Riot API

**ONLY accessible from API**:
- API key stored server-side
- Rate limiting enforced by API
- Caching layer (if implemented) on API side

**Reference**: `apps/api/src/riotClient.ts` (pure functions, no global state)

### Discord OAuth

**Split responsibility**:
- API handles token exchange (client secret required)
- Frontend initiates OAuth flow (redirect URL)
- Frontend receives authorization code, sends to API

**Reference**: `apps/api/src/routes/discord.ts`, `apps/web/pages/authenticate.tsx`

### Redis Cache

**ONLY accessible from API**:
- Connection string server-side
- Cache keys internal to API implementation
- No frontend awareness of cache

**Reference**: `apps/api/src/utils/cache.ts`

## Package Ownership Rules

### packages/types

**Owned by**: Shared contract between web and API
**Modified when**: API contract changes
**Consumers**: apps/web (via @lfd/types import)
**NOT consumed by**: apps/api (uses Prisma types instead)

**Current inconsistency**: Underutilized, frontend mostly defines types inline

### packages/ui

**Owned by**: Frontend design system (minimal)
**Modified when**: Shared UI components needed
**Consumers**: apps/web (via @lfd/ui import)
**NOT consumed by**: apps/api

### apps/web

**Owned by**: Frontend team
**Modified when**: UI/UX changes, new pages, client-side features
**Dependencies**: packages/types, packages/ui, external libraries (React, Next.js)

**Must not export**: Nothing (apps don't export, they consume)

### apps/api

**Owned by**: Backend team
**Modified when**: Business logic changes, new endpoints, integrations
**Dependencies**: Prisma, Fastify, external services (Riot API, Discord)

**Must not export**: Nothing outside the API surface (HTTP endpoints)

## Migration Boundaries (Future-Proofing)

### If moving to App Router (Next.js 13+)

**Preserve**:
- API remains separate
- HTTP communication boundary
- JWT authentication flow

**Changes**:
- Server Components would have server-side context
- Consider using Next.js API routes OR keep Fastify separate
- Environment variable boundary still applies

### If adding real-time features

**Preserve**:
- REST API for state-changing operations
- Database as single source of truth

**Add**:
- WebSocket server (likely separate from Fastify or via plugin)
- Event-driven boundary between REST and WebSocket
- Consider keeping WebSocket read-only (subscriptions), writes via REST

## Dependency Injection Boundaries

**Current state**: No formal DI container

**Observed patterns**:
- Prisma client imported as singleton
- Redis client initialized lazily
- Fastify instance passed to route plugins
- Frontend contexts use React Context API

**Rule**: Do not introduce global mutable state outside these patterns
- NO global variables for business logic
- NO singleton services beyond infrastructure (DB, cache)
- Stateless route handlers preferred

## TypeScript Strict Mode Boundary

**Current state** (from tsconfig.json):
```json
{
  "strict": true
}
```

**Observed reality**:
- Heavy use of `any` type in API route handlers
- Type assertions common: `request.body as { field: string }`
- ESLint disables `@typescript-eslint/no-explicit-any`

**Known debt**: Strict mode enabled but not enforced consistently

**Boundary rule**: New code should gradually reduce `any` usage, but don't block on perfect types

## Testing Boundaries

**Unit tests**:
- packages/types: Test Zod schemas in isolation
- Future: API routes should be testable via supertest/similar
- Future: Frontend components via React Testing Library

**Integration tests**:
- API + Database (Prisma)
- Frontend + API (mocked fetch)

**E2E tests**:
- None currently
- Would span all boundaries (browser → API → DB)

**Rule**: Tests MUST NOT leak abstractions
- Frontend tests mock API calls (don't start real API)
- API tests use test database (don't hit production)
- Shared types tested in isolation (no DB/API dependency)

## Error Boundary

**API errors stay internal**:
```typescript
// ❌ NEVER expose in API response
{ error: 'Database query failed: column "x" does not exist' }

// ✅ ALWAYS return user-friendly message
{ error: 'Failed to load posts. Please try again.' }
```

**Detailed errors logged server-side**:
```typescript
request.log.error({ err, userId, query }, 'Database query failed');
```

**Reference**: `apps/api/src/middleware/errors.ts` (Errors utility)

## Deployment Boundaries

**Frontend deployment**:
- Vercel (inferred from vercel.json)
- Static assets + Next.js middleware
- NEXT_PUBLIC_API_URL points to API host

**API deployment**:
- Dockerized (apps/api/Dockerfile exists)
- Exposed on port 3333 (configurable via env.PORT)
- DATABASE_URL points to PostgreSQL host

**Database**:
- Separate PostgreSQL instance
- Migrations via Prisma CLI
- No direct access from frontend network

**Rule**: Frontend and API can scale independently, must communicate via public HTTP endpoints

## Rate Limiting Boundary

**Enforced at API level**:
- 500 requests/15min (anonymous)
- 1000 requests/15min (authenticated)
- Certain endpoints exempt (health checks, auth)

**Reference**: `apps/api/src/index.ts` (rate limit configuration)

**Frontend has no rate limiting** (API enforces)

## CORS Boundary

**API CORS policy**:
```typescript
await server.register(cors, {
  origin: env.ALLOW_ORIGIN === 'true' ? true : env.ALLOW_ORIGIN,
  credentials: true
});
```

**Configured per environment**:
- Development: ALLOW_ORIGIN=true (permissive)
- Production: ALLOW_ORIGIN set to frontend domain

**Rule**: Frontend MUST be on allowed origin list to make authenticated requests
