/**
 * 私信/答疑/恋爱区/举报 Zod 校验模式
 */
import { z } from 'zod';
import { paginationQuery, sanitizedText, optionalText, imageArray, reportReasons } from './common.schema';

// ─── 发送私信 ───
export const sendMessageSchema = z.object({
  content: z.string().min(1, '消息不能为空').max(5000, '消息最多5000个字符'),
  type: z.enum(['text', 'image', 'voice', 'file', 'location', 'card']).default('text').optional(),
  replyToId: z.number().int().positive().optional(),  // 引用回复
  // 语音消息特有
  voiceDuration: z.number().int().min(1).max(300).optional(),
  // 文件消息特有
  fileName: z.string().max(200).optional(),
  fileSize: z.number().int().positive().optional(),
  // 位置消息特有
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  locationName: z.string().max(200).optional(),
  // 名片消息特有
  cardUserId: z.number().int().positive().optional(),
});

// ─── 批量操作消息 ───
export const batchMessageSchema = z.object({
  messageIds: z.array(z.number().int().positive()).min(1, '请选择要操作的消息').max(100, '单次最多操作100条'),
});

// ─── 转发消息 ───
export const forwardMessageSchema = z.object({
  messageIds: z.array(z.number().int().positive()).min(1).max(50),
  receiverIds: z.array(z.number().int().positive()).min(1).max(20),
});

// ─── 会话设置 ───
export const conversationSettingSchema = z.object({
  isPinned: z.boolean().optional(),
  isMuted: z.boolean().optional(),
  muteUntil: z.string().datetime().optional().nullable(),
});

// ─── 发布答疑问题 ───
export const createQuestionSchema = z.object({
  title: sanitizedText('标题', 100),
  content: optionalText('内容'),
  category: z.string().max(30, '分类最多30个字符'),
  type: z.enum(['help', 'share'], {
    message: '类型必须是 help(求助) 或 share(分享)',
  }),
  images: imageArray,
  isAnonymous: z.boolean().default(false).optional(),
});

// ─── 发布答疑回答 ───
export const createAnswerSchema = z.object({
  content: sanitizedText('回答内容', 3000),
  images: imageArray,
});

// ─── 答疑列表查询 ───
export const qaListQuery = paginationQuery.extend({
  category: z.string().max(30).optional(),
  type: z.enum(['help', 'share']).optional(),
  status: z.enum(['open', 'resolved']).optional(),
  keyword: z.string().max(100).optional(),
  sort: z.enum(['newest', 'hottest', 'unanswered']).default('newest').optional(),
});

// ─── 恋爱资料 ───
export const datingProfileSchema = z.object({
  nickname: z.string().min(1, '昵称不能为空').max(12, '昵称最多12个字符'),
  gender: z.enum(['male', 'female', 'secret'], {
    message: '请选择性别',
  }),
  bio: z.string().max(200, '简介最多200个字符').optional().or(z.literal('')),
  avatarUrl: z.string().url('头像URL无效').max(500).optional().or(z.literal('')),
  tags: z.array(z.string().max(10)).max(8, '最多8个标签').default([]).optional(),
});

// ─── 恋爱帖子 ───
export const datingPostSchema = z.object({
  content: sanitizedText('内容', 2000),
  images: imageArray,
});

// ─── 恋爱请求 ───
export const datingRequestSchema = z.object({
  message: z.string().max(200, '附言最多200个字符').optional().or(z.literal('')),
});

// ─── 举报 ───
export const submitReportSchema = z.object({
  targetType: z.enum(['goods', 'post', 'post_comment', 'lostfound', 'lostfound_comment', 'qa', 'qa_answer', 'user', 'dating_post', 'dating_profile', 'treehole', 'treehole_comment', 'chat_message'], {
    message: '举报目标类型无效',
  }),
  targetId: z.number({ error: '举报目标ID必填' }).int().positive('目标ID无效'),
  reason: reportReasons,
  description: z.string().max(500, '补充说明最多500个字符').optional().or(z.literal('')),
});

// ─── 消息举报 ───
export const reportMessageSchema = z.object({
  messageIds: z.array(z.number().int().positive()).min(1, '请选择要举报的消息').max(50),
  reason: reportReasons,
  description: z.string().max(500).optional().or(z.literal('')),
});

// ─── 申诉 ───
export const submitAppealSchema = z.object({
  reportId: z.number().int().positive('举报ID无效').optional(),
  targetType: z.string().optional(),
  targetId: z.number().int().positive().optional(),
  reason: z.string().min(1, '请填写申诉理由').max(500, '申诉理由最多500个字符'),
});
