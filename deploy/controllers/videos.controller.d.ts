import { Request, Response, NextFunction } from 'express';
/** GET /api/videos/feed — 视频推荐流 */
export declare function getVideoFeed(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/videos/:id — 视频详情 */
export declare function getVideoDetail(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/videos — 发布视频 */
export declare function createVideo(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/videos/:id — 软删除 */
export declare function deleteVideo(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/videos/:id/like — 点赞/取消 */
export declare function toggleLikeVideo(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/videos/:id/comments — 评论列表 */
export declare function getVideoComments(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/videos/:id/comments — 发表评论 */
export declare function createVideoComment(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/videos/:id/comments/:cid — 删除评论 */
export declare function deleteVideoComment(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/videos/:id/view — 观看记录 */
export declare function recordView(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/videos/:id/share — 分享计数 */
export declare function shareVideo(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/videos/user/:userId — 用户视频列表 */
export declare function getUserVideos(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/videos/search — 视频搜索 */
export declare function searchVideos(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=videos.controller.d.ts.map