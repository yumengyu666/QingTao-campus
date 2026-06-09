import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

/**
 * 请求ID中间件：每个请求生成唯一ID，注入 req.headers 和响应头
 * 用于链路追踪和错误定位
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const requestId = randomBytes(8).toString('hex');
  (req as any).requestId = requestId;
  _res.setHeader('X-Request-ID', requestId);
  next();
}
