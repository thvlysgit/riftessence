# Coding Conventions

> Last updated: 2026-02-11  
> See also: `.copilot/conventions.md` (detailed canonical reference)

## Naming

| What | Convention | Example |
|------|-----------|---------|
| Page files | lowercase | `feed.tsx`, `login.tsx` |
| Component files | PascalCase | `Navbar.tsx`, `LoadingSpinner.tsx` |
| Utility files | camelCase | `auth.ts`, `sanitize.ts` |
| Route files | lowercase plural | `posts.ts`, `communities.ts` |
| Boolean vars | `is`/`has`/`should` prefix | `isAdmin`, `hasVerifiedAccount` |
| Collections | plural | `posts`, `badges` |
| Event handlers | `handle` prefix | `handleSubmit`, `handleDelete` |
| True constants | SCREAMING_SNAKE | `API_URL`, `JWT_SECRET` |

## Imports (Informal Order)

1. External libraries (React, Next, Fastify)
2. Internal utils (auth, validation)
3. Database (Prisma)
4. Types
5. Components

## Error Handling

**API**: try/catch → `request.log.error()` → `reply.code(500).send({ error: 'User-friendly message' })`  
**Frontend**: try/catch → `showToast(getFriendlyErrorMessage(error), 'error')`

## TypeScript

- `strict: true` in tsconfig, but `any` usage accepted in route handlers
- Prefer typed when obvious, use `any` when Fastify types unclear
- No `@ts-ignore` — use proper type assertions

## Formatting

- Prettier configured (`.prettierrc`)
- ESLint configured (`.eslintrc.cjs`)
- No auto-format on commit
