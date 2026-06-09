import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`, {
      method,
      url: originalUrl,
      status: statusCode,
      duration,
      ip,
      userId: (req as any).user?.userId,
    });
  });

  next();
}

export function slowQueryWarn(thresholdMs = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > thresholdMs) {
        logger.warn(`⚠️ Slow query: ${req.method} ${req.originalUrl} took ${duration}ms`);
      }
    });
    next();
  };
}
