"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTreeHoleCommentSchema = exports.createTreeHoleSchema = exports.createLostFoundCommentSchema = exports.lostFoundListQuery = exports.updateLostFoundSchema = exports.createLostFoundSchema = exports.createPostCommentSchema = exports.postListQuery = exports.updatePostSchema = exports.createPostSchema = void 0;
/**
 * 帖子/失物招领/树洞 Zod 校验模式
 */
const zod_1 = require("zod");
const common_schema_1 = require("./common.schema");
// ─── 发布帖子 ───
exports.createPostSchema = zod_1.z.object({
    title: (0, common_schema_1.optionalText)('标题', 100),
    content: (0, common_schema_1.sanitizedText)('内容', 5000),
    images: common_schema_1.imageArray,
    tags: zod_1.z.array(zod_1.z.string().max(20)).max(5, '最多5个标签').default([]).optional(),
    location: zod_1.z.string().max(100).optional().or(zod_1.z.literal('')),
});
// ─── 更新帖子 ───
exports.updatePostSchema = exports.createPostSchema.partial();
// ─── 帖子列表查询 ───
exports.postListQuery = common_schema_1.paginationQuery.extend({
    tag: zod_1.z.string().max(30).optional(),
    keyword: zod_1.z.string().max(100).optional(),
    sort: zod_1.z.enum(['newest', 'hottest']).default('newest').optional(),
});
// ─── 帖子评论 ───
exports.createPostCommentSchema = zod_1.z.object({
    content: (0, common_schema_1.sanitizedText)('评论内容', 500),
    images: zod_1.z.array(zod_1.z.string()).max(3, '评论最多上传3张图片').default([]).optional(),
});
// ─── 发布失物招领 ───
exports.createLostFoundSchema = zod_1.z.object({
    title: (0, common_schema_1.sanitizedText)('标题', 100),
    description: (0, common_schema_1.optionalText)('描述'),
    type: zod_1.z.enum(['lost', 'found'], {
        message: '类型必须是 lost(寻物) 或 found(招领)',
    }),
    campusArea: common_schema_1.campusArea,
    images: common_schema_1.imageArray,
    location: zod_1.z.string().max(200, '位置最多200个字符').optional().or(zod_1.z.literal('')),
    lostTime: zod_1.z.string().optional().or(zod_1.z.literal('')),
    reward: zod_1.z.string().max(200).optional().or(zod_1.z.literal('')),
    contactName: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    wechat: zod_1.z.string().max(50).optional().or(zod_1.z.literal('')),
    qq: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    phone: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
});
// ─── 更新失物招领 ───
exports.updateLostFoundSchema = exports.createLostFoundSchema.partial();
// ─── 失物列表查询 ───
exports.lostFoundListQuery = common_schema_1.paginationQuery.extend({
    type: zod_1.z.enum(['lost', 'found']).optional(),
    campusArea: common_schema_1.campusArea.optional(),
    status: zod_1.z.enum(['pending', 'resolved', 'offline']).optional(),
    keyword: zod_1.z.string().max(100).optional(),
});
// ─── 失物评论 ───
exports.createLostFoundCommentSchema = zod_1.z.object({
    content: (0, common_schema_1.sanitizedText)('评论内容', 500),
});
// ─── 树洞发布 ───
exports.createTreeHoleSchema = zod_1.z.object({
    code: zod_1.z.string().max(10).optional(),
    content: (0, common_schema_1.sanitizedText)('内容', 2000),
    images: common_schema_1.imageArray,
});
// ─── 树洞评论 ───
exports.createTreeHoleCommentSchema = zod_1.z.object({
    code: zod_1.z.string().max(10).optional(),
    content: (0, common_schema_1.sanitizedText)('评论内容', 500),
});
//# sourceMappingURL=post.schema.js.map