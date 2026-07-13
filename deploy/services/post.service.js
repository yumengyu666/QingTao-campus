"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePostImages = normalizePostImages;
exports.findPostList = findPostList;
exports.findPostById = findPostById;
exports.createPost = createPost;
exports.updatePost = updatePost;
exports.softDeletePost = softDeletePost;
exports.incrementPostView = incrementPostView;
exports.findPostComments = findPostComments;
exports.createPostComment = createPostComment;
exports.deletePostComment = deletePostComment;
exports.findPostCommentById = findPostCommentById;
exports.findPostLike = findPostLike;
exports.togglePostLike = togglePostLike;
exports.incrementCommentLike = incrementCommentLike;
const database_1 = require("../config/database");
// ─── 公共工具 ───
/** 标准化图片格式 */
function normalizePostImages(raw) {
    return Array.isArray(raw) ? raw : JSON.parse(typeof raw === 'string' ? raw : '[]');
}
/** 帖子列表常用 include */
const POST_INCLUDE = {
    user: { select: { id: true, nickname: true, avatarUrl: true } },
};
/** 评论常用 include */
const COMMENT_INCLUDE = {
    user: { select: { id: true, nickname: true, avatarUrl: true } },
};
// ─── 帖子 CRUD ───
async function findPostList(params) {
    const { keyword, sort, page, pageSize } = params;
    const where = { isDeleted: false, status: { in: ['approved', 'pending'] } };
    if (keyword) {
        where.OR = [
            { title: { contains: keyword } },
            { content: { contains: keyword } },
        ];
    }
    const orderBy = sort === 'hot' ? { viewCount: 'desc' } : { createdAt: 'desc' };
    const [list, total] = await Promise.all([
        database_1.prisma.post.findMany({ where, include: POST_INCLUDE, skip: (page - 1) * pageSize, take: pageSize, orderBy }),
        database_1.prisma.post.count({ where }),
    ]);
    return { list: list.map(p => ({ ...p, images: normalizePostImages(p.images) })), total };
}
async function findPostById(id) {
    return database_1.prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
}
async function createPost(data) {
    return database_1.prisma.post.create({
        data: {
            userId: data.userId,
            title: data.title,
            content: data.content || '',
            images: JSON.stringify(data.images || []),
            status: 'pending',
        },
    });
}
async function updatePost(id, data) {
    return database_1.prisma.post.update({
        where: { id },
        data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.content !== undefined && { content: data.content }),
            ...(data.images !== undefined && { images: JSON.stringify(data.images) }),
            reviewComment: '',
            updatedAt: new Date(),
        },
    });
}
async function softDeletePost(id) {
    await database_1.prisma.post.update({ where: { id }, data: { isDeleted: true } });
    await database_1.prisma.notification.deleteMany({ where: { relatedId: id } });
}
/** 增量浏览量（IP去重需在Controller层维护Map） */
async function incrementPostView(id) {
    await database_1.prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });
}
// ─── 评论 CRUD ───
async function findPostComments(postId, currentUserId, page = 1, pageSize = 20) {
    const where = { postId };
    if (currentUserId) {
        where.OR = [{ status: 'approved' }, { userId: currentUserId }];
    }
    else {
        where.status = 'approved';
    }
    return Promise.all([
        database_1.prisma.postComment.findMany({ where, include: COMMENT_INCLUDE, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
        database_1.prisma.postComment.count({ where }),
    ]);
}
async function createPostComment(postId, userId, content) {
    return database_1.prisma.postComment.create({
        data: { postId, userId, content, status: 'pending' },
        include: COMMENT_INCLUDE,
    });
}
async function deletePostComment(commentId) {
    return database_1.prisma.postComment.delete({ where: { id: commentId } });
}
async function findPostCommentById(commentId) {
    return database_1.prisma.postComment.findUnique({ where: { id: commentId } });
}
// ─── 点赞 ───
/** 查询用户是否已点赞该帖子 */
async function findPostLike(postId, userId) {
    return database_1.prisma.postLike.findUnique({ where: { userId_postId: { userId, postId } } });
}
/** 切换帖子点赞状态，返回 { liked, likeCount } */
async function togglePostLike(postId, userId) {
    const existing = await findPostLike(postId, userId);
    if (existing) {
        await Promise.all([
            database_1.prisma.postLike.delete({ where: { id: existing.id } }),
            database_1.prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
        ]);
        return { liked: false, likeCount: undefined };
    }
    await Promise.all([
        database_1.prisma.postLike.create({ data: { userId, postId } }),
        database_1.prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
    const post = await database_1.prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } });
    return { liked: true, likeCount: post?.likeCount };
}
/** 简易评论点赞（仅计数，不作用户去重） */
async function incrementCommentLike(commentId) {
    await database_1.prisma.postComment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } });
}
//# sourceMappingURL=post.service.js.map