"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../utils/logger");
const response_1 = require("../utils/response");
const appError_1 = require("../utils/appError");
const env_1 = require("../config/env");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
function errorHandler(err, req, res, _next) {
    // ─── AppError — 已知业务错误 ───
    if (err instanceof appError_1.AppError) {
        logger_1.logger.warn(`${req.method} ${req.path} [${err.code}] ${err.message}`, {
            userId: req.user?.userId,
            statusCode: err.statusCode,
        });
        return res.status(err.statusCode).json({
            code: err.statusCode,
            message: err.message,
            data: null,
            ...(err.details ? { details: err.details } : {}),
        });
    }
    logger_1.logger.error(`${req.method} ${req.path} - ${err.message}`, {
        stack: err.stack,
        ip: req.ip,
        userId: req.user?.userId,
    });
    // Prisma 已知错误
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return res.status(409).json({ code: 409, message: '数据已存在，请勿重复操作', data: null });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({ code: 404, message: '资源不存在', data: null });
        }
    }
    // Multer 错误
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            const maxMB = err.field === 'file'
                ? 20 // 文档上传 20MB
                : 5; // 图片上传 5MB
            return res.status(413).json({ code: 413, message: `文件大小超过限制（最大${maxMB}MB），请压缩后再上传`, data: null });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(413).json({ code: 413, message: '文件数量超过限制，单次最多上传9张图片', data: null });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ code: 400, message: '上传字段名不匹配，请使用正确的上传方式', data: null });
        }
        return res.status(400).json({ code: 400, message: `上传错误：${err.message}`, data: null });
    }
    // Multer 自定义错误（文件类型）
    if (err.message?.includes('File too large')) {
        return res.status(413).json({ code: 413, message: '文件大小超过限制（最大5MB），请压缩后再上传', data: null });
    }
    if (err.message?.startsWith('仅支持')) {
        return res.status(400).json({ code: 400, message: err.message, data: null });
    }
    if (err.message?.startsWith('不支持的文件类型')) {
        return res.status(400).json({ code: 400, message: err.message, data: null });
    }
    // 生产环境：不泄露内部错误细节
    if (!env_1.env.isDev) {
        return (0, response_1.serverError)(res);
    }
    (0, response_1.serverError)(res, `服务器内部错误：${err.message}`);
}
//# sourceMappingURL=errorHandler.js.map