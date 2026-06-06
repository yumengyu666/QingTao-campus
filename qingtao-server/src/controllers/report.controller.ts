import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error } from '../utils/response';
import { aiModerate } from '../services/moderation.service';
import { createNotification } from '../services/notification.service';
import { logger } from '../utils/logger';

const BAN_DURATION_MS = 60 * 60 * 1000; // 1 hour 私信限制时长
const BAN_THRESHOLD = 5; // >5 violations → 限制私信

/**
 * POST /api/reports/messages
 * 举报聊天消息 — 选择多条消息，AI审核，累计违规计数
 * Body: { reportedUserId: number, messageIds: number[] }
 */
export async function reportMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const reporterId = req.user!.userId;
    const { reportedUserId, messageIds } = req.body;

    if (!reportedUserId || !Array.isArray(messageIds) || messageIds.length === 0) {
      return error(res, '请选择要举报的消息');
    }
    if (messageIds.length > 20) return error(res, '单次最多举报20条消息');
    if (reporterId === reportedUserId) return error(res, '不能举报自己');

    // 获取消息内容（举报人和被举报人之间的对话消息）
    const ids = messageIds.map(Number);
    const messages = await prisma.chatMessage.findMany({
      where: {
        id: { in: ids },
        OR: [
          { senderId: reportedUserId, receiverId: reporterId },
          { senderId: reporterId, receiverId: reportedUserId },
        ],
      },
      select: { id: true, content: true, senderId: true },
    });

    if (messages.length === 0) return error(res, '未找到要举报的消息');

    // 逐条AI审核（仅审核被举报人发送的消息）
    let violationCount = 0;
    const results: { id: number; content: string; violation: boolean }[] = [];

    for (const msg of messages) {
      // 举报人自己的消息不审核
      if (msg.senderId === reporterId) {
        results.push({ id: msg.id, content: msg.content.slice(0, 50), violation: false });
        continue;
      }
      const result = await aiModerate(msg.content, { userId: reportedUserId, contentType: 'report' });
      const isViolation = result === 'violation';
      if (isViolation) violationCount++;
      results.push({ id: msg.id, content: msg.content.slice(0, 50), violation: isViolation });
    }

    // 累计违规计数
    if (violationCount > 0) {
      const user = await prisma.user.findUnique({
        where: { id: reportedUserId },
        select: { violationCount: true },
      });

      const newCount = (user?.violationCount || 0) + violationCount;
      const exceeded = newCount > BAN_THRESHOLD;
      const banUntil = exceeded ? new Date(Date.now() + BAN_DURATION_MS) : null;

      await prisma.user.update({
        where: { id: reportedUserId },
        data: {
          violationCount: newCount,
          ...(banUntil ? { violationBanUntil: banUntil } : {}),
        },
      });

      // 通知被举报人
      await createNotification({
        userId: reportedUserId,
        type: 'review_result',
        title: `内容违规警告（${violationCount}条）`,
        content: exceeded
          ? `您的违规标记已达${newCount}次（>${BAN_THRESHOLD}），私信功能被限制1小时。`
          : `您有${violationCount}条消息被判定违规，当前累计${newCount}次。累计超过${BAN_THRESHOLD}次将被限制私信1小时。`,
      }).catch(() => {});

      // 通知所有管理员
      if (exceeded) {
        const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
        for (const admin of admins) {
          createNotification({
            userId: admin.id,
            type: 'review_result',
            title: '用户因违规被限制私信',
            content: `用户 #${reportedUserId} 违规标记累计${newCount}次，私信功能已被限制。`,
          }).catch(() => {});
        }
      }

      logger.info(`[REPORT] User #${reportedUserId}: ${violationCount} violations in report, total=${newCount}${exceeded ? ' → 私信受限' : ''}`);
    }

    return success(res, {
      reviewed: messages.length,
      violations: violationCount,
      totalViolations: (await prisma.user.findUnique({ where: { id: reportedUserId }, select: { violationCount: true } }))?.violationCount || 0,
      details: results,
    }, `审核完成：${messages.length}条中${violationCount}条违规`);
  } catch (err) {
    next(err);
  }
}

/**
 * 定时清除过期的私信限制（每分钟检查一次）
 */
export function startViolationClear() {
  const check = async () => {
    try {
      const result = await prisma.user.updateMany({
        where: {
          violationBanUntil: { not: null, lte: new Date() },
        },
        data: {
          violationCount: 0,
          violationBanUntil: null,
        },
      });
      if (result.count > 0) {
        logger.info(`[VIOLATION] Cleared private message restriction for ${result.count} users`);
      }
    } catch (err: any) {
      logger.error(`[VIOLATION] Clear check failed: ${err.message}`);
    }
  };
  setInterval(check, 60000);
  setTimeout(check, 5000);
}
