"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminLogs = getAdminLogs;
exports.adminDashboard = adminDashboard;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/** GET /api/admin/logs — 管理员查看操作日志 */
async function getAdminLogs(req, res, next) {
    try {
        if (req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权限', 403);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 50, 100);
        const userId = req.query.userId ? parseInt(req.query.userId) : undefined;
        const action = req.query.action;
        const where = {};
        if (userId)
            where.userId = userId;
        if (action)
            where.action = action;
        const [logs, total] = await Promise.all([
            database_1.prisma.report.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
                select: { id: true, reason: true, createdAt: true, reporterId: true, targetId: true, targetType: true } }),
            database_1.prisma.report.count({ where }),
        ]);
        return (0, response_1.paginated)(res, logs, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/admin/stats/dashboard — 管理后台仪表盘数据 */
async function adminDashboard(req, res, next) {
    try {
        if (req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权限', 403);
        const today = new Date().toISOString().slice(0, 10);
        const [totalUsers, totalGoods, totalPosts, todayReports, todayCheckins, pendingGoods] = await Promise.all([
            database_1.prisma.user.count(),
            database_1.prisma.goods.count({ where: { isDeleted: false } }),
            database_1.prisma.post.count({ where: { isDeleted: false } }),
            database_1.prisma.report.count({ where: { createdAt: { gte: new Date(today) } } }),
            database_1.prisma.dailyCheckin.count({ where: { checkinDate: today } }),
            database_1.prisma.goods.count({ where: { status: 'pending', isDeleted: false } }),
        ]);
        return (0, response_1.success)(res, {
            totalUsers, totalGoods, totalPosts,
            todayReports, todayCheckins,
            pendingReview: pendingGoods,
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=log.controller.js.map