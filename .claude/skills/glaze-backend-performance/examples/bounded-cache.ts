// Example: Bounded in-memory cache with max entries and TTL.
// Prevents unbounded memory growth from caching large data (icons, images, API responses).
// Copy and adapt for your app.

/**
 * A simple bounded cache with max entry count and time-to-live.
 *
 * When the cache reaches maxEntries, the oldest entry is evicted.
 * Entries older than ttlMs are treated as expired and removed on access.
 */
export class BoundedCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();

  constructor(
    private maxEntries: number,
    private ttlMs: number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined; // respects TTL
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// === Usage examples ===
//
// import { app } from "@glaze/core/backend";
//
// // Example 1: Cache image thumbnails (base64) — max 50 entries, 10 min TTL
// const thumbnailCache = new BoundedCache<string>(50, 10 * 60 * 1000);
//
// async function getCachedThumbnail(id: string, path: string): Promise<string> {
//   let thumb = thumbnailCache.get(id);
//   if (thumb === undefined) {
//     thumb = await generateThumbnail(path);
//     if (thumb) thumbnailCache.set(id, thumb);
//   }
//   return thumb ?? "";
// }
//
// // Example 2: Cache API responses — max 100 entries, 5 min TTL
// const apiCache = new BoundedCache<unknown>(100, 5 * 60 * 1000);
//
// // Clean up all caches on shutdown
// app.on("before-quit", () => {
//   thumbnailCache.clear();
//   apiCache.clear();
// });
