/**
 * 浏览量去重服务
 *
 * 设计原则:
 * - 封装 IP 去重逻辑，避免状态泄漏到 Controller 层
 * - 支持定时清理过期条目
 * - 可测试（通过 DI 注入 Map / 可重置实例）
 */

export class ViewCounter {
  private dedup: Map<string, number>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly ttlMs: number;
  private readonly cleanupIntervalMs: number;

  constructor(options?: { ttlMs?: number; cleanupIntervalMs?: number }) {
    this.dedup = new Map();
    this.ttlMs = options?.ttlMs ?? 30 * 60 * 1000; // 30 分钟
    this.cleanupIntervalMs = options?.cleanupIntervalMs ?? 10 * 60 * 1000; // 10 分钟
    this.startCleanup();
  }

  /** 检查是否应该计数（首次访问或已过期），true = 应该计数 */
  shouldCount(key: string): boolean {
    const lastTime = this.dedup.get(key);
    const now = Date.now();
    if (!lastTime || now - lastTime > this.ttlMs) {
      this.dedup.set(key, now);
      return true;
    }
    return false;
  }

  /** 强制刷新某 key 的时间戳 */
  touch(key: string): void {
    this.dedup.set(key, Date.now());
  }

  get size(): number {
    return this.dedup.size;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.dedup) {
        if (now - timestamp > this.ttlMs) {
          this.dedup.delete(key);
        }
      }
    }, this.cleanupIntervalMs);
    // 允许进程退出
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /** 销毁定时器，用于测试环境 */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.dedup.clear();
  }
}

/** 全局单例（生产环境使用） */
export const viewCounter = new ViewCounter();
