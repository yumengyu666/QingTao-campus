"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.changePasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = exports.nicknameField = exports.passwordField = exports.usernameField = void 0;
/**
 * 认证相关 Zod 校验模式
 */
const zod_1 = require("zod");
// ─── 用户名：2-20位，字母/数字/下划线/中文，不能是保留词 ───
exports.usernameField = zod_1.z
    .string()
    .min(2, '用户名至少2个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文')
    .transform((v) => v.trim());
// ─── 密码：6-50位 ───
exports.passwordField = zod_1.z
    .string()
    .min(6, '密码至少6个字符')
    .max(50, '密码最多50个字符');
// ─── 昵称：1-12位 ───
exports.nicknameField = zod_1.z
    .string()
    .min(1, '昵称不能为空')
    .max(12, '昵称最多12个字符')
    .transform((v) => v.trim());
// ─── 验证码ID ───
const captchaIdField = zod_1.z.string().min(1, '验证码ID不能为空');
// 数学答案1-2位, SVG验证码4位
const captchaAnswerField = zod_1.z.string().min(1, '请填写验证码').max(4, '验证码答案最多4位');
// ─── 注册 ───
exports.registerSchema = zod_1.z.object({
    username: exports.usernameField,
    password: exports.passwordField,
    captchaId: captchaIdField,
    captchaAnswer: captchaAnswerField,
});
// ─── 登录 ───
exports.loginSchema = zod_1.z.object({
    username: exports.usernameField,
    password: exports.passwordField,
    captchaId: captchaIdField,
    captchaAnswer: captchaAnswerField,
});
// ─── 刷新 Token ───
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'refreshToken不能为空'),
});
// ─── 修改密码 ───
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(1, '请输入当前密码'),
    newPassword: exports.passwordField,
});
// ─── 编辑个人资料 ───
exports.updateProfileSchema = zod_1.z.object({
    nickname: exports.nicknameField.optional(),
    bio: zod_1.z.string().max(200, '个人简介最多200个字符').optional().or(zod_1.z.literal('')),
    avatarUrl: zod_1.z.string().url('头像URL格式无效').max(500).optional().or(zod_1.z.literal('')),
    wechat: zod_1.z.string().max(50).optional().or(zod_1.z.literal('')),
    qq: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    campusArea: zod_1.z.enum(['kexue', 'dongfeng']).optional(),
});
//# sourceMappingURL=auth.schema.js.map