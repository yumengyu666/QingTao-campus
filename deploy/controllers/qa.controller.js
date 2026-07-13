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
exports.getList = getList;
exports.createPost = createPost;
exports.getDetail = getDetail;
exports.createAnswer = createAnswer;
exports.toggleVote = toggleVote;
exports.markBest = markBest;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const moderation_service_1 = require("../services/moderation.service");
const notification_service_1 = require("../services/notification.service");
const logger_1 = require("../utils/logger");
/** GET /api/qa */
async function getList(req, res, next) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = 20;
        const category = req.query.category;
        const type = req.query.type;
        const sort = req.query.sort;
        const userId = req.query.userId ? parseInt(req.query.userId) : undefined;
        const where = { isDeleted: false };
        if (category)
            where.category = category;
        if (type)
            where.type = type;
        if (userId)
            where.userId = userId;
        const orderBy = sort === 'hot' ? { viewCount: 'desc' } : { createdAt: 'desc' };
        const [list, total] = await Promise.all([
            database_1.prisma.qaPost.findMany({
                where,
                include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
                skip: (page - 1) * pageSize, take: pageSize, orderBy,
            }),
            database_1.prisma.qaPost.count({ where }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/qa */
async function createPost(req, res, next) {
    try {
        const { title, content, category, type, images } = req.body;
        if (!title?.trim())
            return (0, response_1.error)(res, '请输入标题');
        if (title.length > 100)
            return (0, response_1.error)(res, '标题最多100字');
        if (content?.length > 2000)
            return (0, response_1.error)(res, '内容最多2000字');
        // 校验 category 和 type
        const VALID_CATEGORIES = ['study', 'life', 'tech', 'other'];
        const VALID_TYPES = ['question', 'discussion', 'share'];
        const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'other';
        const safeType = VALID_TYPES.includes(type) ? type : 'question';
        // L1 敏感词检测
        const { containsSensitive } = await Promise.resolve().then(() => __importStar(require('../utils/sensitive')));
        if (containsSensitive(title))
            return (0, response_1.error)(res, '标题包含违规内容');
        if (content && containsSensitive(content))
            return (0, response_1.error)(res, '内容包含违规内容');
        const post = await database_1.prisma.qaPost.create({
            data: {
                userId: req.user.userId,
                title: title.trim(),
                content: (content || '').trim().replace(/<[^>]*>/g, ''),
                category: safeCategory,
                type: safeType,
                images: JSON.stringify(images || []),
            },
        });
        // L2 AI 异步审核（必须在 return 之前）
        const text = `${title} ${content}`;
        (0, moderation_service_1.aiModerate)(text, { contentType: 'qa_post', userId: req.user.userId }).then(result => {
            if (result === 'violation') {
                logger_1.logger.warn(`AI flagged Q&A post #${post.id}, soft-deleting`);
                database_1.prisma.qaPost.update({ where: { id: post.id }, data: { isDeleted: true } }).catch(() => { });
            }
        });
        return (0, response_1.success)(res, post, '发布成功', 201);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/qa/:id */
async function getDetail(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的ID');
        const [post, answers] = await Promise.all([
            database_1.prisma.qaPost.findUnique({
                where: { id },
                include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
            }),
            database_1.prisma.qaAnswer.findMany({
                where: { postId: id },
                include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
                orderBy: [{ isBest: 'desc' }, { likeCount: 'desc' }],
            }),
        ]);
        if (!post || post.isDeleted)
            return (0, response_1.notFound)(res, '问题不存在');
        // 浏览量+1（作者本人不增加）
        if (post.userId !== req.user?.userId) {
            await database_1.prisma.qaPost.update({ where: { id }, data: { viewCount: { increment: 1 } } });
        }
        return (0, response_1.success)(res, {
            post: { ...post, images: JSON.parse(post.images || '[]') },
            answers: answers.map(a => ({ ...a, images: JSON.parse(a.images || '[]') })),
        });
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/qa/:id/answers */
async function createAnswer(req, res, next) {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId))
            return (0, response_1.error)(res, '无效的问题ID');
        const { content, images } = req.body;
        if (!content?.trim())
            return (0, response_1.error)(res, '请输入回答内容');
        if (content.length > 2000)
            return (0, response_1.error)(res, '回答最多2000字');
        // L1 敏感词检测
        const { containsSensitive } = await Promise.resolve().then(() => __importStar(require('../utils/sensitive')));
        if (containsSensitive(content))
            return (0, response_1.error)(res, '回答包含违规内容');
        const post = await database_1.prisma.qaPost.findUnique({ where: { id: postId } });
        if (!post)
            return (0, response_1.notFound)(res, '问题不存在');
        const answer = await database_1.prisma.qaAnswer.create({
            data: { postId, userId: req.user.userId, content: content.trim(), images: JSON.stringify(images || []) },
            include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        });
        await database_1.prisma.qaPost.update({ where: { id: postId }, data: { answerCount: { increment: 1 } } });
        // 通知提问者有人回答了问题（自问自答不通知）
        if (post.userId !== req.user.userId) {
            const answerUser = await database_1.prisma.user.findUnique({ where: { id: req.user.userId }, select: { nickname: true } });
            (0, notification_service_1.createNotification)({
                userId: post.userId,
                type: 'qa_answer',
                title: '你的问题有了新回答',
                content: `${answerUser?.nickname || '匿名用户'} 回答了你的问题「${post.title.slice(0, 30)}」`,
                relatedId: answer.id,
                relatedType: 'qa_answer',
            }).catch(() => { });
        }
        // L2 AI 异步审核（必须在 return 之前）
        (0, moderation_service_1.aiModerate)(content, { contentType: 'qa_answer', userId: req.user.userId }).then(result => {
            if (result === 'violation') {
                logger_1.logger.warn(`AI flagged Q&A answer #${answer.id}, deleting`);
                database_1.prisma.qaAnswer.delete({ where: { id: answer.id } }).catch(() => { });
                database_1.prisma.qaPost.update({
                    where: { id: postId },
                    data: { answerCount: { decrement: 1 } },
                }).catch(() => { });
            }
        });
        return (0, response_1.success)(res, { ...answer, images: JSON.parse(answer.images || '[]') }, '', 201);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/qa/answers/:id/vote */
async function toggleVote(req, res, next) {
    try {
        const answerId = parseInt(req.params.id);
        if (isNaN(answerId))
            return (0, response_1.error)(res, '无效的回答ID');
        const userId = req.user.userId;
        const existing = await database_1.prisma.qaVote.findUnique({ where: { answerId_userId: { answerId, userId } } });
        if (existing) {
            await database_1.prisma.$transaction([
                database_1.prisma.qaVote.delete({ where: { id: existing.id } }),
                database_1.prisma.qaAnswer.update({ where: { id: answerId }, data: { likeCount: { decrement: 1 } } }),
            ]);
            return (0, response_1.success)(res, null, '已取消点赞');
        }
        await database_1.prisma.$transaction([
            database_1.prisma.qaVote.create({ data: { answerId, userId } }),
            database_1.prisma.qaAnswer.update({ where: { id: answerId }, data: { likeCount: { increment: 1 } } }),
        ]);
        return (0, response_1.success)(res, null, '点赞成功');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/qa/answers/:id/best */
async function markBest(req, res, next) {
    try {
        const answerId = parseInt(req.params.id);
        if (isNaN(answerId))
            return (0, response_1.error)(res, '无效的回答ID');
        const answer = await database_1.prisma.qaAnswer.findUnique({ where: { id: answerId } });
        if (!answer)
            return (0, response_1.notFound)(res, '回答不存在');
        const post = await database_1.prisma.qaPost.findUnique({ where: { id: answer.postId } });
        if (!post || post.userId !== req.user.userId)
            return (0, response_1.error)(res, '仅提问者可以采纳', 403);
        await database_1.prisma.$transaction([
            database_1.prisma.qaAnswer.updateMany({ where: { postId: answer.postId, isBest: true }, data: { isBest: false } }),
            database_1.prisma.qaAnswer.update({ where: { id: answerId }, data: { isBest: true } }),
            database_1.prisma.qaPost.update({ where: { id: answer.postId }, data: { isResolved: true, bestAnswerId: answerId } }),
        ]);
        // 通知回答者被采纳（自问自答不通知）
        if (answer.userId !== req.user.userId) {
            (0, notification_service_1.createNotification)({
                userId: answer.userId,
                type: 'qa_best',
                title: '你的回答被采纳啦！',
                content: `你的回答被采纳为「${post.title.slice(0, 30)}」的最佳答案`,
                relatedId: answerId,
                relatedType: 'qa_answer',
            }).catch(() => { });
        }
        return (0, response_1.success)(res, null, '已采纳');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=qa.controller.js.map