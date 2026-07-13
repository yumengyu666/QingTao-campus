"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TooManyRequestsError = exports.UnprocessableError = exports.PayloadTooLargeError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.AppError = void 0;
/**
 * 应用错误类 — 统一错误类型体系
 *
 * 用法:
 *   throw new AppError('商品不存在', 404, 'NOT_FOUND');
 *   throw new AppError('权限不足', 403, 'FORBIDDEN');
 *   throw new AppError('参数有误', 400, 'VALIDATION', { field: 'title', message: '标题不能为空' });
 */
class AppError extends Error {
    statusCode;
    code;
    details;
    isOperational;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details, isOperational = true) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;
        // 保持正确的原型链
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
/** 400 Bad Request */
class BadRequestError extends AppError {
    constructor(message = '请求参数有误', code = 'BAD_REQUEST', details) {
        super(message, 400, code, details);
        this.name = 'BadRequestError';
    }
}
exports.BadRequestError = BadRequestError;
/** 401 Unauthorized */
class UnauthorizedError extends AppError {
    constructor(message = '未登录', code = 'UNAUTHORIZED') {
        super(message, 401, code);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
/** 403 Forbidden */
class ForbiddenError extends AppError {
    constructor(message = '权限不足', code = 'FORBIDDEN') {
        super(message, 403, code);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
/** 404 Not Found */
class NotFoundError extends AppError {
    constructor(message = '资源不存在', code = 'NOT_FOUND') {
        super(message, 404, code);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/** 409 Conflict */
class ConflictError extends AppError {
    constructor(message = '数据冲突', code = 'CONFLICT') {
        super(message, 409, code);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
/** 413 Payload Too Large */
class PayloadTooLargeError extends AppError {
    constructor(message = '文件太大', code = 'PAYLOAD_TOO_LARGE') {
        super(message, 413, code);
        this.name = 'PayloadTooLargeError';
    }
}
exports.PayloadTooLargeError = PayloadTooLargeError;
/** 422 Unprocessable Entity — 业务逻辑错误 */
class UnprocessableError extends AppError {
    constructor(message = '操作无法完成', code = 'UNPROCESSABLE', details) {
        super(message, 422, code, details);
        this.name = 'UnprocessableError';
    }
}
exports.UnprocessableError = UnprocessableError;
/** 429 Too Many Requests */
class TooManyRequestsError extends AppError {
    constructor(message = '请求过于频繁', code = 'RATE_LIMITED') {
        super(message, 429, code);
        this.name = 'TooManyRequestsError';
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
//# sourceMappingURL=appError.js.map