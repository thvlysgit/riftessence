# 2026-04-16 Audit Findings

> Last updated: 2026-04-16
> Audit scope: production stability checks, architecture boundary cleanup, and build validation
> Audited by: Copilot session with repository-level verification

## Executive Summary

This audit session focused on production reliability and architecture hygiene. The main architecture objective (remove web dependency on API-owned UI components) is complete and validated by production build checks.

### Outcome Snapshot

- Architecture boundary cleanup: completed
- Web production build: passing
- API build: passing
- Type checks: passing
- ARM runtime crash hardening for Prisma engine: completed
- Remaining risks: medium and low severity items listed below

## Findings

## 0) Theme parity and personality drift between first paint and runtime

- Severity: Medium
- Status: Resolved
- Description:
  - Theme definitions were split across runtime and pre-hydration paths, and onboarding only exposed a subset of available themes.
  - This created inconsistent first paint behavior and limited personality differentiation across user-selectable themes.
- Resolution:
  - Introduced a shared theme registry consumed by both runtime context and `_document` bootstrap.
  - Expanded onboarding theme selection to all 9 themes.
  - Added global shell motif, heading typography, and ambient motion tokens with reduced-motion safeguards.
- Validation:
  - `pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit` passes.
  - `pnpm --filter @lfd/web lint` passes.
  - `pnpm --filter @lfd/web build` passes.

## 1) Web to API component boundary drift

- Severity: High
- Status: Resolved
- Description:
  - Web pages imported UI components from apps/api/components. This violated ownership boundaries and made the web app depend on API internals.
- Resolution:
  - Shared UI components were moved to apps/web/components.
  - Web imports were rewired to use @components/* aliases.
  - Old apps/api/components was removed.
- Validation:
  - No remaining api/components imports in apps/web/pages or apps/web/components source paths.

## 2) Next production build regression during migration

- Severity: High
- Status: Resolved
- Description:
  - next build failed with module resolution errors (fs, worker_threads, babel-plugin-macros) in a styled-jsx import chain rooted at profile page build path.
- Resolution:
  - Added a targeted webpack alias for client-only in apps/web/next.config.js.
  - Added apps/web/src/shims/client-only.js shim.
- Validation:
  - pnpm --filter @lfd/web build now completes successfully.

## 3) TypeScript config deprecation warnings

- Severity: Medium
- Status: Open
- Description:
  - Compiler warnings indicate deprecated use of moduleResolution=node10 and baseUrl behavior in upcoming TypeScript 7.
- Impact:
  - No immediate runtime failure, but future upgrade friction is likely.
- Recommendation:
  - Create a dedicated TS config modernization task for root and apps/web tsconfig files.

## 4) High-frequency polling in user-facing flows

- Severity: Medium
- Status: Partially mitigated
- Description:
  - Chat, notifications, and some profile-adjacent flows still use frequent polling patterns that can amplify load during traffic spikes.
- Impact:
  - Unnecessary backend load and noisy incident behavior when API is degraded.
- Mitigation:
  - ChatWidget now uses adaptive timeout-based polling with page-visibility throttling and capped backoff instead of fixed 2s/5s/10s intervals.
  - Notifications "mark all as read" now uses one batch API call instead of one PATCH per unread notification.
- Recommendation:
  - Continue applying adaptive polling or event-driven updates to remaining profile-adjacent flows.

## 5) Large-file maintenance hotspots

- Severity: Medium
- Status: Open
- Description:
  - Some frontend and backend files remain very large and combine multiple responsibilities.
- Impact:
  - Slower review cycles, higher merge conflict probability, and harder debugging.
- Recommendation:
  - Continue module extraction in prioritized slices tied to active feature work.

## 6) Edge-runtime warning in web build output

- Severity: Low
- Status: Open
- Description:
  - Build logs show a warning for a Node module reference in an edge runtime trace.
- Impact:
  - Warning-only at this time. Build still succeeds.
- Recommendation:
  - Keep tracked and revisit if edge API surfaces expand.

## 7) API runtime abort and query-engine flapping on wallet/profile burst (ARM Docker)

- Severity: High
- Status: Mitigated, runtime verification pending
- Description:
  - API process crashed during concurrent Purse page requests with allocator error `malloc(): unaligned tcache chunk detected`, followed by process abort and restart.
  - After forcing Prisma binary engine mode, subsequent incident logs showed intermittent `connect ECONNREFUSED 127.0.0.1:<ephemeral-port>` errors from Prisma query engine subprocess restarts under bursty request patterns.
- Resolution:
  - Forced Prisma engine mode to `binary` for both Prisma client runtime and Prisma CLI.
  - Added centralized Prisma retry/reconnect middleware for transient engine connectivity failures.
  - Reworked Prisma retry strategy to avoid forced disconnect storms, added socket-close retry support, and introduced capped concurrent Prisma query execution.
  - Upgraded Prisma dependencies to 5.22.0 and aligned workspace Prisma client consumers to the same major version.
  - Removed mixed Prisma 4.x and 5.x lockfile resolution state.
  - Added shared single-flight request cache utility for hot read endpoints.
  - Added route-level short-TTL caching on profile, communities list, badges list, notifications list, and chat unread count.
  - Replaced notifications endpoint N+1 sender lookups with batched sender fetch.
  - Replaced chat unread-count full-row scan with aggregate queries.
  - Added short-TTL ban-check caching (IP blacklist and account ban snapshot) to reduce duplicate per-request Prisma queries during UI burst loads.
  - Added controlled 503 response (`BAN_CHECK_UNAVAILABLE`) when ban-check storage is temporarily unavailable.
  - Reduced Riot role/activity pressure with match cache, 429 backoff, bounded scan limits, and in-flight role detection dedupe.
  - Fixed role-detection trigger logic to run only when primary role is missing (prevents repeated expensive detection when secondary is null).
  - Smoothed Discord bot API polling load with staggered, non-overlapping poll loops and safer poll interval defaults.
  - Files:
    - apps/api/Dockerfile
    - docker-compose.yml
    - apps/api/src/prisma.ts
    - apps/api/src/index.ts
    - apps/api/src/riotClient.ts
    - apps/api/src/routes/user.ts
    - apps/api/src/routes/communities.ts
    - apps/api/src/routes/badges.ts
    - apps/api/src/routes/posts.ts
    - apps/api/src/routes/chat.ts
    - apps/api/src/utils/requestCache.ts
    - package.json
    - packages/types/package.json
    - pnpm-lock.yaml
- Validation:
  - Prisma client generation succeeds on 5.22.0.
  - Types package build remains green after dependency alignment.
  - API TypeScript build remains green after patch.
  - Discord bot TypeScript build remains green after patch.
  - Requires container rebuild/restart and live traffic verification for runtime confirmation in target environment.

## Evidence and Validation Commands

- pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit
- pnpm --filter @lfd/web build
- pnpm prisma generate --schema=prisma/schema.prisma
- pnpm --filter @lfd/types build
- pnpm --filter @lfd/api build
- pnpm -C discord-bot build

## Implementation Delta (This Audit Session)

- Added/updated component ownership in apps/web/components
- Rewired web imports to @components/*
- Updated root alias in tsconfig paths
- Removed old API-owned component directory
- Added webpack alias and shim for stable production build
- Hardened Prisma retry/connect flow and added capped query concurrency handling.
- Added single-flight and short-TTL caching for hot read endpoints.
- Reduced notification and unread-count query amplification (N+1 removal and aggregate counts).
- Smoothed Discord poller load profile with non-overlapping staggered loops.
- Upgraded and aligned Prisma dependencies to 5.22.0 across workspace consumers.

## Recommended Next Actions

1. Add a TS 7 readiness ticket for config deprecation cleanup.
2. Define polling budget and backoff rules per high-traffic route group.
3. Continue targeted file decomposition alongside active roadmap work.
4. Keep this audit file updated after each stability or architecture cut.
