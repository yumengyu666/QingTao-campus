import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { jwtConfig } from './config/jwt';
import { prisma } from './config/database';
import { globalLimiter } from './middleware/rateLimiter';
import { enumerationGuard } from './middleware/enumerationGuard';
import { errorHandler } from './middleware/errorHandler';
import { etagCache } from './middleware/etag';
import { requestLogger, slowQueryWarn } from './middleware/requestLogger';
import routes from './routes/index';
import { logger } from './utils/logger';

const app = express();

// Security headers
app.use(helmet({
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
app.use(compression());

// CORS
app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
  maxAge: 86400,
}));

// Request ID — 链路追踪
import { requestIdMiddleware } from './middleware/requestId';
app.use(requestIdMiddleware);

// Request logging + slow query warning
app.use(requestLogger);
app.use(slowQueryWarn(2000));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Global: 封号用户拦截 — 所有请求一律禁止
app.use(async (req, res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), jwtConfig.accessSecret, { algorithms: ['HS256'] }) as any;
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { status: true },
      });
      if (!user || user.status === 'disabled') {
        return res.status(403).json({ code: 403, message: '账号已被封禁，所有操作被禁止', data: null });
      }
    } catch {
      // Token 无效/过期 → 放行，由后续 authMiddleware 处理
    }
  }
  next();
});

// Rate limiting
app.use('/api/', globalLimiter);

// URL enumeration protection
app.use('/api/', enumerationGuard);

// Request logging with response time
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - t0;
    const level = res.statusCode >= 400 ? 'warn' : 'http';
    if (elapsed > 1000) {
      logger.warn(`SLOW ${req.method} ${req.path} ${res.statusCode} ${elapsed}ms`, { ip: req.ip });
    } else {
      logger[level](`${req.method} ${req.path} ${res.statusCode} ${elapsed}ms`);
    }
  });
  next();
});

// Static files — uploaded images
app.use('/uploads', express.static(path.resolve(env.UPLOAD_PATH), {
  maxAge: '7d',
  immutable: true,
}));

// ETag 缓存 — 静态数据接口（必须在 /api 之前，Express 中间件按顺序执行）
app.use('/api/banners', etagCache(300));
app.use('/api/categories', etagCache(300));
app.use('/api/notifications/announcements', etagCache(120));

// API routes
app.use('/api', routes);

// Frontend static (production)
const frontendDist = path.resolve(__dirname, '../dist');
app.use(express.static(frontendDist, { maxAge: '1d', fallthrough: true }));
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api/')) return next();
  const indexPath = path.join(frontendDist, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// Health check — 限制每分钟 30 次，减少信息暴露
import rateLimit from 'express-rate-limit';
const healthLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: '请求过于频繁', data: null },
});
app.get('/health', healthLimiter, async (_req, res) => {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {}
  res.json({
    status: dbOk ? 'ok' : 'degraded',
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null });
});

// Error handler
app.use(errorHandler);

export default app;
