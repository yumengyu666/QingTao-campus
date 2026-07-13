import { Request, Response, NextFunction } from 'express';
/**
 * 请求ID中间件：每个请求生成唯一ID，注入 req.headers 和响应头
 * 用于链路追踪和错误定位
 */
export declare function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=requestId.d.ts.map