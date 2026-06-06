import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function warnEnv(key: string, hint: string): string {
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

  console.log(`[ENV] Loaded — NODE_ENV=${process.env.NODE_ENV || 'development'}, DATABASE_URL=***`);
}

validateEnv();

export const env = {
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
