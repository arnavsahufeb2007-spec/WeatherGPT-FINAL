interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleMemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const appCache = new SimpleMemoryCache();
