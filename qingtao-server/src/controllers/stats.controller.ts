import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error } from '../utils/response';

/** GET /api/stats/leaderboard — 用户排行榜 */
export async function getLeaderboard(req: Request, res: Response, next: NextFunction) {
  try {
    const type = (req.query.type as string) || 'sellers'; // sellers | active | popular

    if (type === 'sellers') {
      // 交易达人：按发布商品数排名
      const sellers = await prisma.user.findMany({
        where: { status: 'active', role: 'user' },
        select: {
          id: true, nickname: true, avatarUrl: true,
          _count: { select: { goods: { where: { isDeleted: false } } } },
        },
        orderBy: { goods: { _count: 'desc' } },
        take: 20,
      });
      return success(res, sellers.map(u => ({
        id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl,
        goodsCount: u._count.goods,
      })));
    }

    if (type === 'active') {
      // 活跃用户：按帖子+评论总数排名
      const users = await prisma.user.findMany({
        where: { status: 'active', role: 'user' },
        select: {
          id: true, nickname: true, avatarUrl: true,
          _count: {
            select: {
              posts: { where: { isDeleted: false } },
              postComments: true,
              goodsComments: true,
              lostFoundComments: true,
            },
          },
        },
        take: 20,
      });

      const ranked = users
        .map(u => ({
          id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl,
          activityScore: u._count.posts + u._count.postComments + u._count.goodsComments + u._count.lostFoundComments,
        }))
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, 20);

      return success(res, ranked);
    }

    return error(res, '无效的排行榜类型');
  } catch (err) {
    next(err);
  }
}

/** GET /api/stats/summary — 平台概览统计 */
export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const [userCount, goodsCount, postCount, lostFoundCount, qaCount, resourceCount] = await Promise.all([
      prisma.user.count({ where: { status: 'active' } }),
      prisma.goods.count({ where: { isDeleted: false, status: 'approved' } }),
      prisma.post.count({ where: { isDeleted: false, status: 'approved' } }),
      prisma.lostFound.count({ where: { isDeleted: false, status: { in: ['approved', 'resolved'] } } }),
      prisma.qaPost.count({ where: { isDeleted: false } }),
      prisma.courseResource.count(),
    ]);

    return success(res, {
      users: userCount,
      goods: goodsCount,
      posts: postCount,
      lostFounds: lostFoundCount,
      qa: qaCount,
      resources: resourceCount,
    });
  } catch (err) {
    next(err);
  }
}
