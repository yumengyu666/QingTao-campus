"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getList = getList;
exports.getDetail = getDetail;
exports.createPost = createPost;
exports.createComment = createComment;
exports.toggleLike = toggleLike;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const sensitive_1 = require("../utils/sensitive");
const moderation_service_1 = require("../services/moderation.service");
const logger_1 = require("../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
/** 生成 4 位 hex 匿名码，如 A3F2 */
function generateCode() {
    const chars = '0123456789ABCDEF';
    const buf = crypto_1.default.randomBytes(4);
    let code = '';
    for (let i = 0; i < 4; i++)
        code += chars[buf[i] % chars.length];
    return code;
}
/** GET /api/treehole — 帖子列表（游客可访问） */
async function getList(req, res, next) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const sort = req.query.sort;
        const orderBy = sort === 'hot' ? { likeCount: 'desc' } : { createdAt: 'desc' };
        const [list, total] = await Promise.all([
            database_1.prisma.treeHolePost.findMany({
                where: { isDeleted: false },
                select: {
                    id: true, code: true, content: true, images: true,
                    likeCount: true, commentCount: true, createdAt: true,
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy,
            }),
            database_1.prisma.treeHolePost.count({ where: { isDeleted: false } }),
        ]);
        const data = list.map(p => ({ ...p, images: JSON.parse(p.images || '[]') }));
        return (0, response_1.paginated)(res, data, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/treehole/:id — 帖子详情 + 评论 */
async function getDetail(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的树洞帖子ID');
        const post = await database_1.prisma.treeHolePost.findUnique({
            where: { id },
            select: {
                id: true, code: true, content: true, images: true, isDeleted: true,
                likeCount: true, commentCount: true, createdAt: true,
            },
        });
        if (!post || post.isDeleted)
            return (0, response_1.error)(res, '帖子不存在', 404);
        const comments = await database_1.prisma.treeHoleComment.findMany({
            where: { postId: id, isDeleted: false },
            select: { id: true, code: true, content: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        return (0, response_1.success)(res, {
            ...post,
            images: JSON.parse(post.images || '[]'),
            comments,
        });
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/treehole — 发帖（游客可访问，后端生成匿名 code） */
async function createPost(req, res, next) {
    try {
        const { content, images } = req.body;
        if (!content?.trim())
            return (0, response_1.error)(res, '请输入内容');
        if (content.length > 1000)
            return (0, response_1.error)(res, '内容最多 1000 字');
        if ((0, sensitive_1.containsSensitive)(content))
            return (0, response_1.error)(res, '内容包含违规信息');
        // IP重复检测：相同IP + 相同内容 5分钟内不重复发布
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const recentDuplicate = await database_1.prisma.treeHolePost.findFirst({
            where: {
                content: content.trim(),
                createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
            },
            select: { id: true },
        });
        if (recentDuplicate)
            return (0, response_1.error)(res, '请勿重复发布相同内容');
        const code = generateCode();
        const post = await database_1.prisma.treeHolePost.create({
            data: {
                code,
                content: content.trim(),
                images: JSON.stringify(images || []),
            },
        });
        // L2 AI 异步审核（必须在 return 之前注册 fire-and-forget）
        (0, moderation_service_1.aiModerate)(content, { contentType: 'treehole', userId: req.user?.userId }).then(result => {
            if (result === 'violation') {
                logger_1.logger.warn(`AI flagged treehole post #${post.id}, marking rejected`);
                database_1.prisma.treeHolePost.update({ where: { id: post.id }, data: { status: 'rejected', isDeleted: true } }).catch(() => { });
            }
        });
        return (0, response_1.success)(res, { ...post, images: JSON.parse(post.images || '[]') }, '发布成功', 201);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/treehole/:id/comments — 评论（游客可访问，后端生成匿名 code） */
async function createComment(req, res, next) {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的树洞帖子ID');
        const { content } = req.body;
        if (!content?.trim())
            return (0, response_1.error)(res, '请输入评论内容');
        if (content.length > 500)
            return (0, response_1.error)(res, '评论最多 500 字');
        if ((0, sensitive_1.containsSensitive)(content))
            return (0, response_1.error)(res, '评论包含违规信息');
        const post = await database_1.prisma.treeHolePost.findUnique({ where: { id: postId } });
        if (!post)
            return (0, response_1.error)(res, '帖子不存在', 404);
        const code = generateCode();
        const [comment] = await database_1.prisma.$transaction([
            database_1.prisma.treeHoleComment.create({
                data: { postId, code, content: content.trim() },
            }),
            database_1.prisma.treeHolePost.update({
                where: { id: postId },
                data: { commentCount: { increment: 1 } },
            }),
        ]);
        // L2 AI 异步审核（必须在 return 之前）
        (0, moderation_service_1.aiModerate)(content, { contentType: 'treehole', userId: req.user?.userId }).then(result => {
            if (result === 'violation') {
                logger_1.logger.warn(`AI flagged treehole comment #${comment.id}, deleting`);
                database_1.prisma.treeHoleComment.update({ where: { id: comment.id }, data: { isDeleted: true } }).catch(() => { });
                database_1.prisma.treeHolePost.update({
                    where: { id: postId },
                    data: { commentCount: { decrement: 1 } },
                }).catch(() => { });
            }
        });
        return (0, response_1.success)(res, comment, '评论成功', 201);
    }
    catch (err) {
        next(err);
    }
}
/**
 * 点赞防刷：数据库持久化（IP + 帖子ID 唯一约束）
 *
 * 防护层级：
 * L1: DB @@unique([clientIp, postId]) — 同一IP对同一帖子只能点赞一次，重启不丢失
 * L2: 取消赞需先有记录 — 防止负数点赞
 * L3: 定时清理30天前旧记录 — 防止表无限增长
 */
/** POST /api/treehole/:id/like — 点赞/取消赞（游客可访问） */
async function toggleLike(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的树洞帖子ID');
        const { action } = req.body;
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const post = await database_1.prisma.treeHolePost.findUnique({ where: { id } });
        if (!post)
            return (0, response_1.error)(res, '帖子不存在', 404);
        if (action === 'like') {
            const exist = await database_1.prisma.treeHoleLike.findUnique({
                where: { clientIp_postId: { clientIp, postId: id } },
            });
            if (exist)
                return (0, response_1.error)(res, '你已经点过赞了');
            await database_1.prisma.$transaction([
                database_1.prisma.treeHoleLike.create({ data: { clientIp, postId: id } }),
                database_1.prisma.treeHolePost.update({ where: { id }, data: { likeCount: { increment: 1 } } }),
            ]);
            return (0, response_1.success)(res, { likeCount: post.likeCount + 1 }, '已点赞');
        }
        if (action === 'unlike') {
            const exist = await database_1.prisma.treeHoleLike.findUnique({
                where: { clientIp_postId: { clientIp, postId: id } },
            });
            if (!exist)
                return (0, response_1.error)(res, '你还没有点赞');
            await database_1.prisma.$transaction([
                database_1.prisma.treeHoleLike.delete({ where: { clientIp_postId: { clientIp, postId: id } } }),
                database_1.prisma.treeHolePost.update({
                    where: { id },
                    data: { likeCount: Math.max(0, post.likeCount - 1) },
                }),
            ]);
            return (0, response_1.success)(res, { likeCount: Math.max(0, post.likeCount - 1) }, '已取消赞');
        }
        return (0, response_1.error)(res, 'action 必须为 like 或 unlike');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=treehole.controller.js.map