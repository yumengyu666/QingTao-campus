/**
 * 文字审核中间件 — v2：词表同步 + AI 异步
 */
import { Request, Response, NextFunction } from 'express';
declare function isHighRisk(text: string): boolean;
export declare function containsSensitive(text: string): boolean;
export { isHighRisk };
export declare function moderateTextSync(text: string): boolean;
export declare function moderateText(text: string): Promise<boolean>;
/**
 * 内联 AI 审核结果处理 — 用于 afterCreate 之外的场景
 * 返回 'safe' | 'violation' | 'error'，调用方根据结果执行对应操作
 */
export declare function checkAndApply(text: string, opts: {
    onSafe: () => Promise<void>;
    onViolation: () => Promise<void>;
    onError?: () => Promise<void>;
}): Promise<void>;
export declare function moderateBody(fields: string[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function afterCreate(contentType: 'goods' | 'post' | 'lostfound' | 'message', contentId: number, userId: number, fields: {
    field: string;
    text: string;
}[]): Promise<void>;
/**
 * 启动审核恢复扫描：扫描所有 pending 状态的内容，对未审核项进行补审。
 * 防止因进程崩溃导致的内容永久不被 AI 审核。
 */
export declare function recoveryScan(): Promise<void>;
//# sourceMappingURL=moderation.middleware.d.ts.map