import { Request, Response, NextFunction } from 'express';
/**
 * POST /api/drafts — 保存草稿
 */
export declare function saveDraft(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/drafts/:type — 获取草稿
 */
export declare function getDraft(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * DELETE /api/drafts/:type — 删除草稿
 */
export declare function deleteDraft(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=draft.controller.d.ts.map