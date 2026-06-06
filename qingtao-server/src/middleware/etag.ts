/**
 * 简易 ETag 中间件 — 对 GET 请求做条件缓存
 * 基于响应体 MD5 生成 ETag，匹配则返回 304
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function etagCache(maxAgeSeconds = 300) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      // 计算 ETag
      const hash = crypto.createHash('md5').update(JSON.stringify(body)).digest('hex');
      const etag = `"${hash}"`;

      // 设置缓存头
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`);

      // 检查 If-None-Match
      const clientEtag = req.headers['if-none-match'] as string;
      if (clientEtag === etag) {
        return res.status(304).end();
      }

      return originalJson(body);
    };

    next();
  };
}
