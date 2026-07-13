"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFavoritesList = getFavoritesList;
exports.addFavorite = addFavorite;
exports.removeFavorite = removeFavorite;
exports.checkFavorite = checkFavorite;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
// GET /api/favorites — 收藏列表
async function getFavoritesList(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 20;
        const [list, total] = await Promise.all([
            database_1.prisma.favorite.findMany({
                where: { userId: req.user.userId },
                include: {
                    goods: {
                        include: {
                            user: { select: { id: true, nickname: true, avatarUrl: true, status: true } },
                        },
                    },
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.favorite.count({ where: { userId: req.user.userId } }),
        ]);
        const data = list.map(f => {
            const g = f.goods;
            const sellerDisabled = g.user?.status === 'disabled';
            return {
                ...g,
                images: JSON.parse(g.images || '[]'),
                favoriteId: f.id,
                favoritedAt: f.createdAt,
                user: sellerDisabled
                    ? { id: g.user.id, nickname: `已注销用户${g.user.id}`, avatarUrl: '' }
                    : g.user,
                _offline: g.isDeleted || sellerDisabled || g.status === 'offline',
                _sold: g.status === 'sold',
            };
        });
        return (0, response_1.paginated)(res, data, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/favorites — 收藏
async function addFavorite(req, res, next) {
    try {
        const { goodsId } = req.body;
        if (!goodsId)
            return (0, response_1.error)(res, '缺少goodsId');
        const goods = await database_1.prisma.goods.findUnique({ where: { id: goodsId } });
        if (!goods || goods.isDeleted)
            return (0, response_1.notFound)(res, '商品不存在');
        if (goods.status === 'sold')
            return (0, response_1.error)(res, '该商品已售出');
        const exist = await database_1.prisma.favorite.findUnique({
            where: { userId_goodsId: { userId: req.user.userId, goodsId } },
        });
        if (exist)
            return (0, response_1.success)(res, null, '已收藏该商品');
        const favorite = await database_1.prisma.favorite.create({
            data: { userId: req.user.userId, goodsId },
        });
        return (0, response_1.success)(res, favorite, '已收藏');
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/favorites/:id — 取消收藏
async function removeFavorite(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const favorite = await database_1.prisma.favorite.findUnique({ where: { id } });
        if (!favorite)
            return (0, response_1.notFound)(res);
        if (favorite.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        await database_1.prisma.favorite.delete({ where: { id } });
        return (0, response_1.success)(res, null, '已取消收藏');
    }
    catch (err) {
        next(err);
    }
}
// GET /api/favorites/check/:goodsId — 检查是否已收藏
async function checkFavorite(req, res, next) {
    try {
        const goodsId = parseInt(req.params.goodsId);
        const exist = await database_1.prisma.favorite.findUnique({
            where: { userId_goodsId: { userId: req.user.userId, goodsId } },
        });
        return (0, response_1.success)(res, { favorited: !!exist });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=favorite.controller.js.map