import { Request, Response, NextFunction } from 'express';
/** POST /api/reservations — 买家预约看货 */
export declare function createReservation(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/reservations — 我的预约列表（买家+卖家） */
export declare function getMyReservations(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PATCH /api/reservations/:id/accept — 卖家接受预约 */
export declare function acceptReservation(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** PATCH /api/reservations/:id/reject — 卖家拒绝预约 */
export declare function rejectReservation(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** DELETE /api/reservations/:id — 买家取消预约 */
export declare function cancelReservation(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** 定时任务：释放过期预约 */
export declare function expireReservations(): Promise<void>;
//# sourceMappingURL=reservation.controller.d.ts.map