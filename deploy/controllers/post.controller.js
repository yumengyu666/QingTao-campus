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
exports.getPostList = getPostList;
exports.createPost = createPost;
exports.getPostDetail = getPostDetail;
exports.updatePost = updatePost;
exports.deletePost = deletePost;
exports.getPostComments = getPostComments;
exports.createPostComment = createPostComment;
exports.deletePostComment = deletePostComment;
exports.togglePostLike = togglePostLike;
exports.toggleCommentLike = toggleCommentLike;
const response_1 = require("../utils/response");
const sensitive_1 = require("../utils/sensitive");
const notification_service_1 = require("../services/notification.service");
const images_1 = require("../utils/images");
const postSvc = __importStar(require("../services/post.service"));
const viewDedup = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [k, t] of viewDedup) {
        if (now - t > 30 * 60 * 1000)
            viewDedup.delete(k);
    }
}, 10 * 60 * 1000).unref();
// GET /api/posts
async function getPostList(req, res, next) {
    try {
        const q = req.query;
        const page = parseInt(q.page) || 1;
        const pageSize = Math.min(parseInt(q.pageSize) || 20, 50);
        const { list, total } = await postSvc.findPostList({ keyword: q.keyword, sort: q.sort, page, pageSize });
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/posts
async function createPost(req, res, next) {
    try {
        const { title, content, images } = req.body;
        if ((0, sensitive_1.containsSensitive)(title))
            return (0, response_1.error)(res, '标题包含违规内容');
        if (content && (0, sensitive_1.containsSensitive)(content))
            return (0, response_1.error)(res, '内容包含违规内容');
        const post = await postSvc.createPost({ userId: req.user.userId, title: title.trim(), content: content || '', images: images || [] });
        await (0, images_1.linkImageReviews)(images, 'posts', post.id);
        const { afterCreate } = await Promise.resolve().then(() => __importStar(require('../middleware/moderation.middleware')));
        afterCreate('post', post.id, req.user.userId, [{ field: 'title', text: title }, { field: 'content', text: content || '' }]);
        return (0, response_1.success)(res, post, '已提交审核，通过后将公开展示', 201);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/posts/:id
async function getPostDetail(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的帖子ID');
        const post = await postSvc.findPostById(id);
        if (!post)
            return (0, response_1.notFound)(res, '帖子不存在');
        const isOwner = req.user?.userId === post.userId;
        const isAdmin = req.user?.role === 'admin';
        if (post.isDeleted && !isOwner && !isAdmin)
            return (0, response_1.notFound)(res, '帖子不存在');
        if (!isOwner && !isAdmin && !['approved'].includes(post.status))
            return (0, response_1.notFound)(res, '帖子不存在');
        if (!isOwner) {
            const viewerIp = req.ip || req.socket.remoteAddress || 'unknown';
            const viewKey = `post:${id}:${viewerIp}`;
            if (!viewDedup.has(viewKey)) {
                viewDedup.set(viewKey, Date.now());
                await postSvc.incrementPostView(id);
            }
        }
        let isLiked = false;
        if (req.user?.userId) {
            const likeRecord = await postSvc.findPostLike(post.id, req.user.userId);
            isLiked = !!likeRecord;
        }
        return (0, response_1.success)(res, { ...post, images: postSvc.normalizePostImages(post.images), isLiked });
    }
    catch (err) {
        next(err);
    }
}
// PUT /api/posts/:id
async function updatePost(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const post = await postSvc.findPostById(id);
        if (!post || post.isDeleted)
            return (0, response_1.notFound)(res, '帖子不存在');
        if (post.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        const { title, content, images } = req.body;
        if (title && (0, sensitive_1.containsSensitive)(title))
            return (0, response_1.error)(res, '标题包含违规内容');
        const updated = await postSvc.updatePost(id, req.body);
        const text = [updated.title, updated.content].filter(Boolean).join(' ');
        if (text) {
            const { afterCreate } = await Promise.resolve().then(() => __importStar(require('../middleware/moderation.middleware')));
            afterCreate('post', updated.id, req.user.userId, [{ field: 'title', text: updated.title }, { field: 'content', text: updated.content || '' }]);
        }
        return (0, response_1.success)(res, updated, '修改成功');
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/posts/:id
async function deletePost(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const post = await postSvc.findPostById(id);
        if (!post || post.isDeleted)
            return (0, response_1.notFound)(res, '帖子不存在');
        if (post.userId !== req.user.userId && req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权操作', 403);
        await postSvc.softDeletePost(id);
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
// GET /api/posts/:id/comments
async function getPostComments(req, res, next) {
    try {
        const postId = parseInt(req.params.id);
        const post = await postSvc.findPostById(postId);
        if (!post || post.isDeleted)
            return (0, response_1.notFound)(res, '帖子不存在');
        const page = parseInt(req.query.page) || 1;
        const [list, total] = await postSvc.findPostComments(postId, req.user?.userId, page);
        const commentsWithLike = list.map(c => ({ ...c, isLiked: false })); // 简易点赞模式，无用户去重
        return (0, response_1.paginated)(res, commentsWithLike, total, page, 20);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/posts/:id/comments
async function createPostComment(req, res, next) {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的帖子ID');
        const { content } = req.body;
        if ((0, sensitive_1.containsSensitive)(content))
            return (0, response_1.error)(res, '评论包含违规内容');
        const post = await postSvc.findPostById(postId);
        if (!post || post.isDeleted)
            return (0, response_1.notFound)(res, '帖子不存在');
        const comment = await postSvc.createPostComment(postId, req.user.userId, content.trim());
        if (post.userId !== req.user.userId) {
            (0, notification_service_1.createNotification)({ userId: post.userId, type: 'new_comment', title: `有人评论了"${post.title}"`, content: `${req.user.username} 评论：${content.trim().substring(0, 50)}`, relatedId: postId }).catch(() => { });
        }
        const { aiModerate } = await Promise.resolve().then(() => __importStar(require('../services/moderation.service')));
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        aiModerate(content, { contentType: 'post_comment', userId: req.user.userId }).then(result => {
            if (result === 'violation')
                prisma.postComment.update({ where: { id: comment.id }, data: { status: 'offline' } }).catch(() => { });
            else if (result === 'safe')
                prisma.postComment.update({ where: { id: comment.id }, data: { status: 'approved' } }).catch(() => { });
        });
        return (0, response_1.success)(res, comment, '评论成功', 201);
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/posts/:id/comments/:commentId
async function deletePostComment(req, res, next) {
    try {
        const commentId = parseInt(req.params.commentId);
        if (isNaN(commentId))
            return (0, response_1.error)(res, '无效的评论ID');
        const comment = await postSvc.findPostCommentById(commentId);
        if (!comment)
            return (0, response_1.notFound)(res, '评论不存在');
        if (comment.userId !== req.user.userId && req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权操作', 403);
        await postSvc.deletePostComment(commentId);
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
// POST /api/posts/:id/like
async function togglePostLike(req, res, next) {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的帖子ID');
        const post = await postSvc.findPostById(postId);
        if (!post || post.isDeleted)
            return (0, response_1.notFound)(res, '帖子不存在');
        const { liked, likeCount } = await postSvc.togglePostLike(postId, req.user.userId);
        return (0, response_1.success)(res, { liked, likeCount }, liked ? '已点赞' : '已取消点赞');
    }
    catch (err) {
        next(err);
    }
}
// POST /api/posts/:id/comments/:commentId/like
async function toggleCommentLike(req, res, next) {
    try {
        const commentId = parseInt(req.params.commentId);
        if (isNaN(commentId))
            return (0, response_1.error)(res, '无效的评论ID');
        const comment = await postSvc.findPostCommentById(commentId);
        if (!comment)
            return (0, response_1.notFound)(res, '评论不存在');
        await postSvc.incrementCommentLike(commentId);
        return (0, response_1.success)(res, { likeCount: comment.likeCount + 1 }, '已点赞');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=post.controller.js.map