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
exports.exportMyData = exportMyData;
exports.getActivity = getActivity;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/**
 * GET /api/data/export — 导出个人数据（GDPR-lite）
 */
async function exportMyData(req, res, next) {
    try {
        const userId = req.user.userId;
        const [user, goods, posts, comments, messages] = await Promise.all([
            database_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true, nickname: true, campusArea: true, wechat: true, qq: true, phone: true, createdAt: true },
            }),
            database_1.prisma.goods.findMany({ where: { userId }, select: { id: true, title: true, price: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
            database_1.prisma.post.findMany({ where: { userId, isDeleted: false }, select: { id: true, title: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
            database_1.prisma.postComment.findMany({ where: { userId }, select: { id: true, content: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
            database_1.prisma.chatMessage.findMany({
                where: { OR: [{ senderId: userId }, { receiverId: userId }] },
                select: { id: true, content: true, createdAt: true },
                orderBy: { createdAt: 'desc' }, take: 100,
            }),
        ]);
        const exportData = { user, goods, posts, comments, messages, exportedAt: new Date().toISOString() };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="my-data-${userId}.json"`);
        return res.json({ code: 200, message: 'success', data: exportData });
    }
    catch (err) {
        next(err);
    }
}
/**
 * GET /api/data/activity — 用户活跃统计
 */
async function getActivity(req, res, next) {
    try {
        const userId = parseInt(req.params.userId) || req.user.userId;
        if (isNaN(userId))
            return (await Promise.resolve().then(() => __importStar(require('../utils/response')))).error(res, '无效ID');
        const [goodsCount, postCount, commentCount, favoriteCount, followerCount, followingCount] = await Promise.all([
            database_1.prisma.goods.count({ where: { userId, isDeleted: false } }),
            database_1.prisma.post.count({ where: { userId, isDeleted: false } }),
            database_1.prisma.postComment.count({ where: { userId } }),
            database_1.prisma.favorite.count({ where: { userId } }),
            database_1.prisma.follow.count({ where: { followingId: userId } }),
            database_1.prisma.follow.count({ where: { followerId: userId } }),
        ]);
        return (0, response_1.success)(res, { goodsCount, postCount, commentCount, favoriteCount, followerCount, followingCount });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=data.controller.js.map