/**
 * WebSocket 实时通信服务
 * 基于原生 ws 库，集成到现有 HTTP server
 * 支持：私信实时收发、typing状态、在线状态、通知推送
 */
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { logger } from '../utils/logger';

interface WsClient {
  userId: number;
  ws: WebSocket;
  connectedAt: number;
}

// userId → Set<WsClient>
const clients = new Map<number, Set<WsClient>>();

export function initWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // WebSocket 层心跳（30s ping，超时断开）
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      const wsClient = client as WebSocket & { isAlive?: boolean };
      if (wsClient.isAlive === false) {
        client.terminate();
        return;
      }
      wsClient.isAlive = false;
      client.ping();
    });
  }, 30_000);

  wss.on('connection', (ws, req) => {
    const wsAlive = ws as WebSocket & { isAlive?: boolean };
    wsAlive.isAlive = true;
    wsAlive.on('pong', () => { wsAlive.isAlive = true; });

    // 从 URL query 解析 token
    const url = new URL(req.url || '', `http://localhost`);
    const token = url.searchParams.get('token');
    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }

    let userId: number;
    try {
      const payload = jwt.verify(token, jwtConfig.accessSecret, { algorithms: ['HS256'] }) as any;
      userId = payload.userId;
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    const client: WsClient = { userId, ws, connectedAt: Date.now() };
    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId)!.add(client);
    logger.debug(`[WS] user#${userId} connected`);

    // 广播在线状态
    broadcastUserStatus(userId, 'online');

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(userId, msg, ws);
      } catch { /* ignore malformed messages */ }
    });

    ws.on('close', () => {
      const set = clients.get(userId);
      if (set) {
        set.delete(client);
        if (set.size === 0) {
          clients.delete(userId);
          broadcastUserStatus(userId, 'offline');
        }
      }
      logger.debug(`[WS] user#${userId} disconnected`);
    });

    ws.on('error', (err) => {
      logger.warn(`[WS] user#${userId} error: ${err.message}`);
    });

    // 确认连接成功
    ws.send(JSON.stringify({ type: 'connected', userId }));
  });

  logger.info('[WS] WebSocket server ready on /ws');
}

interface WsMessage {
  type: 'chat_message' | 'typing' | 'ping';
  to?: number;
  content?: string;
  messageType?: string;
}

// WebSocket 消息速率限制
const wsMsgWindow = new Map<string, { count: number; resetAt: number }>();
const WS_MSG_LIMIT = 15; // 每窗口最多 15 条
const WS_MSG_WINDOW = 10_000; // 10 秒窗口

function checkWsRateLimit(userId: number): boolean {
  const now = Date.now();
  const key = `chat:${userId}`;
  const entry = wsMsgWindow.get(key);
  if (!entry || now > entry.resetAt) {
    wsMsgWindow.set(key, { count: 1, resetAt: now + WS_MSG_WINDOW });
    return false;
  }
  if (entry.count >= WS_MSG_LIMIT) return true;
  entry.count++;
  return false;
}

function handleMessage(senderId: number, msg: WsMessage, ws: WebSocket): void {
  switch (msg.type) {
    case 'chat_message': {
      if (!msg.to || !msg.content) return;
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
      import('../middleware/moderation.middleware').then(({ containsSensitive }) => {
        if (containsSensitive(content)) {
          ws.send(JSON.stringify({ type: 'error', code: 'CONTENT_BLOCKED', message: '消息包含违规内容，请修改后重试' }));
          return;
        }
        // 保存到数据库
        import('../config/database').then(({ prisma }) => {
          prisma.chatMessage.create({
            data: {
              senderId, receiverId: msg.to!,
              content,
              type: msg.messageType || 'text',
            },
          }).then(saved => {
            ws.send(JSON.stringify({ type: 'message_sent', tempId: (msg as any).tempId, id: saved.id }));
            sendToUser(msg.to!, { type: 'new_message', message: { id: saved.id, senderId, content: saved.content, type: saved.type, createdAt: saved.createdAt.toISOString() } });
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
  }
}

function sendToUser(userId: number, data: any): void {
  const set = clients.get(userId);
  if (!set) return;
  const payload = JSON.stringify(data);
  for (const client of set) {
    try { client.ws.send(payload); } catch { /* client disconnected */ }
  }
}

function broadcastUserStatus(userId: number, status: string): void {
  // 通知所有关注者在线状态变化
  import('../config/database').then(({ prisma }) => {
    prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    }).then(followers => {
      for (const f of followers) {
        sendToUser(f.followerId, { type: 'user_status', userId, status });
      }
    }).catch(() => {});
  });
}

/** 供 SSE/外部调用的推送方法 */
export function wsPushToUser(userId: number, data: any): void {
  sendToUser(userId, data);
}
