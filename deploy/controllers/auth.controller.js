"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.refreshToken = refreshToken;
exports.getMe = getMe;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const database_1 = require("../config/database");
const auth_service_1 = require("../services/auth.service");
const response_1 = require("../utils/response");
const sensitive_1 = require("../utils/sensitive");
const logger_1 = require("../utils/logger");
const captcha_controller_1 = require("./captcha.controller");
const crypto_1 = __importDefault(require("crypto"));
// 用户名保留词黑名单
const USERNAME_BLACKLIST = new Set([
    'admin', 'administrator', 'root', 'system', 'moderator', 'mod',
    'support', 'help', 'info', 'test', 'api', 'null', 'undefined',
    '轻淘', '官方', '管理员', '客服', '系统',
]);
const loginAttempts = new Map();
// 每 10 分钟清理过期记录
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of loginAttempts) {
        if (now > v.lockedUntil)
            loginAttempts.delete(k);
    }
}, 10 * 60 * 1000).unref();
function checkLoginLock(key) {
    const rec = loginAttempts.get(key);
    if (!rec)
        return { locked: false, waitSeconds: 0 };
    const now = Date.now();
    if (now >= rec.lockedUntil) {
        // 锁定期已过，但保留计数
        return { locked: false, waitSeconds: 0 };
    }
    const remaining = Math.ceil((rec.lockedUntil - now) / 1000);
    return { locked: true, waitSeconds: remaining };
}
function recordLoginFailure(key) {
    const rec = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
    rec.count++;
    // 渐进式锁定：3次→30秒，5次→5分钟，10次→1小时
    const delay = rec.count >= 10 ? 60 * 60 :
        rec.count >= 5 ? 5 * 60 :
            rec.count >= 3 ? 30 :
                0;
    rec.lockedUntil = Date.now() + delay * 1000;
    if (delay > 0) {
        logger_1.logger.warn(`Login brute-force lock: ${key} locked for ${delay}s after ${rec.count} failures`);
    }
    loginAttempts.set(key, rec);
}
function clearLoginAttempts(key) {
    loginAttempts.delete(key);
}
async function register(req, res, next) {
    try {
        const { username, password, phone, captchaId, captchaAnswer } = req.body;
        // 验证码
        if (!captchaId || !captchaAnswer)
            return (0, response_1.error)(res, '请完成安全验证');
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        if (!(0, captcha_controller_1.verifyCaptcha)(captchaId, captchaAnswer, clientIp))
            return (0, response_1.error)(res, '验证码错误或已过期，请刷新重试');
        // 校验
        if (!username || !password)
            return (0, response_1.error)(res, '用户名和密码不能为空');
        if (username.length < 2 || username.length > 20)
            return (0, response_1.error)(res, '用户名长度需在2-20位之间');
        if (password.length < 6 || password.length > 50)
            return (0, response_1.error)(res, '密码长度需在6-50位之间');
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
            return (0, response_1.error)(res, '密码需同时包含字母和数字');
        if (/[^a-zA-Z0-9一-龥_]/.test(username))
            return (0, response_1.error)(res, '用户名只能包含中文、英文、数字和下划线');
        if (USERNAME_BLACKLIST.has(username.toLowerCase()))
            return (0, response_1.error)(res, '该用户名不可使用');
        // 手机号格式校验（选填）
        if (phone && !/^1[3-9]\d{9}$/.test(phone))
            return (0, response_1.error)(res, '手机号格式不正确');
        // 敏感词
        if ((0, sensitive_1.containsSensitive)(username))
            return (0, response_1.error)(res, '用户名包含违规内容');
        // 检查重复
        const exist = await database_1.prisma.user.findUnique({ where: { username } });
        if (exist)
            return (0, response_1.error)(res, '用户名已被注册');
        // 创建用户，随机昵称
        const passwordHash = await (0, auth_service_1.hashPassword)(password);
        const randomNick = `轻大同学${String(crypto_1.default.randomInt(1000, 9999))}`;
        const user = await database_1.prisma.user.create({
            data: {
                username,
                passwordHash,
                nickname: randomNick,
                phone: phone || '',
            },
        });
        const fp = req.headers['user-agent'] || '';
        const tokens = (0, auth_service_1.generateTokens)({ userId: user.id, username: user.username, role: user.role, tokenVersion: user.tokenVersion }, fp);
        logger_1.logger.info(`User registered: ${username} (id=${user.id})`);
        return (0, response_1.success)(res, {
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: sanitizeUser(user),
        }, '注册成功', 201);
    }
    catch (err) {
        next(err);
    }
}
async function login(req, res, next) {
    try {
        const { username, password, captchaId, captchaAnswer } = req.body;
        if (!username || !password)
            return (0, response_1.error)(res, '用户名和密码不能为空', 401);
        // ─── 暴力破解防护：检查登录锁定 ───
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const lockKey = `login:${username}:${clientIp}`;
        const { locked, waitSeconds } = checkLoginLock(lockKey);
        if (locked) {
            return (0, response_1.error)(res, `登录尝试过于频繁，请${waitSeconds}秒后重试`, 429);
        }
        // 验证码校验
        if (!captchaId || !captchaAnswer)
            return (0, response_1.error)(res, '请完成安全验证', 401);
        if (!(0, captcha_controller_1.verifyCaptcha)(captchaId, captchaAnswer, clientIp))
            return (0, response_1.error)(res, '验证码错误或已过期，请刷新重试', 401);
        const user = await database_1.prisma.user.findUnique({ where: { username } });
        if (!user) {
            recordLoginFailure(lockKey);
            return (0, response_1.error)(res, '用户名或密码错误', 401);
        }
        if (user.status === 'disabled')
            return (0, response_1.error)(res, '账号已被禁用，请联系管理员', 403);
        const valid = await (0, auth_service_1.comparePassword)(password, user.passwordHash);
        if (!valid) {
            recordLoginFailure(lockKey);
            return (0, response_1.error)(res, '用户名或密码错误', 401);
        }
        // 登录成功：清除失败计数
        clearLoginAttempts(lockKey);
        const fp = req.headers['user-agent'] || '';
        const tokens = (0, auth_service_1.generateTokens)({ userId: user.id, username: user.username, role: user.role, tokenVersion: user.tokenVersion }, fp);
        logger_1.logger.info(`User login: ${username} (id=${user.id})`);
        return (0, response_1.success)(res, {
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: sanitizeUser(user),
        }, '登录成功');
    }
    catch (err) {
        next(err);
    }
}
async function refreshToken(req, res, next) {
    try {
        const { refreshToken: token } = req.body;
        if (!token)
            return (0, response_1.error)(res, '缺少refreshToken');
        // 检查旧Token是否已加入黑名单（轮换后旧Token失效）
        if (await (0, auth_service_1.isRefreshTokenRevoked)(token)) {
            return (0, response_1.error)(res, 'RefreshToken已被使用，请重新登录', 401);
        }
        const payload = (0, auth_service_1.verifyRefreshToken)(token);
        const user = await database_1.prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user || user.status === 'disabled')
            return (0, response_1.error)(res, '用户无效或已被禁用', 401);
        if (user.tokenVersion !== payload.tokenVersion)
            return (0, response_1.error)(res, '密码已修改，请重新登录', 401);
        // 轮换：旧Token加入黑名单，颁发新Token对
        await (0, auth_service_1.blacklistRefreshToken)(token, user.id);
        const fp = payload.fp || undefined; // 保留旧指纹，通过payload传递
        const tokens = (0, auth_service_1.generateTokens)({ userId: user.id, username: user.username, role: user.role, tokenVersion: user.tokenVersion }, payload.fp || undefined);
        return (0, response_1.success)(res, { token: tokens.accessToken, refreshToken: tokens.refreshToken });
    }
    catch (err) {
        return (0, response_1.error)(res, 'RefreshToken无效或已过期', 401);
    }
}
async function getMe(req, res, next) {
    try {
        const user = await database_1.prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user)
            return (0, response_1.error)(res, '用户不存在', 404);
        return (0, response_1.success)(res, sanitizeUser(user));
    }
    catch (err) {
        next(err);
    }
}
// POST /api/auth/forgot-password — 引导用户使用安全提问找回密码
async function forgotPassword(req, res, next) {
    try {
        const { username } = req.body;
        if (!username?.trim())
            return (0, response_1.error)(res, '请输入用户名');
        const user = await database_1.prisma.user.findUnique({
            where: { username: username.trim() },
            select: { id: true, securityQuestion: { select: { id: true } } },
        });
        if (!user || !user.securityQuestion) {
            // 统一返回，防止用户名枚举
            return (0, response_1.error)(res, '该账号未设置安全提问，无法自助找回密码。如需帮助请联系管理员。');
        }
        // 引导用户通过安全提问验证 → 返回下一步操作
        return (0, response_1.success)(res, {
            hasSecurityQuestions: true,
            username: username.trim(),
            message: '请回答安全提问以重置密码',
        }, '请验证安全提问');
    }
    catch (err) {
        next(err);
    }
}
// POST /api/auth/reset-password — 使用重置令牌设置新密码
async function resetPassword(req, res, next) {
    try {
        const { username, resetToken, newPassword } = req.body;
        if (!username?.trim() || !resetToken?.trim() || !newPassword?.trim())
            return (0, response_1.error)(res, '请填写所有字段');
        if (newPassword.length < 6 || newPassword.length > 50)
            return (0, response_1.error)(res, '新密码长度需在6-50位之间');
        if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword))
            return (0, response_1.error)(res, '新密码需同时包含字母和数字');
        let userId;
        try {
            ({ userId } = (0, auth_service_1.verifyPasswordResetToken)(resetToken.trim()));
        }
        catch {
            return (0, response_1.error)(res, '重置令牌无效或已过期，请重新验证安全问题');
        }
        const user = await database_1.prisma.user.findUnique({ where: { username: username.trim() } });
        if (!user || user.id !== userId)
            return (0, response_1.error)(res, '重置令牌无效');
        if (!user.resetCode || !user.resetCodeExpiry)
            return (0, response_1.error)(res, '未申请重置密码');
        if (new Date() > new Date(user.resetCodeExpiry))
            return (0, response_1.error)(res, '重置令牌已过期，请重新验证安全问题');
        const tokenHash = crypto_1.default.createHash('sha256').update(resetToken.trim()).digest('hex');
        if (user.resetCode !== tokenHash)
            return (0, response_1.error)(res, '重置令牌无效或已使用');
        const passwordHash = await (0, auth_service_1.hashPassword)(newPassword);
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                tokenVersion: { increment: 1 },
                resetCode: null,
                resetCodeExpiry: null,
            },
        });
        logger_1.logger.info(`Password reset for user: ${username}`);
        return (0, response_1.success)(res, null, '密码重置成功，请使用新密码登录');
    }
    catch (err) {
        next(err);
    }
}
// 去除敏感字段 — 使用显式白名单，防止未来新增敏感字段被泄露
function sanitizeUser(user) {
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
//# sourceMappingURL=auth.controller.js.map