import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';

/** POST /api/block/:userId — 拉黑用户 */
export async function blockUser(req: Request, res: Response, next: NextFunction) {
  try {
    const blockerId = req.user!.userId;
    const blockedId = parseInt(req.params.userId as string);
    if (isNaN(blockedId)) return error(res, '无效的用户ID');

    if (blockerId === blockedId) return error(res, '不能拉黑自己');

    const target = await prisma.user.findUnique({ where: { id: blockedId } });
    if (!target) return error(res, '用户不存在', 404);

    const existing = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existing) return success(res, null, '已拉黑该用户');

    await prisma.block.create({ data: { blockerId, blockedId } });
    return success(res, null, '已拉黑');
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/block/:userId — 取消拉黑 */
export async function unblockUser(req: Request, res: Response, next: NextFunction) {
  try {
    const blockerId = req.user!.userId;
    const blockedId = parseInt(req.params.userId as string);
    if (isNaN(blockedId)) return error(res, '无效的用户ID');

    const existing = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (!existing) return error(res, '未拉黑该用户');

    await prisma.block.delete({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    return success(res, null, '已取消拉黑');
  } catch (err) {
    next(err);
  }
}

/** GET /api/block — 获取拉黑列表 */
export async function getBlockedList(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);

    const [list, total] = await Promise.all([
      prisma.block.findMany({
        where: { blockerId: userId },
        include: {
          blocked: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.block.count({ where: { blockerId: userId } }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}
