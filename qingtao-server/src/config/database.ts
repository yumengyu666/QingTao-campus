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
