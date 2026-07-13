import { Request, Response, NextFunction } from 'express';
/**
 * POST /api/upload/image
 * 上传后生成清晰版 + 模糊版，创建 ImageReview 记录
 * 返回 { urls: [{ url, blurredUrl, reviewId }] }
 */
export declare function uploadImage(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/upload/file
 * 通用文件上传（PDF/Word/ZIP 等文档），不经过图片压缩
 */
export declare function uploadFile(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/upload/avatar
 * 上传头像 — 压缩后直接更新用户 avatarUrl
 */
export declare function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/upload/voice — 上传语音 */
export declare function uploadVoice(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/upload/chat-file — 上传聊天文件 */
export declare function uploadChatFile(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=upload.controller.d.ts.map