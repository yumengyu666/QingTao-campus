/**
 * 线下交易控制器
 * 买家表达购买意向 → 卖家确认 → 见面交易 → 标记售出 → 双方互评
 * 纯线下交易，无支付功能
 */
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';
import { createNotification } from '../services/notification.service';

/** POST /api/trades/intent — 买家表达购买意向 */
export async function createIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user!.userId;
    const { goodsId, message } = req.body;

    if (!goodsId) return error(res, '请指定商品');

    const goods = await prisma.goods.findUnique({ where: { id: goodsId } });
    if (!goods) return error(res, '商品不存在', 404);
    if (goods.status === 'sold' || goods.status === 'offline') return error(res, '该商品已售出');
    if (goods.userId === buyerId) return error(res, '不能对自己发布的商品发送意向');
    if (goods.isDeleted) return error(res, '商品已删除');

    // 检查是否已经发送过意向
    const existing = await prisma.tradeIntent.findUnique({
      where: { goodsId_buyerId: { goodsId, buyerId } },
    });
    if (existing) return error(res, '你已经发送过购买意向，请耐心等待卖家回复');

    const intent = await prisma.tradeIntent.create({
      data: {
        goodsId,
        buyerId,
        sellerId: goods.userId,
        message: message?.trim()?.slice(0, 200) || '',
      },
    });

    // 通知卖家
    const buyer = await prisma.user.findUnique({ where: { id: buyerId }, select: { nickname: true } });
    createNotification({
      userId: goods.userId,
      type: 'trade_intent',
      title: '新的购买意向',
      content: `${buyer?.nickname || '有用户'} 对你的商品「${goods.title.slice(0, 30)}」表达了购买意向`,
      relatedId: intent.id,
    }).catch(() => {});

    return success(res, intent, '意向已发送', 201);
  } catch (err) {
    next(err);
  }
}

/** GET /api/trades/intents — 我的交易意向列表 */
export async function getMyIntents(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const role = String(req.query.role || ''); // 'buyer' | 'seller'
    const statusFilter = String(req.query.status || '');
    const page = Math.max(parseInt(String(req.query.page || '1')), 1);
    const pageSize = Math.min(parseInt(String(req.query.pageSize || '20')), 50);

    const where: any = {};
    if (role === 'seller') {
      where.sellerId = userId;
    } else {
      // 默认查看作为买家的意向；'buyer'明确查买家
      where.buyerId = userId;
    }
    if (statusFilter) where.status = statusFilter;

    const [list, total] = await Promise.all([
      prisma.tradeIntent.findMany({
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
      prisma.tradeIntent.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/trades/:id/accept — 卖家接受意向 */
export async function acceptIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.userId;
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的意向ID');

    const intent = await prisma.tradeIntent.findUnique({ where: { id } });
    if (!intent) return error(res, '意向不存在', 404);
    if (intent.sellerId !== sellerId) return error(res, '无权操作', 403);
    if (intent.status !== 'pending') return error(res, '该意向已被处理');

    await prisma.$transaction([
      prisma.tradeIntent.update({ where: { id }, data: { status: 'accepted' } }),
      prisma.goods.update({ where: { id: intent.goodsId }, data: { status: 'reserved' } }),
    ]);

    createNotification({
      userId: intent.buyerId,
      type: 'trade_accepted',
      title: '卖家已接受你的购买意向',
      content: '请通过私信与卖家沟通见面交易时间和地点',
      relatedId: intent.id,
    }).catch(() => {});

    return success(res, null, '已接受意向，请与买家沟通交易细节');
  } catch (err) {
    next(err);
  }
}

/** PUT /api/trades/:id/reject — 卖家拒绝意向 */
export async function rejectIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.userId;
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的意向ID');

    const intent = await prisma.tradeIntent.findUnique({ where: { id } });
    if (!intent) return error(res, '意向不存在', 404);
    if (intent.sellerId !== sellerId) return error(res, '无权操作', 403);
    if (intent.status !== 'pending') return error(res, '该意向已被处理');

    await prisma.tradeIntent.update({ where: { id }, data: { status: 'rejected' } });

    createNotification({
      userId: intent.buyerId,
      type: 'trade_rejected',
      title: '卖家拒绝了你的购买意向',
      content: '商品可能已被其他人预定，去看看其他商品吧',
      relatedId: intent.id,
    }).catch(() => {});

    return success(res, null, '已拒绝');
  } catch (err) {
    next(err);
  }
}

/** PUT /api/trades/:id/complete — 卖家标记交易完成 */
export async function completeTrade(req: Request, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user!.userId;
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的意向ID');

    const intent = await prisma.tradeIntent.findUnique({ where: { id } });
    if (!intent) return error(res, '意向不存在', 404);
    if (intent.sellerId !== sellerId) return error(res, '无权操作', 403);
    if (intent.status !== 'accepted') return error(res, '只有已接受的意向才能标记完成');

    await prisma.$transaction([
      prisma.tradeIntent.update({ where: { id }, data: { status: 'completed' } }),
      prisma.goods.update({ where: { id: intent.goodsId }, data: { status: 'sold' } }),
    ]);

    createNotification({
      userId: intent.buyerId,
      type: 'trade_completed',
      title: '交易完成，请评价',
      content: '请对你的交易体验进行评价，帮助其他同学了解卖家信誉',
      relatedId: intent.id,
    }).catch(() => {});

    return success(res, null, '交易已完成，等待双方互评');
  } catch (err) {
    next(err);
  }
}

/** POST /api/trades/:id/review — 提交交易评价 */
export async function submitReview(req: Request, res: Response, next: NextFunction) {
  try {
    const reviewerId = req.user!.userId;
    const id = parseInt(req.params.id as string);
    const { rating, comment } = req.body;

    if (isNaN(id)) return error(res, '无效的意向ID');
    if (!rating || rating < 1 || rating > 5) return error(res, '评分需在1-5之间');

    const intent = await prisma.tradeIntent.findUnique({ where: { id } });
    if (!intent) return error(res, '交易不存在', 404);
    if (intent.status !== 'completed') return error(res, '交易未完成，无法评价');
    if (intent.buyerId !== reviewerId && intent.sellerId !== reviewerId) {
      return error(res, '无权评价', 403);
    }

    // 判断评价方向
    const isBuyer = intent.buyerId === reviewerId;
    if ((isBuyer && intent.buyerRated) || (!isBuyer && intent.sellerRated)) {
      return error(res, '你已经评价过了');
    }

    const targetId = isBuyer ? intent.sellerId : intent.buyerId;
    const safeComment = (comment || '').trim().slice(0, 300);

    await prisma.$transaction([
      prisma.tradeReview.create({
        data: { tradeId: id, reviewerId, targetId, rating, comment: safeComment },
      }),
      prisma.tradeIntent.update({
        where: { id },
        data: isBuyer ? { buyerRated: true } : { sellerRated: true },
      }),
    ]);

    // 通知被评价方
    const reviewer = await prisma.user.findUnique({ where: { id: reviewerId }, select: { nickname: true } });
    createNotification({
      userId: targetId,
      type: 'new_review',
      title: '收到新评价',
      content: `${reviewer?.nickname || '对方'} 给你打了 ${rating} 星${safeComment ? '：' + safeComment.slice(0, 50) : ''}`,
      relatedId: id,
    }).catch(() => {});

    return success(res, null, '评价成功', 201);
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/:userId/reviews — 查看用户收到的评价 */
export async function getUserReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.userId as string);
    if (isNaN(userId)) return error(res, '无效的用户ID');

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);

    const [list, total, stats] = await Promise.all([
      prisma.tradeReview.findMany({
        where: { targetId: userId },
        include: {
          reviewer: { select: { id: true, nickname: true, avatarUrl: true } },
          trade: { select: { goods: { select: { id: true, title: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tradeReview.count({ where: { targetId: userId } }),
      prisma.tradeReview.aggregate({
        where: { targetId: userId },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return success(res, {
      list: list.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        reviewer: r.reviewer,
        goodsTitle: (r.trade as any)?.goods?.title || '',
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
      avgRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
      totalReviews: stats._count,
    });
  } catch (err) {
    next(err);
  }
}
