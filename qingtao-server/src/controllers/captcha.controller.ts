import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { success, error } from '../utils/response';

interface CaptchaRecord {
  code: string;
  expires: number;
}

const store = new Map<string, CaptchaRecord>();

// IP 级别验证码重试限制：每分钟最多 10 次失败
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 60_000;

function getIpAttempts(ip: string): { count: number; resetAt: number } {
  const now = Date.now();
  let entry = ipAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + ATTEMPT_WINDOW_MS };
    ipAttempts.set(ip, entry);
  }
  return entry;
}

// 每60秒清理过期
setInterval(() => {
  const now = Date.now();
  for (const [id, r] of store) if (now > r.expires) store.delete(id);
  for (const [ip, entry] of ipAttempts) if (now > entry.resetAt) ipAttempts.delete(ip);
}, 60000);

// 生成随机4位验证码（数字+字母，排除易混淆字符）
const CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function randomCode(): string {
  const buf = crypto.randomBytes(4);
  let s = '';
  for (let i = 0; i < 4; i++) s += CHARS[buf[i] % CHARS.length];
  return s;
}

function randomInt(min: number, max: number) { return min + Math.floor(Math.random() * (max - min)); }

// 生成 SVG 验证码图片 — 含扭曲、噪点、干扰线
function generateSvg(code: string): string {
  const w = 140, h = 50;
  const chars = code.split('');
  const charWidth = w / chars.length;

  // 背景随机浅色
  const bgHue = randomInt(0, 360);
  const bg = `hsl(${bgHue}, 20%, 94%)`;

  let elements = '';

  // 干扰线 3 条
  for (let i = 0; i < 3; i++) {
    const y1 = randomInt(5, h - 5), y2 = randomInt(5, h - 5);
    const x1 = randomInt(0, 30), x2 = randomInt(w - 30, w);
    const hue = randomInt(0, 360);
    elements += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="hsl(${hue},40%,60%)" stroke-width="${randomInt(1,3)}" opacity="0.6"/>`;
  }

  // 噪点 20 个
  for (let i = 0; i < 20; i++) {
    const cx = randomInt(0, w), cy = randomInt(0, h);
    const r = randomInt(1, 3);
    elements += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(${randomInt(0,360)},30%,50%)" opacity="0.5"/>`;
  }

  // 字符 — 每个字符随机旋转、偏移、不同颜色
  chars.forEach((ch, i) => {
    const cx = charWidth * i + charWidth / 2 + randomInt(-4, 4);
    const cy = h / 2 + randomInt(-5, 5);
    const rotation = randomInt(-30, 30);
    const fontSize = randomInt(22, 30);
    const hue = randomInt(0, 360);
    elements += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
      transform="rotate(${rotation}, ${cx}, ${cy})"
      font-size="${fontSize}" font-weight="bold" font-family="Arial,Helvetica,sans-serif"
      fill="hsl(${hue}, 55%, 35%)" opacity="0.9">${ch}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${bg}" rx="8"/>
    ${elements}
  </svg>`;
}

// GET /api/captcha/generate — 返回 SVG 图片和验证码ID
export function generateCaptcha(_req: Request, res: Response, next: NextFunction) {
  try {
    const code = randomCode();
    const id = uuidv4();
    const svg = generateSvg(code);

    store.set(id, { code, expires: Date.now() + 5 * 60 * 1000 });

    // 返回 SVG 字符串，前端直接用 data URI 展示为图片
    return success(res, { captchaId: id, svg });
  } catch (err) {
    next(err);
  }
}

// 校验验证码（带 IP 重试限制）
export function verifyCaptcha(captchaId: string, userAnswer: string, ip?: string): boolean {
  // IP 重试限制检查
  if (ip) {
    const entry = getIpAttempts(ip);
    if (entry.count >= MAX_ATTEMPTS) return false; // 超限
    entry.count++;
  }

  const record = store.get(captchaId);
  if (!record) return false;
  if (Date.now() > record.expires) {
    store.delete(captchaId);
    return false;
  }
  const valid = record.code === String(userAnswer).trim().toUpperCase();
  store.delete(captchaId);

  // 成功则重置该 IP 的计数
  if (valid && ip) {
    ipAttempts.delete(ip);
  }

  return valid;
}
