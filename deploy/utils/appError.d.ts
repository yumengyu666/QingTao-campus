/**
 * 应用错误类 — 统一错误类型体系
 *
 * 用法:
 *   throw new AppError('商品不存在', 404, 'NOT_FOUND');
 *   throw new AppError('权限不足', 403, 'FORBIDDEN');
 *   throw new AppError('参数有误', 400, 'VALIDATION', { field: 'title', message: '标题不能为空' });
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: unknown;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string, details?: unknown, isOperational?: boolean);
}
/** 400 Bad Request */
export declare class BadRequestError extends AppError {
    constructor(message?: string, code?: string, details?: unknown);
}
/** 401 Unauthorized */
export declare class UnauthorizedError extends AppError {
    constructor(message?: string, code?: string);
}
/** 403 Forbidden */
export declare class ForbiddenError extends AppError {
    constructor(message?: string, code?: string);
}
/** 404 Not Found */
export declare class NotFoundError extends AppError {
    constructor(message?: string, code?: string);
}
/** 409 Conflict */
export declare class ConflictError extends AppError {
    constructor(message?: string, code?: string);
}
/** 413 Payload Too Large */
export declare class PayloadTooLargeError extends AppError {
    constructor(message?: string, code?: string);
}
/** 422 Unprocessable Entity — 业务逻辑错误 */
export declare class UnprocessableError extends AppError {
    constructor(message?: string, code?: string, details?: unknown);
}
/** 429 Too Many Requests */
export declare class TooManyRequestsError extends AppError {
    constructor(message?: string, code?: string);
}
//# sourceMappingURL=appError.d.ts.map