/**
 * 简易 ETag 中间件 — 对 GET 请求做条件缓存
 * 基于响应体 MD5 生成 ETag，匹配则返回 304
 */
import { Request, Response, NextFunction } from 'express';
export declare function etagCache(maxAgeSeconds?: number): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=etag.d.ts.map