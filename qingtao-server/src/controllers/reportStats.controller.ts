import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';

/**
 * POST /api/admin/reports/stats — 举报统计
 * 返回各类举报的数量分布
 */
export async function getReportStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await prisma.report.groupBy({
      by: ['targetType', 'status'],
      _count: { id: true },
    });

    const result: Record<string, { pending: number; handled: number; total: number }> = {};
    for (const s of stats) {
      if (!result[s.targetType]) result[s.targetType] = { pending: 0, handled: 0, total: 0 };
      if (s.status === 'pending') result[s.targetType].pending = s._count.id;
      else result[s.targetType].handled += s._count.id;
      result[s.targetType].total += s._count.id;
    }

    return success(res, result);
  } catch (err) {
    next(err);
  }
}
