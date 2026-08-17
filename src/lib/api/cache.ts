/**
 * /src/lib/api/cache.ts
 *
 * In-memory LRU cache with per-entry TTL.
 *
 * Design:
 *   - LRU eviction: a Map is used as an ordered collection (insertion order).
 *     On every GET that hits, the entry is deleted then re-inserted to move it
 *     to the "most recently used" tail.  On every SET that would exceed the
 *     capacity the Map's first entry (LRU head) is deleted.
 *   - TTL: each entry stores an expiresAt epoch ms.  Expired entries are
 *     treated as cache misses and deleted on access.
 *   - Thread safety: Node.js is single-threaded; no locking needed.
 */

// ─── Entry ───────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms; Infinity = never expires
}

// ─── LRU Cache class ─────────────────────────────────────────────────────────

export class LruCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(
    /** Maximum number of entries. Default 500. */
    private readonly capacity: number = 500
  ) {}

  /** Store a value. `ttlMs` = 0 means never expires. */
  set(key: string, value: T, ttlMs = 0): void {
    // Refresh position: delete existing entry first
    if (this.store.has(key)) this.store.delete(key);

    // Evict LRU entry if at capacity
    if (this.store.size >= this.capacity) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : Infinity,
    });
  }

  /** Retrieve a value. Returns undefined on miss or expiry. */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    // Move to tail (most recently used)
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value;
  }

  /** Returns true if the key exists and has not expired. */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /** Remove a single entry. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Remove all entries. */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /** Purge all expired entries. Useful as a periodic cleanup. */
  purgeExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  get size(): number {
    return this.store.size;
  }

  stats(): { size: number; capacity: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    return {
      size:     this.store.size,
      capacity: this.capacity,
      hits:     this.hits,
      misses:   this.misses,
      hitRate:  total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : "n/a",
    };
  }
}

// ─── Shared singleton caches ─────────────────────────────────────────────────

/** General-purpose application cache (max 500 entries). */
export const appCache = new LruCache(500);

/** TTL constants (milliseconds) */
export const TTL = {
  /** AI-generated flash commentary — 30 minutes */
  NEWS_FLASH:     30 * 60 * 1000,
  /** AI extended article summary — 60 minutes */
  EXTENDED_SUMMARY: 60 * 60 * 1000,
  /** NASA RSS feeds — 2 minutes */
  NASA_RSS:       2 * 60 * 1000,
  /** OpenWeatherMap — 5 minutes */
  WEATHER:        5 * 60 * 1000,
  /** EONET events — 3 minutes */
  EONET:          3 * 60 * 1000,
  /** Observatory RSS — 5 minutes */
  OBSERVATORY:    5 * 60 * 1000,
  /** Map events — 3 minutes */
  MAP_EVENTS:     3 * 60 * 1000,
  /** APOD — 24 hours */
  APOD:           24 * 60 * 60 * 1000,
  /** Briefing — 30 minutes */
  BRIEFING:       30 * 60 * 1000,
  /** Telemetry — 5 minutes (same cadence as weather) */
  TELEMETRY:      5 * 60 * 1000,
} as const;

// ─── Cache helpers ────────────────────────────────────────────────────────────

/**
 * Read-through helper: return cached value if fresh, otherwise call `fn`,
 * store the result, and return it.
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const cached = appCache.get(key) as T | undefined;
  if (cached !== undefined) return cached;

  const fresh = await fn();
  appCache.set(key, fresh, ttlMs);
  return fresh;
}

/**
 * Build a stable cache key from a prefix + stringified parameters.
 */
export function cacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join("&");
  return `${prefix}:${sorted}`;
}
