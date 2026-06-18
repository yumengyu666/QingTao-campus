/**
 * Zod 校验模式统一导出
 *
 * 使用方式：
 *   import { validate } from '@/middleware/validate';
 *   import { createGoodsSchema } from '@/schemas';
 *   router.post('/', authMiddleware, validate(createGoodsSchema), controller.create);
 */
export * from './common.schema';
export * from './auth.schema';
export * from './goods.schema';
export * from './post.schema';
export * from './message.schema';
