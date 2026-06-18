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
import { ZodError } from 'zod';

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schema: ZodSchema | ValidationSchemas): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 兼容旧版单 schema 用法（默认校验 body）
      // Zod 4 的 ZodSchema 是类型，用 typeof schema.parse 判断
      if (typeof (schema as ZodSchema).parse === 'function' && !('body' in (schema as Record<string, unknown>)) && !('query' in (schema as Record<string, unknown>))) {
        req.body = (schema as ZodSchema).parse(req.body);
        next();
        return;
      }

      // 新版多 schema 用法
      const schemas = schema as ValidationSchemas;

      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as any;
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: ValidationError[] = err.issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          code: 400,
          message: '请求参数有误',
          errors,
          data: null,
        });
      }
      next(err);
    }
  };
}

// 便捷函数：仅校验 query 参数
export function validateQuery(schema: ZodSchema) {
  return validate({ query: schema });
}

// 便捷函数：仅校验 params 参数
export function validateParams(schema: ZodSchema) {
  return validate({ params: schema });
}
