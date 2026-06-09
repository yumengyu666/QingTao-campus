/**
 * LRU内存缓存服务 — 对应任务 #56 [后端R5]
 * 轻量级LRU缓存，用于热门商品/分类列表等高频读取数据
 */
export class LRUCache<T> {
  private maxSize: number;
  private ttlMs: number;
  private cache = new Map<string, { value: T; expiresAt: number }>();

  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    // LRU: move to end
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, customTtl?: number): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + (customTtl ?? this.ttlMs) });
  }

  delete(key: string): void { this.cache.delete(key); }
  clear(): void { this.cache.clear(); }

  /** 根据前缀批量清除（缓存失效策略） */
  clearByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }
}

// 单例缓存实例
export const goodsCache = new LRUCache<any>(200, 3 * 60 * 1000); // 热门商品 3min
export const categoryCache = new LRUCache<any>(50, 10 * 60 * 1000); // 分类 10min
