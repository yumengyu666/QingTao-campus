import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { prisma } from '../config/database';
import { unauthorized, forbidden } from '../utils/response';
import type { JwtPayload } from '../types/express';

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
