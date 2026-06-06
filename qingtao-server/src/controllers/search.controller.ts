import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, paginated, error } from '../utils/response';
import { logger } from '../utils/logger';

// 构建多关键词 OR 条件 + 标题匹配加权
function buildOrConditions(keyword: string, fields: string[]) {
  const terms = keyword.split(/\s+/).filter(t => t.length > 0).slice(0, 5); // 最多5个搜索词
  const conditions: any[] = [];
  
  for (const field of fields) {
    for (const term of terms) {
      conditions.push({ [field]: { contains: term } });
    }
  }

  return { OR: conditions.length > 0 ? conditions : fields.map(f => ({ [f]: { contains: keyword } })) };
}

// 启动时清理过期搜索日志
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startSearchLogCleanup() {
  if (cleanupTimer) return;
  // 每小时清理一次30天前的日志
  cleanupTimer = setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await prisma.searchLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      if (result.count > 0) {
        logger.info(`SearchLog cleanup: deleted ${result.count} expired records`);
      }
    } catch (err) {
      logger.error('SearchLog cleanup failed:', err);
    }
  }, 3600000);
}

// GET /api/search — 全站搜索
export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const keyword = (req.query.keyword as string)?.trim();
    const type = req.query.type as string; // goods | post | lostfound (optional)
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;

    if (!keyword) return error(res, '请输入搜索关键词');
    if (keyword.length > 50) return error(res, '搜索关键词过长');

    // 记录搜索日志
    await prisma.searchLog.create({
      data: { keyword: keyword.substring(0, 50), ip: req.ip || '' },
    });

    const results: any[] = [];
    let total = 0;

    // 搜索商品
    if (!type || type === 'goods') {
      const includeSold = req.query.includeSold === 'true';
      const goodsWhere: any = {
        isDeleted: false,
        status: includeSold ? { in: ['approved', 'sold'] } : { in: ['approved'] },
        ...buildOrConditions(keyword, ['title', 'description']),
      };
      const [goods, goodsCount] = await Promise.all([
        prisma.goods.findMany({
          where: goodsWhere,
          include: {
            category: { select: { name: true } },
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
          take: type ? pageSize : 5,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.goods.count({ where: goodsWhere }),
      ]);
      goods.forEach(g => {
        results.push({
          id: g.id,
          type: 'goods',
          title: g.title,
          price: g.price,
          images: JSON.parse(g.images || '[]'),
          categoryName: g.category?.name,
          viewCount: g.viewCount,
          createdAt: g.createdAt,
          user: g.user,
        });
      });
      total += goodsCount;
    }

    // 搜索帖子
    if (!type || type === 'post') {
      const postWhere: any = {
        isDeleted: false,
        status: 'approved',
        ...buildOrConditions(keyword, ['title', 'content']),
      };
      const [posts, postsCount] = await Promise.all([
        prisma.post.findMany({
          where: postWhere,
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
          take: type ? pageSize : 5,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.post.count({ where: postWhere }),
      ]);
      posts.forEach(p => {
        results.push({
          id: p.id,
          type: 'post',
          title: p.title,
          content: (p.content || '').substring(0, 100),
          images: JSON.parse(p.images || '[]'),
          viewCount: p.viewCount,
          createdAt: p.createdAt,
          user: p.user,
        });
      });
      total += postsCount;
    }

    // 搜索失物招领
    if (!type || type === 'lostfound') {
      const lfWhere: any = {
        status: { in: ['approved', 'resolved'] },
        ...buildOrConditions(keyword, ['title', 'description', 'location']),
      };
      const [lf, lfCount] = await Promise.all([
        prisma.lostFound.findMany({
          where: lfWhere,
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
          take: type ? pageSize : 5,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.lostFound.count({ where: lfWhere }),
      ]);
      lf.forEach(l => {
        results.push({
          id: l.id,
          type: 'lostfound',
          lostfoundType: l.type,
          title: l.title,
          description: (l.description || '').substring(0, 100),
          images: JSON.parse(l.images || '[]'),
          viewCount: l.viewCount,
          createdAt: l.createdAt,
          user: l.user,
        });
      });
      total += lfCount;
    }

    // 搜索答疑
    if (!type || type === 'qa') {
      const qaWhere: any = {
        isDeleted: false,
        ...buildOrConditions(keyword, ['title', 'content']),
      };
      const [qa, qaCount] = await Promise.all([
        prisma.qaPost.findMany({
          where: qaWhere,
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
          },
          take: type ? pageSize : 5,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.qaPost.count({ where: qaWhere }),
      ]);
      qa.forEach(q => {
        results.push({
          id: q.id,
          type: 'qa',
          title: q.title,
          content: (q.content || '').substring(0, 100),
          answerCount: q.answerCount,
          viewCount: q.viewCount,
          createdAt: q.createdAt,
          user: q.user,
        });
      });
      total += qaCount;
    }

    // 搜索用户（排除管理员）
    if (!type || type === 'users') {
      const userWhere = {
        status: 'active',
        role: { not: 'admin' },
        ...buildOrConditions(keyword, ['username', 'nickname']),
      };
      const [users, usersCount] = await Promise.all([
        prisma.user.findMany({
          where: userWhere,
          select: { id: true, username: true, nickname: true, avatarUrl: true, campusArea: true },
          take: type ? pageSize : 10,
        }),
        prisma.user.count({ where: userWhere }),
      ]);
      users.forEach(u => {
        results.push({
          id: u.id,
          type: 'user',
          username: u.username,
          nickname: u.nickname,
          avatarUrl: u.avatarUrl,
          campusArea: u.campusArea,
        });
      });
      total += usersCount;
    }

    // 综合排序
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return paginated(res, paged, total, page, pageSize);
  } catch (err) {
    next(err);
  }
}

// GET /api/search/hot — 热门搜索词
export async function getHotSearches(req: Request, res: Response, next: NextFunction) {
  try {
    // 统计最近7天的热门搜索
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const logs = await prisma.searchLog.groupBy({
      by: ['keyword'],
      where: { createdAt: { gte: since } },
      _count: { keyword: true },
      orderBy: { _count: { keyword: 'desc' } },
      take: 10,
    });

    const hot = logs.map(l => l.keyword);
    return success(res, hot);
  } catch (err) {
    next(err);
  }
}
