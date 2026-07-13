"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
const logDir = path_1.default.resolve(__dirname, '../../logs');
exports.logger = winston_1.default.createLogger({
    level: env_1.env.isDev ? 'debug' : 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stackTrace: true }), env_1.env.isDev
        ? winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}${stack ? `\n${stack}` : ''}`;
        })
        : winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({ filename: path_1.default.join(logDir, 'error.log'), level: 'error', maxsize: 5 * 1024 * 1024, maxFiles: 5 }),
        new winston_1.default.transports.File({ filename: path_1.default.join(logDir, 'combined.log'), maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
        ...(env_1.env.isDev ? [new winston_1.default.transports.Console()] : []),
    ],
});
//# sourceMappingURL=logger.js.map