import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';
import { getActivityLogs } from '../services/activity.service';

/** POST /api/admin/content/batch-status */
export async function batchUpdateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids, type, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return error(res, '请提供ID列表');
    if (!type || !status) return error(res, '请提供type和status');

    const models: Record<string, any> = {
      goods: prisma.goods,
      post: prisma.post,
      lostfound: prisma.lostFound,
    };
    const model = models[type];
    if (!model) return error(res, '不支持的类型');

    await model.updateMany({ where: { id: { in: ids } }, data: { status } });
    return success(res, { count: ids.length }, `批量处理完成`);
  } catch (err) { next(err); }
}

/** GET /api/admin/activity-logs */
export async function activityLogsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'admin') return error(res, '无权限', 403);
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const action = req.query.action as string;
    const page = Math.max(parseInt((req.query.page as string) || '1'), 1);
    const pageSize = Math.min(parseInt((req.query.pageSize as string) || '50'), 100);
    const { logs, total } = await getActivityLogs(userId, action, page, pageSize);
    return paginated(res, logs, total, page, pageSize);
  } catch (err) { next(err); }
}
