/**
 * 帖子/失物招领/树洞 Zod 校验模式
 */
import { z } from 'zod';
import { paginationQuery, campusArea, imageArray, sanitizedText, optionalText } from './common.schema';

// ─── 发布帖子 ───
export const createPostSchema = z.object({
  title: optionalText('标题', 100),
  content: sanitizedText('内容', 5000),
  images: imageArray,
  tags: z.array(z.string().max(20)).max(5, '最多5个标签').default([]).optional(),
  location: z.string().max(100).optional().or(z.literal('')),
});

// ─── 更新帖子 ───
export const updatePostSchema = createPostSchema.partial();

// ─── 帖子列表查询 ───
export const postListQuery = paginationQuery.extend({
  tag: z.string().max(30).optional(),
  keyword: z.string().max(100).optional(),
  sort: z.enum(['newest', 'hottest']).default('newest').optional(),
});

// ─── 帖子评论 ───
export const createPostCommentSchema = z.object({
  content: sanitizedText('评论内容', 500),
  images: z.array(z.string()).max(3, '评论最多上传3张图片').default([]).optional(),
});

// ─── 发布失物招领 ───
export const createLostFoundSchema = z.object({
  title: sanitizedText('标题', 100),
  description: optionalText('描述'),
  type: z.enum(['lost', 'found'], {
    message: '类型必须是 lost(寻物) 或 found(招领)',
  }),
  campusArea: campusArea,
  images: imageArray,
  location: z.string().max(200, '位置最多200个字符').optional().or(z.literal('')),
  lostTime: z.string().optional().or(z.literal('')),
  reward: z.string().max(200).optional().or(z.literal('')),
  contactName: z.string().max(20).optional().or(z.literal('')),
  wechat: z.string().max(50).optional().or(z.literal('')),
  qq: z.string().max(20).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
});

// ─── 更新失物招领 ───
export const updateLostFoundSchema = createLostFoundSchema.partial();

// ─── 失物列表查询 ───
export const lostFoundListQuery = paginationQuery.extend({
  type: z.enum(['lost', 'found']).optional(),
  campusArea: campusArea.optional(),
  status: z.enum(['pending', 'resolved', 'offline']).optional(),
  keyword: z.string().max(100).optional(),
});

// ─── 失物评论 ───
export const createLostFoundCommentSchema = z.object({
  content: sanitizedText('评论内容', 500),
});

// ─── 树洞发布 ───
export const createTreeHoleSchema = z.object({
  code: z.string().max(10).optional(),
  content: sanitizedText('内容', 2000),
  images: imageArray,
});

// ─── 树洞评论 ───
export const createTreeHoleCommentSchema = z.object({
  code: z.string().max(10).optional(),
  content: sanitizedText('评论内容', 500),
});
