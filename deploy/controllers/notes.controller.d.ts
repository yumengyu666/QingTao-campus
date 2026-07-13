/**
 * 笔记/收藏夹/话题 Controller 层 — 只做参数提取 + 权限校验 + 响应格式化
 *
 * 业务逻辑已移入：
 *   - services/notes.service.ts      (笔记 CRUD + 互动)
 *   - services/collection.service.ts (收藏夹 CRUD)
 *   - services/tag.service.ts        (话题关注 + 动态流)
 *   - services/view-counter.service.ts (浏览量去重)
 */
import { Request, Response, NextFunction } from 'express';
/** GET /api/notes — 笔记瀑布流 */
export declare function getNotes(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/notes/:id — 笔记详情 */
export declare function getNoteDetail(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/notes — 发布笔记 */
export declare function createNote(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PUT /api/notes/:id — 编辑笔记 */
export declare function updateNote(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/notes/:id — 软删除笔记 */
export declare function deleteNote(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/notes/:id/like/status — 点赞状态 */
export declare function getLikeStatus(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/notes/:id/like — 点赞/取消 */
export declare function toggleLikeNote(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/notes/:id/save — 收藏 */
export declare function saveNote(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/notes/:id/save — 取消收藏 */
export declare function unsaveNote(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/notes/:id/share — 分享计数 */
export declare function shareNote(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/collections — 我的收藏夹列表 */
export declare function getCollections(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/collections — 创建收藏夹 */
export declare function createCollection(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PUT /api/collections/:id — 编辑收藏夹 */
export declare function updateCollection(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/collections/:id — 删除收藏夹 */
export declare function deleteCollection(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/collections/:id/notes — 收藏夹内笔记 */
export declare function getCollectionNotes(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/tags/:id/follow — 关注话题 */
export declare function followTag(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/tags/:id/follow — 取消关注 */
export declare function unfollowTag(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/tags/:name/feed — 话题动态流 */
export declare function getTagFeed(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=notes.controller.d.ts.map