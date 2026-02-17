# Anti-Patterns

> Last updated: 2026-02-15  
> See also: `.copilot/anti-patterns.md` (detailed canonical reference with rationale)

## Intentionally Avoided

- **No service layer** — Direct Prisma in route handlers
- **No repository pattern** — Prisma provides type-safe queries
- **No GraphQL** — REST sufficient
- **No SSR/SSG** — All data user-specific
- **No global Redux/Zustand** — Context + local state
- **No CSS Modules / CSS-in-JS** — Tailwind + CSS variables
- **No form libraries** — Controlled inputs with useState
- **No microservices** — Single API
- **No event sourcing / CQRS** — CRUD sufficient

## Rules to Follow

1. Do NOT bypass Zod validation
2. Do NOT store secrets in code
3. Do NOT expose internal errors to users
4. Do NOT query database in loops
5. Do NOT mutate props in React
6. Do NOT use `@ts-ignore`
7. Do NOT add dependencies without consideration
8. Do NOT mix Pages Router + App Router
9. Do NOT store business logic in frontend
10. Do NOT use global mutable state
11. Do NOT select fields that don't exist in Prisma schema — always verify relations (e.g., `profileIconId` is on RiotAccount, not User)
12. **CRITICAL**: Do NOT use `prisma.user.findFirst()` or query params as auth fallback — ALWAYS use `getUserIdFromRequest()` for user-specific endpoints13. **CRITICAL**: Do NOT forget `getAuthHeader()` on protected frontend API calls — endpoints requiring admin badges or JWT auth will fail with 401/403 without Authorization header