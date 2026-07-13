import { Request, Response, NextFunction } from 'express';
/**
 * POST /api/admin/reports/stats — 举报统计
 * 返回各类举报的数量分布
 */
export declare function getReportStats(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=reportStats.controller.d.ts.map