"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPoints = addPoints;
exports.getMyPoints = getMyPoints;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const POINTS_RULES = {
    daily_checkin: 5,
    publish_goods: 10,
    add_comment: 3,
    complete_trade: 20,
    publish_post: 8,
    answer_question: 6,
    report_approved: 4,
};
function calcLevel(points) {
    return Math.max(1, Math.floor(Math.sqrt(points / 10)));
}
async function addPoints(userId, action) {
    const pts = POINTS_RULES[action];
    if (!pts)
        return null;
    try {
        const user = await database_1.prisma.user.update({
            where: { id: userId },
            data: { points: { increment: pts } },
        });
        const newLevel = calcLevel(user.points);
        if (newLevel > user.level) {
            await database_1.prisma.user.update({ where: { id: userId }, data: { level: newLevel } });
        }
        return { points: user.points, level: newLevel > user.level ? newLevel : user.level };
    }
    catch {
        return null;
    }
}
/** GET /api/users/me/points — 我的积分 */
async function getMyPoints(req, res, next) {
    try {
        const user = await database_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { points: true, level: true, nickname: true },
        });
        if (!user)
            return res.status(404).json({ code: 404, message: '用户不存在', data: null });
        const nextLevelPts = (user.level + 1) ** 2 * 10;
        const progress = Math.min(100, Math.round((user.points / nextLevelPts) * 100));
        return (0, response_1.success)(res, {
            points: user.points,
            level: user.level,
            nickname: user.nickname,
            nextLevelPts,
            progress,
            rules: POINTS_RULES,
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=points.controller.js.map