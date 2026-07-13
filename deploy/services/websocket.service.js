"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocket = initWebSocket;
exports.wsPushToUser = wsPushToUser;
/**
 * WebSocket 实时通信服务
 * 基于原生 ws 库，集成到现有 HTTP server
 * 支持：私信实时收发、typing状态、在线状态、通知推送
 */
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../config/jwt");
const logger_1 = require("../utils/logger");
// userId → Set<WsClient>
const clients = new Map();
function initWebSocket(server) {
    const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
    // WebSocket 层心跳（30s ping，超时断开）
    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((client) => {
            const wsClient = client;
            if (wsClient.isAlive === false) {
                client.terminate();
                return;
            }
            wsClient.isAlive = false;
            client.ping();
        });
    }, 30_000);
    wss.on('connection', (ws, req) => {
        const wsAlive = ws;
        wsAlive.isAlive = true;
        wsAlive.on('pong', () => { wsAlive.isAlive = true; });
        // Auth timeout: if no valid auth within 5 seconds, close connection
        const authTimeout = setTimeout(() => {
            if (!wsAlive.userId) {
                ws.close(4001, 'Authentication timeout');
            }
        }, 5000);
        // Wait for auth message as first message instead of URL query param
        const authHandler = (raw) => {
            let msg;
            try {
                msg = JSON.parse(raw.toString());
            }
            catch {
                return;
            }
            if (msg.type !== 'auth' || !msg.token)
                return;
            let userId;
            try {
                const payload = jsonwebtoken_1.default.verify(msg.token, jwt_1.jwtConfig.accessSecret, { algorithms: ['HS256'] });
                userId = payload.userId;
            }
            catch {
                ws.close(4001, 'Invalid token');
                return;
            }
            clearTimeout(authTimeout);
            wsAlive.userId = userId;
            ws.off('message', authHandler); // Remove auth listener
            const client = { userId, ws, connectedAt: Date.now() };
            if (!clients.has(userId))
                clients.set(userId, new Set());
            clients.get(userId).add(client);
            logger_1.logger.debug(`[WS] user#${userId} connected`);
            broadcastUserStatus(userId, 'online');
            // Confirm connection
            ws.send(JSON.stringify({ type: 'connected', userId }));
            // Attach normal message handler
            ws.on('message', (raw) => {
                try {
                    const msg = JSON.parse(raw.toString());
                    handleMessage(userId, msg, ws);
                }
                catch { /* ignore malformed messages */ }
            });
        };
        ws.on('message', authHandler);
        ws.on('close', () => {
            const uid = wsAlive.userId;
            if (uid) {
                const set = clients.get(uid);
                if (set) {
                    set.forEach(c => { if (c.ws === ws)
                        set.delete(c); });
                    if (set.size === 0) {
                        clients.delete(uid);
                        broadcastUserStatus(uid, 'offline');
                    }
                }
                logger_1.logger.debug(`[WS] user#${uid} disconnected`);
            }
            clearTimeout(authTimeout);
        });
        ws.on('error', (err) => {
            logger_1.logger.warn(`[WS] user#${wsAlive.userId || '?'} error: ${err.message}`);
        });
    });
    logger_1.logger.info('[WS] WebSocket server ready on /ws');
}
// WebSocket 消息速率限制
const wsMsgWindow = new Map();
const WS_MSG_LIMIT = 15; // 每窗口最多 15 条
const WS_MSG_WINDOW = 10_000; // 10 秒窗口
function checkWsRateLimit(userId) {
    const now = Date.now();
    const key = `chat:${userId}`;
    const entry = wsMsgWindow.get(key);
    if (!entry || now > entry.resetAt) {
        wsMsgWindow.set(key, { count: 1, resetAt: now + WS_MSG_WINDOW });
        return false;
    }
    if (entry.count >= WS_MSG_LIMIT)
        return true;
    entry.count++;
    return false;
}
function handleMessage(senderId, msg, ws) {
    switch (msg.type) {
        case 'chat_message': {
            if (!msg.to || !msg.content)
                return;
            const content = msg.content.trim();
            if (!content || content.length > 2000) {
                ws.send(JSON.stringify({ type: 'error', code: 'INVALID_CONTENT', message: '消息内容不合法' }));
                return;
            }
            // 速率限制
            if (checkWsRateLimit(senderId)) {
                ws.send(JSON.stringify({ type: 'error', code: 'RATE_LIMITED', message: '发送过于频繁，请稍后再试' }));
                return;
            }
            // 敏感词过滤（Layer 1）
            Promise.resolve().then(() => __importStar(require('../middleware/moderation.middleware'))).then(({ containsSensitive }) => {
                if (containsSensitive(content)) {
                    ws.send(JSON.stringify({ type: 'error', code: 'CONTENT_BLOCKED', message: '消息包含违规内容，请修改后重试' }));
                    return;
                }
                // 保存到数据库
                Promise.resolve().then(() => __importStar(require('../config/database'))).then(({ prisma }) => {
                    prisma.chatMessage.create({
                        data: {
                            senderId, receiverId: msg.to,
                            content,
                            type: msg.messageType || 'text',
                        },
                    }).then(saved => {
                        ws.send(JSON.stringify({ type: 'message_sent', tempId: msg.tempId, id: saved.id }));
                        sendToUser(msg.to, { type: 'new_message', message: { id: saved.id, senderId, content: saved.content, type: saved.type, createdAt: saved.createdAt.toISOString() } });
                    }).catch(() => {
                        ws.send(JSON.stringify({ type: 'error', code: 'SAVE_FAILED', message: '消息发送失败，请重试' }));
                    });
                });
            });
            break;
        }
        case 'typing': {
            if (msg.to) {
                sendToUser(msg.to, { type: 'typing', from: senderId });
            }
            break;
        }
        case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
        // === Call Signaling Relay ===
        case 'call_incoming': {
            if (msg.to)
                sendToUser(msg.to, { type: 'call_incoming', callId: msg.callId, callType: msg.callType, callerId: senderId, callerName: msg.callerName, callerAvatar: msg.callerAvatar });
            break;
        }
        case 'call_accepted':
        case 'call_rejected':
        case 'call_ended':
        case 'call_canceled':
        case 'webrtc_offer':
        case 'webrtc_answer':
        case 'webrtc_ice': {
            if (msg.to)
                sendToUser(msg.to, { type: msg.type, callId: msg.callId, sdp: msg.sdp, candidate: msg.candidate, roomId: msg.roomId });
            break;
        }
        // === Message status relay ===
        case 'message_recall': {
            if (msg.to && msg.messageId)
                sendToUser(msg.to, { type: 'message_recall', messageId: msg.messageId });
            break;
        }
        case 'message_delivered': {
            if (msg.to && msg.messageId)
                sendToUser(msg.to, { type: 'message_delivered', messageId: msg.messageId });
            break;
        }
        case 'message_read': {
            if (msg.to && msg.messageId)
                sendToUser(msg.to, { type: 'message_read', messageId: msg.messageId });
            break;
        }
    }
}
function sendToUser(userId, data) {
    const set = clients.get(userId);
    if (!set)
        return;
    const payload = JSON.stringify(data);
    for (const client of set) {
        try {
            client.ws.send(payload);
        }
        catch { /* client disconnected */ }
    }
}
function broadcastUserStatus(userId, status) {
    // 通知所有关注者在线状态变化
    Promise.resolve().then(() => __importStar(require('../config/database'))).then(({ prisma }) => {
        prisma.follow.findMany({
            where: { followingId: userId },
            select: { followerId: true },
        }).then(followers => {
            for (const f of followers) {
                sendToUser(f.followerId, { type: 'user_status', userId, status });
            }
        }).catch(() => { });
    });
}
/** 供 SSE/外部调用的推送方法 */
function wsPushToUser(userId, data) {
    const set = clients.get(userId);
    if (!set || set.size === 0) {
        logger_1.logger.warn(`[WS-Push] user#${userId} not connected, dropping msg: ${data.type}`);
        return;
    }
    logger_1.logger.debug(`[WS-Push] user#${userId} ← ${data.type} (callId=${data.callId})`);
    sendToUser(userId, data);
}
//# sourceMappingURL=websocket.service.js.map