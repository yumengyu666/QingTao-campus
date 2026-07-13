"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getList = getList;
exports.getDetail = getDetail;
exports.createWanted = createWanted;
exports.deleteWanted = deleteWanted;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const sensitive_1 = require("../utils/sensitive");
/** GET /api/wanted — 求购列表 */
async function getList(req, res, next) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const category = req.query.category;
        const campus = req.query.campus;
        const where = { isDeleted: false };
        if (category)
            where.category = category;
        if (campus)
            where.campus = campus;
        const [list, total] = await Promise.all([
            database_1.prisma.wantedItem.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.wantedItem.count({ where }),
        ]);
        // 批量查用户
        const userIds = [...new Set(list.map(w => w.userId))];
        const userMap = new Map((await database_1.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, nickname: true, avatarUrl: true },
        })).map(u => [u.id, u]));
        const data = list.map(w => ({
            ...w,
            images: JSON.parse(w.images || '[]'),
            user: userMap.get(w.userId) || null,
        }));
        return (0, response_1.paginated)(res, data, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/wanted/:id — 求购详情 */
async function getDetail(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效ID');
        const item = await database_1.prisma.wantedItem.findUnique({ where: { id } });
        if (!item || item.isDeleted)
            return (0, response_1.notFound)(res, '求购信息不存在');
        // 浏览+1
        database_1.prisma.wantedItem.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => { });
        const user = await database_1.prisma.user.findUnique({
            where: { id: item.userId },
            select: { id: true, nickname: true, avatarUrl: true },
        });
        return (0, response_1.success)(res, { ...item, images: JSON.parse(item.images || '[]'), user });
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/wanted — 发布求购 */
async function createWanted(req, res, next) {
    try {
        const { title, category, campus, budget, description, images } = req.body;
        if (!title?.trim())
            return (0, response_1.error)(res, '请输入标题');
        if (title.length > 50)
            return (0, response_1.error)(res, '标题最多50字');
        if ((0, sensitive_1.containsSensitive)(title))
            return (0, response_1.error)(res, '标题包含违规内容');
        if (description && (0, sensitive_1.containsSensitive)(description))
            return (0, response_1.error)(res, '描述包含违规内容');
        const item = await database_1.prisma.wantedItem.create({
            data: {
                userId: req.user.userId,
                title: title.trim(),
                category: category || '',
                campus: campus || '',
                budget: budget ? parseFloat(budget) : null,
                description: description?.trim() || '',
                images: JSON.stringify(images || []),
            },
        });
        return (0, response_1.success)(res, item, '发布成功', 201);
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/wanted/:id */
async function deleteWanted(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效ID');
        const item = await database_1.prisma.wantedItem.findUnique({ where: { id } });
        if (!item)
            return (0, response_1.notFound)(res, '求购信息不存在');
        if (item.userId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        await database_1.prisma.wantedItem.update({ where: { id }, data: { isDeleted: true } });
        return (0, response_1.success)(res, null, '已删除');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=wanted.controller.js.map