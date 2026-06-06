import { Request } from 'express';

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
