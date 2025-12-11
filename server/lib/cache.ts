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

/**
 * Create a JSON response with browser caching headers
 * @param data - Response data to serialize as JSON
 * @param options - Cache and response options
 */
export function cachedJsonResponse<T>(
  data: T,
  options: {
    status?: number;
    maxAge?: number; // Cache duration in seconds (default: 1 hour)
    staleWhileRevalidate?: number; // Time to serve stale while revalidating (default: 1 day)
  } = {}
): Response {
  const {
    status = 200,
    maxAge = 3600, // 1 hour default
    staleWhileRevalidate = 86400, // 1 day default
  } = options;

  const headers = new Headers({
    'Content-Type': 'application/json',
    // Allow browser and CDN caching
    'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    // Vary on Accept-Encoding to ensure compressed/uncompressed versions are cached separately
    'Vary': 'Accept-Encoding',
  });

  return new Response(JSON.stringify(data), { status, headers });
}
