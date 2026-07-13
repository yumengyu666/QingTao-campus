"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.getPosts = getPosts;
exports.createPost = createPost;
exports.followUser = followUser;
exports.sendRequest = sendRequest;
exports.handleRequest = handleRequest;
exports.getRequests = getRequests;
exports.breakRelationship = breakRelationship;
exports.unfollowUser = unfollowUser;
exports.getFollowing = getFollowing;
exports.updatePost = updatePost;
exports.deletePost = deletePost;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const notification_service_1 = require("../services/notification.service");
const moderation_service_1 = require("../services/moderation.service");
const logger_1 = require("../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
// 确保 dating profile 存在
async function ensureProfile(userId) {
    let profile = await database_1.prisma.datingProfile.findUnique({ where: { userId } });
    if (!profile) {
        const user = await database_1.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
        profile = await database_1.prisma.datingProfile.create({
            data: {
                userId,
                nickname: user?.nickname || `匿名用户${userId}`,
                avatarSeed: crypto_1.default.randomBytes(4).toString('hex'),
            },
        });
    }
    return profile;
}
/** GET /api/dating/profile */
async function getProfile(req, res, next) {
    try {
        const profile = await database_1.prisma.datingProfile.findUnique({ where: { userId: req.user.userId } });
        if (!profile)
            return (0, response_1.success)(res, null, '尚未创建');
        // 统计关注数与粉丝数
        const [followingCount, followerCount] = await Promise.all([
            database_1.prisma.datingFollow.count({ where: { followerId: profile.id } }),
            database_1.prisma.datingFollow.count({ where: { followingId: profile.id } }),
        ]);
        return (0, response_1.success)(res, { ...profile, followingCount, followerCount });
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/dating/profile */
async function updateProfile(req, res, next) {
    try {
        const { nickname, gender, bio, customAvatar, contactWechat, contactQq } = req.body;
        const data = {};
        if (nickname !== undefined)
            data.nickname = nickname;
        if (gender !== undefined)
            data.gender = gender;
        if (bio !== undefined)
            data.bio = bio;
        if (customAvatar !== undefined)
            data.customAvatar = customAvatar;
        if (contactWechat !== undefined)
            data.contactWechat = contactWechat;
        if (contactQq !== undefined)
            data.contactQq = contactQq;
        const existing = await database_1.prisma.datingProfile.findUnique({ where: { userId: req.user.userId } });
        let profile;
        if (existing) {
            profile = await database_1.prisma.datingProfile.update({ where: { userId: req.user.userId }, data });
        }
        else {
            data.userId = req.user.userId;
            data.nickname = data.nickname || `匿名用户${req.user.userId}`;
            data.avatarSeed = crypto_1.default.randomBytes(4).toString('hex');
            profile = await database_1.prisma.datingProfile.create({ data });
        }
        return (0, response_1.success)(res, profile);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/dating/posts */
async function getPosts(req, res, next) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = 20;
        const [list, total] = await Promise.all([
            database_1.prisma.datingPost.findMany({
                include: { author: { select: { id: true, userId: true, nickname: true, avatarSeed: true, customAvatar: true } } },
                skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.datingPost.count(),
        ]);
        // 获取所有作者的恋爱关系状态
        const profileIds = [...new Set(list.map(p => p.author.id))];
        const relationships = await database_1.prisma.datingRequest.findMany({
            where: {
                status: 'accepted',
                OR: profileIds.flatMap(pid => [
                    { senderId: pid },
                    { receiverId: pid },
                ]),
            },
            select: { senderId: true, receiverId: true },
        });
        const inRelationship = new Set();
        for (const r of relationships) {
            inRelationship.add(r.senderId);
            inRelationship.add(r.receiverId);
        }
        const data = list.map(p => ({
            ...p,
            images: JSON.parse(p.images || '[]'),
            authorInRelationship: inRelationship.has(p.author.id),
        }));
        return (0, response_1.paginated)(res, data, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/dating/posts */
async function createPost(req, res, next) {
    try {
        const { content, images } = req.body;
        if (!content?.trim())
            return (0, response_1.error)(res, '请输入内容');
        const profile = await ensureProfile(req.user.userId);
        const post = await database_1.prisma.datingPost.create({
            data: { userId: profile.id, content: content.trim(), images: JSON.stringify(images || []) },
        });
        // L2 AI 异步审核（必须在 return 之前）
        (0, moderation_service_1.aiModerate)(content, { contentType: 'dating_post', userId: req.user.userId }).then(result => {
            if (result === 'violation') {
                logger_1.logger.warn(`AI flagged dating post #${post.id}, deleting`);
                database_1.prisma.datingPost.delete({ where: { id: post.id } }).catch(() => { });
            }
        });
        return (0, response_1.success)(res, { ...post, images: JSON.parse(post.images || '[]') }, '发布成功', 201);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/dating/:userId/follow */
async function followUser(req, res, next) {
    try {
        const followerProfile = await ensureProfile(req.user.userId);
        const targetUserId = parseInt(req.params.userId);
        if (isNaN(targetUserId))
            return (0, response_1.error)(res, '无效的用户ID');
        const followingProfile = await database_1.prisma.datingProfile.findUnique({
            where: { userId: targetUserId },
        });
        if (!followingProfile)
            return (0, response_1.error)(res, '对方未创建恋爱资料', 404);
        if (followerProfile.id === followingProfile.id)
            return (0, response_1.error)(res, '不能关注自己');
        await database_1.prisma.datingFollow.upsert({
            where: { followerId_followingId: { followerId: followerProfile.id, followingId: followingProfile.id } },
            create: { followerId: followerProfile.id, followingId: followingProfile.id },
            update: {},
        });
        return (0, response_1.success)(res, null, '关注成功');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/dating/:userId/request — 发起恋爱请求 */
async function sendRequest(req, res, next) {
    try {
        const senderProfile = await ensureProfile(req.user.userId);
        const targetUserId = parseInt(req.params.userId);
        if (isNaN(targetUserId))
            return (0, response_1.error)(res, '无效的用户ID');
        const targetUser = await database_1.prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true },
        });
        if (!targetUser)
            return (0, response_1.error)(res, '用户不存在', 404);
        if (targetUser.id === req.user.userId)
            return (0, response_1.error)(res, '不能给自己发请求');
        const receiverProfile = await database_1.prisma.datingProfile.findUnique({
            where: { userId: targetUser.id },
        });
        if (!receiverProfile)
            return (0, response_1.error)(res, '对方未创建恋爱资料', 404);
        // 检查是否已关注对方
        const isFollowing = await database_1.prisma.datingFollow.findUnique({
            where: { followerId_followingId: { followerId: senderProfile.id, followingId: receiverProfile.id } },
        });
        if (!isFollowing)
            return (0, response_1.error)(res, '请先关注对方');
        // 检查发起方是否已有恋爱对象
        const existingRelationship = await database_1.prisma.datingRequest.findFirst({
            where: {
                status: 'accepted',
                OR: [
                    { senderId: senderProfile.id },
                    { receiverId: senderProfile.id },
                ],
            },
        });
        if (existingRelationship)
            return (0, response_1.error)(res, '你已有恋爱对象，无法发起新请求');
        // 检查对方是否已有恋爱对象
        const receiverRelationship = await database_1.prisma.datingRequest.findFirst({
            where: {
                status: 'accepted',
                OR: [
                    { senderId: receiverProfile.id },
                    { receiverId: receiverProfile.id },
                ],
            },
        });
        if (receiverRelationship)
            return (0, response_1.error)(res, '对方已有恋爱对象');
        // 检查是否有已有请求
        const existing = await database_1.prisma.datingRequest.findUnique({
            where: { senderId_receiverId: { senderId: senderProfile.id, receiverId: receiverProfile.id } },
        });
        if (existing) {
            if (existing.status === 'pending')
                return (0, response_1.error)(res, '已有待处理的恋爱请求');
            if (existing.status === 'rejected')
                return (0, response_1.error)(res, '对方已拒绝，无法再次发起');
        }
        const request = await database_1.prisma.datingRequest.create({
            data: { senderId: senderProfile.id, receiverId: receiverProfile.id },
        });
        // 通知接收方
        (0, notification_service_1.createNotification)({
            userId: targetUser.id,
            type: 'dating_request',
            title: '新的恋爱请求',
            content: `${senderProfile.nickname} 向你发起了恋爱请求`,
            relatedId: request.id,
        }).catch(() => { });
        return (0, response_1.success)(res, request, '恋爱请求已发送', 201);
    }
    catch (err) {
        next(err);
    }
}
/** PATCH /api/dating/requests/:requestId — 接受/拒绝恋爱请求 */
async function handleRequest(req, res, next) {
    try {
        const requestId = parseInt(req.params.requestId);
        if (isNaN(requestId))
            return (0, response_1.error)(res, '无效的请求ID');
        const { status } = req.body;
        if (!['accepted', 'rejected'].includes(status))
            return (0, response_1.error)(res, '无效的状态值');
        const request = await database_1.prisma.datingRequest.findUnique({ where: { id: requestId } });
        if (!request)
            return (0, response_1.error)(res, '请求不存在', 404);
        const myProfile = await database_1.prisma.datingProfile.findUnique({ where: { userId: req.user.userId } });
        if (!myProfile || request.receiverId !== myProfile.id)
            return (0, response_1.error)(res, '无权操作', 403);
        if (request.status !== 'pending')
            return (0, response_1.error)(res, '该请求已处理');
        // 检查接收方是否已有恋爱对象
        if (status === 'accepted') {
            const myRelationship = await database_1.prisma.datingRequest.findFirst({
                where: {
                    status: 'accepted',
                    OR: [
                        { senderId: myProfile.id },
                        { receiverId: myProfile.id },
                    ],
                },
            });
            if (myRelationship)
                return (0, response_1.error)(res, '你已有恋爱对象，无法接受新请求');
        }
        const updated = await database_1.prisma.datingRequest.update({
            where: { id: requestId },
            data: { status },
        });
        // 通知发起方
        const senderProfile = await database_1.prisma.datingProfile.findUnique({ where: { id: request.senderId } });
        if (senderProfile) {
            const isAccepted = status === 'accepted';
            (0, notification_service_1.createNotification)({
                userId: senderProfile.userId,
                type: 'dating_request',
                title: isAccepted ? '恋爱请求已接受' : '恋爱请求已拒绝',
                content: isAccepted
                    ? '对方已接受你的恋爱请求，现在可以查看联系方式了'
                    : '对方拒绝了你的恋爱请求',
                relatedId: requestId,
            }).catch(() => { });
        }
        return (0, response_1.success)(res, updated, status === 'accepted' ? '已接受，双方可查看联系方式' : '已拒绝');
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/dating/requests — 查看我的恋爱请求列表 */
async function getRequests(req, res, next) {
    try {
        const myProfile = await database_1.prisma.datingProfile.findUnique({ where: { userId: req.user.userId } });
        if (!myProfile)
            return (0, response_1.error)(res, '请先创建恋爱资料');
        const [received, sent] = await Promise.all([
            database_1.prisma.datingRequest.findMany({
                where: { receiverId: myProfile.id },
                include: { sender: { select: { id: true, userId: true, nickname: true, avatarSeed: true, customAvatar: true, gender: true, contactWechat: true, contactQq: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.datingRequest.findMany({
                where: { senderId: myProfile.id },
                include: { receiver: { select: { id: true, userId: true, nickname: true, avatarSeed: true, customAvatar: true, gender: true, contactWechat: true, contactQq: true } } },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return (0, response_1.success)(res, {
            received: received.map(r => ({
                ...r,
                sender: {
                    ...r.sender,
                    contactWechat: r.status === 'accepted' ? r.sender.contactWechat : '',
                    contactQq: r.status === 'accepted' ? r.sender.contactQq : '',
                },
            })),
            sent: sent.map(r => ({
                ...r,
                receiver: {
                    ...r.receiver,
                    contactWechat: r.status === 'accepted' ? r.receiver.contactWechat : '',
                    contactQq: r.status === 'accepted' ? r.receiver.contactQq : '',
                },
            })),
        });
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/dating/relationship/:userId — 断开恋爱关系 */
async function breakRelationship(req, res, next) {
    try {
        const myProfile = await database_1.prisma.datingProfile.findUnique({ where: { userId: req.user.userId } });
        if (!myProfile)
            return (0, response_1.error)(res, '请先创建恋爱资料');
        const peerUserId = parseInt(req.params.userId);
        if (isNaN(peerUserId))
            return (0, response_1.error)(res, '无效的用户ID');
        const peerProfile = await database_1.prisma.datingProfile.findUnique({
            where: { userId: peerUserId },
        });
        if (!peerProfile)
            return (0, response_1.error)(res, '对方未创建恋爱资料', 404);
        // 删除双方之间的 accepted 请求
        await database_1.prisma.datingRequest.deleteMany({
            where: {
                status: 'accepted',
                OR: [
                    { senderId: myProfile.id, receiverId: peerProfile.id },
                    { senderId: peerProfile.id, receiverId: myProfile.id },
                ],
            },
        });
        return (0, response_1.success)(res, null, '已断开恋爱关系');
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/dating/:userId/follow — 取消关注 */
async function unfollowUser(req, res, next) {
    try {
        const targetUserId = parseInt(req.params.userId);
        if (isNaN(targetUserId))
            return (0, response_1.error)(res, '无效的用户ID');
        const followerProfile = await ensureProfile(req.user.userId);
        const followingProfile = await ensureProfile(targetUserId);
        await database_1.prisma.datingFollow.deleteMany({
            where: { followerId: followerProfile.id, followingId: followingProfile.id },
        });
        return (0, response_1.success)(res, null, '已取消关注');
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/dating/following — 获取我关注的人的 userId 列表 */
async function getFollowing(req, res, next) {
    try {
        const profile = await database_1.prisma.datingProfile.findUnique({ where: { userId: req.user.userId } });
        if (!profile)
            return (0, response_1.success)(res, []);
        const follows = await database_1.prisma.datingFollow.findMany({
            where: { followerId: profile.id },
            include: { following: { select: { userId: true, nickname: true, avatarSeed: true, customAvatar: true } } },
        });
        return (0, response_1.success)(res, follows.map(f => ({
            userId: f.following.userId,
            nickname: f.following.nickname,
            avatarSeed: f.following.avatarSeed,
            customAvatar: f.following.customAvatar,
        })));
    }
    catch (err) {
        next(err);
    }
}
/** PUT /api/dating/posts/:postId — 编辑恋爱帖子 */
async function updatePost(req, res, next) {
    try {
        const postId = parseInt(req.params.postId);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的帖子ID');
        const post = await database_1.prisma.datingPost.findUnique({ where: { id: postId } });
        if (!post)
            return (0, response_1.error)(res, '帖子不存在', 404);
        const profile = await database_1.prisma.datingProfile.findUnique({ where: { userId: req.user.userId } });
        if (!profile || post.userId !== profile.id)
            return (0, response_1.error)(res, '无权操作', 403);
        const { content } = req.body;
        if (!content?.trim())
            return (0, response_1.error)(res, '请输入内容');
        const updated = await database_1.prisma.datingPost.update({
            where: { id: postId },
            data: { content: content.trim() },
        });
        // L2 AI 异步审核编辑后的内容
        (0, moderation_service_1.aiModerate)(content, { contentType: 'dating_post', userId: req.user.userId }).then(result => {
            if (result === 'violation') {
                logger_1.logger.warn(`AI flagged edited dating post #${postId}, deleting`);
                database_1.prisma.datingPost.delete({ where: { id: postId } }).catch(() => { });
            }
        });
        return (0, response_1.success)(res, updated, '修改成功');
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/dating/posts/:postId — 删除恋爱帖子 */
async function deletePost(req, res, next) {
    try {
        const postId = parseInt(req.params.postId);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的帖子ID');
        const post = await database_1.prisma.datingPost.findUnique({ where: { id: postId } });
        if (!post)
            return (0, response_1.error)(res, '帖子不存在', 404);
        const profile = await database_1.prisma.datingProfile.findUnique({ where: { userId: req.user.userId } });
        if (!profile || post.userId !== profile.id)
            return (0, response_1.error)(res, '无权操作', 403);
        await database_1.prisma.datingPost.delete({ where: { id: postId } });
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=dating.controller.js.map