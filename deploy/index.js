"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const logger_1 = require("./utils/logger");
const search_controller_1 = require("./controllers/search.controller");
const moderation_middleware_1 = require("./middleware/moderation.middleware");
const report_controller_1 = require("./controllers/report.controller");
const reservation_controller_1 = require("./controllers/reservation.controller");
const websocket_service_1 = require("./services/websocket.service");
const auth_service_1 = require("./services/auth.service");
const file_cleanup_service_1 = require("./services/file-cleanup.service");
const server = app_1.default.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`Server running on http://localhost:${env_1.env.PORT} [${env_1.env.NODE_ENV}]`);
    logger_1.logger.info(`API: http://localhost:${env_1.env.PORT}/api`);
    logger_1.logger.info(`Health: http://localhost:${env_1.env.PORT}/health`);
    // 启动搜索日志定时清理（每小时一次）
    (0, search_controller_1.startSearchLogCleanup)();
    // 启动恋爱消息定时清理（每小时一次，删除24小时前的消息）
    startDatingMsgCleanup();
    // 启动审核恢复扫描（处理崩溃后未审核的内容）
    setTimeout(() => (0, moderation_middleware_1.recoveryScan)(), 3000);
    // 启动过期的私信限制清理
    (0, report_controller_1.startViolationClear)();
    // Refresh Token 黑名单定期清理（每6小时）
    setInterval(() => { (0, auth_service_1.cleanupExpiredBlacklist)().catch(() => { }); }, 6 * 3600000);
    // 启动过期商品归档（每天凌晨3点：30天前售出→archived）
    startGoodsArchive();
    // 启动过期失物招领归档（每天凌晨4点：30天前resolved→archived）
    startLostFoundArchive();
    // 启动过期通知清理（每天凌晨5点：30天前的已读通知）
    startNotificationCleanup();
    // 启动文件清理（每天凌晨2点：7天前的未引用上传文件）
    setInterval(() => { (0, file_cleanup_service_1.cleanupOrphanFiles)().catch(() => { }); }, 24 * 3600000);
    setTimeout(() => { (0, file_cleanup_service_1.cleanupOrphanFiles)().catch(() => { }); }, 30000);
    // 启动过期预约自动释放（每10分钟）
    setInterval(() => { (0, reservation_controller_1.expireReservations)().catch(() => { }); }, 10 * 60 * 1000);
    (0, reservation_controller_1.expireReservations)().catch(() => { });
    // 初始化 WebSocket 实时通信
    (0, websocket_service_1.initWebSocket)(server);
});
// 恋爱消息 24 小时自动清理
function startDatingMsgCleanup() {
    const cleanup = () => {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        database_1.prisma.datingMessage.deleteMany({ where: { createdAt: { lt: cutoff } } })
            .then(r => { if (r.count > 0)
            logger_1.logger.info(`DatingMsg cleanup: deleted ${r.count} expired messages`); })
            .catch(e => logger_1.logger.error('DatingMsg cleanup failed:', e));
    };
    setInterval(cleanup, 3600000);
    // 启动时立即执行一次
    setTimeout(cleanup, 5000);
}
// 过期商品归档：30天前售出/已拒绝 → archived
function startGoodsArchive() {
    const archive = () => {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        database_1.prisma.goods.updateMany({
            where: {
                status: { in: ['sold', 'rejected'] },
                updatedAt: { lt: cutoff },
                isDeleted: false,
            },
            data: { status: 'offline' },
        }).then(r => {
            if (r.count > 0)
                logger_1.logger.info(`Goods archive: ${r.count} items archived`);
        }).catch(e => logger_1.logger.error('Goods archive failed:', e));
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
        database_1.prisma.$transaction([
            database_1.prisma.lostFound.updateMany({
                where: { status: 'resolved', updatedAt: { lt: cutoff }, isDeleted: false },
                data: { status: 'offline' },
            }),
            database_1.prisma.lostFound.updateMany({
                where: {
                    status: { in: ['pending', 'rejected'] },
                    updatedAt: { lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
                    isDeleted: false,
                },
                data: { status: 'offline' },
            }),
        ]).then(([resolved, stale]) => {
            const total = resolved.count + stale.count;
            if (total > 0)
                logger_1.logger.info(`LostFound archive: ${resolved.count} resolved + ${stale.count} stale = ${total} archived`);
        }).catch(e => logger_1.logger.error('LostFound archive failed:', e));
    };
    setInterval(archive, 24 * 3600000);
    setTimeout(archive, 15000);
}
// 过期通知清理：30天前的已读通知
function startNotificationCleanup() {
    const cleanup = () => {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        database_1.prisma.notification.deleteMany({
            where: { isRead: true, createdAt: { lt: cutoff } },
        }).then(r => {
            if (r.count > 0)
                logger_1.logger.info(`Notification cleanup: deleted ${r.count} old read notifications`);
        }).catch(e => logger_1.logger.error('Notification cleanup failed:', e));
    };
    setInterval(cleanup, 24 * 3600000);
    setTimeout(cleanup, 20000);
}
// Graceful shutdown
async function shutdown(signal) {
    logger_1.logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
        await database_1.prisma.$disconnect();
        logger_1.logger.info('Server closed');
        process.exit(0);
    });
    // Force shutdown after 10s
    setTimeout(() => {
        logger_1.logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
// Graceful shutdown validation
process.on('beforeExit', async () => {
    await database_1.prisma.$disconnect();
});
// Global error handlers
process.on('uncaughtException', (err) => {
    logger_1.logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Rejection', { reason });
    process.exit(1);
});
//# sourceMappingURL=index.js.map