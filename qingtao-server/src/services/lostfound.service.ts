/**
 * 失物招领 Service 层
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

const LF_INCLUDE = {
  user: { select: { id: true, nickname: true, avatarUrl: true } as const },
};

const LFC_INCLUDE = {
  user: { select: { id: true, nickname: true, avatarUrl: true } as const },
};

export async function findLostFoundList(params: {
  type?: string; campusArea?: string; status?: string; keyword?: string;
  page: number; pageSize: number;
}) {
  const { type, campusArea, status, keyword, page, pageSize } = params;
  const where: Prisma.LostFoundWhereInput = { isDeleted: false };

  if (status) where.status = status;
  else where.status = { in: ['pending', 'resolved'] };
  if (type) where.type = type;
  if (campusArea) where.campus = campusArea;
  if (keyword) {
    where.OR = [{ title: { contains: keyword } }, { description: { contains: keyword } }];
  }

  const [list, total] = await Promise.all([
    prisma.lostFound.findMany({ where, include: LF_INCLUDE, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.lostFound.count({ where }),
  ]);

  return { list: list.map(l => ({ ...l, images: JSON.parse(l.images || '[]') })), total };
}

export async function findLostFoundById(id: number) {
  return prisma.lostFound.findUnique({ where: { id }, include: LF_INCLUDE });
}

export async function createLostFound(data: {
  userId: number; title: string; description: string; type: string;
  campusArea: string; images: string[]; location?: string;
  lostTime?: string; reward?: string; contactName?: string;
  wechat?: string; qq?: string; phone?: string;
}) {
  return prisma.lostFound.create({
    data: {
      userId: data.userId,
      title: data.title,
      description: data.description || '',
      type: data.type,
      campus: data.campusArea,          // API用 campusArea → Prisma用 campus
      location: data.location || '',
      lostTime: data.lostTime || '',
      reward: data.reward || '',
      contactWechat: data.wechat || '', // API用 wechat → Prisma用 contactWechat
      contactQq: data.qq || '',         // API用 qq → Prisma用 contactQq
      images: JSON.stringify(data.images || []),
      status: 'pending',
    },
  });
}

export async function updateLostFound(id: number, data: Prisma.LostFoundUpdateInput) {
  if (data.images) data.images = JSON.stringify(data.images);
  return prisma.lostFound.update({
    where: { id },
    data: { ...data, updatedAt: new Date() },
  });
}

export async function softDeleteLostFound(id: number) {
  await prisma.lostFound.update({ where: { id }, data: { isDeleted: true } });
  await prisma.notification.deleteMany({ where: { relatedId: id } });
}

export async function resolveLostFound(id: number) {
  return prisma.lostFound.update({ where: { id }, data: { status: 'resolved' } });
}

export async function incrementLostFoundView(id: number) {
  return prisma.lostFound.update({ where: { id }, data: { viewCount: { increment: 1 } } });
}

// ─── 评论 ───

export async function findLostFoundComments(itemId: number, currentUserId?: number, page = 1, pageSize = 20) {
  const where: Prisma.LostFoundCommentWhereInput = { lostFoundId: itemId };
  if (currentUserId) {
    where.OR = [{ status: 'approved' }, { userId: currentUserId }];
  } else {
    where.status = 'approved';
  }
  return Promise.all([
    prisma.lostFoundComment.findMany({ where, include: LFC_INCLUDE, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.lostFoundComment.count({ where }),
  ]);
}

export async function createLostFoundComment(itemId: number, userId: number, content: string) {
  return prisma.lostFoundComment.create({
    data: { lostFoundId: itemId, userId, content, status: 'pending' },
    include: LFC_INCLUDE,
  });
}

export async function deleteLostFoundComment(commentId: number) {
  return prisma.lostFoundComment.delete({ where: { id: commentId } });
}

export async function findLostFoundCommentById(commentId: number) {
  return prisma.lostFoundComment.findUnique({ where: { id: commentId } });
}
