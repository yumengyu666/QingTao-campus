"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposeBarter = proposeBarter;
exports.getProposals = getProposals;
exports.acceptBarter = acceptBarter;
exports.rejectBarter = rejectBarter;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const notification_service_1 = require("../services/notification.service");
/** POST /api/barter — 发起物品交换提议 */
async function proposeBarter(req, res, next) {
    try {
        const fromUserId = req.user.userId;
        const { fromGoodsId, toGoodsId, message } = req.body;
        if (!fromGoodsId || !toGoodsId)
            return (0, response_1.error)(res, '请选择交换的物品');
        if (fromGoodsId === toGoodsId)
            return (0, response_1.error)(res, '不能用自己的物品交换自己的物品');
        const [fromGoods, toGoods] = await Promise.all([
            database_1.prisma.goods.findUnique({ where: { id: fromGoodsId } }),
            database_1.prisma.goods.findUnique({ where: { id: toGoodsId } }),
        ]);
        if (!fromGoods || fromGoods.userId !== fromUserId)
            return (0, response_1.error)(res, '你的物品不存在', 404);
        if (!toGoods)
            return (0, response_1.error)(res, '目标物品不存在', 404);
        const exist = await database_1.prisma.barterProposal.findUnique({
            where: { fromGoodsId_toGoodsId: { fromGoodsId, toGoodsId } },
        });
        if (exist)
            return (0, response_1.error)(res, '已发送过交换提议');
        const proposal = await database_1.prisma.barterProposal.create({
            data: { fromGoodsId, toGoodsId, fromUserId, toUserId: toGoods.userId, message: message?.slice(0, 200) || '' },
        });
        (0, notification_service_1.createNotification)({
            userId: toGoods.userId,
            type: 'barter',
            title: '新的物品交换提议',
            content: `有人想用「${fromGoods.title.slice(0, 15)}」换你的「${toGoods.title.slice(0, 15)}」`,
            relatedId: proposal.id,
        }).catch(() => { });
        return (0, response_1.success)(res, proposal, '交换提议已发送', 201);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/barter — 我的交换提议列表 */
async function getProposals(req, res, next) {
    try {
        const userId = req.user.userId;
        const role = req.query.role;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = 20;
        const where = {};
        if (role === 'sent')
            where.fromUserId = userId;
        else if (role === 'received')
            where.toUserId = userId;
        else
            where.OR = [{ fromUserId: userId }, { toUserId: userId }];
        const [list, total] = await Promise.all([
            database_1.prisma.barterProposal.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
            database_1.prisma.barterProposal.count({ where }),
        ]);
        // 批量查关联数据
        const goodsIds = [...new Set([...list.map(p => p.fromGoodsId), ...list.map(p => p.toGoodsId)])];
        const userIds = [...new Set([...list.map(p => p.fromUserId), ...list.map(p => p.toUserId)])];
        const [goodsMap, userMap] = await Promise.all([
            database_1.prisma.goods.findMany({ where: { id: { in: goodsIds } }, select: { id: true, title: true, price: true, images: true } }).then(r => new Map(r.map(g => [g.id, g]))),
            database_1.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true } }).then(r => new Map(r.map(u => [u.id, u]))),
        ]);
        return (0, response_1.paginated)(res, list.map(p => ({
            ...p, fromGoods: goodsMap.get(p.fromGoodsId), toGoods: goodsMap.get(p.toGoodsId),
            fromUser: userMap.get(p.fromUserId), toUser: userMap.get(p.toUserId),
        })), total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** PATCH /api/barter/:id/accept */
async function acceptBarter(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效ID');
        const p = await database_1.prisma.barterProposal.findUnique({ where: { id } });
        if (!p)
            return (0, response_1.error)(res, '不存在', 404);
        if (p.toUserId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (p.status !== 'pending')
            return (0, response_1.error)(res, '已处理');
        const updated = await database_1.prisma.barterProposal.update({ where: { id }, data: { status: 'accepted' } });
        (0, notification_service_1.createNotification)({ userId: p.fromUserId, type: 'barter', title: '交换提议已接受', content: '对方同意了你的物品交换提议', relatedId: id }).catch(() => { });
        return (0, response_1.success)(res, updated, '已接受');
    }
    catch (err) {
        next(err);
    }
}
/** PATCH /api/barter/:id/reject */
async function rejectBarter(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效ID');
        const p = await database_1.prisma.barterProposal.findUnique({ where: { id } });
        if (!p)
            return (0, response_1.error)(res, '不存在', 404);
        if (p.toUserId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        const updated = await database_1.prisma.barterProposal.update({ where: { id }, data: { status: 'rejected' } });
        (0, notification_service_1.createNotification)({ userId: p.fromUserId, type: 'barter', title: '交换提议被拒绝', content: '对方拒绝了你的物品交换提议', relatedId: id }).catch(() => { });
        return (0, response_1.success)(res, updated, '已拒绝');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=barter.controller.js.map