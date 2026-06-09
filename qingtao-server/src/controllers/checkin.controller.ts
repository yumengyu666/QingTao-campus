import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error } from '../utils/response';
import { addPoints } from './points.controller';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** POST /api/checkin — 签到 */
export async function checkin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const date = today();

    const exist = await prisma.dailyCheckin.findUnique({
      where: { userId_checkinDate: { userId, checkinDate: date } },
    });
    if (exist) return error(res, '今日已签到');

    // 查昨天有没有签到，连续天数
    const last = await prisma.dailyCheckin.findUnique({
      where: { userId_checkinDate: { userId, checkinDate: yesterday() } },
    });
    const streak = (last?.streak || 0) + 1;

    const record = await prisma.dailyCheckin.create({
      data: { userId, checkinDate: date, streak },
    });

    // 签到奖励积分
    const pts = await addPoints(userId, 'daily_checkin');

    return success(res, {
      streak,
      date,
      points: pts?.points,
      level: pts?.level,
      milestone: streak % 7 === 0 ? `🎉 连续签到${streak}天！` : null,
    }, '签到成功', 201);
  } catch (err) { next(err); }
}

/** GET /api/checkin — 今日签到状态 + 连续天数 */
export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const date = today();

    const todayRecord = await prisma.dailyCheckin.findUnique({
      where: { userId_checkinDate: { userId, checkinDate: date } },
    });

    // 最近7天记录
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = await prisma.dailyCheckin.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { checkinDate: 'desc' },
      select: { checkinDate: true, streak: true },
    });

    return success(res, {
      checkedToday: !!todayRecord,
      streak: todayRecord?.streak || 0,
      recent: recent.map(r => ({ date: r.checkinDate, streak: r.streak })),
    });
  } catch (err) { next(err); }
}
