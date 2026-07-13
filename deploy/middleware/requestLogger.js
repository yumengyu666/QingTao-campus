"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
exports.slowQueryWarn = slowQueryWarn;
const logger_1 = require("../utils/logger");
function requestLogger(req, res, next) {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        logger_1.logger[level](`${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`, {
            method,
            url: originalUrl,
            status: statusCode,
            duration,
            ip,
            userId: req.user?.userId,
        });
    });
    next();
}
function slowQueryWarn(thresholdMs = 1000) {
    return (req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            if (duration > thresholdMs) {
                logger_1.logger.warn(`⚠️ Slow query: ${req.method} ${req.originalUrl} took ${duration}ms`);
            }
        });
        next();
    };
}
//# sourceMappingURL=requestLogger.js.map