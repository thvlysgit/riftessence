# Anti-Patterns

## Patterns Intentionally Avoided

### No Service Layer Abstraction

**Avoided pattern**: Separate service classes wrapping Prisma queries
```typescript
// ❌ NOT DONE (intentionally)
class UserService {
  async findById(id: string) { return prisma.user.findUnique({...}); }
  async updateProfile(id: string, data: any) { ... }
}
```

**Current pattern**: Direct Prisma calls in route handlers
```typescript
// ✅ CURRENT APPROACH
fastify.get('/user/:id', async (request, reply) => {
  const user = await prisma.user.findUnique({ where: { id: request.params.id } });
  return reply.send(user);
});
```

**Why avoided**: 
- Added complexity without clear benefit at current scale
- Business logic is simple enough for inline implementation
- No shared logic across routes that would benefit from extraction

**When to reconsider**: If routes start duplicating complex business logic

### No Repository Pattern

**Avoided pattern**: Repository abstraction over Prisma
```typescript
// ❌ NOT DONE
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

**Current pattern**: Prisma client used directly everywhere
```typescript
import prisma from '../prisma';
const user = await prisma.user.findUnique({...});
```

**Why avoided**:
- Prisma already provides type-safe query builder
- Repository would be thin wrapper adding no value
- Testability can be achieved via Prisma mocking if needed

### No GraphQL

**Avoided pattern**: GraphQL API instead of REST
**Current pattern**: REST endpoints with JSON responses

**Why avoided**:
- REST sufficient for current use cases
- No complex nested queries requiring GraphQL flexibility
- Simpler authentication with JWT + REST
- Smaller bundle size (no Apollo/GraphQL clients)

**Evidence**: No GraphQL dependencies in package.json

### No Server-Side Rendering (SSR)

**Avoided pattern**: Next.js getServerSideProps or App Router
```typescript
// ❌ NOT DONE
export async function getServerSideProps(context) {
  const posts = await fetchPosts();
  return { props: { posts } };
}
```

**Current pattern**: Client-side fetch in useEffect
```typescript
useEffect(() => {
  fetch(`${API_URL}/api/posts`).then(...)
}, []);
```

**Why avoided**:
- All data user-specific (requires authentication)
- No SEO requirements (logged-in platform)
- Simpler deployment (static frontend + API)
- API and frontend can scale independently

**Evidence**: No getServerSideProps or getStaticProps found in codebase

### No ORM Abstraction Over Prisma

**Avoided pattern**: Custom query builders, raw SQL utilities
**Current pattern**: Pure Prisma queries throughout

**Why avoided**:
- Prisma provides sufficient type safety and query capabilities
- No need for database-agnostic layer (PostgreSQL only)
- Raw SQL only for migrations (Prisma handles schema)

**Exception**: Direct SQL in migration files (prisma/migrations/*)

### No Monolithic Context Providers

**Avoided pattern**: Single mega-context with all app state
```typescript
// ❌ NOT DONE
<AppContext.Provider value={{ user, posts, settings, theme, ... }}>
```

**Current pattern**: Separate focused contexts
```typescript
<ThemeProvider>
  <AuthProvider>
    <GlobalUIProvider>
      {/* ... */}
    </GlobalUIProvider>
  </AuthProvider>
</ThemeProvider>
```

**Why avoided**:
- Performance (unnecessary re-renders)
- Maintainability (each context has single responsibility)
- Separation of concerns

### No Global Redux/Zustand Store

**Avoided pattern**: Centralized state management library
**Current pattern**: React Context + local component state

**Why avoided**:
- Most state is local to pages/components
- Global state limited to auth, theme, UI feedback
- React Context sufficient for current needs
- Simpler mental model

**Evidence**: No Redux/Zustand/MobX in package.json

### No Middleware Chains for Authorization

**Avoided pattern**: Fastify preHandler hooks for auth
```typescript
// ❌ NOT DONE
fastify.addHook('preHandler', async (request, reply) => {
  await requireAuth(request, reply);
});
```

**Current pattern**: Explicit auth check at route level
```typescript
fastify.get('/protected', async (request, reply) => {
  const userId = await getUserIdFromRequest(request, reply);
  if (!userId) return; // 401 already sent
  // ... handler logic
});
```

**Why avoided**:
- Explicit > implicit (clear which routes require auth)
- Easier to customize per-route (some routes allow optional auth)
- Less "magic" middleware behavior

**When to reconsider**: If auth logic becomes inconsistent across routes

### No Shared Database Models Between Frontend/API

**Avoided pattern**: Importing Prisma types in frontend
```typescript
// ❌ NOT DONE in apps/web
import { User, Post } from '@prisma/client';
```

**Current pattern**: Frontend defines own types (inline or @lfd/types)
```typescript
type User = { id: string; username: string; ... };
```

**Why avoided**:
- Frontend shouldn't know about database schema
- API response shape differs from DB models (transformations)
- Decouples frontend from backend implementation details

**Known inconsistency**: @lfd/types exists but underutilized (frontend prefers inline types)

### No Code Generation from OpenAPI Spec

**Avoided pattern**: Auto-generate TypeScript clients from Swagger
**Current pattern**: Manual fetch() calls with inline types

**Why avoided**:
- Simple API doesn't justify code generation complexity
- Inline types faster to iterate during development
- No strong type contract enforced between API and frontend

**Trade-off accepted**: Manual type definitions can drift from API

### No Micro-Frontends

**Avoided pattern**: Separate apps for different sections (admin, user, public)
**Current pattern**: Single Next.js app with all pages

**Why avoided**:
- Shared UI components (Navbar, modals, contexts)
- Single authentication flow
- Small enough codebase to manage in one app

**Evidence**: Single apps/web directory, no workspace for separate frontends

### No Microservices

**Avoided pattern**: Separate services for posts, users, communities, etc.
**Current pattern**: Single Fastify API with route groups

**Why avoided**:
- No independent scaling requirements per domain
- Shared database (Prisma client)
- No team boundaries requiring separate deployments
- Lower operational complexity

**Exception**: discord-bot is separate (different runtime concerns)

### No Event Sourcing

**Avoided pattern**: Event log as source of truth
**Current pattern**: CRUD operations on normalized database

**Why avoided**:
- No audit trail requirements (except admin actions)
- Simple state changes don't need event replay
- Complexity not justified by use case

**Partial implementation**: Admin actions logged in AuditLog model

### No CQRS (Command Query Responsibility Segregation)

**Avoided pattern**: Separate read/write models
**Current pattern**: Same Prisma models for reads and writes

**Why avoided**:
- Read/write patterns not divergent enough
- No performance bottleneck from shared models
- Simpler architecture

### No Serverless Functions

**Avoided pattern**: API routes as separate Lambda functions
**Current pattern**: Single long-running Fastify server

**Why avoided**:
- Cold start latency unacceptable for interactive app
- Shared Prisma connection pool benefits performance
- Simpler deployment (Docker container)

**Evidence**: apps/api/Dockerfile, docker-compose.yml

### No Client-Side Routing Libraries (Beyond Next.js)

**Avoided pattern**: React Router, Reach Router
**Current pattern**: Next.js Pages Router

**Why avoided**:
- Next.js provides routing out of the box
- File-based routing simpler than config
- Integrates with Next.js features (Link, prefetching)

### No CSS-in-JS Libraries

**Avoided pattern**: Styled Components, Emotion, Stitches
**Current pattern**: Tailwind CSS with inline classes

**Why avoided**:
- Tailwind provides utility-first approach
- No need for dynamic style generation
- Smaller runtime bundle (no CSS-in-JS overhead)

**Exception**: Inline style={{ }} for CSS variables (theming)

### No Form Libraries

**Avoided pattern**: React Hook Form, Formik
**Current pattern**: Controlled inputs with useState

**Why avoided**:
- Forms are simple (login, register, profile edit)
- No complex validation UI needed
- Direct control over form state

**Trade-off**: Manual error handling, no field-level validation UX

### No Date Manipulation Libraries

**Avoided pattern**: Moment.js, Day.js, date-fns
**Current pattern**: Native Date objects, toISOString()

**Why avoided**:
- Minimal date formatting needs
- Native APIs sufficient for current use cases
- Smaller bundle size

**Evidence**: No date libraries in package.json

## Patterns That Look Tempting But Discouraged

### Do Not Add ORMs Besides Prisma

**Why**: 
- Prisma is sufficient and type-safe
- Multiple ORMs = confusion and maintenance burden
- No use case for database-agnostic code

**If you need raw SQL**: Use Prisma.$queryRaw for specific cases

### Do Not Add State Management Libraries Yet

**Why**:
- React Context + local state handles current needs
- Redux/Zustand adds boilerplate without clear benefit
- Most state is server-driven (fetch from API)

**Reconsider when**: Complex client-side state machines emerge (e.g., multi-step forms, offline sync)

### Do Not Mix Pages Router and App Router

**Why**:
- Codebase currently uses Pages Router
- Mixing routing paradigms = confusion
- No clear migration path defined

**If migrating**: Do full migration, not incremental

### Do Not Store Business Logic in Frontend

**Why**:
- Backend enforces rules (permissions, validation)
- Frontend logic can be bypassed (client-side only)
- Duplication of logic between API and web

**Exception**: UI-only logic (form validation UX, animations)

### Do Not Use Global Mutable State

**Why**:
- React re-renders break with external mutation
- Hard to debug side effects
- Context + useState provide predictable state

**Current**: All mutable state in React components or contexts

### Do Not Add WebSockets Without Clear Use Case

**Why**:
- HTTP sufficient for current interactions
- WebSockets add operational complexity
- No real-time requirements (feed is pull-based)

**Reconsider when**: Chat features, live notifications needed

### Do Not Inline Critical Business Logic

**Why**:
- Should be tested independently
- Risk of duplication across routes

**Current state**: Some business logic inline in route handlers (acceptable at current scale)
**Future**: Extract to utility functions when patterns emerge

### Do Not Over-Optimize Prematurely

**Why**:
- Codebase maintainability > micro-optimizations
- No performance bottlenecks identified

**Examples of premature optimization to avoid**:
- Memoizing every component
- Adding caching without measuring
- Denormalizing database for reads

**Current**: Optimization added reactively (e.g., database indexes after analysis)

### Do Not Create Utility Files for Single-Use Functions

**Why**:
- Over-abstraction reduces code locality
- Harder to understand flow

**Current**: Utilities exist for truly shared logic (auth, validation, cache)

### Do Not Add ESLint Rules That Fight TypeScript

**Why**:
- Current config disables `@typescript-eslint/no-explicit-any` (pragmatic choice)
- Fighting strict types slows development

**Current approach**: Gradually improve types, don't block on perfection

### Do Not Use CSS Modules

**Why**:
- Tailwind provides utility classes
- CSS variables handle theming
- No scoping issues (Tailwind's design)

**Current**: No .module.css files found

### Do Not Add Component Libraries (Material-UI, Chakra, etc.)

**Why**:
- Custom design system desired (theme variables)
- Heavy dependencies for small component needs
- Tailwind sufficient for styling

**Current**: Minimal packages/ui with custom components

### Do Not Create Parallel Type Systems

**Why**:
- @lfd/types exists but underutilized
- Frontend defines inline types
- Risk of drift and confusion

**Current inconsistency**: Not an anti-pattern per se, but avoid creating third type definition location

## Historical Scars (Inferred)

### Inconsistent Type Usage Suggests Past Rewrites

**Evidence**:
- @lfd/types package exists but rarely imported
- Frontend prefers inline type definitions
- Heavy `any` usage in API despite strict mode

**Implication**: Early architecture attempted shared types, abandoned for pragmatism

**Lesson**: Don't enforce shared types if API/frontend contracts naturally differ

### Multiple Auth Helper Functions

**Evidence**:
- Shared `getUserIdFromRequest` in middleware/auth.ts
- Inline duplicates in several route files
- Inconsistent usage

**Implication**: Attempted to centralize auth, but not all routes migrated

**Lesson**: When refactoring, commit fully or don't start (partial migrations create confusion)

### React Query Configured But Unused

**Evidence**:
- QueryClient in _app.tsx
- No useQuery/useMutation hooks found in pages

**Implication**: Considered React Query, decided manual fetch() simpler

**Lesson**: Don't add libraries "for future use" — add when needed

### Console.log Pervasive in API

**Evidence**:
- Structured logging utilities exist (middleware/logger.ts)
- Most code uses console.log or fastify.log.error
- Inconsistent adoption

**Implication**: Logging utilities added after initial implementation

**Lesson**: Logging strategy should be established early, hard to retrofit

### Docker Compose Not Fully Utilized

**Evidence**:
- Redis configured but minimally used (cache utilities exist, few call sites)
- Health check endpoints added recently (P0 fixes)

**Implication**: Infrastructure added before usage patterns clear

**Lesson**: Add infrastructure incrementally as needs emerge

## Patterns to Actively Avoid in Future Work

1. **Do not bypass Zod validation** — always validate request bodies
2. **Do not store secrets in code** — pre-commit hook enforces .env exclusion
3. **Do not expose internal errors to frontend** — use error helpers
4. **Do not query database in loops** — use Prisma's include/select instead
5. **Do not mutate props in React** — always use state setters
6. **Do not skip TypeScript errors with @ts-ignore** — fix or use proper type assertion
7. **Do not add dependencies without discussion** — monorepo package.json is shared
8. **Do not mix authorization logic** — middleware/auth.ts is canonical
9. **Do not hardcode configuration** — use env.ts validation
10. **Do not skip error handling** — every fetch() and Prisma call should have try/catch
