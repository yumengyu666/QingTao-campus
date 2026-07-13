"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasContactMethod = hasContactMethod;
const database_1 = require("../config/database");
// 检查用户是否至少有一个有效的联系方式（含待审变更）
async function hasContactMethod(userId) {
    const [profile, pendingChanges] = await Promise.all([
        database_1.prisma.user.findUnique({ where: { id: userId }, select: { wechat: true, qq: true } }),
        database_1.prisma.profileChange.findMany({
            where: { userId, fieldName: { in: ['wechat', 'qq'] }, status: 'pending' },
            select: { fieldName: true, newValue: true },
        }),
    ]);
    if (!profile)
        return false;
    // 计算有效值：优先使用待审的新值，否则用当前值
    const pendingWechat = pendingChanges.find(c => c.fieldName === 'wechat');
    const pendingQq = pendingChanges.find(c => c.fieldName === 'qq');
    const effectiveWechat = pendingWechat ? pendingWechat.newValue : profile.wechat;
    const effectiveQq = pendingQq ? pendingQq.newValue : profile.qq;
    return !!(effectiveWechat || effectiveQq);
}
//# sourceMappingURL=contact.js.map