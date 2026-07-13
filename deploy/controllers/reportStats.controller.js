"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportStats = getReportStats;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/**
 * POST /api/admin/reports/stats — 举报统计
 * 返回各类举报的数量分布
 */
async function getReportStats(req, res, next) {
    try {
        const stats = await database_1.prisma.report.groupBy({
            by: ['targetType', 'status'],
            _count: { id: true },
        });
        const result = {};
        for (const s of stats) {
            if (!result[s.targetType])
                result[s.targetType] = { pending: 0, handled: 0, total: 0 };
            if (s.status === 'pending')
                result[s.targetType].pending = s._count.id;
            else
                result[s.targetType].handled += s._count.id;
            result[s.targetType].total += s._count.id;
        }
        return (0, response_1.success)(res, result);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=reportStats.controller.js.map