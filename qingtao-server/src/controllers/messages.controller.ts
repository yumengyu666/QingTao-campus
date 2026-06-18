/**
 * 私信 Controller — 薄层：参数提取 + 权限校验 + 响应格式化
 * 业务逻辑已提取到 message.service.ts
 */
import { Request, Response, NextFunction } from 'express';
import { success, error, paginated } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { createNotification } from '../services/notification.service';
import * as msgSvc from '../services/message.service';

// GET /api/messages/conversations
export async function getConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 30, 100);
    const { list, total } = await msgSvc.findConversations(req.user!.userId, page, pageSize);
    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

// GET /api/messages/:userId
export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const currentUserId = req.user!.userId;
    const peerId = parseInt(req.params.userId as string);
    if (isNaN(peerId)) return error(res, '无效的用户ID');
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);
    await msgSvc.markMessagesRead(peerId, currentUserId);
    const [list, total] = await msgSvc.findMessages(currentUserId, peerId, page, pageSize);
    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

// POST /api/messages/:userId
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const senderId = req.user!.userId;
    const receiverId = parseInt(req.params.userId as string);
    if (isNaN(receiverId)) return error(res, '无效的用户ID');
    if (senderId === receiverId) return error(res, '不能给自己发消息');

    const { content, type } = req.body;
    const ALLOWED_TYPES = ['text', 'image', 'voice', 'file', 'location', 'card'];
    const safeType = ALLOWED_TYPES.includes(type) ? type : 'text';
    const safeContent = content.trim().replace(/<[^>]*>/g, '');

    if (containsSensitive(safeContent)) return error(res, '消息包含违规内容，请修改后重试');

    // 违规用户检查
    const { prisma } = await import('../config/database');
    const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { violationCount: true, violationBanUntil: true } });
    if (sender && sender.violationCount > 5 && sender.violationBanUntil && new Date(sender.violationBanUntil) > new Date()) {
      const remaining = Math.ceil((new Date(sender.violationBanUntil).getTime() - Date.now()) / 60000);
      return error(res, `私信功能已被限制，${remaining}分钟后自动解除`);
    }

    // 接收方检查
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return error(res, '用户不存在', 404);
    if (receiver.status === 'disabled') return error(res, '该用户已注销，无法发送消息');

    // 拉黑检查
    const blocked = await msgSvc.checkBlocked(senderId, receiverId);
    if (blocked) return error(res, '无法发送消息');

    // 互关限制
    const isMutual = await msgSvc.checkMutualFollow(senderId, receiverId);
    if (!isMutual) {
      const sentCount = await msgSvc.countUserMessages(senderId, receiverId);
      if (sentCount >= 10) return error(res, '消息已达上限（10条），互关后可无限发送');
    }

    const msg = await msgSvc.createMessage({ senderId, receiverId, content: safeContent, type: safeType });

    // 图片消息审核
    if (safeType === 'image') {
      prisma.imageReview.create({ data: { url: safeContent, blurredUrl: safeContent, uploaderId: senderId, context: 'chat', contextId: msg.id, status: 'pending' } }).catch(() => {});
    }

    // 通知（首次未读才通知）
    const existingUnread = await msgSvc.findExistingUnreadCount(senderId, receiverId);
    if (existingUnread <= 1) {
      createNotification({ userId: receiverId, type: 'chat_message', title: '新私信', content: safeType === 'image' ? '[图片]' : `新消息：${safeContent.slice(0, 50)}`, relatedId: msg.id }).catch(() => {});
    }

    return success(res, msg, '', 201);
  } catch (err) { next(err); }
}

// GET /api/messages/unread-count
export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await msgSvc.getUnreadCount(req.user!.userId);
    return success(res, { count });
  } catch (err) { next(err); }
}

// ─── 正在输入状态（内存） ───
const typingMap = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of typingMap) { if (now - t > 4000) typingMap.delete(k); }
}, 30000);

export function setTyping(req: Request, res: Response) {
  const key = `${req.user!.userId}:${req.params.userId}`;
  typingMap.set(key, Date.now());
  return success(res, null, 'ok');
}

export function getTyping(req: Request, res: Response) {
  const key = `${req.params.userId}:${req.user!.userId}`;
  const ts = typingMap.get(key);
  return success(res, { typing: !!(ts && (Date.now() - ts) < 4000) });
}

// PATCH /api/messages/:id/read
export async function markMessageRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的消息ID');
    const msg = await msgSvc.findMessageById(id);
    if (!msg) return error(res, '消息不存在', 404);
    if (msg.receiverId !== req.user!.userId) return error(res, '无权操作', 403);
    await msgSvc.markMessageRead(id);
    return success(res, null, 'ok');
  } catch (err) { next(err); }
}

// PATCH /api/messages/:id/recall
export async function recallMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const msg = await msgSvc.findMessageById(id);
    if (!msg) return error(res, '消息不存在', 404);
    if (msg.senderId !== req.user!.userId) return error(res, '只能撤回自己发送的消息', 403);
    if (Date.now() - new Date(msg.createdAt).getTime() > 2 * 60 * 1000) return error(res, '超过2分钟，无法撤回');
    await msgSvc.recallMessage(id);
    return success(res, null, '消息已撤回');
  } catch (err) { next(err); }
}

// PATCH /api/messages/:id/delivered
export async function markDelivered(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const msg = await msgSvc.findMessageById(id);
    if (!msg) return error(res, '消息不存在', 404);
    if (msg.receiverId !== req.user!.userId) return error(res, '无权操作', 403);
    await msgSvc.markMessageDelivered(id);
    return success(res, null, 'ok');
  } catch (err) { next(err); }
}

// POST /api/messages/batch-delete
export async function batchDeleteMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50) return error(res, '请选择要删除的消息(1-50条)');
    const validIds = ids.map(Number).filter(id => !isNaN(id));
    if (validIds.length === 0) return error(res, '无效的消息ID');
    await msgSvc.deleteMessages(validIds, userId);
    return success(res, null, `已删除${validIds.length}条消息`);
  } catch (err) { next(err); }
}

// GET /api/messages/search/detail
export async function searchMessageDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const keyword = (req.query.keyword as string || '').trim();
    const type = req.query.type as string;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);

    const { prisma } = await import('../config/database');
    const where: any = {};
    if (type) where.type = type;
    if (keyword) {
      where.AND = [{ OR: [{ senderId: userId }, { receiverId: userId }] }, { content: { contains: keyword } }];
    } else {
      where.OR = [{ senderId: userId }, { receiverId: userId }];
    }

    const [list, total] = await Promise.all([
      prisma.chatMessage.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { sender: { select: { id: true, nickname: true, avatarUrl: true } }, receiver: { select: { id: true, nickname: true, avatarUrl: true } } } }),
      prisma.chatMessage.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

// GET /api/conversations/settings/:peerId
export async function getConversationSetting(req: Request, res: Response, next: NextFunction) {
  try {
    const peerId = parseInt(req.params.peerId as string);
    if (isNaN(peerId)) return error(res, '无效的用户ID');
    const setting = await msgSvc.getConversationSetting(req.user!.userId, peerId);
    return success(res, setting || { isPinned: false, isMuted: false, bgImage: null });
  } catch (err) { next(err); }
}

// PUT /api/conversations/settings/:peerId
export async function updateConversationSetting(req: Request, res: Response, next: NextFunction) {
  try {
    const peerId = parseInt(req.params.peerId as string);
    if (isNaN(peerId)) return error(res, '无效的用户ID');
    const setting = await msgSvc.upsertConversationSetting(req.user!.userId, peerId, req.body);
    return success(res, setting);
  } catch (err) { next(err); }
}
