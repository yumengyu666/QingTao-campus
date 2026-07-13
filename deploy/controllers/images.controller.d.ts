import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/admin/images?status=pending&page=1 — 图片审核列表
 */
export declare function getImages(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/admin/images/:id/approve — 审核通过单张图片
 */
export declare function approveImage(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/admin/images/:id/reject — 审核拒绝单张图片
 */
export declare function rejectImage(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/admin/images/batch — 批量审核图片
 */
export declare function batchImageReview(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/admin/stats/review — 审核统计
 */
export declare function getReviewStats(_req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/images/status — 批量查询图片审核状态
 */
export declare function checkStatus(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=images.controller.d.ts.map