"use strict";
/**
 * 笔记 Service 层 — 纯业务逻辑，不依赖 req/res
 *
 * 设计原则:
 * - 所有方法接收明确的参数，返回 Promise<结果>
 * - 不处理 HTTP 状态码/响应格式（由 Controller 负责）
 * - 使用 Prisma 推导类型，禁止 any
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNotes = findNotes;
exports.findNoteDetail = findNoteDetail;
exports.createNote = createNote;
exports.updateNote = updateNote;
exports.deleteNote = deleteNote;
exports.getLikeStatus = getLikeStatus;
exports.toggleLike = toggleLike;
exports.saveNote = saveNote;
exports.unsaveNote = unsaveNote;
exports.incrementShare = incrementShare;
const database_1 = require("../config/database");
const notification_service_1 = require("./notification.service");
const view_counter_service_1 = require("./view-counter.service");
// ─── 查询构建器 ───
function buildWhere(input) {
    const where = {
        isDeleted: false,
        status: { in: ['approved', 'pending'] },
    };
    if (input.postType) {
        where.postType = input.postType;
    }
    if (input.tag) {
        where.tags = { some: { tag: { name: input.tag } } };
    }
    return where;
}
function buildOrderBy(sort) {
    switch (sort) {
        case 'hot':
            return { likeCount: 'desc' };
        case 'recommend':
            return [{ isFeatured: 'desc' }, { likeCount: 'desc' }];
        default:
            return { createdAt: 'desc' };
    }
}
// ─── 数据标准化 ───
function parseImages(images) {
    if (typeof images === 'string') {
        try {
            return JSON.parse(images);
        }
        catch {
            return [];
        }
    }
    if (Array.isArray(images))
        return images;
    return [];
}
/** 标准化笔记列表项 */
function mapNoteListItem(raw) {
    return {
        ...raw,
        images: parseImages(raw.images),
        tags: Array.isArray(raw.tags) ? raw.tags.map(t => ({ id: t.tag?.id, name: t.tag?.name })) : [],
    };
}
// ─── 笔记 CRUD ───
/** 分页获取笔记列表 */
async function findNotes(params) {
    const { page, pageSize, sort, postType, tag } = params;
    const where = buildWhere({ postType, tag });
    const orderBy = buildOrderBy(sort);
    const [list, total] = await Promise.all([
        database_1.prisma.post.findMany({
            where,
            include: {
                user: { select: { id: true, nickname: true, avatarUrl: true } },
                tags: { include: { tag: { select: { id: true, name: true } } } },
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy,
        }),
        database_1.prisma.post.count({ where }),
    ]);
    return { list: list.map(mapNoteListItem), total };
}
/** 获取笔记详情 */
async function findNoteDetail(id, viewerUserId) {
    const post = await database_1.prisma.post.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, nickname: true, avatarUrl: true, bio: true } },
            tags: { include: { tag: { select: { id: true, name: true } } } },
            _count: { select: { likes: true, saves: true, comments: true } },
        },
    });
    if (!post || post.isDeleted)
        return null;
    const isOwner = viewerUserId != null && viewerUserId === post.userId;
    // 浏览量去重（非作者）
    if (!isOwner) {
        const viewKey = `note:${id}:${viewerUserId ?? 'anon'}`;
        if (view_counter_service_1.viewCounter.shouldCount(viewKey)) {
            database_1.prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {
                // 静默处理浏览量更新失败（不影响主流程）
            });
        }
    }
    // 关联推荐（同 tag）
    const tagIds = post.tags?.map(t => t.tag.id) ?? [];
    let related = [];
    if (tagIds.length > 0) {
        related = await database_1.prisma.post.findMany({
            where: {
                id: { not: id },
                isDeleted: false,
                status: 'approved',
                tags: { some: { tagId: { in: tagIds } } },
            },
            select: {
                id: true,
                title: true,
                images: true,
                likeCount: true,
                postType: true,
                videoCover: true,
                coverIndex: true,
                user: { select: { id: true, nickname: true, avatarUrl: true } },
            },
            take: 6,
            orderBy: { likeCount: 'desc' },
        });
    }
    return {
        ...post,
        images: parseImages(post.images),
        tags: post.tags?.map(t => ({ id: t.tag.id, name: t.tag.name })),
        likeCount: post._count?.likes ?? post.likeCount ?? 0,
        commentCount: post._count?.comments ?? post.commentCount ?? 0,
        saveCount: post._count?.saves ?? post.saveCount ?? 0,
        related,
    };
}
/** 创建笔记 */
async function createNote(input) {
    const { userId, title, content, images, postType, videoUrl, videoCover, videoDuration, location, tags } = input;
    const note = await database_1.prisma.post.create({
        data: {
            userId,
            title: title.trim(),
            content: content ?? '',
            images: JSON.stringify(images ?? []),
            postType: postType ?? 'note',
            videoUrl: videoUrl ?? null,
            videoCover: videoCover ?? null,
            videoDuration: videoDuration ?? null,
            location: location ?? null,
            status: 'pending',
        },
    });
    // 关联标签
    if (tags && tags.length > 0) {
        await associateTags(note.id, tags);
    }
    return note;
}
/** 更新笔记 */
async function updateNote(input) {
    const { id, userId, title, content, images, postType, location, tags } = input;
    // 所有权校验
    const existing = await database_1.prisma.post.findUnique({ where: { id }, select: { userId: true, isDeleted: true } });
    if (!existing || existing.isDeleted)
        return 'not_found';
    if (existing.userId !== userId)
        return 'forbidden';
    const updated = await database_1.prisma.post.update({
        where: { id },
        data: {
            ...(title !== undefined && { title: title.trim() }),
            ...(content !== undefined && { content }),
            ...(images !== undefined && { images: JSON.stringify(images) }),
            ...(postType !== undefined && { postType }),
            ...(location !== undefined && { location }),
            updatedAt: new Date(),
        },
    });
    // 更新标签
    if (tags) {
        await database_1.prisma.postTag.deleteMany({ where: { postId: id } });
        await associateTags(id, tags);
    }
    return updated;
}
/** 软删除笔记 */
async function deleteNote(id, userId, role) {
    const existing = await database_1.prisma.post.findUnique({ where: { id }, select: { userId: true, isDeleted: true } });
    if (!existing || existing.isDeleted)
        return 'not_found';
    if (existing.userId !== userId && role !== 'admin')
        return 'forbidden';
    await Promise.all([
        database_1.prisma.post.update({ where: { id }, data: { isDeleted: true } }),
        database_1.prisma.notification.deleteMany({
            where: { relatedId: id, type: { in: ['new_comment', 'post_like'] } },
        }),
    ]);
    return 'deleted';
}
// ─── 互动 ───
/** 查询点赞状态 */
async function getLikeStatus(postId, userId) {
    const existing = await database_1.prisma.postLike.findUnique({
        where: { userId_postId: { userId, postId } },
    });
    return { liked: !!existing };
}
/** 切换点赞（点赞 ↔ 取消） */
async function toggleLike(postId, userId, username) {
    const existing = await database_1.prisma.postLike.findUnique({
        where: { userId_postId: { userId, postId } },
    });
    if (existing) {
        // 取消点赞
        await Promise.all([
            database_1.prisma.postLike.delete({ where: { id: existing.id } }),
            database_1.prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
        ]);
        return { liked: false };
    }
    // 点赞
    await Promise.all([
        database_1.prisma.postLike.create({ data: { userId, postId } }),
        database_1.prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
    // 通知笔记作者
    const note = await database_1.prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true, title: true },
    });
    if (note && note.userId !== userId) {
        (0, notification_service_1.createNotification)({
            userId: note.userId,
            type: 'post_like',
            title: '有人赞了你的笔记',
            content: `${username} 赞了"${note.title?.slice(0, 30)}"`,
            relatedId: postId,
        }).catch(() => {
            // 通知失败不影响主流程
        });
    }
    return { liked: true };
}
/** 收藏笔记 */
async function saveNote(postId, userId, collectionId) {
    const existing = await database_1.prisma.postSave.findUnique({
        where: { userId_postId: { userId, postId } },
    });
    if (existing)
        return 'already_saved';
    await database_1.prisma.postSave.create({
        data: { userId, postId, collectionId: collectionId ?? null },
    });
    database_1.prisma.post.update({ where: { id: postId }, data: { saveCount: { increment: 1 } } }).catch(() => { });
    return 'saved';
}
/** 取消收藏 */
async function unsaveNote(postId, userId) {
    const save = await database_1.prisma.postSave.findUnique({
        where: { userId_postId: { userId, postId } },
    });
    if (!save)
        return 'not_saved';
    await database_1.prisma.postSave.delete({ where: { id: save.id } });
    database_1.prisma.post.update({ where: { id: postId }, data: { saveCount: { decrement: 1 } } }).catch(() => { });
    return 'unsaved';
}
/** 分享计数 +1 */
async function incrementShare(postId) {
    await database_1.prisma.post.update({ where: { id: postId }, data: { shareCount: { increment: 1 } } });
}
// ─── 标签工具 ───
async function associateTags(postId, tagNames) {
    const valid = tagNames.filter(Boolean).slice(0, 5);
    for (const name of valid) {
        const tag = await database_1.prisma.topicTag.upsert({
            where: { name },
            update: { postCount: { increment: 1 } },
            create: { name },
        });
        await database_1.prisma.postTag.create({
            data: { postId, tagId: tag.id },
        }).catch(() => { });
    }
}
//# sourceMappingURL=notes.service.js.map