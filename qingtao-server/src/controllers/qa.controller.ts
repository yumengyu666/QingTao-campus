import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated, notFound } from '../utils/response';
import { aiModerate } from '../services/moderation.service';
import { logger } from '../utils/logger';

/** GET /api/qa */
export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = 20;
    const category = req.query.category as string;
    const type = req.query.type as string;
    const sort = req.query.sort as string;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    const where: any = { isDeleted: false };
    if (category) where.category = category;
    if (type) where.type = type;
    if (userId) where.userId = userId;

    const orderBy: any = sort === 'hot' ? { viewCount: 'desc' } : { createdAt: 'desc' };

    const [list, total] = await Promise.all([
      prisma.qaPost.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        skip: (page - 1) * pageSize, take: pageSize, orderBy,
      }),
      prisma.qaPost.count({ where }),
    ]);
    return paginated(res, list, total, page, pageSize);
  } catch (err) { next(err); }
}

/** POST /api/qa */
export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, category, type, images } = req.body;
    if (!title?.trim()) return error(res, '请输入标题');
    if (title.length > 100) return error(res, '标题最多100字');
    if (content?.length > 2000) return error(res, '内容最多2000字');

    // 校验 category 和 type
    const VALID_CATEGORIES = ['study', 'life', 'tech', 'other'];
    const VALID_TYPES = ['question', 'discussion', 'share'];
    const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'other';
    const safeType = VALID_TYPES.includes(type) ? type : 'question';

    // L1 敏感词检测
    const { containsSensitive } = await import('../utils/sensitive');
    if (containsSensitive(title)) return error(res, '标题包含违规内容');
    if (content && containsSensitive(content)) return error(res, '内容包含违规内容');

    const post = await prisma.qaPost.create({
      data: {
        userId: req.user!.userId,
        title: title.trim(),
        content: (content || '').trim().replace(/<[^>]*>/g, ''),
        category: safeCategory,
        type: safeType,
        images: JSON.stringify(images || []),
      },
    });
    // L2 AI 异步审核（必须在 return 之前）
    const text = `${title} ${content}`;
    aiModerate(text, { contentType: 'qa_post', userId: req.user!.userId }).then(result => {
      if (result === 'violation') {
        logger.warn(`AI flagged Q&A post #${post.id}, soft-deleting`);
        prisma.qaPost.update({ where: { id: post.id }, data: { isDeleted: true } }).catch(() => {});
      }
    });

    return success(res, post, '发布成功', 201);
  } catch (err) { next(err); }
}

/** GET /api/qa/:id */
export async function getDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的ID');

    const [post, answers] = await Promise.all([
      prisma.qaPost.findUnique({
        where: { id },
        include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
      }),
      prisma.qaAnswer.findMany({
        where: { postId: id },
        include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        orderBy: [{ isBest: 'desc' }, { likeCount: 'desc' }],
      }),
    ]);
    if (!post || post.isDeleted) return notFound(res, '问题不存在');

    // 浏览量+1（作者本人不增加）
    if (post.userId !== req.user?.userId) {
      await prisma.qaPost.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    }
    return success(res, {
      post: { ...post, images: JSON.parse(post.images || '[]') },
      answers: answers.map(a => ({ ...a, images: JSON.parse(a.images || '[]') })),
    });
  } catch (err) { next(err); }
}

/** POST /api/qa/:id/answers */
export async function createAnswer(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return error(res, '无效的问题ID');
    const { content, images } = req.body;
    if (!content?.trim()) return error(res, '请输入回答内容');
    if (content.length > 2000) return error(res, '回答最多2000字');

    // L1 敏感词检测
    const { containsSensitive } = await import('../utils/sensitive');
    if (containsSensitive(content)) return error(res, '回答包含违规内容');

    const post = await prisma.qaPost.findUnique({ where: { id: postId } });
    if (!post) return notFound(res, '问题不存在');

    const answer = await prisma.qaAnswer.create({
      data: { postId, userId: req.user!.userId, content: content.trim(), images: JSON.stringify(images || []) },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    await prisma.qaPost.update({ where: { id: postId }, data: { answerCount: { increment: 1 } } });
    // L2 AI 异步审核（必须在 return 之前）
    aiModerate(content, { contentType: 'qa_answer', userId: req.user!.userId }).then(result => {
      if (result === 'violation') {
        logger.warn(`AI flagged Q&A answer #${answer.id}, deleting`);
        prisma.qaAnswer.delete({ where: { id: answer.id } }).catch(() => {});
        prisma.qaPost.update({
          where: { id: postId },
          data: { answerCount: { decrement: 1 } },
        }).catch(() => {});
      }
    });

    return success(res, { ...answer, images: JSON.parse(answer.images || '[]') }, '', 201);
  } catch (err) { next(err); }
}

/** POST /api/qa/answers/:id/vote */
export async function toggleVote(req: Request, res: Response, next: NextFunction) {
  try {
    const answerId = parseInt(req.params.id as string);
    if (isNaN(answerId)) return error(res, '无效的回答ID');
    const userId = req.user!.userId;

    const existing = await prisma.qaVote.findUnique({ where: { answerId_userId: { answerId, userId } } });
    if (existing) {
      await prisma.$transaction([
        prisma.qaVote.delete({ where: { id: existing.id } }),
        prisma.qaAnswer.update({ where: { id: answerId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return success(res, null, '已取消点赞');
    }
    await prisma.$transaction([
      prisma.qaVote.create({ data: { answerId, userId } }),
      prisma.qaAnswer.update({ where: { id: answerId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return success(res, null, '点赞成功');
  } catch (err) { next(err); }
}

/** POST /api/qa/answers/:id/best */
export async function markBest(req: Request, res: Response, next: NextFunction) {
  try {
    const answerId = parseInt(req.params.id as string);
    if (isNaN(answerId)) return error(res, '无效的回答ID');
    const answer = await prisma.qaAnswer.findUnique({ where: { id: answerId } });
    if (!answer) return notFound(res, '回答不存在');

    const post = await prisma.qaPost.findUnique({ where: { id: answer.postId } });
    if (!post || post.userId !== req.user!.userId) return error(res, '仅提问者可以采纳', 403);

    await prisma.$transaction([
      prisma.qaAnswer.updateMany({ where: { postId: answer.postId, isBest: true }, data: { isBest: false } }),
      prisma.qaAnswer.update({ where: { id: answerId }, data: { isBest: true } }),
      prisma.qaPost.update({ where: { id: answer.postId }, data: { isResolved: true, bestAnswerId: answerId } }),
    ]);
    return success(res, null, '已采纳');
  } catch (err) { next(err); }
}
