"use strict";
/**
 * 话题（标签）Service 层 — 话题关注、动态流
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.followTag = followTag;
exports.unfollowTag = unfollowTag;
exports.findFeedByTag = findFeedByTag;
const database_1 = require("../config/database");
// ─── 关注管理 ───
/** 关注话题 */
async function followTag(tagId, userId) {
    await database_1.prisma.tagFollow.upsert({
        where: { userId_tagId: { userId, tagId } },
        update: {},
        create: { userId, tagId },
    });
    database_1.prisma.topicTag
        .update({ where: { id: tagId }, data: { followerCount: { increment: 1 } } })
        .catch(() => { });
}
/** 取消关注话题 */
async function unfollowTag(tagId, userId) {
    const result = await database_1.prisma.tagFollow.deleteMany({
        where: { userId, tagId },
    });
    if (result.count > 0) {
        database_1.prisma.topicTag
            .update({ where: { id: tagId }, data: { followerCount: { decrement: 1 } } })
            .catch(() => { });
    }
}
/** 获取话题动态流 */
async function findFeedByTag(params) {
    const { tagName, page, pageSize = 20 } = params;
    const where = {
        isDeleted: false,
        status: 'approved',
        tags: { some: { tag: { name: tagName } } },
    };
    const [list, total] = await Promise.all([
        database_1.prisma.post.findMany({
            where,
            include: {
                user: { select: { id: true, nickname: true, avatarUrl: true } },
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        }),
        database_1.prisma.post.count({ where }),
    ]);
    return {
        list: list.map(p => ({
            ...p,
            images: JSON.parse(p.images || '[]'),
        })),
        total,
    };
}
//# sourceMappingURL=tag.service.js.map