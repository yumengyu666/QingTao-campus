/**
 * Zod 请求体验证中间件 (增强版)
 * 支持 body / query / params 联合校验
 *
 * 用法:
 *   // 仅校验 body
 *   router.post('/api/goods', validate({ body: createGoodsSchema }), ctrl.create)
 *
 *   // 仅校验 query (GET 请求)
 *   router.get('/api/goods', validate({ query: goodsListQuery }), ctrl.list)
 *
 *   // 同时校验 body + query + params
 *   router.put('/api/goods/:id', validate({ params: idParam, body: updateGoodsSchema }), ctrl.update)
 */
import { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
interface ValidationSchemas {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}
export declare function validate(schema: ZodSchema | ValidationSchemas): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateQuery(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateParams(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=validate.d.ts.map