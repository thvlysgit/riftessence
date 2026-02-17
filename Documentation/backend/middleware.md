# Backend Middleware

> Last updated: 2026-02-11  
> Source: `apps/api/src/middleware/`

## Auth (`middleware/auth.ts`)

- `getUserIdFromRequest(request, reply)` — Extracts and verifies JWT from `Authorization: Bearer <token>` header
- Returns `userId` string or sends 401 and returns null
- **Canonical** auth function — all protected routes must use this

**Known issue**: Some routes duplicate this logic inline instead of importing the shared version.

## Errors (`middleware/errors.ts`)

- `Errors` module with standardized error helpers:
  - `Errors.invalidCredentials(reply, request)`
  - `Errors.unauthorized(reply, request, message)`
  - `Errors.forbidden(reply, request)`
  - `Errors.notFound(reply, request, resource)`
  - etc.
- Standard response format: `{ error: string, code?: string, timestamp?: string }`

**Mixed usage**: Some routes use Errors helpers, others use direct `reply.code().send()`.

## Logger (`middleware/logger.ts`)

- `logError(request, message, error, context)` — Structured error logging
- `logInfo(request, message, context)` — Structured info logging
- `logWarning(request, message, context)` — Structured warning logging

**Predominant pattern**: Most code uses `request.log.error()` / `fastify.log.error()` directly. Custom logger utilities exist but are underutilized.
