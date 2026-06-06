import { prisma } from '../config/database';

export async function createNotification(params: {
  userId: number;
  type: string;
  title: string;
  content?: string;
  relatedId?: number;
}) {
  const notif = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      content: params.content || '',
      relatedId: params.relatedId || null,
    },
  });

  // SSE 实时推送
  try {
    const { pushToUser } = await import('./sse.service');
    pushToUser(params.userId, 'notification', {
      type: params.type, title: params.title,
      content: params.content || '',
    });
  } catch {}

  return notif;
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
        })),
      });

      totalNotified += users.length;
      cursor = users[users.length - 1].id;
    } while (true);

    return { ...announcement, notifiedCount: totalNotified };
  });
}
