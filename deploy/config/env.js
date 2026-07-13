"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
function requireEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
function warnEnv(key, hint) {
    const value = process.env[key];
    if (!value) {
        console.warn(`[WARN] ${key} is not set — ${hint}`);
    }
    return value || '';
}
// ─── 启动时验证 ───
function validateEnv() {
    const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
        console.error('╔══════════════════════════════════════════╗');
        console.error('║  FATAL: Missing required env variables  ║');
        console.error('╠══════════════════════════════════════════╣');
        for (const k of missing) {
            console.error(`║  • ${k}`);
        }
        console.error('╠══════════════════════════════════════════╣');
        console.error('║  Create a .env file in the project root ║');
        console.error('║  with the variables listed above.       ║');
        console.error('╚══════════════════════════════════════════╝');
        process.exit(1);
    }
    // 开发环境：检测默认 JWT secret
    if (process.env.NODE_ENV !== 'production') {
        const devSecretPattern = /change-in-production/i;
        const accessSecret = process.env.JWT_ACCESS_SECRET || '';
        const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
        if (devSecretPattern.test(accessSecret) || devSecretPattern.test(refreshSecret)) {
            console.warn('[WARN] Using placeholder JWT secrets — generate real secrets for production');
            console.warn('[WARN] Run: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        }
    }
    // 警告：AI 审核依赖
    if (!process.env.MODERATION_API_KEY || !process.env.MODERATION_API_URL) {
        console.warn('[WARN] MODERATION_API_KEY or MODERATION_API_URL not set');
        console.warn('[WARN] → AI content moderation will be disabled');
        console.warn('[WARN] → Set both to enable DeepSeek-based text review');
    }
    // 生产环境安全检查
    if (process.env.NODE_ENV === 'production') {
        // 生产环境 JWT secret 不能太短
        const accessSecret = process.env.JWT_ACCESS_SECRET || '';
        const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
        if (accessSecret.length < 16) {
            console.error('[FATAL] JWT_ACCESS_SECRET must be at least 16 characters in production');
            process.exit(1);
        }
        if (refreshSecret.length < 16) {
            console.error('[FATAL] JWT_REFRESH_SECRET must be at least 16 characters in production');
            process.exit(1);
        }
        if (accessSecret === refreshSecret) {
            console.error('[FATAL] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production');
            process.exit(1);
        }
        if (process.env.ALLOWED_ORIGINS === 'http://localhost:5173') {
            console.warn('[WARN] Using default ALLOWED_ORIGINS in production — update for your domain');
        }
    }
    // JWT 过期时间格式验证
    const jwtExpiryPattern = /^\d+[smhd]$/;
    const accessExpires = process.env.JWT_ACCESS_EXPIRES || '15m';
    const refreshExpires = process.env.JWT_REFRESH_EXPIRES || '7d';
    if (!jwtExpiryPattern.test(accessExpires)) {
        console.error(`[FATAL] JWT_ACCESS_EXPIRES has invalid format: "${accessExpires}". Use format like "15m", "2h", "7d".`);
        process.exit(1);
    }
    if (!jwtExpiryPattern.test(refreshExpires)) {
        console.error(`[FATAL] JWT_REFRESH_EXPIRES has invalid format: "${refreshExpires}". Use format like "15m", "2h", "7d".`);
        process.exit(1);
    }
    console.log(`[ENV] Loaded — NODE_ENV=${process.env.NODE_ENV || 'development'}, DATABASE_URL=***`);
}
validateEnv();
exports.env = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: requireEnv('DATABASE_URL'),
    JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
    JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
    JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
    UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    MAX_FILES_PER_REQUEST: parseInt(process.env.MAX_FILES_PER_REQUEST || '9', 10),
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
    RATE_LOGIN_MAX: parseInt(process.env.RATE_LOGIN_MAX || '5', 10),
    RATE_REGISTER_MAX: parseInt(process.env.RATE_REGISTER_MAX || '3', 10),
    RATE_PUBLISH_MAX: parseInt(process.env.RATE_PUBLISH_MAX || '10', 10),
    isDev: process.env.NODE_ENV !== 'production',
};
//# sourceMappingURL=env.js.map