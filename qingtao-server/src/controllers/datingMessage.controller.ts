import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';
import { createNotification } from '../services/notification.service';

/** GET /api/dating/messages/:userId — 获取与某人的恋爱消息 */
export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const myProfile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!myProfile) return error(res, '请先创建恋爱资料');

    const peerUserId = parseInt(req.params.userId as string);
    if (isNaN(peerUserId)) return error(res, '无效的用户ID');

    const peerProfile = await prisma.datingProfile.findUnique({
      where: { userId: peerUserId },
    });
    if (!peerProfile) return error(res, '对方未创建恋爱资料', 404);

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);

    // 标记对方发来的未读消息为已读
    await prisma.datingMessage.updateMany({
      where: { senderId: peerProfile.id, receiverId: myProfile.id, isRead: false },
      data: { isRead: true },
    });

    const [list, total] = await Promise.all([
      prisma.datingMessage.findMany({
        where: {
          OR: [
            { senderId: myProfile.id, receiverId: peerProfile.id },
            { senderId: peerProfile.id, receiverId: myProfile.id },
          ],
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.datingMessage.count({
        where: {
          OR: [
            { senderId: myProfile.id, receiverId: peerProfile.id },
            { senderId: peerProfile.id, receiverId: myProfile.id },
          ],
        },
      }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/** POST /api/dating/messages/:userId — 发送恋爱消息 */
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const myProfile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!myProfile) return error(res, '请先创建恋爱资料');

    const peerUserId = parseInt(req.params.userId as string);
    if (isNaN(peerUserId)) return error(res, '无效的用户ID');

    const peerProfile = await prisma.datingProfile.findUnique({
      where: { userId: peerUserId },
    });
    if (!peerProfile) return error(res, '对方未创建恋爱资料', 404);

    if (myProfile.id === peerProfile.id) return error(res, '不能给自己发消息');

    const { content, type } = req.body;
    if (!content?.trim()) return error(res, '请输入消息内容');
    if (content.length > 500) return error(res, '消息最多 500 字');

    // 校验 type + 清洗内容
    const ALLOWED_TYPES = ['text', 'image'];
    const safeType = ALLOWED_TYPES.includes(type) ? type : 'text';
    const safeContent = content.trim().replace(/<[^>]*>/g, '');

    // 检查发送者是否被举报过（有违规记录则禁止私信）
    const sender = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { violationCount: true, violationBanUntil: true } });
    if (sender && sender.violationCount > 5 && sender.violationBanUntil && new Date(sender.violationBanUntil) > new Date()) {
      const remaining = Math.ceil((new Date(sender.violationBanUntil).getTime() - Date.now()) / 60000);
      return error(res, `私信功能已被限制，${remaining}分钟后自动解除。发帖功能不受影响。`);
    }

    // 检查是否有恋爱请求通过 OR 今日缘分匹配（两者任一即可发消息）
    const approved = await prisma.datingRequest.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { senderId: myProfile.id, receiverId: peerProfile.id },
          { senderId: peerProfile.id, receiverId: myProfile.id },
        ],
      },
    });

    // 检查是否有今日缘分匹配
    const today = new Date().toISOString().slice(0, 10);
    const dailyMatch = await prisma.dailyMatch.findFirst({
      where: {
        matchDate: today,
        OR: [
          { user1Id: myProfile.id, user2Id: peerProfile.id },
          { user1Id: peerProfile.id, user2Id: myProfile.id },
        ],
      },
    });

    if (!approved && !dailyMatch) return error(res, '需要建立恋爱关系或今日缘分匹配才能发消息');

    const msg = await prisma.datingMessage.create({
      data: {
        senderId: myProfile.id,
        receiverId: peerProfile.id,
        content: safeContent,
        type: safeType,
      },
    });

    // 通知接收方（首次未读消息才通知，防骚扰）
    const existingUnread = await prisma.datingMessage.count({
      where: { senderId: myProfile.id, receiverId: peerProfile.id, isRead: false },
    });
    if (existingUnread <= 1) {
      createNotification({
        userId: peerUserId,
        type: 'chat_message',
        title: '新的恋爱消息',
        content: `${myProfile.nickname}：${safeContent.slice(0, 50)}`,
        relatedId: msg.id,
      }).catch(() => {});
    }

    return success(res, msg, '', 201);
  } catch (err) {
    next(err);
  }
}

/** GET /api/dating/messages/unread-count — 恋爱区未读消息总数 */
export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const myProfile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!myProfile) return success(res, { count: 0 });

    const count = await prisma.datingMessage.count({
      where: { receiverId: myProfile.id, isRead: false },
    });
    return success(res, { count });
  } catch (err) {
    next(err);
  }
}

/** GET /api/dating/conversations — 获取恋爱区会话列表（单条 SQL 消除 N+1） */
export async function getConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const myProfile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!myProfile) return error(res, '请先创建恋爱资料');

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 30, 100);

    // 单条 SQL：获取每个 peer 的最后一条消息
    const conversations = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
        m.id, m.senderId, m.receiverId, m.content, m.type, m.createdAt, m.isRead,
        CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END as peerId
      FROM DatingMessage m
      INNER JOIN (
        SELECT
          CASE WHEN senderId = ? THEN receiverId ELSE senderId END as _peerId,
          MAX(createdAt) as _maxTime
        FROM DatingMessage
        WHERE senderId = ? OR receiverId = ?
        GROUP BY _peerId
      ) latest ON latest._peerId = (CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END)
        AND latest._maxTime = m.createdAt
      ORDER BY m.createdAt DESC
      LIMIT ? OFFSET ?`,
      myProfile.id, myProfile.id, myProfile.id, myProfile.id, myProfile.id, pageSize, (page - 1) * pageSize,
    );

    if (conversations.length === 0) {
      return paginated(res, [], 0, page, pageSize);
    }

    const peerIds = [...new Set(conversations.map((c: any) => Number(c.peerId)))];

    // 批量未读数
    const unreadRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT senderId, COUNT(*) as unread
       FROM DatingMessage
       WHERE receiverId = ? AND isRead = 0 AND senderId IN (${peerIds.map(() => '?').join(',')})
       GROUP BY senderId`,
      myProfile.id, ...peerIds,
    );
    const unreadMap = new Map(unreadRows.map((r: any) => [Number(r.senderId), Number(r.unread)]));

    // 批量获取恋爱资料
    const peers = await prisma.datingProfile.findMany({
      where: { id: { in: peerIds } },
      select: { id: true, nickname: true, avatarSeed: true, customAvatar: true, userId: true },
    });
    const peerMap = new Map(peers.map(p => [p.id, p]));

    const data = conversations.map((c: any) => {
      const peerId = Number(c.peerId);
      const peer = peerMap.get(peerId);
      const senderId = Number(c.senderId);
      const receiverId = Number(c.receiverId);
      return {
        profileId: peerId,
        userId: peer?.userId,
        nickname: peer?.nickname || '',
        avatarSeed: peer?.avatarSeed || '',
        customAvatar: peer?.customAvatar || '',
        lastMessage: c.content || '',
        lastTime: c.createdAt?.toISOString?.() || String(c.createdAt || ''),
        unread: unreadMap.get(senderId === myProfile.id ? receiverId : senderId) || 0,
        isMine: senderId === myProfile.id,
      };
    });

    // 总数
    const totalResult = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(DISTINCT CASE WHEN senderId = ? THEN receiverId ELSE senderId END) as total
       FROM DatingMessage
       WHERE senderId = ? OR receiverId = ?`,
      myProfile.id, myProfile.id, myProfile.id,
    );
    const total = Number(totalResult[0]?.total || 0);

    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// ─── 正在输入状态（内存，4秒过期） ───

const typingMap = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [k, t] of typingMap) { if (now - t > 4000) typingMap.delete(k); }
}, 30000);

/** POST /api/dating/messages/:userId/typing */
export async function setTyping(req: Request, res: Response) {
  const myProfile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
  if (!myProfile) return error(res, '请先创建恋爱资料');
  const key = `${myProfile.id}:${req.params.userId}`;
  typingMap.set(key, Date.now());
  return success(res, null, 'ok');
}

/** GET /api/dating/messages/:userId/typing */
export async function getTyping(req: Request, res: Response) {
  const myProfile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
  if (!myProfile) return error(res, '请先创建恋爱资料');
  const key = `${req.params.userId}:${myProfile.id}`;
  const ts = typingMap.get(key);
  const typing = !!(ts && (Date.now() - ts) < 4000);
  return success(res, { typing });
}
