import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated, notFound } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { createNotification } from '../services/notification.service';
import { linkImageReviews } from '../utils/images';
import { hasContactMethod } from '../utils/contact';

// 浏览量去重 Map
const viewDedup = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of viewDedup) { if (now - t > 30 * 60 * 1000) viewDedup.delete(k); }
}, 10 * 60 * 1000).unref();

// GET /api/posts — 帖子列表
export async function getPostList(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);
    const sort = req.query.sort as string;
    const keyword = req.query.keyword as string;

    const where: any = { isDeleted: false, status: { in: ['approved', 'pending'] } };
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'hot') orderBy = { viewCount: 'desc' };

    const [list, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      prisma.post.count({ where }),
    ]);

    const data = list.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
    }));

    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// POST /api/posts — 发布帖子
export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, images } = req.body;

    if (!title?.trim()) return error(res, '请输入帖子标题');
    if (title.length > 100) return error(res, '标题最多100字');
    if (containsSensitive(title)) return error(res, '标题包含违规内容');
    if (content && containsSensitive(content)) return error(res, '内容包含违规内容');

    // 检查联系方式（仅提醒，不拦截）
    const hasContact = await hasContactMethod(req.user!.userId);

    const post = await prisma.post.create({
      data: {
        userId: req.user!.userId,
        title: title.trim(),
        content: content || '',
        images: JSON.stringify(images || []),
        status: 'pending',
      },
    });
    await linkImageReviews(req.body.images, 'posts', post.id);

    // 后台 AI 审核
    const { afterCreate } = await import('../middleware/moderation.middleware');
    afterCreate('post', post.id, req.user!.userId, [
      { field: 'title', text: title },
      { field: 'content', text: content || '' },
    ]);

    return success(res, post, '已提交审核，通过后将公开展示', 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/:id — 帖子详情
export async function getPostDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的帖子ID');

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    if (!post) return notFound(res, '帖子不存在');

    const isOwner = req.user && req.user.userId === post.userId;
    const isAdmin = req.user && req.user.role === 'admin';

    if (post.isDeleted && !isOwner && !isAdmin) return notFound(res, '帖子不存在');
    
    // 待审核/已拒绝内容仅作者和管理员可见（防 URL 遍历）
    if (!isOwner && !isAdmin && ['pending', 'rejected'].includes(post.status)) return notFound(res, '帖子不存在');
    if (!isOwner && !isAdmin && !['approved'].includes(post.status)) return notFound(res, '帖子不存在');

    // 浏览量+1（作者本人不增加；IP去重）
    if (!isOwner) {
      const viewerIp = req.ip || req.socket.remoteAddress || 'unknown';
      const viewKey = `post:${id}:${viewerIp}`;
      if (!viewDedup.has(viewKey)) {
        viewDedup.set(viewKey, Date.now());
        await prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });
      }
    }

    return success(res, { ...post, images: JSON.parse(post.images || '[]') });
  } catch (err) {
    next(err);
  }
}

// PUT /api/posts/:id — 编辑帖子
export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的帖子ID');
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.isDeleted) return notFound(res, '帖子不存在');
    if (post.userId !== req.user!.userId) return error(res, '无权操作', 403);

    const { title, content, images } = req.body;
    if (title && containsSensitive(title)) return error(res, '标题包含违规内容');

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content }),
        ...(images !== undefined && { images: JSON.stringify(images) }),
        status: post.status,
        reviewComment: '',
        updatedAt: new Date(),
      },
    });

    // L2 AI 异步审核编辑后的内容
    const text = [updated.title, updated.content].filter(Boolean).join(' ');
    if (text) {
      const { afterCreate } = await import('../middleware/moderation.middleware');
      afterCreate('post', updated.id, req.user!.userId, [
        { field: 'title', text: updated.title },
        { field: 'content', text: updated.content || '' },
      ]);
    }

    return success(res, updated, '修改成功');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/posts/:id — 软删除
export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的帖子ID');
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.isDeleted) return notFound(res, '帖子不存在');
    if (post.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);

    await prisma.post.update({ where: { id }, data: { isDeleted: true } });
    await prisma.notification.deleteMany({ where: { relatedId: id, type: 'new_comment' } });

    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/:id/comments — 评论列表
export async function getPostComments(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return error(res, '无效的帖子ID');
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { isDeleted: true } });
    if (!post || post.isDeleted) return notFound(res, '帖子不存在');
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;
    const currentUserId = req.user?.userId;

    const where: any = { postId };
    if (currentUserId) {
      where.OR = [
        { status: 'approved' },
        { userId: currentUserId },
      ];
    } else {
      where.status = 'approved';
    }

    const [list, total] = await Promise.all([
      prisma.postComment.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.postComment.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// POST /api/posts/:id/comments — 发表评论
export async function createPostComment(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return error(res, '无效的帖子ID');
    const { content } = req.body;

    if (!content?.trim()) return error(res, '请输入评论内容');
    if (content.length > 500) return error(res, '评论最多500字');
    if (containsSensitive(content)) return error(res, '评论包含违规内容');

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) return notFound(res, '帖子不存在');

    const comment = await prisma.postComment.create({
      data: {
        postId,
        userId: req.user!.userId,
        content: content.trim(),
        status: 'pending',
      },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    // 通知帖子作者（自己评论自己不通知）
    if (post.userId !== req.user!.userId) {
      await createNotification({
        userId: post.userId,
        type: 'new_comment',
        title: `有人评论了"${post.title}"`,
        content: `${req.user!.username} 评论：${content.trim().substring(0, 50)}`,
        relatedId: postId,
      });
    }

    // L2 AI 异步审核（必须在 return 之前）
    const { aiModerate } = await import('../services/moderation.service');
    aiModerate(content, { contentType: 'post_comment', userId: req.user!.userId }).then(async (result) => {
      if (result === 'violation') {
        const { logger } = await import('../utils/logger');
        logger.warn(`AI flagged post comment #${comment.id}, hiding`);
        prisma.postComment.update({ where: { id: comment.id }, data: { status: 'offline' } }).catch(() => {});
      } else if (result === 'safe') {
        prisma.postComment.update({ where: { id: comment.id }, data: { status: 'approved' } }).catch(() => {});
      }
      // result === 'error': AI 审核失败，保持 pending
    });

    return success(res, comment, '评论成功', 201);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/posts/:id/comments/:commentId — 删除评论
export async function deletePostComment(req: Request, res: Response, next: NextFunction) {
  try {
    const commentId = parseInt(req.params.commentId as string);
    if (isNaN(commentId)) return error(res, '无效的评论ID');
    const comment = await prisma.postComment.findUnique({ where: { id: commentId } });
    if (!comment) return notFound(res, '评论不存在');
    if (comment.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);

    await prisma.postComment.delete({ where: { id: commentId } });
    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}
