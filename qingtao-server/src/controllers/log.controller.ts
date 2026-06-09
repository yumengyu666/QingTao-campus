import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';

/** GET /api/admin/logs — 管理员查看操作日志 */
export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'admin') return error(res, '无权限', 403);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const action = req.query.action as string;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.report.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, reason: true, createdAt: true, reporterId: true, targetId: true, targetType: true } }),
      prisma.report.count({ where }),
    ]);

    return paginated(res, logs, total, page, pageSize);
  } catch (err) { next(err); }
}

/** GET /api/admin/stats/dashboard — 管理后台仪表盘数据 */
export async function adminDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'admin') return error(res, '无权限', 403);

    const today = new Date().toISOString().slice(0, 10);
    const [totalUsers, totalGoods, totalPosts, todayReports, todayCheckins, pendingGoods] = await Promise.all([
      prisma.user.count(),
      prisma.goods.count({ where: { isDeleted: false } }),
      prisma.post.count({ where: { isDeleted: false } }),
      prisma.report.count({ where: { createdAt: { gte: new Date(today) } } }),
      prisma.dailyCheckin.count({ where: { checkinDate: today } }),
      prisma.goods.count({ where: { status: 'pending', isDeleted: false } }),
    ]);

    return success(res, {
      totalUsers, totalGoods, totalPosts,
      todayReports, todayCheckins,
      pendingReview: pendingGoods,
    });
  } catch (err) { next(err); }
}
