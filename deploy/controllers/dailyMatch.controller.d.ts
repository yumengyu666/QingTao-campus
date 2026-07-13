import { Request, Response, NextFunction } from 'express';
/** GET /api/dating/daily-match — 获取今日缘分 */
export declare function getDailyMatch(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/dating/daily-match/:id/reveal — 双方确认亮身份 */
export declare function revealIdentity(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=dailyMatch.controller.d.ts.map