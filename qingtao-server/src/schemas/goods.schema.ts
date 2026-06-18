/**
 * 商品相关 Zod 校验模式
 */
import { z } from 'zod';
import { paginationQuery, campusArea, listType, imageArray, sanitizedText, optionalText } from './common.schema';

// ─── 发布/编辑商品 ───
export const createGoodsSchema = z.object({
  title: sanitizedText('标题', 100),
  description: optionalText('描述'),
  price: z.number({ error: '价格必填' }).min(0, '价格不能为负数').max(999999.99, '价格不能超过999999.99'),
  originalPrice: z.number().min(0).max(999999.99).optional().nullable(),
  categoryId: z.number({ error: '请选择分类' }).int().positive('请选择有效分类'),
  campusArea: campusArea,
  listType: listType,
  images: imageArray,
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).default('good').optional(),
  // 联系方式
  wechat: z.string().max(50).optional().or(z.literal('')),
  qq: z.string().max(20).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  location: z.string().max(100).optional().or(z.literal('')),
  // 标签
  tags: z.array(z.string().max(20)).max(5, '最多5个标签').default([]).optional(),
});

// ─── 编辑商品(部分字段可选) ───
export const updateGoodsSchema = createGoodsSchema.partial().extend({
  status: z.enum(['approved', 'offline', 'sold']).optional(),
});

// ─── 商品列表查询 ───
export const goodsListQuery = paginationQuery.extend({
  categoryId: z.coerce.number().int().positive().optional(),
  campusArea: campusArea.optional(),
  listType: listType.optional(),
  status: z.enum(['approved', 'offline', 'sold']).default('approved').optional(),
  keyword: z.string().max(100).optional(),
  sort: z.enum(['newest', 'cheapest', 'most_expensive', 'most_viewed']).default('newest').optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

// ─── 商品评论 ───
export const createGoodsCommentSchema = z.object({
  content: sanitizedText('评论内容', 500),
  images: imageArray,
});

export const updateGoodsCommentSchema = z.object({
  content: sanitizedText('评论内容', 500),
});

// ─── 商品状态变更 ───
export const updateGoodsStatusSchema = z.object({
  status: z.enum(['offline', 'sold'], {
    message: '状态必须是 offline(下架) 或 sold(已售出)',
  }),
});

// ─── 购物车操作 ───
export const addToCartSchema = z.object({
  goodsId: z.number({ error: '商品ID必填' }).int().positive('商品ID无效'),
  quantity: z.number().int().min(1, '数量至少为1').max(99, '数量不能超过99').default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, '数量至少为1').max(99, '数量不能超过99'),
});

// ─── 收藏操作 ───
export const favoriteSchema = z.object({
  goodsId: z.number({ error: '商品ID必填' }).int().positive('商品ID无效'),
});
