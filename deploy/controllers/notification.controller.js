"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.getUnreadCount = getUnreadCount;
exports.getAnnouncements = getAnnouncements;
exports.markAllRead = markAllRead;
exports.markBatchRead = markBatchRead;
exports.markRead = markRead;
exports.deleteNotifications = deleteNotifications;
exports.deleteNotification = deleteNotification;
exports.pushSubscribe = pushSubscribe;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
async function getNotifications(req, res, next) {
    try {
        const userId = req.user.userId;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const [list, total] = await Promise.all([
            database_1.prisma.notification.findMany({ where: { userId }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
            database_1.prisma.notification.count({ where: { userId } }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
async function getUnreadCount(req, res, next) {
    try {
        const count = await database_1.prisma.notification.count({ where: { userId: req.user.userId, isRead: false } });
        return (0, response_1.success)(res, { count });
    }
    catch (err) {
        next(err);
    }
}
async function getAnnouncements(req, res, next) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = 20;
        const [list, total] = await Promise.all([
            database_1.prisma.notification.findMany({ where: { type: 'announcement' }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
            database_1.prisma.notification.count({ where: { type: 'announcement' } }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
async function markAllRead(req, res, next) {
    try {
        await database_1.prisma.notification.updateMany({ where: { userId: req.user.userId, isRead: false }, data: { isRead: true } });
        return (0, response_1.success)(res, null, '全部已读');
    }
    catch (err) {
        next(err);
    }
}
async function markBatchRead(req, res, next) {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0)
            return (0, response_1.error)(res, '请提供通知ID列表');
        await database_1.prisma.notification.updateMany({ where: { id: { in: ids }, userId: req.user.userId }, data: { isRead: true } });
        return (0, response_1.success)(res, null, '已读');
    }
    catch (err) {
        next(err);
    }
}
async function markRead(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效ID');
        await database_1.prisma.notification.updateMany({ where: { id, userId: req.user.userId }, data: { isRead: true } });
        return (0, response_1.success)(res, null, 'ok');
    }
    catch (err) {
        next(err);
    }
}
async function deleteNotifications(req, res, next) {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0)
            return (0, response_1.error)(res, '请提供通知ID列表');
        await database_1.prisma.notification.deleteMany({ where: { id: { in: ids }, userId: req.user.userId } });
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
async function deleteNotification(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效ID');
        await database_1.prisma.notification.deleteMany({ where: { id, userId: req.user.userId } });
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
// POST /push-subscribe — 浏览器推送订阅
async function pushSubscribe(req, res, next) {
    try {
        const { subscription } = req.body;
        if (!subscription)
            return (0, response_1.error)(res, '缺少 subscription 数据');
        await database_1.prisma.user.update({
            where: { id: req.user.userId },
            data: { pushSubscription: JSON.stringify(subscription) },
        });
        return (0, response_1.success)(res, null, '推送已订阅');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=notification.controller.js.map