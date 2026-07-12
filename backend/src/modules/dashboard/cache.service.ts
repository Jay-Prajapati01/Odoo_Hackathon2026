interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 60_000;

  constructor(defaultTTLms?: number) {
    if (defaultTTLms) this.defaultTTL = defaultTTLms;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  invalidate(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.cache.delete(key);
    }
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const dashboardCache = new CacheService(120_000);
export const analyticsCache = new CacheService(300_000);
export const reportsCache = new CacheService(180_000);
