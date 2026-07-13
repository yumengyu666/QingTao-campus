"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOrphanFiles = cleanupOrphanFiles;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads');
const MAX_AGE_DAYS = 7;
/**
 * 定时清理7天前的未引用上传文件
 * 对应任务 #65311c1 [后端R7]
 */
async function cleanupOrphanFiles() {
    if (!fs_1.default.existsSync(UPLOAD_DIR))
        return 0;
    let deleted = 0;
    const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    function scan(dir) {
        const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dir, entry.name);
            if (entry.isDirectory()) {
                scan(fullPath);
                continue;
            }
            try {
                const stat = fs_1.default.statSync(fullPath);
                if (stat.mtimeMs < cutoff) {
                    fs_1.default.unlinkSync(fullPath);
                    deleted++;
                }
            }
            catch { }
        }
    }
    try {
        scan(UPLOAD_DIR);
    }
    catch (e) {
        logger_1.logger.error(`File cleanup error: ${e.message}`);
    }
    if (deleted > 0)
        logger_1.logger.info(`🧹 Cleaned ${deleted} orphan files`);
    return deleted;
}
//# sourceMappingURL=file-cleanup.service.js.map