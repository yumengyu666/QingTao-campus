import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// 慢查询检测中间件（>500ms 记录警告，>2s 记录错误）
prisma.$use(async (params, next) => {
  const t0 = Date.now();
  const result = await next(params);
  const elapsed = Date.now() - t0;

  if (elapsed > 2000) {
    logger.error(`SLOW QUERY: ${params.model}.${params.action} took ${elapsed}ms`);
  } else if (elapsed > 500) {
    logger.warn(`Slow query: ${params.model}.${params.action} took ${elapsed}ms`);
  }

  return result;
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// SQLite 性能与安全 PRAGMA（每次连接都需设置）
async function initPragmas() {
  try {
    // SQLite PRAGMA returns rows, must use $queryRawUnsafe (not $executeRaw)
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL');
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys=ON');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000');
    await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL');
    await prisma.$queryRawUnsafe('PRAGMA cache_size=-8000');
  } catch {
    // PRAGMA may fail if connection not ready; subsequent queries will re-establish
  }
}

// 延迟初始化（避免模块加载时 Prisma 尚未连接）
setImmediate(() => {
  initPragmas().catch(() => {});
});

// 数据库连接重试（用于 Prisma 断连后自动恢复）
let reconnectAttempts = 0;
const MAX_RECONNECT = 3;

export async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RECONNECT): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isConnectionError =
      err?.message?.includes('Can\'t reach database') ||
      err?.message?.includes('Connection') ||
      err?.message?.includes('timeout') ||
      err?.code === 'P1001' || err?.code === 'P1002' || err?.code === 'P1017';

    if (isConnectionError && retries > 0) {
      reconnectAttempts++;
      logger.warn(`DB connection lost, retrying (${MAX_RECONNECT - retries + 1}/${MAX_RECONNECT})...`);
      await new Promise(r => setTimeout(r, 500));
      return withRetry(fn, retries - 1);
    }
    reconnectAttempts = 0;
    throw err;
  }
}
