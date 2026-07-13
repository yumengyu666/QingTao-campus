"use strict";
/**
 * 收藏夹 Service 层 — 收藏夹 CRUD + 收藏夹内笔记列表
 *
 * 设计原则:
 * - 所有权校验内置于 Service 方法
 * - 返回值使用 discriminated union，避免 Controller 判断字符串
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCollections = findCollections;
exports.createCollection = createCollection;
exports.updateCollection = updateCollection;
exports.deleteCollection = deleteCollection;
exports.findCollectionNotes = findCollectionNotes;
const database_1 = require("../config/database");
// ─── CRUD ───
/** 获取用户收藏夹列表 */
async function findCollections(params) {
    const collections = await database_1.prisma.postCollection.findMany({
        where: { userId: params.userId },
        include: { _count: { select: { saves: true } } },
        orderBy: { updatedAt: 'desc' },
    });
    return collections.map(c => ({
        ...c,
        postCount: c._count?.saves ?? c.postCount,
    }));
}
/** 创建收藏夹 */
async function createCollection(input) {
    const col = await database_1.prisma.postCollection.create({
        data: {
            userId: input.userId,
            name: input.name.trim(),
            isPublic: input.isPublic !== false,
            coverUrl: input.coverUrl ?? null,
        },
    });
    return col;
}
/** 更新收藏夹 */
async function updateCollection(input) {
    const col = await database_1.prisma.postCollection.findUnique({ where: { id: input.id } });
    if (!col)
        return 'not_found';
    if (col.userId !== input.userId)
        return 'forbidden';
    const updated = await database_1.prisma.postCollection.update({
        where: { id: input.id },
        data: {
            ...(input.name !== undefined && { name: input.name.trim() }),
            ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
            ...(input.coverUrl !== undefined && { coverUrl: input.coverUrl }),
            updatedAt: new Date(),
        },
    });
    return { status: 'ok', data: updated };
}
/** 删除收藏夹 */
async function deleteCollection(id, userId) {
    const col = await database_1.prisma.postCollection.findUnique({ where: { id } });
    if (!col)
        return 'not_found';
    if (col.userId !== userId)
        return 'forbidden';
    await database_1.prisma.postCollection.delete({ where: { id } });
    return 'deleted';
}
/** 获取收藏夹内笔记 */
async function findCollectionNotes(params) {
    const { collectionId, page, pageSize } = params;
    const [notes, total] = await Promise.all([
        database_1.prisma.postSave.findMany({
            where: { collectionId },
            include: {
                post: {
                    include: {
                        user: { select: { id: true, nickname: true, avatarUrl: true } },
                    },
                },
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        }),
        database_1.prisma.postSave.count({ where: { collectionId } }),
    ]);
    return { list: notes.map(s => s.post), total };
}
//# sourceMappingURL=collection.service.js.map