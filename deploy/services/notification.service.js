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
exports.createNotification = createNotification;
exports.cleanupRelatedNotifications = cleanupRelatedNotifications;
exports.broadcastAnnouncement = broadcastAnnouncement;
const database_1 = require("../config/database");
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
async function createNotification(params) {
    // 去重：5分钟内同一用户+类型+关联ID+资源类型不重复创建
    if (params.relatedId && params.relatedType) {
        const recent = await database_1.prisma.notification.findFirst({
            where: {
                userId: params.userId,
                type: params.type,
                relatedId: params.relatedId,
                relatedType: params.relatedType,
                createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
            },
            select: { id: true },
        });
        if (recent)
            return recent;
    }
    else if (params.relatedId) {
        const recent = await database_1.prisma.notification.findFirst({
            where: {
                userId: params.userId,
                type: params.type,
                relatedId: params.relatedId,
                createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
            },
            select: { id: true },
        });
        if (recent)
            return recent;
    }
    const notif = await database_1.prisma.notification.create({
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
        const { pushToUser } = await Promise.resolve().then(() => __importStar(require('./sse.service')));
        pushToUser(params.userId, 'notification', {
            type: params.type, title: params.title,
            content: params.content || '',
            relatedId: params.relatedId,
            relatedType: params.relatedType,
        });
    }
    catch { }
    return notif;
}
// 删除某内容相关的所有通知（删除商品/帖子/失物时调用）
async function cleanupRelatedNotifications(relatedId, types) {
    await database_1.prisma.notification.deleteMany({
        where: { relatedId, type: { in: types } },
    });
}
// 给所有用户发送公告
async function broadcastAnnouncement(title, content, createdBy) {
    return database_1.prisma.$transaction(async (tx) => {
        const announcement = await tx.announcement.create({
            data: { title, content, createdBy },
        });
        // 游标分页读取用户，避免全量加载到内存
        let cursor;
        const batchSize = 500;
        let totalNotified = 0;
        do {
            const users = await tx.user.findMany({
                where: { status: 'active', ...(cursor !== undefined ? { id: { gt: cursor } } : {}) },
                select: { id: true },
                take: batchSize,
                orderBy: { id: 'asc' },
            });
            if (users.length === 0)
                break;
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
//# sourceMappingURL=notification.service.js.map