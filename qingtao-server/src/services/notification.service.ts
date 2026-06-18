import { prisma } from '../config/database';

/**
 * 通知类型分类:
 * - goods_comment, post_comment, lostfound_comment — 评论通知
 * - qa_answer, qa_best — 答疑通知
 * - dating_request — 恋爱请求通知
 * - chat_message — 私信通知
 * - review_result — AI审核结果通知
 * - goods_sold — 商品售出通知
 * - announcement — 公告通知
 * - report_result — 举报处理结果通知
 * - follow, like — 社交互动通知
 * - trade, barter, reservation — 交易通知
 */
export async function createNotification(params: {
  userId: number;
  type: string;
  title: string;
  content?: string;
  relatedId?: number;
  relatedType?: string; // 资源类型标识，如 'goods','post','qa_answer','qa_post' 等
}) {
  // 去重：5分钟内同一用户+类型+关联ID+资源类型不重复创建
  if (params.relatedId && params.relatedType) {
    const recent = await prisma.notification.findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        relatedId: params.relatedId,
        relatedType: params.relatedType,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recent) return recent;
  } else if (params.relatedId) {
    const recent = await prisma.notification.findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        relatedId: params.relatedId,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recent) return recent;
  }

  const notif = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      content: params.content || '',
      relatedId: params.relatedId || null,
      relatedType: params.relatedType || null,
    },
  });

  // SSE 实时推送
  try {
    const { pushToUser } = await import('./sse.service');
    pushToUser(params.userId, 'notification', {
      type: params.type, title: params.title,
      content: params.content || '',
      relatedId: params.relatedId,
      relatedType: params.relatedType,
    });
  } catch {}

  return notif;
}

// 删除某内容相关的所有通知（删除商品/帖子/失物时调用）
export async function cleanupRelatedNotifications(relatedId: number, types: string[]) {
  await prisma.notification.deleteMany({
    where: { relatedId, type: { in: types } },
  });
}

// 给所有用户发送公告
export async function broadcastAnnouncement(title: string, content: string, createdBy: number) {
  return prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: { title, content, createdBy },
    });

    // 游标分页读取用户，避免全量加载到内存
    let cursor: number | undefined;
    const batchSize = 500;
    let totalNotified = 0;

    do {
      const users = await tx.user.findMany({
        where: { status: 'active', ...(cursor !== undefined ? { id: { gt: cursor } } : {}) },
        select: { id: true },
        take: batchSize,
        orderBy: { id: 'asc' },
      });

      if (users.length === 0) break;

      await tx.notification.createMany({
        data: users.map(u => ({
          userId: u.id,
          type: 'announcement',
          title,
          content: content || '',
          relatedId: announcement.id,
          relatedType: 'announcement',
        })),
      });

      totalNotified += users.length;
      cursor = users[users.length - 1].id;
    } while (true);

    return { ...announcement, notifiedCount: totalNotified };
  });
}
