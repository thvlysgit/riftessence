# Caching

> Last updated: 2026-02-11  
> Source: `apps/api/src/utils/cache.ts`

## Infrastructure

- **Redis 7** — Configured in `docker-compose.yml`, optional
- **In-memory fallback** — Used when Redis unavailable

## Utilities (`cache.ts`)

- `cacheGet<T>(key)` — Get cached value
- `cacheSet(key, value, ttlSeconds)` — Set with TTL
- `cacheDelete(key)` — Delete key
- `cacheClear(pattern)` — Clear by pattern

## Current Usage

**Minimal** — Cache utilities exist but few routes use them. Known gap from codebase audit.

## Recommended Usage Patterns

1. **Riot API responses** — Cache rank/summoner data (changes infrequently)
2. **Leaderboards** — Cache computed leaderboards for a few minutes
3. **User profiles** — Cache public profile data
4. **Feed queries** — Consider caching popular filter combinations
