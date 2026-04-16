import { cacheGet, cacheSet } from './cache';

type RequestCacheOptions<T> = {
  cacheNull?: boolean;
  shouldCache?: (value: T) => boolean;
};

const inFlightCacheLoads = new Map<string, Promise<any>>();

function shouldStoreValue<T>(value: T, options?: RequestCacheOptions<T>) {
  if (value === null || value === undefined) {
    return options?.cacheNull === true;
  }

  if (options?.shouldCache) {
    return options.shouldCache(value);
  }

  return true;
}

export async function getOrSetCache<T>(
  cacheKey: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
  options?: RequestCacheOptions<T>
): Promise<T> {
  const effectiveTtl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? Math.floor(ttlSeconds) : 0;

  if (effectiveTtl > 0) {
    const cached = await cacheGet<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  const inFlight = inFlightCacheLoads.get(cacheKey);
  if (inFlight) {
    return await inFlight;
  }

  const task = (async () => {
    try {
      // Double-check cache inside the single-flight lock.
      if (effectiveTtl > 0) {
        const cached = await cacheGet<T>(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }

      const value = await producer();

      if (effectiveTtl > 0 && shouldStoreValue(value, options)) {
        await cacheSet(cacheKey, value, effectiveTtl);
      }

      return value;
    } finally {
      inFlightCacheLoads.delete(cacheKey);
    }
  })();

  inFlightCacheLoads.set(cacheKey, task);
  return await task;
}
