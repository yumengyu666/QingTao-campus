"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveReview = approveReview;
exports.rejectReview = rejectReview;
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
// 通过审核
async function approveReview(type, id, reviewerId) {
    return database_1.prisma.$transaction(async (tx) => {
        let userId;
        let title;
        switch (type) {
            case 'goods': {
                const item = await tx.goods.update({
                    where: { id },
                    data: { status: 'approved', reviewedBy: reviewerId, reviewComment: '', updatedAt: new Date() },
                });
                userId = item.userId;
                title = item.title;
                break;
            }
            case 'posts': {
                const item = await tx.post.update({
                    where: { id },
                    data: { status: 'approved', reviewedBy: reviewerId, reviewComment: '', updatedAt: new Date() },
                });
                userId = item.userId;
                title = item.title;
                break;
            }
            case 'lostfound': {
                const item = await tx.lostFound.update({
                    where: { id },
                    data: { status: 'approved', reviewedBy: reviewerId, reviewComment: '', updatedAt: new Date() },
                });
                userId = item.userId;
                title = item.title;
                break;
            }
            case 'profile': {
                const change = await tx.profileChange.findUnique({ where: { id } });
                if (!change)
                    throw new Error('ProfileChange not found');
                await tx.user.update({
                    where: { id: change.userId },
                    data: { [change.fieldName]: change.newValue },
                });
                await tx.profileChange.update({
                    where: { id },
                    data: { status: 'approved', reviewedBy: reviewerId, reviewedAt: new Date() },
                });
                userId = change.userId;
                title = change.fieldName;
                break;
            }
            case 'goods_comment': {
                const item = await tx.goodsComment.update({
                    where: { id },
                    data: { status: 'approved', reviewComment: '' },
                });
                userId = item.userId;
                title = item.content.substring(0, 30);
                break;
            }
            case 'post_comment': {
                const item = await tx.postComment.update({
                    where: { id },
                    data: { status: 'approved', reviewComment: '' },
                });
                userId = item.userId;
                title = item.content.substring(0, 30);
                break;
            }
            case 'lostfound_comment': {
                const item = await tx.lostFoundComment.update({
                    where: { id },
                    data: { status: 'approved', reviewComment: '' },
                });
                userId = item.userId;
                title = item.content.substring(0, 30);
                break;
            }
            default:
                throw new Error(`Unknown review type: ${type}`);
        }
        await createReviewNotificationTx(tx, userId, type, title, 'approved', '');
        logger_1.logger.info(`Review APPROVED: type=${type} id=${id} by admin=${reviewerId}`);
        return { id, type, status: 'approved' };
    });
}
// 拒绝审核
async function rejectReview(type, id, reviewerId, reason) {
    return database_1.prisma.$transaction(async (tx) => {
        let userId;
        let title;
        switch (type) {
            case 'goods': {
                const item = await tx.goods.update({
                    where: { id },
                    data: { status: 'rejected', reviewedBy: reviewerId, reviewComment: reason, updatedAt: new Date() },
                });
                userId = item.userId;
                title = item.title;
                break;
            }
            case 'posts': {
                const item = await tx.post.update({
                    where: { id },
                    data: { status: 'rejected', reviewedBy: reviewerId, reviewComment: reason, updatedAt: new Date() },
                });
                userId = item.userId;
                title = item.title;
                break;
            }
            case 'lostfound': {
                const item = await tx.lostFound.update({
                    where: { id },
                    data: { status: 'rejected', reviewedBy: reviewerId, reviewComment: reason, updatedAt: new Date() },
                });
                userId = item.userId;
                title = item.title;
                break;
            }
            case 'profile': {
                const change = await tx.profileChange.update({
                    where: { id },
                    data: { status: 'rejected', reviewedBy: reviewerId, reviewComment: reason, reviewedAt: new Date() },
                });
                userId = change.userId;
                title = change.fieldName;
                break;
            }
            case 'goods_comment': {
                const item = await tx.goodsComment.update({
                    where: { id },
                    data: { status: 'rejected', reviewComment: reason },
                });
                userId = item.userId;
                title = item.content.substring(0, 30);
                break;
            }
            case 'post_comment': {
                const item = await tx.postComment.update({
                    where: { id },
                    data: { status: 'rejected', reviewComment: reason },
                });
                userId = item.userId;
                title = item.content.substring(0, 30);
                break;
            }
            case 'lostfound_comment': {
                const item = await tx.lostFoundComment.update({
                    where: { id },
                    data: { status: 'rejected', reviewComment: reason },
                });
                userId = item.userId;
                title = item.content.substring(0, 30);
                break;
            }
            default:
                throw new Error(`Unknown review type: ${type}`);
        }
        await createReviewNotificationTx(tx, userId, type, title, 'rejected', reason);
        logger_1.logger.info(`Review REJECTED: type=${type} id=${id} by admin=${reviewerId}, reason=${reason}`);
        return { id, type, status: 'rejected' };
    });
}
// 审核通知（事务内版本）
async function createReviewNotificationTx(tx, userId, contentType, itemTitle, result, reason) {
    const labels = {
        goods: '商品',
        posts: '帖子',
        lostfound: '失物招领',
        profile: '个人资料',
        goods_comment: '商品评论',
        post_comment: '帖子评论',
        lostfound_comment: '失物招领评论',
    };
    const label = labels[contentType] || contentType;
    await tx.notification.create({
        data: {
            userId,
            type: 'review_result',
            title: `你的${label}"${itemTitle.substring(0, 30)}"审核${result === 'approved' ? '通过' : '未通过'}`,
            content: result === 'rejected' ? `原因：${reason}` : '',
        },
    });
}
//# sourceMappingURL=review.service.js.map