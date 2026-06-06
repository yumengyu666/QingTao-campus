import { Request, Response, NextFunction } from 'express';
import { addClient, removeClient } from '../services/sse.service';

/**
 * GET /api/sse/notifications — SSE 实时通知流
 * 前端: const es = new EventSource('/api/sse/notifications?token=xxx')
 * token 通过 query 传递（EventSource 不支持自定义 header）
 */
export async function sseNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    // 从 query 解析 token
    const token = req.query.token as string;
    if (!token) {
      res.status(401).json({ code: 401, message: '请提供 token 参数' });
      return;
    }

    const jwt = await import('jsonwebtoken');
    const { jwtConfig } = await import('../config/jwt');
    const payload = jwt.default.verify(token, jwtConfig.accessSecret, { algorithms: ['HS256'] }) as any;
    const userId = payload.userId;

    // SSE 头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx 不缓冲
    });
    res.write('\n'); // 初始化连接

    addClient(userId, res);

    // 心跳：每30秒发送 keepalive
    const heartbeat = setInterval(() => {
      try { res.write(':keepalive\n\n'); } catch { clearInterval(heartbeat); }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeClient(userId, res);
    });
  } catch {
    res.status(401).json({ code: 401, message: 'Token无效' });
  }
}
