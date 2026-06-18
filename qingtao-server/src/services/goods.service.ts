/**
 * 商品 Service 层 — 纯业务逻辑，不依赖 req/res
 *
 * 设计原则:
 * - 所有方法接收明确的参数，返回 Promise<结果>
 * - 不处理 HTTP 状态码/响应格式（由 Controller 负责）
 * - 使用 Prisma 推导类型，禁止 any
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { goodsCache } from './cache.service';
import { createNotification } from './notification.service';
import { ViewCounter } from './view-counter.service';

// ─── 内部类型 ───

/** 图片标准化后的结构 */
interface NormalizedImage {
  url: string;
  blurredUrl: string;
  reviewId: number;
  pending: boolean;
}

/** 图片输入（可能是字符串 URL 或完整图片对象） */
type ImageInput = string | { url?: string; blurredUrl?: string; reviewId?: number };

/** 用户展示信息（来自 Prisma select） */
interface SellerInfo {
  id: number;
  nickname?: string;
  avatarUrl?: string;
  status?: string;
  wechat?: string;
  qq?: string;
}

/** 商品分类信息 */
interface CategoryInfo {
  name?: string;
  icon?: string;
}

/** 商品原始数据（来自 Prisma 查询） */
interface GoodsRaw {
  id: number;
  userId: number;
  images: string | unknown[];
  category?: CategoryInfo | null;
  user?: SellerInfo | null;
  [key: string]: unknown; // 允许其他 Prisma 字段透传
}

// ─── 公共工具 ───

/** 标准化图片格式 */
export function normalizeImages(raw: unknown): NormalizedImage[] {
  const arr: unknown[] = Array.isArray(raw) ? raw : JSON.parse(typeof raw === 'string' ? raw : '[]');
  return arr.map((img: unknown) => {
    if (typeof img === 'string') return { url: img, blurredUrl: img, reviewId: 0, pending: false };
    const obj = img as Record<string, unknown>;
    return {
      url: (obj.url as string) || '',
      blurredUrl: (obj.blurredUrl as string) || (obj.url as string) || '',
      reviewId: (obj.reviewId as number) || 0,
      pending: false,
    };
  });
}

/** 标准化用户展示（已注销/已封禁处理） */
export function normalizeSeller(user: SellerInfo | null): SellerInfo | null {
  if (!user) return null;
  const deleted = user.status === 'disabled' || user.nickname?.startsWith('已注销');
  if (deleted) return { id: user.id, nickname: `已注销用户${user.id}`, avatarUrl: '' };
  return user;
}

/** 标准化商品列表项 */
export function mapGoodsListItem(g: GoodsRaw) {
  const images = normalizeImages(g.images);
  return {
    ...g,
    images,
    categoryName: g.category?.name || '未分类',
    categoryIcon: g.category?.icon || '📦',
    category: undefined,
    user: normalizeSeller(g.user ?? null),
  };
}

// ─── 商品查询 ───

interface GoodsListParams {
  categoryId?: number;
  listType?: string;
  status?: string;
  campus?: string;
  condition?: string;
  priceMin?: number;
  priceMax?: number;
  keyword?: string;
  sort?: string;
  order?: string;
  page: number;
  pageSize: number;
}

export async function findGoodsList(params: GoodsListParams) {
  const { categoryId, listType, status, campus, condition, priceMin, priceMax, keyword, sort, order, page, pageSize } = params;

  const where: Prisma.GoodsWhereInput = { isDeleted: false };
  if (status) {
    where.status = status;
  } else {
    where.status = { in: ['approved', 'sold', 'pending'] };
  }

  if (categoryId) where.categoryId = categoryId;
  if (listType) where.listType = listType;
  if (campus) where.campus = campus;
  if (condition) {
    const conditions = condition.split(',').filter(c => ['brand_new', 'like_new', 'used', 'worn'].includes(c));
    if (conditions.length === 1) where.condition = conditions[0];
    else if (conditions.length > 1) where.condition = { in: conditions };
  }
  if (priceMin || priceMax) {
    where.price = {};
    if (priceMin) where.price.gte = priceMin;
    if (priceMax) where.price.lte = priceMax;
  }
  if (keyword) {
    where.OR = [
      { title: { contains: keyword } },
      { description: { contains: keyword } },
    ];
  }

  const allowedSorts = ['created_at', 'price', 'view_count'];
  const safeSort = allowedSorts.includes(sort || '') ? sort : 'created_at';
  let orderBy: Prisma.GoodsOrderByWithRelationInput = { createdAt: 'desc' };
  if (safeSort === 'price') orderBy = { price: order === 'asc' ? 'asc' : 'desc' };
  if (safeSort === 'view_count') orderBy = { viewCount: 'desc' };

  const [list, total] = await Promise.all([
    prisma.goods.findMany({
      where,
      include: { category: { select: { name: true, icon: true } }, user: { select: { id: true, nickname: true, avatarUrl: true, status: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
    }),
    prisma.goods.count({ where }),
  ]);

  return { list: list.map(mapGoodsListItem), total };
}

export async function findHotGoods(categoryId?: number, campus?: string, page = 1, pageSize = 10) {
  const where: Prisma.GoodsWhereInput = { isDeleted: false, status: { in: ['approved', 'pending'] } };
  if (categoryId) where.categoryId = categoryId;
  if (campus) where.campus = campus;

  const HOT_POOL = 200;
  const [list, total] = await Promise.all([
    prisma.goods.findMany({
      where,
      include: { category: { select: { name: true, icon: true } }, user: { select: { id: true, nickname: true, avatarUrl: true, status: true } } },
      orderBy: { viewCount: 'desc' },
      take: HOT_POOL,
    }),
    prisma.goods.count({ where }),
  ]);

  const now = Date.now();
  const sorted = list
    .map(g => {
      const ageDays = (now - new Date(g.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return { ...g, _hotScore: (g.viewCount || 0) / Math.max(1, Math.pow(ageDays, 1.5)) };
    })
    .sort((a, b) => (b as GoodsRaw & { _hotScore: number })._hotScore - (a as GoodsRaw & { _hotScore: number })._hotScore);

  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
  const { _hotScore: _, ...clean } = paged[0] ?? {};
  return { list: paged.map(({ _hotScore: __, ...g }) => mapGoodsListItem(g as GoodsRaw)), total };
}

export async function findGoodsById(id: number) {
  return prisma.goods.findUnique({
    where: { id },
    include: { category: { select: { name: true, icon: true } }, user: { select: { id: true, nickname: true, avatarUrl: true, wechat: true, qq: true, status: true } } },
  });
}

export async function createGoods(data: {
  userId: number; categoryId: number; title: string; description: string; price: number;
  originalPrice?: number | null; listType?: string; deposit?: number | null;
  rentStart?: string | null; rentEnd?: string | null; condition?: string;
  images: string[]; campus?: string; campusLocation?: string;
}) {
  return prisma.goods.create({
    data: {
      userId: data.userId,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description || '',
      price: data.price,
      originalPrice: data.originalPrice ?? null,
      listType: data.listType || 'sale',
      deposit: data.deposit ?? null,
      rentStart: data.rentStart ?? null,
      rentEnd: data.rentEnd ?? null,
      condition: data.condition || 'used',
      images: JSON.stringify(data.images || []),
      campus: data.campus || 'kexue',
      campusLocation: data.campusLocation || '',
      status: 'pending',
    },
  });
}

export async function softDeleteGoods(id: number) {
  await prisma.goods.update({ where: { id }, data: { isDeleted: true } });
  goodsCache.delete(String(id));
  await Promise.all([
    prisma.favorite.deleteMany({ where: { goodsId: id } }),
    prisma.notification.deleteMany({ where: { relatedId: id } }),
  ]);
}

export async function markGoodsSold(id: number, userId: number) {
  const [favoriters, recentChatters] = await Promise.all([
    prisma.favorite.findMany({ where: { goodsId: id }, select: { userId: true } }),
    prisma.chatMessage.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ['senderId'],
      take: 20,
    }),
  ]);

  await prisma.$transaction([
    prisma.goods.update({ where: { id }, data: { status: 'sold' } }),
    prisma.cartItem.deleteMany({ where: { goodsId: id } }),
    prisma.favorite.deleteMany({ where: { goodsId: id } }),
  ]);
  goodsCache.delete(String(id));

  // 通知收藏者和最近咨询者
  const notified = new Set<number>();
  for (const f of favoriters) {
    if (f.userId !== userId && !notified.has(f.userId)) {
      notified.add(f.userId);
      createNotification({ userId: f.userId, type: 'goods_sold', title: '收藏商品已售出', content: '你收藏的商品已被标记为售出', relatedId: id }).catch(() => {});
    }
  }
  for (const chatter of recentChatters) {
    if (!notified.has(chatter.senderId)) {
      notified.add(chatter.senderId);
      createNotification({ userId: chatter.senderId, type: 'goods_sold', title: '咨询商品已售出', content: '你咨询过的商品已被标记为售出', relatedId: id }).catch(() => {});
    }
  }
}

export async function updateGoodsStatus(id: number, status: string) {
  await prisma.goods.update({ where: { id }, data: { status } });
  goodsCache.delete(String(id));
}

export async function findRelatedGoods(goodsId: number) {
  const goods = await prisma.goods.findUnique({ where: { id: goodsId }, select: { categoryId: true, campus: true } });
  if (!goods) return [];
  return prisma.goods.findMany({
    where: { id: { not: goodsId }, isDeleted: false, status: 'approved', OR: [{ categoryId: goods.categoryId }, { campus: goods.campus }] },
    include: { category: { select: { name: true, icon: true } }, user: { select: { id: true, nickname: true, avatarUrl: true, status: true } } },
    orderBy: { viewCount: 'desc' },
    take: 4,
  });
}

export async function findGoodsComments(goodsId: number, currentUserId?: number, page = 1, pageSize = 20) {
  const where: Prisma.GoodsCommentWhereInput = { goodsId };
  if (currentUserId) {
    where.OR = [{ status: 'approved' }, { userId: currentUserId }];
  } else {
    where.status = 'approved';
  }
  return Promise.all([
    prisma.goodsComment.findMany({
      where, include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
      skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
    }),
    prisma.goodsComment.count({ where }),
  ]);
}

export async function createGoodsComment(goodsId: number, userId: number, content: string) {
  return prisma.goodsComment.create({
    data: { goodsId, userId, content, status: 'pending' },
    include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
  });
}

/** 增量浏览量（IP去重） */
export async function incrementViewCount(goodsId: number, viewerIp: string, counter: ViewCounter): Promise<boolean> {
  const viewKey = `goods:${goodsId}:${viewerIp}`;
  if (!counter.shouldCount(viewKey)) return false;
  await prisma.goods.update({ where: { id: goodsId }, data: { viewCount: { increment: 1 } } });
  return true;
}
