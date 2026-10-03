/** Fetches signed URLs for many paths in one request. */
export type SignBatch = (paths: string[]) => Promise<Map<string, string>>;

interface CacheEntry {
  url: string;
  expiresAt: number;
}

/**
 * Caches signed storage URLs and batches lookups made in the same tick into one
 * request, so a board with hundreds of images signs them all at once.
 * URLs are refreshed a safety margin before they expire.
 */
export class SignedUrlCache {
  private cache = new Map<string, CacheEntry>();
  private queue = new Map<string, ((url: string | null) => void)[]>();
  private scheduled = false;

  constructor(
    private readonly sign: SignBatch,
    private readonly ttlMs: number,
    private readonly refreshMarginMs = 5 * 60 * 1000,
    private readonly now: () => number = Date.now,
  ) {}

  /** Returns a cached URL synchronously, or null if it needs fetching. */
  peek(path: string): string | null {
    const entry = this.cache.get(path);
    return entry && entry.expiresAt - this.refreshMarginMs > this.now() ? entry.url : null;
  }

  get(path: string): Promise<string | null> {
    const cached = this.peek(path);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
      const waiting = this.queue.get(path);
      if (waiting) waiting.push(resolve);
      else this.queue.set(path, [resolve]);
      if (!this.scheduled) {
        this.scheduled = true;
        queueMicrotask(() => void this.drain());
      }
    });
  }

  private async drain() {
    this.scheduled = false;
    const batch = this.queue;
    this.queue = new Map();
    const paths = [...batch.keys()];

    let urls = new Map<string, string>();
    try {
      urls = await this.sign(paths);
    } catch {
      // Resolve with null below; callers render a placeholder and retry later.
    }

    const expiresAt = this.now() + this.ttlMs;
    for (const [path, resolvers] of batch) {
      const url = urls.get(path) ?? null;
      if (url) this.cache.set(path, { url, expiresAt });
      for (const resolve of resolvers) resolve(url);
    }
  }
}
