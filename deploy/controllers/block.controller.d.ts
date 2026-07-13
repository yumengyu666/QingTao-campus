import { Request, Response, NextFunction } from 'express';
/** POST /api/block/:userId — 拉黑用户 */
export declare function blockUser(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/block/:userId — 取消拉黑 */
export declare function unblockUser(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/block — 获取拉黑列表 */
export declare function getBlockedList(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=block.controller.d.ts.map