import { Request } from 'express';

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
  tokenVersion: number;
  fp?: string; // 设备指纹哈希（User-Agent + IP前缀）
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
