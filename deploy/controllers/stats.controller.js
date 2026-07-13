"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboard = getLeaderboard;
exports.getSummary = getSummary;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/** GET /api/stats/leaderboard — 用户排行榜 */
async function getLeaderboard(req, res, next) {
    try {
        const type = req.query.type || 'sellers'; // sellers | active | popular
        if (type === 'sellers') {
            // 交易达人：按发布商品数排名
            const sellers = await database_1.prisma.user.findMany({
                where: { status: 'active', role: 'user' },
                select: {
                    id: true, nickname: true, avatarUrl: true,
                    _count: { select: { goods: { where: { isDeleted: false } } } },
                },
                orderBy: { goods: { _count: 'desc' } },
                take: 20,
            });
            return (0, response_1.success)(res, sellers.map(u => ({
                id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl,
                goodsCount: u._count.goods,
            })));
        }
        if (type === 'active') {
            // 活跃用户：按帖子+评论总数排名
            const users = await database_1.prisma.user.findMany({
                where: { status: 'active', role: 'user' },
                select: {
                    id: true, nickname: true, avatarUrl: true,
                    _count: {
                        select: {
                            posts: { where: { isDeleted: false } },
                            postComments: true,
                            goodsComments: true,
                            lostFoundComments: true,
                        },
                    },
                },
                take: 20,
            });
            const ranked = users
                .map(u => ({
                id: u.id, nickname: u.nickname, avatarUrl: u.avatarUrl,
                activityScore: u._count.posts + u._count.postComments + u._count.goodsComments + u._count.lostFoundComments,
            }))
                .sort((a, b) => b.activityScore - a.activityScore)
                .slice(0, 20);
            return (0, response_1.success)(res, ranked);
        }
        return (0, response_1.error)(res, '无效的排行榜类型');
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/stats/summary — 平台概览统计 */
async function getSummary(req, res, next) {
    try {
        const [userCount, goodsCount, postCount, lostFoundCount, qaCount, resourceCount] = await Promise.all([
            database_1.prisma.user.count({ where: { status: 'active' } }),
            database_1.prisma.goods.count({ where: { isDeleted: false, status: 'approved' } }),
            database_1.prisma.post.count({ where: { isDeleted: false, status: 'approved' } }),
            database_1.prisma.lostFound.count({ where: { isDeleted: false, status: { in: ['approved', 'resolved'] } } }),
            database_1.prisma.qaPost.count({ where: { isDeleted: false } }),
            database_1.prisma.courseResource.count(),
        ]);
        return (0, response_1.success)(res, {
            users: userCount,
            goods: goodsCount,
            posts: postCount,
            lostFounds: lostFoundCount,
            qa: qaCount,
            resources: resourceCount,
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=stats.controller.js.map