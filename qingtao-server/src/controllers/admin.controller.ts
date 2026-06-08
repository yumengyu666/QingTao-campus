import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';
import { logger } from '../utils/logger';
import { approveReview, rejectReview } from '../services/review.service';
import { broadcastAnnouncement } from '../services/notification.service';
import { logAction } from '../services/audit.service';
import fs from 'fs';
import path from 'path';

// GET /api/admin/stats — 数据概览
export async function getStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers, totalGoods, totalPosts, totalLostFound,
      newUsersToday, newGoodsToday, newPostsToday,
      pendingGoods, pendingPosts, pendingProfiles,
      pendingGoodsComments, pendingPostComments, pendingLostFoundComments,
    ] = await Promise.all([
      prisma.user.count({ where: { status: 'active' } }),
      prisma.goods.count({ where: { isDeleted: false, status: { not: 'pending' } } }),
      prisma.post.count({ where: { isDeleted: false, status: { not: 'pending' } } }),
      prisma.lostFound.count({ where: { status: { not: 'pending' } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.goods.count({ where: { createdAt: { gte: today } } }),
      prisma.post.count({ where: { createdAt: { gte: today } } }),
      prisma.goods.count({ where: { status: 'pending', isDeleted: false } }),
      prisma.post.count({ where: { status: 'pending', isDeleted: false } }),
      prisma.profileChange.count({ where: { status: 'pending' } }),
      prisma.goodsComment.count({ where: { status: 'pending' } }),
      prisma.postComment.count({ where: { status: 'pending' } }),
      prisma.lostFoundComment.count({ where: { status: 'pending' } }),
    ]);

    return success(res, {
      totalUsers,
      totalGoods,
      totalPosts,
      totalLostFound,
      newUsersToday,
      newGoodsToday,
      newPostsToday,
      pendingGoods,
      pendingPosts,
      pendingProfiles,
      pendingGoodsComments,
      pendingPostComments,
      pendingLostFoundComments,
      pendingTotal: pendingGoods + pendingPosts + pendingProfiles + pendingGoodsComments + pendingPostComments + pendingLostFoundComments,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/reviews — 审核队列（统一跨类型分页）
export async function getReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const reviewType = req.query.type as string;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);

    // 收集所有待审项到统一数组，再做分页
    let allItems: Array<{ id: number; reviewType: string; createdAt: Date }> = [];

    if (!reviewType || reviewType === 'goods') {
      const items = await prisma.goods.findMany({
        where: { status: 'pending', isDeleted: false },
        select: { id: true, createdAt: true },
      });
      items.forEach(i => allItems.push({ id: i.id, reviewType: 'goods', createdAt: i.createdAt }));
    }

    if (!reviewType || reviewType === 'posts') {
      const items = await prisma.post.findMany({
        where: { status: 'pending', isDeleted: false },
        select: { id: true, createdAt: true },
      });
      items.forEach(i => allItems.push({ id: i.id, reviewType: 'posts', createdAt: i.createdAt }));
    }

    if (!reviewType || reviewType === 'lostfound') {
      const items = await prisma.lostFound.findMany({
        where: { status: 'pending' },
        select: { id: true, createdAt: true },
      });
      items.forEach(i => allItems.push({ id: i.id, reviewType: 'lostfound', createdAt: i.createdAt }));
    }

    if (!reviewType || reviewType === 'profiles') {
      const items = await prisma.profileChange.findMany({
        where: { status: 'pending' },
        select: { id: true, createdAt: true },
      });
      items.forEach(i => allItems.push({ id: i.id, reviewType: 'profiles', createdAt: i.createdAt }));
    }

    if (!reviewType || reviewType === 'goods_comment') {
      const items = await prisma.goodsComment.findMany({
        where: { status: 'pending' },
        select: { id: true, createdAt: true },
      });
      items.forEach(i => allItems.push({ id: i.id, reviewType: 'goods_comment', createdAt: i.createdAt }));
    }

    if (!reviewType || reviewType === 'post_comment') {
      const items = await prisma.postComment.findMany({
        where: { status: 'pending' },
        select: { id: true, createdAt: true },
      });
      items.forEach(i => allItems.push({ id: i.id, reviewType: 'post_comment', createdAt: i.createdAt }));
    }

    if (!reviewType || reviewType === 'lostfound_comment') {
      const items = await prisma.lostFoundComment.findMany({
        where: { status: 'pending' },
        select: { id: true, createdAt: true },
      });
      items.forEach(i => allItems.push({ id: i.id, reviewType: 'lostfound_comment', createdAt: i.createdAt }));
    }

    // 统一排序 + 分页
    allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = allItems.length;
    const paged = allItems.slice((page - 1) * pageSize, page * pageSize);

    // 按类型批量加载详细信息
    const goodsIds = paged.filter(i => i.reviewType === 'goods').map(i => i.id);
    const postIds = paged.filter(i => i.reviewType === 'posts').map(i => i.id);
    const lfIds = paged.filter(i => i.reviewType === 'lostfound').map(i => i.id);
    const profileIds = paged.filter(i => i.reviewType === 'profiles').map(i => i.id);
    const gcIds = paged.filter(i => i.reviewType === 'goods_comment').map(i => i.id);
    const pcIds = paged.filter(i => i.reviewType === 'post_comment').map(i => i.id);
    const lfcIds = paged.filter(i => i.reviewType === 'lostfound_comment').map(i => i.id);

    const [goodsList, postList, lfList, profileList, gcList, pcList, lfcList] = await Promise.all([
      goodsIds.length > 0 ? prisma.goods.findMany({
        where: { id: { in: goodsIds } },
        include: {
          user: { select: { id: true, nickname: true } },
          category: { select: { name: true } },
        },
      }) : [],
      postIds.length > 0 ? prisma.post.findMany({
        where: { id: { in: postIds } },
        include: { user: { select: { id: true, nickname: true } } },
      }) : [],
      lfIds.length > 0 ? prisma.lostFound.findMany({
        where: { id: { in: lfIds } },
        include: { user: { select: { id: true, nickname: true } } },
      }) : [],
      profileIds.length > 0 ? prisma.profileChange.findMany({
        where: { id: { in: profileIds } },
        include: { user: { select: { id: true, nickname: true } } },
      }) : [],
      gcIds.length > 0 ? prisma.goodsComment.findMany({
        where: { id: { in: gcIds } },
        include: {
          user: { select: { id: true, nickname: true } },
          goods: { select: { id: true, title: true } },
        },
      }) : [],
      pcIds.length > 0 ? prisma.postComment.findMany({
        where: { id: { in: pcIds } },
        include: {
          user: { select: { id: true, nickname: true } },
          post: { select: { id: true, title: true } },
        },
      }) : [],
      lfcIds.length > 0 ? prisma.lostFoundComment.findMany({
        where: { id: { in: lfcIds } },
        include: {
          user: { select: { id: true, nickname: true } },
          lostFound: { select: { id: true, title: true } },
        },
      }) : [],
    ]);

    // 组装结果，保持分页顺序
    const data = paged.map(item => {
      if (item.reviewType === 'goods') {
        const g = goodsList.find(x => x.id === item.id)!;
        return { ...g, images: JSON.parse(g.images || '[]'), reviewType: 'goods' };
      }
      if (item.reviewType === 'posts') {
        const p = postList.find(x => x.id === item.id)!;
        return { ...p, images: JSON.parse(p.images || '[]'), reviewType: 'posts' };
      }
      if (item.reviewType === 'lostfound') {
        const l = lfList.find(x => x.id === item.id)!;
        return { ...l, images: JSON.parse(l.images || '[]'), reviewType: 'lostfound' };
      }
      if (item.reviewType === 'profiles') {
        const pc = profileList.find(x => x.id === item.id)!;
        return { ...pc, reviewType: 'profiles' };
      }
      if (item.reviewType === 'goods_comment') {
        const gc = gcList.find(x => x.id === item.id)!;
        return { ...gc, reviewType: 'goods_comment', contentTitle: gc.goods?.title };
      }
      if (item.reviewType === 'post_comment') {
        const pc = pcList.find(x => x.id === item.id)!;
        return { ...pc, reviewType: 'post_comment', contentTitle: pc.post?.title };
      }
      const lfc = lfcList.find(x => x.id === item.id)!;
      return { ...lfc, reviewType: 'lostfound_comment', contentTitle: lfc.lostFound?.title };
    });

    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/reviews/:type/:id/approve — 通过审核
export async function approveReviewAction(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, id } = req.params as { type: string; id: string };
    if (!['goods', 'posts', 'lostfound', 'profile', 'profiles', 'goods_comment', 'post_comment', 'lostfound_comment'].includes(type)) {
      return error(res, '无效的审核类型');
    }
    // 统一 profiles → profile
    const normalizedType = type === 'profiles' ? 'profile' : type;

    const result = await approveReview(normalizedType as any, parseInt(id), req.user!.userId);
    return success(res, result, '审核通过');
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/reviews/:type/:id/reject — 拒绝审核
export async function rejectReviewAction(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, id } = req.params as { type: string; id: string };
    const { reason } = req.body;

    if (!['goods', 'posts', 'lostfound', 'profile', 'profiles', 'goods_comment', 'post_comment', 'lostfound_comment'].includes(type)) {
      return error(res, '无效的审核类型');
    }
    if (!reason?.trim()) return error(res, '请填写拒绝原因');

    const normalizedType = type === 'profiles' ? 'profile' : type;

    const result = await rejectReview(normalizedType as any, parseInt(id), req.user!.userId, reason.trim());
    return success(res, result, '已拒绝');
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users — 用户列表
export async function getUserList(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;
    const keyword = req.query.keyword as string;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { nickname: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, username: true, nickname: true, avatarUrl: true,
          role: true, status: true, createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/status — 禁用/启用用户
export async function toggleUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的用户ID');
    const { status } = req.body; // active | disabled

    if (!['active', 'disabled'].includes(status)) {
      return error(res, '无效的状态值');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return error(res, '用户不存在', 404);
    if (user.role === 'admin') return error(res, '不能禁用管理员');

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status } });

      if (status === 'disabled') {
        await tx.goods.updateMany({ where: { userId: id, status: 'approved' }, data: { status: 'pending' } });
        await tx.post.updateMany({ where: { userId: id, status: 'approved' }, data: { status: 'pending' } });
        await tx.lostFound.updateMany({ where: { userId: id, status: 'approved' }, data: { status: 'pending' } });
        await tx.cartItem.deleteMany({ where: { userId: id } });
      }
    });

    // 审计日志
    logAction({
      adminId: req.user!.userId,
      action: status === 'disabled' ? 'disable_user' : 'enable_user',
      targetType: 'user',
      targetId: id,
      detail: `${status === 'disabled' ? '禁用' : '启用'}用户 ${user.username} (id=${id})`,
      ip: req.ip,
    });

    return success(res, null, status === 'active' ? '已启用' : '已禁用（内容已冻结）');
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/categories — 新增分类
export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, icon, sortOrder } = req.body;
    if (!name?.trim()) return error(res, '请输入分类名称');

    const category = await prisma.category.create({
      data: { name: name.trim(), icon: icon || 'default', sortOrder: sortOrder || 0 },
    });

    return success(res, category, '分类已创建', 201);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/categories/:id — 编辑分类
export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的分类ID');
    const { name, icon, sortOrder } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return success(res, category, '已更新');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/categories/:id — 删除分类
export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的分类ID');
    // 检查是否有商品使用该分类
    const count = await prisma.goods.count({ where: { categoryId: id, isDeleted: false } });
    if (count > 0) return error(res, `该分类下有 ${count} 件商品，无法删除`);

    await prisma.category.delete({ where: { id } });
    return success(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/users/:id — 删除用户（软删除：禁用+内容清空）
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的用户ID');
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return error(res, '用户不存在', 404);
    if (user.role === 'admin') return error(res, '不能删除管理员');

    await prisma.$transaction(async (tx) => {
      // 禁用 + 匿名化
      await tx.user.update({
        where: { id },
        data: {
          status: 'disabled',
          nickname: `已注销用户${id}`,
          avatarUrl: '',
          wechat: '',
          qq: '',
          bio: '',
        },
      });
      // 冻结所有内容（标记下架而非软删除，保留可查看）
      await tx.goods.updateMany({ where: { userId: id }, data: { status: 'offline' } });
      await tx.post.updateMany({ where: { userId: id }, data: { status: 'offline' } });
      await tx.lostFound.updateMany({ where: { userId: id }, data: { status: 'offline' } });
      // 清空购物车 + 通知 + 收藏
      await tx.cartItem.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.favorite.deleteMany({ where: { userId: id } });
    });

    return success(res, null, '用户已删除（账号禁用+内容清理）');
  } catch (err) {
    next(err);
  }
}
export async function createAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content } = req.body;
    if (!title?.trim()) return error(res, '请输入公告标题');

    const announcement = await broadcastAnnouncement(title.trim(), content || '', req.user!.userId);

    return success(res, announcement, '公告已发布，将通知所有用户');
  } catch (err) {
    next(err);
  }
}

// ==================== 举报处理 ====================

// GET /api/admin/reports — 举报列表
export async function getReports(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;

    const [list, total] = await Promise.all([
      prisma.report.findMany({
        include: {
          reporter: { select: { id: true, nickname: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count(),
    ]);

    return paginated(res, list, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/reports/:id/handle — 处理举报
export async function handleReport(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的举报ID');
    const { action } = req.body; // handled | dismissed

    if (!['handled', 'dismissed'].includes(action)) {
      return error(res, '无效的处理方式');
    }

    const report = await prisma.report.findUnique({ where: { id }, select: { reporterId: true, reason: true } });

    await prisma.report.update({
      where: { id },
      data: { status: action, handledBy: req.user!.userId },
    });

    // 通知举报者处理结果
    if (report?.reporterId) {
      const { createNotification } = await import('../services/notification.service');
      createNotification({
        userId: report.reporterId,
        type: 'review_result',
        title: action === 'handled' ? '你的举报已处理' : '你的举报已驳回',
        content: action === 'handled'
          ? '管理员已处理你的举报，感谢你的监督'
          : '管理员审核后认为该举报不成立',
        relatedId: id,
      }).catch(() => {});
    }

    return success(res, null, action === 'handled' ? '已处理' : '已驳回');
  } catch (err) {
    next(err);
  }
}

// POST /api/reports — 用户提交举报
export async function submitReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { targetType, targetId, reason } = req.body;

    if (!targetType || !targetId || !reason?.trim()) {
      return error(res, '请填写完整的举报信息');
    }
    if (!['goods', 'post', 'lostfound', 'user', 'treehole_post', 'treehole_comment', 'course_resource', 'qapost'].includes(targetType)) {
      return error(res, '无效的举报类型');
    }
    if (reason.length > 500) return error(res, '举报原因最多500字');

    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.userId,
        targetType,
        targetId,
        reason: reason.trim(),
      },
    });

    return success(res, report, '举报已提交', 201);
  } catch (err) {
    next(err);
  }
}

// POST /api/reports/appeal — 用户申诉被AI误判的内容
export async function submitAppeal(req: Request, res: Response, next: NextFunction) {
  try {
    const { contentType, contentId, reason } = req.body;
    if (!contentType || !contentId || !reason?.trim()) return error(res, '请填写完整的申诉信息');
    if (!['goods', 'post', 'lostfound'].includes(contentType)) return error(res, '不支持的申诉类型');
    if (reason.length > 500) return error(res, '申诉原因最多500字');

    // 验证内容属于当前用户
    const userId = req.user!.userId;
    let ownerId: number | null = null;
    switch (contentType) {
      case 'goods': {
        const g = await prisma.goods.findUnique({ where: { id: contentId }, select: { userId: true, status: true } });
        if (!g) return error(res, '内容不存在', 404);
        if (g.status !== 'offline') return error(res, '该内容未被下架，无需申诉');
        ownerId = g.userId;
        break;
      }
      case 'post': {
        const p = await prisma.post.findUnique({ where: { id: contentId }, select: { userId: true, status: true } });
        if (!p) return error(res, '内容不存在', 404);
        if (p.status !== 'offline') return error(res, '该内容未被下架，无需申诉');
        ownerId = p.userId;
        break;
      }
      case 'lostfound': {
        const lf = await prisma.lostFound.findUnique({ where: { id: contentId }, select: { userId: true, status: true } });
        if (!lf) return error(res, '内容不存在', 404);
        if (lf.status !== 'offline') return error(res, '该内容未被下架，无需申诉');
        ownerId = lf.userId;
        break;
      }
    }
    if (ownerId !== userId) return error(res, '无权申诉', 403);

    // 创建申诉举报
    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        targetType: `${contentType}_appeal`,
        targetId: contentId,
        reason: `[申诉] ${reason.trim()}`,
      },
    });

    // 通知管理员
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
    for (const admin of admins) {
      const { createNotification } = await import('../services/notification.service');
      createNotification({
        userId: admin.id,
        type: 'review_result',
        title: '用户申诉',
        content: `用户申诉 ${contentType} #${contentId}：${reason.slice(0, 80)}`,
        relatedId: report.id,
      }).catch(() => {});
    }

    return success(res, report, '申诉已提交', 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/content/pending — 待审内容列表
export async function getPendingContent(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.query.type as string; // goods | posts | lostfound
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = 20;

    const results: any[] = [];
    let total = 0;

    if (!type || type === 'goods') {
      const where = { status: 'pending', isDeleted: false };
      const [list, count] = await Promise.all([
        prisma.goods.findMany({ where, include: { user: { select: { id: true, nickname: true } }, category: { select: { name: true } } }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.goods.count({ where }),
      ]);
      list.forEach(g => results.push({ _type: 'goods', id: g.id, title: g.title, content: g.description, userId: g.userId, user: g.user, category: g.category?.name, createdAt: g.createdAt }));
      total += count;
    }

    if (!type || type === 'posts') {
      const where = { status: 'pending', isDeleted: false };
      const [list, count] = await Promise.all([
        prisma.post.findMany({ where, include: { user: { select: { id: true, nickname: true } } }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.post.count({ where }),
      ]);
      list.forEach(p => results.push({ _type: 'post', id: p.id, title: p.title, content: p.content, userId: p.userId, user: p.user, createdAt: p.createdAt }));
      total += count;
    }

    if (!type || type === 'lostfound') {
      const where = { status: 'pending', isDeleted: false };
      const [list, count] = await Promise.all([
        prisma.lostFound.findMany({ where, include: { user: { select: { id: true, nickname: true } } }, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma.lostFound.count({ where }),
      ]);
      list.forEach(lf => results.push({ _type: 'lostfound', id: lf.id, title: lf.title, content: lf.description, userId: lf.userId, user: lf.user, createdAt: lf.createdAt }));
      total += count;
    }

    return paginated(res, results, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/content/:type/:id/approve — 审核通过
export async function approveContent(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.params.type as string;
    const contentId = parseInt(req.params.id as string);
    if (isNaN(contentId)) return error(res, '无效的内容ID');
    const adminId = req.user!.userId;

    if (type === 'goods') {
      const item = await prisma.goods.update({ where: { id: contentId }, data: { status: 'approved', reviewedBy: adminId } });
      logger.info(`[ADMIN] User#${adminId} approved goods #${contentId} "${item.title}"`);
      notifyContentAuthor(item.userId, 'review_result', `你的商品"${item.title}"已通过审核`, '商品审核通过，已公开展示', contentId);
    } else if (type === 'post') {
      const item = await prisma.post.update({ where: { id: contentId }, data: { status: 'approved' } });
      logger.info(`[ADMIN] User#${adminId} approved post #${contentId} "${item.title}"`);
      notifyContentAuthor(item.userId, 'review_result', `你的帖子"${item.title}"已通过审核`, '帖子审核通过，已公开展示', contentId);
    } else if (type === 'lostfound') {
      const item = await prisma.lostFound.update({ where: { id: contentId }, data: { status: 'approved' } });
      logger.info(`[ADMIN] User#${adminId} approved lostfound #${contentId} "${item.title}"`);
      notifyContentAuthor(item.userId, 'review_result', `你的失物招领"${item.title}"已通过审核`, '失物招领审核通过，已公开展示', contentId);
    } else {
      return error(res, '无效的内容类型');
    }

    return success(res, null, '已通过');
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/content/:type/:id/reject — 审核拒绝
export async function rejectContent(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.params.type as string;
    const contentId = parseInt(req.params.id as string);
    if (isNaN(contentId)) return error(res, '无效的内容ID');
    const adminId = req.user!.userId;
    const { reason } = req.body;

    if (type === 'goods') {
      const item = await prisma.goods.update({ where: { id: contentId }, data: { status: 'rejected', reviewedBy: adminId, reviewComment: reason || '内容违规' } });
      logger.info(`[ADMIN] User#${adminId} rejected goods #${contentId} "${item.title}" reason: ${reason || 'unspecified'}`);
      notifyContentAuthor(item.userId, 'review_result', `你的商品"${item.title}"未通过审核`, reason || '内容违规，请修改后重新发布', contentId);
    } else if (type === 'post') {
      const item = await prisma.post.update({ where: { id: contentId }, data: { status: 'rejected', reviewComment: reason || '内容违规' } });
      logger.info(`[ADMIN] User#${adminId} rejected post #${contentId} "${item.title}" reason: ${reason || 'unspecified'}`);
      notifyContentAuthor(item.userId, 'review_result', `你的帖子"${item.title}"未通过审核`, reason || '内容违规，请修改后重新发布', contentId);
    } else if (type === 'lostfound') {
      const item = await prisma.lostFound.update({ where: { id: contentId }, data: { status: 'rejected', reviewComment: reason || '内容违规' } });
      logger.info(`[ADMIN] User#${adminId} rejected lostfound #${contentId} "${item.title}" reason: ${reason || 'unspecified'}`);
      notifyContentAuthor(item.userId, 'review_result', `你的失物招领"${item.title}"未通过审核`, reason || '内容违规，请修改后重新发布', contentId);
    } else {
      return error(res, '无效的内容类型');
    }

    return success(res, null, '已拒绝');
  } catch (err) {
    next(err);
  }
}

async function notifyContentAuthor(userId: number, type: string, title: string, content: string, relatedId: number) {
  try {
    const { createNotification } = await import('../services/notification.service');
    await createNotification({ userId, type, title, content, relatedId });
  } catch {}
}

// POST /api/admin/content/batch — 批量审核通过/拒绝
export async function batchReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, ids, action } = req.body; // type: goods|post|lostfound, ids: [1,2,3], action: approve|reject
    if (!type || !Array.isArray(ids) || ids.length === 0 || !['approve', 'reject'].includes(action)) {
      return error(res, '参数不完整');
    }
    if (ids.length > 50) return error(res, '单次最多批量处理50条');
    const adminId = req.user!.userId;

    let count = 0;
    for (const id of ids) {
      try {
        if (type === 'goods') {
          await prisma.goods.update({ where: { id }, data: action === 'approve' ? { status: 'approved', reviewedBy: adminId } : { status: 'rejected', reviewedBy: adminId } });
        } else if (type === 'post') {
          await prisma.post.update({ where: { id }, data: action === 'approve' ? { status: 'approved' } : { status: 'rejected' } });
        } else if (type === 'lostfound') {
          await prisma.lostFound.update({ where: { id }, data: action === 'approve' ? { status: 'approved' } : { status: 'rejected' } });
        } else continue;
        count++;
      } catch { /* skip not found */ }
    }

    // 审计日志
    logAction({
      adminId, action: `review_${action}`, targetType: type,
      detail: JSON.stringify({ ids, count }),
      ip: req.ip || '',
    });

    return success(res, { processed: count }, `已${action === 'approve' ? '通过' : '拒绝'} ${count} 条`);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/audit-logs?date=2026-06-06 — AI审核审计日志
export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const logPath = path.resolve(process.cwd(), 'audit-logs', `moderation-${date}.jsonl`);

    if (!fs.existsSync(logPath)) {
      return success(res, { date, entries: [], total: 0 });
    }

    const raw = fs.readFileSync(logPath, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const entries = lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    // 只返回摘要（不含原文全文）
    const summary = entries.map((e: any) => ({
      time: e.requestTime,
      contentType: e.contentType,
      userId: e.userId,
      result: e.result,
      model: e.model,
      elapsedMs: e.elapsedMs,
      textSnippet: e.textSnippet,
    }));

    return success(res, { date, entries: summary, total: summary.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/export/:type — 数据导出 CSV
export async function exportCSV(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.params.type as string;
    let csv = '';

    if (type === 'users') {
      const users = await prisma.user.findMany({ select: { id: true, username: true, nickname: true, role: true, status: true, violationCount: true, createdAt: true } });
      csv = 'id,username,nickname,role,status,violationCount,createdAt\n' + users.map(u => `${u.id},"${u.username}","${u.nickname}","${u.role}","${u.status}",${u.violationCount},"${u.createdAt.toISOString()}"`).join('\n');
    } else if (type === 'goods') {
      const goods = await prisma.goods.findMany({ where: { isDeleted: false }, select: { id: true, title: true, price: true, status: true, viewCount: true, createdAt: true } });
      csv = 'id,title,price,status,viewCount,createdAt\n' + goods.map(g => `${g.id},"${g.title}",${g.price},"${g.status}",${g.viewCount},"${g.createdAt.toISOString()}"`).join('\n');
    } else if (type === 'reports') {
      const reports = await prisma.report.findMany({ include: { reporter: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 1000 });
      csv = 'id,targetType,targetId,reason,status,reporter,createdAt\n' + reports.map(r => `${r.id},"${r.targetType}",${r.targetId},"${r.reason}","${r.status}","${(r.reporter as any).username}","${r.createdAt.toISOString()}"`).join('\n');
    } else {
      return error(res, '不支持的导出类型');
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\ufeff' + csv); // BOM for Excel UTF-8
  } catch (err) {
    next(err);
  }
}

// ─── 敏感词库管理 ───

/** GET /api/admin/sensitive-words — 获取全量敏感词 */
export async function getSensitiveWords(req: Request, res: Response, next: NextFunction) {
  try {
    const words = await prisma.sensitiveWord.findMany({ orderBy: { createdAt: 'desc' } });
    return success(res, { words, total: words.length });
  } catch (err) { next(err); }
}

/** POST /api/admin/sensitive-words — 添加敏感词 */
export async function addSensitiveWord(req: Request, res: Response, next: NextFunction) {
  try {
    const { word, category } = req.body;
    if (!word?.trim()) return error(res, '请输入敏感词');
    if (word.length > 50) return error(res, '敏感词过长');

    await prisma.sensitiveWord.upsert({
      where: { word: word.trim() },
      create: { word: word.trim(), category: category || 'general' },
      update: { enabled: true, category: category || 'general' },
    });
    return success(res, null, '已添加/更新', 201);
  } catch (err) { next(err); }
}

/** PUT /api/admin/sensitive-words/:id — 更新敏感词状态 */
export async function updateSensitiveWord(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    const { enabled, category } = req.body;
    if (isNaN(id)) return error(res, '无效ID');

    await prisma.sensitiveWord.update({
      where: { id },
      data: { ...(enabled !== undefined && { enabled }), ...(category && { category }) },
    });
    return success(res, null, '已更新');
  } catch (err) { next(err); }
}

/** DELETE /api/admin/sensitive-words/:id — 删除敏感词 */
export async function deleteSensitiveWord(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效ID');
    await prisma.sensitiveWord.delete({ where: { id } });
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}
