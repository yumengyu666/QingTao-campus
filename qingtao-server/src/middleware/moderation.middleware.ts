/**
 * 文字审核中间件 — v2：词表同步 + AI 异步
 */
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { aiModerate } from '../services/moderation.service';
import { error } from '../utils/response';
import { prisma } from '../config/database';
import { createNotification } from '../services/notification.service';
import { logger } from '../utils/logger';

// ─── 快捷短语白名单：系统内置安全短语，免审 ───
const SAFE_PHRASES = new Set([
  '还在吗？', '最低多少？', '在哪里交易？', '今天能看吗？', '好的谢谢',
]);

// ─── 高危词表：命中后即时阻断 + 通知管理员（自杀/恐怖/儿童安全） ───
const HIGH_RISK_WORDS = [
  '我要自杀', '不想活了', '活不下去了', '跳楼', '割腕自杀',
  '相约自杀', '一起去死', '安眠药自杀', '上吊自杀',
  '炸学校', '炸弹', '恐怖袭击',
];
const HIGH_RISK_RE = new RegExp(
  HIGH_RISK_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i',
);

function isHighRisk(text: string): boolean {
  return HIGH_RISK_RE.test(text);
}

// ─── L1 词表：JSON文件 + 数据库双加载；DB词可热更新 ───
let ALL_WORDS: string[] = [];
let SENSITIVE_RE = /(?!)/; // 默认不匹配任何内容
let wordsLoaded = false;

function buildRegex(words: string[]): RegExp {
  if (words.length === 0) return /(?!)/;
  return new RegExp(
    words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'i',
  );
}

async function loadWordsFromDB(): Promise<string[]> {
  try {
    const rows = await prisma.sensitiveWord.findMany({ where: { enabled: true }, select: { word: true } });
    return rows.map(r => r.word);
  } catch { return []; }
}

async function reloadWords(): Promise<void> {
  const words = new Set<string>();

  // From JSON file
  try {
    const wordsPath = path.resolve(__dirname, '..', 'utils', 'sensitive-words.json');
    const wordsRaw = fs.readFileSync(wordsPath, 'utf-8');
    const wordsJson = JSON.parse(wordsRaw);
    (Object.values(wordsJson).flat() as string[]).forEach(w => words.add(w));
  } catch (err: any) {
    logger.error(`[MODERATION] Failed to load sensitive words JSON: ${err.message}`);
  }

  // From DB (hot-updateable)
  const dbWords = await loadWordsFromDB();
  dbWords.forEach(w => words.add(w));

  ALL_WORDS = Array.from(words);
  SENSITIVE_RE = buildRegex(ALL_WORDS);
  wordsLoaded = true;
  logger.info(`[MODERATION] Loaded ${ALL_WORDS.length} sensitive words (file+DB)`);
}

// Initial load
reloadWords().catch(() => {});

// Hot reload every 5 minutes (picks up DB changes without restart)
const RELOAD_INTERVAL = 5 * 60 * 1000;
setInterval(() => { reloadWords().catch(() => {}); }, RELOAD_INTERVAL);

export function containsSensitive(text: string): boolean {
  if (SAFE_PHRASES.has(text)) return false;
  if (isHighRisk(text)) return true;
  return SENSITIVE_RE.test(text);
}

export { isHighRisk };

// ─── HTML 标签剥离（防 XSS） ───

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

// ─── L2 后台 AI 审核 ───

async function backgroundCheck(params: {
  text: string;
  contentType: 'goods' | 'post' | 'lostfound' | 'message';
  contentId: number;
  userId: number;
  field: string;
}) {
  try {
    const result = await aiModerate(params.text, {
      userId: params.userId,
      contentType: params.contentType,
    });

    if (result === 'violation') {
      logger.warn(`AI flagged ${params.contentType} #${params.contentId}, field: ${params.field}`);

      // 累计作者违规计数
      prisma.user.update({
        where: { id: params.userId },
        data: { violationCount: { increment: 1 } },
      }).catch(() => {});

      let title = '内容违规通知';
      let content = `您发布的${params.field === 'content' ? '内容' : params.field}经AI审核判定为违规，已被下架。如有疑问请联系管理员。`;

      switch (params.contentType) {
        case 'goods':
          await prisma.goods.update({ where: { id: params.contentId }, data: { status: 'offline' } });
          title = '商品违规下架';
          break;
        case 'post':
          await prisma.post.update({ where: { id: params.contentId }, data: { status: 'offline' } });
          title = '帖子违规下架';
          break;
        case 'lostfound':
          await prisma.lostFound.update({ where: { id: params.contentId }, data: { status: 'offline' } });
          title = '失物信息违规下架';
          break;
        case 'message':
          await prisma.chatMessage.update({ where: { id: params.contentId }, data: { content: '[该消息因违规已被屏蔽]' } });
          title = '消息违规';
          content = '您发送的一条消息经AI审核判定为违规，已被屏蔽。';
          break;
      }

      await createNotification({
        userId: params.userId,
        type: 'review_result',
        title,
        content,
        relatedId: params.contentId,
      });
      return;
    }

    if (result === 'error') {
      // AI 审核失败 — 不自动通过，保持 pending 状态，通知管理员
      logger.error(`AI moderation FAILED for ${params.contentType} #${params.contentId} — keeping pending`);
      
      // 通知管理员有未审核内容
      prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } }).then(admins => {
        for (const admin of admins) {
          createNotification({
            userId: admin.id,
            type: 'review_result',
            title: 'AI 审核异常',
            content: `一条${params.contentType}内容（#${params.contentId}）因AI审核失败未能自动审核，请手动处理。`,
            relatedId: params.contentId,
          }).catch(() => {});
        }
      }).catch(() => {});
      return;
    }

    // AI 判定安全 → pending → approved
    logger.info(`AI approved ${params.contentType} #${params.contentId}`);
    switch (params.contentType) {
      case 'goods':
        await prisma.goods.update({ where: { id: params.contentId }, data: { status: 'approved' } }).catch(() => {});
        break;
      case 'post':
        await prisma.post.update({ where: { id: params.contentId }, data: { status: 'approved' } }).catch(() => {});
        break;
      case 'lostfound':
        await prisma.lostFound.update({ where: { id: params.contentId }, data: { status: 'approved' } }).catch(() => {});
        break;
      // message 不需要 status 变更
    }
  } catch (err: any) {
    logger.warn(`Background AI check failed: ${err.message}`);
  }
}

// ─── 导出 ───

export function moderateTextSync(text: string): boolean {
  if (!text) return false;
  return containsSensitive(text);
}

export async function moderateText(text: string): Promise<boolean> {
  if (!text) return false;
  if (containsSensitive(text)) return true;
  const result = await aiModerate(text);
  return result === 'violation';
}

/**
 * 内联 AI 审核结果处理 — 用于 afterCreate 之外的场景
 * 返回 'safe' | 'violation' | 'error'，调用方根据结果执行对应操作
 */
export async function checkAndApply(
  text: string,
  opts: {
    onSafe: () => Promise<void>;
    onViolation: () => Promise<void>;
    onError?: () => Promise<void>;
  },
): Promise<void> {
  try {
    const result = await aiModerate(text);
    if (result === 'violation') {
      await opts.onViolation();
    } else if (result === 'error') {
      if (opts.onError) await opts.onError();
      // 无 onError 回调时静默（保持 pending）
    } else {
      await opts.onSafe();
    }
  } catch {
    // 审核异常：不改变状态（保持 pending）
    if (opts.onError) await opts.onError().catch(() => {});
  }
}

export function moderateBody(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      const text = req.body[field];
      if (!text) continue;
      // 剥离 HTML 标签防 XSS
      const sanitized = stripHtml(String(text));
      if (sanitized !== text) { req.body[field] = sanitized; }
      if (SAFE_PHRASES.has(sanitized)) continue;

      // 高危内容即时阻断
      if (isHighRisk(sanitized)) {
        logger.error(`HIGH RISK content detected in field "${field}"`);

        // 异步通知所有管理员
        prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } }).then(admins => {
          for (const admin of admins) {
            createNotification({
              userId: admin.id,
              type: 'review_result',
              title: '高危内容预警',
              content: `检测到高危内容（${field}字段），已即时拦截。内容片段：${sanitized.slice(0, 100)}`,
            }).catch(() => {});
          }
        }).catch(() => {});

        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 400, message: '内容包含违规信息，请修改后重试', data: null }));
        return;
      }

      if (SENSITIVE_RE.test(sanitized)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 400, message: '内容包含违规信息，请修改后重试', data: null }));
        return;
      }
    }
    next();
  };
}

export async function afterCreate(
  contentType: 'goods' | 'post' | 'lostfound' | 'message',
  contentId: number,
  userId: number,
  fields: { field: string; text: string }[],
) {
  for (const { field, text } of fields) {
    if (!text || SAFE_PHRASES.has(text) || containsSensitive(text)) continue;
    backgroundCheck({ text, contentType, contentId, userId, field });
  }
}

/**
 * 启动审核恢复扫描：扫描所有 pending 状态的内容，对未审核项进行补审。
 * 防止因进程崩溃导致的内容永久不被 AI 审核。
 */
export async function recoveryScan() {
  logger.info('[MODERATION] Starting recovery scan for unprocessed content...');
  let scanned = 0;

  try {
    // 扫描待审商品
    const pendingGoods = await prisma.goods.findMany({
      where: { status: 'pending', isDeleted: false },
      select: { id: true, userId: true, title: true, description: true },
    });
    for (const g of pendingGoods) {
      const text = [g.title, g.description].filter(Boolean).join(' ');
      if (text && !containsSensitive(text)) {
        backgroundCheck({ text, contentType: 'goods', contentId: g.id, userId: g.userId, field: 'title' });
        scanned++;
      }
    }

    // 扫描待审帖子
    const pendingPosts = await prisma.post.findMany({
      where: { status: 'pending', isDeleted: false },
      select: { id: true, userId: true, title: true, content: true },
    });
    for (const p of pendingPosts) {
      const text = [p.title, p.content].filter(Boolean).join(' ');
      if (text && !containsSensitive(text)) {
        backgroundCheck({ text, contentType: 'post', contentId: p.id, userId: p.userId, field: 'title' });
        scanned++;
      }
    }

    // 扫描待审失物招领
    const pendingLostFounds = await prisma.lostFound.findMany({
      where: { status: 'pending', isDeleted: false },
      select: { id: true, userId: true, title: true, description: true },
    });
    for (const lf of pendingLostFounds) {
      const text = [lf.title, lf.description].filter(Boolean).join(' ');
      if (text && !containsSensitive(text)) {
        backgroundCheck({ text, contentType: 'lostfound', contentId: lf.id, userId: lf.userId, field: 'title' });
        scanned++;
      }
    }

    logger.info(`[MODERATION] Recovery scan complete: ${scanned} items submitted for review`);
  } catch (err: any) {
    logger.error(`[MODERATION] Recovery scan failed: ${err.message}`);
  }
}
