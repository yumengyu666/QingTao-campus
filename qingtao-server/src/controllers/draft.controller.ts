import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error } from '../utils/response';

/**
 * POST /api/drafts — 保存草稿
 */
export async function saveDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, data } = req.body; // type: goods|post|lostfound, data: JSON
    if (!type || !data) return error(res, '参数不完整');

    const existing = await prisma.draft.findFirst({
      where: { userId: req.user!.userId, type },
    });

    if (existing) {
      await prisma.draft.update({
        where: { id: existing.id },
        data: { data: JSON.stringify(data) },
      });
    } else {
      await prisma.draft.create({
        data: { userId: req.user!.userId, type, data: JSON.stringify(data) },
      });
    }

    return success(res, null, '草稿已保存');
  } catch (err) { next(err); }
}

/**
 * GET /api/drafts/:type — 获取草稿
 */
export async function getDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.params.type as string;
    const draft = await prisma.draft.findFirst({
      where: { userId: req.user!.userId, type },
    });
    if (!draft) return success(res, null);

    let data;
    try { data = JSON.parse(draft.data); } catch { data = {}; }
    return success(res, { id: draft.id, type: draft.type, data, updatedAt: draft.updatedAt });
  } catch (err) { next(err); }
}

/**
 * DELETE /api/drafts/:type — 删除草稿
 */
export async function deleteDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.params.type as string;
    await prisma.draft.deleteMany({ where: { userId: req.user!.userId, type } });
    return success(res, null, '草稿已删除');
  } catch (err) { next(err); }
}
