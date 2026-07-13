"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSearchLogCleanup = startSearchLogCleanup;
exports.search = search;
exports.getHotSearches = getHotSearches;
exports.getSearchHistory = getSearchHistory;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
// 构建多关键词 OR 条件 + 标题匹配加权
function buildOrConditions(keyword, fields) {
    const terms = keyword.split(/\s+/).filter(t => t.length > 0).slice(0, 5); // 最多5个搜索词
    const conditions = [];
    for (const field of fields) {
        for (const term of terms) {
            conditions.push({ [field]: { contains: term } });
        }
    }
    return { OR: conditions.length > 0 ? conditions : fields.map(f => ({ [f]: { contains: keyword } })) };
}
// 启动时清理过期搜索日志
let cleanupTimer = null;
function startSearchLogCleanup() {
    if (cleanupTimer)
        return;
    // 每小时清理一次30天前的日志
    cleanupTimer = setInterval(async () => {
        try {
            const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const result = await database_1.prisma.searchLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
            if (result.count > 0) {
                logger_1.logger.info(`SearchLog cleanup: deleted ${result.count} expired records`);
            }
        }
        catch (err) {
            logger_1.logger.error('SearchLog cleanup failed:', err);
        }
    }, 3600000);
}
// GET /api/search — 全站搜索
async function search(req, res, next) {
    try {
        const keyword = req.query.keyword?.trim();
        const type = req.query.type; // goods | post | lostfound | qa | users (optional)
        const campus = req.query.campus; // kexue | dongfeng (optional campus filter)
        const page = parseInt(req.query.page) || 1;
        const pageSize = 20;
        if (!keyword)
            return (0, response_1.error)(res, '请输入搜索关键词');
        if (keyword.length > 50)
            return (0, response_1.error)(res, '搜索关键词过长');
        // 记录搜索日志（关联登录用户）
        await database_1.prisma.searchLog.create({
            data: {
                keyword: keyword.substring(0, 50),
                ip: req.ip || '',
            },
        });
        const results = [];
        let total = 0;
        // 搜索商品（支持校区筛选）
        if (!type || type === 'goods') {
            const includeSold = req.query.includeSold === 'true';
            const goodsWhere = {
                isDeleted: false,
                status: includeSold ? { in: ['approved', 'sold'] } : { in: ['approved'] },
                ...buildOrConditions(keyword, ['title', 'description']),
            };
            if (campus && ['kexue', 'dongfeng'].includes(campus)) {
                goodsWhere.campus = campus;
            }
            const [goods, goodsCount] = await Promise.all([
                database_1.prisma.goods.findMany({
                    where: goodsWhere,
                    include: {
                        category: { select: { name: true } },
                        user: { select: { id: true, nickname: true, avatarUrl: true } },
                    },
                    take: type ? pageSize : 5,
                    orderBy: { createdAt: 'desc' },
                }),
                database_1.prisma.goods.count({ where: goodsWhere }),
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
        // 搜索帖子（支持校区筛选）
        if (!type || type === 'post') {
            const postWhere = {
                isDeleted: false,
                status: 'approved',
                ...buildOrConditions(keyword, ['title', 'content']),
            };
            if (campus && ['kexue', 'dongfeng'].includes(campus)) {
                postWhere.user = { campusArea: campus };
            }
            const [posts, postsCount] = await Promise.all([
                database_1.prisma.post.findMany({
                    where: postWhere,
                    include: {
                        user: { select: { id: true, nickname: true, avatarUrl: true } },
                    },
                    take: type ? pageSize : 5,
                    orderBy: { createdAt: 'desc' },
                }),
                database_1.prisma.post.count({ where: postWhere }),
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
        // 搜索失物招领（支持校区筛选）
        if (!type || type === 'lostfound') {
            const lfWhere = {
                status: { in: ['approved', 'resolved'] },
                ...buildOrConditions(keyword, ['title', 'description', 'location']),
            };
            if (campus && ['kexue', 'dongfeng'].includes(campus)) {
                lfWhere.campus = campus;
            }
            const [lf, lfCount] = await Promise.all([
                database_1.prisma.lostFound.findMany({
                    where: lfWhere,
                    include: {
                        user: { select: { id: true, nickname: true, avatarUrl: true } },
                    },
                    take: type ? pageSize : 5,
                    orderBy: { createdAt: 'desc' },
                }),
                database_1.prisma.lostFound.count({ where: lfWhere }),
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
            const qaWhere = {
                isDeleted: false,
                ...buildOrConditions(keyword, ['title', 'content']),
            };
            const [qa, qaCount] = await Promise.all([
                database_1.prisma.qaPost.findMany({
                    where: qaWhere,
                    include: {
                        user: { select: { id: true, nickname: true, avatarUrl: true } },
                    },
                    take: type ? pageSize : 5,
                    orderBy: { createdAt: 'desc' },
                }),
                database_1.prisma.qaPost.count({ where: qaWhere }),
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
                database_1.prisma.user.findMany({
                    where: userWhere,
                    select: { id: true, username: true, nickname: true, avatarUrl: true, campusArea: true },
                    take: type ? pageSize : 10,
                }),
                database_1.prisma.user.count({ where: userWhere }),
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
        return (0, response_1.paginated)(res, paged, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/search/hot — 热门搜索词
async function getHotSearches(req, res, next) {
    try {
        // 统计最近7天的热门搜索
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const logs = await database_1.prisma.searchLog.groupBy({
            by: ['keyword'],
            where: { createdAt: { gte: since } },
            _count: { keyword: true },
            orderBy: { _count: { keyword: 'desc' } },
            take: 10,
        });
        const hot = logs.map(l => l.keyword);
        return (0, response_1.success)(res, hot);
    }
    catch (err) {
        next(err);
    }
}
// GET /api/search/history — 当前用户的搜索历史（最近20条）
async function getSearchHistory(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return (0, response_1.success)(res, []); // 未登录返回空
        const history = await database_1.prisma.searchLog.findMany({
            where: { ip: req.ip || '' },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { keyword: true, createdAt: true },
        });
        // 去重并返回
        const seen = new Set();
        const unique = history.filter(h => {
            if (seen.has(h.keyword))
                return false;
            seen.add(h.keyword);
            return true;
        });
        return (0, response_1.success)(res, unique.map(h => h.keyword));
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=search.controller.js.map