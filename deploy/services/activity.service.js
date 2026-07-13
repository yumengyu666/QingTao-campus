"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = logActivity;
exports.getActivityLogs = getActivityLogs;
exports.cleanupOldLogs = cleanupOldLogs;
const database_1 = require("../config/database");
/** 记录用户行为日志，异步不阻塞主流程 */
function logActivity(params) {
    database_1.prisma.activityLog.create({
        data: {
            userId: params.userId,
            action: params.action,
            targetType: params.targetType || null,
            targetId: params.targetId || null,
            detail: params.detail || '',
            ip: params.ip || '',
        },
    }).catch(() => { }); // fire-and-forget
}
/** 管理员查询行为日志 */
async function getActivityLogs(userId, action, page = 1, pageSize = 50) {
    const where = {};
    if (userId)
        where.userId = userId;
    if (action)
        where.action = action;
    const [logs, total] = await Promise.all([
        database_1.prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        database_1.prisma.activityLog.count({ where }),
    ]);
    return { logs, total };
}
/** 清理90天前的日志 */
async function cleanupOldLogs() {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await database_1.prisma.activityLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
    });
    return result.count;
}
//# sourceMappingURL=activity.service.js.map