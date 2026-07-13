"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addClient = addClient;
exports.removeClient = removeClient;
exports.pushToUser = pushToUser;
exports.broadcast = broadcast;
const logger_1 = require("../utils/logger");
// userId → Set<Response>
const clients = new Map();
function addClient(userId, res) {
    if (!clients.has(userId))
        clients.set(userId, new Set());
    clients.get(userId).add(res);
    logger_1.logger.debug(`[SSE] Client connected: user#${userId} (${clients.get(userId).size} connections)`);
}
function removeClient(userId, res) {
    const set = clients.get(userId);
    if (set) {
        set.delete(res);
        if (set.size === 0)
            clients.delete(userId);
    }
}
/**
 * 向指定用户推送 SSE 事件
 */
function pushToUser(userId, event, data) {
    const set = clients.get(userId);
    if (!set || set.size === 0)
        return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
        try {
            res.write(payload);
        }
        catch {
            removeClient(userId, res);
        }
    }
}
/**
 * 广播给所有在线客户端
 */
function broadcast(event, data) {
    for (const [userId, set] of clients) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const res of set) {
            try {
                res.write(payload);
            }
            catch {
                removeClient(userId, res);
            }
        }
    }
}
//# sourceMappingURL=sse.service.js.map