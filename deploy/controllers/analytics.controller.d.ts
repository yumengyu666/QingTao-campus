import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/analytics/trending — 趋势分析
 * 返回当前热门分类、最活跃时段、新用户趋势
 */
export declare function getTrending(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/analytics/user/:userId — 用户个人数据统计
 */
export declare function getUserAnalytics(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=analytics.controller.d.ts.map