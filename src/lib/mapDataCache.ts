// ABOUTME: Client-side cache for map data to avoid re-fetching on navigation
// ABOUTME: Uses in-memory cache with optional IndexedDB persistence for large datasets

/**
 * Simple in-memory cache for map data
 * Persists data across component unmounts but not page refreshes
 */
class MapDataCache {
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }> = new Map();
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  /**
   * Default TTL: 1 hour (data is fairly static, refreshed weekly)
   */
  private readonly DEFAULT_TTL_MS = 60 * 60 * 1000;

  /**
   * Get cached data if still valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Check if data exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear a specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Fetch with caching - deduplicates concurrent requests
   * If multiple components request the same data simultaneously,
   * only one fetch is made and the result is shared
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = this.DEFAULT_TTL_MS
  ): Promise<T> {
    // Return cached data if valid
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Create new fetch request
    const fetchPromise = fetcher()
      .then((data) => {
        this.set(key, data, ttlMs);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Preload data into cache without waiting for result
   * Useful for preloading data when user hovers or navigates
   */
  preload<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = this.DEFAULT_TTL_MS
  ): void {
    // Don't preload if already cached or loading
    if (this.has(key) || this.pendingRequests.has(key)) {
      return;
    }

    // Fire and forget - don't await
    this.fetchWithCache(key, fetcher, ttlMs).catch((error) => {
      console.warn(`[MapDataCache] Preload failed for ${key}:`, error);
    });
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { entries: number; keys: string[] } {
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const mapDataCache = new MapDataCache();

// Cache keys for map data
export const CACHE_KEYS = {
  CAPITAL_BUDGET: 'capital-budget',
  HOUSING_DATA: 'housing-data',
} as const;
