"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryCache = exports.goodsCache = exports.LRUCache = void 0;
/**
 * LRU内存缓存服务 — 对应任务 #56 [后端R5]
 * 轻量级LRU缓存，用于热门商品/分类列表等高频读取数据
 */
class LRUCache {
    maxSize;
    ttlMs;
    cache = new Map();
    constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        // LRU: move to end
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    set(key, value, customTtl) {
        if (this.cache.has(key))
            this.cache.delete(key);
        else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey)
                this.cache.delete(firstKey);
        }
        this.cache.set(key, { value, expiresAt: Date.now() + (customTtl ?? this.ttlMs) });
    }
    delete(key) { this.cache.delete(key); }
    clear() { this.cache.clear(); }
    /** 根据前缀批量清除（缓存失效策略） */
    clearByPrefix(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix))
                this.cache.delete(key);
        }
    }
}
exports.LRUCache = LRUCache;
// 单例缓存实例
exports.goodsCache = new LRUCache(200, 3 * 60 * 1000); // 热门商品 3min
exports.categoryCache = new LRUCache(50, 10 * 60 * 1000); // 分类 10min
//# sourceMappingURL=cache.service.js.map