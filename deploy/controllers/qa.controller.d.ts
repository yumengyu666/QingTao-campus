import { Request, Response, NextFunction } from 'express';
/** GET /api/qa */
export declare function getList(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/qa */
export declare function createPost(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** GET /api/qa/:id */
export declare function getDetail(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/qa/:id/answers */
export declare function createAnswer(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/qa/answers/:id/vote */
export declare function toggleVote(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/qa/answers/:id/best */
export declare function markBest(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=qa.controller.d.ts.map