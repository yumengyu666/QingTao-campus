import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { jwtConfig } from '../config/jwt';
import { prisma } from '../config/database';
import { unauthorized, forbidden } from '../utils/response';
import { logger } from '../utils/logger';
import type { JwtPayload } from '../types/express';

/**
 * 计算当前请求的设备指纹哈希：仅使用 User-Agent
 * - UA 代表浏览器+操作系统组合，换设备/浏览器 → 指纹变化
 * - 不与 IP 绑定：同设备切换 WiFi/移动网络不受影响
 */
function computeRequestFingerprint(req: Request): string {
  const ua = req.headers['user-agent'] || '';
  return crypto.createHash('sha256').update(ua).digest('hex').slice(0, 16);
}

/** 异步通知用户跨设备登录告警（去重：同一用户 1 小时内最多 1 条） */
const recentAlerts = new Map<number, number>();
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of recentAlerts) { if (now - t > 60 * 60 * 1000) recentAlerts.delete(k); }
}, 10 * 60 * 1000).unref();

async function notifyDeviceMismatch(userId: number, req: Request) {
  if (recentAlerts.has(userId)) return; // 1 小时内已通知过
  recentAlerts.set(userId, Date.now());

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  logger.warn(`[AUTH] Device fingerprint mismatch for user ${userId}: current IP=${ip} UA=${ua.slice(0, 80)}`);

  try {
    const { createNotification } = await import('../services/notification.service');
    await createNotification({
      userId,
      type: 'security_alert',
      title: '账号登录环境异常',
      content: `您的账号在新的设备/IP（${ip}）上被访问。若非本人操作，请尽快修改密码并退出其他设备。`,
    });
  } catch { /* 通知失败不影响主流程 */ }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return unauthorized(res, '未登录');
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, jwtConfig.accessSecret, { algorithms: ['HS256'] }) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, status: true, role: true, tokenVersion: true },
    });

    if (!user) {
      return unauthorized(res, '用户不存在');
    }
    if (user.status === 'disabled') {
      return forbidden(res, '账号已被禁用');
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      return unauthorized(res, '密码已修改，请重新登录');
    }

    // 设备指纹校验（仅基于 UA，不含 IP，避免移动网络切换误杀）
    // payload.fp 不存在 → 兼容旧 token（首次登录后的旧会话），放行
    // fp 不匹配 → 换设备/浏览器 → 强制拒绝 + 安全告警
    if (payload.fp) {
      const currentFp = computeRequestFingerprint(req);
      if (currentFp !== payload.fp) {
        notifyDeviceMismatch(user.id, req);
        return unauthorized(res, '登录环境变更，请重新登录');
      }
    }

    req.user = {
      userId: user.id,
      username: payload.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    // 更新最后活跃时间（异步，不阻塞请求）
    prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return unauthorized(res, 'Token已过期，请刷新');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return unauthorized(res, 'Token无效');
    }
    next(err);
  }
}

// 仅管理员
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return forbidden(res, '需要管理员权限');
  }
  next();
}

// 可选认证：有 Token 则解析，没有也放行
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, jwtConfig.accessSecret, { algorithms: ['HS256'] }) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, status: true, role: true, tokenVersion: true },
    });
    if (user && user.status === 'active' && user.tokenVersion === payload.tokenVersion) {
      req.user = { userId: user.id, username: payload.username, role: user.role, tokenVersion: user.tokenVersion };
    }
    next();
  } catch {
    next();
  }
}
