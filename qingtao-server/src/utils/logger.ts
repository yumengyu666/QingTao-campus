import winston from 'winston';
import path from 'path';
import { env } from '../config/env';

const logDir = path.resolve(__dirname, '../../logs');

export const logger = winston.createLogger({
  level: env.isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stackTrace: true }),
    env.isDev
      ? winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}${stack ? `\n${stack}` : ''}`;
        })
      : winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', maxsize: 5 * 1024 * 1024, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log'), maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
    ...(env.isDev ? [new winston.transports.Console()] : []),
  ],
});
