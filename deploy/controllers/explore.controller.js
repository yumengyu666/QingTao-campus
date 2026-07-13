"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExplore = getExplore;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/**
 * GET /api/explore — 发现页聚合数据
 * 返回热门标签、最新答疑、最新求职、平台统计摘要
 */
async function getExplore(req, res, next) {
    try {
        const [hotTags, recentQa, recentWanted, platformStats,] = await Promise.all([
            // 热门标签（按帖子数排序）
            database_1.prisma.topicTag.findMany({
                where: { postCount: { gt: 0 } },
                select: { id: true, name: true, color: true, postCount: true },
                orderBy: { postCount: 'desc' },
                take: 12,
            }),
            // 最新未解决的答疑
            database_1.prisma.qaPost.findMany({
                where: { isDeleted: false, isResolved: false },
                select: {
                    id: true, title: true, answerCount: true, viewCount: true, createdAt: true,
                    user: { select: { id: true, nickname: true, avatarUrl: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 6,
            }),
            // 最新求购
            database_1.prisma.wantedItem.findMany({
                where: { isDeleted: false },
                select: {
                    id: true, title: true, budget: true, campus: true, createdAt: true, userId: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 6,
            }),
            // 平台统计摘要
            (async () => {
                const [users, goods, posts] = await Promise.all([
                    database_1.prisma.user.count({ where: { status: 'active' } }),
                    database_1.prisma.goods.count({ where: { isDeleted: false, status: { in: ['approved', 'sold'] } } }),
                    database_1.prisma.post.count({ where: { isDeleted: false, status: 'approved' } }),
                ]);
                return { activeUsers: users, activeGoods: goods, activePosts: posts };
            })(),
        ]);
        // 加载求购用户信息
        const wantedUserIds = [...new Set(recentWanted.map(w => w.userId))];
        const wantedUsers = await database_1.prisma.user.findMany({
            where: { id: { in: wantedUserIds } },
            select: { id: true, nickname: true, avatarUrl: true },
        });
        const wantedUserMap = new Map(wantedUsers.map(u => [u.id, u]));
        const recentWantedWithUsers = recentWanted.map(w => ({
            ...w,
            user: wantedUserMap.get(w.userId) || null,
        }));
        return (0, response_1.success)(res, {
            hotTags,
            recentQa,
            recentWanted: recentWantedWithUsers,
            platformStats,
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=explore.controller.js.map