import { env } from './env';

export const jwtConfig = {
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessExpires: env.JWT_ACCESS_EXPIRES,
  refreshExpires: env.JWT_REFRESH_EXPIRES,
} as const;
