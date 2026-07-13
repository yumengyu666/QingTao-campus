"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImages = getImages;
exports.approveImage = approveImage;
exports.rejectImage = rejectImage;
exports.batchImageReview = batchImageReview;
exports.getReviewStats = getReviewStats;
exports.checkStatus = checkStatus;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/**
 * GET /api/admin/images?status=pending&page=1 — 图片审核列表
 */
async function getImages(req, res, next) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = 20;
        const status = req.query.status || 'pending';
        const where = { status };
        const [list, total] = await Promise.all([
            database_1.prisma.imageReview.findMany({
                where,
                include: { uploader: { select: { id: true, nickname: true } } },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.imageReview.count({ where }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
const review_service_1 = require("../services/review.service");
/**
 * POST /api/admin/images/:id/approve — 审核通过单张图片
 */
async function approveImage(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的图片ID');
        await (0, review_service_1.approveReview)('image', id, req.user.userId);
        return (0, response_1.success)(res, null, '已通过');
    }
    catch (err) {
        next(err);
    }
}
/**
 * POST /api/admin/images/:id/reject — 审核拒绝单张图片
 */
async function rejectImage(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的图片ID');
        await (0, review_service_1.rejectReview)('image', id, req.user.userId, req.body.reason || '管理员拒绝');
        return (0, response_1.success)(res, null, '已拒绝');
    }
    catch (err) {
        next(err);
    }
}
/**
 * POST /api/admin/images/batch — 批量审核图片
 */
async function batchImageReview(req, res, next) {
    try {
        const { ids, action } = req.body;
        if (!Array.isArray(ids) || ids.length === 0)
            return (0, response_1.error)(res, '请提供图片ID列表');
        if (!['approve', 'reject'].includes(action))
            return (0, response_1.error)(res, '无效的操作');
        if (ids.length > 50)
            return (0, response_1.error)(res, '单次最多50张');
        const adminId = req.user.userId;
        let count = 0;
        for (const id of ids) {
            try {
                if (action === 'approve')
                    await (0, review_service_1.approveReview)('image', id, adminId);
                else
                    await (0, review_service_1.rejectReview)('image', id, adminId, '管理员批量拒绝');
                count++;
            }
            catch { /* skip */ }
        }
        return (0, response_1.success)(res, { processed: count }, `已${action === 'approve' ? '通过' : '拒绝'} ${count} 张`);
    }
    catch (err) {
        next(err);
    }
}
/**
 * GET /api/admin/stats/review — 审核统计
 */
async function getReviewStats(_req, res, next) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [pending, approvedToday, rejectedToday] = await Promise.all([
            database_1.prisma.imageReview.count({ where: { status: 'pending' } }),
            database_1.prisma.imageReview.count({ where: { status: 'approved', createdAt: { gte: today } } }),
            database_1.prisma.imageReview.count({ where: { status: 'rejected', createdAt: { gte: today } } }),
        ]);
        const contentPending = await database_1.prisma.goods.count({ where: { status: 'pending', isDeleted: false } })
            + await database_1.prisma.post.count({ where: { status: 'pending', isDeleted: false } })
            + await database_1.prisma.lostFound.count({ where: { status: 'pending', isDeleted: false } });
        return (0, response_1.success)(res, {
            imagePending: pending,
            imageApprovedToday: approvedToday,
            imageRejectedToday: rejectedToday,
            contentPending,
        });
    }
    catch (err) {
        next(err);
    }
}
/**
 * GET /api/images/status — 批量查询图片审核状态
 */
async function checkStatus(req, res, next) {
    try {
        const idsParam = req.query.ids;
        if (!idsParam)
            return (0, response_1.success)(res, []);
        const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n)).slice(0, 50);
        if (ids.length === 0)
            return (0, response_1.success)(res, []);
        const images = await database_1.prisma.imageReview.findMany({
            where: { id: { in: ids } },
            select: { id: true, url: true, blurredUrl: true, status: true },
        });
        return (0, response_1.success)(res, images);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=images.controller.js.map