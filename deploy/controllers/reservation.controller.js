"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReservation = createReservation;
exports.getMyReservations = getMyReservations;
exports.acceptReservation = acceptReservation;
exports.rejectReservation = rejectReservation;
exports.cancelReservation = cancelReservation;
exports.expireReservations = expireReservations;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const notification_service_1 = require("../services/notification.service");
const logger_1 = require("../utils/logger");
const RESERVATION_TTL_HOURS = 24;
/** POST /api/reservations — 买家预约看货 */
async function createReservation(req, res, next) {
    try {
        const buyerId = req.user.userId;
        const { goodsId, message } = req.body;
        if (!goodsId)
            return (0, response_1.error)(res, '请指定商品');
        const goods = await database_1.prisma.goods.findUnique({ where: { id: goodsId } });
        if (!goods || goods.isDeleted)
            return (0, response_1.error)(res, '商品不存在', 404);
        if (goods.userId === buyerId)
            return (0, response_1.error)(res, '不能预约自己的商品');
        if (goods.status !== 'approved')
            return (0, response_1.error)(res, '该商品当前不可预约');
        // 检查是否已有预约
        const exist = await database_1.prisma.reservation.findUnique({
            where: { goodsId_buyerId: { goodsId, buyerId } },
        });
        if (exist) {
            if (exist.status === 'pending')
                return (0, response_1.error)(res, '你已预约过该商品，请等待卖家回复');
            if (exist.status === 'accepted')
                return (0, response_1.error)(res, '卖家已接受你的预约');
        }
        const expiresAt = new Date(Date.now() + RESERVATION_TTL_HOURS * 60 * 60 * 1000);
        const reservation = await database_1.prisma.reservation.create({
            data: {
                goodsId,
                buyerId,
                sellerId: goods.userId,
                message: message?.trim()?.slice(0, 200) || '想约时间看看实物',
                expiresAt,
            },
        });
        // 通知卖家
        (0, notification_service_1.createNotification)({
            userId: goods.userId,
            type: 'reservation',
            title: '新的预约看货请求',
            content: `有人想预约看你的商品「${goods.title.slice(0, 20)}」`,
            relatedId: reservation.id,
        }).catch(() => { });
        return (0, response_1.success)(res, reservation, '预约成功，等待卖家确认', 201);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/reservations — 我的预约列表（买家+卖家） */
async function getMyReservations(req, res, next) {
    try {
        const userId = req.user.userId;
        const role = req.query.role; // 'buyer' | 'seller'
        const status = req.query.status;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const where = {};
        if (role === 'buyer')
            where.buyerId = userId;
        else if (role === 'seller')
            where.sellerId = userId;
        else
            where.OR = [{ buyerId: userId }, { sellerId: userId }];
        if (status)
            where.status = status;
        const [list, total] = await Promise.all([
            database_1.prisma.reservation.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.reservation.count({ where }),
        ]);
        // 批量查关联数据
        const goodsIds = [...new Set(list.map(r => r.goodsId))];
        const userIds = [...new Set([...list.map(r => r.buyerId), ...list.map(r => r.sellerId)])];
        const [goodsMap, userMap] = await Promise.all([
            database_1.prisma.goods.findMany({ where: { id: { in: goodsIds } }, select: { id: true, title: true, price: true, images: true, status: true } }).then(rows => new Map(rows.map(g => [g.id, g]))),
            database_1.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, avatarUrl: true } }).then(rows => new Map(rows.map(u => [u.id, u]))),
        ]);
        const data = list.map(r => ({
            ...r,
            goods: goodsMap.get(r.goodsId) || null,
            buyer: userMap.get(r.buyerId) || null,
            seller: userMap.get(r.sellerId) || null,
        }));
        return (0, response_1.paginated)(res, data, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** PATCH /api/reservations/:id/accept — 卖家接受预约 */
async function acceptReservation(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的预约ID');
        const reservation = await database_1.prisma.reservation.findUnique({ where: { id } });
        if (!reservation)
            return (0, response_1.error)(res, '预约不存在', 404);
        if (reservation.sellerId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (reservation.status !== 'pending')
            return (0, response_1.error)(res, '该预约已处理');
        const updated = await database_1.prisma.reservation.update({
            where: { id },
            data: { status: 'accepted' },
        });
        // 商品标记为已预定
        await database_1.prisma.goods.update({
            where: { id: reservation.goodsId },
            data: { status: 'reserved' },
        });
        // 通知买家
        (0, notification_service_1.createNotification)({
            userId: reservation.buyerId,
            type: 'reservation',
            title: '预约已被接受',
            content: '卖家已接受你的预约看货请求，请通过私信联系',
            relatedId: id,
        }).catch(() => { });
        return (0, response_1.success)(res, updated, '已接受预约');
    }
    catch (err) {
        next(err);
    }
}
/** PATCH /api/reservations/:id/reject — 卖家拒绝预约 */
async function rejectReservation(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的预约ID');
        const reservation = await database_1.prisma.reservation.findUnique({ where: { id } });
        if (!reservation)
            return (0, response_1.error)(res, '预约不存在', 404);
        if (reservation.sellerId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (reservation.status !== 'pending')
            return (0, response_1.error)(res, '该预约已处理');
        const updated = await database_1.prisma.reservation.update({
            where: { id },
            data: { status: 'rejected' },
        });
        (0, notification_service_1.createNotification)({
            userId: reservation.buyerId,
            type: 'reservation',
            title: '预约已被拒绝',
            content: '卖家暂时无法接受你的预约，去看看其他商品吧',
            relatedId: id,
        }).catch(() => { });
        return (0, response_1.success)(res, updated, '已拒绝');
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/reservations/:id — 买家取消预约 */
async function cancelReservation(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的预约ID');
        const reservation = await database_1.prisma.reservation.findUnique({ where: { id } });
        if (!reservation)
            return (0, response_1.error)(res, '预约不存在', 404);
        if (reservation.buyerId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (!['pending', 'accepted'].includes(reservation.status))
            return (0, response_1.error)(res, '该预约不可取消');
        const updated = await database_1.prisma.reservation.update({
            where: { id },
            data: { status: 'cancelled' },
        });
        // 如果已被接受，取消预约后恢复商品状态
        if (reservation.status === 'accepted') {
            await database_1.prisma.goods.update({
                where: { id: reservation.goodsId },
                data: { status: 'approved' },
            });
        }
        return (0, response_1.success)(res, updated, '已取消');
    }
    catch (err) {
        next(err);
    }
}
/** 定时任务：释放过期预约 */
async function expireReservations() {
    const result = await database_1.prisma.reservation.updateMany({
        where: {
            status: 'pending',
            expiresAt: { lt: new Date() },
        },
        data: { status: 'expired' },
    });
    if (result.count > 0) {
        logger_1.logger.info(`Reservation expire: ${result.count} expired`);
    }
}
//# sourceMappingURL=reservation.controller.js.map