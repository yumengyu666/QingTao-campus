import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, notFound } from '../utils/response';

// GET /api/cart — 购物车列表
export async function getCartList(req: Request, res: Response, next: NextFunction) {
  try {
    const list = await prisma.cartItem.findMany({
      where: { userId: req.user!.userId },
      include: {
        goods: {
          include: {
            user: { select: { id: true, nickname: true, wechat: true, qq: true } },
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

    return success(res, data);
  } catch (err) {
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
export async function addToCart(req: Request, res: Response, next: NextFunction) {
  try {
    const { goodsId } = req.body;
    if (!goodsId) return error(res, '缺少goodsId');

    const goods = await prisma.goods.findUnique({ where: { id: goodsId } });
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.status === 'sold') return error(res, '该商品已售出');
    if (goods.userId === req.user!.userId) return error(res, '不能添加自己的商品');

    const exist = await prisma.cartItem.findUnique({
      where: { userId_goodsId: { userId: req.user!.userId, goodsId } },
    });
    if (exist) return success(res, null, '已在购物车中');

    const item = await prisma.cartItem.create({
      data: { userId: req.user!.userId, goodsId },
    });

    return success(res, item, '已加入购物车');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/cart/:id — 移除购物车
export async function removeFromCart(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return notFound(res);
    const item = await prisma.cartItem.findUnique({ where: { id } });
    if (!item) return notFound(res);
    if (item.userId !== req.user!.userId) return error(res, '无权操作', 403);

    await prisma.cartItem.delete({ where: { id } });

    return success(res, null, '已移除');
  } catch (err) {
    next(err);
  }
}

// GET /api/cart/count — 购物车数量
export async function getCartCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await prisma.cartItem.count({ where: { userId: req.user!.userId } });
    return success(res, { count });
  } catch (err) {
    next(err);
  }
}
