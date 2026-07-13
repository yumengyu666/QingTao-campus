"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyMatch = getDailyMatch;
exports.revealIdentity = revealIdentity;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const notification_service_1 = require("../services/notification.service");
const crypto_1 = __importDefault(require("crypto"));
function today() {
    return new Date().toISOString().slice(0, 10);
}
/** 检查用户是否处于恋爱关系中，返回恋爱开始日期 */
async function isInRelationship(profileId) {
    const rel = await database_1.prisma.datingRequest.findFirst({
        where: {
            status: 'accepted',
            OR: [{ senderId: profileId }, { receiverId: profileId }],
        },
        orderBy: { updatedAt: 'desc' },
    });
    return rel ? rel.updatedAt : null;
}
function daysSince(date) {
    return Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)));
}
/** GET /api/dating/daily-match — 获取今日缘分 */
async function getDailyMatch(req, res, next) {
    try {
        const profile = await database_1.prisma.datingProfile.findUnique({ where: { userId: req.user.userId } });
        if (!profile)
            return (0, response_1.error)(res, '请先创建匿名身份');
        const date = today();
        // 已有恋爱对象 → 不撮合，返回恋爱天数
        const relDate = await isInRelationship(profile.id);
        if (relDate) {
            return (0, response_1.success)(res, { matched: false, reason: 'in_relationship', relationshipDays: daysSince(relDate) });
        }
        // 检查今天是否已有匹配
        const existing = await database_1.prisma.dailyMatch.findFirst({
            where: {
                matchDate: date,
                OR: [{ user1Id: profile.id }, { user2Id: profile.id }],
            },
            include: {
                user1: { select: { id: true, userId: true, nickname: true, avatarSeed: true, customAvatar: true, gender: true, bio: true } },
                user2: { select: { id: true, userId: true, nickname: true, avatarSeed: true, customAvatar: true, gender: true, bio: true } },
            },
        });
        if (existing) {
            const peer = existing.user1Id === profile.id ? existing.user2 : existing.user1;
            return (0, response_1.success)(res, {
                matched: true,
                matchId: existing.id,
                revealed: existing.revealed,
                peer: {
                    userId: peer.userId,
                    nickname: peer.nickname,
                    bio: peer.bio,
                    ...(existing.revealed ? {
                        avatarSeed: peer.avatarSeed,
                        customAvatar: peer.customAvatar,
                        gender: peer.gender,
                    } : {}),
                },
            });
        }
        // 找一个新的随机匹配对象
        const excludeIds = [profile.id];
        // 排除今天已匹配的人 + 最近7天已匹配的人（避免重复）
        const recentMatches = await database_1.prisma.dailyMatch.findMany({
            where: {
                matchDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
                OR: [{ user1Id: profile.id }, { user2Id: profile.id }],
            },
            select: { user1Id: true, user2Id: true },
        });
        for (const m of recentMatches) {
            excludeIds.push(m.user1Id);
            excludeIds.push(m.user2Id);
        }
        // 找一个有资料、不在恋爱中、未被匹配的随机用户
        const candidates = await database_1.prisma.datingProfile.findMany({
            where: { id: { notIn: excludeIds } },
            select: { id: true, userId: true },
        });
        // 过滤掉在恋爱中的
        const available = [];
        for (const c of candidates) {
            if (!(await isInRelationship(c.id))) {
                available.push(c);
            }
        }
        if (available.length === 0) {
            return (0, response_1.success)(res, { matched: false, reason: 'no_candidates' });
        }
        // 随机选一个
        const chosen = available[crypto_1.default.randomInt(0, available.length)];
        const match = await database_1.prisma.dailyMatch.create({
            data: {
                user1Id: profile.id,
                user2Id: chosen.id,
                matchDate: date,
            },
            include: {
                user2: { select: { id: true, userId: true, nickname: true, avatarSeed: true, customAvatar: true, gender: true, bio: true } },
            },
        });
        // 通知双方
        const notify = (userId, peerName) => {
            (0, notification_service_1.createNotification)({
                userId,
                type: 'dating_request',
                title: '今日缘分',
                content: `缘分让你与 ${peerName} 相遇！去恋爱空间看看今天的朋友吧`,
                relatedId: match.id,
            }).catch(() => { });
        };
        notify(req.user.userId, match.user2.nickname);
        notify(chosen.userId, profile.nickname);
        return (0, response_1.success)(res, {
            matched: true,
            matchId: match.id,
            revealed: false,
            peer: {
                userId: match.user2.userId,
                nickname: match.user2.nickname,
                bio: match.user2.bio,
            },
        }, '缘分已到', 201);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/dating/daily-match/:id/reveal — 双方确认亮身份 */
async function revealIdentity(req, res, next) {
    try {
        const matchId = parseInt(req.params.id);
        const profile = await database_1.prisma.datingProfile.findUnique({ where: { userId: req.user.userId } });
        if (!profile)
            return (0, response_1.error)(res, '请先创建匿名身份');
        const match = await database_1.prisma.dailyMatch.findUnique({
            where: { id: matchId },
            include: {
                user1: { select: { id: true, nickname: true, contactWechat: true, contactQq: true, userId: true } },
                user2: { select: { id: true, nickname: true, contactWechat: true, contactQq: true, userId: true } },
            },
        });
        if (!match)
            return (0, response_1.error)(res, '匹配不存在', 404);
        if (match.user1Id !== profile.id && match.user2Id !== profile.id)
            return (0, response_1.error)(res, '无权操作', 403);
        if (!match.revealed) {
            // 第一次确认 → 设置 revealed
            await database_1.prisma.dailyMatch.update({ where: { id: matchId }, data: { revealed: true } });
            // 通知对方
            const peer = match.user1Id === profile.id ? match.user2 : match.user1;
            (0, notification_service_1.createNotification)({
                userId: peer.userId,
                type: 'dating_request',
                title: '对方愿意认识你',
                content: `${profile.nickname} 也愿意与你相识！双方可查看联系方式`,
                relatedId: matchId,
            }).catch(() => { });
            return (0, response_1.success)(res, {
                revealed: true,
                peer: {
                    nickname: peer.nickname,
                    contactWechat: peer.contactWechat,
                    contactQq: peer.contactQq,
                },
            }, '双方已确认，可查看联系方式');
        }
        // 已 revealed，返回完整信息
        const peer = match.user1Id === profile.id ? match.user2 : match.user1;
        return (0, response_1.success)(res, {
            revealed: true,
            peer: {
                nickname: peer.nickname,
                contactWechat: peer.contactWechat,
                contactQq: peer.contactQq,
            },
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=dailyMatch.controller.js.map