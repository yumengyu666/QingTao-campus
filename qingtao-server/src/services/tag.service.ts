/**
 * 话题（标签）Service 层 — 话题关注、动态流
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

// ─── 关注管理 ───

/** 关注话题 */
export async function followTag(tagId: number, userId: number) {
  await prisma.tagFollow.upsert({
    where: { userId_tagId: { userId, tagId } },
    update: {},
    create: { userId, tagId },
  });

  prisma.topicTag
    .update({ where: { id: tagId }, data: { followerCount: { increment: 1 } } })
    .catch(() => {});
}

/** 取消关注话题 */
export async function unfollowTag(tagId: number, userId: number) {
  const result = await prisma.tagFollow.deleteMany({
    where: { userId, tagId },
  });

  if (result.count > 0) {
    prisma.topicTag
      .update({ where: { id: tagId }, data: { followerCount: { decrement: 1 } } })
      .catch(() => {});
  }
}

// ─── 动态流 ───

export interface TagFeedParams {
  tagName: string;
  page: number;
  pageSize?: number;
}

/** 获取话题动态流 */
export async function findFeedByTag(params: TagFeedParams) {
  const { tagName, page, pageSize = 20 } = params;

  const where: Prisma.PostWhereInput = {
    isDeleted: false,
    status: 'approved',
    tags: { some: { tag: { name: tagName } } },
  };

  const [list, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.count({ where }),
  ]);

  return {
    list: list.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
    })),
    total,
  };
}
