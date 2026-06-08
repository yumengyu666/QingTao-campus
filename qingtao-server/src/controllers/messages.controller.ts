import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';
import { createNotification } from '../services/notification.service';
import { containsSensitive } from '../utils/sensitive';

/**
 * GET /api/messages/conversations
 * 获取当前用户的会话列表（按最后消息时间排序）
 * 使用单条 SQL 消除 N+1 查询问题
 */
export async function getConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 30, 100);

    // 单条 SQL：获取每个 peer 的最后一条消息
    const conversations = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
        m.id, m.senderId, m.receiverId, m.content, m.type, m.createdAt, m.isRead, m.readAt,
        CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END as peerId
      FROM ChatMessage m
      INNER JOIN (
        SELECT
          CASE WHEN senderId = ? THEN receiverId ELSE senderId END as _peerId,
          MAX(createdAt) as _maxTime
        FROM ChatMessage
        WHERE senderId = ? OR receiverId = ?
        GROUP BY _peerId
      ) latest ON latest._peerId = (CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END)
        AND latest._maxTime = m.createdAt
      ORDER BY m.createdAt DESC
      LIMIT ? OFFSET ?`,
      userId, userId, userId, userId, userId, pageSize, (page - 1) * pageSize,
    );

    if (conversations.length === 0) {
      return paginated(res, [], 0, page, pageSize);
    }

    const peerIds = [...new Set(conversations.map((c: any) => Number(c.peerId)))];

    // 批量获取未读数（单条 SQL）
    const unreadRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT senderId, COUNT(*) as unread
       FROM ChatMessage
       WHERE receiverId = ? AND isRead = 0 AND senderId IN (${peerIds.map(() => '?').join(',')})
       GROUP BY senderId`,
      userId, ...peerIds,
    );
    const unreadMap = new Map(unreadRows.map((r: any) => [Number(r.senderId), Number(r.unread)]));

    // 批量获取用户信息
    const peers = await prisma.user.findMany({
      where: { id: { in: peerIds } },
      select: { id: true, nickname: true, avatarUrl: true, username: true },
    });
    const peerMap = new Map(peers.map(p => [p.id, p]));

    const data = conversations.map((c: any) => {
      const peerId = Number(c.peerId);
      const peer = peerMap.get(peerId);
      return {
        userId: peerId,
        nickname: peer?.nickname || '',
        username: peer?.username || '',
        avatarUrl: peer?.avatarUrl || '',
        lastMessage: c.type === 'image' ? '[图片]' : (c.content || ''),
        lastType: c.type || 'text',
        lastTime: c.createdAt?.toISOString?.() || String(c.createdAt || ''),
        unread: unreadMap.get(Number(c.senderId) === userId ? Number(c.receiverId) : Number(c.senderId)) || 0,
        isMine: Number(c.senderId) === userId,
        isRead: c.isRead === 1 || c.isRead === true,
        readAt: c.readAt?.toISOString?.() || null,
      };
    });

    // 统计总数
    const totalResult = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(DISTINCT CASE WHEN senderId = ? THEN receiverId ELSE senderId END) as total
       FROM ChatMessage
       WHERE senderId = ? OR receiverId = ?`,
      userId, userId, userId,
    );
    const total = Number(totalResult[0]?.total || 0);

    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/messages/:userId
 * 获取与指定用户的消息列表（分页）
 */
export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const currentUserId = req.user!.userId;
    const peerId = parseInt(req.params.userId as string);
    if (isNaN(peerId)) return error(res, '无效的用户ID');
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);

    // 标记对方发来的未读消息为已读
    const now = new Date();
    await prisma.chatMessage.updateMany({
      where: { senderId: peerId, receiverId: currentUserId, isRead: false },
      data: { isRead: true, readAt: now },
    });

    const [list, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: peerId },
            { senderId: peerId, receiverId: currentUserId },
          ],
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.chatMessage.count({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: peerId },
            { senderId: peerId, receiverId: currentUserId },
          ],
        },
      }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/messages/:userId
 * 发送消息（未互关限制 10 条）
 */
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const senderId = req.user!.userId;
    const receiverId = parseInt(req.params.userId as string);
    if (isNaN(receiverId)) return error(res, '无效的用户ID');
    const { content, type } = req.body;

    if (!content?.trim()) return error(res, '请输入消息内容');
    if (content.length > 500) return error(res, '消息最多 500 字');
    if (senderId === receiverId) return error(res, '不能给自己发消息');

    // 校验 type
    const ALLOWED_TYPES = ['text', 'image'];
    const safeType = ALLOWED_TYPES.includes(type) ? type : 'text';

    // 清洗内容：移除 HTML 标签，防 XSS
    const safeContent = content.trim().replace(/<[^>]*>/g, '');

    // 敏感词检查
    if (containsSensitive(safeContent)) {
      return error(res, '消息包含违规内容，请修改后重试');
    }

    // 检查发送者是否被举报过（有违规记录则禁止私信）
    const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { violationCount: true, violationBanUntil: true } });
    if (sender && sender.violationCount > 5 && sender.violationBanUntil && new Date(sender.violationBanUntil) > new Date()) {
      const remaining = Math.ceil((new Date(sender.violationBanUntil).getTime() - Date.now()) / 60000);
      return error(res, `私信功能已被限制，${remaining}分钟后自动解除。发帖功能不受影响。`);
    }

    // 检查对方是否存在
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return error(res, '用户不存在', 404);
    if (receiver.status === 'disabled') return error(res, '该用户已注销，无法发送消息');

    // 检查是否被拉黑
    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: receiverId, blockedId: senderId },
          { blockerId: senderId, blockedId: receiverId },
        ],
      },
    });
    if (blocked) return error(res, '无法发送消息');

    // 检查互关状态
    const [iFollow, theyFollow] = await Promise.all([
      prisma.follow.findUnique({ where: { followerId_followingId: { followerId: senderId, followingId: receiverId } } }),
      prisma.follow.findUnique({ where: { followerId_followingId: { followerId: receiverId, followingId: senderId } } }),
    ]);
    const isMutualFollow = !!(iFollow && theyFollow);

    // 未互关 → 限制 10 条
    if (!isMutualFollow) {
      const sentCount = await prisma.chatMessage.count({
        where: { senderId, receiverId },
      });
      if (sentCount >= 10) {
        return error(res, '消息已达上限（10条），互关后可无限发送');
      }
    }

    const msg = await prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        content: safeContent,
        type: safeType,
        imageStatus: safeType === 'image' ? 'pending' : undefined,
      },
    });

    // 图片消息 → 创建审核记录
    if (safeType === 'image') {
      prisma.imageReview.create({
        data: {
          url: safeContent,
          blurredUrl: safeContent,
          uploaderId: senderId,
          context: 'chat',
          contextId: msg.id,
          status: 'pending',
        },
      }).catch(() => {});
    }

    // 通知接收方（同对话首次未读消息才通知，防骚扰）
    const existingUnread = await prisma.chatMessage.count({
      where: { senderId, receiverId, isRead: false },
    });
    if (existingUnread <= 1) {
      createNotification({
        userId: receiverId,
        type: 'chat_message',
        title: '新私信',
        content: safeType === 'image' ? '[图片]' : `新消息：${safeContent.slice(0, 50)}`,
        relatedId: msg.id,
      }).catch(() => {});
    }

    return success(res, msg, '', 201);
  } catch (err) {
    next(err);
  }
}

/** GET /api/messages/unread-count — 未读消息总数 */
export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const count = await prisma.chatMessage.count({
      where: { receiverId: userId, isRead: false },
    });
    return success(res, { count });
  } catch (err) {
    next(err);
  }
}

// ─── 正在输入状态（内存，4秒过期） ───

const typingMap = new Map<string, number>();

// 每30秒清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of typingMap) { if (now - t > 4000) typingMap.delete(k); }
}, 30000);

/** POST /api/messages/:userId/typing — 告知对方我正在输入 */
export function setTyping(req: Request, res: Response) {
  const key = `${req.user!.userId}:${req.params.userId}`;
  typingMap.set(key, Date.now());
  return success(res, null, 'ok');
}

/** GET /api/messages/:userId/typing — 检查对方是否正在输入 */
export function getTyping(req: Request, res: Response) {
  const key = `${req.params.userId}:${req.user!.userId}`;
  const ts = typingMap.get(key);
  const typing = !!(ts && (Date.now() - ts) < 4000);
  return success(res, { typing });
}

/** PATCH /api/messages/:id/read — 单条消息已读回执 */
export async function markMessageRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的消息ID');

    const msg = await prisma.chatMessage.findUnique({ where: { id } });
    if (!msg) return error(res, '消息不存在', 404);
    if (msg.receiverId !== req.user!.userId) return error(res, '无权操作', 403);

    await prisma.chatMessage.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
    return success(res, null, 'ok');
  } catch (err) {
    next(err);
  }
}
