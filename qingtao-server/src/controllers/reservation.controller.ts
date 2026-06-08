import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';
import { createNotification } from '../services/notification.service';
import { logger } from '../utils/logger';

const RESERVATION_TTL_HOURS = 24;

/** POST /api/reservations — 买家预约看货 */
export async function createReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user!.userId;
    const { goodsId, message } = req.body;

    if (!goodsId) return error(res, '请指定商品');

    const goods = await prisma.goods.findUnique({ where: { id: goodsId } });
    if (!goods || goods.isDeleted) return error(res, '商品不存在', 404);
    if (goods.userId === buyerId) return error(res, '不能预约自己的商品');
    if (goods.status !== 'approved') return error(res, '该商品当前不可预约');

    // 检查是否已有预约
    const exist = await prisma.reservation.findUnique({
      where: { goodsId_buyerId: { goodsId, buyerId } },
    });
    if (exist) {
      if (exist.status === 'pending') return error(res, '你已预约过该商品，请等待卖家回复');
      if (exist.status === 'accepted') return error(res, '卖家已接受你的预约');
    }

    const expiresAt = new Date(Date.now() + RESERVATION_TTL_HOURS * 60 * 60 * 1000);

    const reservation = await prisma.reservation.create({
      data: {
        goodsId,
        buyerId,
        sellerId: goods.userId,
        message: message?.trim()?.slice(0, 200) || '想约时间看看实物',
        expiresAt,
      },
    });

    // 通知卖家
    createNotification({
      userId: goods.userId,
      type: 'reservation',
      title: '新的预约看货请求',
      content: `有人想预约看你的商品「${goods.title.slice(0, 20)}」`,
      relatedId: reservation.id,
    }).catch(() => {});

    return success(res, reservation, '预约成功，等待卖家确认', 201);
  } catch (err) { next(err); }
}

/** GET /api/reservations — 我的预约列表（买家+卖家） */
export async function getMyReservations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const role = req.query.role as string; // 'buyer' | 'seller'
    const status = req.query.status as string;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);

    const where: any = {};
    if (role === 'buyer') where.buyerId = userId;
    else if (role === 'seller') where.sellerId = userId;
    else where.OR = [{ buyerId: userId }, { sellerId: userId }];
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reservation.count({ where }),
    ]);

    // 批量查关联数据
    const goodsIds = [...new Set(list.map(r => r.goodsId))];
    const userIds = [...new Set([...list.map(r => r.buyerId), ...list.map(r => r.sellerId)])];
    const [goodsMap, userMap] = await Promise.all([
      prisma.goods.findMany({ where: { id: { in: goodsIds } }, select: { id: true, title: true, price: true, images: true, status: true } }).then(rows => new Map(rows.map(g => [g.id, g]))),
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, avatarUrl: true } }).then(rows => new Map(rows.map(u => [u.id, u]))),
    ]);

    const data = list.map(r => ({
      ...r,
      goods: goodsMap.get(r.goodsId) || null,
      buyer: userMap.get(r.buyerId) || null,
      seller: userMap.get(r.sellerId) || null,
    }));

    return paginated(res, data, total, page, pageSize);
  } catch (err) { next(err); }
}

/** PATCH /api/reservations/:id/accept — 卖家接受预约 */
export async function acceptReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的预约ID');

    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) return error(res, '预约不存在', 404);
    if (reservation.sellerId !== req.user!.userId) return error(res, '无权操作', 403);
    if (reservation.status !== 'pending') return error(res, '该预约已处理');

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: 'accepted' },
    });

    // 商品标记为已预定
    await prisma.goods.update({
      where: { id: reservation.goodsId },
      data: { status: 'reserved' },
    });

    // 通知买家
    createNotification({
      userId: reservation.buyerId,
      type: 'reservation',
      title: '预约已被接受',
      content: '卖家已接受你的预约看货请求，请通过私信联系',
      relatedId: id,
    }).catch(() => {});

    return success(res, updated, '已接受预约');
  } catch (err) { next(err); }
}

/** PATCH /api/reservations/:id/reject — 卖家拒绝预约 */
export async function rejectReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的预约ID');

    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) return error(res, '预约不存在', 404);
    if (reservation.sellerId !== req.user!.userId) return error(res, '无权操作', 403);
    if (reservation.status !== 'pending') return error(res, '该预约已处理');

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: 'rejected' },
    });

    createNotification({
      userId: reservation.buyerId,
      type: 'reservation',
      title: '预约已被拒绝',
      content: '卖家暂时无法接受你的预约，去看看其他商品吧',
      relatedId: id,
    }).catch(() => {});

    return success(res, updated, '已拒绝');
  } catch (err) { next(err); }
}

/** DELETE /api/reservations/:id — 买家取消预约 */
export async function cancelReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的预约ID');

    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) return error(res, '预约不存在', 404);
    if (reservation.buyerId !== req.user!.userId) return error(res, '无权操作', 403);
    if (!['pending', 'accepted'].includes(reservation.status)) return error(res, '该预约不可取消');

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    // 如果已被接受，取消预约后恢复商品状态
    if (reservation.status === 'accepted') {
      await prisma.goods.update({
        where: { id: reservation.goodsId },
        data: { status: 'approved' },
      });
    }

    return success(res, updated, '已取消');
  } catch (err) { next(err); }
}

/** 定时任务：释放过期预约 */
export async function expireReservations() {
  const result = await prisma.reservation.updateMany({
    where: {
      status: 'pending',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  });
  if (result.count > 0) {
    logger.info(`Reservation expire: ${result.count} expired`);
  }
}
