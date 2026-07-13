"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversations = getConversations;
exports.getMessages = getMessages;
exports.sendMessage = sendMessage;
exports.getUnreadCount = getUnreadCount;
exports.setTyping = setTyping;
exports.getTyping = getTyping;
exports.markMessageRead = markMessageRead;
exports.recallMessage = recallMessage;
exports.markDelivered = markDelivered;
exports.batchDeleteMessages = batchDeleteMessages;
exports.searchMessageDetail = searchMessageDetail;
exports.getConversationSetting = getConversationSetting;
exports.updateConversationSetting = updateConversationSetting;
const response_1 = require("../utils/response");
const sensitive_1 = require("../utils/sensitive");
const notification_service_1 = require("../services/notification.service");
const msgSvc = __importStar(require("../services/message.service"));
// GET /api/messages/conversations
async function getConversations(req, res, next) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 30, 100);
        const { list, total } = await msgSvc.findConversations(req.user.userId, page, pageSize);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/messages/:userId
async function getMessages(req, res, next) {
    try {
        const currentUserId = req.user.userId;
        const peerId = parseInt(req.params.userId);
        if (isNaN(peerId))
            return (0, response_1.error)(res, '无效的用户ID');
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 50, 100);
        await msgSvc.markMessagesRead(peerId, currentUserId);
        const [list, total] = await msgSvc.findMessages(currentUserId, peerId, page, pageSize);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/messages/:userId
async function sendMessage(req, res, next) {
    try {
        const senderId = req.user.userId;
        const receiverId = parseInt(req.params.userId);
        if (isNaN(receiverId))
            return (0, response_1.error)(res, '无效的用户ID');
        if (senderId === receiverId)
            return (0, response_1.error)(res, '不能给自己发消息');
        const { content, type } = req.body;
        const ALLOWED_TYPES = ['text', 'image', 'voice', 'file', 'location', 'card'];
        const safeType = ALLOWED_TYPES.includes(type) ? type : 'text';
        const safeContent = content.trim().replace(/<[^>]*>/g, '');
        if ((0, sensitive_1.containsSensitive)(safeContent))
            return (0, response_1.error)(res, '消息包含违规内容，请修改后重试');
        // 违规用户检查
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { violationCount: true, violationBanUntil: true } });
        if (sender && sender.violationCount > 5 && sender.violationBanUntil && new Date(sender.violationBanUntil) > new Date()) {
            const remaining = Math.ceil((new Date(sender.violationBanUntil).getTime() - Date.now()) / 60000);
            return (0, response_1.error)(res, `私信功能已被限制，${remaining}分钟后自动解除`);
        }
        // 接收方检查
        const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
        if (!receiver)
            return (0, response_1.error)(res, '用户不存在', 404);
        if (receiver.status === 'disabled')
            return (0, response_1.error)(res, '该用户已注销，无法发送消息');
        // 拉黑检查
        const blocked = await msgSvc.checkBlocked(senderId, receiverId);
        if (blocked)
            return (0, response_1.error)(res, '无法发送消息');
        // 互关限制
        const isMutual = await msgSvc.checkMutualFollow(senderId, receiverId);
        if (!isMutual) {
            const sentCount = await msgSvc.countUserMessages(senderId, receiverId);
            if (sentCount >= 10)
                return (0, response_1.error)(res, '消息已达上限（10条），互关后可无限发送');
        }
        const msg = await msgSvc.createMessage({ senderId, receiverId, content: safeContent, type: safeType });
        // 图片消息审核
        if (safeType === 'image') {
            prisma.imageReview.create({ data: { url: safeContent, blurredUrl: safeContent, uploaderId: senderId, context: 'chat', contextId: msg.id, status: 'pending' } }).catch(() => { });
        }
        // 通知（首次未读才通知）
        const existingUnread = await msgSvc.findExistingUnreadCount(senderId, receiverId);
        if (existingUnread <= 1) {
            (0, notification_service_1.createNotification)({ userId: receiverId, type: 'chat_message', title: '新私信', content: safeType === 'image' ? '[图片]' : `新消息：${safeContent.slice(0, 50)}`, relatedId: msg.id }).catch(() => { });
        }
        return (0, response_1.success)(res, msg, '', 201);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/messages/unread-count
async function getUnreadCount(req, res, next) {
    try {
        const count = await msgSvc.getUnreadCount(req.user.userId);
        return (0, response_1.success)(res, { count });
    }
    catch (err) {
        next(err);
    }
}
// ─── 正在输入状态（内存） ───
const typingMap = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [k, t] of typingMap) {
        if (now - t > 4000)
            typingMap.delete(k);
    }
}, 30000);
function setTyping(req, res) {
    const key = `${req.user.userId}:${req.params.userId}`;
    typingMap.set(key, Date.now());
    return (0, response_1.success)(res, null, 'ok');
}
function getTyping(req, res) {
    const key = `${req.params.userId}:${req.user.userId}`;
    const ts = typingMap.get(key);
    return (0, response_1.success)(res, { typing: !!(ts && (Date.now() - ts) < 4000) });
}
// PATCH /api/messages/:id/read
async function markMessageRead(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的消息ID');
        const msg = await msgSvc.findMessageById(id);
        if (!msg)
            return (0, response_1.error)(res, '消息不存在', 404);
        if (msg.receiverId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        await msgSvc.markMessageRead(id);
        return (0, response_1.success)(res, null, 'ok');
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/messages/:id/recall
async function recallMessage(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const msg = await msgSvc.findMessageById(id);
        if (!msg)
            return (0, response_1.error)(res, '消息不存在', 404);
        if (msg.senderId !== req.user.userId)
            return (0, response_1.error)(res, '只能撤回自己发送的消息', 403);
        if (Date.now() - new Date(msg.createdAt).getTime() > 2 * 60 * 1000)
            return (0, response_1.error)(res, '超过2分钟，无法撤回');
        await msgSvc.recallMessage(id);
        return (0, response_1.success)(res, null, '消息已撤回');
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/messages/:id/delivered
async function markDelivered(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const msg = await msgSvc.findMessageById(id);
        if (!msg)
            return (0, response_1.error)(res, '消息不存在', 404);
        if (msg.receiverId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        await msgSvc.markMessageDelivered(id);
        return (0, response_1.success)(res, null, 'ok');
    }
    catch (err) {
        next(err);
    }
}
// POST /api/messages/batch-delete
async function batchDeleteMessages(req, res, next) {
    try {
        const userId = req.user.userId;
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50)
            return (0, response_1.error)(res, '请选择要删除的消息(1-50条)');
        const validIds = ids.map(Number).filter(id => !isNaN(id));
        if (validIds.length === 0)
            return (0, response_1.error)(res, '无效的消息ID');
        await msgSvc.deleteMessages(validIds, userId);
        return (0, response_1.success)(res, null, `已删除${validIds.length}条消息`);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/messages/search/detail
async function searchMessageDetail(req, res, next) {
    try {
        const userId = req.user.userId;
        const keyword = (req.query.keyword || '').trim();
        const type = req.query.type;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const where = {};
        if (type)
            where.type = type;
        if (keyword) {
            where.AND = [{ OR: [{ senderId: userId }, { receiverId: userId }] }, { content: { contains: keyword } }];
        }
        else {
            where.OR = [{ senderId: userId }, { receiverId: userId }];
        }
        const [list, total] = await Promise.all([
            prisma.chatMessage.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { sender: { select: { id: true, nickname: true, avatarUrl: true } }, receiver: { select: { id: true, nickname: true, avatarUrl: true } } } }),
            prisma.chatMessage.count({ where }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/conversations/settings/:peerId
async function getConversationSetting(req, res, next) {
    try {
        const peerId = parseInt(req.params.peerId);
        if (isNaN(peerId))
            return (0, response_1.error)(res, '无效的用户ID');
        const setting = await msgSvc.getConversationSetting(req.user.userId, peerId);
        return (0, response_1.success)(res, setting || { isPinned: false, isMuted: false, bgImage: null });
    }
    catch (err) {
        next(err);
    }
}
// PUT /api/conversations/settings/:peerId
async function updateConversationSetting(req, res, next) {
    try {
        const peerId = parseInt(req.params.peerId);
        if (isNaN(peerId))
            return (0, response_1.error)(res, '无效的用户ID');
        const setting = await msgSvc.upsertConversationSetting(req.user.userId, peerId, req.body);
        return (0, response_1.success)(res, setting);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=messages.controller.js.map