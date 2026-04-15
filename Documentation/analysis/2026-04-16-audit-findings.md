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
- Status: Open
- Description:
  - Chat, notifications, and some profile-adjacent flows still use frequent polling patterns that can amplify load during traffic spikes.
- Impact:
  - Unnecessary backend load and noisy incident behavior when API is degraded.
- Recommendation:
  - Introduce adaptive polling or event-driven updates (where practical), with a fallback backoff strategy.

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

## 7) API runtime abort on wallet/profile burst (ARM Docker)

- Severity: High
- Status: Resolved
- Description:
  - API process crashed during concurrent Purse page requests with allocator error `malloc(): unaligned tcache chunk detected`, followed by process abort and restart.
- Resolution:
  - Forced Prisma engine mode to `binary` for both Prisma client runtime and Prisma CLI.
  - Files:
    - apps/api/Dockerfile
    - docker-compose.yml
- Validation:
  - API TypeScript build remains green after patch.
  - Requires container rebuild/restart for runtime confirmation in target environment.

## Evidence and Validation Commands

- pnpm --filter @lfd/web exec tsc -p tsconfig.json --noEmit
- pnpm --filter @lfd/web build
- pnpm --filter @lfd/api build

## Implementation Delta (This Audit Session)

- Added/updated component ownership in apps/web/components
- Rewired web imports to @components/*
- Updated root alias in tsconfig paths
- Removed old API-owned component directory
- Added webpack alias and shim for stable production build

## Recommended Next Actions

1. Add a TS 7 readiness ticket for config deprecation cleanup.
2. Define polling budget and backoff rules per high-traffic route group.
3. Continue targeted file decomposition alongside active roadmap work.
4. Keep this audit file updated after each stability or architecture cut.
