"use strict";
/**
 * 商品 Service 层 — 纯业务逻辑，不依赖 req/res
 *
 * 设计原则:
 * - 所有方法接收明确的参数，返回 Promise<结果>
 * - 不处理 HTTP 状态码/响应格式（由 Controller 负责）
 * - 使用 Prisma 推导类型，禁止 any
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeImages = normalizeImages;
exports.normalizeSeller = normalizeSeller;
exports.mapGoodsListItem = mapGoodsListItem;
exports.findGoodsList = findGoodsList;
exports.findHotGoods = findHotGoods;
exports.findGoodsById = findGoodsById;
exports.createGoods = createGoods;
exports.softDeleteGoods = softDeleteGoods;
exports.markGoodsSold = markGoodsSold;
exports.updateGoodsStatus = updateGoodsStatus;
exports.findRelatedGoods = findRelatedGoods;
exports.findGoodsComments = findGoodsComments;
exports.createGoodsComment = createGoodsComment;
exports.incrementViewCount = incrementViewCount;
const database_1 = require("../config/database");
const cache_service_1 = require("./cache.service");
const notification_service_1 = require("./notification.service");
// ─── 公共工具 ───
/** 标准化图片格式 */
function normalizeImages(raw) {
    const arr = Array.isArray(raw) ? raw : JSON.parse(typeof raw === 'string' ? raw : '[]');
    return arr.map((img) => {
        if (typeof img === 'string')
            return { url: img, blurredUrl: img, reviewId: 0, pending: false };
        const obj = img;
        return {
            url: obj.url || '',
            blurredUrl: obj.blurredUrl || obj.url || '',
            reviewId: obj.reviewId || 0,
            pending: false,
        };
    });
}
/** 标准化用户展示（已注销/已封禁处理） */
function normalizeSeller(user) {
    if (!user)
        return null;
    const deleted = user.status === 'disabled' || user.nickname?.startsWith('已注销');
    if (deleted)
        return { id: user.id, nickname: `已注销用户${user.id}`, avatarUrl: '' };
    return user;
}
/** 标准化商品列表项 */
function mapGoodsListItem(g) {
    const images = normalizeImages(g.images);
    return {
        ...g,
        images,
        categoryName: g.category?.name || '未分类',
        categoryIcon: g.category?.icon || '📦',
        category: undefined,
        user: normalizeSeller(g.user ?? null),
    };
}
async function findGoodsList(params) {
    const { categoryId, listType, status, campus, condition, priceMin, priceMax, keyword, sort, order, page, pageSize } = params;
    const where = { isDeleted: false };
    if (status) {
        where.status = status;
    }
    else {
        where.status = { in: ['approved', 'sold', 'pending'] };
    }
    if (categoryId)
        where.categoryId = categoryId;
    if (listType)
        where.listType = listType;
    if (campus)
        where.campus = campus;
    if (condition) {
        const conditions = condition.split(',').filter(c => ['brand_new', 'like_new', 'used', 'worn'].includes(c));
        if (conditions.length === 1)
            where.condition = conditions[0];
        else if (conditions.length > 1)
            where.condition = { in: conditions };
    }
    if (priceMin || priceMax) {
        where.price = {};
        if (priceMin)
            where.price.gte = priceMin;
        if (priceMax)
            where.price.lte = priceMax;
    }
    if (keyword) {
        where.OR = [
            { title: { contains: keyword } },
            { description: { contains: keyword } },
        ];
    }
    const allowedSorts = ['created_at', 'price', 'view_count'];
    const safeSort = allowedSorts.includes(sort || '') ? sort : 'created_at';
    let orderBy = { createdAt: 'desc' };
    if (safeSort === 'price')
        orderBy = { price: order === 'asc' ? 'asc' : 'desc' };
    if (safeSort === 'view_count')
        orderBy = { viewCount: 'desc' };
    const [list, total] = await Promise.all([
        database_1.prisma.goods.findMany({
            where,
            include: { category: { select: { name: true, icon: true } }, user: { select: { id: true, nickname: true, avatarUrl: true, status: true } } },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy,
        }),
        database_1.prisma.goods.count({ where }),
    ]);
    return { list: list.map(mapGoodsListItem), total };
}
async function findHotGoods(categoryId, campus, page = 1, pageSize = 10) {
    const where = { isDeleted: false, status: { in: ['approved', 'pending'] } };
    if (categoryId)
        where.categoryId = categoryId;
    if (campus)
        where.campus = campus;
    const HOT_POOL = 200;
    const [list, total] = await Promise.all([
        database_1.prisma.goods.findMany({
            where,
            include: { category: { select: { name: true, icon: true } }, user: { select: { id: true, nickname: true, avatarUrl: true, status: true } } },
            orderBy: { viewCount: 'desc' },
            take: HOT_POOL,
        }),
        database_1.prisma.goods.count({ where }),
    ]);
    const now = Date.now();
    const sorted = list
        .map(g => {
        const ageDays = (now - new Date(g.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return { ...g, _hotScore: (g.viewCount || 0) / Math.max(1, Math.pow(ageDays, 1.5)) };
    })
        .sort((a, b) => b._hotScore - a._hotScore);
    const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
    const { _hotScore: _, ...clean } = paged[0] ?? {};
    return { list: paged.map(({ _hotScore: __, ...g }) => mapGoodsListItem(g)), total };
}
async function findGoodsById(id) {
    return database_1.prisma.goods.findUnique({
        where: { id },
        include: { category: { select: { name: true, icon: true } }, user: { select: { id: true, nickname: true, avatarUrl: true, wechat: true, qq: true, status: true } } },
    });
}
async function createGoods(data) {
    return database_1.prisma.goods.create({
        data: {
            userId: data.userId,
            categoryId: data.categoryId,
            title: data.title,
            description: data.description || '',
            price: data.price,
            originalPrice: data.originalPrice ?? null,
            listType: data.listType || 'sale',
            deposit: data.deposit ?? null,
            rentStart: data.rentStart ?? null,
            rentEnd: data.rentEnd ?? null,
            condition: data.condition || 'used',
            images: JSON.stringify(data.images || []),
            campus: data.campus || 'kexue',
            campusLocation: data.campusLocation || '',
            status: 'pending',
        },
    });
}
async function softDeleteGoods(id) {
    await database_1.prisma.goods.update({ where: { id }, data: { isDeleted: true } });
    cache_service_1.goodsCache.delete(String(id));
    await Promise.all([
        database_1.prisma.favorite.deleteMany({ where: { goodsId: id } }),
        database_1.prisma.notification.deleteMany({ where: { relatedId: id } }),
    ]);
}
async function markGoodsSold(id, userId) {
    const [favoriters, recentChatters] = await Promise.all([
        database_1.prisma.favorite.findMany({ where: { goodsId: id }, select: { userId: true } }),
        database_1.prisma.chatMessage.findMany({
            where: { receiverId: userId },
            select: { senderId: true },
            distinct: ['senderId'],
            take: 20,
        }),
    ]);
    await database_1.prisma.$transaction([
        database_1.prisma.goods.update({ where: { id }, data: { status: 'sold' } }),
        database_1.prisma.cartItem.deleteMany({ where: { goodsId: id } }),
        database_1.prisma.favorite.deleteMany({ where: { goodsId: id } }),
    ]);
    cache_service_1.goodsCache.delete(String(id));
    // 通知收藏者和最近咨询者
    const notified = new Set();
    for (const f of favoriters) {
        if (f.userId !== userId && !notified.has(f.userId)) {
            notified.add(f.userId);
            (0, notification_service_1.createNotification)({ userId: f.userId, type: 'goods_sold', title: '收藏商品已售出', content: '你收藏的商品已被标记为售出', relatedId: id }).catch(() => { });
        }
    }
    for (const chatter of recentChatters) {
        if (!notified.has(chatter.senderId)) {
            notified.add(chatter.senderId);
            (0, notification_service_1.createNotification)({ userId: chatter.senderId, type: 'goods_sold', title: '咨询商品已售出', content: '你咨询过的商品已被标记为售出', relatedId: id }).catch(() => { });
        }
    }
}
async function updateGoodsStatus(id, status) {
    await database_1.prisma.goods.update({ where: { id }, data: { status } });
    cache_service_1.goodsCache.delete(String(id));
}
async function findRelatedGoods(goodsId) {
    const goods = await database_1.prisma.goods.findUnique({ where: { id: goodsId }, select: { categoryId: true, campus: true } });
    if (!goods)
        return [];
    return database_1.prisma.goods.findMany({
        where: { id: { not: goodsId }, isDeleted: false, status: 'approved', OR: [{ categoryId: goods.categoryId }, { campus: goods.campus }] },
        include: { category: { select: { name: true, icon: true } }, user: { select: { id: true, nickname: true, avatarUrl: true, status: true } } },
        orderBy: { viewCount: 'desc' },
        take: 4,
    });
}
async function findGoodsComments(goodsId, currentUserId, page = 1, pageSize = 20) {
    const where = { goodsId };
    if (currentUserId) {
        where.OR = [{ status: 'approved' }, { userId: currentUserId }];
    }
    else {
        where.status = 'approved';
    }
    return Promise.all([
        database_1.prisma.goodsComment.findMany({
            where, include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
            skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
        }),
        database_1.prisma.goodsComment.count({ where }),
    ]);
}
async function createGoodsComment(goodsId, userId, content) {
    return database_1.prisma.goodsComment.create({
        data: { goodsId, userId, content, status: 'pending' },
        include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
}
/** 增量浏览量（IP去重） */
async function incrementViewCount(goodsId, viewerIp, counter) {
    const viewKey = `goods:${goodsId}:${viewerIp}`;
    if (!counter.shouldCount(viewKey))
        return false;
    await database_1.prisma.goods.update({ where: { id: goodsId }, data: { viewCount: { increment: 1 } } });
    return true;
}
//# sourceMappingURL=goods.service.js.map