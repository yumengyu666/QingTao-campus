/**
 * 帖子 Controller — 薄层：参数提取 + 权限校验 + 响应格式化
 * 业务逻辑已提取到 post.service.ts
 */
import { Request, Response, NextFunction } from 'express';
import { success, error, paginated, notFound } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { createNotification } from '../services/notification.service';
import { linkImageReviews } from '../utils/images';
import * as postSvc from '../services/post.service';

const viewDedup = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of viewDedup) { if (now - t > 30 * 60 * 1000) viewDedup.delete(k); }
}, 10 * 60 * 1000).unref();

// GET /api/posts
export async function getPostList(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query as Record<string, string>;
    const page = parseInt(q.page) || 1;
    const pageSize = Math.min(parseInt(q.pageSize) || 20, 50);
    const { list, total } = await postSvc.findPostList({ keyword: q.keyword, sort: q.sort, page, pageSize });
    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

// POST /api/posts
export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, images } = req.body;
    if (containsSensitive(title)) return error(res, '标题包含违规内容');
    if (content && containsSensitive(content)) return error(res, '内容包含违规内容');

    const post = await postSvc.createPost({ userId: req.user!.userId, title: title.trim(), content: content || '', images: images || [] });
    await linkImageReviews(images, 'posts', post.id);
    const { afterCreate } = await import('../middleware/moderation.middleware');
    afterCreate('post', post.id, req.user!.userId, [{ field: 'title', text: title }, { field: 'content', text: content || '' }]);
    return success(res, post, '已提交审核，通过后将公开展示', 201);
  } catch (err) { next(err); }
}

// GET /api/posts/:id
export async function getPostDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的帖子ID');
    const post = await postSvc.findPostById(id);
    if (!post) return notFound(res, '帖子不存在');
    const isOwner = req.user?.userId === post.userId;
    const isAdmin = req.user?.role === 'admin';
    if (post.isDeleted && !isOwner && !isAdmin) return notFound(res, '帖子不存在');
    if (!isOwner && !isAdmin && !['approved'].includes(post.status)) return notFound(res, '帖子不存在');
    if (!isOwner) {
      const viewerIp = req.ip || req.socket.remoteAddress || 'unknown';
      const viewKey = `post:${id}:${viewerIp}`;
      if (!viewDedup.has(viewKey)) { viewDedup.set(viewKey, Date.now()); await postSvc.incrementPostView(id); }
    }
    return success(res, { ...post, images: postSvc.normalizePostImages(post.images) });
  } catch (err) { next(err); }
}

// PUT /api/posts/:id
export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const post = await postSvc.findPostById(id);
    if (!post || post.isDeleted) return notFound(res, '帖子不存在');
    if (post.userId !== req.user!.userId) return error(res, '无权操作', 403);
    const { title, content, images } = req.body;
    if (title && containsSensitive(title)) return error(res, '标题包含违规内容');
    const updated = await postSvc.updatePost(id, req.body);
    const text = [updated.title, updated.content].filter(Boolean).join(' ');
    if (text) {
      const { afterCreate } = await import('../middleware/moderation.middleware');
      afterCreate('post', updated.id, req.user!.userId, [{ field: 'title', text: updated.title }, { field: 'content', text: updated.content || '' }]);
    }
    return success(res, updated, '修改成功');
  } catch (err) { next(err); }
}

// DELETE /api/posts/:id
export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const post = await postSvc.findPostById(id);
    if (!post || post.isDeleted) return notFound(res, '帖子不存在');
    if (post.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);
    await postSvc.softDeletePost(id);
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}

// GET /api/posts/:id/comments
export async function getPostComments(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    const post = await postSvc.findPostById(postId);
    if (!post || post.isDeleted) return notFound(res, '帖子不存在');
    const page = parseInt(req.query.page as string) || 1;
    const [list, total] = await postSvc.findPostComments(postId, req.user?.userId, page);
    return paginated(res, list, total, page, 20);
  } catch (err) { next(err); }
}

// POST /api/posts/:id/comments
export async function createPostComment(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return error(res, '无效的帖子ID');
    const { content } = req.body;
    if (containsSensitive(content)) return error(res, '评论包含违规内容');
    const post = await postSvc.findPostById(postId);
    if (!post || post.isDeleted) return notFound(res, '帖子不存在');
    const comment = await postSvc.createPostComment(postId, req.user!.userId, content.trim());
    if (post.userId !== req.user!.userId) {
      createNotification({ userId: post.userId, type: 'new_comment', title: `有人评论了"${post.title}"`, content: `${req.user!.username} 评论：${content.trim().substring(0, 50)}`, relatedId: postId }).catch(() => {});
    }
    const { aiModerate } = await import('../services/moderation.service');
    const { prisma } = await import('../config/database');
    aiModerate(content, { contentType: 'post_comment', userId: req.user!.userId }).then(result => {
      if (result === 'violation') prisma.postComment.update({ where: { id: comment.id }, data: { status: 'offline' } }).catch(() => {});
      else if (result === 'safe') prisma.postComment.update({ where: { id: comment.id }, data: { status: 'approved' } }).catch(() => {});
    });
    return success(res, comment, '评论成功', 201);
  } catch (err) { next(err); }
}

// DELETE /api/posts/:id/comments/:commentId
export async function deletePostComment(req: Request, res: Response, next: NextFunction) {
  try {
    const commentId = parseInt(req.params.commentId as string);
    if (isNaN(commentId)) return error(res, '无效的评论ID');
    const comment = await postSvc.findPostCommentById(commentId);
    if (!comment) return notFound(res, '评论不存在');
    if (comment.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);
    await postSvc.deletePostComment(commentId);
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}
