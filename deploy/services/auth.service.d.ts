import type { JwtPayload } from '../types/express';
export declare function generateTokens(payload: {
    userId: number;
    username: string;
    role: string;
    tokenVersion: number;
}, fingerprint?: string): {
    accessToken: string;
    refreshToken: string;
};
export declare function verifyAccessToken(token: string): JwtPayload;
export declare function verifyRefreshToken(token: string): JwtPayload;
/** 生成密码重置令牌（10分钟有效，单次使用） */
export declare function generatePasswordResetToken(userId: number): string;
/** 验证密码重置令牌 */
export declare function verifyPasswordResetToken(token: string): {
    userId: number;
    jti: string;
};
export declare function hashPassword(password: string): Promise<string>;
export declare function comparePassword(password: string, hash: string): Promise<boolean>;
/** Refresh Token 黑名单：将旧token加入黑名单 */
export declare function blacklistRefreshToken(token: string, userId: number): Promise<void>;
/** 检查 Refresh Token 是否已失效 */
export declare function isRefreshTokenRevoked(token: string): Promise<boolean>;
/** 定期清理过期黑名单 */
export declare function cleanupExpiredBlacklist(): Promise<void>;
//# sourceMappingURL=auth.service.d.ts.map