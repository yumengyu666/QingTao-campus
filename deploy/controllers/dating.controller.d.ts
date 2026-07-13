import { Request, Response, NextFunction } from 'express';
/** GET /api/dating/profile */
export declare function getProfile(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/dating/profile */
export declare function updateProfile(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/dating/posts */
export declare function getPosts(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/dating/posts */
export declare function createPost(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/dating/:userId/follow */
export declare function followUser(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/dating/:userId/request — 发起恋爱请求 */
export declare function sendRequest(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PATCH /api/dating/requests/:requestId — 接受/拒绝恋爱请求 */
export declare function handleRequest(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/dating/requests — 查看我的恋爱请求列表 */
export declare function getRequests(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/dating/relationship/:userId — 断开恋爱关系 */
export declare function breakRelationship(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/dating/:userId/follow — 取消关注 */
export declare function unfollowUser(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/dating/following — 获取我关注的人的 userId 列表 */
export declare function getFollowing(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PUT /api/dating/posts/:postId — 编辑恋爱帖子 */
export declare function updatePost(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/dating/posts/:postId — 删除恋爱帖子 */
export declare function deletePost(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=dating.controller.d.ts.map