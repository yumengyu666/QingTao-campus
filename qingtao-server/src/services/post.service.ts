/**
 * 帖子 Service 层 — 纯业务逻辑
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

// ─── 公共工具 ───

/** 标准化图片格式 */
export function normalizePostImages(raw: unknown): string[] {
  return Array.isArray(raw) ? raw as string[] : JSON.parse(typeof raw === 'string' ? raw : '[]');
}

/** 帖子列表常用 include */
const POST_INCLUDE = {
  user: { select: { id: true, nickname: true, avatarUrl: true } as const },
};

/** 评论常用 include */
const COMMENT_INCLUDE = {
  user: { select: { id: true, nickname: true, avatarUrl: true } as const },
};

// ─── 帖子 CRUD ───

export async function findPostList(params: {
  keyword?: string;
  sort?: string;
  page: number;
  pageSize: number;
}) {
  const { keyword, sort, page, pageSize } = params;

  const where: Prisma.PostWhereInput = { isDeleted: false, status: { in: ['approved', 'pending'] } };
  if (keyword) {
    where.OR = [
      { title: { contains: keyword } },
      { content: { contains: keyword } },
    ];
  }

  const orderBy: Prisma.PostOrderByWithRelationInput = sort === 'hot' ? { viewCount: 'desc' } : { createdAt: 'desc' };

  const [list, total] = await Promise.all([
    prisma.post.findMany({ where, include: POST_INCLUDE, skip: (page - 1) * pageSize, take: pageSize, orderBy }),
    prisma.post.count({ where }),
  ]);

  return { list: list.map(p => ({ ...p, images: normalizePostImages(p.images) })), total };
}

export async function findPostById(id: number) {
  return prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
}

export async function createPost(data: {
  userId: number;
  title: string;
  content: string;
  images: string[];
}) {
  return prisma.post.create({
    data: {
      userId: data.userId,
      title: data.title,
      content: data.content || '',
      images: JSON.stringify(data.images || []),
      status: 'pending',
    },
  });
}

export async function updatePost(id: number, data: {
  title?: string;
  content?: string;
  images?: string[];
}) {
  return prisma.post.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.images !== undefined && { images: JSON.stringify(data.images) }),
      reviewComment: '',
      updatedAt: new Date(),
    },
  });
}

export async function softDeletePost(id: number) {
  await prisma.post.update({ where: { id }, data: { isDeleted: true } });
  await prisma.notification.deleteMany({ where: { relatedId: id } });
}

/** 增量浏览量（IP去重需在Controller层维护Map） */
export async function incrementPostView(id: number) {
  await prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });
}

// ─── 评论 CRUD ───

export async function findPostComments(postId: number, currentUserId?: number, page = 1, pageSize = 20) {
  const where: Prisma.PostCommentWhereInput = { postId };
  if (currentUserId) {
    where.OR = [{ status: 'approved' }, { userId: currentUserId }];
  } else {
    where.status = 'approved';
  }
  return Promise.all([
    prisma.postComment.findMany({ where, include: COMMENT_INCLUDE, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.postComment.count({ where }),
  ]);
}

export async function createPostComment(postId: number, userId: number, content: string) {
  return prisma.postComment.create({
    data: { postId, userId, content, status: 'pending' },
    include: COMMENT_INCLUDE,
  });
}

export async function deletePostComment(commentId: number) {
  return prisma.postComment.delete({ where: { id: commentId } });
}

export async function findPostCommentById(commentId: number) {
  return prisma.postComment.findUnique({ where: { id: commentId } });
}
