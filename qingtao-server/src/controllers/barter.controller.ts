import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';
import { createNotification } from '../services/notification.service';

/** POST /api/barter — 发起物品交换提议 */
export async function proposeBarter(req: Request, res: Response, next: NextFunction) {
  try {
    const fromUserId = req.user!.userId;
    const { fromGoodsId, toGoodsId, message } = req.body;

    if (!fromGoodsId || !toGoodsId) return error(res, '请选择交换的物品');
    if (fromGoodsId === toGoodsId) return error(res, '不能用自己的物品交换自己的物品');

    const [fromGoods, toGoods] = await Promise.all([
      prisma.goods.findUnique({ where: { id: fromGoodsId } }),
      prisma.goods.findUnique({ where: { id: toGoodsId } }),
    ]);
    if (!fromGoods || fromGoods.userId !== fromUserId) return error(res, '你的物品不存在', 404);
    if (!toGoods) return error(res, '目标物品不存在', 404);

    const exist = await prisma.barterProposal.findUnique({
      where: { fromGoodsId_toGoodsId: { fromGoodsId, toGoodsId } },
    });
    if (exist) return error(res, '已发送过交换提议');

    const proposal = await prisma.barterProposal.create({
      data: { fromGoodsId, toGoodsId, fromUserId, toUserId: toGoods.userId, message: message?.slice(0, 200) || '' },
    });

    createNotification({
      userId: toGoods.userId,
      type: 'barter',
      title: '新的物品交换提议',
      content: `有人想用「${fromGoods.title.slice(0, 15)}」换你的「${toGoods.title.slice(0, 15)}」`,
      relatedId: proposal.id,
    }).catch(() => {});

    return success(res, proposal, '交换提议已发送', 201);
  } catch (err) { next(err); }
}

/** GET /api/barter — 我的交换提议列表 */
export async function getProposals(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const role = req.query.role as string;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = 20;

    const where: any = {};
    if (role === 'sent') where.fromUserId = userId;
    else if (role === 'received') where.toUserId = userId;
    else where.OR = [{ fromUserId: userId }, { toUserId: userId }];

    const [list, total] = await Promise.all([
      prisma.barterProposal.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.barterProposal.count({ where }),
    ]);

    // 批量查关联数据
    const goodsIds = [...new Set([...list.map(p => p.fromGoodsId), ...list.map(p => p.toGoodsId)])];
    const userIds = [...new Set([...list.map(p => p.fromUserId), ...list.map(p => p.toUserId)])];
    const [goodsMap, userMap] = await Promise.all([
      prisma.goods.findMany({ where: { id: { in: goodsIds } }, select: { id: true, title: true, price: true, images: true } }).then(r => new Map(r.map(g => [g.id, g]))),
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true } }).then(r => new Map(r.map(u => [u.id, u]))),
    ]);

    return paginated(res, list.map(p => ({
      ...p, fromGoods: goodsMap.get(p.fromGoodsId), toGoods: goodsMap.get(p.toGoodsId),
      fromUser: userMap.get(p.fromUserId), toUser: userMap.get(p.toUserId),
    })), total, page, pageSize);
  } catch (err) { next(err); }
}

/** PATCH /api/barter/:id/accept */
export async function acceptBarter(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效ID');
    const p = await prisma.barterProposal.findUnique({ where: { id } });
    if (!p) return error(res, '不存在', 404);
    if (p.toUserId !== req.user!.userId) return error(res, '无权操作', 403);
    if (p.status !== 'pending') return error(res, '已处理');

    const updated = await prisma.barterProposal.update({ where: { id }, data: { status: 'accepted' } });
    createNotification({ userId: p.fromUserId, type: 'barter', title: '交换提议已接受', content: '对方同意了你的物品交换提议', relatedId: id }).catch(() => {});
    return success(res, updated, '已接受');
  } catch (err) { next(err); }
}

/** PATCH /api/barter/:id/reject */
export async function rejectBarter(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效ID');
    const p = await prisma.barterProposal.findUnique({ where: { id } });
    if (!p) return error(res, '不存在', 404);
    if (p.toUserId !== req.user!.userId) return error(res, '无权操作', 403);

    const updated = await prisma.barterProposal.update({ where: { id }, data: { status: 'rejected' } });
    createNotification({ userId: p.fromUserId, type: 'barter', title: '交换提议被拒绝', content: '对方拒绝了你的物品交换提议', relatedId: id }).catch(() => {});
    return success(res, updated, '已拒绝');
  } catch (err) { next(err); }
}