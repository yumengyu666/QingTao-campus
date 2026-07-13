import { Request, Response, NextFunction } from 'express';
export declare function getCartList(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/cart — 加入购物车
 *
 * 防重复层级：
 * L1: Prisma @@unique([userId, goodsId]) 数据库约束
 * L2: 先查后插 (findUnique → 已存在则返回提示)
 */
export declare function addToCart(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function removeFromCart(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getCartCount(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=cart.controller.d.ts.map