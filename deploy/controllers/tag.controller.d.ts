import { Request, Response, NextFunction } from 'express';
/** GET /api/tags — 热门标签列表 */
export declare function getTags(_req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/tags/:name/posts — 标签下的帖子 */
export declare function getPostsByTag(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=tag.controller.d.ts.map