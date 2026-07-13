"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokens = generateTokens;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.generatePasswordResetToken = generatePasswordResetToken;
exports.verifyPasswordResetToken = verifyPasswordResetToken;
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.blacklistRefreshToken = blacklistRefreshToken;
exports.isRefreshTokenRevoked = isRefreshTokenRevoked;
exports.cleanupExpiredBlacklist = cleanupExpiredBlacklist;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const jwt_1 = require("../config/jwt");
const database_1 = require("../config/database");
function generateTokens(payload, fingerprint) {
    const tokenPayload = fingerprint
        ? { ...payload, fp: crypto_1.default.createHash('sha256').update(fingerprint).digest('hex').slice(0, 16) }
        : payload;
    const accessToken = jsonwebtoken_1.default.sign(tokenPayload, jwt_1.jwtConfig.accessSecret, {
        expiresIn: jwt_1.jwtConfig.accessExpires,
        algorithm: 'HS256',
    });
    const refreshToken = jsonwebtoken_1.default.sign(tokenPayload, jwt_1.jwtConfig.refreshSecret, {
        expiresIn: jwt_1.jwtConfig.refreshExpires,
        algorithm: 'HS256',
    });
    return { accessToken, refreshToken };
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, jwt_1.jwtConfig.accessSecret, { algorithms: ['HS256'] });
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, jwt_1.jwtConfig.refreshSecret, { algorithms: ['HS256'] });
}
/** 生成密码重置令牌（10分钟有效，单次使用） */
function generatePasswordResetToken(userId) {
    const jti = crypto_1.default.randomBytes(16).toString('hex');
    return jsonwebtoken_1.default.sign({ userId, purpose: 'password-reset', jti }, jwt_1.jwtConfig.refreshSecret, { expiresIn: '10m', algorithm: 'HS256' });
}
/** 验证密码重置令牌 */
function verifyPasswordResetToken(token) {
    const payload = jsonwebtoken_1.default.verify(token, jwt_1.jwtConfig.refreshSecret, { algorithms: ['HS256'] });
    if (payload.purpose !== 'password-reset' || !payload.userId || !payload.jti) {
        throw new Error('Invalid reset token');
    }
    return { userId: payload.userId, jti: payload.jti };
}
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 12);
}
async function comparePassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
/** Refresh Token 黑名单：将旧token加入黑名单 */
async function blacklistRefreshToken(token, userId) {
    const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
    // 解析过期时间
    let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (decoded?.exp)
            expiresAt = new Date(decoded.exp * 1000);
    }
    catch { }
    await database_1.prisma.refreshTokenBlacklist.create({
        data: { tokenHash, userId, expiresAt },
    });
}
/** 检查 Refresh Token 是否已失效 */
async function isRefreshTokenRevoked(token) {
    const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
    const found = await database_1.prisma.refreshTokenBlacklist.findUnique({ where: { tokenHash } });
    return !!found;
}
/** 定期清理过期黑名单 */
async function cleanupExpiredBlacklist() {
    await database_1.prisma.refreshTokenBlacklist.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    });
}
//# sourceMappingURL=auth.service.js.map