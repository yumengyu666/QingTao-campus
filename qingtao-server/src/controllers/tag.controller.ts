import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, paginated } from '../utils/response';

/** GET /api/tags — 热门标签列表 */
export async function getTags(_req: Request, res: Response, next: NextFunction) {
  try {
    const tags = await prisma.topicTag.findMany({
      orderBy: { postCount: 'desc' },
      take: 30,
    });
    return success(res, tags);
  } catch (err) { next(err); }
}

/** GET /api/tags/:name/posts — 标签下的帖子 */
export async function getPostsByTag(req: Request, res: Response, next: NextFunction) {
  try {
    const name = String(req.params.name || '');
    const page = Math.max(parseInt(String(req.query.page || '1')), 1);
    const pageSize = 20;

    const tag = await prisma.topicTag.findUnique({ where: { name } });
    if (!tag) return paginated(res, [], 0, page, pageSize);

    const [postTags, total] = await Promise.all([
      prisma.postTag.findMany({
        where: { tagId: tag.id },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      prisma.postTag.count({ where: { tagId: tag.id } }),
    ]);

    const postIds = postTags.map(pt => pt.postId);
    const posts = await prisma.post.findMany({
      where: { id: { in: postIds }, isDeleted: false },
      select: { id: true, title: true, content: true, images: true, createdAt: true, user: { select: { id: true, nickname: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return paginated(res, posts, total, page, pageSize);
  } catch (err) { next(err); }
}
