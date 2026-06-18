import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { aiModerate } from '../services/moderation.service';
import { logger } from '../utils/logger';

const VALID_TYPES = ['exam', 'note', 'mindmap', 'report', 'other'];

/** GET /api/resources — 列表（热门前排，不返回 fileUrl） */
export async function getResources(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);
    const { courseName, type, sort } = req.query;

    const where: any = {};
    if (courseName) where.courseName = { contains: String(courseName) };
    if (type && VALID_TYPES.includes(String(type))) where.type = String(type);

    // 排序：hot（下载量）| newest（最新）
    const orderBy: any = sort === 'newest' ? { createdAt: 'desc' } : { downloadCount: 'desc' };

    const [list, total] = await Promise.all([
      prisma.courseResource.findMany({
        where,
        select: {
          id: true, courseName: true, courseCode: true, title: true, type: true,
          description: true, fileSize: true, downloadCount: true, likeCount: true,
          createdAt: true, userId: true,
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      prisma.courseResource.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/** GET /api/resources/:id — 详情（返回 fileUrl 并 +1 下载数） */
export async function getResource(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的资料ID');

    const resource = await prisma.courseResource.findUnique({
      where: { id },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });

    if (!resource) return error(res, '资料不存在', 404);

    // 下载数+1（原子操作，不阻塞返回）
    prisma.courseResource.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    }).catch(() => {});

    return success(res, resource);
  } catch (err) {
    next(err);
  }
}

/** POST /api/resources — 上传资料（需登录） */
export async function createResource(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { courseName, courseCode, title, type, description, fileUrl, fileSize } = req.body;

    if (!courseName?.trim()) return error(res, '请输入课程名称');
    if (!title?.trim()) return error(res, '请输入资料标题');
    if (!fileUrl) return error(res, '请上传文件');
    if (title.length > 100) return error(res, '标题最多 100 字');
    if (description?.length > 500) return error(res, '描述最多 500 字');

    // L1 敏感词检查
    if (containsSensitive(title)) return error(res, '标题包含违规内容');
    if (description && containsSensitive(description)) return error(res, '描述包含违规内容');
    if (containsSensitive(courseName)) return error(res, '课程名包含违规内容');

    const finalType = type && VALID_TYPES.includes(type) ? type : 'other';

    const resource = await prisma.courseResource.create({
      data: {
        userId,
        courseName: courseName.trim(),
        courseCode: (courseCode || '').trim(),
        title: title.trim(),
        type: finalType,
        description: description?.trim() || '',
        fileUrl,
        fileSize: fileSize || null,
      },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });

    // L2 AI 异步审核（fire-and-forget）
    const textToReview = [title, description, courseName].filter(Boolean).join(' ');
    if (textToReview.trim()) {
      aiModerate(textToReview.trim(), { contentType: 'courseResource', userId }).then(result => {
        if (result === 'violation') {
          logger.warn(`AI flagged courseResource #${resource.id}, would need manual review`);
        }
      });
    }

    return success(res, resource, '上传成功', 201);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/resources/:id — 编辑资料元数据（仅上传者本人） */
export async function updateResource(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的资料ID');
    const userId = req.user!.userId;
    const { courseName, courseCode, title, type, description } = req.body;

    const resource = await prisma.courseResource.findUnique({ where: { id } });
    if (!resource) return error(res, '资料不存在', 404);
    if (resource.userId !== userId) return error(res, '无权编辑', 403);

    if (title && title.length > 100) return error(res, '标题最多 100 字');
    if (description && description.length > 500) return error(res, '描述最多 500 字');

    const data: any = {};
    if (courseName !== undefined) data.courseName = String(courseName).trim();
    if (courseCode !== undefined) data.courseCode = String(courseCode).trim();
    if (title !== undefined) data.title = String(title).trim();
    if (type && VALID_TYPES.includes(type)) data.type = type;
    if (description !== undefined) data.description = String(description).trim();

    const updated = await prisma.courseResource.update({
      where: { id },
      data,
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });

    return success(res, updated, '修改成功');
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/resources/:id — 删除（上传者本人或管理员） */
export async function deleteResource(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的资料ID');
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    const resource = await prisma.courseResource.findUnique({ where: { id } });
    if (!resource) return error(res, '资料不存在', 404);
    if (!isAdmin && resource.userId !== userId) return error(res, '无权删除', 403);

    await prisma.courseResource.delete({ where: { id } });
    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

/** POST /api/resources/:id/download — 下载计数+1（原子操作，返回 fileUrl） */
export async function downloadResource(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的资料ID');

    const resource = await prisma.courseResource.findUnique({
      where: { id },
      select: { id: true, fileUrl: true },
    });
    if (!resource) return error(res, '资料不存在', 404);

    // 原子递增下载数
    await prisma.courseResource.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    return success(res, { fileUrl: resource.fileUrl }, 'ok');
  } catch (err) {
    next(err);
  }
}

// 简单的点赞防刷 Map（同 treehole）
const resourceLikeCache = new Map<string, number>();
setInterval(() => resourceLikeCache.clear(), 30 * 60 * 1000);

/** POST /api/resources/:id/like — 点赞/取消赞 */
export async function toggleLike(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的资料ID');
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${clientIp}:${id}`;

    const resource = await prisma.courseResource.findUnique({ where: { id } });
    if (!resource) return error(res, '资料不存在', 404);

    if (resourceLikeCache.has(key)) {
      resourceLikeCache.delete(key);
      await prisma.courseResource.update({ where: { id }, data: { likeCount: Math.max(0, resource.likeCount - 1) } });
      return success(res, { liked: false, likeCount: Math.max(0, resource.likeCount - 1) }, '已取消赞');
    }

    resourceLikeCache.set(key, Date.now());
    await prisma.courseResource.update({ where: { id }, data: { likeCount: { increment: 1 } } });
    return success(res, { liked: true, likeCount: resource.likeCount + 1 }, '点赞成功');
  } catch (err) {
    next(err);
  }
}

/** POST /api/resources/:id/report — 举报资料（#41，虚假/过时资料） */
export async function reportResource(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的资料ID');
    const { reason } = req.body;

    const resource = await prisma.courseResource.findUnique({ where: { id } });
    if (!resource) return error(res, '资料不存在', 404);

    if (!reason?.trim()) return error(res, '请填写举报原因');
    if (reason.length > 500) return error(res, '举报原因最多500字');

    // 去重：同一用户对同一资料24小时内不重复举报
    const recent = await prisma.report.findFirst({
      where: {
        reporterId: req.user!.userId,
        targetType: 'resource',
        targetId: id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recent) return error(res, '你已在24小时内举报过该资料');

    await prisma.report.create({
      data: {
        reporterId: req.user!.userId,
        targetType: 'resource',
        targetId: id,
        reason: reason.trim(),
      },
    });

    return success(res, null, '举报已提交，管理员会尽快处理');
  } catch (err) {
    next(err);
  }
}
