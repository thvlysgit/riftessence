# Implementation Summary (Critical/High Fixes)

## Backend (API)
- Added environment validation (`apps/api/src/env.ts`) using Zod with fail-fast errors.
- Added JWT support via `@fastify/jwt`; register/login now issue Bearer tokens.
- Introduced `getUserIdFromRequest` helper and enforced JWT on feedback/report routes and post create/delete routes.
- Feedback now validates input with `RatingSchema`, requires verified Riot account (unless developer badge), and checks shared matches via `MatchHistory` before allowing submissions.
- Posts endpoint now supports limit/offset pagination and returns pagination metadata (`hasMore`).
- CORS origin uses validated `ALLOW_ORIGIN` instead of permissive default.

## Frontend (Web)
- Added safe auth utilities and storage helpers (JWT localStorage access is SSR-safe).
- Feed page now uses server-side pagination (limit/offset, hasMore, load more button) and sends auth headers where needed.
- Register page syntax fixed; JWT token handling wired through AuthContext.
- Installed testing dev deps and jest-dom matchers for test type safety.

## Files of Interest
- `apps/api/src/index.ts` (JWT, feedback/report auth, env use)
- `apps/api/src/routes/posts.ts` (pagination + JWT guard on create/delete)
- `apps/api/src/env.ts` (env validation)
- `apps/web/pages/feed.tsx` (server pagination)
- `apps/web/utils/auth.ts`, `apps/web/utils/storage.ts`
- `apps/web/__tests__/create.test.tsx` (jest-dom import)

## Outstanding / Caveats
- Root `npx tsc --noEmit` still surfaces unrelated issues: duplicate `prisma` const in tests, Card children prop typing, and PrismaClient enums in `prisma/seed.ts`. Web/API scoped builds pass after test deps install.
- Consider applying JWT auth to any remaining protected routes that still trust `x-user-id` or body userId.
- Add Jest setup to auto-import `@testing-library/jest-dom` if more tests are added.

## Quick Start
- API: `cd apps/api && pnpm dev`
- Web: `cd apps/web && pnpm dev`

## Next Steps
1) Clean up root TS errors (prisma test var collisions, Card children typing, seed enums import).
2) Extend JWT verification to any other state-changing routes.
3) Add automated tests for feedback match-history guard and feed pagination.
