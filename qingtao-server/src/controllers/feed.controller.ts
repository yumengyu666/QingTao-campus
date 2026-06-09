import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, paginated } from '../utils/response';

/**
 * GET /api/feed — 关注动态流
 * 聚合我关注用户的最新动态（商品+帖子+失物招领）
 */
export async function getFollowingFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);
    const type = req.query.type as string; // goods | post | lostfound | all

    // 获取我关注的用户ID列表
    const followings = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = followings.map(f => f.followingId);

    if (followingIds.length === 0) {
      return paginated(res, [], 0, page, pageSize);
    }

    const items: any[] = [];

    // 关注用户的最新商品
    if (!type || type === 'goods') {
      const goods = await prisma.goods.findMany({
        where: {
          userId: { in: followingIds },
          status: { in: ['approved', 'sold'] },
          isDeleted: false,
        },
        select: {
          id: true, title: true, price: true, images: true, status: true,
          viewCount: true, campus: true, createdAt: true,
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: type ? pageSize * 2 : 10,
      });
      goods.forEach(g => items.push({
        id: g.id, type: 'goods', title: g.title, price: g.price,
        images: JSON.parse(g.images || '[]'), status: g.status,
        user: g.user, campus: g.campus, createdAt: g.createdAt,
      }));
    }

    // 关注用户的最新帖子
    if (!type || type === 'post') {
      const posts = await prisma.post.findMany({
        where: {
          userId: { in: followingIds },
          status: 'approved',
          isDeleted: false,
        },
        select: {
          id: true, title: true, content: true, viewCount: true, createdAt: true,
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: type ? pageSize * 2 : 10,
      });
      posts.forEach(p => items.push({
        id: p.id, type: 'post', title: p.title,
        content: (p.content || '').slice(0, 120),
        user: p.user, createdAt: p.createdAt,
      }));
    }

    // 关注用户的最新失物招领
    if (!type || type === 'lostfound') {
      const lostFounds = await prisma.lostFound.findMany({
        where: {
          userId: { in: followingIds },
          status: { in: ['approved', 'resolved'] },
        },
        select: {
          id: true, type: true, title: true, description: true, status: true, createdAt: true,
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: type ? pageSize * 2 : 10,
      });
      lostFounds.forEach(lf => items.push({
        id: lf.id, type: 'lostfound', lostType: lf.type,
        title: lf.title, description: (lf.description || '').slice(0, 120),
        status: lf.status, user: lf.user, createdAt: lf.createdAt,
      }));
    }

    // 按时间排序
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return paginated(res, paged, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}
