import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated, notFound } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { hasContactMethod } from '../utils/contact';
import { createNotification } from '../services/notification.service';
import { aiModerate } from '../services/moderation.service';
import { logger } from '../utils/logger';

// 浏览量去重：IP+商品ID，30分钟过期
const viewDedup = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of viewDedup) { if (now - t > 30 * 60 * 1000) viewDedup.delete(k); }
}, 10 * 60 * 1000).unref();
import { linkImageReviews } from '../utils/images';
import { isValidGoodsTransition } from '../utils/statusMachine';

// 标准化图片格式 + 标注审核状态
async function attachPendingImageFlag(list: any[], viewerUserId?: number) {
  for (const g of list) {
    const raw = Array.isArray(g.images) ? g.images : JSON.parse(g.images || '[]');
    // 标准化：确保每个图片项都有 url, blurredUrl, reviewId, pending
    g.images = raw.map((img: any) => {
      if (typeof img === 'string') {
        return { url: img, blurredUrl: img, reviewId: 0, pending: false };
      }
      return { ...img, pending: false }; // default, will update below
    });
  }

  // 批量查待审核图片
  const allUrls = list.flatMap((g: any) => g.images.map((i: any) => i.url));
  if (allUrls.length > 0) {
    const pendingReviews = await prisma.imageReview.findMany({
      where: { url: { in: allUrls }, status: 'pending' },
      select: { url: true },
    });
    const pendingSet = new Set(pendingReviews.map(r => r.url));
    for (const g of list) {
      let hasAny = false;
      for (const img of g.images) {
        if (pendingSet.has(img.url)) {
          img.pending = true;
          hasAny = true;
        }
      }
      g.hasPendingImages = hasAny && g.userId !== viewerUserId; // 发布者自己不算待审核
    }
  }
}

// GET /api/goods — 商品列表
export async function getGoodsList(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      categoryId, listType, status, campus, sort, order,
      keyword, condition, priceMin, priceMax,
      page: pageStr, pageSize: pageSizeStr,
    } = req.query as Record<string, string>;

    const page = Math.max(parseInt(pageStr) || 1, 1);
    const pageSize = Math.min(parseInt(pageSizeStr) || 20, 50);

    const where: any = { isDeleted: false };
    // Default to approved+sold+pending (先发后审), but allow explicit status filter
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['approved', 'sold', 'pending'] };
    }

    if (categoryId) where.categoryId = parseInt(categoryId);
    if (listType) where.listType = listType;
    if (campus) where.campus = campus;
    if (condition) {
      const conditions = condition.split(',').filter(c => ['brand_new', 'like_new', 'used', 'worn'].includes(c));
      if (conditions.length === 1) {
        where.condition = conditions[0];
      } else if (conditions.length > 1) {
        where.condition = { in: conditions };
      }
    }
    if (priceMin || priceMax) {
      where.price = {};
      if (priceMin) where.price.gte = parseFloat(priceMin);
      if (priceMax) where.price.lte = parseFloat(priceMax);
    }
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    // 排序
    const allowedSorts = ['created_at', 'price', 'view_count'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
    let orderBy: any = { createdAt: 'desc' };
    if (safeSort === 'price') orderBy = { price: order === 'asc' ? 'asc' : 'desc' };
    if (safeSort === 'view_count') orderBy = { viewCount: 'desc' };

    const [list, total] = await Promise.all([
      prisma.goods.findMany({
        where,
        include: {
          category: { select: { name: true, icon: true } },
          user: { select: { id: true, nickname: true, avatarUrl: true, status: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      prisma.goods.count({ where }),
    ]);

    const data = list.map(g => {
      const u = g.user as any;
      const sellerDeleted = u?.status === 'disabled' || u?.nickname?.startsWith('已注销');
      return {
        ...g,
        images: JSON.parse(g.images || '[]'),
        // 兜底：分类被删除时显示"未分类"
        categoryName: g.category?.name || '未分类',
        categoryIcon: g.category?.icon || '📦',
        category: undefined,
        user: sellerDeleted ? { id: u.id, nickname: `已注销用户${u.id}`, avatarUrl: '' } : u,
      };
    });

    await attachPendingImageFlag(data, req.user?.userId);

    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// GET /api/goods/newest — 最新
export async function getNewest(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 20);
    const categoryId = parseInt(req.query.categoryId as string) || undefined;
    const campus = req.query.campus as string;

    const where: any = { isDeleted: false, status: { in: ['approved', 'pending'] } };
    if (categoryId) where.categoryId = categoryId;
    if (campus) where.campus = campus;
    const [list, total] = await Promise.all([
      prisma.goods.findMany({
        where,
        include: {
          category: { select: { name: true, icon: true } },
          user: { select: { id: true, nickname: true, avatarUrl: true, status: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.goods.count({ where }),
    ]);

    const data = list.map(g => {
      const u = g.user as any;
      const sellerDeleted = u?.status === 'disabled' || u?.nickname?.startsWith('已注销');
      return {
        ...g, images: JSON.parse(g.images || '[]'),
        categoryName: g.category?.name || '未分类', categoryIcon: g.category?.icon || '📦',
        category: undefined,
        user: sellerDeleted ? { id: u.id, nickname: `已注销用户${u.id}`, avatarUrl: '' } : u,
      };
    });
    await attachPendingImageFlag(data, req.user?.userId);
    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// GET /api/goods/hot — 热门（综合浏览量和时间衰减）
export async function getHot(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 20);
    const categoryId = parseInt(req.query.categoryId as string) || undefined;
    const campus = req.query.campus as string;

    const where: any = { isDeleted: false, status: { in: ['approved', 'pending'] } };
    if (categoryId) where.categoryId = categoryId;
    if (campus) where.campus = campus;

    // 热门算法：viewCount / max(1, days^1.5)，浏览量高 + 发布时间近 = 得分高
    const HOT_POOL = 200;

    const [list, total] = await Promise.all([
      prisma.goods.findMany({
        where,
        include: {
          category: { select: { name: true, icon: true } },
          user: { select: { id: true, nickname: true, avatarUrl: true, status: true } },
        },
        orderBy: { viewCount: 'desc' },
        take: HOT_POOL,
      }),
      prisma.goods.count({ where }),
    ]);

    // 综合排序：浏览量 / max(1, 距今天数^1.5)，非对称时间衰减
    const now = Date.now();
    const sorted = list
      .map(g => {
        const ageDays = (now - new Date(g.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const decay = Math.max(1, Math.pow(ageDays, 1.5));
        const hotScore = (g.viewCount || 0) / decay;
        return { ...g, _hotScore: hotScore };
      })
      .sort((a, b) => b._hotScore - a._hotScore);

    const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
    const data = paged.map(({ _hotScore, ...g }: any) => {
      const u = g.user as any;
      const sellerDeleted = u?.status === 'disabled' || u?.nickname?.startsWith('已注销');
      return {
        ...g, images: JSON.parse(g.images || '[]'),
        categoryName: g.category?.name, categoryIcon: g.category?.icon,
        category: undefined,
        user: sellerDeleted ? { id: u.id, nickname: `已注销用户${u.id}`, avatarUrl: '' } : u,
      };
    });
    await attachPendingImageFlag(data, req.user?.userId);
    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// POST /api/goods — 发布商品
export async function createGoods(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, description, price, originalPrice, listType, categoryId, condition, images, campus, campusLocation, deposit, rentStart, rentEnd } = req.body;

    if (!title?.trim()) return error(res, '请输入商品标题');
    if (title.length > 100) return error(res, '标题最多100字');
    if (containsSensitive(title)) return error(res, '标题包含违规内容');
    if (description && containsSensitive(description)) return error(res, '描述包含违规内容');
    if (!price || price <= 0 || price > 99999) return error(res, '请输入有效价格');
    if (originalPrice && (parseFloat(originalPrice) <= 0 || parseFloat(originalPrice) > 99999)) return error(res, '原价范围无效');
    if (!categoryId) return error(res, '请选择分类');

    // 验证分类是否存在
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return error(res, '所选分类不存在');

    // 检查联系方式（仅提醒，不拦截发布）
    const hasContact = await hasContactMethod(req.user!.userId);
    const contactHint = hasContact ? '' : '（建议填写微信或QQ，方便买家联系）';

    const goods = await prisma.goods.create({
      data: {
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
        images: JSON.stringify(images || []),
        campus: campus || 'kexue',
        campusLocation: campusLocation || '',
        status: 'pending',
      },
    });

    // 关联图片审核记录
    await linkImageReviews(images, 'goods', goods.id);
    // AI 后台审核
    const { afterCreate: ac_g } = await import('../middleware/moderation.middleware');
    ac_g('goods', goods.id, req.user!.userId, [{ field: 'title', text: title }, { field: 'description', text: description || '' }]);

    return success(res, goods, `发布成功${contactHint}`, 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/goods/:id — 商品详情
export async function getGoodsDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的商品ID');

    const goods = await prisma.goods.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, icon: true } },
        user: { select: { id: true, nickname: true, avatarUrl: true, wechat: true, qq: true, status: true } },
      },
    });

    if (!goods) return notFound(res, '商品不存在');

    const isOwner = req.user && req.user.userId === goods.userId;
    const isAdmin = req.user && req.user.role === 'admin';

    if (goods.isDeleted && !isOwner && !isAdmin) return notFound(res, '商品不存在');
    
    // 待审核/已拒绝内容仅作者和管理员可见（防 URL 遍历）
    if (!isOwner && !isAdmin && ['pending', 'rejected'].includes(goods.status)) {
      return notFound(res, '商品不存在');
    }
    if (!isOwner && !isAdmin && !['approved', 'sold', 'offline'].includes(goods.status)) {
      return notFound(res, '商品不存在');
    }

    // 浏览量+1（作者本人不增加；IP 24h去重）
    if (!isOwner) {
      const viewerIp = req.ip || req.socket.remoteAddress || 'unknown';
      const viewKey = `goods:${id}:${viewerIp}`;
      if (!viewDedup.has(viewKey)) {
        viewDedup.set(viewKey, Date.now());
        await prisma.goods.update({ where: { id }, data: { viewCount: { increment: 1 } } });
      }
    }

    // 未登录用户隐藏卖家联系方式
    const sellerDisabled = goods.user?.status === 'disabled' || goods.user?.nickname?.startsWith('已注销');
    const result: any = {
      ...goods,
      images: JSON.parse(goods.images || '[]'),
      categoryName: goods.category?.name || '未分类',
      categoryIcon: goods.category?.icon || '📦',
      category: undefined,
      _aiFlagged: goods.status === 'offline' && !goods.reviewComment,
      _sellerDeleted: sellerDisabled,
    };
    if (sellerDisabled) {
      result.user = { id: result.user.id, nickname: `已注销用户${result.user.id}`, avatarUrl: '' };
    } else if (!req.user && result.user) {
      result.user = { id: result.user.id, nickname: result.user.nickname, avatarUrl: result.user.avatarUrl };
    }
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

// PUT /api/goods/:id — 编辑商品
export async function updateGoods(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的商品ID');
    const goods = await prisma.goods.findUnique({ where: { id } });
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId) return error(res, '无权操作', 403);

    const { title, description, price, originalPrice, listType, categoryId, condition, images, campus, campusLocation, deposit, rentStart, rentEnd } = req.body;

    if (title && containsSensitive(title)) return error(res, '标题包含违规内容');

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
        status: goods.status,
        reviewComment: '',
        updatedAt: new Date(),
      },
    });

    // 降价提醒：记录价格变化并通知收藏者
    if (price !== undefined && price !== goods.price && updated.price < goods.price) {
      const oldPrice = goods.price;
      const newPrice = updated.price;
      const dropPercent = Math.round((1 - newPrice / oldPrice) * 100);

      // 记录价格变化
      await prisma.priceChangeLog.create({
        data: { goodsId: id, oldPrice, newPrice, changePercent: dropPercent },
      });

      // 降价≥10%通知收藏者
      if (dropPercent >= 10) {
        const favorites = await prisma.favorite.findMany({
          where: { goodsId: id },
          select: { userId: true },
        });
        for (const fav of favorites) {
          createNotification({
            userId: fav.userId,
            type: 'price_drop',
            title: '收藏商品降价啦！',
            content: `「${updated.title.slice(0, 20)}」降价${dropPercent}%，从¥${oldPrice}降至¥${newPrice}`,
            relatedId: id,
          }).catch(() => {});
        }
      }
    }

    // 仅对新图片进行审核（与旧图片对比）
    if (images !== undefined) {
      const oldImages: string[] = JSON.parse(goods!.images || '[]');
      const newImages: string[] = Array.isArray(images) ? images.map((img: any) => typeof img === 'string' ? img : img.url) : [];
      const addedImages = newImages.filter(img => !oldImages.includes(img));
      if (addedImages.length > 0) {
        linkImageReviews(addedImages, 'goods', updated.id);
      }
    }

    // L2 AI 异步审核编辑后的文字内容
    const text = [updated.title, updated.description].filter(Boolean).join(' ');
    if (text) {
      const { afterCreate } = await import('../middleware/moderation.middleware');
      afterCreate('goods', updated.id, req.user!.userId, [
        { field: 'title', text: updated.title },
        { field: 'description', text: updated.description || '' },
      ]);
    }

    return success(res, updated, '修改已提交审核');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/goods/:id — 软删除
export async function deleteGoods(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const goods = await prisma.goods.findUnique({ where: { id } });
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);

    await prisma.goods.update({ where: { id }, data: { isDeleted: true } });
    await prisma.favorite.deleteMany({ where: { goodsId: id } });
    await prisma.notification.deleteMany({ where: { relatedId: id } });

    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/goods/:id/sold — 标记已售
export async function markSold(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的商品ID');
    const goods = await prisma.goods.findUnique({ where: { id } });
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId) return error(res, '无权操作', 403);
    if (!isValidGoodsTransition(goods.status, 'sold')) {
      return error(res, `当前状态"${goods.status}"不允许标记为已售`);
    }
    if (goods.status === 'sold') return error(res, '商品已标记为售出');

    // 提前获取待通知的用户列表（事务前读取）
    const [favoriters, recentChatters] = await Promise.all([
      prisma.favorite.findMany({ where: { goodsId: id }, select: { userId: true } }),
      prisma.chatMessage.findMany({
        where: { receiverId: goods.userId },
        select: { senderId: true },
        distinct: ['senderId'],
        take: 20,
      }),
    ]);

    await prisma.$transaction([
      prisma.goods.update({ where: { id }, data: { status: 'sold' } }),
      prisma.cartItem.deleteMany({ where: { goodsId: id } }),
      prisma.favorite.deleteMany({ where: { goodsId: id } }),
    ]);

    // 通知收藏者
    const notified = new Set<number>();
    for (const f of favoriters) {
      if (f.userId !== goods.userId && !notified.has(f.userId)) {
        notified.add(f.userId);
        createNotification({
          userId: f.userId,
          type: 'goods_sold',
          title: `"${goods.title}" 已售出`,
          content: '你收藏的商品已被标记为售出',
          relatedId: id,
        }).catch(() => {});
      }
    }

    // 通知最近联系过卖家的买家（去重）
    for (const chatter of recentChatters) {
      if (!notified.has(chatter.senderId)) {
        notified.add(chatter.senderId);
        createNotification({
          userId: chatter.senderId,
          type: 'goods_sold',
          title: `"${goods.title}" 已售出`,
          content: '你咨询过的商品已被标记为售出',
          relatedId: id,
        }).catch(() => {});
      }
    }

    return success(res, null, '已标记为售出');
  } catch (err) {
    next(err);
  }
}

// GET /api/goods/:id/comments — 商品评论列表
export async function getGoodsComments(req: Request, res: Response, next: NextFunction) {
  try {
    const goodsId = parseInt(req.params.id as string);
    if (isNaN(goodsId)) return error(res, '无效的商品ID');
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;
    const currentUserId = req.user?.userId;

    // Build where: owner sees all, commenter sees own, others see approved only
    const where: any = { goodsId };
    if (currentUserId) {
      // Logged in: show approved + own comments
      where.OR = [
        { status: 'approved' },
        { userId: currentUserId },
      ];
    } else {
      where.status = 'approved';
    }

    const [list, total] = await Promise.all([
      prisma.goodsComment.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.goodsComment.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// POST /api/goods/:id/comments — 发表商品评论
export async function createGoodsComment(req: Request, res: Response, next: NextFunction) {
  try {
    const goodsId = parseInt(req.params.id as string);
    if (isNaN(goodsId)) return error(res, '无效的商品ID');
    const { content } = req.body;

    if (!content?.trim()) return error(res, '请输入评论内容');
    if (content.length > 500) return error(res, '评论最多500字');
    if (containsSensitive(content)) return error(res, '评论包含违规内容');

    const goods = await prisma.goods.findUnique({ where: { id: goodsId } });
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');

    const comment = await prisma.goodsComment.create({
      data: {
        goodsId,
        userId: req.user!.userId,
        content: content.trim(),
        status: 'pending',
      },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });

    // 通知商品卖家
    if (goods.userId !== req.user!.userId) {
      await createNotification({
        userId: goods.userId,
        type: 'new_comment',
        title: `有人评论了"${goods.title}"`,
        content: `${req.user!.username} 评论：${content.trim().substring(0, 50)}`,
        relatedId: goodsId,
      });
    }

    // L2 AI 异步审核（必须在 return 之前）
    aiModerate(content, { contentType: 'goods_comment', userId: req.user!.userId }).then(result => {
      if (result === 'violation') {
        logger.warn(`AI flagged goods comment #${comment.id}, soft-deleting`);
        prisma.goodsComment.update({ where: { id: comment.id }, data: { status: 'offline' } }).catch(() => {});
      } else if (result === 'safe') {
        // safe → approve
        prisma.goodsComment.update({ where: { id: comment.id }, data: { status: 'approved' } }).catch(() => {});
      }
      // result === 'error': AI 审核失败，保持 pending
    });

    return success(res, comment, '评论成功', 201);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/goods/:id/comments/:commentId — 删除评论
export async function deleteGoodsComment(req: Request, res: Response, next: NextFunction) {
  try {
    const commentId = parseInt(req.params.commentId as string);
    if (isNaN(commentId)) return error(res, '无效的评论ID');
    const comment = await prisma.goodsComment.findUnique({ where: { id: commentId } });
    if (!comment) return notFound(res, '评论不存在');
    if (comment.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);

    await prisma.goodsComment.delete({ where: { id: commentId } });
    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}
// PATCH /api/goods/:id/offline — 下架商品
export async function markOffline(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的商品ID');
    const goods = await prisma.goods.findUnique({ where: { id } });
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId) return error(res, '无权操作', 403);
    if (goods.status === 'offline') return error(res, '商品已下架');
    if (goods.status === 'sold') return error(res, '已售出商品无法下架');

    await prisma.goods.update({ where: { id }, data: { status: 'offline' } });
    return success(res, null, '已下架');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/goods/:id/relist — 重新上架
export async function relist(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的商品ID');
    const goods = await prisma.goods.findUnique({ where: { id } });
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId) return error(res, '无权操作', 403);
    if (goods.status !== 'offline') return error(res, '商品未下架');

    await prisma.goods.update({ where: { id }, data: { status: 'approved' } });
    return success(res, null, '已重新上架');
  } catch (err) {
    next(err);
  }
}

export async function unmarkSold(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的商品ID');
    const goods = await prisma.goods.findUnique({ where: { id } });
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.userId !== req.user!.userId) return error(res, '无权操作', 403);
    if (goods.status !== 'sold') return error(res, '商品未标记为售出');

    await prisma.goods.update({ where: { id }, data: { status: 'approved' } });
    return success(res, null, '已取消已售标记');
  } catch (err) {
    next(err);
  }
}

// GET /api/goods/:id/related — 相似商品推荐（同分类+同校区，前4件）
export async function getRelatedGoods(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的商品ID');

    const goods = await prisma.goods.findUnique({
      where: { id },
      select: { categoryId: true, campus: true, price: true },
    });
    if (!goods) return error(res, '商品不存在', 404);

    const related = await prisma.goods.findMany({
      where: {
        id: { not: id },
        isDeleted: false,
        status: 'approved',
        OR: [
          { categoryId: goods.categoryId },
          { campus: goods.campus },
        ],
      },
      include: {
        category: { select: { name: true, icon: true } },
        user: { select: { id: true, nickname: true, avatarUrl: true, status: true } },
      },
      orderBy: { viewCount: 'desc' },
      take: 4,
    });

    return success(res, related.map(g => ({
      id: g.id, title: g.title, price: g.price,
      images: JSON.parse(g.images || '[]'),
      categoryName: g.category?.name,
      viewCount: g.viewCount,
    })));
  } catch (err) {
    next(err);
  }
}
