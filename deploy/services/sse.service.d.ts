/**
 * Server-Sent Events 服务
 * 维护在线客户端连接，通知创建时广播
 */
import { Response } from 'express';
export declare function addClient(userId: number, res: Response): void;
export declare function removeClient(userId: number, res: Response): void;
/**
 * 向指定用户推送 SSE 事件
 */
export declare function pushToUser(userId: number, event: string, data: any): void;
/**
 * 广播给所有在线客户端
 */
export declare function broadcast(event: string, data: any): void;
//# sourceMappingURL=sse.service.d.ts.map