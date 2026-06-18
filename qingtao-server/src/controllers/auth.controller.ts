import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { hashPassword, comparePassword, generateTokens, verifyRefreshToken, blacklistRefreshToken, isRefreshTokenRevoked, verifyPasswordResetToken } from '../services/auth.service';
import { success, error, serverError } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { logger } from '../utils/logger';
import { verifyCaptcha } from './captcha.controller';
import crypto from 'crypto';

// 用户名保留词黑名单
const USERNAME_BLACKLIST = new Set([
  'admin', 'administrator', 'root', 'system', 'moderator', 'mod',
  'support', 'help', 'info', 'test', 'api', 'null', 'undefined',
  '轻淘', '官方', '管理员', '客服', '系统',
]);

// ─── 登录暴力破解防护 ───

interface LoginAttempt {
  count: number;
  lockedUntil: number; // timestamp in ms
}

const loginAttempts = new Map<string, LoginAttempt>();

// 每 10 分钟清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginAttempts) {
    if (now > v.lockedUntil) loginAttempts.delete(k);
  }
}, 10 * 60 * 1000).unref();

function checkLoginLock(key: string): { locked: boolean; waitSeconds: number } {
  const rec = loginAttempts.get(key);
  if (!rec) return { locked: false, waitSeconds: 0 };

  const now = Date.now();
  if (now >= rec.lockedUntil) {
    // 锁定期已过，但保留计数
    return { locked: false, waitSeconds: 0 };
  }

  const remaining = Math.ceil((rec.lockedUntil - now) / 1000);
  return { locked: true, waitSeconds: remaining };
}

function recordLoginFailure(key: string): void {
  const rec = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  rec.count++;

  // 渐进式锁定：3次→30秒，5次→5分钟，10次→1小时
  const delay =
    rec.count >= 10 ? 60 * 60 :
    rec.count >= 5  ? 5 * 60 :
    rec.count >= 3  ? 30 :
    0;

  rec.lockedUntil = Date.now() + delay * 1000;

  if (delay > 0) {
    logger.warn(`Login brute-force lock: ${key} locked for ${delay}s after ${rec.count} failures`);
  }

  loginAttempts.set(key, rec);
}

function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, phone, captchaId, captchaAnswer } = req.body;

    // 验证码
    if (!captchaId || !captchaAnswer) return error(res, '请完成安全验证');
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!verifyCaptcha(captchaId, captchaAnswer, clientIp)) return error(res, '验证码错误或已过期，请刷新重试');

    // 校验
    if (!username || !password) return error(res, '用户名和密码不能为空');
    if (username.length < 2 || username.length > 20) return error(res, '用户名长度需在2-20位之间');
    if (password.length < 6 || password.length > 50) return error(res, '密码长度需在6-50位之间');
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return error(res, '密码需同时包含字母和数字');
    if (/[^a-zA-Z0-9一-龥_]/.test(username)) return error(res, '用户名只能包含中文、英文、数字和下划线');
    if (USERNAME_BLACKLIST.has(username.toLowerCase())) return error(res, '该用户名不可使用');

    // 手机号格式校验（选填）
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) return error(res, '手机号格式不正确');

    // 敏感词
    if (containsSensitive(username)) return error(res, '用户名包含违规内容');

    // 检查重复
    const exist = await prisma.user.findUnique({ where: { username } });
    if (exist) return error(res, '用户名已被注册');

    // 创建用户，随机昵称
    const passwordHash = await hashPassword(password);
    const randomNick = `轻大同学${String(crypto.randomInt(1000, 9999))}`;

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        nickname: randomNick,
        phone: phone || '',
      },
    });

    const fp = req.headers['user-agent'] || '';
    const tokens = generateTokens({ userId: user.id, username: user.username, role: user.role, tokenVersion: user.tokenVersion }, fp);

    logger.info(`User registered: ${username} (id=${user.id})`);

    return success(res, {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: sanitizeUser(user),
    }, '注册成功', 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, captchaId, captchaAnswer } = req.body;

    if (!username || !password) return error(res, '用户名和密码不能为空', 401);

    // ─── 暴力破解防护：检查登录锁定 ───
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const lockKey = `login:${username}:${clientIp}`;
    const { locked, waitSeconds } = checkLoginLock(lockKey);
    if (locked) {
      return error(res, `登录尝试过于频繁，请${waitSeconds}秒后重试`, 429);
    }

    // 验证码校验
    if (!captchaId || !captchaAnswer) return error(res, '请完成安全验证', 401);
    if (!verifyCaptcha(captchaId, captchaAnswer, clientIp)) return error(res, '验证码错误或已过期，请刷新重试', 401);

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      recordLoginFailure(lockKey);
      return error(res, '用户名或密码错误', 401);
    }

    if (user.status === 'disabled') return error(res, '账号已被禁用，请联系管理员', 403);

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      recordLoginFailure(lockKey);
      return error(res, '用户名或密码错误', 401);
    }

    // 登录成功：清除失败计数
    clearLoginAttempts(lockKey);

    const fp = req.headers['user-agent'] || '';
    const tokens = generateTokens({ userId: user.id, username: user.username, role: user.role, tokenVersion: user.tokenVersion }, fp);

    logger.info(`User login: ${username} (id=${user.id})`);

    return success(res, {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: sanitizeUser(user),
    }, '登录成功');
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return error(res, '缺少refreshToken');

    // 检查旧Token是否已加入黑名单（轮换后旧Token失效）
    if (await isRefreshTokenRevoked(token)) {
      return error(res, 'RefreshToken已被使用，请重新登录', 401);
    }

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status === 'disabled') return error(res, '用户无效或已被禁用', 401);
    if (user.tokenVersion !== payload.tokenVersion) return error(res, '密码已修改，请重新登录', 401);

    // 轮换：旧Token加入黑名单，颁发新Token对
    await blacklistRefreshToken(token, user.id);
    const fp = (payload as any).fp || undefined; // 保留旧指纹，通过payload传递
    const tokens = generateTokens(
      { userId: user.id, username: user.username, role: user.role, tokenVersion: user.tokenVersion },
      (payload as any).fp || undefined,
    );

    return success(res, { token: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    return error(res, 'RefreshToken无效或已过期', 401);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return error(res, '用户不存在', 404);
    return success(res, sanitizeUser(user));
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password — 引导用户使用安全提问找回密码
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { username } = req.body;
    if (!username?.trim()) return error(res, '请输入用户名');

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
      select: { id: true, securityQuestion: { select: { id: true } } },
    });
    if (!user || !user.securityQuestion) {
      // 统一返回，防止用户名枚举
      return error(res, '该账号未设置安全提问，无法自助找回密码。如需帮助请联系管理员。');
    }

    // 引导用户通过安全提问验证 → 返回下一步操作
    return success(res, {
      hasSecurityQuestions: true,
      username: username.trim(),
      message: '请回答安全提问以重置密码',
    }, '请验证安全提问');
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password — 使用重置令牌设置新密码
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, resetToken, newPassword } = req.body;
    if (!username?.trim() || !resetToken?.trim() || !newPassword?.trim()) return error(res, '请填写所有字段');
    if (newPassword.length < 6 || newPassword.length > 50) return error(res, '新密码长度需在6-50位之间');
    if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) return error(res, '新密码需同时包含字母和数字');

    let userId: number;
    try {
      ({ userId } = verifyPasswordResetToken(resetToken.trim()));
    } catch {
      return error(res, '重置令牌无效或已过期，请重新验证安全问题');
    }

    const user = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (!user || user.id !== userId) return error(res, '重置令牌无效');
    if (!user.resetCode || !user.resetCodeExpiry) return error(res, '未申请重置密码');

    if (new Date() > new Date(user.resetCodeExpiry)) return error(res, '重置令牌已过期，请重新验证安全问题');

    const tokenHash = crypto.createHash('sha256').update(resetToken.trim()).digest('hex');
    if (user.resetCode !== tokenHash) return error(res, '重置令牌无效或已使用');

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        resetCode: null,
        resetCodeExpiry: null,
      },
    });

    logger.info(`Password reset for user: ${username}`);

    return success(res, null, '密码重置成功，请使用新密码登录');
  } catch (err) {
    next(err);
  }
}

// 去除敏感字段 — 使用显式白名单，防止未来新增敏感字段被泄露
function sanitizeUser(user: Record<string, unknown>) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    wechat: user.wechat,
    qq: user.qq,
    bio: user.bio,
    campusArea: user.campusArea,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
