/**
 * 收藏夹 Service 层 — 收藏夹 CRUD + 收藏夹内笔记列表
 *
 * 设计原则:
 * - 所有权校验内置于 Service 方法
 * - 返回值使用 discriminated union，避免 Controller 判断字符串
 */

import { prisma } from '../config/database';

// ─── 类型 ───

export interface CollectionListParams {
  userId: number;
}

export interface CreateCollectionInput {
  userId: number;
  name: string;
  isPublic?: boolean;
  coverUrl?: string | null;
}

export interface UpdateCollectionInput {
  id: number;
  userId: number;
  name?: string;
  isPublic?: boolean;
  coverUrl?: string | null;
}

export interface CollectionNotesParams {
  collectionId: number;
  page: number;
  pageSize: number;
}

// ─── CRUD ───

/** 获取用户收藏夹列表 */
export async function findCollections(params: CollectionListParams) {
  const collections = await prisma.postCollection.findMany({
    where: { userId: params.userId },
    include: { _count: { select: { saves: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return collections.map(c => ({
    ...c,
    postCount: c._count?.saves ?? c.postCount,
  }));
}

/** 创建收藏夹 */
export async function createCollection(input: CreateCollectionInput) {
  const col = await prisma.postCollection.create({
    data: {
      userId: input.userId,
      name: input.name.trim(),
      isPublic: input.isPublic !== false,
      coverUrl: input.coverUrl ?? null,
    },
  });
  return col;
}

/** 更新收藏夹 */
export async function updateCollection(input: UpdateCollectionInput) {
  const col = await prisma.postCollection.findUnique({ where: { id: input.id } });
  if (!col) return 'not_found' as const;
  if (col.userId !== input.userId) return 'forbidden' as const;

  const updated = await prisma.postCollection.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
      ...(input.coverUrl !== undefined && { coverUrl: input.coverUrl }),
      updatedAt: new Date(),
    },
  });

  return { status: 'ok' as const, data: updated };
}

/** 删除收藏夹 */
export async function deleteCollection(id: number, userId: number) {
  const col = await prisma.postCollection.findUnique({ where: { id } });
  if (!col) return 'not_found' as const;
  if (col.userId !== userId) return 'forbidden' as const;

  await prisma.postCollection.delete({ where: { id } });
  return 'deleted' as const;
}

/** 获取收藏夹内笔记 */
export async function findCollectionNotes(params: CollectionNotesParams) {
  const { collectionId, page, pageSize } = params;

  const [notes, total] = await Promise.all([
    prisma.postSave.findMany({
      where: { collectionId },
      include: {
        post: {
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.postSave.count({ where: { collectionId } }),
  ]);

  return { list: notes.map(s => s.post), total };
}
