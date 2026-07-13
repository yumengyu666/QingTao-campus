import { Request, Response, NextFunction } from 'express';
/** GET /api/treehole — 帖子列表（游客可访问） */
export declare function getList(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/treehole/:id — 帖子详情 + 评论 */
export declare function getDetail(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/treehole — 发帖（游客可访问，后端生成匿名 code） */
export declare function createPost(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/treehole/:id/comments — 评论（游客可访问，后端生成匿名 code） */
export declare function createComment(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 点赞防刷：数据库持久化（IP + 帖子ID 唯一约束）
 *
 * 防护层级：
 * L1: DB @@unique([clientIp, postId]) — 同一IP对同一帖子只能点赞一次，重启不丢失
 * L2: 取消赞需先有记录 — 防止负数点赞
 * L3: 定时清理30天前旧记录 — 防止表无限增长
 */
/** POST /api/treehole/:id/like — 点赞/取消赞（游客可访问） */
export declare function toggleLike(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=treehole.controller.d.ts.map