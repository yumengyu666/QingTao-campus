"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.favoriteSchema = exports.updateCartItemSchema = exports.addToCartSchema = exports.updateGoodsStatusSchema = exports.updateGoodsCommentSchema = exports.createGoodsCommentSchema = exports.goodsListQuery = exports.updateGoodsSchema = exports.createGoodsSchema = void 0;
/**
 * 商品相关 Zod 校验模式
 */
const zod_1 = require("zod");
const common_schema_1 = require("./common.schema");
// ─── 发布/编辑商品 ───
exports.createGoodsSchema = zod_1.z.object({
    title: (0, common_schema_1.sanitizedText)('标题', 100),
    description: (0, common_schema_1.optionalText)('描述'),
    price: zod_1.z.number({ error: '价格必填' }).min(0, '价格不能为负数').max(999999.99, '价格不能超过999999.99'),
    originalPrice: zod_1.z.number().min(0).max(999999.99).optional().nullable(),
    categoryId: zod_1.z.number({ error: '请选择分类' }).int().positive('请选择有效分类'),
    campusArea: common_schema_1.campusArea,
    listType: common_schema_1.listType,
    images: common_schema_1.imageArray,
    condition: zod_1.z.enum(['new', 'like_new', 'good', 'fair', 'poor']).default('good').optional(),
    // 联系方式
    wechat: zod_1.z.string().max(50).optional().or(zod_1.z.literal('')),
    qq: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    phone: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    location: zod_1.z.string().max(100).optional().or(zod_1.z.literal('')),
    // 标签
    tags: zod_1.z.array(zod_1.z.string().max(20)).max(5, '最多5个标签').default([]).optional(),
});
// ─── 编辑商品(部分字段可选) ───
exports.updateGoodsSchema = exports.createGoodsSchema.partial().extend({
    status: zod_1.z.enum(['approved', 'offline', 'sold']).optional(),
});
// ─── 商品列表查询 ───
exports.goodsListQuery = common_schema_1.paginationQuery.extend({
    categoryId: zod_1.z.coerce.number().int().positive().optional(),
    campusArea: common_schema_1.campusArea.optional(),
    listType: common_schema_1.listType.optional(),
    status: zod_1.z.enum(['approved', 'offline', 'sold']).default('approved').optional(),
    keyword: zod_1.z.string().max(100).optional(),
    sort: zod_1.z.enum(['newest', 'cheapest', 'most_expensive', 'most_viewed']).default('newest').optional(),
    minPrice: zod_1.z.coerce.number().min(0).optional(),
    maxPrice: zod_1.z.coerce.number().min(0).optional(),
});
// ─── 商品评论 ───
exports.createGoodsCommentSchema = zod_1.z.object({
    content: (0, common_schema_1.sanitizedText)('评论内容', 500),
    images: common_schema_1.imageArray,
});
exports.updateGoodsCommentSchema = zod_1.z.object({
    content: (0, common_schema_1.sanitizedText)('评论内容', 500),
});
// ─── 商品状态变更 ───
exports.updateGoodsStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['offline', 'sold'], {
        message: '状态必须是 offline(下架) 或 sold(已售出)',
    }),
});
// ─── 购物车操作 ───
exports.addToCartSchema = zod_1.z.object({
    goodsId: zod_1.z.number({ error: '商品ID必填' }).int().positive('商品ID无效'),
    quantity: zod_1.z.number().int().min(1, '数量至少为1').max(99, '数量不能超过99').default(1),
});
exports.updateCartItemSchema = zod_1.z.object({
    quantity: zod_1.z.number().int().min(1, '数量至少为1').max(99, '数量不能超过99'),
});
// ─── 收藏操作 ───
exports.favoriteSchema = zod_1.z.object({
    goodsId: zod_1.z.number({ error: '商品ID必填' }).int().positive('商品ID无效'),
});
//# sourceMappingURL=goods.schema.js.map