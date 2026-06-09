import { Request, Response } from 'express';
import { prisma } from '../config/database';

const startTime = Date.now();

export async function healthCheck(_req: Request, res: Response) {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {}

  const memUsage = process.memoryUsage();
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: {
      database: dbOk ? 'connected' : 'disconnected',
      memory: {
        used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) + '%',
      },
    },
    version: process.env.npm_package_version || '1.0.0',
  });
}

export async function getMetrics(_req: Request, res: Response) {
  try {
    const [userCount, goodsCount, postCount, todayCheckins] = await Promise.all([
      prisma.user.count({ where: { role: 'user' } }),
      prisma.goods.count({ where: { isDeleted: false } }),
      prisma.post.count({ where: { isDeleted: false } }),
      prisma.dailyCheckin.count({
        where: { checkinDate: new Date().toISOString().slice(0, 10) },
      }),
    ]);

    res.json({
      users: userCount,
      goods: goodsCount,
      posts: postCount,
      todayCheckins,
      serverUptime: Math.floor((Date.now() - startTime) / 3600) + 'h',
    });
  } catch {
    res.status(500).json({ error: 'Metrics unavailable' });
  }
}
