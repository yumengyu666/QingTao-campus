import { Request, Response, NextFunction } from 'express';
/** POST /api/barter — 发起物品交换提议 */
export declare function proposeBarter(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/barter — 我的交换提议列表 */
export declare function getProposals(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PATCH /api/barter/:id/accept */
export declare function acceptBarter(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PATCH /api/barter/:id/reject */
export declare function rejectBarter(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=barter.controller.d.ts.map