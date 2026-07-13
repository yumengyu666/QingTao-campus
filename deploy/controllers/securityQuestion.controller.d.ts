import { Request, Response, NextFunction } from 'express';
/** GET /api/users/security-questions — 获取我的安全问题（不含答案） */
export declare function getMyQuestions(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PUT /api/users/security-questions — 设置/更新安全问题 */
export declare function setQuestions(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/auth/verify-questions — 用户验证安全问题来重置密码（无需登录） */
export declare function verifyQuestions(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/users/:username/questions — 获取某用户设置的问题（用于找回密码页面，不含答案） */
export declare function getUserQuestions(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=securityQuestion.controller.d.ts.map