"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./config/env");
const jwt_1 = require("./config/jwt");
const database_1 = require("./config/database");
const rateLimiter_1 = require("./middleware/rateLimiter");
const enumerationGuard_1 = require("./middleware/enumerationGuard");
const errorHandler_1 = require("./middleware/errorHandler");
const etag_1 = require("./middleware/etag");
const requestLogger_1 = require("./middleware/requestLogger");
const index_1 = __importDefault(require("./routes/index"));
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
// Security headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // CSP 放宽以兼容微信/QQ 内置浏览器（X5 内核）
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https:", "wss:"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));
// Gzip compression
app.use((0, compression_1.default)());
// CORS
app.use((0, cors_1.default)({
    origin: env_1.env.ALLOWED_ORIGINS,
    credentials: true,
    maxAge: 86400,
}));
// Request ID — 链路追踪
const requestId_1 = require("./middleware/requestId");
app.use(requestId_1.requestIdMiddleware);
// Request logging + slow query warning
app.use(requestLogger_1.requestLogger);
app.use((0, requestLogger_1.slowQueryWarn)(2000));
// Body parsing
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: false, limit: '1mb' }));
// Global: 封号用户拦截 — 所有请求一律禁止
app.use(async (req, res, next) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
        try {
            const payload = jsonwebtoken_1.default.verify(header.slice(7), jwt_1.jwtConfig.accessSecret, { algorithms: ['HS256'] });
            const user = await database_1.prisma.user.findUnique({
                where: { id: payload.userId },
                select: { status: true },
            });
            if (!user || user.status === 'disabled') {
                return res.status(403).json({ code: 403, message: '账号已被封禁，所有操作被禁止', data: null });
            }
        }
        catch {
            // Token 无效/过期 → 放行，由后续 authMiddleware 处理
        }
    }
    next();
});
// Rate limiting
app.use('/api/', rateLimiter_1.globalLimiter);
// URL enumeration protection
app.use('/api/', enumerationGuard_1.enumerationGuard);
// Request logging with response time
app.use((req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () => {
        const elapsed = Date.now() - t0;
        const level = res.statusCode >= 400 ? 'warn' : 'http';
        if (elapsed > 1000) {
            logger_1.logger.warn(`SLOW ${req.method} ${req.path} ${res.statusCode} ${elapsed}ms`, { ip: req.ip });
        }
        else {
            logger_1.logger[level](`${req.method} ${req.path} ${res.statusCode} ${elapsed}ms`);
        }
    });
    next();
});
// Static files — uploaded images
app.use('/uploads', express_1.default.static(path_1.default.resolve(env_1.env.UPLOAD_PATH), {
    maxAge: '7d',
    immutable: true,
}));
// ETag 缓存 — 静态数据接口（必须在 /api 之前，Express 中间件按顺序执行）
app.use('/api/banners', (0, etag_1.etagCache)(300));
app.use('/api/categories', (0, etag_1.etagCache)(300));
app.use('/api/notifications/announcements', (0, etag_1.etagCache)(120));
// API routes
app.use('/api', index_1.default);
// Frontend static (production)
const frontendDist = path_1.default.resolve(__dirname, '.');
app.use(express_1.default.static(frontendDist, { maxAge: '1d', fallthrough: true }));
app.get('*', (_req, res, next) => {
    if (_req.path.startsWith('/api/') || _req.path === '/health')
        return next();
    const indexPath = path_1.default.join(frontendDist, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        next();
    }
});
// Health check — 限制每分钟 30 次，减少信息暴露
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const healthLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 429, message: '请求过于频繁', data: null },
});
app.get('/health', healthLimiter, async (_req, res) => {
    let dbOk = false;
    try {
        await database_1.prisma.$queryRaw `SELECT 1`;
        dbOk = true;
    }
    catch { }
    res.json({
        status: dbOk ? 'ok' : 'degraded',
    });
});
// 404
app.use((_req, res) => {
    res.status(404).json({ code: 404, message: '接口不存在', data: null });
});
// Error handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map