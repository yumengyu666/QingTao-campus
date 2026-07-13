"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockUser = blockUser;
exports.unblockUser = unblockUser;
exports.getBlockedList = getBlockedList;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/** POST /api/block/:userId — 拉黑用户 */
async function blockUser(req, res, next) {
    try {
        const blockerId = req.user.userId;
        const blockedId = parseInt(req.params.userId);
        if (isNaN(blockedId))
            return (0, response_1.error)(res, '无效的用户ID');
        if (blockerId === blockedId)
            return (0, response_1.error)(res, '不能拉黑自己');
        const target = await database_1.prisma.user.findUnique({ where: { id: blockedId } });
        if (!target)
            return (0, response_1.error)(res, '用户不存在', 404);
        const existing = await database_1.prisma.block.findUnique({
            where: { blockerId_blockedId: { blockerId, blockedId } },
        });
        if (existing)
            return (0, response_1.success)(res, null, '已拉黑该用户');
        await database_1.prisma.block.create({ data: { blockerId, blockedId } });
        return (0, response_1.success)(res, null, '已拉黑');
    }
    catch (err) {
        next(err);
    }
}
/** DELETE /api/block/:userId — 取消拉黑 */
async function unblockUser(req, res, next) {
    try {
        const blockerId = req.user.userId;
        const blockedId = parseInt(req.params.userId);
        if (isNaN(blockedId))
            return (0, response_1.error)(res, '无效的用户ID');
        const existing = await database_1.prisma.block.findUnique({
            where: { blockerId_blockedId: { blockerId, blockedId } },
        });
        if (!existing)
            return (0, response_1.error)(res, '未拉黑该用户');
        await database_1.prisma.block.delete({
            where: { blockerId_blockedId: { blockerId, blockedId } },
        });
        return (0, response_1.success)(res, null, '已取消拉黑');
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/block — 获取拉黑列表 */
async function getBlockedList(req, res, next) {
    try {
        const userId = req.user.userId;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
        const [list, total] = await Promise.all([
            database_1.prisma.block.findMany({
                where: { blockerId: userId },
                include: {
                    blocked: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.block.count({ where: { blockerId: userId } }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=block.controller.js.map