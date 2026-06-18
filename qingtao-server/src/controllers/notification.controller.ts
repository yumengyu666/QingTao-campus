import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);
    const [list, total] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where: { userId } }),
    ]);
    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } });
    return success(res, { count });
  } catch (err) { next(err); }
}

export async function getAnnouncements(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = 20;
    const [list, total] = await Promise.all([
      prisma.notification.findMany({ where: { type: 'announcement' }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where: { type: 'announcement' } }),
    ]);
    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.userId, isRead: false }, data: { isRead: true } });
    return success(res, null, '全部已读');
  } catch (err) { next(err); }
}

export async function markBatchRead(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return error(res, '请提供通知ID列表');
    await prisma.notification.updateMany({ where: { id: { in: ids }, userId: req.user!.userId }, data: { isRead: true } });
    return success(res, null, '已读');
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效ID');
    await prisma.notification.updateMany({ where: { id, userId: req.user!.userId }, data: { isRead: true } });
    return success(res, null, 'ok');
  } catch (err) { next(err); }
}

export async function deleteNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return error(res, '请提供通知ID列表');
    await prisma.notification.deleteMany({ where: { id: { in: ids }, userId: req.user!.userId } });
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}

export async function deleteNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效ID');
    await prisma.notification.deleteMany({ where: { id, userId: req.user!.userId } });
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}

// POST /push-subscribe — 浏览器推送订阅
export async function pushSubscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const { subscription } = req.body;
    if (!subscription) return error(res, '缺少 subscription 数据');
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { pushSubscription: JSON.stringify(subscription) } as any,
    });
    return success(res, null, '推送已订阅');
  } catch (err) { next(err); }
}
