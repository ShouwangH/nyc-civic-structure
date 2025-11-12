// ABOUTME: Shared in-memory caching utilities for API routes
// ABOUTME: Provides TTL-based caching with automatic invalidation

/**
 * Generic in-memory cache with TTL support
 */
export class InMemoryCache<T> {
  private data: T | null = null;
  private timestamp: number = 0;
  private readonly ttlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Check if cached data is still valid
   */
  isValid(): boolean {
    if (!this.data) return false;
    const now = Date.now();
    return now - this.timestamp < this.ttlMs;
  }

  /**
   * Get cached data if valid, otherwise null
   */
  get(): T | null {
    return this.isValid() ? this.data : null;
  }

  /**
   * Store data in cache with current timestamp
   */
  set(data: T): void {
    this.data = data;
    this.timestamp = Date.now();
  }

  /**
   * Clear cached data
   */
  clear(): void {
    this.data = null;
    this.timestamp = 0;
  }

  /**
   * Get cache metadata
   */
  getMetadata(): { valid: boolean; age: number; timestamp: number } {
    const now = Date.now();
    return {
      valid: this.isValid(),
      age: this.data ? now - this.timestamp : 0,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Standard cache TTL for API routes (24 hours)
 */
export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Helper to check if request has force refresh query param
 */
export function shouldForceRefresh(request: Request): boolean {
  const url = new URL(request.url);
  return url.searchParams.get('refresh') === 'true';
}
