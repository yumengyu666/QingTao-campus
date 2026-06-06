/**
 * Server-Sent Events 服务
 * 维护在线客户端连接，通知创建时广播
 */
import { Response } from 'express';
import { logger } from '../utils/logger';

// userId → Set<Response>
const clients = new Map<number, Set<Response>>();

export function addClient(userId: number, res: Response): void {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);
  logger.debug(`[SSE] Client connected: user#${userId} (${clients.get(userId)!.size} connections)`);
}

export function removeClient(userId: number, res: Response): void {
  const set = clients.get(userId);
  if (set) {
    set.delete(res);
    if (set.size === 0) clients.delete(userId);
  }
}

/**
 * 向指定用户推送 SSE 事件
 */
export function pushToUser(userId: number, event: string, data: any): void {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      removeClient(userId, res);
    }
  }
}

/**
 * 广播给所有在线客户端
 */
export function broadcast(event: string, data: any): void {
  for (const [userId, set] of clients) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      try { res.write(payload); } catch { removeClient(userId, res); }
    }
  }
}
