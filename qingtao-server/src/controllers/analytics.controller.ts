import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error } from '../utils/response';

/**
 * GET /api/analytics/trending — 趋势分析
 * 返回当前热门分类、最活跃时段、新用户趋势
 */
export async function getTrending(req: Request, res: Response, next: NextFunction) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      topCategories,
      newUsersTrend,
      newGoodsTrend,
      activeHours,
    ] = await Promise.all([
      // 热卖分类（按商品数排序）
      prisma.category.findMany({
        select: {
          id: true, name: true, icon: true,
          _count: { select: { goods: { where: { status: { in: ['approved', 'sold'] }, isDeleted: false } } } },
        },
        orderBy: { goods: { _count: 'desc' } },
        take: 8,
      }),
      // 最近7天新增用户
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      // 最近7天新增商品
      prisma.goods.count({ where: { createdAt: { gte: sevenDaysAgo }, isDeleted: false } }),
      // 最近活跃时段统计（基于消息+发帖时间的前24小时分布）
      prisma.$queryRawUnsafe<any[]>(`
        SELECT CAST(strftime('%H', createdAt) AS INTEGER) as hour, COUNT(*) as count
        FROM ChatMessage
        WHERE createdAt >= datetime('now', '-7 days')
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 5
      `),
    ]);

    return success(res, {
      topCategories: topCategories.map(c => ({
        id: c.id, name: c.name, icon: c.icon, goodsCount: c._count.goods,
      })),
      trends: {
        newUsers7d: newUsersTrend,
        newGoods7d: newGoodsTrend,
      },
      peakHours: activeHours.map((h: any) => ({
        hour: Number(h.hour),
        messageCount: Number(h.count),
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/user/:userId — 用户个人数据统计
 */
export async function getUserAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.userId as string);
    if (isNaN(userId)) return error(res, '无效ID');

    const [
      goodsPosted, goodsSold, postsCreated, commentsMade,
      totalViews, totalLikes,
    ] = await Promise.all([
      prisma.goods.count({ where: { userId, isDeleted: false } }),
      prisma.goods.count({ where: { userId, status: 'sold', isDeleted: false } }),
      prisma.post.count({ where: { userId, isDeleted: false } }),
      prisma.postComment.count({ where: { userId } }),
      prisma.goods.aggregate({ _sum: { viewCount: true }, where: { userId, isDeleted: false } }),
      prisma.tradeReview.aggregate({ _avg: { rating: true }, _count: true, where: { targetId: userId } }),
    ]);

    return success(res, {
      goodsPosted, goodsSold, postsCreated, commentsMade,
      totalViews: totalViews._sum?.viewCount || 0,
      avgRating: Math.round((totalLikes._avg?.rating || 0) * 10) / 10,
      reviewCount: totalLikes._count,
    });
  } catch (err) {
    next(err);
  }
}
