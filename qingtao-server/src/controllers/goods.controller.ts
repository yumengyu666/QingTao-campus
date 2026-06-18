/**
 * 商品 Controller — 薄层：参数提取 + 权限校验 + 响应格式化
 * 业务逻辑已提取到 goods.service.ts
 */
import { Request, Response, NextFunction } from 'express';
import { success, error, paginated, notFound } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { hasContactMethod } from '../utils/contact';
import { isValidGoodsTransition } from '../utils/statusMachine';
import { linkImageReviews } from '../utils/images';
import * as goodsSvc from '../services/goods.service';
import { viewCounter } from '../services/view-counter.service';

// GET /api/goods
export async function getGoodsList(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query as Record<string, string>;
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
    return paginated(res, list, total, parseInt(q.page) || 1, Math.min(parseInt(q.pageSize) || 20, 50));
  } catch (err) { next(err); }
}

// GET /api/goods/newest
export async function getNewest(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query as Record<string, string>;
    const page = Math.max(parseInt(q.page) || 1, 1);
    const pageSize = Math.min(parseInt(q.pageSize) || 10, 20);
    const { list, total } = await goodsSvc.findGoodsList({
      categoryId: q.categoryId ? parseInt(q.categoryId) : undefined,
      campus: q.campus,
      page, pageSize,
    });
    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

// GET /api/goods/hot
export async function getHot(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query as Record<string, string>;
    const page = Math.max(parseInt(q.page) || 1, 1);
    const pageSize = Math.min(parseInt(q.pageSize) || 10, 20);
    const { list, total } = await goodsSvc.findHotGoods(
      q.categoryId ? parseInt(q.categoryId) : undefined,
      q.campus, page, pageSize,
    );
    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

// GET /api/goods/:id
export async function getGoodsDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的商品ID');

    const goods = await goodsSvc.findGoodsById(id);
    if (!goods) return notFound(res, '商品不存在');

    const isOwner = req.user?.userId === goods.userId;
    const isAdmin = req.user?.role === 'admin';

    if (goods.isDeleted && !isOwner && !isAdmin) return notFound(res, '商品不存在');
    if (!isOwner && !isAdmin && !['approved', 'sold', 'offline'].includes(goods.status)) return notFound(res, '商品不存在');

    // 浏览量
    if (!isOwner) {
      await goodsSvc.incrementViewCount(id, req.ip || req.socket.remoteAddress || 'unknown', viewCounter);
    }

    const sellerDisabled = goods.user?.status === 'disabled';

    // 构造返回对象
    const result = {
      ...goods,
      images: goodsSvc.normalizeImages(goods.images),
      categoryName: goods.category?.name || '未分类',
      categoryIcon: goods.category?.icon || '📦',
      category: undefined,
      _aiFlagged: goods.status === 'offline' && !(goods as Record<string, unknown>).reviewComment,
      _sellerDeleted: sellerDisabled,
    };

    if (sellerDisabled) {
      // 隐私保护：已注销用户使用默认信息
      result.user = { ...result.user, nickname: `已注销用户${result.user.id}`, avatarUrl: '', wechat: '', qq: '' };
    } else if (!req.user && result.user) {
      // 未登录用户仅展示基本信息
      result.user = { ...result.user, wechat: '', qq: '' };
    }

    return success(res, result);
  } catch (err) { next(err); }
}

// POST /api/goods
export async function createGoods(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, description, price, originalPrice, listType, categoryId, condition, images, campus, campusLocation, deposit, rentStart, rentEnd } = req.body;

    if (containsSensitive(title)) return error(res, '标题包含违规内容');
    if (description && containsSensitive(description)) return error(res, '描述包含违规内容');

    const category = await (await import('../config/database')).prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return error(res, '所选分类不存在');

    const hasContact = await hasContactMethod(req.user!.userId);
    const contactHint = hasContact ? '' : '（建议填写微信或QQ，方便买家联系）';

    const goods = await goodsSvc.createGoods({
      userId: req.user!.userId,
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

    await linkImageReviews(images, 'goods', goods.id);
    const { afterCreate: ac_g } = await import('../middleware/moderation.middleware');
    ac_g('goods', goods.id, req.user!.userId, [{ field: 'title', text: title }, { field: 'description', text: description || '' }]);

    return success(res, goods, `发布成功${contactHint}`, 201);
  } catch (err) { next(err); }
}

// PUT /api/goods/:id
export async function updateGoods(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的商品ID');
    const goods = await goodsSvc.findGoodsById(id);
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId) return error(res, '无权操作', 403);

    const { title, description, price, originalPrice, listType, categoryId, condition, images, campus, campusLocation, deposit, rentStart, rentEnd } = req.body;
    if (title && containsSensitive(title)) return error(res, '标题包含违规内容');

    const { prisma } = await import('../config/database');
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
          const { createNotification } = await import('../services/notification.service');
          createNotification({ userId: fav.userId, type: 'price_drop', title: `收藏商品降价${dropPercent}%`, content: `「${updated.title.slice(0, 20)}」从¥${goods.price}降至¥${updated.price}`, relatedId: id }).catch(() => {});
        }
      }
    }

    if (images !== undefined) {
      const oldImages = goodsSvc.normalizeImages(goods.images).map(i => i.url);
      const newImages = (images || []).map((img: any) => typeof img === 'string' ? img : img.url);
      const addedImages = newImages.filter((img: string) => !oldImages.includes(img));
      if (addedImages.length > 0) linkImageReviews(addedImages, 'goods', updated.id);
    }

    const text = [updated.title, updated.description].filter(Boolean).join(' ');
    if (text) {
      const { afterCreate } = await import('../middleware/moderation.middleware');
      afterCreate('goods', updated.id, req.user!.userId, [{ field: 'title', text: updated.title }, { field: 'description', text: updated.description || '' }]);
    }

    return success(res, updated, '修改已提交审核');
  } catch (err) { next(err); }
}

// DELETE /api/goods/:id
export async function deleteGoods(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const goods = await goodsSvc.findGoodsById(id);
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);
    await goodsSvc.softDeleteGoods(id);
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}

// PATCH /api/goods/:id/sold
export async function markSold(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const goods = await goodsSvc.findGoodsById(id);
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId) return error(res, '无权操作', 403);
    if (!isValidGoodsTransition(goods.status, 'sold')) return error(res, `当前状态"${goods.status}"不允许标记为已售`);
    if (goods.status === 'sold') return error(res, '商品已标记为售出');
    await goodsSvc.markGoodsSold(id, req.user!.userId);
    return success(res, null, '已标记为售出');
  } catch (err) { next(err); }
}

// PATCH /api/goods/:id/offline
export async function markOffline(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const goods = await goodsSvc.findGoodsById(id);
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId) return error(res, '无权操作', 403);
    if (goods.status === 'offline') return error(res, '商品已下架');
    if (goods.status === 'sold') return error(res, '已售出商品无法下架');
    await goodsSvc.updateGoodsStatus(id, 'offline');
    return success(res, null, '已下架');
  } catch (err) { next(err); }
}

// PATCH /api/goods/:id/relist
export async function relist(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const goods = await goodsSvc.findGoodsById(id);
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId) return error(res, '无权操作', 403);
    if (goods.status !== 'offline') return error(res, '商品未下架');
    await goodsSvc.updateGoodsStatus(id, 'approved');
    return success(res, null, '已重新上架');
  } catch (err) { next(err); }
}

export async function unmarkSold(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const goods = await goodsSvc.findGoodsById(id);
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId) return error(res, '无权操作', 403);
    if (goods.status !== 'sold') return error(res, '商品未标记为售出');
    await goodsSvc.updateGoodsStatus(id, 'approved');
    return success(res, null, '已取消已售标记');
  } catch (err) { next(err); }
}

// GET /api/goods/:id/comments
export async function getGoodsComments(req: Request, res: Response, next: NextFunction) {
  try {
    const goodsId = parseInt(req.params.id as string);
    if (isNaN(goodsId)) return error(res, '无效的商品ID');
    const page = parseInt(req.query.page as string) || 1;
    const [list, total] = await goodsSvc.findGoodsComments(goodsId, req.user?.userId, page);
    return paginated(res, list, total, page, 20);
  } catch (err) { next(err); }
}

// POST /api/goods/:id/comments
export async function createGoodsComment(req: Request, res: Response, next: NextFunction) {
  try {
    const goodsId = parseInt(req.params.id as string);
    if (isNaN(goodsId)) return error(res, '无效的商品ID');
    const { content } = req.body;

    if (containsSensitive(content)) return error(res, '评论包含违规内容');

    const goods = await goodsSvc.findGoodsById(goodsId);
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');

    const comment = await goodsSvc.createGoodsComment(goodsId, req.user!.userId, content.trim());

    if (goods.userId !== req.user!.userId) {
      const { createNotification } = await import('../services/notification.service');
      createNotification({
        userId: goods.userId, type: 'new_comment',
        title: `有人评论了"${goods.title}"`,
        content: `${req.user!.username} 评论：${content.trim().substring(0, 50)}`,
        relatedId: goodsId,
      }).catch(() => {});
    }

    const { aiModerate } = await import('../services/moderation.service');
    const { logger } = await import('../utils/logger');
    aiModerate(content, { contentType: 'goods_comment', userId: req.user!.userId }).then(result => {
      const { prisma } = require('../config/database');
      if (result === 'violation') {
        logger.warn(`AI flagged goods comment #${comment.id}`);
        prisma.goodsComment.update({ where: { id: comment.id }, data: { status: 'offline' } }).catch(() => {});
      } else if (result === 'safe') {
        prisma.goodsComment.update({ where: { id: comment.id }, data: { status: 'approved' } }).catch(() => {});
      }
    });

    return success(res, comment, '评论成功', 201);
  } catch (err) { next(err); }
}

// DELETE /api/goods/:id/comments/:commentId
export async function deleteGoodsComment(req: Request, res: Response, next: NextFunction) {
  try {
    const commentId = parseInt(req.params.commentId as string);
    if (isNaN(commentId)) return error(res, '无效的评论ID');
    const { prisma } = await import('../config/database');
    const comment = await prisma.goodsComment.findUnique({ where: { id: commentId } });
    if (!comment) return notFound(res, '评论不存在');
    if (comment.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);
    await prisma.goodsComment.delete({ where: { id: commentId } });
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}

// GET /api/goods/:id/related
export async function getRelatedGoods(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的商品ID');
    const related = await goodsSvc.findRelatedGoods(id);
    return success(res, related.map((g: any) => ({
      id: g.id, title: g.title, price: g.price,
      images: goodsSvc.normalizeImages(g.images),
      categoryName: g.category?.name,
      viewCount: g.viewCount,
    })));
  } catch (err) { next(err); }
}
