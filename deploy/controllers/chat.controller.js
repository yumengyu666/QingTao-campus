"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchChatMessages = searchChatMessages;
exports.readAllMessages = readAllMessages;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/**
 * GET /api/chat/search?keyword=xxx — 搜索自己的聊天消息
 */
async function searchChatMessages(req, res, next) {
    try {
        const userId = req.user.userId;
        const keyword = req.query.keyword;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        if (!keyword?.trim())
            return (0, response_1.error)(res, '请输入搜索关键词');
        const where = {
            AND: [
                { OR: [{ senderId: userId }, { receiverId: userId }] },
                { content: { contains: keyword.trim() } },
            ],
        };
        const [list, total] = await Promise.all([
            database_1.prisma.chatMessage.findMany({
                where,
                select: { id: true, senderId: true, receiverId: true, content: true, type: true, isRead: true, createdAt: true },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.chatMessage.count({ where }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/**
 * POST /api/chat/read-all — 标记所有私信为已读
 */
async function readAllMessages(req, res, next) {
    try {
        const userId = req.user.userId;
        const result = await database_1.prisma.chatMessage.updateMany({
            where: { receiverId: userId, isRead: false },
            data: { isRead: true },
        });
        return (0, response_1.success)(res, { count: result.count }, '已全部标记为已读');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=chat.controller.js.map