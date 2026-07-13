/**
 * LRU内存缓存服务 — 对应任务 #56 [后端R5]
 * 轻量级LRU缓存，用于热门商品/分类列表等高频读取数据
 */
export declare class LRUCache<T> {
    private maxSize;
    private ttlMs;
    private cache;
    constructor(maxSize?: number, ttlMs?: number);
    get(key: string): T | undefined;
    set(key: string, value: T, customTtl?: number): void;
    delete(key: string): void;
    clear(): void;
    /** 根据前缀批量清除（缓存失效策略） */
    clearByPrefix(prefix: string): void;
}
export declare const goodsCache: LRUCache<any>;
export declare const categoryCache: LRUCache<any>;
//# sourceMappingURL=cache.service.d.ts.map