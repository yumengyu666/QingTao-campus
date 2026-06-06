import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';

/**
 * GET /api/admin/images?status=pending&page=1 — 图片审核列表
 */
export async function getImages(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = 20;
    const status = req.query.status as string || 'pending';

    const where: any = { status };
    const [list, total] = await Promise.all([
      prisma.imageReview.findMany({
        where,
        include: { uploader: { select: { id: true, nickname: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.imageReview.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

import { approveReview, rejectReview } from '../services/review.service';

/**
 * POST /api/admin/images/:id/approve — 审核通过单张图片
 */
export async function approveImage(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的图片ID');
    await approveReview('image' as any, id, req.user!.userId);
    return success(res, null, '已通过');
  } catch (err) { next(err); }
}

/**
 * POST /api/admin/images/:id/reject — 审核拒绝单张图片
 */
export async function rejectImage(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的图片ID');
    await rejectReview('image' as any, id, req.user!.userId, req.body.reason || '管理员拒绝');
    return success(res, null, '已拒绝');
  } catch (err) { next(err); }
}

/**
 * POST /api/admin/images/batch — 批量审核图片
 */
export async function batchImageReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return error(res, '请提供图片ID列表');
    if (!['approve', 'reject'].includes(action)) return error(res, '无效的操作');
    if (ids.length > 50) return error(res, '单次最多50张');

    const adminId = req.user!.userId;
    let count = 0;
    for (const id of ids) {
      try {
        if (action === 'approve') await approveReview('image' as any, id, adminId);
        else await rejectReview('image' as any, id, adminId, '管理员批量拒绝');
        count++;
      } catch { /* skip */ }
    }
    return success(res, { processed: count }, `已${action === 'approve' ? '通过' : '拒绝'} ${count} 张`);
  } catch (err) { next(err); }
}

/**
 * GET /api/admin/stats/review — 审核统计
 */
export async function getReviewStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [pending, approvedToday, rejectedToday] = await Promise.all([
      prisma.imageReview.count({ where: { status: 'pending' } }),
      prisma.imageReview.count({ where: { status: 'approved', createdAt: { gte: today } } }),
      prisma.imageReview.count({ where: { status: 'rejected', createdAt: { gte: today } } }),
    ]);
    const contentPending = await prisma.goods.count({ where: { status: 'pending', isDeleted: false } })
      + await prisma.post.count({ where: { status: 'pending', isDeleted: false } })
      + await prisma.lostFound.count({ where: { status: 'pending', isDeleted: false } });

    return success(res, {
      imagePending: pending,
      imageApprovedToday: approvedToday,
      imageRejectedToday: rejectedToday,
      contentPending,
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/images/status — 批量查询图片审核状态
 */
export async function checkStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) return success(res, []);
    const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n)).slice(0, 50);
    if (ids.length === 0) return success(res, []);

    const images = await prisma.imageReview.findMany({
      where: { id: { in: ids } },
      select: { id: true, url: true, blurredUrl: true, status: true },
    });
    return success(res, images);
  } catch (err) { next(err); }
}
