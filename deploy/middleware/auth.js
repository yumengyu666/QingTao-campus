"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const jwt_1 = require("../config/jwt");
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
/**
 * 计算当前请求的设备指纹哈希：仅使用 User-Agent
 * - UA 代表浏览器+操作系统组合，换设备/浏览器 → 指纹变化
 * - 不与 IP 绑定：同设备切换 WiFi/移动网络不受影响
 */
function computeRequestFingerprint(req) {
    const ua = req.headers['user-agent'] || '';
    return crypto_1.default.createHash('sha256').update(ua).digest('hex').slice(0, 16);
}
/** 异步通知用户跨设备登录告警（去重：同一用户 1 小时内最多 1 条） */
const recentAlerts = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [k, t] of recentAlerts) {
        if (now - t > 60 * 60 * 1000)
            recentAlerts.delete(k);
    }
}, 10 * 60 * 1000).unref();
async function notifyDeviceMismatch(userId, req) {
    if (recentAlerts.has(userId))
        return; // 1 小时内已通知过
    recentAlerts.set(userId, Date.now());
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    logger_1.logger.warn(`[AUTH] Device fingerprint mismatch for user ${userId}: current IP=${ip} UA=${ua.slice(0, 80)}`);
    try {
        const { createNotification } = await Promise.resolve().then(() => __importStar(require('../services/notification.service')));
        await createNotification({
            userId,
            type: 'security_alert',
            title: '账号登录环境异常',
            content: `您的账号在新的设备/IP（${ip}）上被访问。若非本人操作，请尽快修改密码并退出其他设备。`,
        });
    }
    catch { /* 通知失败不影响主流程 */ }
}
async function authMiddleware(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            return (0, response_1.unauthorized)(res, '未登录');
        }
        const token = header.slice(7);
        const payload = jsonwebtoken_1.default.verify(token, jwt_1.jwtConfig.accessSecret, { algorithms: ['HS256'] });
        const user = await database_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, status: true, role: true, tokenVersion: true },
        });
        if (!user) {
            return (0, response_1.unauthorized)(res, '用户不存在');
        }
        if (user.status === 'disabled') {
            return (0, response_1.forbidden)(res, '账号已被禁用');
        }
        if (user.tokenVersion !== payload.tokenVersion) {
            return (0, response_1.unauthorized)(res, '密码已修改，请重新登录');
        }
        // 设备指纹校验（仅基于 UA，不含 IP，避免移动网络切换误杀）
        // payload.fp 不存在 → 兼容旧 token（首次登录后的旧会话），放行
        // fp 不匹配 → 换设备/浏览器 → 强制拒绝 + 安全告警
        if (payload.fp) {
            const currentFp = computeRequestFingerprint(req);
            if (currentFp !== payload.fp) {
                notifyDeviceMismatch(user.id, req);
                return (0, response_1.unauthorized)(res, '登录环境变更，请重新登录');
            }
        }
        req.user = {
            userId: user.id,
            username: payload.username,
            role: user.role,
            tokenVersion: user.tokenVersion,
        };
        // 更新最后活跃时间（异步，不阻塞请求）
        database_1.prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
        }).catch(() => { });
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return (0, response_1.unauthorized)(res, 'Token已过期，请刷新');
        }
        if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return (0, response_1.unauthorized)(res, 'Token无效');
        }
        next(err);
    }
}
// 仅管理员
function adminMiddleware(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return (0, response_1.forbidden)(res, '需要管理员权限');
    }
    next();
}
// 可选认证：有 Token 则解析，没有也放行
async function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return next();
    }
    const token = header.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, jwt_1.jwtConfig.accessSecret, { algorithms: ['HS256'] });
        const user = await database_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, status: true, role: true, tokenVersion: true },
        });
        if (user && user.status === 'active' && user.tokenVersion === payload.tokenVersion) {
            req.user = { userId: user.id, username: payload.username, role: user.role, tokenVersion: user.tokenVersion };
        }
        next();
    }
    catch {
        next();
    }
}
//# sourceMappingURL=auth.js.map