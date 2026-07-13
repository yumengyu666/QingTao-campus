import { Request, Response, NextFunction } from 'express';
/** POST /api/checkin — 签到 */
export declare function checkin(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/checkin — 今日签到状态 + 连续天数 */
export declare function getStatus(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=checkin.controller.d.ts.map