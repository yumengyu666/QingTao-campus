/**
 * 失物招领 Controller — 薄层
 * 业务逻辑已提取到 lostfound.service.ts
 */
import { Request, Response, NextFunction } from 'express';
import { success, error, paginated, notFound } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { hasContactMethod } from '../utils/contact';
import { createNotification } from '../services/notification.service';
import { linkImageReviews } from '../utils/images';
import { aiModerate } from '../services/moderation.service';
import { logger } from '../utils/logger';
import * as lfSvc from '../services/lostfound.service';

const viewDedup = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of viewDedup) { if (now - t > 30 * 60 * 1000) viewDedup.delete(k); }
}, 10 * 60 * 1000).unref();

// GET /api/lostfound
export async function getLostFoundList(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query as Record<string, string>;
    const page = parseInt(q.page) || 1;
    const pageSize = Math.min(parseInt(q.pageSize) || 20, 50);
    const { list, total } = await lfSvc.findLostFoundList({ type: q.type, campusArea: q.campusArea, status: q.status, keyword: q.keyword, page, pageSize });
    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

// POST /api/lostfound
export async function createLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, description, type, campusArea, images, location, lostTime, reward, contactName, wechat, qq, phone } = req.body;
    if (containsSensitive(title)) return error(res, '标题包含违规内容');
    if (description && containsSensitive(description)) return error(res, '描述包含违规内容');
    const hasContact = await hasContactMethod(req.user!.userId);
    const contactHint = hasContact ? '' : '（建议填写联系方式）';

    const item = await lfSvc.createLostFound({ userId: req.user!.userId, title: title.trim(), description, type, campusArea, images, location, lostTime, reward, contactName, wechat, qq, phone });
    await linkImageReviews(images, 'lostfound', item.id);

    const { afterCreate } = await import('../middleware/moderation.middleware');
    afterCreate('lostfound', item.id, req.user!.userId, [{ field: 'title', text: title }, { field: 'description', text: description || '' }]);

    return success(res, item, `发布成功${contactHint}`, 201);
  } catch (err) { next(err); }
}

// GET /api/lostfound/:id
export async function getLostFoundDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的ID');
    const item = await lfSvc.findLostFoundById(id);
    if (!item) return notFound(res, '失物信息不存在');
    const isOwner = req.user?.userId === item.userId;
    const isAdmin = req.user?.role === 'admin';
    if (item.isDeleted && !isOwner && !isAdmin) return notFound(res, '失物信息不存在');
    if (!isOwner && !isAdmin && !['pending', 'resolved', 'approved'].includes(item.status)) return notFound(res, '失物信息不存在');

    if (!isOwner) {
      const viewerIp = req.ip || req.socket.remoteAddress || 'unknown';
      const viewKey = `lf:${id}:${viewerIp}`;
      if (!viewDedup.has(viewKey)) { viewDedup.set(viewKey, Date.now()); await lfSvc.incrementLostFoundView(id); }
    }
    return success(res, { ...item, images: JSON.parse(item.images || '[]') });
  } catch (err) { next(err); }
}

// PUT /api/lostfound/:id
export async function updateLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const item = await lfSvc.findLostFoundById(id);
    if (!item || item.isDeleted) return notFound(res, '失物信息不存在');
    if (item.userId !== req.user!.userId) return error(res, '无权操作', 403);
    if (req.body.title && containsSensitive(req.body.title)) return error(res, '标题包含违规内容');
    const updated = await lfSvc.updateLostFound(id, req.body);
    // 编辑后重新过 AI 审核（#87 补充：防止编辑绕过 L2 审核）
    const { afterCreate } = await import('../middleware/moderation.middleware');
    afterCreate('lostfound', updated.id, req.user!.userId, [
      { field: 'title', text: updated.title },
      { field: 'description', text: updated.description || '' },
    ]);
    return success(res, updated, '修改成功');
  } catch (err) { next(err); }
}

// DELETE /api/lostfound/:id
export async function deleteLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const item = await lfSvc.findLostFoundById(id);
    if (!item || item.isDeleted) return notFound(res, '失物信息不存在');
    if (item.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);
    await lfSvc.softDeleteLostFound(id);
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}

// PATCH /api/lostfound/:id/resolve
export async function resolveLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const item = await lfSvc.findLostFoundById(id);
    if (!item || item.isDeleted) return notFound(res, '失物信息不存在');
    if (item.userId !== req.user!.userId) return error(res, '无权操作', 403);
    if (item.status === 'resolved') return error(res, '已标记为解决');
    await lfSvc.resolveLostFound(id);
    return success(res, null, '已标记为解决');
  } catch (err) { next(err); }
}

// GET /api/lostfound/:id/comments
export async function getLostFoundComments(req: Request, res: Response, next: NextFunction) {
  try {
    const itemId = parseInt(req.params.id as string);
    if (isNaN(itemId)) return error(res, '无效的ID');
    const page = parseInt(req.query.page as string) || 1;
    const [list, total] = await lfSvc.findLostFoundComments(itemId, req.user?.userId, page);
    return paginated(res, list, total, page, 20);
  } catch (err) { next(err); }
}

// POST /api/lostfound/:id/comments
export async function createLostFoundComment(req: Request, res: Response, next: NextFunction) {
  try {
    const itemId = parseInt(req.params.id as string);
    if (isNaN(itemId)) return error(res, '无效的ID');
    const { content } = req.body;
    if (containsSensitive(content)) return error(res, '评论包含违规内容');
    const item = await lfSvc.findLostFoundById(itemId);
    if (!item || item.isDeleted) return notFound(res, '失物信息不存在');
    const comment = await lfSvc.createLostFoundComment(itemId, req.user!.userId, content.trim());
    if (item.userId !== req.user!.userId) {
      createNotification({ userId: item.userId, type: 'new_comment', title: '失物招领有新回复', content: `${req.user!.username} 评论：${content.trim().substring(0, 50)}`, relatedId: itemId }).catch(() => {});
    }

    // L2 AI 异步审核评论内容
    aiModerate(content.trim(), { contentType: 'lostfound_comment', userId: req.user!.userId }).then(result => {
      if (result === 'violation') {
        logger.warn(`AI flagged lostfound comment #${comment.id}, deleting`);
        lfSvc.deleteLostFoundComment(comment.id).catch(() => {});
      }
    });

    return success(res, comment, '评论成功', 201);
  } catch (err) { next(err); }
}

// DELETE /api/lostfound/:id/comments/:commentId
export async function deleteLostFoundComment(req: Request, res: Response, next: NextFunction) {
  try {
    const commentId = parseInt(req.params.commentId as string);
    if (isNaN(commentId)) return error(res, '无效的评论ID');
    const comment = await lfSvc.findLostFoundCommentById(commentId);
    if (!comment) return notFound(res, '评论不存在');
    if (comment.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);
    await lfSvc.deleteLostFoundComment(commentId);
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}
