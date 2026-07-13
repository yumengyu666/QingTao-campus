"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = logAction;
/**
 * 管理员操作审计日志服务
 */
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
async function logAction(params) {
    try {
        await database_1.prisma.auditLog.create({ data: params });
    }
    catch (err) {
        logger_1.logger.error('AuditLog write failed:', err);
    }
}
//# sourceMappingURL=audit.service.js.map