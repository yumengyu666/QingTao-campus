/**
 * 管理员操作审计日志服务
 */
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export async function logAction(params: {
  adminId: number;
  action: string;
  targetType: string;
  targetId?: number;
  detail?: string;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params as any });
  } catch (err) {
    logger.error('AuditLog write failed:', err);
  }
}
