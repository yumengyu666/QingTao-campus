"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyQuestions = getMyQuestions;
exports.setQuestions = setQuestions;
exports.verifyQuestions = verifyQuestions;
exports.getUserQuestions = getUserQuestions;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const auth_service_1 = require("../services/auth.service");
async function hashAnswer(answer) {
    return bcryptjs_1.default.hash(answer.trim().toLowerCase(), 10);
}
async function verifyAnswer(answer, hash) {
    return bcryptjs_1.default.compare(answer.trim().toLowerCase(), hash);
}
/** GET /api/users/security-questions — 获取我的安全问题（不含答案） */
async function getMyQuestions(req, res, next) {
    try {
        const sq = await database_1.prisma.securityQuestion.findUnique({ where: { userId: req.user.userId } });
        return (0, response_1.success)(res, sq ? {
            question1: sq.question1,
            question2: sq.question2,
            question3: sq.question3,
            hasSet: !!(sq.question1 || sq.question2 || sq.question3),
        } : { hasSet: false });
    }
    catch (err) {
        next(err);
    }
}
/** PUT /api/users/security-questions — 设置/更新安全问题 */
async function setQuestions(req, res, next) {
    try {
        const { question1, answer1, question2, answer2, question3, answer3 } = req.body;
        if (!question1?.trim() || !answer1?.trim())
            return (0, response_1.error)(res, '请至少设置第一个问题及答案');
        if (answer1.trim().length < 2 || answer2?.trim()?.length < 2 || answer3?.trim()?.length < 2)
            return (0, response_1.error)(res, '答案至少需要2个字符');
        const data = {
            question1: question1.trim(),
            answer1: await hashAnswer(answer1),
            question2: question2?.trim() || '',
            answer2: answer2?.trim() ? await hashAnswer(answer2) : '',
            question3: question3?.trim() || '',
            answer3: answer3?.trim() ? await hashAnswer(answer3) : '',
        };
        await database_1.prisma.securityQuestion.upsert({
            where: { userId: req.user.userId },
            create: { userId: req.user.userId, ...data },
            update: data,
        });
        return (0, response_1.success)(res, null, '安全问题已设置');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/auth/verify-questions — 用户验证安全问题来重置密码（无需登录） */
async function verifyQuestions(req, res, next) {
    try {
        const { username, answer1, answer2, answer3 } = req.body;
        if (!username?.trim())
            return (0, response_1.error)(res, '请输入用户名');
        const user = await database_1.prisma.user.findUnique({ where: { username: username.trim() } });
        if (!user)
            return (0, response_1.error)(res, '验证失败，请检查用户名和答案');
        const sq = await database_1.prisma.securityQuestion.findUnique({ where: { userId: user.id } });
        if (!sq || !sq.question1)
            return (0, response_1.error)(res, '该账号未设置安全问题，无法自助找回密码');
        // 验证答案：至少答对2题即可通过
        let correct = 0;
        if (answer1 && await verifyAnswer(answer1, sq.answer1))
            correct++;
        if (answer2 && await verifyAnswer(answer2, sq.answer2))
            correct++;
        if (answer3 && await verifyAnswer(answer3, sq.answer3))
            correct++;
        if (correct < 2)
            return (0, response_1.error)(res, '验证失败，请检查答案');
        // 生成短期 JWT 重置令牌（不在响应中暴露明文重置码）
        const resetToken = (0, auth_service_1.generatePasswordResetToken)(user.id);
        const tokenHash = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: { resetCode: tokenHash, resetCodeExpiry: new Date(Date.now() + 10 * 60 * 1000) },
        });
        return (0, response_1.success)(res, {
            resetToken,
            message: '验证通过，请在10分钟内设置新密码',
        }, '验证通过');
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/users/:username/questions — 获取某用户设置的问题（用于找回密码页面，不含答案） */
async function getUserQuestions(req, res, next) {
    try {
        const username = req.params.username;
        const user = await database_1.prisma.user.findUnique({ where: { username } });
        if (!user)
            return (0, response_1.error)(res, '无法找回密码，请确认用户名是否正确或已设置安全问题');
        const sq = await database_1.prisma.securityQuestion.findUnique({ where: { userId: user.id } });
        if (!sq || !sq.question1)
            return (0, response_1.error)(res, '无法找回密码，请确认用户名是否正确或已设置安全问题');
        return (0, response_1.success)(res, {
            question1: sq.question1,
            question2: sq.question2 || null,
            question3: sq.question3 || null,
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=securityQuestion.controller.js.map