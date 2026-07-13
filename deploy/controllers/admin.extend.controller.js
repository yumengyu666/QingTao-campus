"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchUpdateStatus = batchUpdateStatus;
exports.activityLogsHandler = activityLogsHandler;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const activity_service_1 = require("../services/activity.service");
/** POST /api/admin/content/batch-status */
async function batchUpdateStatus(req, res, next) {
    try {
        const { ids, type, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0)
            return (0, response_1.error)(res, '请提供ID列表');
        if (!type || !status)
            return (0, response_1.error)(res, '请提供type和status');
        const models = {
            goods: database_1.prisma.goods,
            post: database_1.prisma.post,
            lostfound: database_1.prisma.lostFound,
        };
        const model = models[type];
        if (!model)
            return (0, response_1.error)(res, '不支持的类型');
        await model.updateMany({ where: { id: { in: ids } }, data: { status } });
        return (0, response_1.success)(res, { count: ids.length }, `批量处理完成`);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/admin/activity-logs */
async function activityLogsHandler(req, res, next) {
    try {
        if (req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权限', 403);
        const userId = req.query.userId ? parseInt(req.query.userId) : undefined;
        const action = req.query.action;
        const page = Math.max(parseInt(req.query.page || '1'), 1);
        const pageSize = Math.min(parseInt(req.query.pageSize || '50'), 100);
        const { logs, total } = await (0, activity_service_1.getActivityLogs)(userId, action, page, pageSize);
        return (0, response_1.paginated)(res, logs, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=admin.extend.controller.js.map