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
exports.getVideoFeed = getVideoFeed;
exports.getVideoDetail = getVideoDetail;
exports.createVideo = createVideo;
exports.deleteVideo = deleteVideo;
exports.toggleLikeVideo = toggleLikeVideo;
exports.getVideoComments = getVideoComments;
exports.createVideoComment = createVideoComment;
exports.deleteVideoComment = deleteVideoComment;
exports.recordView = recordView;
exports.shareVideo = shareVideo;
exports.getUserVideos = getUserVideos;
exports.searchVideos = searchVideos;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const sensitive_1 = require("../utils/sensitive");
// ==================== 视频流 ====================
/** GET /api/videos/feed — 视频推荐流 */
async function getVideoFeed(req, res, next) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 20);
        const tab = req.query.tab || 'recommend';
        const userId = req.user?.userId;
        const where = {
            isDeleted: false,
            status: 'approved',
        };
        if (tab === 'following' && userId) {
            const followingIds = await database_1.prisma.follow.findMany({
                where: { followerId: userId },
                select: { followingId: true },
            });
            where.userId = { in: followingIds.map(f => f.followingId) };
        }
        // 排序: 推荐=热门衰减, 其它按时间
        let orderBy = { createdAt: 'desc' };
        if (tab === 'recommend') {
            orderBy = [{ isFeatured: 'desc' }, { likeCount: 'desc' }, { createdAt: 'desc' }];
        }
        const [list, total] = await Promise.all([
            database_1.prisma.shortVideo.findMany({
                where,
                include: {
                    user: { select: { id: true, nickname: true, avatarUrl: true } },
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy,
            }),
            database_1.prisma.shortVideo.count({ where }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/videos/:id — 视频详情 */
async function getVideoDetail(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的视频ID');
        const video = await database_1.prisma.shortVideo.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, nickname: true, avatarUrl: true } },
                _count: { select: { likes: true, comments: true } },
            },
        });
        if (!video || video.isDeleted)
            return (0, response_1.notFound)(res, '视频不存在');
        const isOwner = req.user?.userId === video.userId;
        if (!isOwner) {
            database_1.prisma.shortVideo.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => { });
        }
        return (0, response_1.success)(res, {
            ...video,
            likeCount: video._count?.likes || video.likeCount,
            commentCount: video._count?.comments || video.commentCount,
        });
    }
    catch (err) {
        next(err);
    }
}
// ==================== 发布/编辑/删除 ====================
/** POST /api/videos — 发布视频 */
async function createVideo(req, res, next) {
    try {
        const { videoUrl, coverUrl, description, duration, musicTitle, musicArtist, tags } = req.body;
        if (!videoUrl)
            return (0, response_1.error)(res, '请上传视频');
        if (!coverUrl)
            return (0, response_1.error)(res, '请上传封面');
        if (description && (0, sensitive_1.containsSensitive)(description))
            return (0, response_1.error)(res, '描述包含违规内容');
        if (description && description.length > 200)
            return (0, response_1.error)(res, '描述最多200字');
        const video = await database_1.prisma.shortVideo.create({
            data: {
                userId: req.user.userId,
                videoUrl,
                coverUrl,
                description: description || '',
                duration: duration || 0,
                musicTitle: musicTitle || null,
                musicArtist: musicArtist || null,
                status: 'pending',
            },
        });
        // 关联标签
        if (tags && Array.isArray(tags)) {
            for (const tagName of tags.filter(Boolean).slice(0, 5)) {
                await database_1.prisma.videoTag.create({
                    data: { videoId: video.id, tagName },
                }).catch(() => { });
            }
        }
        return (0, response_1.success)(res, video, '已提交审核', 201);
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/videos/:id — 软删除 */
async function deleteVideo(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的视频ID');
        const video = await database_1.prisma.shortVideo.findUnique({ where: { id } });
        if (!video || video.isDeleted)
            return (0, response_1.notFound)(res, '视频不存在');
        if (video.userId !== req.user.userId && req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权操作', 403);
        await database_1.prisma.shortVideo.update({ where: { id }, data: { isDeleted: true } });
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
// ==================== 互动 ====================
/** POST /api/videos/:id/like — 点赞/取消 */
async function toggleLikeVideo(req, res, next) {
    try {
        const videoId = parseInt(req.params.id);
        if (isNaN(videoId))
            return (0, response_1.error)(res, '无效的视频ID');
        const userId = req.user.userId;
        const existing = await database_1.prisma.videoLike.findUnique({ where: { userId_videoId: { userId, videoId } } });
        if (existing) {
            await database_1.prisma.videoLike.delete({ where: { id: existing.id } });
            database_1.prisma.shortVideo.update({ where: { id: videoId }, data: { likeCount: { decrement: 1 } } }).catch(() => { });
            return (0, response_1.success)(res, { liked: false });
        }
        else {
            await database_1.prisma.videoLike.create({ data: { userId, videoId } });
            database_1.prisma.shortVideo.update({ where: { id: videoId }, data: { likeCount: { increment: 1 } } }).catch(() => { });
            return (0, response_1.success)(res, { liked: true });
        }
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/videos/:id/comments — 评论列表 */
async function getVideoComments(req, res, next) {
    try {
        const videoId = parseInt(req.params.id);
        if (isNaN(videoId))
            return (0, response_1.error)(res, '无效的视频ID');
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = 20;
        const [list, total] = await Promise.all([
            database_1.prisma.videoComment.findMany({
                where: { videoId, status: { in: ['approved', 'pending'] } },
                include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.videoComment.count({ where: { videoId } }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/videos/:id/comments — 发表评论 */
async function createVideoComment(req, res, next) {
    try {
        const videoId = parseInt(req.params.id);
        if (isNaN(videoId))
            return (0, response_1.error)(res, '无效的视频ID');
        const { content } = req.body;
        if (!content?.trim())
            return (0, response_1.error)(res, '请输入评论');
        if (content.length > 300)
            return (0, response_1.error)(res, '评论最多300字');
        if ((0, sensitive_1.containsSensitive)(content))
            return (0, response_1.error)(res, '评论包含违规内容');
        const video = await database_1.prisma.shortVideo.findUnique({ where: { id: videoId } });
        if (!video || video.isDeleted)
            return (0, response_1.notFound)(res, '视频不存在');
        const comment = await database_1.prisma.videoComment.create({
            data: { videoId, userId: req.user.userId, content: content.trim(), status: 'pending' },
            include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        });
        database_1.prisma.shortVideo.update({ where: { id: videoId }, data: { commentCount: { increment: 1 } } }).catch(() => { });
        // AI审核
        const { aiModerate } = await Promise.resolve().then(() => __importStar(require('../services/moderation.service')));
        aiModerate(content, { contentType: 'video_comment', userId: req.user.userId }).then(async (result) => {
            if (result === 'violation') {
                database_1.prisma.videoComment.update({ where: { id: comment.id }, data: { status: 'offline' } }).catch(() => { });
            }
            else if (result === 'safe') {
                database_1.prisma.videoComment.update({ where: { id: comment.id }, data: { status: 'approved' } }).catch(() => { });
            }
        });
        return (0, response_1.success)(res, comment, '评论成功', 201);
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/videos/:id/comments/:cid — 删除评论 */
async function deleteVideoComment(req, res, next) {
    try {
        const cid = parseInt(req.params.cid);
        if (isNaN(cid))
            return (0, response_1.error)(res, '无效的评论ID');
        const comment = await database_1.prisma.videoComment.findUnique({ where: { id: cid } });
        if (!comment)
            return (0, response_1.notFound)(res, '评论不存在');
        if (comment.userId !== req.user.userId && req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权操作', 403);
        await database_1.prisma.videoComment.delete({ where: { id: cid } });
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/videos/:id/view — 观看记录 */
async function recordView(req, res, next) {
    try {
        const videoId = parseInt(req.params.id);
        if (isNaN(videoId))
            return (0, response_1.error)(res, '无效的视频ID');
        const userId = req.user.userId;
        await database_1.prisma.videoHistory.upsert({
            where: { userId_videoId: { userId, videoId } },
            create: { userId, videoId, watchDuration: 0, watchedAt: new Date() },
            update: { watchedAt: new Date() },
        });
        return (0, response_1.success)(res, null, 'ok');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/videos/:id/share — 分享计数 */
async function shareVideo(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的视频ID');
        await database_1.prisma.shortVideo.update({ where: { id }, data: { shareCount: { increment: 1 } } });
        return (0, response_1.success)(res, null, 'ok');
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/videos/user/:userId — 用户视频列表 */
async function getUserVideos(req, res, next) {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId))
            return (0, response_1.error)(res, '无效的用户ID');
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = 20;
        const [list, total] = await Promise.all([
            database_1.prisma.shortVideo.findMany({
                where: { userId, isDeleted: false, status: 'approved' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.shortVideo.count({ where: { userId, isDeleted: false, status: 'approved' } }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/videos/search — 视频搜索 */
async function searchVideos(req, res, next) {
    try {
        const keyword = (req.query.keyword || '').trim();
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = 10;
        const where = { isDeleted: false, status: 'approved' };
        if (keyword) {
            where.description = { contains: keyword };
        }
        const [list, total] = await Promise.all([
            database_1.prisma.shortVideo.findMany({
                where,
                include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { likeCount: 'desc' },
            }),
            database_1.prisma.shortVideo.count({ where }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=videos.controller.js.map