"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCartList = getCartList;
exports.addToCart = addToCart;
exports.removeFromCart = removeFromCart;
exports.getCartCount = getCartCount;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
// GET /api/cart — 购物车列表
async function getCartList(req, res, next) {
    try {
        const list = await database_1.prisma.cartItem.findMany({
            where: { userId: req.user.userId },
            include: {
                goods: {
                    include: {
                        user: { select: { id: true, nickname: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const data = list
            .filter(item => item.goods && !item.goods.isDeleted)
            .map(item => ({
            id: item.id,
            userId: item.userId,
            goodsId: item.goodsId,
            createdAt: item.createdAt.toISOString(),
            goods: {
                id: item.goods.id,
                title: item.goods.title,
                price: item.goods.price,
                condition: item.goods.condition,
                images: JSON.parse(item.goods.images || '[]'),
                status: item.goods.status,
                unavailable: item.goods.status !== 'approved',
                user: item.goods.user,
            },
        }));
        return (0, response_1.success)(res, data);
    }
    catch (err) {
        next(err);
    }
}
/**
 * POST /api/cart — 加入购物车
 *
 * 防重复层级：
 * L1: Prisma @@unique([userId, goodsId]) 数据库约束
 * L2: 先查后插 (findUnique → 已存在则返回提示)
 */
async function addToCart(req, res, next) {
    try {
        const { goodsId } = req.body;
        if (!goodsId)
            return (0, response_1.error)(res, '缺少goodsId');
        const goods = await database_1.prisma.goods.findUnique({ where: { id: goodsId } });
        if (!goods || goods.isDeleted)
            return (0, response_1.notFound)(res, '商品不存在');
        if (goods.status === 'sold')
            return (0, response_1.error)(res, '该商品已售出');
        if (goods.userId === req.user.userId)
            return (0, response_1.error)(res, '不能添加自己的商品');
        const exist = await database_1.prisma.cartItem.findUnique({
            where: { userId_goodsId: { userId: req.user.userId, goodsId } },
        });
        if (exist)
            return (0, response_1.success)(res, null, '已在购物车中');
        const item = await database_1.prisma.cartItem.create({
            data: { userId: req.user.userId, goodsId },
        });
        return (0, response_1.success)(res, item, '已加入购物车');
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/cart/:id — 移除购物车
async function removeFromCart(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.notFound)(res);
        const item = await database_1.prisma.cartItem.findUnique({ where: { id } });
        if (!item)
            return (0, response_1.notFound)(res);
        if (item.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        await database_1.prisma.cartItem.delete({ where: { id } });
        return (0, response_1.success)(res, null, '已移除');
    }
    catch (err) {
        next(err);
    }
}
// GET /api/cart/count — 购物车数量
async function getCartCount(req, res, next) {
    try {
        const count = await database_1.prisma.cartItem.count({ where: { userId: req.user.userId } });
        return (0, response_1.success)(res, { count });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=cart.controller.js.map