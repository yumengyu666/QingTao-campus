import { Request, Response, NextFunction } from 'express';
/** GET /api/wanted — 求购列表 */
export declare function getList(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/wanted/:id — 求购详情 */
export declare function getDetail(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/wanted — 发布求购 */
export declare function createWanted(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/wanted/:id */
export declare function deleteWanted(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=wanted.controller.d.ts.map