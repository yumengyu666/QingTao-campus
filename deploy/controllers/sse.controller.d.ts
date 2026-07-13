import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/sse/notifications — SSE 实时通知流
 * 前端: const es = new EventSource('/api/sse/notifications?token=xxx')
 * token 通过 query 传递（EventSource 不支持自定义 header）
 */
export declare function sseNotifications(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=sse.controller.d.ts.map