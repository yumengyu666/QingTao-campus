"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLostFoundList = findLostFoundList;
exports.findLostFoundById = findLostFoundById;
exports.createLostFound = createLostFound;
exports.updateLostFound = updateLostFound;
exports.softDeleteLostFound = softDeleteLostFound;
exports.resolveLostFound = resolveLostFound;
exports.incrementLostFoundView = incrementLostFoundView;
exports.findLostFoundComments = findLostFoundComments;
exports.createLostFoundComment = createLostFoundComment;
exports.deleteLostFoundComment = deleteLostFoundComment;
exports.findLostFoundCommentById = findLostFoundCommentById;
const database_1 = require("../config/database");
const LF_INCLUDE = {
    user: { select: { id: true, nickname: true, avatarUrl: true } },
};
const LFC_INCLUDE = {
    user: { select: { id: true, nickname: true, avatarUrl: true } },
};
async function findLostFoundList(params) {
    const { type, campusArea, status, keyword, page, pageSize } = params;
    const where = { isDeleted: false };
    if (status)
        where.status = status;
    else
        where.status = { in: ['pending', 'resolved'] };
    if (type)
        where.type = type;
    if (campusArea)
        where.campus = campusArea;
    if (keyword) {
        where.OR = [{ title: { contains: keyword } }, { description: { contains: keyword } }];
    }
    const [list, total] = await Promise.all([
        database_1.prisma.lostFound.findMany({ where, include: LF_INCLUDE, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
        database_1.prisma.lostFound.count({ where }),
    ]);
    return { list: list.map(l => ({ ...l, images: JSON.parse(l.images || '[]') })), total };
}
async function findLostFoundById(id) {
    return database_1.prisma.lostFound.findUnique({ where: { id }, include: LF_INCLUDE });
}
async function createLostFound(data) {
    return database_1.prisma.lostFound.create({
        data: {
            userId: data.userId,
            title: data.title,
            description: data.description || '',
            type: data.type,
            campus: data.campusArea, // API用 campusArea → Prisma用 campus
            location: data.location || '',
            lostTime: data.lostTime || '',
            reward: data.reward || '',
            contactWechat: data.wechat || '', // API用 wechat → Prisma用 contactWechat
            contactQq: data.qq || '', // API用 qq → Prisma用 contactQq
            images: JSON.stringify(data.images || []),
            status: 'pending',
        },
    });
}
async function updateLostFound(id, data) {
    if (data.images)
        data.images = JSON.stringify(data.images);
    return database_1.prisma.lostFound.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
    });
}
async function softDeleteLostFound(id) {
    await database_1.prisma.lostFound.update({ where: { id }, data: { isDeleted: true } });
    await database_1.prisma.notification.deleteMany({ where: { relatedId: id } });
}
async function resolveLostFound(id) {
    return database_1.prisma.lostFound.update({ where: { id }, data: { status: 'resolved' } });
}
async function incrementLostFoundView(id) {
    return database_1.prisma.lostFound.update({ where: { id }, data: { viewCount: { increment: 1 } } });
}
// ─── 评论 ───
async function findLostFoundComments(itemId, currentUserId, page = 1, pageSize = 20) {
    const where = { lostFoundId: itemId };
    if (currentUserId) {
        where.OR = [{ status: 'approved' }, { userId: currentUserId }];
    }
    else {
        where.status = 'approved';
    }
    return Promise.all([
        database_1.prisma.lostFoundComment.findMany({ where, include: LFC_INCLUDE, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
        database_1.prisma.lostFoundComment.count({ where }),
    ]);
}
async function createLostFoundComment(itemId, userId, content) {
    return database_1.prisma.lostFoundComment.create({
        data: { lostFoundId: itemId, userId, content, status: 'pending' },
        include: LFC_INCLUDE,
    });
}
async function deleteLostFoundComment(commentId) {
    return database_1.prisma.lostFoundComment.delete({ where: { id: commentId } });
}
async function findLostFoundCommentById(commentId) {
    return database_1.prisma.lostFoundComment.findUnique({ where: { id: commentId } });
}
//# sourceMappingURL=lostfound.service.js.map