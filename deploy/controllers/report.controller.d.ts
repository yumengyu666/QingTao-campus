import { Request, Response, NextFunction } from 'express';
/**
 * POST /api/reports/messages
 * 举报聊天消息 — 选择多条消息，AI审核，累计违规计数
 * Body: { reportedUserId: number, messageIds: number[] }
 */
export declare function reportMessages(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 定时清除过期的私信限制（每分钟检查一次）
 */
export declare function startViolationClear(): void;
//# sourceMappingURL=report.controller.d.ts.map