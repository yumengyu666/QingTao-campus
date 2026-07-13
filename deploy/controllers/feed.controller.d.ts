import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/feed — 关注动态流
 * 聚合我关注用户的最新动态（商品+帖子+失物招领）
 */
export declare function getFollowingFeed(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=feed.controller.d.ts.map