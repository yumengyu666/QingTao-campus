import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated, notFound } from '../utils/response';
import { comparePassword, hashPassword } from '../services/auth.service';
import { containsSensitive } from '../utils/sensitive';
import { createNotification } from '../services/notification.service';
import { logger } from '../utils/logger';

// GET /api/users/:id — 用户公开信息
export async function getUserProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return error(res, '无效的用户ID');

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, nickname: true, avatarUrl: true, wechat: true, qq: true,
        bio: true, campusArea: true, status: true, createdAt: true,
      },
    });
    if (!user) return notFound(res, '用户不存在');

    const isDisabled = user.status === 'disabled';

    // 已注销用户返回受限信息
    if (isDisabled) {
      return success(res, {
        id: user.id,
        nickname: user.nickname || `已注销用户${user.id}`,
        avatarUrl: '',
        bio: '该用户已注销',
        campusArea: '',
        followCount: 0,
        fansCount: 0,
        goodsCount: 0,
        postsCount: 0,
        isFollowing: false,
        isDisabled: true,
        createdAt: user.createdAt,
      });
    }

    // 统计数据
    const [followCount, fansCount, goodsCount, postsCount, tradeStats] = await Promise.all([
      prisma.follow.count({ where: { followerId: id } }),
      prisma.follow.count({ where: { followingId: id } }),
      prisma.goods.count({ where: { userId: id, status: { in: ['approved', 'sold'] }, isDeleted: false } }),
      prisma.post.count({ where: { userId: id, status: 'approved', isDeleted: false } }),
      prisma.tradeReview.aggregate({
        where: { targetId: id },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    // 信誉等级计算
    const completedTrades = await prisma.tradeIntent.count({
      where: { OR: [{ buyerId: id }, { sellerId: id }], status: 'completed' },
    });
    const avgRating = tradeStats._avg.rating || 0;
    const reviewCount = tradeStats._count;
    let reputationLevel: string;
    let reputationLabel: string;
    if (completedTrades >= 20 && avgRating >= 4.5) {
      reputationLevel = 'diamond'; reputationLabel = '💎 金牌卖家';
    } else if (completedTrades >= 10 && avgRating >= 4.0) {
      reputationLevel = 'gold'; reputationLabel = '🥇 达人卖家';
    } else if (completedTrades >= 3 && avgRating >= 3.0) {
      reputationLevel = 'silver'; reputationLabel = '🥈 活跃卖家';
    } else if (completedTrades >= 1) {
      reputationLevel = 'bronze'; reputationLabel = '🥉 新手卖家';
    } else {
      reputationLevel = 'new'; reputationLabel = '🌱 新用户';
    }

    // 是否已关注（需登录）
    let isFollowing = false;
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.user.userId, followingId: id } },
      });
      isFollowing = !!follow;
    }

    // 未登录用户隐藏联系方式
    const publicUser: any = { ...user, followCount, fansCount, goodsCount, postsCount, isFollowing,
      reputationLevel, reputationLabel, completedTrades, avgRating: Math.round(avgRating * 10) / 10, reviewCount };
    if (!req.user) {
      delete publicUser.wechat;
      delete publicUser.qq;
    }
    return success(res, publicUser);
  } catch (err) {
    next(err);
  }
}

// GET /api/users/profile/changes — 当前用户自己的待审资料修改
export async function getMyProfileChanges(req: Request, res: Response, next: NextFunction) {
  try {
    const changes = await prisma.profileChange.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return success(res, changes);
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/profile — 修改个人资料（直接生效，L1敏感词+L2 AI审核）
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const allowedFields = ['nickname', 'avatarUrl', 'wechat', 'qq', 'bio', 'campusArea', 'phone', 'email'];
    const fieldLimits: Record<string, number> = { nickname: 20, wechat: 50, qq: 20, bio: 200, phone: 20, email: 100 };
    const changes = req.body;

    const data: Record<string, string> = {};
    for (const [field, newValue] of Object.entries(changes)) {
      if (!allowedFields.includes(field)) continue;
      if (typeof newValue !== 'string') continue;
      const limit = fieldLimits[field];
      if (limit && (newValue as string).length > limit) {
        return error(res, `"${field}"不能超过${limit}个字符`);
      }
      if (containsSensitive(newValue)) return error(res, `"${field}"包含违规内容`);
      data[field] = newValue;
    }

    if (Object.keys(data).length === 0) return error(res, '未检测到任何修改');

    await prisma.user.update({ where: { id: userId }, data });

    // L2 AI 异步审核资料修改
    const bio = data['bio'];
    if (bio && bio.trim()) {
      import('../services/moderation.service').then(({ aiModerate }) => {
        aiModerate(bio, { contentType: 'user_bio', userId }).then(result => {
          if (result === 'violation') {
            logger.warn(`AI flagged user #${userId} bio, clearing`);
            prisma.user.update({ where: { id: userId }, data: { bio: '' } }).catch(() => {});
            createNotification({
              userId,
              type: 'review_result',
              title: '个人简介被重置',
              content: '您的个人简介经审核判定为违规，已被清空。如需修改请重新编辑。',
            }).catch(() => {});
          }
        });
      });
    }

    return success(res, null, '资料已更新');
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/password — 修改密码
export async function updatePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return error(res, '请输入旧密码和新密码');
    if (newPassword.length < 6) return error(res, '新密码至少6位');

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return notFound(res);

    const valid = await comparePassword(oldPassword, user.passwordHash);
    if (!valid) return error(res, '旧密码错误');

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });

    return success(res, null, '密码修改成功，请重新登录');
  } catch (err) {
    next(err);
  }
}

// POST /api/users/:id/follow — 关注
export async function followUser(req: Request, res: Response, next: NextFunction) {
  try {
    const followerId = req.user!.userId;
    const followingId = parseInt(req.params.id as string);
    if (isNaN(followingId)) return error(res, '无效的用户ID');

    if (followerId === followingId) return error(res, '不能关注自己');

    const target = await prisma.user.findUnique({ where: { id: followingId } });
    if (!target) return notFound(res, '用户不存在');

    const exist = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (exist) return success(res, null, '已关注该用户');

    // 关注通知去重：5分钟内同一人重复关注不重复通知
    const recentNotification = await prisma.notification.findFirst({
      where: {
        userId: followingId,
        type: 'new_follower',
        relatedId: followerId,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.follow.create({ data: { followerId, followingId } });
      if (!recentNotification) {
        await tx.notification.create({
          data: {
            userId: followingId,
            type: 'new_follower',
            title: '你有新的粉丝',
            content: `${req.user!.username} 关注了你`,
            relatedId: followerId,
          },
        });
      }
    });

    return success(res, null, '关注成功');
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/:id/follow — 取消关注
export async function unfollowUser(req: Request, res: Response, next: NextFunction) {
  try {
    const followerId = req.user!.userId;
    const followingId = parseInt(req.params.id as string);

    await prisma.follow.deleteMany({
      where: { followerId, followingId },
    });

    return success(res, null, '已取消关注');
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id/followers — 粉丝列表
export async function getFollowers(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id as string);
    if (isNaN(userId)) return error(res, '无效的用户ID');
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;

    const [list, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        include: { follower: { select: { id: true, nickname: true, avatarUrl: true, bio: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);

    const data = list.map(f => f.follower);
    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id/following — 关注列表
export async function getFollowing(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id as string);
    if (isNaN(userId)) return error(res, '无效的用户ID');
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;

    const [list, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        include: { following: { select: { id: true, nickname: true, avatarUrl: true, bio: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    const data = list.map(f => f.following);
    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id/goods — 用户商品
export async function getUserGoods(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id as string);
    if (isNaN(userId)) return error(res, '无效的用户ID');
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 12;
    const isOwner = req.user && req.user.userId === userId;

    const where: any = { userId, isDeleted: false };
    if (!isOwner) where.status = { in: ['approved', 'sold'] };

    const [list, total] = await Promise.all([
      prisma.goods.findMany({
        where,
        include: { category: { select: { name: true, icon: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.goods.count({ where }),
    ]);

    const data = list.map(g => ({
      ...g,
      images: JSON.parse(g.images || '[]'),
      categoryName: g.category?.name,
      category: undefined,
    }));

    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id/posts — 用户帖子
export async function getUserPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.id as string);
    if (isNaN(userId)) return error(res, '无效的用户ID');
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 12;
    const isOwner = req.user && req.user.userId === userId;

    const where: any = { userId, isDeleted: false };
    if (!isOwner) where.status = 'approved';

    const [list, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.post.count({ where }),
    ]);

    const data = list.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
    }));

    return paginated(res, data, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/me/notif-prefs — 获取通知偏好 */
export async function getNotifPrefs(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { notifPrefs: true },
    });
    const prefs = JSON.parse(user?.notifPrefs || '{}');
    return success(res, prefs);
  } catch (err) { next(err); }
}

/** PUT /api/users/me/notif-prefs — 更新通知偏好 */
export async function updateNotifPrefs(req: Request, res: Response, next: NextFunction) {
  try {
    const { prefs } = req.body;
    if (!prefs || typeof prefs !== 'object') return error(res, '无效的偏好设置');

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { notifPrefs: JSON.stringify(prefs) },
    });
    return success(res, null, '已更新');
  } catch (err) { next(err); }
}

/** DELETE /api/users/me — 注销账号（软删除：禁用+匿名化） */
export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'disabled',
          nickname: `已注销用户${userId}`,
          avatarUrl: '',
          wechat: '',
          qq: '',
          bio: '',
        },
      });
      await tx.goods.updateMany({ where: { userId }, data: { status: 'offline' } });
      await tx.post.updateMany({ where: { userId }, data: { status: 'offline' } });
      await tx.lostFound.updateMany({ where: { userId }, data: { status: 'offline' } });
    });

    return success(res, null, '账号已注销');
  } catch (err) {
    next(err);
  }
}
