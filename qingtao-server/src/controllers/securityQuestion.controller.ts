import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error } from '../utils/response';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generatePasswordResetToken } from '../services/auth.service';

async function hashAnswer(answer: string): Promise<string> {
  return bcrypt.hash(answer.trim().toLowerCase(), 10);
}

async function verifyAnswer(answer: string, hash: string): Promise<boolean> {
  return bcrypt.compare(answer.trim().toLowerCase(), hash);
}

/** GET /api/users/security-questions — 获取我的安全问题（不含答案） */
export async function getMyQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const sq = await prisma.securityQuestion.findUnique({ where: { userId: req.user!.userId } });
    return success(res, sq ? {
      question1: sq.question1,
      question2: sq.question2,
      question3: sq.question3,
      hasSet: !!(sq.question1 || sq.question2 || sq.question3),
    } : { hasSet: false });
  } catch (err) { next(err); }
}

/** PUT /api/users/security-questions — 设置/更新安全问题 */
export async function setQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { question1, answer1, question2, answer2, question3, answer3 } = req.body;

    if (!question1?.trim() || !answer1?.trim()) return error(res, '请至少设置第一个问题及答案');
    if (answer1.trim().length < 2 || answer2?.trim()?.length < 2 || answer3?.trim()?.length < 2)
      return error(res, '答案至少需要2个字符');

    const data = {
      question1: question1.trim(),
      answer1: await hashAnswer(answer1),
      question2: question2?.trim() || '',
      answer2: answer2?.trim() ? await hashAnswer(answer2) : '',
      question3: question3?.trim() || '',
      answer3: answer3?.trim() ? await hashAnswer(answer3) : '',
    };

    await prisma.securityQuestion.upsert({
      where: { userId: req.user!.userId },
      create: { userId: req.user!.userId, ...data },
      update: data,
    });

    return success(res, null, '安全问题已设置');
  } catch (err) { next(err); }
}

/** POST /api/auth/verify-questions — 用户验证安全问题来重置密码（无需登录） */
export async function verifyQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, answer1, answer2, answer3 } = req.body;
    if (!username?.trim()) return error(res, '请输入用户名');

    const user = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (!user) return error(res, '验证失败，请检查用户名和答案');

    const sq = await prisma.securityQuestion.findUnique({ where: { userId: user.id } });
    if (!sq || !sq.question1) return error(res, '该账号未设置安全问题，无法自助找回密码');

    // 验证答案：至少答对2题即可通过
    let correct = 0;
    if (answer1 && await verifyAnswer(answer1, sq.answer1)) correct++;
    if (answer2 && await verifyAnswer(answer2, sq.answer2)) correct++;
    if (answer3 && await verifyAnswer(answer3, sq.answer3)) correct++;

    if (correct < 2) return error(res, '验证失败，请检查答案');

    // 生成短期 JWT 重置令牌（不在响应中暴露明文重置码）
    const resetToken = generatePasswordResetToken(user.id);
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode: tokenHash, resetCodeExpiry: new Date(Date.now() + 10 * 60 * 1000) },
    });

    return success(res, {
      resetToken,
      message: '验证通过，请在10分钟内设置新密码',
    }, '验证通过');
  } catch (err) { next(err); }
}

/** GET /api/users/:username/questions — 获取某用户设置的问题（用于找回密码页面，不含答案） */
export async function getUserQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const username = req.params.username as string;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return error(res, '无法找回密码，请确认用户名是否正确或已设置安全问题');

    const sq = await prisma.securityQuestion.findUnique({ where: { userId: user.id } });
    if (!sq || !sq.question1) return error(res, '无法找回密码，请确认用户名是否正确或已设置安全问题');

    return success(res, {
      question1: sq.question1,
      question2: sq.question2 || null,
      question3: sq.question3 || null,
    });
  } catch (err) { next(err); }
}
