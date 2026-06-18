/**
 * 私信 Service 层 — 纯业务逻辑
 */
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

// ─── 原始查询行类型 ───

/** $queryRaw 返回的会话行 */
interface RawConversationRow {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  type: string;
  createdAt: string | Date;
  isRead: number | boolean;
  readAt: string | Date | null;
  peerId: number;
}

/** $queryRaw 返回的未读计数行 */
interface RawUnreadRow {
  senderId: number;
  unread: number;
}

/** $queryRaw 返回的总数行 */
interface RawCountRow {
  total: number;
}

// ─── 会话 ───

export async function findConversations(userId: number, page = 1, pageSize = 30) {
  const conversations = await prisma.$queryRaw<RawConversationRow[]>(
    Prisma.sql`SELECT
      m.id, m.senderId, m.receiverId, m.content, m.type, m.createdAt, m.isRead, m.readAt,
      CASE WHEN m.senderId = ${userId} THEN m.receiverId ELSE m.senderId END as peerId
    FROM ChatMessage m
    INNER JOIN (
      SELECT
        CASE WHEN senderId = ${userId} THEN receiverId ELSE senderId END as _peerId,
        MAX(createdAt) as _maxTime
      FROM ChatMessage
      WHERE senderId = ${userId} OR receiverId = ${userId}
      GROUP BY _peerId
    ) latest ON latest._peerId = (CASE WHEN m.senderId = ${userId} THEN m.receiverId ELSE m.senderId END)
      AND latest._maxTime = m.createdAt
    ORDER BY m.createdAt DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`
  );

  if (conversations.length === 0) return { list: [], total: 0 };

  const peerIds = [...new Set(conversations.map(c => Number(c.peerId)))];

  const [unreadRows, peers] = await Promise.all([
    prisma.$queryRaw<RawUnreadRow[]>(
      Prisma.sql`SELECT senderId, COUNT(*) as unread FROM ChatMessage WHERE receiverId = ${userId} AND isRead = 0 AND senderId IN (${Prisma.join(peerIds)}) GROUP BY senderId`
    ),
    prisma.user.findMany({ where: { id: { in: peerIds } }, select: { id: true, nickname: true, avatarUrl: true, username: true } }),
  ]);

  const unreadMap = new Map(unreadRows.map(r => [Number(r.senderId), Number(r.unread)]));
  const peerMap = new Map(peers.map(p => [p.id, p]));

  const list = conversations.map(c => {
    const peerId = Number(c.peerId);
    const peer = peerMap.get(peerId);
    return {
      userId: peerId,
      nickname: peer?.nickname || '',
      username: peer?.username || '',
      avatarUrl: peer?.avatarUrl || '',
      lastMessage: c.type === 'image' ? '[图片]' : (c.content || ''),
      lastType: c.type || 'text',
      lastTime: typeof c.createdAt === 'string' ? c.createdAt : c.createdAt?.toISOString?.() || String(c.createdAt || ''),
      unread: unreadMap.get(Number(c.senderId) === userId ? Number(c.receiverId) : Number(c.senderId)) || 0,
      isMine: Number(c.senderId) === userId,
      isRead: c.isRead === 1 || c.isRead === true,
      readAt: typeof c.readAt === 'string' ? c.readAt : c.readAt?.toISOString?.() || null,
    };
  });

  const totalResult = await prisma.$queryRaw<RawCountRow[]>(
    Prisma.sql`SELECT COUNT(DISTINCT CASE WHEN senderId = ${userId} THEN receiverId ELSE senderId END) as total FROM ChatMessage WHERE senderId = ${userId} OR receiverId = ${userId}`
  );

  return { list, total: Number(totalResult[0]?.total || 0) };
}

// ─── 消息 ───

export async function findMessages(userId: number, peerId: number, page = 1, pageSize = 50) {
  return Promise.all([
    prisma.chatMessage.findMany({
      where: { OR: [{ senderId: userId, receiverId: peerId }, { senderId: peerId, receiverId: userId }] },
      skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
    }),
    prisma.chatMessage.count({
      where: { OR: [{ senderId: userId, receiverId: peerId }, { senderId: peerId, receiverId: userId }] },
    }),
  ]);
}

export async function markMessagesRead(senderId: number, receiverId: number) {
  return prisma.chatMessage.updateMany({
    where: { senderId, receiverId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function createMessage(data: {
  senderId: number; receiverId: number; content: string; type?: string;
}) {
  return prisma.chatMessage.create({
    data: { senderId: data.senderId, receiverId: data.receiverId, content: data.content, type: data.type || 'text' },
  });
}

export async function findMessageById(id: number) {
  return prisma.chatMessage.findUnique({ where: { id } });
}

export async function recallMessage(id: number) {
  return prisma.chatMessage.update({ where: { id }, data: { recalledAt: new Date(), content: '[消息已撤回]' } });
}

export async function markMessageRead(id: number) {
  return prisma.chatMessage.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
}

export async function markMessageDelivered(id: number) {
  return prisma.chatMessage.update({ where: { id }, data: { isDelivered: true } });
}

export async function deleteMessages(ids: number[], userId: number) {
  return prisma.chatMessage.deleteMany({ where: { id: { in: ids }, senderId: userId } });
}

export async function getUnreadCount(userId: number) {
  return prisma.chatMessage.count({ where: { receiverId: userId, isRead: false } });
}

export async function countUserMessages(userId: number, peerId: number) {
  return prisma.chatMessage.count({ where: { senderId: userId, receiverId: peerId } });
}

export async function findExistingUnreadCount(senderId: number, receiverId: number) {
  return prisma.chatMessage.count({ where: { senderId, receiverId, isRead: false } });
}

// ─── 会话设置 ───

export async function getConversationSetting(userId: number, peerId: number) {
  return prisma.conversationSetting.findUnique({ where: { userId_peerId: { userId, peerId } } });
}

export async function upsertConversationSetting(userId: number, peerId: number, data: { isPinned?: boolean; isMuted?: boolean; bgImage?: string }) {
  return prisma.conversationSetting.upsert({
    where: { userId_peerId: { userId, peerId } },
    update: { ...(data.isPinned !== undefined && { isPinned: data.isPinned }), ...(data.isMuted !== undefined && { isMuted: data.isMuted }), ...(data.bgImage !== undefined && { bgImage: data.bgImage }) },
    create: { userId, peerId, isPinned: data.isPinned || false, isMuted: data.isMuted || false, bgImage: data.bgImage || null },
  });
}

// ─── 用户关系检查 ───

export async function checkBlocked(userId1: number, userId2: number) {
  return prisma.block.findFirst({ where: { OR: [{ blockerId: userId1, blockedId: userId2 }, { blockerId: userId2, blockedId: userId1 }] } });
}

export async function checkMutualFollow(userId1: number, userId2: number) {
  const [f1, f2] = await Promise.all([
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId1, followingId: userId2 } } }),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId2, followingId: userId1 } } }),
  ]);
  return !!(f1 && f2);
}
