/**
 * 应用错误类 — 统一错误类型体系
 *
 * 用法:
 *   throw new AppError('商品不存在', 404, 'NOT_FOUND');
 *   throw new AppError('权限不足', 403, 'FORBIDDEN');
 *   throw new AppError('参数有误', 400, 'VALIDATION', { field: 'title', message: '标题不能为空' });
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown,
    isOperational = true,
  ) {
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

/** 400 Bad Request */
export class BadRequestError extends AppError {
  constructor(message = '请求参数有误', code = 'BAD_REQUEST', details?: unknown) {
    super(message, 400, code, details);
    this.name = 'BadRequestError';
  }
}

/** 401 Unauthorized */
export class UnauthorizedError extends AppError {
  constructor(message = '未登录', code = 'UNAUTHORIZED') {
    super(message, 401, code);
    this.name = 'UnauthorizedError';
  }
}

/** 403 Forbidden */
export class ForbiddenError extends AppError {
  constructor(message = '权限不足', code = 'FORBIDDEN') {
    super(message, 403, code);
    this.name = 'ForbiddenError';
  }
}

/** 404 Not Found */
export class NotFoundError extends AppError {
  constructor(message = '资源不存在', code = 'NOT_FOUND') {
    super(message, 404, code);
    this.name = 'NotFoundError';
  }
}

/** 409 Conflict */
export class ConflictError extends AppError {
  constructor(message = '数据冲突', code = 'CONFLICT') {
    super(message, 409, code);
    this.name = 'ConflictError';
  }
}

/** 413 Payload Too Large */
export class PayloadTooLargeError extends AppError {
  constructor(message = '文件太大', code = 'PAYLOAD_TOO_LARGE') {
    super(message, 413, code);
    this.name = 'PayloadTooLargeError';
  }
}

/** 422 Unprocessable Entity — 业务逻辑错误 */
export class UnprocessableError extends AppError {
  constructor(message = '操作无法完成', code = 'UNPROCESSABLE', details?: unknown) {
    super(message, 422, code, details);
    this.name = 'UnprocessableError';
  }
}

/** 429 Too Many Requests */
export class TooManyRequestsError extends AppError {
  constructor(message = '请求过于频繁', code = 'RATE_LIMITED') {
    super(message, 429, code);
    this.name = 'TooManyRequestsError';
  }
}
