import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/explore — 发现页聚合数据
 * 返回热门标签、最新答疑、最新求职、平台统计摘要
 */
export declare function getExplore(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=explore.controller.d.ts.map