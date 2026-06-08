import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// 全局限制：每分钟 200 次，超出后等待窗口重置
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: '请求过于频繁，请稍后再试', data: null },
  skipFailedRequests: true,
});

// 登录限制：每IP每分钟N次（成功不计入限制）
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { code: 429, message: '登录尝试过于频繁，请1分钟后再试', data: null },
});

// 注册限制：每分钟 5 次（成功不计入限制）
export const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { code: 429, message: '注册过于频繁，请1分钟后再试', data: null },
});

// 发布限制：每用户每分钟N次（已登录按userId，未登录按IP）
export const publishLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_PUBLISH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: '发布过于频繁，请稍后再试', data: null },
  keyGenerator: (req) => {
    // 已登录用户按 userId 限流，避免校园共享 IP 误伤
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(Buffer.from(authHeader.slice(7).split('.')[1], 'base64').toString());
        return `user:${payload.userId}`;
      } catch { /* fall through to IP */ }
    }
    return req.ip || 'unknown';
  },
});

// 敏感操作限制：修改密码/注销账号 — 每用户每小时最多 3 次
export const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: '敏感操作过于频繁，请1小时后再试', data: null },
  keyGenerator: (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(Buffer.from(authHeader.slice(7).split('.')[1], 'base64').toString());
        return `sensitive:${payload.userId}`;
      } catch {}
    }
    return req.ip || 'unknown';
  },
});

// Agent 智能助手限制：每用户每日50次
export const agentLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: '小轻今天有点累了，明天再来找我聊天吧 😴', data: null },
  keyGenerator: (req) => {
    if (req.user?.userId) return `agent:${req.user.userId}`;
    return `agent:ip:${req.ip}`;
  },
});

