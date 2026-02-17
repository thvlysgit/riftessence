/**
 * Simple in-memory cache with optional Redis support
 * Falls back to memory cache if Redis not configured
 */

import { env } from '../env';

// In-memory fallback cache
const memoryCache = new Map<string, { value: any; expiredAt: number }>();

// Redis client (lazy-loaded if configured)
let redisClient: any = null;

async function getRedisClient() {
  if (redisClient !== null) {
    return redisClient; // Already loaded
  }

  if (!env.REDIS_URL) {
    redisClient = false; // No Redis configured
    return null;
  }

  try {
    const { createClient } = await import('redis');
    const client = createClient({ url: env.REDIS_URL });
    await client.connect();
    redisClient = client;
    console.log('✅ Connected to Redis');
    return client;
  } catch (error) {
    console.warn('⚠️  Redis connection failed, using in-memory cache:', error instanceof Error ? error.message : error);
    redisClient = false;
    return null;
  }
}

/**
 * Get value from cache
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  // Try Redis first
  const redis = await getRedisClient();
  if (redis) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Redis get failed, falling back to memory:', error);
    }
  }

  // Fall back to memory cache
  const cached = memoryCache.get(key);
  if (cached && cached.expiredAt > Date.now()) {
    return cached.value;
  }
  if (cached) {
    memoryCache.delete(key);
  }
  return null;
}

/**
 * Set value in cache with optional TTL (in seconds)
 */
export async function cacheSet<T = any>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
  // Try Redis first
  const redis = await getRedisClient();
  if (redis) {
    try {
      await redis.setEx(key, ttlSeconds, JSON.stringify(value));
      return;
    } catch (error) {
      console.warn('Redis set failed, falling back to memory:', error);
    }
  }

  // Fall back to memory cache
  memoryCache.set(key, {
    value,
    expiredAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Delete value from cache
 */
export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedisClient();
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch (error) {
      console.warn('Redis delete failed:', error);
    }
  }
  memoryCache.delete(key);
}

/**
 * Clear all cache
 */
export async function cacheClear(): Promise<void> {
  const redis = await getRedisClient();
  if (redis) {
    try {
      await redis.flushDb();
      return;
    } catch (error) {
      console.warn('Redis flush failed:', error);
    }
  }
  memoryCache.clear();
}

// Cleanup memory cache on intervals
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, cached] of memoryCache.entries()) {
    if (cached.expiredAt < now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`♻️  Cleaned ${cleaned} expired cache entries`);
  }
}, 60000); // Every minute
