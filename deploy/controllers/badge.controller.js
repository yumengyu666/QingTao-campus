"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyBadges = getMyBadges;
exports.getAllBadges = getAllBadges;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
/** GET /api/badges — 我的徽章 */
async function getMyBadges(req, res, next) {
    try {
        const userId = req.user.userId;
        const userBadges = await database_1.prisma.userBadge.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        const badgeIds = userBadges.map(ub => ub.badgeId);
        const badges = badgeIds.length > 0 ? await database_1.prisma.badge.findMany({
            where: { id: { in: badgeIds } },
            select: { id: true, name: true, icon: true, description: true },
        }) : [];
        const badgeMap = new Map(badges.map(b => [b.id, b]));
        return (0, response_1.success)(res, userBadges.map(ub => badgeMap.get(ub.badgeId) || null).filter(Boolean));
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/badges/all — 所有可用徽章 */
async function getAllBadges(_req, res, next) {
    try {
        const badges = await database_1.prisma.badge.findMany({ orderBy: { id: 'asc' } });
        return (0, response_1.success)(res, badges);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=badge.controller.js.map