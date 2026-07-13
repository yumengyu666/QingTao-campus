import { Request, Response, NextFunction } from 'express';
/** GET /api/resources — 列表（热门前排，不返回 fileUrl） */
export declare function getResources(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/resources/:id — 详情（返回 fileUrl 并 +1 下载数） */
export declare function getResource(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/resources — 上传资料（需登录） */
export declare function createResource(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PUT /api/resources/:id — 编辑资料元数据（仅上传者本人） */
export declare function updateResource(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/resources/:id — 删除（上传者本人或管理员） */
export declare function deleteResource(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/resources/:id/download — 下载计数+1（原子操作，返回 fileUrl） */
export declare function downloadResource(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/resources/:id/like — 点赞/取消赞 */
export declare function toggleLike(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/resources/:id/report — 举报资料（#41，虚假/过时资料） */
export declare function reportResource(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=courseResource.controller.d.ts.map