import { Request, Response, NextFunction } from 'express';
export declare function addPoints(userId: number, action: string): Promise<{
    points: number;
    level: number;
} | null>;
/** GET /api/users/me/points — 我的积分 */
export declare function getMyPoints(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=points.controller.d.ts.map