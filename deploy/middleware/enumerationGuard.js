"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enumerationGuard = enumerationGuard;
const accessMap = new Map();
// 清理过期记录（每5分钟清理一次）
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const RECORD_TTL = 60 * 1000; // 记录有效期60秒
const MAX_SEQUENTIAL = 8; // 连续顺序访问阈值
let cleanupTimer = null;
function startCleanup() {
    if (cleanupTimer)
        return;
    cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of accessMap) {
            if (now - record.lastTime > RECORD_TTL) {
                accessMap.delete(key);
            }
        }
    }, CLEANUP_INTERVAL);
}
function enumerationGuard(req, res, next) {
    // Only check detail endpoints (path pattern: /api/xxx/:id)
    const match = req.path.match(/^\/api\/([a-zA-Z]+)\/(\d+)$/);
    if (!match)
        return next();
    // Skip non-content endpoints
    const skipPrefixes = ['users', 'messages', 'upload', 'captcha', 'notifications', 'categories', 'images', 'search', 'health'];
    const prefix = match[1].toLowerCase();
    if (skipPrefixes.includes(prefix))
        return next();
    const id = parseInt(match[2]);
    if (isNaN(id))
        return next();
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
    const key = `${ip}:${prefix}`;
    const now = Date.now();
    startCleanup();
    const existing = accessMap.get(key);
    if (existing) {
        // 检查是否是顺序访问（递增或递减1）
        const isSequential = Math.abs(id - existing.lastId) === 1;
        const withinTimeWindow = now - existing.lastTime < 30000; // 30秒窗口
        if (isSequential && withinTimeWindow) {
            existing.sequentialCount++;
            existing.lastId = id;
            existing.lastTime = now;
            if (existing.sequentialCount >= MAX_SEQUENTIAL) {
                return res.status(429).json({
                    code: 429,
                    message: '请求过于频繁，请稍后再试',
                    data: null,
                });
            }
        }
        else if (!isSequential || !withinTimeWindow) {
            // 非连续ID或时间窗口已过，重置计数
            existing.lastId = id;
            existing.sequentialCount = 1;
            existing.lastTime = now;
        }
    }
    else {
        accessMap.set(key, {
            lastId: id,
            sequentialCount: 1,
            lastTime: now,
        });
    }
    next();
}
//# sourceMappingURL=enumerationGuard.js.map