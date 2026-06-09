import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';

// 内存中存储最近浏览（最多保留100条/用户，重启清空）
const viewCache = new Map<number, { goodsId: number; timestamp: number }[]>();
const MAX_VIEWS = 100;

function recordView(userId: number, goodsId: number) {
  const views = viewCache.get(userId) || [];
  // 去重：移除同一商品的旧记录
  const filtered = views.filter(v => v.goodsId !== goodsId);
  filtered.unshift({ goodsId, timestamp: Date.now() });
  // 限制数量
  if (filtered.length > MAX_VIEWS) filtered.length = MAX_VIEWS;
  viewCache.set(userId, filtered);
}

// GET /api/history/views — 最近浏览
export async function getRecentViews(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const views = viewCache.get(userId) || [];
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);

    const start = (page - 1) * pageSize;
    const paged = views.slice(start, start + pageSize);

    // 批量加载商品信息
    const goodsIds = paged.map(v => v.goodsId);
    const goodsList = goodsIds.length > 0 ? await prisma.goods.findMany({
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

    return paginated(res, data, views.length, page, pageSize);
  } catch (err) { next(err); }
}

// GET /api/history/views/:goodsId — 记录浏览
export async function trackView(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const goodsId = parseInt(req.params.goodsId as string);
    if (isNaN(goodsId)) return error(res, '无效的商品ID');
    recordView(userId, goodsId);
    return success(res, null, 'ok');
  } catch (err) { next(err); }
}
