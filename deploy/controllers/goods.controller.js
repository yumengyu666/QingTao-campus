"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoodsList = getGoodsList;
exports.getNewest = getNewest;
exports.getHot = getHot;
exports.getGoodsDetail = getGoodsDetail;
exports.createGoods = createGoods;
exports.updateGoods = updateGoods;
exports.deleteGoods = deleteGoods;
exports.markSold = markSold;
exports.markOffline = markOffline;
exports.relist = relist;
exports.unmarkSold = unmarkSold;
exports.getGoodsComments = getGoodsComments;
exports.createGoodsComment = createGoodsComment;
exports.deleteGoodsComment = deleteGoodsComment;
exports.getRelatedGoods = getRelatedGoods;
const response_1 = require("../utils/response");
const sensitive_1 = require("../utils/sensitive");
const contact_1 = require("../utils/contact");
const statusMachine_1 = require("../utils/statusMachine");
const images_1 = require("../utils/images");
const goodsSvc = __importStar(require("../services/goods.service"));
const view_counter_service_1 = require("../services/view-counter.service");
// GET /api/goods
async function getGoodsList(req, res, next) {
    try {
        const q = req.query;
        const { list, total } = await goodsSvc.findGoodsList({
            categoryId: q.categoryId ? parseInt(q.categoryId) : undefined,
            listType: q.listType,
            status: q.status,
            campus: q.campus,
            condition: q.condition,
            priceMin: q.priceMin ? parseFloat(q.priceMin) : undefined,
            priceMax: q.priceMax ? parseFloat(q.priceMax) : undefined,
            keyword: q.keyword,
            sort: q.sort,
            order: q.order,
            page: Math.max(parseInt(q.page) || 1, 1),
            pageSize: Math.min(parseInt(q.pageSize) || 20, 50),
        });
        return (0, response_1.paginated)(res, list, total, parseInt(q.page) || 1, Math.min(parseInt(q.pageSize) || 20, 50));
    }
    catch (err) {
        next(err);
    }
}
// GET /api/goods/newest
async function getNewest(req, res, next) {
    try {
        const q = req.query;
        const page = Math.max(parseInt(q.page) || 1, 1);
        const pageSize = Math.min(parseInt(q.pageSize) || 10, 20);
        const { list, total } = await goodsSvc.findGoodsList({
            categoryId: q.categoryId ? parseInt(q.categoryId) : undefined,
            campus: q.campus,
            page, pageSize,
        });
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/goods/hot
async function getHot(req, res, next) {
    try {
        const q = req.query;
        const page = Math.max(parseInt(q.page) || 1, 1);
        const pageSize = Math.min(parseInt(q.pageSize) || 10, 20);
        const { list, total } = await goodsSvc.findHotGoods(q.categoryId ? parseInt(q.categoryId) : undefined, q.campus, page, pageSize);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/goods/:id
async function getGoodsDetail(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的商品ID');
        const goods = await goodsSvc.findGoodsById(id);
        if (!goods)
            return (0, response_1.notFound)(res, '商品不存在');
        const isOwner = req.user?.userId === goods.userId;
        const isAdmin = req.user?.role === 'admin';
        if (goods.isDeleted && !isOwner && !isAdmin)
            return (0, response_1.notFound)(res, '商品不存在');
        if (!isOwner && !isAdmin && !['approved', 'sold', 'reserved'].includes(goods.status))
            return (0, response_1.notFound)(res, '商品不存在');
        // 浏览量
        if (!isOwner) {
            await goodsSvc.incrementViewCount(id, req.ip || req.socket.remoteAddress || 'unknown', view_counter_service_1.viewCounter);
        }
        const sellerDisabled = goods.user?.status === 'disabled';
        // 构造返回对象
        const result = {
            ...goods,
            images: goodsSvc.normalizeImages(goods.images),
            categoryName: goods.category?.name || '未分类',
            categoryIcon: goods.category?.icon || '📦',
            category: undefined,
            _aiFlagged: goods.status === 'offline' && !goods.reviewComment,
            _sellerDeleted: sellerDisabled,
        };
        if (sellerDisabled) {
            // 隐私保护：已注销用户使用默认信息
            result.user = { ...result.user, nickname: `已注销用户${result.user.id}`, avatarUrl: '', wechat: '', qq: '' };
        }
        else if (!req.user && result.user) {
            // 未登录用户仅展示基本信息
            result.user = { ...result.user, wechat: '', qq: '' };
        }
        return (0, response_1.success)(res, result);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/goods
async function createGoods(req, res, next) {
    try {
        const { title, description, price, originalPrice, listType, categoryId, condition, images, campus, campusLocation, deposit, rentStart, rentEnd } = req.body;
        if ((0, sensitive_1.containsSensitive)(title))
            return (0, response_1.error)(res, '标题包含违规内容');
        if (description && (0, sensitive_1.containsSensitive)(description))
            return (0, response_1.error)(res, '描述包含违规内容');
        const category = await (await Promise.resolve().then(() => __importStar(require('../config/database')))).prisma.category.findUnique({ where: { id: categoryId } });
        if (!category)
            return (0, response_1.error)(res, '所选分类不存在');
        const hasContact = await (0, contact_1.hasContactMethod)(req.user.userId);
        const contactHint = hasContact ? '' : '（建议填写微信或QQ，方便买家联系）';
        const goods = await goodsSvc.createGoods({
            userId: req.user.userId,
            categoryId,
            title: title.trim(),
            description: description || '',
            price: parseFloat(price),
            originalPrice: originalPrice ? parseFloat(originalPrice) : null,
            listType: listType || 'sale',
            deposit: deposit ? parseFloat(deposit) : null,
            rentStart: rentStart || null,
            rentEnd: rentEnd || null,
            condition: condition || 'used',
            images: images || [],
            campus: campus || 'kexue',
            campusLocation: campusLocation || '',
        });
        await (0, images_1.linkImageReviews)(images, 'goods', goods.id);
        const { afterCreate: ac_g } = await Promise.resolve().then(() => __importStar(require('../middleware/moderation.middleware')));
        ac_g('goods', goods.id, req.user.userId, [{ field: 'title', text: title }, { field: 'description', text: description || '' }]);
        return (0, response_1.success)(res, goods, `发布成功${contactHint}`, 201);
    }
    catch (err) {
        next(err);
    }
}
// PUT /api/goods/:id
async function updateGoods(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的商品ID');
        const goods = await goodsSvc.findGoodsById(id);
        if (!goods || goods.isDeleted)
            return (0, response_1.notFound)(res, '商品不存在');
        if (goods.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        const { title, description, price, originalPrice, listType, categoryId, condition, images, campus, campusLocation, deposit, rentStart, rentEnd } = req.body;
        if (title && (0, sensitive_1.containsSensitive)(title))
            return (0, response_1.error)(res, '标题包含违规内容');
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const updated = await prisma.goods.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price: parseFloat(price) }),
                ...(originalPrice !== undefined && { originalPrice: originalPrice ? parseFloat(originalPrice) : null }),
                ...(listType !== undefined && { listType }),
                ...(categoryId !== undefined && { categoryId }),
                ...(condition !== undefined && { condition }),
                ...(images !== undefined && { images: JSON.stringify(images) }),
                ...(campus !== undefined && { campus }),
                ...(campusLocation !== undefined && { campusLocation }),
                ...(deposit !== undefined && { deposit: deposit ? parseFloat(deposit) : null }),
                ...(rentStart !== undefined && { rentStart: rentStart || null }),
                ...(rentEnd !== undefined && { rentEnd: rentEnd || null }),
                status: goods.status, reviewComment: '', updatedAt: new Date(),
            },
        });
        // 降价提醒逻辑 → 考虑后续可提取到 Service
        if (price !== undefined && updated.price < goods.price) {
            const dropPercent = Math.round((1 - updated.price / goods.price) * 100);
            await prisma.priceChangeLog.create({ data: { goodsId: id, oldPrice: goods.price, newPrice: updated.price, changePercent: dropPercent } });
            if (dropPercent >= 10) {
                const favorites = await prisma.favorite.findMany({ where: { goodsId: id }, select: { userId: true } });
                for (const fav of favorites) {
                    const { createNotification } = await Promise.resolve().then(() => __importStar(require('../services/notification.service')));
                    createNotification({ userId: fav.userId, type: 'price_drop', title: `收藏商品降价${dropPercent}%`, content: `「${updated.title.slice(0, 20)}」从¥${goods.price}降至¥${updated.price}`, relatedId: id }).catch(() => { });
                }
            }
        }
        if (images !== undefined) {
            const oldImages = goodsSvc.normalizeImages(goods.images).map(i => i.url);
            const newImages = (images || []).map((img) => typeof img === 'string' ? img : img.url);
            const addedImages = newImages.filter((img) => !oldImages.includes(img));
            if (addedImages.length > 0)
                (0, images_1.linkImageReviews)(addedImages, 'goods', updated.id);
        }
        const text = [updated.title, updated.description].filter(Boolean).join(' ');
        if (text) {
            const { afterCreate } = await Promise.resolve().then(() => __importStar(require('../middleware/moderation.middleware')));
            afterCreate('goods', updated.id, req.user.userId, [{ field: 'title', text: updated.title }, { field: 'description', text: updated.description || '' }]);
        }
        return (0, response_1.success)(res, updated, '修改已提交审核');
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/goods/:id
async function deleteGoods(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const goods = await goodsSvc.findGoodsById(id);
        if (!goods || goods.isDeleted)
            return (0, response_1.notFound)(res, '商品不存在');
        if (goods.userId !== req.user.userId && req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权操作', 403);
        await goodsSvc.softDeleteGoods(id);
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/goods/:id/sold
async function markSold(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const goods = await goodsSvc.findGoodsById(id);
        if (!goods || goods.isDeleted)
            return (0, response_1.notFound)(res, '商品不存在');
        if (goods.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (!(0, statusMachine_1.isValidGoodsTransition)(goods.status, 'sold'))
            return (0, response_1.error)(res, `当前状态"${goods.status}"不允许标记为已售`);
        if (goods.status === 'sold')
            return (0, response_1.error)(res, '商品已标记为售出');
        await goodsSvc.markGoodsSold(id, req.user.userId);
        return (0, response_1.success)(res, null, '已标记为售出');
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/goods/:id/offline
async function markOffline(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const goods = await goodsSvc.findGoodsById(id);
        if (!goods || goods.isDeleted)
            return (0, response_1.notFound)(res, '商品不存在');
        if (goods.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (goods.status === 'offline')
            return (0, response_1.error)(res, '商品已下架');
        if (goods.status === 'sold')
            return (0, response_1.error)(res, '已售出商品无法下架');
        await goodsSvc.updateGoodsStatus(id, 'offline');
        return (0, response_1.success)(res, null, '已下架');
    }
    catch (err) {
        next(err);
    }
}
// PATCH /api/goods/:id/relist
async function relist(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const goods = await goodsSvc.findGoodsById(id);
        if (!goods || goods.isDeleted)
            return (0, response_1.notFound)(res, '商品不存在');
        if (goods.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (goods.status !== 'offline')
            return (0, response_1.error)(res, '商品未下架');
        await goodsSvc.updateGoodsStatus(id, 'approved');
        return (0, response_1.success)(res, null, '已重新上架');
    }
    catch (err) {
        next(err);
    }
}
async function unmarkSold(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        const goods = await goodsSvc.findGoodsById(id);
        if (!goods || goods.isDeleted)
            return (0, response_1.notFound)(res, '商品不存在');
        if (goods.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (goods.status !== 'sold')
            return (0, response_1.error)(res, '商品未标记为售出');
        await goodsSvc.updateGoodsStatus(id, 'approved');
        return (0, response_1.success)(res, null, '已取消已售标记');
    }
    catch (err) {
        next(err);
    }
}
// GET /api/goods/:id/comments
async function getGoodsComments(req, res, next) {
    try {
        const goodsId = parseInt(req.params.id);
        if (isNaN(goodsId))
            return (0, response_1.error)(res, '无效的商品ID');
        const page = parseInt(req.query.page) || 1;
        const [list, total] = await goodsSvc.findGoodsComments(goodsId, req.user?.userId, page);
        return (0, response_1.paginated)(res, list, total, page, 20);
    }
    catch (err) {
        next(err);
    }
}
// POST /api/goods/:id/comments
async function createGoodsComment(req, res, next) {
    try {
        const goodsId = parseInt(req.params.id);
        if (isNaN(goodsId))
            return (0, response_1.error)(res, '无效的商品ID');
        const { content } = req.body;
        if ((0, sensitive_1.containsSensitive)(content))
            return (0, response_1.error)(res, '评论包含违规内容');
        const goods = await goodsSvc.findGoodsById(goodsId);
        if (!goods || goods.isDeleted)
            return (0, response_1.notFound)(res, '商品不存在');
        const comment = await goodsSvc.createGoodsComment(goodsId, req.user.userId, content.trim());
        if (goods.userId !== req.user.userId) {
            const { createNotification } = await Promise.resolve().then(() => __importStar(require('../services/notification.service')));
            createNotification({
                userId: goods.userId, type: 'new_comment',
                title: `有人评论了"${goods.title}"`,
                content: `${req.user.username} 评论：${content.trim().substring(0, 50)}`,
                relatedId: goodsId,
            }).catch(() => { });
        }
        const { aiModerate } = await Promise.resolve().then(() => __importStar(require('../services/moderation.service')));
        const { logger } = await Promise.resolve().then(() => __importStar(require('../utils/logger')));
        aiModerate(content, { contentType: 'goods_comment', userId: req.user.userId }).then(result => {
            const { prisma } = require('../config/database');
            if (result === 'violation') {
                logger.warn(`AI flagged goods comment #${comment.id}`);
                prisma.goodsComment.update({ where: { id: comment.id }, data: { status: 'offline' } }).catch(() => { });
            }
            else if (result === 'safe') {
                prisma.goodsComment.update({ where: { id: comment.id }, data: { status: 'approved' } }).catch(() => { });
            }
        });
        return (0, response_1.success)(res, comment, '评论成功', 201);
    }
    catch (err) {
        next(err);
    }
}
// DELETE /api/goods/:id/comments/:commentId
async function deleteGoodsComment(req, res, next) {
    try {
        const commentId = parseInt(req.params.commentId);
        if (isNaN(commentId))
            return (0, response_1.error)(res, '无效的评论ID');
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const comment = await prisma.goodsComment.findUnique({ where: { id: commentId } });
        if (!comment)
            return (0, response_1.notFound)(res, '评论不存在');
        if (comment.userId !== req.user.userId && req.user.role !== 'admin')
            return (0, response_1.error)(res, '无权操作', 403);
        await prisma.goodsComment.delete({ where: { id: commentId } });
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
// GET /api/goods/:id/related
async function getRelatedGoods(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的商品ID');
        const related = await goodsSvc.findRelatedGoods(id);
        return (0, response_1.success)(res, related.map((g) => ({
            id: g.id, title: g.title, price: g.price,
            images: goodsSvc.normalizeImages(g.images),
            categoryName: g.category?.name,
            viewCount: g.viewCount,
        })));
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=goods.controller.js.map