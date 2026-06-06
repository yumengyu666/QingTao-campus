import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success } from '../utils/response';

/**
 * GET /api/data/export — 导出个人数据（GDPR-lite）
 */
export async function exportMyData(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const [user, goods, posts, comments, messages] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, nickname: true, campusArea: true, wechat: true, qq: true, phone: true, createdAt: true },
      }),
      prisma.goods.findMany({ where: { userId }, select: { id: true, title: true, price: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
      prisma.post.findMany({ where: { userId, isDeleted: false }, select: { id: true, title: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
      prisma.postComment.findMany({ where: { userId }, select: { id: true, content: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.chatMessage.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        select: { id: true, content: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: 100,
      }),
    ]);

    const exportData = { user, goods, posts, comments, messages, exportedAt: new Date().toISOString() };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="my-data-${userId}.json"`);
    return res.json({ code: 200, message: 'success', data: exportData });
  } catch (err) { next(err); }
}

/**
 * GET /api/data/activity — 用户活跃统计
 */
export async function getActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.userId as string) || req.user!.userId;
    if (isNaN(userId)) return (await import('../utils/response')).error(res, '无效ID');

    const [goodsCount, postCount, commentCount, favoriteCount, followerCount, followingCount] = await Promise.all([
      prisma.goods.count({ where: { userId, isDeleted: false } }),
      prisma.post.count({ where: { userId, isDeleted: false } }),
      prisma.postComment.count({ where: { userId } }),
      prisma.favorite.count({ where: { userId } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return success(res, { goodsCount, postCount, commentCount, favoriteCount, followerCount, followingCount });
  } catch (err) { next(err); }
}
