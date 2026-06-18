import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated, notFound } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { createNotification } from '../services/notification.service';

// ==================== 视频流 ====================

/** GET /api/videos/feed — 视频推荐流 */
export async function getVideoFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 20);
    const tab = (req.query.tab as string) || 'recommend';
    const userId = req.user?.userId;

    const where: any = {
      isDeleted: false,
      status: 'approved',
    };

    if (tab === 'following' && userId) {
      const followingIds = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      where.userId = { in: followingIds.map(f => f.followingId) };
    }

    // 排序: 推荐=热门衰减, 其它按时间
    let orderBy: any = { createdAt: 'desc' };
    if (tab === 'recommend') {
      orderBy = [{ isFeatured: 'desc' }, { likeCount: 'desc' }, { createdAt: 'desc' }];
    }

    const [list, total] = await Promise.all([
      prisma.shortVideo.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      prisma.shortVideo.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/** GET /api/videos/:id — 视频详情 */
export async function getVideoDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的视频ID');

    const video = await prisma.shortVideo.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!video || video.isDeleted) return notFound(res, '视频不存在');

    const isOwner = req.user?.userId === video.userId;
    if (!isOwner) {
      prisma.shortVideo.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    }

    return success(res, {
      ...video,
      likeCount: video._count?.likes || video.likeCount,
      commentCount: video._count?.comments || video.commentCount,
    });
  } catch (err) {
    next(err);
  }
}

// ==================== 发布/编辑/删除 ====================

/** POST /api/videos — 发布视频 */
export async function createVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const { videoUrl, coverUrl, description, duration, musicTitle, musicArtist, tags } = req.body;

    if (!videoUrl) return error(res, '请上传视频');
    if (!coverUrl) return error(res, '请上传封面');
    if (description && containsSensitive(description)) return error(res, '描述包含违规内容');
    if (description && description.length > 200) return error(res, '描述最多200字');

    const video = await prisma.shortVideo.create({
      data: {
        userId: req.user!.userId,
        videoUrl,
        coverUrl,
        description: description || '',
        duration: duration || 0,
        musicTitle: musicTitle || null,
        musicArtist: musicArtist || null,
        status: 'pending',
      },
    });

    // 关联标签
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags.filter(Boolean).slice(0, 5)) {
        await prisma.videoTag.create({
          data: { videoId: video.id, tagName },
        }).catch(() => {});
      }
    }

    return success(res, video, '已提交审核', 201);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/videos/:id — 软删除 */
export async function deleteVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的视频ID');
    const video = await prisma.shortVideo.findUnique({ where: { id } });
    if (!video || video.isDeleted) return notFound(res, '视频不存在');
    if (video.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);

    await prisma.shortVideo.update({ where: { id }, data: { isDeleted: true } });
    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

// ==================== 互动 ====================

/** POST /api/videos/:id/like — 点赞/取消 */
export async function toggleLikeVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const videoId = parseInt(req.params.id as string);
    if (isNaN(videoId)) return error(res, '无效的视频ID');
    const userId = req.user!.userId;

    const existing = await prisma.videoLike.findUnique({ where: { userId_videoId: { userId, videoId } } });
    if (existing) {
      await prisma.videoLike.delete({ where: { id: existing.id } });
      prisma.shortVideo.update({ where: { id: videoId }, data: { likeCount: { decrement: 1 } } }).catch(() => {});
      return success(res, { liked: false });
    } else {
      await prisma.videoLike.create({ data: { userId, videoId } });
      prisma.shortVideo.update({ where: { id: videoId }, data: { likeCount: { increment: 1 } } }).catch(() => {});
      return success(res, { liked: true });
    }
  } catch (err) {
    next(err);
  }
}

/** GET /api/videos/:id/comments — 评论列表 */
export async function getVideoComments(req: Request, res: Response, next: NextFunction) {
  try {
    const videoId = parseInt(req.params.id as string);
    if (isNaN(videoId)) return error(res, '无效的视频ID');
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = 20;

    const [list, total] = await Promise.all([
      prisma.videoComment.findMany({
        where: { videoId, status: { in: ['approved', 'pending'] } },
        include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.videoComment.count({ where: { videoId } }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/** POST /api/videos/:id/comments — 发表评论 */
export async function createVideoComment(req: Request, res: Response, next: NextFunction) {
  try {
    const videoId = parseInt(req.params.id as string);
    if (isNaN(videoId)) return error(res, '无效的视频ID');
    const { content } = req.body;

    if (!content?.trim()) return error(res, '请输入评论');
    if (content.length > 300) return error(res, '评论最多300字');
    if (containsSensitive(content)) return error(res, '评论包含违规内容');

    const video = await prisma.shortVideo.findUnique({ where: { id: videoId } });
    if (!video || video.isDeleted) return notFound(res, '视频不存在');

    const comment = await prisma.videoComment.create({
      data: { videoId, userId: req.user!.userId, content: content.trim(), status: 'pending' },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });

    prisma.shortVideo.update({ where: { id: videoId }, data: { commentCount: { increment: 1 } } }).catch(() => {});

    // AI审核
    const { aiModerate } = await import('../services/moderation.service');
    aiModerate(content, { contentType: 'video_comment', userId: req.user!.userId }).then(async (result) => {
      if (result === 'violation') {
        prisma.videoComment.update({ where: { id: comment.id }, data: { status: 'offline' } }).catch(() => {});
      } else if (result === 'safe') {
        prisma.videoComment.update({ where: { id: comment.id }, data: { status: 'approved' } }).catch(() => {});
      }
    });

    return success(res, comment, '评论成功', 201);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/videos/:id/comments/:cid — 删除评论 */
export async function deleteVideoComment(req: Request, res: Response, next: NextFunction) {
  try {
    const cid = parseInt(req.params.cid as string);
    if (isNaN(cid)) return error(res, '无效的评论ID');
    const comment = await prisma.videoComment.findUnique({ where: { id: cid } });
    if (!comment) return notFound(res, '评论不存在');
    if (comment.userId !== req.user!.userId && req.user!.role !== 'admin') return error(res, '无权操作', 403);

    await prisma.videoComment.delete({ where: { id: cid } });
    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

/** POST /api/videos/:id/view — 观看记录 */
export async function recordView(req: Request, res: Response, next: NextFunction) {
  try {
    const videoId = parseInt(req.params.id as string);
    if (isNaN(videoId)) return error(res, '无效的视频ID');
    const userId = req.user!.userId;

    await prisma.videoHistory.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: { userId, videoId, watchDuration: 0, watchedAt: new Date() },
      update: { watchedAt: new Date() },
    });
    return success(res, null, 'ok');
  } catch (err) {
    next(err);
  }
}

/** POST /api/videos/:id/share — 分享计数 */
export async function shareVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的视频ID');
    await prisma.shortVideo.update({ where: { id }, data: { shareCount: { increment: 1 } } });
    return success(res, null, 'ok');
  } catch (err) {
    next(err);
  }
}

/** GET /api/videos/user/:userId — 用户视频列表 */
export async function getUserVideos(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.userId as string);
    if (isNaN(userId)) return error(res, '无效的用户ID');
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = 20;

    const [list, total] = await Promise.all([
      prisma.shortVideo.findMany({
        where: { userId, isDeleted: false, status: 'approved' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shortVideo.count({ where: { userId, isDeleted: false, status: 'approved' } }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/** GET /api/videos/search — 视频搜索 */
export async function searchVideos(req: Request, res: Response, next: NextFunction) {
  try {
    const keyword = (req.query.keyword as string || '').trim();
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = 10;

    const where: any = { isDeleted: false, status: 'approved' };
    if (keyword) {
      where.description = { contains: keyword };
    }

    const [list, total] = await Promise.all([
      prisma.shortVideo.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { likeCount: 'desc' },
      }),
      prisma.shortVideo.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}
