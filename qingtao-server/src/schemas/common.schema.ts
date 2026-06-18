/**
 * 通用 Zod 校验模式
 */
import { z } from 'zod';

// ─── 基础模式 ───

/** 常规分页查询参数 */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1, '页码从1开始').default(1),
  pageSize: z.coerce.number().int().min(1, '每页至少1条').max(50, '每页最多50条').default(20),
});

/** URL路径中的ID参数 */
export const idParam = z.object({
  id: z.coerce.number().int().positive('ID 必须为正整数'),
});

// ─── 校区枚举 ───
export const campusArea = z.enum(['kexue', 'dongfeng'], {
  message: '校区必须是 kexue(科学校区) 或 dongfeng(东风校区)',
});

// ─── 列表类型枚举 ───
export const listType = z.enum(['sale', 'buy', 'rent', 'rent_want'], {
  message: '类型必须是 sale/buy/rent/rent_want 之一',
});

// ─── 内容审核状态 ───
export const contentStatus = z.enum(['pending', 'approved', 'rejected', 'offline', 'sold']);

// ─── 图片URL数组 ───
export const imageUrl = z.string().url('图片URL格式无效').max(500);
export const imageArray = z.array(imageUrl).max(9, '最多上传9张图片').default([]);

// ─── 通用文本字段 ───
export const sanitizedText = (fieldName: string, maxLen = 2000) =>
  z.string()
    .min(1, `${fieldName}不能为空`)
    .max(maxLen, `${fieldName}最多${maxLen}个字符`)
    .transform((v) => v.trim());

export const optionalText = (fieldName: string, maxLen = 2000) =>
  z.string()
    .max(maxLen, `${fieldName}最多${maxLen}个字符`)
    .transform((v) => v.trim())
    .optional()
    .or(z.literal(''));

// ─── 联系方式 ───
export const contactSchema = z.object({
  wechat: z.string().max(50, '微信号最多50个字符').optional().or(z.literal('')),
  qq: z.string().max(20, 'QQ号最多20个字符').optional().or(z.literal('')),
});

// ─── 搜索查询 ───
export const searchQuery = paginationQuery.extend({
  keyword: z.string().min(1, '请输入搜索关键词').max(100, '关键词最多100个字符'),
  type: z.enum(['goods', 'post', 'lostfound', 'all']).default('all').optional(),
  categoryId: z.coerce.number().int().positive().optional(),
});

// ─── 举报原因枚举 ───
export const reportReasons = z.enum([
  '垃圾广告',
  '不实信息',
  '人身攻击',
  '色情低俗',
  '违法违规',
  '其他',
], {
  message: '请选择有效的举报原因',
});
