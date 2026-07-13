"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboard = getLeaderboard;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
// GET /api/leaderboard — 排行榜
// ?category=goodsSold | postsCreated | points (默认返回全部三类)
async function getLeaderboard(req, res, next) {
    try {
        const category = req.query.category;
        const results = {};
        // 交易达人：按售出商品数排名
        if (!category || category === 'goodsSold') {
            const sellers = await database_1.prisma.user.findMany({
                where: { status: 'active', role: 'user' },
                select: {
                    id: true, nickname: true, avatarUrl: true,
                    _count: { select: { goods: { where: { status: 'sold', isDeleted: false } } } },
                },
                orderBy: { goods: { _count: 'desc' } },
                take: 20,
            });
            results.goodsSold = sellers.map(u => ({
                userId: u.id,
                avatar: u.avatarUrl,
                name: u.nickname,
                count: u._count.goods,
            }));
        }
        // 活跃发帖者：按帖子数排名
        if (!category || category === 'postsCreated') {
            const posters = await database_1.prisma.user.findMany({
                where: { status: 'active', role: 'user' },
                select: {
                    id: true, nickname: true, avatarUrl: true,
                    _count: { select: { posts: { where: { isDeleted: false } } } },
                },
                orderBy: { posts: { _count: 'desc' } },
                take: 20,
            });
            results.postsCreated = posters.map(u => ({
                userId: u.id,
                avatar: u.avatarUrl,
                name: u.nickname,
                count: u._count.posts,
            }));
        }
        // 积分享：按积分排名
        if (!category || category === 'points') {
            const pointLeaders = await database_1.prisma.user.findMany({
                where: { status: 'active', role: 'user' },
                select: { id: true, nickname: true, avatarUrl: true, points: true },
                orderBy: { points: 'desc' },
                take: 20,
            });
            results.points = pointLeaders.map(u => ({
                userId: u.id,
                avatar: u.avatarUrl,
                name: u.nickname,
                count: u.points,
            }));
        }
        return (0, response_1.success)(res, results);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=leaderboard.controller.js.map