import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/data/export — 导出个人数据（GDPR-lite）
 */
export declare function exportMyData(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/data/activity — 用户活跃统计
 */
export declare function getActivity(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=data.controller.d.ts.map