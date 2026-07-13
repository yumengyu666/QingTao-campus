import { Request, Response, NextFunction } from 'express';
/** GET /api/stats/leaderboard — 用户排行榜 */
export declare function getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/stats/summary — 平台概览统计 */
export declare function getSummary(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=stats.controller.d.ts.map