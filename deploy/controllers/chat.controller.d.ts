import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/chat/search?keyword=xxx — 搜索自己的聊天消息
 */
export declare function searchChatMessages(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/chat/read-all — 标记所有私信为已读
 */
export declare function readAllMessages(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=chat.controller.d.ts.map