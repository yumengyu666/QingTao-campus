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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseNotifications = sseNotifications;
const sse_service_1 = require("../services/sse.service");
/**
 * GET /api/sse/notifications — SSE 实时通知流
 * 前端: const es = new EventSource('/api/sse/notifications?token=xxx')
 * token 通过 query 传递（EventSource 不支持自定义 header）
 */
async function sseNotifications(req, res, next) {
    try {
        // 从 query 解析 token
        const token = req.query.token;
        if (!token) {
            res.status(401).json({ code: 401, message: '请提供 token 参数' });
            return;
        }
        const jwt = await Promise.resolve().then(() => __importStar(require('jsonwebtoken')));
        const { jwtConfig } = await Promise.resolve().then(() => __importStar(require('../config/jwt')));
        const payload = jwt.default.verify(token, jwtConfig.accessSecret, { algorithms: ['HS256'] });
        const userId = payload.userId;
        // SSE 头
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Nginx 不缓冲
        });
        res.write('\n'); // 初始化连接
        (0, sse_service_1.addClient)(userId, res);
        // 心跳：每30秒发送 keepalive
        const heartbeat = setInterval(() => {
            try {
                res.write(':keepalive\n\n');
            }
            catch {
                clearInterval(heartbeat);
            }
        }, 30000);
        req.on('close', () => {
            clearInterval(heartbeat);
            (0, sse_service_1.removeClient)(userId, res);
        });
    }
    catch {
        res.status(401).json({ code: 401, message: 'Token无效' });
    }
}
//# sourceMappingURL=sse.controller.js.map