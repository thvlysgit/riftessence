# Code Patterns

> Last updated: 2026-02-11  
> See also: `.copilot/patterns.md` (detailed canonical reference with code examples)

## API Patterns

- **Route registration**: Export default async function, register with prefix
- **JWT auth**: `getUserIdFromRequest()` from `middleware/auth.ts`
- **Validation**: `validateRequest(ZodSchema, request.body)` → `.success` / `.errors`
- **Error responses**: `Errors.invalidCredentials(reply, request)` or `reply.code(400).send({ error: '...' })`
- **Logging**: `request.log.error()` or `fastify.log.error()`
- **DB queries**: Direct Prisma with explicit `include`/`select`
- **Environment**: `import { env } from './env'` (Zod-validated)

## Frontend Patterns

- **Data fetching**: `fetch()` in `useEffect` with `getAuthHeader()`
- **State**: `useState` + `useEffect`, contexts for globals
- **Error display**: `showToast()` from `useGlobalUI()`
- **Auth header**: `getAuthHeader()` from `utils/auth.ts`
- **Theming**: CSS variables, never hardcoded Tailwind colors
- **i18n**: `t('key')` from `useLanguage()`
- **Component structure**: contexts → router → state → memo → effects → handlers → render
- **Loading**: `<LoadingSpinner />` while data loads

## Database Patterns

- **Queries**: Explicit `include`/`select` always
- **Transactions**: Rare, only for multi-write atomicity
- **Enums**: Prisma enums, mirrored in Zod validation schemas
- **IDs**: `cuid()` everywhere
