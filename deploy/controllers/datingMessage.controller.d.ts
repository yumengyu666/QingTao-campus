import { Request, Response, NextFunction } from 'express';
/** GET /api/dating/messages/:userId — 获取与某人的恋爱消息 */
export declare function getMessages(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/dating/messages/:userId — 发送恋爱消息 */
export declare function sendMessage(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/dating/messages/unread-count — 恋爱区未读消息总数 */
export declare function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/dating/conversations — 获取恋爱区会话列表（单条 SQL 消除 N+1） */
export declare function getConversations(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/dating/messages/:userId/typing */
export declare function setTyping(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/** GET /api/dating/messages/:userId/typing */
export declare function getTyping(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=datingMessage.controller.d.ts.map