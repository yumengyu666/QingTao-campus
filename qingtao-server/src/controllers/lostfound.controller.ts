import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated, notFound } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { hasContactMethod } from '../utils/contact';
import { createNotification } from '../services/notification.service';
import { linkImageReviews } from '../utils/images';

// 浏览量去重
const viewDedup = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of viewDedup) { if (now - t > 30 * 60 * 1000) viewDedup.delete(k); }
}, 10 * 60 * 1000).unref();

// GET /api/lostfound — 失物列表
export async function getLostFoundList(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);
    const type = req.query.type as string; // lost | found
    const keyword = req.query.keyword as string;

    const where: any = { isDeleted: false, status: { in: ['approved', 'pending'] } };
    if (type && (type === 'lost' || type === 'found')) where.type = type;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { location: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.lostFound.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lostFound.count({ where }),
    ]);

    const data = list.map(lf => ({
      ...lf,
      images: JSON.parse(lf.images || '[]'),
    }));

    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// POST /api/lostfound — 发布失物招领
export async function createLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, title, description, images, campus, location, lostTime, contactWechat, contactQq, reward } = req.body;

    if (!title?.trim()) return error(res, '请输入标题');
    if (!type || !['lost', 'found'].includes(type)) return error(res, '请选择类型');
    if (containsSensitive(title)) return error(res, '标题包含违规内容');
    if (description && containsSensitive(description)) return error(res, '描述包含违规内容');

    // 检查联系方式（仅提醒，不拦截）
    await hasContactMethod(req.user!.userId); // check but don't block

    const item = await prisma.lostFound.create({
      data: {
        userId: req.user!.userId,
        type,
        title: title.trim(),
        description: description || '',
        images: JSON.stringify(images || []),
        campus: campus || 'kexue',
        location: location || '',
        lostTime: lostTime || '',
        contactWechat: contactWechat || '',
        contactQq: contactQq || '',
        reward: reward || '',
        status: 'pending',
      },
    });

    // 关联图片审核记录
    await linkImageReviews(images, 'lostfound', item.id);

    // 后台 AI 审核
    const { afterCreate } = await import('../middleware/moderation.middleware');
    afterCreate('lostfound', item.id, req.user!.userId, [
      { field: 'title', text: title },
      { field: 'description', text: description || '' },
    ]);

    return success(res, item, '已提交审核，通过后将公开展示', 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/lostfound/:id — 详情
export async function getLostFoundDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的ID');

    const item = await prisma.lostFound.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    if (!item) return notFound(res);
    
    const isOwner = req.user && req.user.userId === item.userId;
    const isAdmin = req.user && req.user.role === 'admin';
    
    // 待审核/已拒绝内容仅作者和管理员可见（防 URL 遍历）
    if (!isOwner && !isAdmin && ['pending', 'rejected'].includes(item.status)) return notFound(res);
    if (!isOwner && !isAdmin && !['approved', 'resolved'].includes(item.status)) return notFound(res);

    // 浏览量+1（作者本人不增加；IP去重）
    if (!req.user || req.user.userId !== item.userId) {
      const viewerIp = req.ip || req.socket.remoteAddress || 'unknown';
      const viewKey = `lf:${id}:${viewerIp}`;
      if (!viewDedup.has(viewKey)) {
        viewDedup.set(viewKey, Date.now());
        await prisma.lostFound.update({ where: { id }, data: { viewCount: { increment: 1 } } });
      }
    }

    return success(res, { ...item, images: JSON.parse(item.images || '[]') });
  } catch (err) {
    next(err);
  }
}

// PUT /api/lostfound/:id — 编辑失物招领
export async function updateLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的失物ID');
    const item = await prisma.lostFound.findUnique({ where: { id } });
    if (!item) return notFound(res);
    if (item.userId !== req.user!.userId) return error(res, '无权操作', 403);

    const { title, description, images, campus, location, lostTime, contactWechat, contactQq, reward, type } = req.body;
    if (title && containsSensitive(title)) return error(res, '标题包含违规内容');

    const updated = await prisma.lostFound.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(images !== undefined && { images: JSON.stringify(images) }),
        ...(campus !== undefined && { campus }),
        ...(location !== undefined && { location }),
        ...(lostTime !== undefined && { lostTime }),
        ...(contactWechat !== undefined && { contactWechat }),
        ...(contactQq !== undefined && { contactQq }),
        ...(reward !== undefined && { reward }),
        ...(type !== undefined && { type }),
        status: item.status,
        reviewComment: '',
      },
    });

    // L2 AI 异步审核编辑后的内容
    const text = [updated.title, updated.description].filter(Boolean).join(' ');
    if (text) {
      const { afterCreate } = await import('../middleware/moderation.middleware');
      afterCreate('lostfound', updated.id, req.user!.userId, [
        { field: 'title', text: updated.title },
        { field: 'description', text: updated.description || '' },
      ]);
    }

    return success(res, updated, '修改成功');
  } catch (err) {
    next(err);
  }
}

// PATCH /api/lostfound/:id/resolve — 标记已解决
export async function resolveLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的失物ID');
    const item = await prisma.lostFound.findUnique({ where: { id } });
    if (!item) return notFound(res);
    if (item.userId !== req.user!.userId) return error(res, '无权操作', 403);

    await prisma.lostFound.update({ where: { id }, data: { status: 'resolved' } });
    return success(res, null, '已标记为已解决');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/lostfound/:id — 删除
export async function deleteLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const item = await prisma.lostFound.findUnique({ where: { id } });
    if (!item) return notFound(res);
    if (item.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);

    await prisma.lostFound.update({ where: { id }, data: { isDeleted: true } });
    await prisma.notification.deleteMany({ where: { relatedId: id } });

    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

// GET /api/lostfound/:id/comments — 评论列表
export async function getLostFoundComments(req: Request, res: Response, next: NextFunction) {
  try {
    const lostFoundId = parseInt(req.params.id as string);
    if (isNaN(lostFoundId)) return error(res, '无效的失物ID');
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;
    const currentUserId = req.user?.userId;

    const where: any = { lostFoundId };
    if (currentUserId) {
      where.OR = [
        { status: 'approved' },
        { userId: currentUserId },
      ];
    } else {
      where.status = 'approved';
    }

    const [list, total] = await Promise.all([
      prisma.lostFoundComment.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lostFoundComment.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// POST /api/lostfound/:id/comments — 发表评论
export async function createLostFoundComment(req: Request, res: Response, next: NextFunction) {
  try {
    const lostFoundId = parseInt(req.params.id as string);
    if (isNaN(lostFoundId)) return error(res, '无效的失物ID');
    const { content } = req.body;

    if (!content?.trim()) return error(res, '请输入评论内容');
    if (content.length > 500) return error(res, '评论最多500字');
    if (containsSensitive(content)) return error(res, '评论包含违规内容');

    const item = await prisma.lostFound.findUnique({ where: { id: lostFoundId } });
    if (!item) return notFound(res);

    const comment = await prisma.lostFoundComment.create({
      data: {
        lostFoundId,
        userId: req.user!.userId,
        content: content.trim(),
        status: 'pending',
      },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    // 通知失物招领发布者
    if (item.userId !== req.user!.userId) {
      await createNotification({
        userId: item.userId,
        type: 'new_comment',
        title: `有人评论了"${item.title}"`,
        content: `${req.user!.username} 评论：${content.trim().substring(0, 50)}`,
        relatedId: lostFoundId,
      });
    }

    // L2 AI 异步审核（必须在 return 之前）
    const { aiModerate } = await import('../services/moderation.service');
    aiModerate(content, { contentType: 'lostfound_comment', userId: req.user!.userId }).then(async (result) => {
      if (result === 'violation') {
        const { logger } = await import('../utils/logger');
        logger.warn(`AI flagged lostfound comment #${comment.id}, hiding`);
        prisma.lostFoundComment.update({ where: { id: comment.id }, data: { status: 'offline' } }).catch(() => {});
      } else if (result === 'safe') {
        prisma.lostFoundComment.update({ where: { id: comment.id }, data: { status: 'approved' } }).catch(() => {});
      }
      // result === 'error': AI 审核失败，保持 pending，不自动通过
    });

    return success(res, comment, '评论成功', 201);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/lostfound/:id/comments/:commentId — 删除评论
export async function deleteLostFoundComment(req: Request, res: Response, next: NextFunction) {
  try {
    const commentId = parseInt(req.params.commentId as string);
    if (isNaN(commentId)) return error(res, '无效的评论ID');
    const comment = await prisma.lostFoundComment.findUnique({ where: { id: commentId } });
    if (!comment) return notFound(res, '评论不存在');
    if (comment.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);

    await prisma.lostFoundComment.delete({ where: { id: commentId } });
    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}
