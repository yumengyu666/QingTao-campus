import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';

/**
 * GET /api/chat/search?keyword=xxx — 搜索自己的聊天消息
 */
export async function searchChatMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const keyword = req.query.keyword as string;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);

    if (!keyword?.trim()) return error(res, '请输入搜索关键词');

    const where = {
      AND: [
        { OR: [{ senderId: userId }, { receiverId: userId }] },
        { content: { contains: keyword.trim() } },
      ],
    };

    const [list, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where,
        select: { id: true, senderId: true, receiverId: true, content: true, type: true, isRead: true, createdAt: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.chatMessage.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

/**
 * POST /api/chat/read-all — 标记所有私信为已读
 */
export async function readAllMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const result = await prisma.chatMessage.updateMany({
      where: { receiverId: userId, isRead: false },
      data: { isRead: true },
    });
    return success(res, { count: result.count }, '已全部标记为已读');
  } catch (err) { next(err); }
}
