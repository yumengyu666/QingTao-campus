import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error } from '../utils/response';
import crypto from 'crypto';

function hashAnswer(answer: string): string {
  return crypto.createHash('sha256').update(answer.trim().toLowerCase()).digest('hex');
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
      answer1: hashAnswer(answer1),
      question2: question2?.trim() || '',
      answer2: answer2?.trim() ? hashAnswer(answer2) : '',
      question3: question3?.trim() || '',
      answer3: answer3?.trim() ? hashAnswer(answer3) : '',
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
    if (!user) return error(res, '用户不存在');

    const sq = await prisma.securityQuestion.findUnique({ where: { userId: user.id } });
    if (!sq || !sq.question1) return error(res, '该用户未设置安全问题，请联系管理员');

    // 验证答案：至少答对2题即可通过
    let correct = 0;
    if (answer1 && sq.answer1 === hashAnswer(answer1)) correct++;
    if (answer2 && sq.answer2 === hashAnswer(answer2)) correct++;
    if (answer3 && sq.answer3 === hashAnswer(answer3)) correct++;

    if (correct < 2) return error(res, '至少需要答对2个问题');

    // 生成密码重置码（加密安全随机数）
    const resetCode = String(crypto.randomInt(100000, 999999));
    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode, resetCodeExpiry: new Date(Date.now() + 10 * 60 * 1000) },
    });

    return success(res, {
      resetCode,
      message: '验证通过，重置码有效期10分钟',
    }, '验证通过');
  } catch (err) { next(err); }
}

/** GET /api/users/:username/questions — 获取某用户设置的问题（用于找回密码页面，不含答案） */
export async function getUserQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const username = req.params.username as string;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return error(res, '用户不存在', 404);

    const sq = await prisma.securityQuestion.findUnique({ where: { userId: user.id } });
    if (!sq || !sq.question1) return error(res, '该用户未设置安全问题');

    return success(res, {
      question1: sq.question1,
      question2: sq.question2 || null,
      question3: sq.question3 || null,
    });
  } catch (err) { next(err); }
}
