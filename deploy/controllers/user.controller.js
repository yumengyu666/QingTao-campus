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
exports.getLeaderboard = getLeaderboard;
exports.getUserProfile = getUserProfile;
exports.getMyProfileChanges = getMyProfileChanges;
exports.updateProfile = updateProfile;
exports.updatePassword = updatePassword;
exports.followUser = followUser;
exports.unfollowUser = unfollowUser;
exports.getFollowers = getFollowers;
exports.getFollowing = getFollowing;
exports.getUserGoods = getUserGoods;
exports.getUserPosts = getUserPosts;
exports.getNotifPrefs = getNotifPrefs;
exports.updateNotifPrefs = updateNotifPrefs;
exports.deleteAccount = deleteAccount;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const auth_service_1 = require("../services/auth.service");
const sensitive_1 = require("../utils/sensitive");
const notification_service_1 = require("../services/notification.service");
const logger_1 = require("../utils/logger");
// GET /api/users/leaderboard — 排行榜: 按信誉分排序，取前20
async function getLeaderboard(req, res, next) {
    try {
        const top = await database_1.prisma.user.findMany({
            where: { status: 'active' },
            orderBy: { points: 'desc' },
            take: 20,
            select: { id: true, nickname: true, avatarUrl: true, points: true, level: true },
        });
        return (0, response_1.success)(res, top);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/users/:id — 用户公开信息
async function getUserProfile(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的用户ID');
        const user = await database_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true, nickname: true, avatarUrl: true, wechat: true, qq: true,
                bio: true, campusArea: true, status: true, createdAt: true,
            },
        });
        if (!user)
            return (0, response_1.notFound)(res, '用户不存在');
        const isDisabled = user.status === 'disabled';
        // 已注销用户返回受限信息
        if (isDisabled) {
            return (0, response_1.success)(res, {
                id: user.id,
                nickname: user.nickname || `已注销用户${user.id}`,
                avatarUrl: '',
                bio: '该用户已注销',
                campusArea: '',
                followCount: 0,
                fansCount: 0,
                goodsCount: 0,
                postsCount: 0,
                isFollowing: false,
                isDisabled: true,
                createdAt: user.createdAt,
            });
        }
        // 统计数据
        const [followCount, fansCount, goodsCount, postsCount, tradeStats] = await Promise.all([
            database_1.prisma.follow.count({ where: { followerId: id } }),
            database_1.prisma.follow.count({ where: { followingId: id } }),
            database_1.prisma.goods.count({ where: { userId: id, status: { in: ['approved', 'sold'] }, isDeleted: false } }),
            database_1.prisma.post.count({ where: { userId: id, status: 'approved', isDeleted: false } }),
            database_1.prisma.tradeReview.aggregate({
                where: { targetId: id },
                _avg: { rating: true },
                _count: true,
            }),
        ]);
        // 信誉等级计算
        const completedTrades = await database_1.prisma.tradeIntent.count({
            where: { OR: [{ buyerId: id }, { sellerId: id }], status: 'completed' },
        });
        const avgRating = tradeStats._avg.rating || 0;
        const reviewCount = tradeStats._count;
        let reputationLevel;
        let reputationLabel;
        if (completedTrades >= 20 && avgRating >= 4.5) {
            reputationLevel = 'diamond';
            reputationLabel = '💎 金牌卖家';
        }
        else if (completedTrades >= 10 && avgRating >= 4.0) {
            reputationLevel = 'gold';
            reputationLabel = '🥇 达人卖家';
        }
        else if (completedTrades >= 3 && avgRating >= 3.0) {
            reputationLevel = 'silver';
            reputationLabel = '🥈 活跃卖家';
        }
        else if (completedTrades >= 1) {
            reputationLevel = 'bronze';
            reputationLabel = '🥉 新手卖家';
        }
        else {
            reputationLevel = 'new';
            reputationLabel = '🌱 新用户';
        }
        // 是否已关注（需登录）
        let isFollowing = false;
        if (req.user) {
            const follow = await database_1.prisma.follow.findUnique({
                where: { followerId_followingId: { followerId: req.user.userId, followingId: id } },
            });
            isFollowing = !!follow;
        }
        // 未登录用户隐藏联系方式
        const publicUser = { ...user, followCount, fansCount, goodsCount, postsCount, isFollowing,
            reputationLevel, reputationLabel, completedTrades, avgRating: Math.round(avgRating * 10) / 10, reviewCount };
        if (!req.user) {
            delete publicUser.wechat;
            delete publicUser.qq;
        }
        return (0, response_1.success)(res, publicUser);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/users/profile/changes — 当前用户自己的待审资料修改
async function getMyProfileChanges(req, res, next) {
    try {
        const changes = await database_1.prisma.profileChange.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return (0, response_1.success)(res, changes);
    }
    catch (err) {
        next(err);
    }
}
// PUT /api/users/profile — 修改个人资料（直接生效，L1敏感词+L2 AI审核）
async function updateProfile(req, res, next) {
    try {
        const userId = req.user.userId;
        const allowedFields = ['nickname', 'avatarUrl', 'wechat', 'qq', 'bio', 'campusArea', 'phone', 'email'];
        const fieldLimits = { nickname: 20, wechat: 50, qq: 20, bio: 200, phone: 20, email: 100 };
        const changes = req.body;
        // 邮箱格式校验
        if (changes.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.email)) {
            return (0, response_1.error)(res, '邮箱格式不正确');
        }
        // 手机号格式校验（中国大陆手机号）
        if (changes.phone && !/^1[3-9]\d{9}$/.test(changes.phone)) {
            return (0, response_1.error)(res, '手机号格式不正确，请输入11位有效手机号');
        }
        const data = {};
        for (const [field, newValue] of Object.entries(changes)) {
            if (!allowedFields.includes(field))
                continue;
            if (typeof newValue !== 'string')
                continue;
            const limit = fieldLimits[field];
            if (limit && newValue.length > limit) {
                return (0, response_1.error)(res, `"${field}"不能超过${limit}个字符`);
            }
            if ((0, sensitive_1.containsSensitive)(newValue))
                return (0, response_1.error)(res, `"${field}"包含违规内容`);
            data[field] = newValue;
        }
        if (Object.keys(data).length === 0)
            return (0, response_1.error)(res, '未检测到任何修改');
        await database_1.prisma.user.update({ where: { id: userId }, data });
        // 昵称变更时异步同步历史数据（fire-and-forget）
        if (data.nickname) {
            const newNickname = data.nickname;
            (async () => {
                try {
                    // 目前 ChatMessage/Comment 等表通过 Prisma relation JOIN 获取 nickname，
                    // 不存在 denormalized 缓存列，改名会自动生效。
                    // 此处预留：如果未来添加了 senderNickname 等缓存字段，启用以下更新：
                    // await prisma.chatMessage.updateMany({ where: { senderId: userId }, data: { senderNickname: newNickname } });
                    // await prisma.goodsComment.updateMany({ where: { userId }, data: { userNickname: newNickname } });
                    // await prisma.postComment.updateMany({ where: { userId }, data: { userNickname: newNickname } });
                    // await prisma.lostFoundComment.updateMany({ where: { userId }, data: { userNickname: newNickname } });
                    logger_1.logger.info(`User #${userId} nickname updated, history sync skipped (schema uses JOINs)`);
                }
                catch { }
            })().catch(() => { });
        }
        // L2 AI 异步审核资料修改（bio + 联系方式字段）
        const auditFields = ['bio', 'nickname', 'wechat', 'qq'];
        const auditText = auditFields
            .map(f => data[f])
            .filter(Boolean)
            .join(' ');
        if (auditText.trim()) {
            Promise.resolve().then(() => __importStar(require('../services/moderation.service'))).then(({ aiModerate }) => {
                aiModerate(auditText, { contentType: 'user_profile', userId }).then(result => {
                    if (result === 'violation') {
                        logger_1.logger.warn(`AI flagged user #${userId} profile, clearing sensitive fields`);
                        // 清空可能违规的字段
                        const clearData = {};
                        for (const f of auditFields) {
                            if (data[f])
                                clearData[f] = '';
                        }
                        database_1.prisma.user.update({ where: { id: userId }, data: clearData }).catch(() => { });
                        (0, notification_service_1.createNotification)({
                            userId,
                            type: 'review_result',
                            title: '个人资料被重置',
                            content: '您的个人资料经审核判定包含违规内容，相关字段已被清空。如需修改请重新编辑。',
                        }).catch(() => { });
                    }
                });
            });
        }
        return (0, response_1.success)(res, null, '资料已更新');
    }
    catch (err) {
        next(err);
    }
}
// PUT /api/users/password — 修改密码
async function updatePassword(req, res, next) {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword)
            return (0, response_1.error)(res, '请输入旧密码和新密码');
        if (newPassword.length < 6)
            return (0, response_1.error)(res, '新密码至少6位');
        const user = await database_1.prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user)
            return (0, response_1.notFound)(res);
        const valid = await (0, auth_service_1.comparePassword)(oldPassword, user.passwordHash);
        if (!valid)
            return (0, response_1.error)(res, '旧密码错误');
        const passwordHash = await (0, auth_service_1.hashPassword)(newPassword);
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, tokenVersion: { increment: 1 } },
        });
        return (0, response_1.success)(res, null, '密码修改成功，请重新登录');
    }
    catch (err) {
        next(err);
    }
}
// POST /api/users/:id/follow — 关注
async function followUser(req, res, next) {
    try {
        const followerId = req.user.userId;
        const followingId = parseInt(req.params.id);
        if (isNaN(followingId))
            return (0, response_1.error)(res, '无效的用户ID');
        if (followerId === followingId)
            return (0, response_1.error)(res, '不能关注自己');
        const target = await database_1.prisma.user.findUnique({ where: { id: followingId } });
        if (!target)
            return (0, response_1.notFound)(res, '用户不存在');
        const exist = await database_1.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });
        if (exist)
            return (0, response_1.success)(res, null, '已关注该用户');
        // 关注通知去重：5分钟内同一人重复关注不重复通知
        const recentNotification = await database_1.prisma.notification.findFirst({
            where: {
                userId: followingId,
                type: 'new_follower',
                relatedId: followerId,
                createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
            },
        });
        await database_1.prisma.$transaction(async (tx) => {
            await tx.follow.create({ data: { followerId, followingId } });
            if (!recentNotification) {
                await tx.notification.create({
                    data: {
                        userId: followingId,
                        type: 'new_follower',
                        title: '你有新的粉丝',
                        content: `${req.user.username} 关注了你`,
                        relatedId: followerId,
                    },
                });
            }
        });
        return (0, response_1.success)(res, null, '关注成功');
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/users/:id/follow — 取消关注
async function unfollowUser(req, res, next) {
    try {
        const followerId = req.user.userId;
        const followingId = parseInt(req.params.id);
        await database_1.prisma.follow.deleteMany({
            where: { followerId, followingId },
        });
        return (0, response_1.success)(res, null, '已取消关注');
    }
    catch (err) {
        next(err);
    }
}
// GET /api/users/:id/followers — 粉丝列表
async function getFollowers(req, res, next) {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId))
            return (0, response_1.error)(res, '无效的用户ID');
        const page = parseInt(req.query.page) || 1;
        const pageSize = 20;
        const [list, total] = await Promise.all([
            database_1.prisma.follow.findMany({
                where: { followingId: userId },
                include: { follower: { select: { id: true, nickname: true, avatarUrl: true, bio: true } } },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.follow.count({ where: { followingId: userId } }),
        ]);
        const data = list.map(f => f.follower);
        return (0, response_1.paginated)(res, data, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/users/:id/following — 关注列表
async function getFollowing(req, res, next) {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId))
            return (0, response_1.error)(res, '无效的用户ID');
        const page = parseInt(req.query.page) || 1;
        const pageSize = 20;
        const [list, total] = await Promise.all([
            database_1.prisma.follow.findMany({
                where: { followerId: userId },
                include: { following: { select: { id: true, nickname: true, avatarUrl: true, bio: true } } },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.follow.count({ where: { followerId: userId } }),
        ]);
        const data = list.map(f => f.following);
        return (0, response_1.paginated)(res, data, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/users/:id/goods — 用户商品
async function getUserGoods(req, res, next) {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId))
            return (0, response_1.error)(res, '无效的用户ID');
        const page = parseInt(req.query.page) || 1;
        const pageSize = 12;
        const isOwner = req.user && req.user.userId === userId;
        const where = { userId, isDeleted: false };
        if (!isOwner)
            where.status = { in: ['approved', 'sold'] };
        const [list, total] = await Promise.all([
            database_1.prisma.goods.findMany({
                where,
                include: { category: { select: { name: true, icon: true } } },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.goods.count({ where }),
        ]);
        const data = list.map(g => ({
            ...g,
            images: JSON.parse(g.images || '[]'),
            categoryName: g.category?.name,
            category: undefined,
        }));
        return (0, response_1.paginated)(res, data, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/users/:id/posts — 用户帖子
async function getUserPosts(req, res, next) {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId))
            return (0, response_1.error)(res, '无效的用户ID');
        const page = parseInt(req.query.page) || 1;
        const pageSize = 12;
        const isOwner = req.user && req.user.userId === userId;
        const where = { userId, isDeleted: false };
        if (!isOwner)
            where.status = 'approved';
        const [list, total] = await Promise.all([
            database_1.prisma.post.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.post.count({ where }),
        ]);
        const data = list.map(p => ({
            ...p,
            images: JSON.parse(p.images || '[]'),
        }));
        return (0, response_1.paginated)(res, data, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/users/me/notif-prefs — 获取通知偏好 */
async function getNotifPrefs(req, res, next) {
    try {
        const user = await database_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { notifPrefs: true },
        });
        const prefs = JSON.parse(user?.notifPrefs || '{}');
        return (0, response_1.success)(res, prefs);
    }
    catch (err) {
        next(err);
    }
}
/** PUT /api/users/me/notif-prefs — 更新通知偏好 */
async function updateNotifPrefs(req, res, next) {
    try {
        const { prefs } = req.body;
        if (!prefs || typeof prefs !== 'object')
            return (0, response_1.error)(res, '无效的偏好设置');
        await database_1.prisma.user.update({
            where: { id: req.user.userId },
            data: { notifPrefs: JSON.stringify(prefs) },
        });
        return (0, response_1.success)(res, null, '已更新');
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/users/me — 注销账号（软删除：禁用+匿名化） */
async function deleteAccount(req, res, next) {
    try {
        const userId = req.user.userId;
        await database_1.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: {
                    status: 'disabled',
                    nickname: `已注销用户${userId}`,
                    avatarUrl: '',
                    wechat: '',
                    qq: '',
                    bio: '',
                },
            });
            await tx.goods.updateMany({ where: { userId }, data: { status: 'offline' } });
            await tx.post.updateMany({ where: { userId }, data: { status: 'offline' } });
            await tx.lostFound.updateMany({ where: { userId }, data: { status: 'offline' } });
        });
        return (0, response_1.success)(res, null, '账号已注销');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=user.controller.js.map