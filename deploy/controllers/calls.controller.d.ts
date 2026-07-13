import { Request, Response, NextFunction } from 'express';
/** POST /api/calls/initiate — 发起通话 */
export declare function initiateCall(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/calls/:id/answer — 接听通话 */
export declare function answerCall(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/calls/:id/reject — 拒接通话 */
export declare function rejectCall(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/calls/:id/end — 结束通话 */
export declare function endCall(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/calls/history — 通话记录 */
export declare function getCallHistory(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/calls/:id — 查询通话状态（轮询用） */
export declare function getCallStatus(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=calls.controller.d.ts.map