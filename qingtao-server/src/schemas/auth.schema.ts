/**
 * 认证相关 Zod 校验模式
 */
import { z } from 'zod';

// ─── 用户名：2-20位，字母/数字/下划线/中文，不能是保留词 ───
export const usernameField = z
  .string()
  .min(2, '用户名至少2个字符')
  .max(20, '用户名最多20个字符')
  .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文')
  .transform((v) => v.trim());

// ─── 密码：6-50位 ───
export const passwordField = z
  .string()
  .min(6, '密码至少6个字符')
  .max(50, '密码最多50个字符');

// ─── 昵称：1-12位 ───
export const nicknameField = z
  .string()
  .min(1, '昵称不能为空')
  .max(12, '昵称最多12个字符')
  .transform((v) => v.trim());

// ─── 验证码ID ───
const captchaIdField = z.string().min(1, '验证码ID不能为空');
// 数学答案1-2位, SVG验证码4位
const captchaAnswerField = z.string().min(1, '请填写验证码').max(4, '验证码答案最多4位');

// ─── 注册 ───
export const registerSchema = z.object({
  username: usernameField,
  password: passwordField,
  captchaId: captchaIdField,
  captchaAnswer: captchaAnswerField,
});

// ─── 登录 ───
export const loginSchema = z.object({
  username: usernameField,
  password: passwordField,
  captchaId: captchaIdField,
  captchaAnswer: captchaAnswerField,
});

// ─── 刷新 Token ───
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken不能为空'),
});

// ─── 修改密码 ───
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入当前密码'),
  newPassword: passwordField,
});

// ─── 编辑个人资料 ───
export const updateProfileSchema = z.object({
  nickname: nicknameField.optional(),
  bio: z.string().max(200, '个人简介最多200个字符').optional().or(z.literal('')),
  avatarUrl: z.string().url('头像URL格式无效').max(500).optional().or(z.literal('')),
  wechat: z.string().max(50).optional().or(z.literal('')),
  qq: z.string().max(20).optional().or(z.literal('')),
  campusArea: z.enum(['kexue', 'dongfeng']).optional(),
});
