/**
 * 笔记 Service 层 — 纯业务逻辑，不依赖 req/res
 *
 * 设计原则:
 * - 所有方法接收明确的参数，返回 Promise<结果>
 * - 不处理 HTTP 状态码/响应格式（由 Controller 负责）
 * - 使用 Prisma 推导类型，禁止 any
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { createNotification } from './notification.service';
import { viewCounter } from './view-counter.service';

// ─── 类型定义 ───

export interface NotesListParams {
  page: number;
  pageSize: number;
  sort?: string;
  postType?: string;
  tag?: string;
}

export interface CreateNoteInput {
  userId: number;
  title: string;
  content?: string;
  images?: string[];
  postType?: string;
  videoUrl?: string | null;
  videoCover?: string | null;
  videoDuration?: number | null;
  location?: string | null;
  tags?: string[];
}

export interface UpdateNoteInput {
  id: number;
  userId: number;
  title?: string;
  content?: string;
  images?: string[];
  postType?: string;
  location?: string;
  tags?: string[];
}

// ─── 查询构建器 ───

function buildWhere(input: Pick<NotesListParams, 'postType' | 'tag'>): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = {
    isDeleted: false,
    status: { in: ['approved', 'pending'] },
  };

  if (input.postType) {
    where.postType = input.postType;
  }

  if (input.tag) {
    where.tags = { some: { tag: { name: input.tag } } };
  }

  return where;
}

function buildOrderBy(sort?: string): Prisma.PostOrderByWithRelationInput | Prisma.PostOrderByWithRelationInput[] {
  switch (sort) {
    case 'hot':
      return { likeCount: 'desc' };
    case 'recommend':
      return [{ isFeatured: 'desc' }, { likeCount: 'desc' }];
    default:
      return { createdAt: 'desc' };
  }
}

// ─── 数据标准化 ───

function parseImages(images: unknown): unknown[] {
  if (typeof images === 'string') {
    try {
      return JSON.parse(images);
    } catch {
      return [];
    }
  }
  if (Array.isArray(images)) return images;
  return [];
}

/** 标准化笔记列表项 */
function mapNoteListItem(raw: Record<string, unknown>) {
  return {
    ...raw,
    images: parseImages(raw.images),
    tags: Array.isArray(raw.tags) ? (raw.tags as Array<{ tag?: { id: number; name: string } }>).map(t => ({ id: t.tag?.id, name: t.tag?.name })) : [],
  };
}

// ─── 笔记 CRUD ───

/** 分页获取笔记列表 */
export async function findNotes(params: NotesListParams) {
  const { page, pageSize, sort, postType, tag } = params;

  const where = buildWhere({ postType, tag });
  const orderBy = buildOrderBy(sort);

  const [list, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
    }),
    prisma.post.count({ where }),
  ]);

  return { list: list.map(mapNoteListItem), total };
}

/** 获取笔记详情 */
export async function findNoteDetail(id: number, viewerUserId?: number) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nickname: true, avatarUrl: true, bio: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
      _count: { select: { likes: true, saves: true, comments: true } },
    },
  });

  if (!post || post.isDeleted) return null;

  const isOwner = viewerUserId != null && viewerUserId === post.userId;

  // 浏览量去重（非作者）
  if (!isOwner) {
    const viewKey = `note:${id}:${viewerUserId ?? 'anon'}`;
    if (viewCounter.shouldCount(viewKey)) {
      prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {
        // 静默处理浏览量更新失败（不影响主流程）
      });
    }
  }

  // 关联推荐（同 tag）
  const tagIds = post.tags?.map(t => t.tag.id) ?? [];
  let related: Prisma.PostGetPayload<{
    select: {
      id: true; title: true; images: true; likeCount: true; postType: true;
      videoCover: true; coverIndex: true;
      user: { select: { id: true; nickname: true; avatarUrl: true } };
    };
  }>[] = [];

  if (tagIds.length > 0) {
    related = await prisma.post.findMany({
      where: {
        id: { not: id },
        isDeleted: false,
        status: 'approved',
        tags: { some: { tagId: { in: tagIds } } },
      },
      select: {
        id: true,
        title: true,
        images: true,
        likeCount: true,
        postType: true,
        videoCover: true,
        coverIndex: true,
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
      take: 6,
      orderBy: { likeCount: 'desc' },
    });
  }

  return {
    ...post,
    images: parseImages(post.images),
    tags: post.tags?.map(t => ({ id: t.tag.id, name: t.tag.name })),
    likeCount: post._count?.likes ?? post.likeCount ?? 0,
    commentCount: post._count?.comments ?? post.commentCount ?? 0,
    saveCount: post._count?.saves ?? post.saveCount ?? 0,
    related,
  };
}

/** 创建笔记 */
export async function createNote(input: CreateNoteInput) {
  const { userId, title, content, images, postType, videoUrl, videoCover, videoDuration, location, tags } = input;

  const note = await prisma.post.create({
    data: {
      userId,
      title: title.trim(),
      content: content ?? '',
      images: JSON.stringify(images ?? []),
      postType: postType ?? 'note',
      videoUrl: videoUrl ?? null,
      videoCover: videoCover ?? null,
      videoDuration: videoDuration ?? null,
      location: location ?? null,
      status: 'pending',
    },
  });

  // 关联标签
  if (tags && tags.length > 0) {
    await associateTags(note.id, tags);
  }

  return note;
}

/** 更新笔记 */
export async function updateNote(input: UpdateNoteInput) {
  const { id, userId, title, content, images, postType, location, tags } = input;

  // 所有权校验
  const existing = await prisma.post.findUnique({ where: { id }, select: { userId: true, isDeleted: true } });
  if (!existing || existing.isDeleted) return 'not_found' as const;
  if (existing.userId !== userId) return 'forbidden' as const;

  const updated = await prisma.post.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content }),
      ...(images !== undefined && { images: JSON.stringify(images) }),
      ...(postType !== undefined && { postType }),
      ...(location !== undefined && { location }),
      updatedAt: new Date(),
    },
  });

  // 更新标签
  if (tags) {
    await prisma.postTag.deleteMany({ where: { postId: id } });
    await associateTags(id, tags);
  }

  return updated;
}

/** 软删除笔记 */
export async function deleteNote(id: number, userId: number, role?: string) {
  const existing = await prisma.post.findUnique({ where: { id }, select: { userId: true, isDeleted: true } });
  if (!existing || existing.isDeleted) return 'not_found' as const;
  if (existing.userId !== userId && role !== 'admin') return 'forbidden' as const;

  await Promise.all([
    prisma.post.update({ where: { id }, data: { isDeleted: true } }),
    prisma.notification.deleteMany({
      where: { relatedId: id, type: { in: ['new_comment', 'post_like'] } },
    }),
  ]);

  return 'deleted' as const;
}

// ─── 互动 ───

/** 查询点赞状态 */
export async function getLikeStatus(postId: number, userId: number) {
  const existing = await prisma.postLike.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  return { liked: !!existing };
}

/** 切换点赞（点赞 ↔ 取消） */
export async function toggleLike(postId: number, userId: number, username: string) {
  const existing = await prisma.postLike.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    // 取消点赞
    await Promise.all([
      prisma.postLike.delete({ where: { id: existing.id } }),
      prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    return { liked: false };
  }

  // 点赞
  await Promise.all([
    prisma.postLike.create({ data: { userId, postId } }),
    prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
  ]);

  // 通知笔记作者
  const note = await prisma.post.findUnique({
    where: { id: postId },
    select: { userId: true, title: true },
  });

  if (note && note.userId !== userId) {
    createNotification({
      userId: note.userId,
      type: 'post_like',
      title: '有人赞了你的笔记',
      content: `${username} 赞了"${note.title?.slice(0, 30)}"`,
      relatedId: postId,
    }).catch(() => {
      // 通知失败不影响主流程
    });
  }

  return { liked: true };
}

/** 收藏笔记 */
export async function saveNote(postId: number, userId: number, collectionId?: number | null) {
  const existing = await prisma.postSave.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (existing) return 'already_saved' as const;

  await prisma.postSave.create({
    data: { userId, postId, collectionId: collectionId ?? null },
  });

  prisma.post.update({ where: { id: postId }, data: { saveCount: { increment: 1 } } }).catch(() => {});
  return 'saved' as const;
}

/** 取消收藏 */
export async function unsaveNote(postId: number, userId: number) {
  const save = await prisma.postSave.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (!save) return 'not_saved' as const;

  await prisma.postSave.delete({ where: { id: save.id } });
  prisma.post.update({ where: { id: postId }, data: { saveCount: { decrement: 1 } } }).catch(() => {});
  return 'unsaved' as const;
}

/** 分享计数 +1 */
export async function incrementShare(postId: number) {
  await prisma.post.update({ where: { id: postId }, data: { shareCount: { increment: 1 } } });
}

// ─── 标签工具 ───

async function associateTags(postId: number, tagNames: string[]) {
  const valid = tagNames.filter(Boolean).slice(0, 5);
  for (const name of valid) {
    const tag = await prisma.topicTag.upsert({
      where: { name },
      update: { postCount: { increment: 1 } },
      create: { name },
    });
    await prisma.postTag.create({
      data: { postId, tagId: tag.id },
    }).catch(() => {});
  }
}
