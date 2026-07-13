"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportReasons = exports.searchQuery = exports.contactSchema = exports.optionalText = exports.sanitizedText = exports.imageArray = exports.imageUrl = exports.contentStatus = exports.listType = exports.campusArea = exports.idParam = exports.paginationQuery = void 0;
/**
 * 通用 Zod 校验模式
 */
const zod_1 = require("zod");
// ─── 基础模式 ───
/** 常规分页查询参数 */
exports.paginationQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1, '页码从1开始').default(1),
    pageSize: zod_1.z.coerce.number().int().min(1, '每页至少1条').max(50, '每页最多50条').default(20),
});
/** URL路径中的ID参数 */
exports.idParam = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive('ID 必须为正整数'),
});
// ─── 校区枚举 ───
exports.campusArea = zod_1.z.enum(['kexue', 'dongfeng'], {
    message: '校区必须是 kexue(科学校区) 或 dongfeng(东风校区)',
});
// ─── 列表类型枚举 ───
exports.listType = zod_1.z.enum(['sale', 'buy', 'rent', 'rent_want'], {
    message: '类型必须是 sale/buy/rent/rent_want 之一',
});
// ─── 内容审核状态 ───
exports.contentStatus = zod_1.z.enum(['pending', 'approved', 'rejected', 'offline', 'sold']);
// ─── 图片URL数组 ───
exports.imageUrl = zod_1.z.string().url('图片URL格式无效').max(500);
exports.imageArray = zod_1.z.array(exports.imageUrl).max(9, '最多上传9张图片').default([]);
// ─── 通用文本字段 ───
const sanitizedText = (fieldName, maxLen = 2000) => zod_1.z.string()
    .min(1, `${fieldName}不能为空`)
    .max(maxLen, `${fieldName}最多${maxLen}个字符`)
    .transform((v) => v.trim());
exports.sanitizedText = sanitizedText;
const optionalText = (fieldName, maxLen = 2000) => zod_1.z.string()
    .max(maxLen, `${fieldName}最多${maxLen}个字符`)
    .transform((v) => v.trim())
    .optional()
    .or(zod_1.z.literal(''));
exports.optionalText = optionalText;
// ─── 联系方式 ───
exports.contactSchema = zod_1.z.object({
    wechat: zod_1.z.string().max(50, '微信号最多50个字符').optional().or(zod_1.z.literal('')),
    qq: zod_1.z.string().max(20, 'QQ号最多20个字符').optional().or(zod_1.z.literal('')),
});
// ─── 搜索查询 ───
exports.searchQuery = exports.paginationQuery.extend({
    keyword: zod_1.z.string().min(1, '请输入搜索关键词').max(100, '关键词最多100个字符'),
    type: zod_1.z.enum(['goods', 'post', 'lostfound', 'all']).default('all').optional(),
    categoryId: zod_1.z.coerce.number().int().positive().optional(),
});
// ─── 举报原因枚举 ───
exports.reportReasons = zod_1.z.enum([
    '垃圾广告',
    '不实信息',
    '人身攻击',
    '色情低俗',
    '违法违规',
    '其他',
], {
    message: '请选择有效的举报原因',
});
//# sourceMappingURL=common.schema.js.map