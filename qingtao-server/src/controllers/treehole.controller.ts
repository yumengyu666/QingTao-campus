import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { aiModerate } from '../services/moderation.service';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/** 生成 4 位 hex 匿名码，如 A3F2 */
function generateCode(): string {
  const chars = '0123456789ABCDEF';
  const buf = crypto.randomBytes(4);
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[buf[i] % chars.length];
  return code;
}

/** GET /api/treehole — 帖子列表（游客可访问） */
export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);
    const sort = req.query.sort as string;

    const orderBy: any = sort === 'hot' ? { likeCount: 'desc' } : { createdAt: 'desc' };

    const [list, total] = await Promise.all([
      prisma.treeHolePost.findMany({
        where: { isDeleted: false },
        select: {
          id: true, code: true, content: true, images: true,
          likeCount: true, commentCount: true, createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      prisma.treeHolePost.count({ where: { isDeleted: false } }),
    ]);

    const data = list.map(p => ({ ...p, images: JSON.parse(p.images || '[]') }));
    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/** GET /api/treehole/:id — 帖子详情 + 评论 */
export async function getDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的树洞帖子ID');
    const post = await prisma.treeHolePost.findUnique({
      where: { id },
      select: {
        id: true, code: true, content: true, images: true, isDeleted: true,
        likeCount: true, commentCount: true, createdAt: true,
      },
    });
    if (!post || post.isDeleted) return error(res, '帖子不存在', 404);

    const comments = await prisma.treeHoleComment.findMany({
      where: { postId: id, isDeleted: false },
      select: { id: true, code: true, content: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return success(res, {
      ...post,
      images: JSON.parse(post.images || '[]'),
      comments,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/treehole — 发帖（游客可访问，后端生成匿名 code） */
export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { content, images } = req.body;

    if (!content?.trim()) return error(res, '请输入内容');
    if (content.length > 1000) return error(res, '内容最多 1000 字');
    if (containsSensitive(content)) return error(res, '内容包含违规信息');

    const code = generateCode();

    const post = await prisma.treeHolePost.create({
      data: {
        code,
        content: content.trim(),
        images: JSON.stringify(images || []),
      },
    });

    // L2 AI 异步审核（必须在 return 之前注册 fire-and-forget）
    aiModerate(content, { contentType: 'treehole', userId: req.user?.userId }).then(result => {
      if (result === 'violation') {
        logger.warn(`AI flagged treehole post #${post.id}, deleting`);
        prisma.treeHolePost.update({ where: { id: post.id }, data: { isDeleted: true } }).catch(() => {});
      }
    });

    return success(res, { ...post, images: JSON.parse(post.images || '[]') }, '发布成功', 201);
  } catch (err) {
    next(err);
  }
}

/** POST /api/treehole/:id/comments — 评论（游客可访问，后端生成匿名 code） */
export async function createComment(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return error(res, '无效的树洞帖子ID');
    const { content } = req.body;

    if (!content?.trim()) return error(res, '请输入评论内容');
    if (content.length > 500) return error(res, '评论最多 500 字');
    if (containsSensitive(content)) return error(res, '评论包含违规信息');

    const post = await prisma.treeHolePost.findUnique({ where: { id: postId } });
    if (!post) return error(res, '帖子不存在', 404);

    const code = generateCode();

    const [comment] = await prisma.$transaction([
      prisma.treeHoleComment.create({
        data: { postId, code, content: content.trim() },
      }),
      prisma.treeHolePost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    // L2 AI 异步审核（必须在 return 之前）
    aiModerate(content, { contentType: 'treehole', userId: req.user?.userId }).then(result => {
      if (result === 'violation') {
        logger.warn(`AI flagged treehole comment #${comment.id}, deleting`);
        prisma.treeHoleComment.update({ where: { id: comment.id }, data: { isDeleted: true } }).catch(() => {});
        prisma.treeHolePost.update({
          where: { id: postId },
          data: { commentCount: { decrement: 1 } },
        }).catch(() => {});
      }
    });

    return success(res, comment, '评论成功', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * 点赞防刷：IP + 帖子ID 去重（内存，30分钟周期清空）
 * 
 * 防护层级：
 * L1: 服务端 IP+postId 去重 — 清除 localStorage 无法绕过
 * L2: 每30分钟清空缓存 — 防止内存无限增长
 * L3: 取消赞需先有点赞记录 — 防止负数点赞
 */
const likeRegistry = new Map<string, number>();
setInterval(() => likeRegistry.clear(), 30 * 60 * 1000);

/** POST /api/treehole/:id/like — 点赞/取消赞（游客可访问） */
export async function toggleLike(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的树洞帖子ID');
    const { action } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${clientIp}:${id}`;

    const post = await prisma.treeHolePost.findUnique({ where: { id } });
    if (!post) return error(res, '帖子不存在', 404);

    if (action === 'like') {
      if (likeRegistry.has(key)) return error(res, '你已经点过赞了');
      likeRegistry.set(key, Date.now());
      await prisma.treeHolePost.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      });
      return success(res, { likeCount: post.likeCount + 1 }, '已点赞');
    }

    if (action === 'unlike') {
      if (!likeRegistry.has(key)) return error(res, '你还没有点赞');
      likeRegistry.delete(key);
      const updated = await prisma.treeHolePost.update({
        where: { id },
        data: { likeCount: Math.max(0, post.likeCount - 1) },
      });
      return success(res, { likeCount: updated.likeCount }, '已取消赞');
    }

    return error(res, 'action 必须为 like 或 unlike');
  } catch (err) {
    next(err);
  }
}
