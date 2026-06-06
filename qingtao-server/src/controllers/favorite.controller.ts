import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated, notFound } from '../utils/response';

// GET /api/favorites — 收藏列表
export async function getFavoritesList(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;

    const [list, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: req.user!.userId },
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
      prisma.favorite.count({ where: { userId: req.user!.userId } }),
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

    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// POST /api/favorites — 收藏
export async function addFavorite(req: Request, res: Response, next: NextFunction) {
  try {
    const { goodsId } = req.body;
    if (!goodsId) return error(res, '缺少goodsId');

    const goods = await prisma.goods.findUnique({ where: { id: goodsId } });
    if (!goods || goods.isDeleted) return notFound(res, '商品不存在');
    if (goods.status === 'sold') return error(res, '该商品已售出');

    const exist = await prisma.favorite.findUnique({
      where: { userId_goodsId: { userId: req.user!.userId, goodsId } },
    });
    if (exist) return success(res, null, '已收藏该商品');

    const favorite = await prisma.favorite.create({
      data: { userId: req.user!.userId, goodsId },
    });

    return success(res, favorite, '已收藏');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/favorites/:id — 取消收藏
export async function removeFavorite(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const favorite = await prisma.favorite.findUnique({ where: { id } });
    if (!favorite) return notFound(res);
    if (favorite.userId !== req.user!.userId) return error(res, '无权操作', 403);

    await prisma.favorite.delete({ where: { id } });

    return success(res, null, '已取消收藏');
  } catch (err) {
    next(err);
  }
}

// GET /api/favorites/check/:goodsId — 检查是否已收藏
export async function checkFavorite(req: Request, res: Response, next: NextFunction) {
  try {
    const goodsId = parseInt(req.params.goodsId as string);
    const exist = await prisma.favorite.findUnique({
      where: { userId_goodsId: { userId: req.user!.userId, goodsId } },
    });
    return success(res, { favorited: !!exist });
  } catch (err) {
    next(err);
  }
}
