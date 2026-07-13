import { Request, Response, NextFunction } from 'express';
/** GET /api/admin/logs — 管理员查看操作日志 */
export declare function getAdminLogs(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/admin/stats/dashboard — 管理后台仪表盘数据 */
export declare function adminDashboard(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=log.controller.d.ts.map