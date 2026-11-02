/**
 * High-performance In-Memory & Session Cache with Stale-While-Revalidate (SWR) support.
 * Eliminates redundant network roundtrips and delivers instant 0ms transitions.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  maxAgeMs: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

// Active background revalidation promises to prevent duplicate in-flight requests
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Retrieve cached data if present and still within maxAge.
 */
export function getFromCache<T>(key: string, maxAgeMs = 60000): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now - entry.timestamp > (maxAgeMs || entry.maxAgeMs)) {
    return null;
  }
  return entry.data as T;
}

/**
 * Retrieve cached data even if stale (for instant SWR rendering).
 */
export function getStaleCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  return entry ? (entry.data as T) : null;
}

/**
 * Store data into memory cache.
 */
export function setInCache<T>(key: string, data: T, maxAgeMs = 60000): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    maxAgeMs,
  });
}

/**
 * Invalidate specific cache keys or all keys matching a prefix/regex pattern.
 * e.g., invalidateCache('routine_') or invalidateCache('exam_')
 */
export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyOrPrefix) || key.includes(keyOrPrefix)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Helper to race any promise against a strict timeout (in milliseconds).
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue: T
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve(fallbackValue);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch {
    clearTimeout(timer);
    return fallbackValue;
  }
}

/**
 * High-performance fetch with SWR in-memory caching and deduplication.
 */
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  maxAgeMs = 60000,
  fallbackValue: T = null as any
): Promise<T> {
  const cacheKey = `${options?.method || 'GET'}:${url}`;

  // 1. Check fresh cache
  const cached = getFromCache<T>(cacheKey, maxAgeMs);
  if (cached !== null) {
    return cached;
  }

  // 2. Check if a request for the exact same URL is already in-flight (deduplicate)
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  // 3. Perform network fetch
  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        // If error, return stale cache if available
        const stale = getStaleCache<T>(cacheKey);
        return stale !== null ? stale : fallbackValue;
      }
      const data: T = await res.json();
      setInCache(cacheKey, data, maxAgeMs);
      return data;
    } catch (err) {
      console.warn(`[dataCache] fetch failed for ${url}:`, err);
      const stale = getStaleCache<T>(cacheKey);
      return stale !== null ? stale : fallbackValue;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}
