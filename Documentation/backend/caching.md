# Caching

> Last updated: 2026-04-16  
> Source: `apps/api/src/utils/cache.ts`, `apps/api/src/utils/requestCache.ts`, and route integrations

## Infrastructure

- **Redis 7** — Configured in `docker-compose.yml`, optional
- **In-memory fallback** — Used when Redis unavailable

## Utilities (`cache.ts`)

- `cacheGet<T>(key)` — Get cached value
- `cacheSet(key, value, ttlSeconds)` — Set with TTL
- `cacheDelete(key)` — Delete key
- `cacheClear(pattern)` — Clear by pattern

## Utilities (`requestCache.ts`)

- `getOrSetCache(cacheKey, ttlSeconds, producer, options?)` — Shared helper that:
	- Reads from cache first (if TTL > 0)
	- Coalesces concurrent identical cache misses with single-flight behavior
	- Supports conditional caching/null-caching options

## Current Usage

Caching is now actively used in hot read paths and request hooks.

- Ban checks (`apps/api/src/index.ts`): short TTL caching of blacklist/account ban lookups
- Profile route (`apps/api/src/routes/user.ts`):
	- Cached profile target user fetch
	- Cached profile response payload
	- Cached daily password-reminder existence check guard
- Communities list (`apps/api/src/routes/communities.ts`): normalized-query cache key
- Badges list (`apps/api/src/routes/badges.ts`): short TTL badge list cache
- Notifications list (`apps/api/src/routes/posts.ts`): short TTL per-user notifications cache
- Chat unread count (`apps/api/src/routes/chat.ts`): short TTL aggregate unread-count cache

## Recommended Usage Patterns

1. Keep TTLs short for user-facing freshness-sensitive routes (seconds, not minutes).
2. Use normalized cache keys for query-heavy list endpoints.
3. Prefer single-flight wrapping for expensive reads that are hit concurrently.
4. Add explicit invalidation when introducing cached write-after-read paths.
