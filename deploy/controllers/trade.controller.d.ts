/**
 * 线下交易控制器
 * 买家表达购买意向 → 卖家确认 → 见面交易 → 标记售出 → 双方互评
 * 纯线下交易，无支付功能
 */
import { Request, Response, NextFunction } from 'express';
/** POST /api/trades/intent — 买家表达购买意向 */
export declare function createIntent(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/trades/intents — 我的交易意向列表 */
export declare function getMyIntents(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PUT /api/trades/:id/accept — 卖家接受意向 */
export declare function acceptIntent(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PUT /api/trades/:id/reject — 卖家拒绝意向 */
export declare function rejectIntent(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PUT /api/trades/:id/complete — 卖家标记交易完成 */
export declare function completeTrade(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/trades/:id/review — 提交交易评价 */
export declare function submitReview(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/users/:userId/reviews — 查看用户收到的评价 */
export declare function getUserReviews(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=trade.controller.d.ts.map