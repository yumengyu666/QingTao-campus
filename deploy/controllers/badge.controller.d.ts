import { Request, Response, NextFunction } from 'express';
/** GET /api/badges — 我的徽章 */
export declare function getMyBadges(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/badges/all — 所有可用徽章 */
export declare function getAllBadges(_req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=badge.controller.d.ts.map