"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkin = checkin;
exports.getStatus = getStatus;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const points_controller_1 = require("./points.controller");
function today() {
    return new Date().toISOString().slice(0, 10);
}
function yesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}
/** POST /api/checkin — 签到 */
async function checkin(req, res, next) {
    try {
        const userId = req.user.userId;
        const date = today();
        const exist = await database_1.prisma.dailyCheckin.findUnique({
            where: { userId_checkinDate: { userId, checkinDate: date } },
        });
        if (exist)
            return (0, response_1.error)(res, '今日已签到');
        // 查昨天有没有签到，连续天数
        const last = await database_1.prisma.dailyCheckin.findUnique({
            where: { userId_checkinDate: { userId, checkinDate: yesterday() } },
        });
        const streak = (last?.streak || 0) + 1;
        const record = await database_1.prisma.dailyCheckin.create({
            data: { userId, checkinDate: date, streak },
        });
        // 签到奖励积分
        const pts = await (0, points_controller_1.addPoints)(userId, 'daily_checkin');
        return (0, response_1.success)(res, {
            streak,
            date,
            points: pts?.points,
            level: pts?.level,
            milestone: streak % 7 === 0 ? `🎉 连续签到${streak}天！` : null,
        }, '签到成功', 201);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/checkin — 今日签到状态 + 连续天数 */
async function getStatus(req, res, next) {
    try {
        const userId = req.user.userId;
        const date = today();
        const todayRecord = await database_1.prisma.dailyCheckin.findUnique({
            where: { userId_checkinDate: { userId, checkinDate: date } },
        });
        // 最近7天记录
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recent = await database_1.prisma.dailyCheckin.findMany({
            where: { userId, createdAt: { gte: sevenDaysAgo } },
            orderBy: { checkinDate: 'desc' },
            select: { checkinDate: true, streak: true },
        });
        return (0, response_1.success)(res, {
            checkedToday: !!todayRecord,
            streak: todayRecord?.streak || 0,
            recent: recent.map(r => ({ date: r.checkinDate, streak: r.streak })),
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=checkin.controller.js.map