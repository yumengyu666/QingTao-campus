import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated, notFound } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';

/** GET /api/wanted — 求购列表 */
export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);
    const category = req.query.category as string;
    const campus = req.query.campus as string;

    const where: any = { isDeleted: false };
    if (category) where.category = category;
    if (campus) where.campus = campus;

    const [list, total] = await Promise.all([
      prisma.wantedItem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wantedItem.count({ where }),
    ]);

    // 批量查用户
    const userIds = [...new Set(list.map(w => w.userId))];
    const userMap = new Map((await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, avatarUrl: true },
    })).map(u => [u.id, u]));

    const data = list.map(w => ({
      ...w,
      images: JSON.parse(w.images || '[]'),
      user: userMap.get(w.userId) || null,
    }));

    return paginated(res, data, total, page, pageSize);
  } catch (err) { next(err); }
}

/** GET /api/wanted/:id — 求购详情 */
export async function getDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效ID');

    const item = await prisma.wantedItem.findUnique({ where: { id } });
    if (!item || item.isDeleted) return notFound(res, '求购信息不存在');

    // 浏览+1
    prisma.wantedItem.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    const user = await prisma.user.findUnique({
      where: { id: item.userId },
      select: { id: true, nickname: true, avatarUrl: true },
    });

    return success(res, { ...item, images: JSON.parse(item.images || '[]'), user });
  } catch (err) { next(err); }
}

/** POST /api/wanted — 发布求购 */
export async function createWanted(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, category, campus, budget, description, images } = req.body;
    if (!title?.trim()) return error(res, '请输入标题');
    if (title.length > 50) return error(res, '标题最多50字');
    if (containsSensitive(title)) return error(res, '标题包含违规内容');
    if (description && containsSensitive(description)) return error(res, '描述包含违规内容');

    const item = await prisma.wantedItem.create({
      data: {
        userId: req.user!.userId,
        title: title.trim(),
        category: category || '',
        campus: campus || '',
        budget: budget ? parseFloat(budget) : null,
        description: description?.trim() || '',
        images: JSON.stringify(images || []),
      },
    });

    return success(res, item, '发布成功', 201);
  } catch (err) { next(err); }
}

/** DELETE /api/wanted/:id */
export async function deleteWanted(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效ID');

    const item = await prisma.wantedItem.findUnique({ where: { id } });
    if (!item) return notFound(res, '求购信息不存在');
    if (item.userId !== req.user!.userId) return error(res, '无权操作', 403);

    await prisma.wantedItem.update({ where: { id }, data: { isDeleted: true } });
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}
