import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { jwtConfig } from '../config/jwt';
import { prisma } from '../config/database';
import type { JwtPayload } from '../types/express';

export function generateTokens(
  payload: { userId: number; username: string; role: string; tokenVersion: number },
  fingerprint?: string,
) {
  const tokenPayload = fingerprint
    ? { ...payload, fp: crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 16) }
    : payload;

  const accessToken = jwt.sign(tokenPayload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpires,
    algorithm: 'HS256',
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(tokenPayload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpires,
    algorithm: 'HS256',
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, jwtConfig.accessSecret, { algorithms: ['HS256'] }) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, jwtConfig.refreshSecret, { algorithms: ['HS256'] }) as JwtPayload;
}

/** 生成密码重置令牌（10分钟有效，单次使用） */
export function generatePasswordResetToken(userId: number): string {
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { userId, purpose: 'password-reset', jti },
    jwtConfig.refreshSecret,
    { expiresIn: '10m', algorithm: 'HS256' },
  );
}

/** 验证密码重置令牌 */
export function verifyPasswordResetToken(token: string): { userId: number; jti: string } {
  const payload = jwt.verify(token, jwtConfig.refreshSecret, { algorithms: ['HS256'] }) as {
    userId?: number;
    purpose?: string;
    jti?: string;
  };
  if (payload.purpose !== 'password-reset' || !payload.userId || !payload.jti) {
    throw new Error('Invalid reset token');
  }
  return { userId: payload.userId, jti: payload.jti };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Refresh Token 黑名单：将旧token加入黑名单 */
export async function blacklistRefreshToken(token: string, userId: number): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  // 解析过期时间
  let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded?.exp) expiresAt = new Date(decoded.exp * 1000);
  } catch {}

  await prisma.refreshTokenBlacklist.create({
    data: { tokenHash, userId, expiresAt },
  });
}

/** 检查 Refresh Token 是否已失效 */
export async function isRefreshTokenRevoked(token: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const found = await prisma.refreshTokenBlacklist.findUnique({ where: { tokenHash } });
  return !!found;
}

/** 定期清理过期黑名单 */
export async function cleanupExpiredBlacklist(): Promise<void> {
  await prisma.refreshTokenBlacklist.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
