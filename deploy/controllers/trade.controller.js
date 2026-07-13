"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntent = createIntent;
exports.getMyIntents = getMyIntents;
exports.acceptIntent = acceptIntent;
exports.rejectIntent = rejectIntent;
exports.completeTrade = completeTrade;
exports.submitReview = submitReview;
exports.getUserReviews = getUserReviews;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const notification_service_1 = require("../services/notification.service");
/** POST /api/trades/intent — 买家表达购买意向 */
async function createIntent(req, res, next) {
    try {
        const buyerId = req.user.userId;
        const { goodsId, message } = req.body;
        if (!goodsId)
            return (0, response_1.error)(res, '请指定商品');
        const goods = await database_1.prisma.goods.findUnique({ where: { id: goodsId } });
        if (!goods)
            return (0, response_1.error)(res, '商品不存在', 404);
        if (goods.status === 'sold' || goods.status === 'offline')
            return (0, response_1.error)(res, '该商品已售出');
        if (goods.userId === buyerId)
            return (0, response_1.error)(res, '不能对自己发布的商品发送意向');
        if (goods.isDeleted)
            return (0, response_1.error)(res, '商品已删除');
        // 检查是否已经发送过意向
        const existing = await database_1.prisma.tradeIntent.findUnique({
            where: { goodsId_buyerId: { goodsId, buyerId } },
        });
        if (existing)
            return (0, response_1.error)(res, '你已经发送过购买意向，请耐心等待卖家回复');
        const intent = await database_1.prisma.tradeIntent.create({
            data: {
                goodsId,
                buyerId,
                sellerId: goods.userId,
                message: message?.trim()?.slice(0, 200) || '',
            },
        });
        // 通知卖家
        const buyer = await database_1.prisma.user.findUnique({ where: { id: buyerId }, select: { nickname: true } });
        (0, notification_service_1.createNotification)({
            userId: goods.userId,
            type: 'trade_intent',
            title: '新的购买意向',
            content: `${buyer?.nickname || '有用户'} 对你的商品「${goods.title.slice(0, 30)}」表达了购买意向`,
            relatedId: intent.id,
        }).catch(() => { });
        return (0, response_1.success)(res, intent, '意向已发送', 201);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/trades/intents — 我的交易意向列表 */
async function getMyIntents(req, res, next) {
    try {
        const userId = req.user.userId;
        const role = String(req.query.role || ''); // 'buyer' | 'seller'
        const statusFilter = String(req.query.status || '');
        const page = Math.max(parseInt(String(req.query.page || '1')), 1);
        const pageSize = Math.min(parseInt(String(req.query.pageSize || '20')), 50);
        const where = {};
        if (role === 'seller') {
            where.sellerId = userId;
        }
        else {
            // 默认查看作为买家的意向；'buyer'明确查买家
            where.buyerId = userId;
        }
        if (statusFilter)
            where.status = statusFilter;
        const [list, total] = await Promise.all([
            database_1.prisma.tradeIntent.findMany({
                where,
                include: {
                    goods: { select: { id: true, title: true, price: true, images: true, status: true } },
                    buyer: { select: { id: true, nickname: true, avatarUrl: true } },
                    seller: { select: { id: true, nickname: true, avatarUrl: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            database_1.prisma.tradeIntent.count({ where }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** PUT /api/trades/:id/accept — 卖家接受意向 */
async function acceptIntent(req, res, next) {
    try {
        const sellerId = req.user.userId;
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的意向ID');
        const intent = await database_1.prisma.tradeIntent.findUnique({ where: { id } });
        if (!intent)
            return (0, response_1.error)(res, '意向不存在', 404);
        if (intent.sellerId !== sellerId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (intent.status !== 'pending')
            return (0, response_1.error)(res, '该意向已被处理');
        await database_1.prisma.$transaction([
            database_1.prisma.tradeIntent.update({ where: { id }, data: { status: 'accepted' } }),
            database_1.prisma.goods.update({ where: { id: intent.goodsId }, data: { status: 'reserved' } }),
        ]);
        (0, notification_service_1.createNotification)({
            userId: intent.buyerId,
            type: 'trade_accepted',
            title: '卖家已接受你的购买意向',
            content: '请通过私信与卖家沟通见面交易时间和地点',
            relatedId: intent.id,
        }).catch(() => { });
        return (0, response_1.success)(res, null, '已接受意向，请与买家沟通交易细节');
    }
    catch (err) {
        next(err);
    }
}
/** PUT /api/trades/:id/reject — 卖家拒绝意向 */
async function rejectIntent(req, res, next) {
    try {
        const sellerId = req.user.userId;
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的意向ID');
        const intent = await database_1.prisma.tradeIntent.findUnique({ where: { id } });
        if (!intent)
            return (0, response_1.error)(res, '意向不存在', 404);
        if (intent.sellerId !== sellerId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (intent.status !== 'pending')
            return (0, response_1.error)(res, '该意向已被处理');
        await database_1.prisma.tradeIntent.update({ where: { id }, data: { status: 'rejected' } });
        (0, notification_service_1.createNotification)({
            userId: intent.buyerId,
            type: 'trade_rejected',
            title: '卖家拒绝了你的购买意向',
            content: '商品可能已被其他人预定，去看看其他商品吧',
            relatedId: intent.id,
        }).catch(() => { });
        return (0, response_1.success)(res, null, '已拒绝');
    }
    catch (err) {
        next(err);
    }
}
/** PUT /api/trades/:id/complete — 卖家标记交易完成 */
async function completeTrade(req, res, next) {
    try {
        const sellerId = req.user.userId;
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的意向ID');
        const intent = await database_1.prisma.tradeIntent.findUnique({ where: { id } });
        if (!intent)
            return (0, response_1.error)(res, '意向不存在', 404);
        if (intent.sellerId !== sellerId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (intent.status !== 'accepted')
            return (0, response_1.error)(res, '只有已接受的意向才能标记完成');
        await database_1.prisma.$transaction([
            database_1.prisma.tradeIntent.update({ where: { id }, data: { status: 'completed' } }),
            database_1.prisma.goods.update({ where: { id: intent.goodsId }, data: { status: 'sold' } }),
        ]);
        (0, notification_service_1.createNotification)({
            userId: intent.buyerId,
            type: 'trade_completed',
            title: '交易完成，请评价',
            content: '请对你的交易体验进行评价，帮助其他同学了解卖家信誉',
            relatedId: intent.id,
        }).catch(() => { });
        return (0, response_1.success)(res, null, '交易已完成，等待双方互评');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/trades/:id/review — 提交交易评价 */
async function submitReview(req, res, next) {
    try {
        const reviewerId = req.user.userId;
        const id = parseInt(req.params.id);
        const { rating, comment } = req.body;
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的意向ID');
        if (!rating || rating < 1 || rating > 5)
            return (0, response_1.error)(res, '评分需在1-5之间');
        const intent = await database_1.prisma.tradeIntent.findUnique({ where: { id } });
        if (!intent)
            return (0, response_1.error)(res, '交易不存在', 404);
        if (intent.status !== 'completed')
            return (0, response_1.error)(res, '交易未完成，无法评价');
        if (intent.buyerId !== reviewerId && intent.sellerId !== reviewerId) {
            return (0, response_1.error)(res, '无权评价', 403);
        }
        // 判断评价方向
        const isBuyer = intent.buyerId === reviewerId;
        if ((isBuyer && intent.buyerRated) || (!isBuyer && intent.sellerRated)) {
            return (0, response_1.error)(res, '你已经评价过了');
        }
        const targetId = isBuyer ? intent.sellerId : intent.buyerId;
        const safeComment = (comment || '').trim().slice(0, 300);
        await database_1.prisma.$transaction([
            database_1.prisma.tradeReview.create({
                data: { tradeId: id, reviewerId, targetId, rating, comment: safeComment },
            }),
            database_1.prisma.tradeIntent.update({
                where: { id },
                data: isBuyer ? { buyerRated: true } : { sellerRated: true },
            }),
        ]);
        // 通知被评价方
        const reviewer = await database_1.prisma.user.findUnique({ where: { id: reviewerId }, select: { nickname: true } });
        (0, notification_service_1.createNotification)({
            userId: targetId,
            type: 'new_review',
            title: '收到新评价',
            content: `${reviewer?.nickname || '对方'} 给你打了 ${rating} 星${safeComment ? '：' + safeComment.slice(0, 50) : ''}`,
            relatedId: id,
        }).catch(() => { });
        return (0, response_1.success)(res, null, '评价成功', 201);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/users/:userId/reviews — 查看用户收到的评价 */
async function getUserReviews(req, res, next) {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId))
            return (0, response_1.error)(res, '无效的用户ID');
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const [list, total, stats] = await Promise.all([
            database_1.prisma.tradeReview.findMany({
                where: { targetId: userId },
                include: {
                    reviewer: { select: { id: true, nickname: true, avatarUrl: true } },
                    trade: { select: { goods: { select: { id: true, title: true } } } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            database_1.prisma.tradeReview.count({ where: { targetId: userId } }),
            database_1.prisma.tradeReview.aggregate({
                where: { targetId: userId },
                _avg: { rating: true },
                _count: true,
            }),
        ]);
        return (0, response_1.success)(res, {
            list: list.map(r => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                reviewer: r.reviewer,
                goodsTitle: r.trade?.goods?.title || '',
                createdAt: r.createdAt,
            })),
            total,
            page,
            pageSize,
            avgRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
            totalReviews: stats._count,
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=trade.controller.js.map