import { Request, Response } from 'express';
import { prisma } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

const startTime = Date.now();

async function checkDatabase(): Promise<boolean> {
  try { await prisma.$queryRaw`SELECT 1`; return true; } catch { return false; }
}

async function checkAIService(): Promise<boolean> {
  const apiUrl = process.env.MODERATION_API_URL;
  const apiKey = process.env.MODERATION_API_KEY;
  return !!(apiUrl && apiKey);
}

async function checkStorage(): Promise<boolean> {
  try {
    const testPath = path.resolve(__dirname, '..', '..', 'uploads', '.healthcheck');
    fs.mkdirSync(path.dirname(testPath), { recursive: true });
    fs.writeFileSync(testPath, Date.now().toString());
    fs.unlinkSync(testPath);
    return true;
  } catch { return false; }
}

export async function healthCheck(_req: Request, res: Response) {
  const [dbOk, storageWriteable] = await Promise.all([
    checkDatabase(),
    checkStorage(),
  ]);

  const allOk = dbOk && storageWriteable;

  res.json({
    status: allOk ? 'ok' : 'degraded',
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
