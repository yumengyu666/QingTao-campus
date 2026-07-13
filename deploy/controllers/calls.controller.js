"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateCall = initiateCall;
exports.answerCall = answerCall;
exports.rejectCall = rejectCall;
exports.endCall = endCall;
exports.getCallHistory = getCallHistory;
exports.getCallStatus = getCallStatus;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const websocket_service_1 = require("../services/websocket.service");
/** POST /api/calls/initiate — 发起通话 */
async function initiateCall(req, res, next) {
    try {
        const callerId = req.user.userId;
        const { calleeId, callType } = req.body;
        if (!calleeId)
            return (0, response_1.error)(res, '请指定通话对象');
        if (!['audio', 'video'].includes(callType))
            return (0, response_1.error)(res, '无效的通话类型');
        if (callerId === calleeId)
            return (0, response_1.error)(res, '不能给自己打电话');
        const callee = await database_1.prisma.user.findUnique({ where: { id: calleeId } });
        if (!callee)
            return (0, response_1.error)(res, '用户不存在', 404);
        if (callee.status === 'disabled')
            return (0, response_1.error)(res, '该用户已注销');
        const call = await database_1.prisma.callRecord.create({
            data: { callerId, calleeId, callType, status: 'pending' },
            include: {
                caller: { select: { id: true, nickname: true, avatarUrl: true } },
                callee: { select: { id: true, nickname: true, avatarUrl: true } },
            },
        });
        // 推送 WebSocket 通知给被叫方
        (0, websocket_service_1.wsPushToUser)(calleeId, {
            type: 'call_incoming',
            callId: call.id,
            callType,
            callerId,
            callerName: call.caller.nickname || '用户',
            callerAvatar: call.caller.avatarUrl,
        });
        return (0, response_1.success)(res, call, '呼叫中', 201);
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/calls/:id/answer — 接听通话 */
async function answerCall(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的通话ID');
        const call = await database_1.prisma.callRecord.findUnique({ where: { id } });
        if (!call)
            return (0, response_1.error)(res, '通话记录不存在', 404);
        if (call.calleeId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (call.status !== 'pending')
            return (0, response_1.error)(res, '通话已结束');
        await database_1.prisma.callRecord.update({ where: { id }, data: { status: 'active', startTime: new Date() } });
        // 通知主叫方：对方已接听
        (0, websocket_service_1.wsPushToUser)(call.callerId, { type: 'call_accepted', callId: id });
        return (0, response_1.success)(res, null, '已接听');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/calls/:id/reject — 拒接通话 */
async function rejectCall(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的通话ID');
        const call = await database_1.prisma.callRecord.findUnique({ where: { id } });
        if (!call)
            return (0, response_1.error)(res, '通话记录不存在', 404);
        if (call.calleeId !== req.user.userId && call.callerId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (!['pending', 'active'].includes(call.status))
            return (0, response_1.error)(res, '通话已结束');
        const newStatus = call.status === 'pending' ? 'missed' : 'rejected';
        await database_1.prisma.callRecord.update({ where: { id }, data: { status: newStatus, endTime: new Date() } });
        // 通知另一方
        const notifyId = req.user.userId === call.callerId ? call.calleeId : call.callerId;
        (0, websocket_service_1.wsPushToUser)(notifyId, { type: 'call_rejected', callId: id });
        return (0, response_1.success)(res, null, '已拒绝');
    }
    catch (err) {
        next(err);
    }
}
/** POST /api/calls/:id/end — 结束通话 */
async function endCall(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的通话ID');
        const call = await database_1.prisma.callRecord.findUnique({ where: { id } });
        if (!call)
            return (0, response_1.error)(res, '通话记录不存在', 404);
        if (call.callerId !== req.user.userId && call.calleeId !== req.user.userId)
            return (0, response_1.error)(res, '无权操作', 403);
        if (!['pending', 'active'].includes(call.status))
            return (0, response_1.error)(res, '通话已结束');
        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - new Date(call.startTime).getTime()) / 1000);
        await database_1.prisma.callRecord.update({
            where: { id },
            data: { status: call.status === 'active' ? 'completed' : 'canceled', endTime, duration },
        });
        // 通知另一方
        const notifyId = req.user.userId === call.callerId ? call.calleeId : call.callerId;
        (0, websocket_service_1.wsPushToUser)(notifyId, { type: 'call_ended', callId: id, duration });
        return (0, response_1.success)(res, { duration });
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/calls/history — 通话记录 */
async function getCallHistory(req, res, next) {
    try {
        const userId = req.user.userId;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const pageSize = 20;
        const [list, total] = await Promise.all([
            database_1.prisma.callRecord.findMany({
                where: { OR: [{ callerId: userId }, { calleeId: userId }] },
                include: {
                    caller: { select: { id: true, nickname: true, avatarUrl: true } },
                    callee: { select: { id: true, nickname: true, avatarUrl: true } },
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { startTime: 'desc' },
            }),
            database_1.prisma.callRecord.count({ where: { OR: [{ callerId: userId }, { calleeId: userId }] } }),
        ]);
        return (0, response_1.paginated)(res, list, total, page, pageSize);
    }
    catch (err) {
        next(err);
    }
}
/** GET /api/calls/:id — 查询通话状态（轮询用） */
async function getCallStatus(req, res, next) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return (0, response_1.error)(res, '无效的通话ID');
        const call = await database_1.prisma.callRecord.findUnique({
            where: { id },
            select: { id: true, status: true, callType: true, callerId: true, calleeId: true, startTime: true, endTime: true, duration: true },
        });
        if (!call)
            return (0, response_1.error)(res, '通话记录不存在', 404);
        if (call.callerId !== req.user.userId && call.calleeId !== req.user.userId)
            return (0, response_1.error)(res, '无权访问', 403);
        return (0, response_1.success)(res, call);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=calls.controller.js.map