"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAppealSchema = exports.reportMessageSchema = exports.submitReportSchema = exports.datingRequestSchema = exports.datingPostSchema = exports.datingProfileSchema = exports.qaListQuery = exports.createAnswerSchema = exports.createQuestionSchema = exports.conversationSettingSchema = exports.forwardMessageSchema = exports.batchMessageSchema = exports.sendMessageSchema = void 0;
/**
 * 私信/答疑/恋爱区/举报 Zod 校验模式
 */
const zod_1 = require("zod");
const common_schema_1 = require("./common.schema");
// ─── 发送私信 ───
exports.sendMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, '消息不能为空').max(5000, '消息最多5000个字符'),
    type: zod_1.z.enum(['text', 'image', 'voice', 'file', 'location', 'card']).default('text').optional(),
    replyToId: zod_1.z.number().int().positive().optional(), // 引用回复
    // 语音消息特有
    voiceDuration: zod_1.z.number().int().min(1).max(300).optional(),
    // 文件消息特有
    fileName: zod_1.z.string().max(200).optional(),
    fileSize: zod_1.z.number().int().positive().optional(),
    // 位置消息特有
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    locationName: zod_1.z.string().max(200).optional(),
    // 名片消息特有
    cardUserId: zod_1.z.number().int().positive().optional(),
});
// ─── 批量操作消息 ───
exports.batchMessageSchema = zod_1.z.object({
    messageIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1, '请选择要操作的消息').max(100, '单次最多操作100条'),
});
// ─── 转发消息 ───
exports.forwardMessageSchema = zod_1.z.object({
    messageIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1).max(50),
    receiverIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1).max(20),
});
// ─── 会话设置 ───
exports.conversationSettingSchema = zod_1.z.object({
    isPinned: zod_1.z.boolean().optional(),
    isMuted: zod_1.z.boolean().optional(),
    muteUntil: zod_1.z.string().datetime().optional().nullable(),
});
// ─── 发布答疑问题 ───
exports.createQuestionSchema = zod_1.z.object({
    title: (0, common_schema_1.sanitizedText)('标题', 100),
    content: (0, common_schema_1.optionalText)('内容'),
    category: zod_1.z.string().max(30, '分类最多30个字符'),
    type: zod_1.z.enum(['help', 'share'], {
        message: '类型必须是 help(求助) 或 share(分享)',
    }),
    images: common_schema_1.imageArray,
    isAnonymous: zod_1.z.boolean().default(false).optional(),
});
// ─── 发布答疑回答 ───
exports.createAnswerSchema = zod_1.z.object({
    content: (0, common_schema_1.sanitizedText)('回答内容', 3000),
    images: common_schema_1.imageArray,
});
// ─── 答疑列表查询 ───
exports.qaListQuery = common_schema_1.paginationQuery.extend({
    category: zod_1.z.string().max(30).optional(),
    type: zod_1.z.enum(['help', 'share']).optional(),
    status: zod_1.z.enum(['open', 'resolved']).optional(),
    keyword: zod_1.z.string().max(100).optional(),
    sort: zod_1.z.enum(['newest', 'hottest', 'unanswered']).default('newest').optional(),
});
// ─── 恋爱资料 ───
exports.datingProfileSchema = zod_1.z.object({
    nickname: zod_1.z.string().min(1, '昵称不能为空').max(12, '昵称最多12个字符'),
    gender: zod_1.z.enum(['male', 'female', 'secret'], {
        message: '请选择性别',
    }),
    bio: zod_1.z.string().max(200, '简介最多200个字符').optional().or(zod_1.z.literal('')),
    avatarUrl: zod_1.z.string().url('头像URL无效').max(500).optional().or(zod_1.z.literal('')),
    tags: zod_1.z.array(zod_1.z.string().max(10)).max(8, '最多8个标签').default([]).optional(),
});
// ─── 恋爱帖子 ───
exports.datingPostSchema = zod_1.z.object({
    content: (0, common_schema_1.sanitizedText)('内容', 2000),
    images: common_schema_1.imageArray,
});
// ─── 恋爱请求 ───
exports.datingRequestSchema = zod_1.z.object({
    message: zod_1.z.string().max(200, '附言最多200个字符').optional().or(zod_1.z.literal('')),
});
// ─── 举报 ───
exports.submitReportSchema = zod_1.z.object({
    targetType: zod_1.z.enum(['goods', 'post', 'post_comment', 'lostfound', 'lostfound_comment', 'qa', 'qa_answer', 'user', 'dating_post', 'dating_profile', 'treehole', 'treehole_comment', 'chat_message'], {
        message: '举报目标类型无效',
    }),
    targetId: zod_1.z.number({ error: '举报目标ID必填' }).int().positive('目标ID无效'),
    reason: common_schema_1.reportReasons,
    description: zod_1.z.string().max(500, '补充说明最多500个字符').optional().or(zod_1.z.literal('')),
});
// ─── 消息举报 ───
exports.reportMessageSchema = zod_1.z.object({
    messageIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1, '请选择要举报的消息').max(50),
    reason: common_schema_1.reportReasons,
    description: zod_1.z.string().max(500).optional().or(zod_1.z.literal('')),
});
// ─── 申诉 ───
exports.submitAppealSchema = zod_1.z.object({
    reportId: zod_1.z.number().int().positive('举报ID无效').optional(),
    targetType: zod_1.z.string().optional(),
    targetId: zod_1.z.number().int().positive().optional(),
    reason: zod_1.z.string().min(1, '请填写申诉理由').max(500, '申诉理由最多500个字符'),
});
//# sourceMappingURL=message.schema.js.map