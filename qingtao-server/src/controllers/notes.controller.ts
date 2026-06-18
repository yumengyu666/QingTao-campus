/**
 * 笔记/收藏夹/话题 Controller 层 — 只做参数提取 + 权限校验 + 响应格式化
 *
 * 业务逻辑已移入：
 *   - services/notes.service.ts      (笔记 CRUD + 互动)
 *   - services/collection.service.ts (收藏夹 CRUD)
 *   - services/tag.service.ts        (话题关注 + 动态流)
 *   - services/view-counter.service.ts (浏览量去重)
 */

import { Request, Response, NextFunction } from 'express';
import { success, error, paginated, notFound } from '../utils/response';
import { containsSensitive } from '../utils/sensitive';
import { afterCreate } from '../middleware/moderation.middleware';

import * as notesService from '../services/notes.service';
import * as collectionService from '../services/collection.service';
import * as tagService from '../services/tag.service';

// ==================== 笔记 ====================

/** GET /api/notes — 笔记瀑布流 */
export async function getNotes(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);
    const sort = (req.query.sort as string) || 'recommend';
    const postType = req.query.postType as string | undefined;
    const tag = req.query.tag as string | undefined;

    const { list, total } = await notesService.findNotes({ page, pageSize, sort, postType, tag });
    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/** GET /api/notes/:id — 笔记详情 */
export async function getNoteDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的笔记ID');

    const detail = await notesService.findNoteDetail(id, req.user?.userId);
    if (!detail) return notFound(res, '笔记不存在');

    // 非作者/非管理员不可见待审核/被拒内容
    const { userId: detailUserId, status: detailStatus } = detail as { userId?: number; status?: string };
    const isOwner = req.user?.userId === detailUserId;
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin && detailStatus && ['pending', 'rejected'].includes(detailStatus)) {
      return notFound(res, '笔记不存在');
    }

    return success(res, detail);
  } catch (err) {
    next(err);
  }
}

/** POST /api/notes — 发布笔记 */
export async function createNote(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, images, postType, videoUrl, videoCover, videoDuration, location, tags } = req.body;

    // 基础校验
    if (!title?.trim()) return error(res, '请输入笔记标题');
    if (title.length > 100) return error(res, '标题最多100字');
    if (content && content.length > 2000) return error(res, '内容最多2000字');

    // L1 敏感词检查
    if (containsSensitive(title)) return error(res, '标题包含违规内容');
    if (content && containsSensitive(content)) return error(res, '内容包含违规内容');

    const note = await notesService.createNote({
      userId: req.user!.userId,
      title,
      content,
      images,
      postType,
      videoUrl,
      videoCover,
      videoDuration,
      location,
      tags,
    });

    // L2 AI 审核（异步）
    afterCreate('post', note.id, req.user!.userId, [
      { field: 'title', text: title },
      { field: 'content', text: content || '' },
    ]);

    return success(res, note, '已提交审核', 201);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/notes/:id — 编辑笔记 */
export async function updateNote(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的笔记ID');

    const { title, content, images, postType, location, tags } = req.body;
    if (title && containsSensitive(title)) return error(res, '标题包含违规内容');

    const result = await notesService.updateNote({ id, userId: req.user!.userId, title, content, images, postType, location, tags });

    if (result === 'not_found') return notFound(res, '笔记不存在');
    if (result === 'forbidden') return error(res, '无权操作', 403);

    return success(res, result, '修改成功');
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/notes/:id — 软删除笔记 */
export async function deleteNote(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的笔记ID');

    const result = await notesService.deleteNote(id, req.user!.userId, req.user!.role);

    if (result === 'not_found') return notFound(res, '笔记不存在');
    if (result === 'forbidden') return error(res, '无权操作', 403);

    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

// ==================== 互动 ====================

/** GET /api/notes/:id/like/status — 点赞状态 */
export async function getLikeStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return error(res, '无效的笔记ID');

    const result = await notesService.getLikeStatus(postId, req.user!.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/notes/:id/like — 点赞/取消 */
export async function toggleLikeNote(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return error(res, '无效的笔记ID');

    const result = await notesService.toggleLike(postId, req.user!.userId, req.user!.username);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/notes/:id/save — 收藏 */
export async function saveNote(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return error(res, '无效的笔记ID');

    const result = await notesService.saveNote(postId, req.user!.userId, req.body.collectionId);

    if (result === 'already_saved') return error(res, '已收藏');
    return success(res, null, '已收藏', 201);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/notes/:id/save — 取消收藏 */
export async function unsaveNote(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return error(res, '无效的笔记ID');

    const result = await notesService.unsaveNote(postId, req.user!.userId);

    if (result === 'not_saved') return error(res, '未收藏');
    return success(res, null, '已取消收藏');
  } catch (err) {
    next(err);
  }
}

/** POST /api/notes/:id/share — 分享计数 */
export async function shareNote(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.id as string);
    if (isNaN(postId)) return error(res, '无效的笔记ID');

    await notesService.incrementShare(postId);
    return success(res, null, 'ok');
  } catch (err) {
    next(err);
  }
}

// ==================== 收藏夹 ====================

/** GET /api/collections — 我的收藏夹列表 */
export async function getCollections(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await collectionService.findCollections({ userId: req.user!.userId });
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

/** POST /api/collections — 创建收藏夹 */
export async function createCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, isPublic, coverUrl } = req.body;
    if (!name?.trim()) return error(res, '请输入收藏夹名称');
    if (name.length > 20) return error(res, '名称最多20字');

    const col = await collectionService.createCollection({
      userId: req.user!.userId,
      name,
      isPublic,
      coverUrl,
    });

    return success(res, col, '创建成功', 201);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/collections/:id — 编辑收藏夹 */
export async function updateCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的收藏夹ID');

    const result = await collectionService.updateCollection({
      id,
      userId: req.user!.userId,
      name: req.body.name,
      isPublic: req.body.isPublic,
      coverUrl: req.body.coverUrl,
    });

    if (result === 'not_found') return notFound(res, '收藏夹不存在');
    if (result === 'forbidden') return error(res, '无权操作', 403);

    return success(res, result.data);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/collections/:id — 删除收藏夹 */
export async function deleteCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的收藏夹ID');

    const result = await collectionService.deleteCollection(id, req.user!.userId);

    if (result === 'not_found') return notFound(res, '收藏夹不存在');
    if (result === 'forbidden') return error(res, '无权操作', 403);

    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

/** GET /api/collections/:id/notes — 收藏夹内笔记 */
export async function getCollectionNotes(req: Request, res: Response, next: NextFunction) {
  try {
    const collectionId = parseInt(req.params.id as string);
    if (isNaN(collectionId)) return error(res, '无效的收藏夹ID');
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);

    const { list, total } = await collectionService.findCollectionNotes({ collectionId, page, pageSize });
    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// ==================== 话题 ====================

/** POST /api/tags/:id/follow — 关注话题 */
export async function followTag(req: Request, res: Response, next: NextFunction) {
  try {
    const tagId = parseInt(req.params.id as string);
    if (isNaN(tagId)) return error(res, '无效的话题ID');

    await tagService.followTag(tagId, req.user!.userId);
    return success(res, null, '已关注');
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/tags/:id/follow — 取消关注 */
export async function unfollowTag(req: Request, res: Response, next: NextFunction) {
  try {
    const tagId = parseInt(req.params.id as string);
    if (isNaN(tagId)) return error(res, '无效的话题ID');

    await tagService.unfollowTag(tagId, req.user!.userId);
    return success(res, null, '已取消关注');
  } catch (err) {
    next(err);
  }
}

/** GET /api/tags/:name/feed — 话题动态流 */
export async function getTagFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const tagName = req.params.name as string;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);

    const { list, total } = await tagService.findFeedByTag({ tagName, page });
    return paginated(res, list, total, page, 20);
  } catch (err) {
    next(err);
  }
}
