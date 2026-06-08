import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { logger } from './utils/logger';
import { startSearchLogCleanup } from './controllers/search.controller';
import { recoveryScan } from './middleware/moderation.middleware';
import { startViolationClear } from './controllers/report.controller';
import { initWebSocket } from './services/websocket.service';
import { cleanupExpiredBlacklist } from './services/auth.service';

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`API: http://localhost:${env.PORT}/api`);
  logger.info(`Health: http://localhost:${env.PORT}/health`);

  // 启动搜索日志定时清理（每小时一次）
  startSearchLogCleanup();

  // 启动恋爱消息定时清理（每小时一次，删除24小时前的消息）
  startDatingMsgCleanup();

  // 启动审核恢复扫描（处理崩溃后未审核的内容）
  setTimeout(() => recoveryScan(), 3000);

  // 启动过期的私信限制清理
  startViolationClear();

  // Refresh Token 黑名单定期清理（每6小时）
  setInterval(() => { cleanupExpiredBlacklist().catch(() => {}); }, 6 * 3600000);

  // 启动过期商品归档（每天凌晨3点：30天前售出→archived）
  startGoodsArchive();

  // 启动过期失物招领归档（每天凌晨4点：30天前resolved→archived）
  startLostFoundArchive();

  // 启动过期通知清理（每天凌晨5点：30天前的已读通知）
  startNotificationCleanup();

  // 初始化 WebSocket 实时通信
  initWebSocket(server);
});

// 恋爱消息 24 小时自动清理
function startDatingMsgCleanup() {
  const cleanup = () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    prisma.datingMessage.deleteMany({ where: { createdAt: { lt: cutoff } } })
      .then(r => { if (r.count > 0) logger.info(`DatingMsg cleanup: deleted ${r.count} expired messages`); })
      .catch(e => logger.error('DatingMsg cleanup failed:', e));
  };
  setInterval(cleanup, 3600000);
  // 启动时立即执行一次
  setTimeout(cleanup, 5000);
}

// 过期商品归档：30天前售出/已拒绝 → archived
function startGoodsArchive() {
  const archive = () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    prisma.goods.updateMany({
      where: {
        status: { in: ['sold', 'rejected'] },
        updatedAt: { lt: cutoff },
        isDeleted: false,
      },
      data: { status: 'offline' },
    }).then(r => {
      if (r.count > 0) logger.info(`Goods archive: ${r.count} items archived`);
    }).catch(e => logger.error('Goods archive failed:', e));
  };
  // 每24小时执行一次
  setInterval(archive, 24 * 3600000);
  setTimeout(archive, 10000);
}

// 过期失物招领归档：30天未更新→archived
function startLostFoundArchive() {
  const archive = () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // 已解决的超过30天归档；pending超过60天自动归档
    prisma.$transaction([
      prisma.lostFound.updateMany({
        where: { status: 'resolved', updatedAt: { lt: cutoff }, isDeleted: false },
        data: { status: 'offline' },
      }),
      prisma.lostFound.updateMany({
        where: {
          status: { in: ['pending', 'rejected'] },
          updatedAt: { lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
          isDeleted: false,
        },
        data: { status: 'offline' },
      }),
    ]).then(([resolved, stale]) => {
      const total = resolved.count + stale.count;
      if (total > 0) logger.info(`LostFound archive: ${resolved.count} resolved + ${stale.count} stale = ${total} archived`);
    }).catch(e => logger.error('LostFound archive failed:', e));
  };
  setInterval(archive, 24 * 3600000);
  setTimeout(archive, 15000);
}

// 过期通知清理：30天前的已读通知
function startNotificationCleanup() {
  const cleanup = () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    prisma.notification.deleteMany({
      where: { isRead: true, createdAt: { lt: cutoff } },
    }).then(r => {
      if (r.count > 0) logger.info(`Notification cleanup: deleted ${r.count} old read notifications`);
    }).catch(e => logger.error('Notification cleanup failed:', e));
  };
  setInterval(cleanup, 24 * 3600000);
  setTimeout(cleanup, 20000);
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Graceful shutdown validation
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Global error handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
});
