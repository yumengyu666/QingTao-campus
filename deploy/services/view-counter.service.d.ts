/**
 * 浏览量去重服务
 *
 * 设计原则:
 * - 封装 IP 去重逻辑，避免状态泄漏到 Controller 层
 * - 支持定时清理过期条目
 * - 可测试（通过 DI 注入 Map / 可重置实例）
 */
export declare class ViewCounter {
    private dedup;
    private cleanupTimer;
    private readonly ttlMs;
    private readonly cleanupIntervalMs;
    constructor(options?: {
        ttlMs?: number;
        cleanupIntervalMs?: number;
    });
    /** 检查是否应该计数（首次访问或已过期），true = 应该计数 */
    shouldCount(key: string): boolean;
    /** 强制刷新某 key 的时间戳 */
    touch(key: string): void;
    get size(): number;
    private startCleanup;
    /** 销毁定时器，用于测试环境 */
    destroy(): void;
}
/** 全局单例（生产环境使用） */
export declare const viewCounter: ViewCounter;
//# sourceMappingURL=view-counter.service.d.ts.map