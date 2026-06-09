import { prisma } from '../config/database';

interface LogParams {
  userId: number;
  action: string;
  targetType?: string;
  targetId?: number;
  detail?: string;
  ip?: string;
}

/** 记录用户行为日志，异步不阻塞主流程 */
export function logActivity(params: LogParams) {
  prisma.activityLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      targetType: params.targetType || null,
      targetId: params.targetId || null,
      detail: params.detail || '',
      ip: params.ip || '',
    },
  }).catch(() => {}); // fire-and-forget
}

/** 管理员查询行为日志 */
export async function getActivityLogs(
  userId?: number,
  action?: string,
  page = 1,
  pageSize = 50
) {
  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activityLog.count({ where }),
  ]);
  return { logs, total };
}

/** 清理90天前的日志 */
export async function cleanupOldLogs() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const result = await prisma.activityLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
