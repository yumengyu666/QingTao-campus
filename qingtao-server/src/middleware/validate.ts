/**
 * Zod 请求体验证中间件
 * 用法: router.post('/api/goods', authMiddleware, validate(createGoodsSchema), ctrl.createGoods)
 */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

interface ValidationError {
  field: string;
  message: string;
}

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
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
