"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentViews = getRecentViews;
exports.trackView = trackView;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
// 内存中存储最近浏览（最多保留100条/用户，重启清空）
const viewCache = new Map();
const MAX_VIEWS = 100;
function recordView(userId, goodsId) {
    const views = viewCache.get(userId) || [];
    // 去重：移除同一商品的旧记录
    const filtered = views.filter(v => v.goodsId !== goodsId);
    filtered.unshift({ goodsId, timestamp: Date.now() });
    // 限制数量
    if (filtered.length > MAX_VIEWS)
        filtered.length = MAX_VIEWS;
    viewCache.set(userId, filtered);
}
// GET /api/history/views — 最近浏览
async function getRecentViews(req, res, next) {
    try {
        const userId = req.user.userId;
        const views = viewCache.get(userId) || [];
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const start = (page - 1) * pageSize;
        const paged = views.slice(start, start + pageSize);
        // 批量加载商品信息
        const goodsIds = paged.map(v => v.goodsId);
        const goodsList = goodsIds.length > 0 ? await database_1.prisma.goods.findMany({
            where: { id: { in: goodsIds }, isDeleted: false },
            select: {
                id: true, title: true, price: true, images: true, status: true, viewCount: true,
                campus: true, createdAt: true,
                user: { select: { id: true, nickname: true, avatarUrl: true } },
                category: { select: { name: true } },
            },
        }) : [];
        const goodsMap = new Map(goodsList.map(g => [g.id, g]));
        const data = paged.map(v => ({
            ...v,
            goods: goodsMap.get(v.goodsId) || null,
        })).filter(d => d.goods !== null);
        return (0, response_1.paginated)(res, data, views.length, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/history/views/:goodsId — 记录浏览
async function trackView(req, res, next) {
    try {
        const userId = req.user.userId;
        const goodsId = parseInt(req.params.goodsId);
        if (isNaN(goodsId))
            return (0, response_1.error)(res, '无效的商品ID');
        recordView(userId, goodsId);
        return (0, response_1.success)(res, null, 'ok');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=history.controller.js.map